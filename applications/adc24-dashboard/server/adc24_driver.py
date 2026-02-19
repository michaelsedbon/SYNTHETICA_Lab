from __future__ import annotations

"""
Hardware abstraction layer for the Pico Log ADC-24.

Uses a subprocess bridge (picohrdl_bridge.py) that runs under Rosetta
(arch -x86_64) to load the x86_64 PicoSDK C library, while the main
FastAPI server stays native ARM64.

Reproduces the exact recording setup from Mishra et al., Sci. Robot. 2024:
  - Differential mode (E1/E2 differential, EGND ground)
  - ±39 mV range
  - 10 S/s (100 ms conversion time)
  - 50 Hz mains rejection
"""

import json
import os
import platform
import subprocess
import sys
import time
import threading
import logging
from dataclasses import dataclass, field
from enum import IntEnum
from pathlib import Path
from typing import Generator, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants matching the paper's setup
# ---------------------------------------------------------------------------

ADC_MAX_COUNT = 8_388_607  # 2^23 - 1 (24-bit signed)


class VoltageRange(IntEnum):
    """ADC-24 voltage ranges (mV)."""
    MV_39 = 1
    MV_78 = 2
    MV_156 = 3
    MV_312 = 4
    MV_625 = 5
    MV_1250 = 6
    MV_2500 = 7


class ConversionTime(IntEnum):
    """Conversion time settings."""
    MS_60 = 0
    MS_100 = 1
    MS_180 = 2
    MS_340 = 3
    MS_660 = 4


RANGE_MV_LOOKUP = {
    VoltageRange.MV_39: 39.0,
    VoltageRange.MV_78: 78.0,
    VoltageRange.MV_156: 156.0,
    VoltageRange.MV_312: 312.0,
    VoltageRange.MV_625: 625.0,
    VoltageRange.MV_1250: 1250.0,
    VoltageRange.MV_2500: 2500.0,
}

CONVERSION_MS_LOOKUP = {
    ConversionTime.MS_60: 60,
    ConversionTime.MS_100: 100,
    ConversionTime.MS_180: 180,
    ConversionTime.MS_340: 340,
    ConversionTime.MS_660: 660,
}


@dataclass
class ChannelConfig:
    """Configuration for a single ADC channel."""
    channel: int = 1            # Channel number (1-16)
    enabled: bool = True
    single_ended: bool = False  # False = differential (paper's setup)
    voltage_range: VoltageRange = VoltageRange.MV_39


@dataclass
class RecordingConfig:
    """Full recording configuration."""
    channels: list = field(default_factory=lambda: [
        ChannelConfig(channel=1, single_ended=False, voltage_range=VoltageRange.MV_39)
    ])
    conversion_time: ConversionTime = ConversionTime.MS_100
    mains_rejection_50hz: bool = True  # True = 50 Hz (Europe), False = 60 Hz


@dataclass
class Sample:
    """A single data sample."""
    timestamp: float          # seconds since recording start
    channel: int
    raw_adc: int
    voltage_uv: float         # microvolts


