# Cryptographic Beings — Firmware

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
│    │  MAC: 30:83:98:b5:df:be                  │   │
│    │                                          │   │
│    │  D1 (SCL) ──→ OLED SCK                   │   │
│    │  D2 (SDA) ──→ OLED SDA                   │   │
│    │  TX       ──→ Nano RX (D0)               │   │
│    └──────────────────────────────────────────┘   │
│                        │ Serial (115200 baud)     │
│    ┌───────────────────▼──────────────────────┐   │
│    │          Arduino Nano                    │   │
│    │                                          │   │
│    │  D0 (RX)  ← ESP TX  (commands)           │   │
│    │  D2       ← Hall sensor (homing)         │   │
│    │  D4       → ISD04 PUL+ (step pulse)      │   │
│    │  D5       → ISD04 DIR+ (direction)       │   │
│    │  D6       → ISD04 ENA+ (enable)          │   │
│    └──────────────────────────────────────────┘   │
│                        │ STEP/DIR                 │
│    ┌───────────────────▼──────────────────────┐   │
│    │    ISD04 NEMA17 Stepper Motor            │   │
│    │    (integrated driver, 12-38V DC)        │   │
│    └──────────────────────────────────────────┘   │
│                                                   │
│    ┌──────────────────────────────────────────┐   │
│    │    SSD1306 OLED Display (0.96", I2C)     │   │
│    │    GND / VCC / SCK / SDA                 │   │
│    └──────────────────────────────────────────┘   │
│                                                   │
│              Motor Level Controller PCB           │
└───────────────────────────────────────────────────┘
```

## Current Status (March 1, 2026)

| Board | Firmware | Status |
|-------|----------|--------|
| ESP8266 (NodeMCU) | WiFi + OTA + Web dashboard | ✅ Deployed, running on WiFi |
| Arduino Nano | Motor controller + serial parser | ✅ Deployed, tested via serial |
| OLED Display | Not yet implemented | 🔲 TODO |
| Ollama integration | Not yet implemented | 🔲 TODO |

## Firmware Projects

### `esp8266_ota/` — ESP8266 WiFi Controller

**What it does:**
- Connects to WiFi network `MEDICALEX`
- Enables OTA updates (so you never need USB again for the ESP)
- Runs a web dashboard on port 80:
  - Auto-refreshing log viewer
  - Command box to send serial messages to the Nano
  - Status page (IP, uptime, free RAM, RSSI)
- Bridges HTTP commands to serial TX → Nano RX
- Logs all serial data received from the Nano

**Key files:**
- `src/main.cpp` — Main firmware source
- `platformio.ini` — Build config (USB + OTA environments)

**Upload via USB** (first time only):
```bash
cd experiments/EXP_002/firmware
pio run -e nodemcuv2 -t upload -d esp8266_ota
```

**Upload via OTA** (after first flash, no USB needed):
```bash
pio run -e ota -t upload -d esp8266_ota
```

**Monitor serial** (when USB is connected):
```bash
pio device monitor -d esp8266_ota
```

**Web API endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web dashboard (HTML, auto-refreshes every 5s) |
| `/status` | GET | JSON: `{ip, uptime, heap, rssi}` |
| `/log` | GET | JSON array of recent log entries |
| `/send?cmd=MOVE+200` | GET | Send a command to the Nano via serial |

---

### `arduino_nano/` — Motor Controller

**What it does:**
- Listens for serial commands from the ESP8266 (or USB serial monitor)
- Drives ISD04 NEMA17 integrated stepper motors via STEP/DIR signals
- Uses trapezoidal acceleration (ramp up/down over 50 steps)
- Reads hall-effect sensor on D2 for homing
- Supports emergency stop during movement

**Key files:**
- `src/main.cpp` — Main firmware source
- `platformio.ini` — Build config

**Upload** (USB required):
```bash
cd experiments/EXP_002/firmware
pio run -e nanoatmega328 -t upload -d arduino_nano
```

**Monitor serial** (for debugging):
```bash
pio device monitor -d arduino_nano
```

**Serial commands** (115200 baud):

| Command | Response | Description |
|---------|----------|-------------|
| `PING` | `PONG` | Heartbeat check |
| `STATUS` | `POS:0 HALL:1 ENABLED:1 SPEED:800 MOVING:0` | Full state report |
| `MOVE 200` | `OK MOVE 200` ... `POS:200` | Move 200 steps forward |
| `MOVE -100` | `OK MOVE -100` ... `POS:100` | Move 100 steps backward |
| `HOME` | `HOMING...` ... `HOMED` | Move until hall sensor, reset to 0 |
| `STOP` | `STOPPED` | Emergency stop (works mid-move) |
| `SPEED 500` | `OK SPEED 500` | Set step delay (200-5000 µs) |
| `ENABLE` | `OK ENABLED` | Enable motor driver |
| `DISABLE` | `OK DISABLED` | Disable motor (free spin) |
| `ZERO` | `OK ZEROED` | Reset position counter to 0 |

**Pin assignments:**
| Pin | Function | Direction |
|-----|----------|-----------|
| D0 (RX) | Serial from ESP | Input |
| D2 | Hall-effect sensor | Input (interrupt, pullup) |
| D4 | ISD04 PUL+ (step) | Output |
| D5 | ISD04 DIR+ (direction) | Output |
| D6 | ISD04 ENA+ (enable) | Output (active LOW) |

**Motor parameters** (tunable in `main.cpp`):
| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| `DEFAULT_STEP_DELAY_US` | 800 µs | — | Default speed |
| `MIN_STEP_DELAY_US` | 200 µs | — | Max speed limit |
| `MAX_STEP_DELAY_US` | 5000 µs | — | Min speed limit |
| `ACCEL_STEPS` | 50 | — | Acceleration ramp length |
| `HOME_SPEED_US` | 1200 µs | — | Homing speed (slower) |
| `HOME_MAX_STEPS` | 10000 | — | Max homing travel |

## Wiring Reference

From KiCad schematic (`Project_space/Cryptographic_beings/level_motor_controler/`):

| Net | From | To | Purpose |
|-----|------|----|---------|
| `tx` | ESP TX (J2 pin 13) | Nano RX (D0) | Serial commands |
| `D4` | Nano D4 | J4 IDC pin 1 → ISD04 PUL+ | Step pulse |
| `D5` | Nano D5 | J4 IDC pin 4 → ISD04 DIR+ | Direction |
| `hall_effect` | J5 IDC pin 3 | Nano D2 | Hall sensor input |
| `SCK` | ESP D1 (J2 pin 2) | OLED J3 pin 3 | I2C clock |
| `SDA` | ESP D2 (J2 pin 3) | OLED J3 pin 4 | I2C data |
| `12V+` | J6 pin 1 | J4 IDC pin 5 | Motor power (12-38V) |
| `Vin` | ESP VIN (J1 pin 15) | Nano 5V, J4, J5 | Logic power |
| `GND` | J6 pin 2 | All boards | Common ground |

## TODO — Next Session

1. **Wire ESP ↔ Nano**: Connect ESP TX to Nano RX + shared GND
2. **Connect ISD04 stepper**: PUL+/DIR+/ENA+ to Nano D4/D5/D6, power 12V+
3. **Test full chain**: Web dashboard → ESP → Nano → Motor moves
4. **Add OLED display**: Show IP, status, and last command on the SSD1306
5. **Connect Ollama**: Set up local Ollama server to send commands via ESP API
6. **Multi-motor support**: Extend Nano code for multiple steppers if needed

## Troubleshooting

**ESP not connecting to WiFi?**
- Check SSID/password in `esp8266_ota/src/main.cpp`
- The ESP creates hostname `cryptobeings.local` via mDNS

**Nano upload fails "not in sync"?**
- Board is `nanoatmega328new` (new bootloader) in `platformio.ini`
- Make sure the correct device is on `/dev/cu.usbserial-2130`

**Motor not moving?**
- Check 12V power supply is connected to J6
- Send `STATUS` to verify `ENABLED:1`
- Try `MOVE 200` — listen for the stepper clicking

**OTA update fails?**
- Make sure your Mac is on the same WiFi network (MEDICALEX)
- Ping `cryptobeings.local` to verify the ESP is reachable
- If mDNS doesn't resolve, use the IP directly: change `upload_port` in `platformio.ini` to `172.16.1.115`
