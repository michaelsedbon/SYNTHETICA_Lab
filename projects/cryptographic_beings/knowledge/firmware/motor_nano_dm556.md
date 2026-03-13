# MOTOR_1 — Bottom Linear Actuator Firmware

| Field | Value |
|-------|-------|
| **Device ID** | `MOTOR_1` |
| **MCU** | Arduino Nano (ATmega328P) |
| **Driver** | DM556 (24V, NEMA23) |
| **Function** | Controls the bottom linear actuator |
| **Source** | [`experiments/EXP_014/firmware/motor_nano/`](../../experiments/EXP_014/firmware/motor_nano/) |
| **GitHub** | [motor_nano](https://github.com/michaelsedbon/SYNTHETICA_Lab/tree/main/experiments/EXP_014/firmware/motor_nano/) |
| **Based on** | EXP_005 (original), EXP_011 (debug iterations) |

## Wiring

| Nano Pin | Function | Connected To |
|----------|----------|-------------|
| D4 | STEP (PUL+) | DM556 PUL+ |
| D2 | DIR (DIR+) | DM556 DIR+ |
| D3 | Proximity sensor | NPN NO sensor (LOW = triggered) |
| USB | Serial | LattePanda `/dev/ttyUSB1` |

## Serial Protocol

**Baud:** 115200 · **Line ending:** `\n` · **Commands are case-insensitive**

| Command | Response | Description |
|---------|----------|-------------|
| `PING` | `PONG` | Health check |
| `IDENTIFY` | `MOTOR_1` | Returns compile-time device ID |
| `STATUS` | `POS:x SPEED:x MOVING:x TARGET:x SENSOR:x` | Full status (single line) |
| `MOVE <steps>` | `OK MOVE <steps>` | Relative move (positive = CW) |
| `MOVETO <pos>` | `OK MOVETO <pos>` | Absolute move to position |
| `HOME` | `OK HOMING` → `HOMED` | Move until sensor triggers, zero position |
| `STOP` | `OK STOPPED` | Emergency stop (decelerates) |
| `SPEED <sps>` | `OK SPEED <sps>` | Set max speed (steps/sec, range 1–10000) |
| `ACCEL <val>` | `OK ACCEL <val>` | Set acceleration (steps/sec², range 1–50000) |
| `ZERO` | `OK ZEROED` | Reset current position to 0 |

### Defaults

| Parameter | Value |
|-----------|-------|
| Speed | 2000 sps |
| Acceleration | 1000 sps² |
| Home speed | 800 sps |
| Min pulse width | 20 µs |

### Boot Sequence

1. Blinks LED 3× to signal life
2. Sends `READY` on serial

## Build & Flash

```bash
# Via USB (direct connection)
cd experiments/EXP_014/firmware/motor_nano
pio run --target upload --upload-port /dev/ttyUSB1

# Via LattePanda SSH
ssh lp "cd ~/lab/experiments/EXP_014/firmware/motor_nano && pio run --target upload"
```

**PlatformIO config:** `platformio.ini` — board: `nanoatmega328`, framework: `arduino`, lib: `AccelStepper`

## Changelog

| Date | Change | Experiment |
|------|--------|-----------|
| 2026-03-04 | Initial motor firmware with full command set | EXP_005 |
| 2026-03-10 | Debug iterations (blink, raw GPIO, AccelStepper) | EXP_011 |
| 2026-03-12 | Production version with IDENTIFY command | EXP_014 |
