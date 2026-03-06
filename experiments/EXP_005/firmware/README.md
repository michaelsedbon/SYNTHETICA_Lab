# EXP_005 — Firmware

## Architecture

```
                        WiFi (MEDICALEX)
                             │
┌────────────────────────────┼──────────────────────┐
│                            │                      │
│    ┌───────────────────────▼──────────────────┐   │
│    │          ESP8266 (NodeMCU)                │   │
│    │                                          │   │
│    │  IP: 172.16.1.115 / cryptobeings.local   │   │
│    │  Web dashboard:  port 80                 │   │
│    │  OTA updates:    port 8266               │   │
│    │  TCP bridge:     port 2323 (flashing)    │   │
│    │                                          │   │
│    │  GPIO14 (D5) ──→ Nano RST (reset ctrl)   │   │
│    │  TX          ──→ Nano RX (D0)            │   │
│    └──────────────────────────────────────────┘   │
│                        │ Serial (115200 baud)     │
│    ┌───────────────────▼──────────────────────┐   │
│    │          Arduino Nano                    │   │
│    │                                          │   │
│    │  D0 (RX) ← ESP TX  (commands)            │   │
│    │  D2      → DM542T DIR+ (direction)       │   │
│    │  D4      → DM542T PUL+ (step pulse)      │   │
│    │  D7      ← Proximity probe (hall sensor) │   │
│    └──────────────────────────────────────────┘   │
│                        │ STEP/DIR                 │
│    ┌───────────────────▼──────────────────────┐   │
│    │    DM542T / DM556 Stepper Driver         │   │
│    │    (external driver, 24V DC)             │   │
│    └──────────────────────────────────────────┘   │
│                                                   │
│              Motor Level Controller PCB           │
└───────────────────────────────────────────────────┘
```

## Current Status (March 6, 2026)

| Board | Firmware | Status |
|-------|----------|--------|
| ESP8266 (NodeMCU) | WiFi + OTA + Web dashboard + REST API | ✅ Deployed |
| Arduino Nano | Motor controller + calibration | ✅ Deployed |
| Serial communication | ESP ↔ Nano (115200 baud) | ✅ Verified |

## ESP8266 — `esp8266_ota/`

Web dashboard + REST API bridge between WiFi and the Arduino Nano.

**Features:** WiFi, OTA, HTTP API, TCP serial bridge (for Nano flashing), nano reset via D5, connection status indicator.

**Upload via OTA:**
```bash
pio run -e ota -t upload -d esp8266_ota
```

**API endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /` | Web dashboard with motor controls |
| `GET /api/ping` | PING → PONG test |
| `GET /api/status` | Full motor status (JSON) |
| `GET /api/move?steps=N` | Relative move |
| `GET /api/home` | Home to hall sensor |
| `GET /api/stop` | Emergency stop |
| `GET /api/calibrate` | Full calibration (2 min timeout) |
| `GET /api/half` | Move to half revolution |
| `GET /api/speed?value=N` | Set max speed (steps/s) |
| `GET /api/accel?value=N` | Set acceleration (steps/s²) |
| `GET /api/send?cmd=X` | Arbitrary serial command |
| `GET /reset-nano` | Reset Nano via GPIO14 |

## Arduino Nano — `arduino_nano/`

Motor controller with AccelStepper, serial command parser, and calibration.

**Flash via OTA** (uses ESP TCP bridge + reset):
```bash
python3 flash_nano.py arduino_nano
```

**Serial commands (115200 baud):**

| Command | Response | Description |
|---------|----------|-------------|
| `PING` | `PONG` | Heartbeat |
| `STATUS` | `POS:0` `HALL:1` `SPEED:2000` `MOVING:0` `SPR:0` `CAL:0` | Full state |
| `MOVE 200` | `OK MOVE 200` | Relative move |
| `MOVETO 5000` | `OK MOVETO 5000` | Absolute move |
| `HOME` | `OK HOMING` → `HOMED` | Home to sensor |
| `CALIBRATE` | `CAL_START` → `CAL_DONE SPR:<n>` | Measure steps/rev |
| `HALF` | `OK HALF <n>` | Half revolution |
| `STOP` | `OK STOPPED` | Emergency stop |
| `SPEED 500` | `OK SPEED 500` | Set speed (1-10000) |
| `ACCEL 2000` | `OK ACCEL 2000` | Set accel (1-50000) |
| `ZERO` | `OK ZEROED` | Reset position to 0 |
| `ENABLE` | `OK ENABLED` | Enable driver |
| `DISABLE` | `OK DISABLED` | Disable driver |

**Pin assignments:**

| Pin | Function |
|-----|----------|
| D0 (RX) | Serial from ESP |
| D2 | DM542T DIR+ |
| D4 | DM542T PUL+ |
| D7 | Proximity probe (hall) |

## Flash Scripts

- `flash_nano.py` — Remote Nano flasher via ESP TCP bridge (STK500v1 over WiFi)
- `flash_nano_usb.py` — USB fallback flasher
- `calibrate_rotation.py` — Automated calibration via HTTP API

## Troubleshooting

**ESP not reachable?**
- Ping `172.16.1.115` or `cryptobeings.local`
- Check WiFi credentials in `esp8266_ota/src/main.cpp`

**Nano flash fails?**
- Ensure ESP is booted and web server responds
- Try power-cycling the board before flashing

**PING returns TIMEOUT?**
- TX/RX wiring between ESP and Nano may be disconnected
- Verify baud rate is 115200 on both sides
