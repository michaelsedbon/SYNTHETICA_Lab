# LEVEL_1 — Slewing Bearing Motor Nano Firmware

| Field | Value |
|-------|-------|
| **Device ID** | `LEVEL_1` (Nano side) |
| **MCU** | Arduino Nano (ATmega328P) |
| **Driver** | ISD04 (NEMA17, integrated stepper, 12–38VDC) |
| **Function** | Controls the slewing bearing rotation via level positioning |
| **Source** | [`experiments/EXP_005/firmware/arduino_nano/`](../../experiments/EXP_005/firmware/arduino_nano/) |
| **GitHub** | [arduino_nano](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_005/firmware/arduino_nano/) |

## Wiring

| Nano Pin | Function | Connected To |
|----------|----------|-------------|
| D0 (RX) | Serial RX | ESP8266 TX |
| D1 (TX) | Serial TX | ESP8266 RX |
| D4 | STEP (PUL+) | DM542T PUL+ |
| D2 | DIR (DIR+) | DM542T DIR+ |
| D7 | Hall sensor | Hall-effect sensor (LOW = triggered) |

> **Note:** This Nano is NOT directly USB-accessible. All communication goes through the ESP8266 WiFi bridge. The ESP8266 can reset this Nano via GPIO14 (D5).

## Serial Protocol

**Baud:** 115200 · **Line ending:** `\n` · **Commands are case-insensitive**

| Command | Response | Description |
|---------|----------|-------------|
| `PING` | `PONG` | Health check |
| `STATUS` | Multi-line: `POS:x`, `HALL:x`, `SPEED:x`, `MOVING:x`, `SPR:x`, `CAL:x` | Full status |
| `MOVE <steps>` | `OK MOVE <steps> POS:x TGT:x` | Relative move |
| `MOVETO <pos>` | `OK MOVETO <pos>` | Absolute move |
| `HOME` | `OK HOMING` → `HOMED` | Move to hall sensor, zero |
| `CALIBRATE` | `CAL_START` → `CAL_DONE SPR:x` | Full revolution calibration |
| `HALF` | `OK HALF <steps>` | Move to half revolution (requires calibration) |
| `STOP` | `OK STOPPED` | Emergency stop |
| `SPEED <sps>` | `OK SPEED <sps>` | Set speed (1–10000) |
| `ACCEL <val>` | `OK ACCEL <val>` | Set acceleration (1–50000) |
| `ZERO` | `OK ZEROED` | Reset position to 0 |
| `ENABLE` | `OK ENABLED` | Enable stepper outputs |
| `DISABLE` | `OK DISABLED` | Disable stepper outputs |
| `RAWTEST` | `OK RAWTEST 200 pulses` | Direct GPIO pulse test (bypasses AccelStepper) |

### Calibration State Machine

1. **Phase 1 (Homing):** Move until hall sensor triggers → zero position
2. **Phase 2 (Escape):** Move 500 steps past the magnet zone
3. **Phase 3 (Measure):** Move until hall triggers again → `SPR = currentPosition` (steps per revolution)

If calibration fails: `CAL_FAIL:NO_HALL` or `CAL_FAIL:NO_HALL_2ND`

### Defaults

| Parameter | Value |
|-----------|-------|
| Speed | 2000 sps |
| Acceleration | 1000 sps² |
| Home speed | 500 sps |
| Calibration speed | 400 sps |

### Boot Sequence

1. Blinks LED 3×
2. Runs 2000-step boot test (low speed, blocking)
3. Sends `READY`

## Build & Flash

```bash
# Via ESP8266 TCP bridge (OTA — no physical access needed)
cd experiments/EXP_005/firmware
python3 flash_nano.py              # Uses TCP bridge on port 2323

# Via direct USB (if physically accessible)
cd experiments/EXP_005/firmware/arduino_nano
pio run --target upload
```

**PlatformIO config:** board: `nanoatmega328`, lib: `AccelStepper`

## Changelog

| Date | Change | Experiment |
|------|--------|-----------|
| 2026-03-04 | Initial version with homing + calibration | EXP_005 |