class ADC24Driver:
    """
    Controls a Pico Log ADC-24 data logger via a subprocess bridge.

    The bridge script (picohrdl_bridge.py) runs under Rosetta (x86_64)
    to load the x86_64-only PicoSDK C library.

    Usage:
        driver = ADC24Driver()
        driver.connect()
        driver.configure(config)
        for sample in driver.stream():
            print(sample.voltage_uv)
        driver.disconnect()
    """

    def __init__(self):
        self._bridge: Optional[subprocess.Popen] = None
        self._connected = False
        self._streaming = False
        self._stop_event = threading.Event()
        self._config: Optional[RecordingConfig] = None
        self._bridge_script = Path(__file__).parent / "picohrdl_bridge.py"

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def streaming(self) -> bool:
        return self._streaming

    def _send_cmd(self, cmd: dict) -> dict:
        """Send a JSON command to the bridge subprocess and read response."""
        if not self._bridge or self._bridge.poll() is not None:
            raise RuntimeError("Bridge process not running")

        msg = json.dumps(cmd) + "\n"
        self._bridge.stdin.write(msg)
        self._bridge.stdin.flush()

        response_line = self._bridge.stdout.readline()
        if not response_line:
            raise RuntimeError("Bridge process closed unexpectedly")

        return json.loads(response_line.strip())

    def connect(self) -> None:
        """Start the bridge subprocess and open the ADC-24 device."""
        if self._connected:
            logger.warning("Already connected")
            return

        if not self._bridge_script.exists():
            raise RuntimeError(f"Bridge script not found: {self._bridge_script}")

        # On macOS ARM64 we need Rosetta to load the x86_64 PicoSDK lib.
        # On Linux x86_64 (the server) we run directly.
        if platform.system() == "Darwin" and platform.machine() == "arm64":
            cmd = ["arch", "-x86_64", sys.executable, str(self._bridge_script)]
        else:
            cmd = [sys.executable, str(self._bridge_script)]

        self._bridge = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # line-buffered
        )

        # Wait for bridge_ready
        ready_line = self._bridge.stdout.readline()
        if not ready_line:
            stderr = self._bridge.stderr.read()
            raise RuntimeError(f"Bridge failed to start: {stderr}")

        ready = json.loads(ready_line.strip())
        if not ready.get("ok"):
            raise RuntimeError(f"Bridge error: {ready.get('error', 'unknown')}")

        arch_note = "x86_64 Rosetta" if "arch" in cmd else platform.machine()
        logger.info(f"Bridge subprocess started ({arch_note})")

        # Open the ADC-24
        result = self._send_cmd({"cmd": "open"})
        if not result.get("ok"):
            self._bridge.terminate()
            self._bridge = None
            raise ConnectionError(
                f"Failed to open ADC-24: {result.get('error', 'unknown')}. "
                "Check USB connection."
            )

        self._connected = True
        logger.info(f"ADC-24 connected via bridge (handle={result.get('handle')})")

    def configure(self, config: Optional[RecordingConfig] = None) -> None:
        """Configure channels and recording parameters."""
        if not self._connected:
            raise RuntimeError("Not connected")

        self._config = config or RecordingConfig()

        # Set mains rejection
        result = self._send_cmd({
            "cmd": "set_mains",
            "reject_50hz": self._config.mains_rejection_50hz,
        })
        if not result.get("ok"):
            raise RuntimeError(f"Failed to set mains: {result.get('error')}")

        freq = "50" if self._config.mains_rejection_50hz else "60"
        logger.info(f"Mains rejection: {freq} Hz")

        # Configure each channel
        for ch_cfg in self._config.channels:
            if not ch_cfg.enabled:
                continue
            result = self._send_cmd({
                "cmd": "set_channel",
                "channel": ch_cfg.channel,
                "enabled": True,
                "range": ch_cfg.voltage_range.value,
                "single_ended": ch_cfg.single_ended,
            })
            if not result.get("ok"):
                raise RuntimeError(f"Failed to set channel {ch_cfg.channel}: {result.get('error')}")

            mode = "single-ended" if ch_cfg.single_ended else "differential"
            range_mv = RANGE_MV_LOOKUP[ch_cfg.voltage_range]
            logger.info(f"Channel {ch_cfg.channel}: {mode}, ±{range_mv} mV")

    def _adc_to_uv(self, raw: int, voltage_range: VoltageRange) -> float:
        """Convert raw ADC value to microvolts."""
        range_mv = RANGE_MV_LOOKUP[voltage_range]
        return (raw / ADC_MAX_COUNT) * range_mv * 1000.0

    def stream(self) -> Generator:
        """
        Start streaming data. Yields lists of samples (one per enabled channel)
        at each sampling interval.
        """
        if not self._connected or not self._config:
            raise RuntimeError("Not connected or not configured")

        config = self._config
        enabled_channels = [ch for ch in config.channels if ch.enabled]
        n_channels = len(enabled_channels)

        conv_ms = CONVERSION_MS_LOOKUP[config.conversion_time]
        sample_interval_ms = conv_ms * n_channels + 20

        # Set interval
        result = self._send_cmd({
            "cmd": "set_interval",
            "interval_ms": sample_interval_ms,
            "conv_time": config.conversion_time.value,
        })
        if not result.get("ok"):
            raise RuntimeError(f"Failed to set interval: {result.get('error')}")

        # Start streaming
        result = self._send_cmd({"cmd": "run", "n_values": 20, "method": 2})
        if not result.get("ok"):
            raise RuntimeError(f"Failed to start stream: {result.get('error')}")

        self._streaming = True
        self._stop_event.clear()
        start_time = time.time()

        logger.info(f"Streaming started: {n_channels} ch, {sample_interval_ms} ms interval")

        try:
            while not self._stop_event.is_set():
                # Check if data is ready
                ready_result = self._send_cmd({"cmd": "ready"})
                if not ready_result.get("ready", False):
                    time.sleep(0.02)
                    continue

                # Fetch values
                values_result = self._send_cmd({"cmd": "get_values", "n_values": 20})
                n_returned = values_result.get("n_returned", 0)
                raw_samples = values_result.get("samples", [])

                if n_returned <= 0:
                    time.sleep(0.01)
                    continue

                for i in range(n_returned):
                    for ch_idx, ch_cfg in enumerate(enabled_channels):
                        buf_idx = i * n_channels + ch_idx
                        if buf_idx >= len(raw_samples):
                            break
                        raw = raw_samples[buf_idx]
                        uv = self._adc_to_uv(raw, ch_cfg.voltage_range)
                        t = time.time() - start_time

                        yield [Sample(
                            timestamp=t,
                            channel=ch_cfg.channel,
                            raw_adc=raw,
                            voltage_uv=uv,
                        )]

                time.sleep(conv_ms / 1000.0)

        finally:
            self._send_cmd({"cmd": "stop"})
            self._streaming = False
            logger.info("Streaming stopped")

    def read_single(self, channel: int = 1,
                    voltage_range: VoltageRange = VoltageRange.MV_39) -> Sample:
        """Read a single value from a channel."""
        if not self._connected:
            raise RuntimeError("Not connected")

        result = self._send_cmd({
            "cmd": "read_single",
            "channel": channel,
            "range": voltage_range.value,
            "conv_time": ConversionTime.MS_100.value,
            "single_ended": False,
        })

        if not result.get("ok"):
            raise RuntimeError(f"Single read failed: {result.get('error')}")

        raw = result["raw"]
        uv = self._adc_to_uv(raw, voltage_range)
        return Sample(
            timestamp=time.time(),
            channel=channel,
            raw_adc=raw,
            voltage_uv=uv,
        )

    def stop(self) -> None:
        """Stop streaming."""
        self._stop_event.set()

    def disconnect(self) -> None:
        """Close the device and terminate the bridge."""
        if not self._connected:
            return

        if self._streaming:
            self.stop()
            time.sleep(0.5)

        try:
            if self._bridge and self._bridge.poll() is None:
                self._send_cmd({"cmd": "close"})
                self._bridge.wait(timeout=5)
        except Exception as e:
            logger.warning(f"Error closing bridge: {e}")
            if self._bridge:
                self._bridge.terminate()

        self._connected = False
        self._bridge = None
        logger.info("ADC-24 disconnected")
