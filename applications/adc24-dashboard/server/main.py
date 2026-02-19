from __future__ import annotations

"""
ADC-24 Electrophysiology Dashboard — FastAPI Backend

REST + WebSocket server for controlling the Pico Log ADC-24 and
streaming fungal electrophysiology data in real time.

Run with:
    cd experiments/EXP_001/app/server
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import asyncio
import csv
import json
import logging
import os
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from adc24_driver import (
    ADC24Driver,
    ChannelConfig,
    RecordingConfig,
    VoltageRange,
    ConversionTime,
    RANGE_MV_LOOKUP,
    Sample,
)
from signal_processing import process_window, Peak

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Data directory — relative to the experiment folder
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Application state
# ---------------------------------------------------------------------------

@dataclass 
class SessionInfo:
    """Metadata about a recording session."""
    id: str
    started_at: str
    stopped_at: Optional[str]
    duration_s: float
    sample_count: int
    peak_count: int
    csv_path: str
    config: Dict[str, Any]


class AppState:
    """Shared application state."""

    def __init__(self):
        self.driver = ADC24Driver()
        self.recording = False
        self.session_id: Optional[str] = None
        self.session_start: Optional[float] = None
        self.csv_path: Optional[Path] = None
        self.csv_writer = None
        self.csv_file = None
        self.sample_count = 0
        self.peak_count = 0
        self.current_config: Optional[RecordingConfig] = None

        # Ring buffer for live data (last 300 samples = 30 sec at 10 S/s)
        self.buffer_size = 3000
        self.times_buffer = np.zeros(self.buffer_size)
        self.voltage_buffer = np.zeros(self.buffer_size)
        self.buffer_idx = 0
        self.buffer_filled = 0

        # WebSocket clients
        self.ws_clients: Set[WebSocket] = set()

        # Recording thread
        self._record_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    def add_sample(self, sample) -> None:
        """Add a sample to the ring buffer and CSV."""
        idx = self.buffer_idx % self.buffer_size
        self.times_buffer[idx] = sample.timestamp
        self.voltage_buffer[idx] = sample.voltage_uv
        self.buffer_idx += 1
        self.buffer_filled = min(self.buffer_filled + 1, self.buffer_size)
        self.sample_count += 1

        # Write to CSV
        if self.csv_writer:
            self.csv_writer.writerow([
                f"{sample.timestamp:.4f}",
                sample.channel,
                sample.raw_adc,
                f"{sample.voltage_uv:.3f}",
            ])
            # Flush every 100 samples
            if self.sample_count % 100 == 0 and self.csv_file:
                self.csv_file.flush()

    def get_buffer_data(self, last_n: Optional[int] = None):
        """Get data from the ring buffer."""
        n = self.buffer_filled
        if n == 0:
            return np.array([]), np.array([])

        if n < self.buffer_size:
            times = self.times_buffer[:n].copy()
            voltages = self.voltage_buffer[:n].copy()
        else:
            start = self.buffer_idx % self.buffer_size
            indices = np.arange(start, start + self.buffer_size) % self.buffer_size
            times = self.times_buffer[indices].copy()
            voltages = self.voltage_buffer[indices].copy()

        if last_n is not None and last_n < len(times):
            return times[-last_n:], voltages[-last_n:]
        return times, voltages


state = AppState()

# ---------------------------------------------------------------------------
# Recording thread
# ---------------------------------------------------------------------------

def _recording_worker():
    """Background thread that streams data from ADC-24."""
    global state
    try:
        for samples in state.driver.stream():
            if not state.recording:
                break
            for sample in samples:
                state.add_sample(sample)
    except Exception as e:
        logger.error(f"Recording error: {e}")
    finally:
        state.recording = False
        logger.info("Recording worker finished")


# ---------------------------------------------------------------------------
# WebSocket broadcaster
# ---------------------------------------------------------------------------

async def _broadcast_loop():
    """Periodically broadcast latest data to all WebSocket clients."""
    last_idx = 0
    while True:
        await asyncio.sleep(0.1)  # 10 Hz update rate

        if not state.recording or not state.ws_clients:
            last_idx = state.buffer_idx
            continue

        current_idx = state.buffer_idx
        if current_idx == last_idx:
            continue

        # Get new samples since last broadcast
        new_count = min(current_idx - last_idx, 100)  # Cap at 100 per broadcast
        times, voltages = state.get_buffer_data(last_n=new_count)
        last_idx = current_idx

        if len(times) == 0:
            continue

        # Run signal processing on recent window
        window_times, window_voltages = state.get_buffer_data(last_n=110)
        peaks = []
        filtered = voltages.tolist()

        if len(window_times) >= 11:
            from signal_processing import apply_savgol_filter, detect_peaks
            filtered_full = apply_savgol_filter(window_voltages)
            detected = detect_peaks(filtered_full, window_times)
            # Only include peaks from the new data window
            min_t = times[0] if len(times) > 0 else 0
            peaks = [
                {"time": p.time, "height_uv": p.height_uv, "width_s": p.width_s, "polarity": p.polarity}
                for p in detected
                if p.time >= min_t
            ]
            state.peak_count += len(peaks)
            # Get the latest filtered values  
            filtered = filtered_full[-len(times):].tolist() if len(filtered_full) >= len(times) else filtered_full.tolist()

        elapsed = time.time() - state.session_start if state.session_start else 0

        message = json.dumps({
            "type": "data",
            "times": times.tolist(),
            "raw_uv": voltages.tolist(),
            "filtered_uv": filtered,
            "peaks": peaks,
            "stats": {
                "sample_count": state.sample_count,
                "peak_count": state.peak_count,
                "elapsed_s": elapsed,
                "spike_freq_hz": state.peak_count / elapsed if elapsed > 0 else 0,
                "latest_uv": float(voltages[-1]) if len(voltages) > 0 else 0,
            },
        })

        disconnected = set()
        for ws in state.ws_clients.copy():
            try:
                await ws.send_text(message)
            except Exception:
                disconnected.add(ws)
        state.ws_clients -= disconnected


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the broadcast loop
    task = asyncio.create_task(_broadcast_loop())
    yield
    task.cancel()
    # Cleanup
    if state.recording:
        state.driver.stop()
        state.recording = False
    if state.driver.connected:
        state.driver.disconnect()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ADC-24 Electrophysiology Dashboard",
    description="Real-time fungal electrophysiology recording",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/api/status")
async def get_status():
    """Get device and recording status."""
    return {
        "connected": state.driver.connected,
        "recording": state.recording,
        "session_id": state.session_id,
        "sample_count": state.sample_count,
        "peak_count": state.peak_count,
        "elapsed_s": time.time() - state.session_start if state.session_start else 0,
    }


@app.post("/api/connect")
async def connect_device():
    """Connect to the ADC-24."""
    try:
        state.driver.connect()
        return {"status": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/disconnect")
async def disconnect_device():
    """Disconnect from the ADC-24."""
    if state.recording:
        raise HTTPException(status_code=400, detail="Stop recording first")
    state.driver.disconnect()
    return {"status": "disconnected"}


@app.post("/api/start")
async def start_recording(
    channel: int = 1,
    voltage_range: str = "39",
    differential: bool = True,
    mains_50hz: bool = True,
):
    """Start recording."""
    if state.recording:
        raise HTTPException(status_code=400, detail="Already recording")

    # Parse voltage range
    range_map = {
        "39": VoltageRange.MV_39,
        "78": VoltageRange.MV_78,
        "156": VoltageRange.MV_156,
        "312": VoltageRange.MV_312,
        "625": VoltageRange.MV_625,
        "1250": VoltageRange.MV_1250,
        "2500": VoltageRange.MV_2500,
    }
    vr = range_map.get(voltage_range, VoltageRange.MV_39)

    config = RecordingConfig(
        channels=[ChannelConfig(
            channel=channel,
            single_ended=not differential,
            voltage_range=vr,
        )],
        mains_rejection_50hz=mains_50hz,
    )

    # Connect if needed
    if not state.driver.connected:
        try:
            state.driver.connect()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Connection failed: {e}")

    # Configure
    state.driver.configure(config)
    state.current_config = config

    # Create new session
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = DATA_DIR / f"session_{session_id}.csv"

    state.session_id = session_id
    state.session_start = time.time()
    state.sample_count = 0
    state.peak_count = 0
    state.buffer_idx = 0
    state.buffer_filled = 0
    state.csv_path = csv_path

    # Open CSV
    state.csv_file = open(csv_path, "w", newline="")
    state.csv_writer = csv.writer(state.csv_file)
    state.csv_writer.writerow(["timestamp_s", "channel", "raw_adc", "voltage_uv"])

    # Start recording thread
    state.recording = True
    state._record_thread = threading.Thread(target=_recording_worker, daemon=True)
    state._record_thread.start()

    return {
        "status": "recording",
        "session_id": session_id,
        "csv_path": str(csv_path),
    }


@app.post("/api/stop")
async def stop_recording():
    """Stop recording."""
    if not state.recording:
        raise HTTPException(status_code=400, detail="Not recording")

    state.recording = False
    state.driver.stop()

    # Wait for recording thread
    if state._record_thread:
        state._record_thread.join(timeout=5.0)
        state._record_thread = None

    # Close CSV
    if state.csv_file:
        state.csv_file.close()
        state.csv_file = None
        state.csv_writer = None

    elapsed = time.time() - state.session_start if state.session_start else 0

    return {
        "status": "stopped",
        "session_id": state.session_id,
        "duration_s": elapsed,
        "sample_count": state.sample_count,
        "peak_count": state.peak_count,
        "csv_path": str(state.csv_path),
    }


@app.get("/api/sessions")
async def list_sessions():
    """List saved recording sessions (CSV files)."""
    sessions = []
    for f in sorted(DATA_DIR.glob("session_*.csv"), reverse=True):
        stat = f.stat()
        sessions.append({
            "id": f.stem.replace("session_", ""),
            "filename": f.name,
            "size_bytes": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        })
    return {"sessions": sessions}


@app.get("/api/sessions/{session_id}/download")
async def download_session(session_id: str):
    """Download a session CSV file."""
    csv_path = DATA_DIR / f"session_{session_id}.csv"
    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="Session not found")
    return FileResponse(
        csv_path,
        media_type="text/csv",
        filename=f"session_{session_id}.csv",
    )


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    """Real-time data streaming via WebSocket."""
    await websocket.accept()
    state.ws_clients.add(websocket)
    logger.info(f"WebSocket client connected ({len(state.ws_clients)} total)")

    try:
        while True:
            # Keep connection alive by reading (client can send ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    finally:
        state.ws_clients.discard(websocket)
        logger.info(f"WebSocket client disconnected ({len(state.ws_clients)} total)")


# ---------------------------------------------------------------------------
# Demo / mock mode (for development without hardware)
# ---------------------------------------------------------------------------

@app.post("/api/demo/start")
async def start_demo():
    """Start a demo recording with simulated fungal signals (no hardware needed)."""
    if state.recording:
        raise HTTPException(status_code=400, detail="Already recording")

    session_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_demo"
    csv_path = DATA_DIR / f"session_{session_id}.csv"

    state.session_id = session_id
    state.session_start = time.time()
    state.sample_count = 0
    state.peak_count = 0
    state.buffer_idx = 0
    state.buffer_filled = 0
    state.csv_path = csv_path

    # Open CSV
    state.csv_file = open(csv_path, "w", newline="")
    state.csv_writer = csv.writer(state.csv_file)
    state.csv_writer.writerow(["timestamp_s", "channel", "raw_adc", "voltage_uv"])

    state.recording = True

    # Start demo generator thread
    def _demo_worker():
        """Generate synthetic fungal-like signals."""
        t = 0.0
        dt = 0.1  # 10 S/s
        rng = np.random.default_rng()
        while state.recording:
            # Baseline noise ~ 2 µV RMS
            noise = rng.normal(0, 2.0)

            # Occasionally generate action potentials (~0.12 Hz as per paper)
            spike = 0.0
            if rng.random() < 0.012:  # ~0.12 Hz at 10 S/s
                # Spike amplitude: skew-normal, mean ~135 µV, SD ~70 µV
                amplitude = max(20, rng.normal(135, 70))
                # Polarity
                if rng.random() < 0.7:
                    spike = amplitude
                else:
                    spike = -amplitude * 0.5

            voltage_uv = noise + spike
            raw_adc = int((voltage_uv / 39000.0) * 8_388_607)

            sample = Sample(
                timestamp=t,
                channel=1,
                raw_adc=raw_adc,
                voltage_uv=voltage_uv,
            )
            state.add_sample(sample)
            t += dt
            time.sleep(dt)

    state._record_thread = threading.Thread(target=_demo_worker, daemon=True)
    state._record_thread.start()

    return {
        "status": "demo_recording",
        "session_id": session_id,
        "note": "Generating synthetic fungal signals (no ADC-24 needed)",
    }
