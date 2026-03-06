# Cryptographic Beings — System Documentation

**Last updated:** 2026-03-06

Comprehensive reference for the Cryptographic Beings machine: firmware, networking, hardware wiring, API, serial protocol, agent integration, and connector mapping.

---

## 1. What Is Cryptographic Beings?

A bio-hybrid art/science installation that stores binary data using **Marimo moss balls** (*Aegagropila linnaei*). Each glass tube contains one moss ball:

- **Bit = 1 (floating):** Light → photosynthesis → O₂ gas → buoyancy rise
- **Bit = 0 (sinking):** Dark → O₂ release → ball sinks

18 tubes arranged in a **3 levels × 6 tubes** tower can store a **5-letter word** using 6-bit character encoding. A motorized arm with LED lights rotates around the tower to selectively illuminate individual tubes.

**Project page:** https://michaelsedbon.com/Cryptographic-Beings

---

## 2. Network Topology

```
                    ┌──────────────────────────┐
                    │     Lab Server            │
                    │     IP: 172.16.1.80       │
                    │                           │
                    │  ┌──────────────────────┐ │
                    │  │ Lab Agent             │ │
                    │  │ Port 8003 (REST API)  │ │
                    │  │ Gemini + Ollama       │ │
                    │  │ (qwen2.5:14b)         │ │
                    │  └──────────┬───────────┘ │
                    └─────────────┼─────────────┘
                                  │ WiFi (MEDICALEX)
                    ┌─────────────┼─────────────┐
                    │   ESP8266 (NodeMCU)        │
                    │   IP: 172.16.1.115         │
                    │   mDNS: cryptobeings.local │
                    │   MAC: 30:83:98:b5:df:be   │
                    │                            │
                    │   Port 80   → Web dashboard│
                    │   Port 81   → WebSocket    │
                    │   Port 2323 → TCP bridge   │
                    │   Port 8266 → OTA updates  │
                    │          │ Serial (115200)  │
                    │   ┌──────┴───────────────┐ │
                    │   │ Arduino Nano         │ │
                    │   │ ATmega328P           │ │
                    │   │ Motor controller     │ │
                    │   │ AccelStepper library  │ │
                    │   └──────────────────────┘ │
                    └────────────────────────────┘
```

### IP Address Table

| Device | IP Address | Hostname | Notes |
|--------|-----------|----------|-------|
| Lab Server | `172.16.1.80` | — | Runs agent, Ollama, all services |
| ESP8266 (Motor Level Controller) | `172.16.1.115` | `cryptobeings.local` | Main motor board (EXP_002) |
| ESP8266 (Motor Up/Down Bottom Side) | TBD | `cryptobeings-dm542t.local` | Up/down motor board (EXP_005) |

### WiFi Network

| Parameter | Value |
|-----------|-------|
| SSID | `MEDICALEX` |
| Password | `94110Med+` |
| mDNS hostname | `cryptobeings` / `cryptobeings-dm542t` |

---

## 3. Firmware Overview

Two firmware variants exist, each deployed on separate PCBs. **EXP_002** is the production board; **EXP_005** is the high-power board (in progress).

### 3.1 Which Firmware Runs Where

| Board | Experiment | Firmware Directory | Motor Driver | Motor Type | Status |
|-------|------------|-------------------|-------------|-----------|--------|
| Motor Level Controller PCB | EXP_002 | `experiments/EXP_002/firmware/` | ISD04 (integrated) | NEMA 24 | ✅ Production |
| Motor Up/Down Bottom Side | EXP_005 | `experiments/EXP_005/firmware/` | DM542T / DM556 (external) | NEMA 23 | 🔧 In progress |

---

### 3.2 ESP8266 Firmware (`esp8266_ota/`)

**Language:** C++ (Arduino framework, PlatformIO)  
**Chip:** ESP8266 (NodeMCU v2, ESP-12E)

#### What It Does

1. Connects to WiFi (`MEDICALEX`) and registers mDNS hostname
2. Enables OTA firmware updates (port 8266)
3. Runs a **web dashboard** on port 80 (live motor controls, WebSocket log viewer, speed/accel sliders, sensor display)
4. Serves **REST API** endpoints (`/api/*`) returning JSON — used by the lab agent
5. Bridges HTTP commands to the Arduino Nano over hardware Serial TX → Nano RX
6. Runs a **WebSocket** server on port 81 for real-time debug log streaming
7. Runs a **TCP serial bridge** on port 2323 for remote Nano flashing (STK500v1)
8. Drives an **SSD1306 OLED** display (boot screen: title + IP)
9. Can **reset the Nano** remotely via GPIO14 → Nano RST (for remote flashing)

#### Key Source Files

| File | Purpose |
|------|---------|
| [`esp8266_ota/src/main.cpp`](../../experiments/EXP_002/firmware/esp8266_ota/src/main.cpp) | All firmware in a single file (~1071 lines) |
| [`esp8266_ota/platformio.ini`](../../experiments/EXP_002/firmware/esp8266_ota/platformio.ini) | Build config (USB + OTA environments) |

#### Libraries Used

| Library | Purpose |
|---------|---------|
| `ESP8266WiFi` | WiFi connection |
| `ESP8266mDNS` | mDNS hostname resolution |
| `ArduinoOTA` | Over-the-air updates |
| `ESP8266WebServer` | HTTP server for dashboard + API |
| `WebSocketsServer` | WebSocket for debug logging |
| `Adafruit_SSD1306` + `Adafruit_GFX` | OLED display |

#### Flash Commands

```bash
# First time (USB):
pio run -e nodemcuv2 -t upload -d experiments/EXP_002/firmware/esp8266_ota

# Subsequent (OTA, no USB needed):
pio run -e ota -t upload -d experiments/EXP_002/firmware/esp8266_ota
```

> On the server, PlatformIO is at `/home/michael/.pio-venv/bin/pio`

---

### 3.3 Arduino Nano Firmware (`arduino_nano/`)

**Language:** C++ (Arduino framework, PlatformIO)  
**Chip:** ATmega328P (Arduino Nano, new bootloader)

#### What It Does

1. Listens for serial commands from the ESP8266 at **115200 baud**
2. Drives a stepper motor via **AccelStepper** library (type DRIVER: step + direction)
3. Reads a **hall-effect / proximity sensor** for homing and calibration
4. **Auto-calibration** on boot (EXP_002) or manual-only (EXP_005 v2):
   - Homes to hall sensor → escapes magnet zone → measures one full revolution → stores `stepsPerRevolution`
5. Supports **named positions**: TUBE1–TUBE5, HOME, HALF, QUARTER, THREE_QUARTER
6. Trapezoidal acceleration profile via AccelStepper

#### Key Source Files

| File | Purpose |
|------|---------|
| [`arduino_nano/src/main.cpp`](../../experiments/EXP_002/firmware/arduino_nano/src/main.cpp) | EXP_002 production firmware |
| [`arduino_nano/src/main.cpp`](../../experiments/EXP_005/firmware/arduino_nano/src/main.cpp) | EXP_005 high-power firmware (465 lines) |

#### Pin Mapping — EXP_002 (Motor Level Controller)

| Nano Pin | Function | Direction |
|----------|----------|-----------|
| D0 (RX) | Serial from ESP8266 | Input |
| D2 | Hall-effect sensor | Input (interrupt, pullup) |
| D4 | ISD04 PUL+ (step) | Output |
| D5 | ISD04 DIR+ (direction) | Output |
| D6 | ISD04 ENA+ (enable, active LOW) | Output |

#### Pin Mapping — EXP_005 (DM542T/DM556 Board)

| Nano Pin | Function | Direction |
|----------|----------|-----------|
| D0 (RX) | Serial from ESP8266 | Input |
| D2 | DM542T DIR+ (direction) | Output |
| D4 | DM542T PUL+ / STP (step) | Output |
| D7 | Proximity sensor (polling, no interrupt on D7) | Input (pullup) |
| PIN_ENABLE | Not connected (`-1`) | — |

#### Motor Parameters

| Parameter | EXP_002 Default | EXP_005 Default |
|-----------|----------------|----------------|
| Max Speed | 800 µs step delay | 2000 steps/sec |
| Acceleration | 50-step ramp | 1000 steps/sec² |
| Home Speed | 1200 µs | 500 steps/sec |
| Calibration Speed | — | 400 steps/sec |
| Home Max Steps | 10,000 | 200,000 |

#### Flash Commands

```bash
# USB flash:
pio run -e nanoatmega328 -t upload -d experiments/EXP_002/firmware/arduino_nano

# Remote flash (via ESP TCP bridge):
python3 experiments/EXP_002/firmware/flash_nano.py
```

**Remote flashing works by:**
1. PlatformIO compiles the Nano hex file
2. `flash_nano.py` calls `http://172.16.1.115/reset-nano` → ESP GPIO14 pulls Nano RST LOW
3. Connects to TCP bridge on port 2323
4. Uploads hex via STK500v1 protocol
5. Nano reboots automatically

---

## 4. Serial Protocol (Nano ↔ ESP)

115200 baud, newline-delimited commands. All commands are case-insensitive.

### Commands

| Command | Response | Description |
|---------|----------|-------------|
| `PING` | `PONG` | Heartbeat check |
| `STATUS` | Multi-line: `POS:` `HALL:` `ENABLED:` `SPEED:` `MOVING:` `SPR:` `CAL:` | Full state report |
| `MOVE <n>` | `OK MOVE <n>` → `POS:<final>` | Relative move (steps), positive=forward |
| `MOVETO <n>` | `OK MOVETO <n>` → `POS:<final>` | Absolute move to position |
| `HOME` | `OK HOMING` → `HOMED` | Move until hall sensor, zero position |
| `CALIBRATE` | `CAL_START` → `CAL_DONE SPR:<n>` or `CAL_FAIL` | Full calibration routine |
| `HALF` | `OK HALF <steps>` | Move to half revolution position |
| `STOP` | `OK STOPPED` | Emergency stop (works mid-move, aborts calibration) |
| `SPEED <sps>` | `OK SPEED <sps>` | Set max speed (1–10000 steps/sec) |
| `ACCEL <val>` | `OK ACCEL <val>` | Set acceleration (1–50000 steps/sec²) |
| `ENABLE` | `OK ENABLED` | Enable motor driver |
| `DISABLE` | `OK DISABLED` | Disable motor (free spin) |
| `ZERO` | `OK ZEROED` | Reset position counter to 0 |
| `SPR` | `SPR:<n>` | Query steps per revolution |
| `GOTO <name>` | `OK GOTO <name> POS:<n>` or `ERROR:NOT_CALIBRATED` | Move to named position |
| `SET_OFFSET <n>` | `OK OFFSET <n>` | Set tube offset from hall sensor |
| `POSITIONS` | Multiple lines → `END_POSITIONS` | List all named position:value pairs |

### Error Responses

| Error | Meaning |
|-------|---------|
| `ERROR:CALIBRATING` | Motor command sent during calibration |
| `ERROR:NOT_CALIBRATED` | HALF/GOTO used before calibration |
| `ERROR:UNKNOWN_POS:<name>` | Unknown position name in GOTO |
| `ERROR:INVALID_STEPS` | Non-numeric value in MOVE |
| `ERROR:SPEED_RANGE` | Speed outside 1–10000 |
| `ERROR:ACCEL_RANGE` | Acceleration outside 1–50000 |
| `CAL_FAIL:NO_HALL` | Hall sensor not found during homing |
| `CAL_FAIL:NO_HALL_2ND` | Hall sensor not found on revolution measurement |

---

## 5. REST API (ESP8266 → Agent)

Base URL: `http://172.16.1.115`  
All `/api/*` endpoints return `Content-Type: application/json` with CORS headers.

### API Endpoints

| Endpoint | Method | Description | Example Response |
|----------|--------|-------------|------------------|
| `/api/ping` | GET | Check Nano is alive | `{"ok":true,"response":"PONG"}` |
| `/api/status` | GET | Full motor + calibration state | `{"pos":0,"hall":0,"enabled":1,"speed":2000,"moving":0,"spr":30144,"calibrated":1}` |
| `/api/calibrate` | GET | Run full calibration (2 min timeout) | `{"ok":true,"spr":30144}` |
| `/api/half` | GET | Move to half rotation | `{"ok":true,"steps":15072}` |
| `/api/home` | GET | Home to hall sensor (60s timeout) | `{"ok":true}` |
| `/api/move?steps=N` | GET | Relative move | `{"ok":true,"steps":500}` |
| `/api/move-to?pos=N` | GET | Absolute move | `{"ok":true,"target":1000}` |
| `/api/stop` | GET | Emergency stop | `{"ok":true}` |
| `/api/speed?value=N` | GET | Set max speed (steps/sec) | `{"ok":true,"speed":4000}` |
| `/api/accel?value=N` | GET | Set acceleration (steps/sec²) | `{"ok":true,"accel":2000}` |
| `/api/goto?target=tube1` | GET | Move to named position | `{"ok":true,"target":"TUBE1","pos":5943}` |
| `/api/positions` | GET | List all named positions | `{"ok":true,"positions":{...},"offset":0}` |
| `/api/set-offset?value=N` | GET | Set tube offset from hall | `{"ok":true,"offset":N}` |

### Legacy Endpoints (backward-compatible)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web dashboard (HTML, live WebSocket logs) |
| `/status` | GET | JSON: `{ip, uptime, heap, rssi}` |
| `/log` | GET | JSON array of recent log entries (ring buffer, 50 max) |
| `/send?cmd=MOVE+200` | GET | Send raw serial command to Nano |
| `/reset-nano` | GET | Reset Arduino Nano via GPIO14 (for flashing) |

### Testing with curl

```bash
curl http://172.16.1.115/api/ping
curl http://172.16.1.115/api/status
curl 'http://172.16.1.115/api/goto?target=tube1'
curl 'http://172.16.1.115/api/move?steps=500'
curl http://172.16.1.115/api/positions
curl http://172.16.1.115/api/calibrate
curl http://172.16.1.115/api/stop
```

---

## 6. Named Positions

After calibration, the Nano knows these positions (computed from `stepsPerRevolution` and `tubeOffset`):

| Name | Description | Formula |
|------|-------------|---------|
| `home` | Hall sensor reference | `0` |
| `half` | 180° | `spr / 2` |
| `quarter` | 90° | `spr / 4` |
| `three_quarter` | 270° | `3 × spr / 4` |
| `tube1` | Algae tube 1 | `offset` |
| `tube2` | Algae tube 2 | `offset + spr/5` |
| `tube3` | Algae tube 3 | `offset + 2×spr/5` |
| `tube4` | Algae tube 4 | `offset + 3×spr/5` |
| `tube5` | Algae tube 5 | `offset + 4×spr/5` |

> **Note:** `tubeOffset` is NOT persisted across reboots. After power cycle, call `SET_OFFSET` again.

### Setting the Tube Offset

1. `motor_home()` — go to hall sensor
2. `motor_move(small_steps)` — nudge forward until tube 1 is aligned
3. `motor_status()` — read current position
4. `motor_set_offset(that_position)` — store it

---

## 7. Hardware Details

### 7.1 Motor Level Controller PCB (EXP_002 — Production)

| Component | Part | Ref | Purpose |
|-----------|------|-----|---------|
| ESP8266 NodeMCU | ESP-12E on headers | J1/J2 | WiFi, OLED, serial bridge |
| Arduino Nano | ATmega328P | A1 | Motor control, sensor |
| OLED Display | SSD1306 0.96" I2C | J3 | Status display |
| Motor IDC | 2×3 shrouded connector | J4 | STEP/DIR/12V to ISD04 |
| Sensor IDC | 2×3 shrouded connector | J5 | Hall-effect sensor |
| Power Input | 2-pin connector | J6 | 12V DC |

### 7.2 Motor Up/Down Bottom Side (EXP_005 — In Progress)

| Feature | Value |
|---------|-------|
| Motor Driver | DM542T or Yundan DM556 (external, up to 5.6A) |
| Motor | NEMA 23 (23HP22-2804S, 2.8A, 1.20 Nm) |
| Voltage | 24V DC |
| I/O Expander | MCP23017 |
| Connectors | Screw terminals for probes and power |
| Pin mapping | D4=Step, D2=Dir, D7=Sensor |

### 7.3 ISD04 Stepper Motor (EXP_002)

| Spec | Value |
|------|-------|
| Type | NEMA 24 integrated stepper + driver |
| Voltage | 12–38V DC |
| Interface | PUL+ (step), DIR+ (direction), ENA+ (enable) |
| Important | Pin 3 (VCC) MUST connect to Nano 5V for signal reference |

### 7.4 Wiring — EXP_002

#### ESP ↔ Nano

| ESP Pin | Nano Pin | Purpose |
|---------|----------|---------|
| TX | D0 (RX) | Serial commands |
| GND | GND | Common ground |
| D5 (GPIO14) | RST | Remote Nano reset (for flashing) |

#### Nano ↔ ISD04

| Nano Pin | ISD04 Pin | Purpose |
|----------|-----------|---------|
| D4 | PUL+ | Step pulse |
| D5 | DIR+ | Direction |
| D6 | ENA+ | Enable (active LOW) |
| D2 | — | Hall-effect sensor (interrupt) |
| 5V | VCC (pin 3) | Signal reference voltage |
| GND | GND (pin 2) | Shared ground |

#### ESP ↔ OLED

| ESP Pin | OLED Pin | Purpose |
|---------|----------|---------|
| D1 (SCL) | SCK | I2C clock |
| D2 (SDA) | SDA | I2C data |

#### Full Net Table (from KiCad schematic)

| Net | From | To | Purpose |
|-----|------|----|---------:|
| `tx` | ESP TX (J2.13) | Nano RX (D0) | Serial commands |
| `D4` | Nano D4 | J4 IDC → ISD04 PUL+ | Step pulse |
| `D5` | Nano D5 | J4 IDC → ISD04 DIR+ | Direction |
| `hall_effect` | J5 IDC | Nano D2 | Hall sensor input |
| `SCK` | ESP D1 | OLED J3.3 | I2C clock |
| `SDA` | ESP D2 | OLED J3.4 | I2C data |
| `12V+` | J6.1 | J4 IDC → ISD04 | Motor power |
| `Vin` | J1.15 | Nano 5V, J4, J5 | Logic power |
| `GND` | J6.2 | All boards | Common ground |

---

## 8. Slewing Bearing Motor (Up/Down) — EXP_005

**Motor:** StepperOnline 23HP22-2804S (NEMA 23, bipolar, 2.8A, 1.20 Nm)  
**Driver:** Yundan DM556  

### Motor → M12 Connector Soldering

| M12 Pin | M12 Wire Colour | Motor Wire | Phase |
|---------|----------------|------------|-------|
| Pin 1 | White | **Black** | A+ |
| Pin 2 | Blue | **Green** | A- |
| Pin 3 | Black | **Red** | B+ |
| Pin 4 | Red | **Blue** | B- |

> If motor direction is inverted, swap pins 1 & 2 (or 3 & 4) to reverse one coil.

---

## 9. Connector Mapping (Controller ↔ Installation Plates)

The machine has two connection plates linked by 4-pin cables:

- **Controller Plate:** 16× GX16-4 Aviator connectors (L1–L16)
- **Installation Plate:** 18× M12/M8 connectors (p1–p18)

Mapping discovered experimentally in EXP_004 (Arduino Mega 4×4 cross-scan).

### Mapping Table

| Controller (L) | Installation (p) | Wires Connected | Pin Mapping |
|---|---|---|---|
| L1 | p5 | 2/4 | avi1→m4, avi2→m2+m3 |
| L2 | p6 | 1/4 ⚠️ | avi1→m4 (possibly damaged cable) |
| L4 | p3 | 2/4 | avi1→m4, avi2→m2+m3 |
| L5 | p4 | 2/4 | avi1→m4, avi2→m2+m3 |
| L6 | p11 | 2/4 | avi1→m4, avi2→m2+m3 |
| L7 | p10 | 2/4 | avi1→m4, avi2→m2+m3 |
| L8 | p17 | 2/4 | avi1→m4, avi2→m2+m3 |
| L10 | p9 | 3/4 | avi1→m4, avi2→m1, avi3→m2+m3 |
| L11 | p15 | 3/4 | avi1→m4, avi2→m1, avi3→m2 |
| L12 | p16 | 3/4 | avi1→m4, avi2→m1, avi3→m2 |
| L14 | p8 | 3/4 | avi1→m4, avi2→m2+m3, avi4→m1 |
| L15 | p12 | 3/4 | avi1→m2+m3, avi2→m1, avi3→m4 |
| L16 | p2 | **4/4** ✅ | avi1→m4, avi2→m3, avi3→m2, avi4→m1 |

**Not yet mapped:** L3, L9, L13 | **Not yet tested:** p1, p7, p13, p14, p18

> Only L16→p2 has a clean 4-wire connection. Most cables show m_pin2 and m_pin3 bridged together.

---

## 10. Lab Agent Integration

The **SYNTHETICA Lab Agent** runs on the server (`172.16.1.80:8003`) and controls the machine autonomously.

### Architecture

- **Planner:** Gemini (`gemini-2.5-flash`) — decomposes goals into steps
- **Executor:** Ollama (`qwen2.5:14b`) — runs each step via bounded ReAct loop
- **Reflector:** Gemini — summarizes outcomes, updates `AGENT_STATE.md`

### Agent Tool Functions

All tools are defined in [`machine_tools.py`](../../applications/lab-agent/agent/tools/machine_tools.py):

| Tool Function | What It Does | Calls API |
|---------------|-------------|-----------|
| `motor_status()` | Get position, calibration, hall, speed, moving | `/api/status` |
| `motor_goto("tube1")` | Move to named position | `/api/goto?target=` |
| `motor_positions()` | List all named positions | `/api/positions` |
| `motor_half_rotation()` | Move to 180° point | `/api/half` |
| `motor_home()` | Home to hall sensor | `/api/home` |
| `motor_calibrate()` | Full calibration (1–2 min) | `/api/calibrate` |
| `motor_move(steps)` | Relative move (+/-) | `/api/move?steps=` |
| `motor_move_to(pos)` | Absolute move | `/api/move-to?pos=` |
| `motor_stop()` | Emergency stop | `/api/stop` |
| `motor_set_speed(sps)` | Set max speed | `/api/speed?value=` |
| `motor_set_accel(val)` | Set acceleration | `/api/accel?value=` |
| `motor_set_offset(n)` | Set tube offset from hall | `/api/set-offset?value=` |
| `send_command("CMD")` | Legacy: raw serial command | `/send?cmd=` |
| `get_machine_status()` | ESP status (IP, uptime, RAM) | `/status` |
| `get_machine_log()` | Recent log entries (50 max) | `/log` |

### Agent API (port 8003)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/chat` | Send message, get events |
| GET | `/api/agent/status` | Active agent sessions |
| GET | `/api/agent/sessions` | All saved sessions |
| GET | `/api/agent/timeline/{id}` | Session timeline events |
| GET | `/api/files/list?path=` | Browse workspace files |
| GET | `/api/files/read?path=` | Read file content |
| WS | `/ws/agent` | Real-time event stream |

### Safety Rules

1. Source-based tool restrictions prevent scheduled tasks and Telegram from issuing motor commands
2. Always check `motor_status()` first — ensure `calibrated: 1`
3. Start small with `motor_move(50)` before large moves
4. Use `motor_stop()` immediately if anything seems wrong
5. Calibration blocks other motor commands — wait for it to finish

---

## 11. Agent Skills (Firmware Flashing)

### Flash ESP8266 (OTA)

```bash
/home/michael/.pio-venv/bin/pio run -e ota -t upload -d /opt/synthetica-lab/experiments/EXP_002/firmware/esp8266_ota
# Verify after 10s:
curl http://172.16.1.115/status
```

### Flash Arduino Nano (Remote via TCP bridge)

```bash
cd /opt/synthetica-lab
export PATH=/home/michael/.pio-venv/bin:$PATH
python3 experiments/EXP_002/firmware/flash_nano.py
# Verify:
curl 'http://172.16.1.115/send?cmd=PING'
```

---

## 12. Experiments Index

| Experiment | Title | What It Contains |
|-----------|-------|------------------|
| [EXP_002](../../experiments/EXP_002/summary.md) | LLM Autonomous Control | Main firmware, hardware docs, PCB schematics, old codes |
| [EXP_003](../../experiments/EXP_003/summary.md) | Marimo Buoyancy Modeling | Mathematical model, simulation code, parameter sweeps |
| [EXP_004](../../experiments/EXP_004/summary.md) | Connector Mapper | Arduino Mega cross-scan, web app, connector mapping data |
| [EXP_005](../../experiments/EXP_005/summary.md) | High-Power Motor (DM542T) | DM542T/DM556 firmware, NEMA 23 motor, 24V board |

---

## 13. Key File Paths

| Path | Description |
|------|-------------|
| `experiments/EXP_002/firmware/esp8266_ota/src/main.cpp` | ESP8266 firmware source (production) |
| `experiments/EXP_002/firmware/arduino_nano/src/main.cpp` | Nano firmware source (production) |
| `experiments/EXP_002/firmware/flash_nano.py` | Remote Nano flasher (STK500v1 over TCP) |
| `experiments/EXP_005/firmware/esp8266_ota/src/main.cpp` | ESP8266 firmware (DM542T board) |
| `experiments/EXP_005/firmware/arduino_nano/src/main.cpp` | Nano firmware (DM542T board) |
| `experiments/EXP_002/hardware/` | PCB photos, KiCad schematic, SKiDL description |
| `experiments/EXP_004/webapp/` | Connector mapping web app + JSON exports |
| `applications/lab-agent/` | Agent code (core, tools, server) |
| `applications/lab-agent/skills/machine_control.md` | Agent machine control reference |
| `applications/lab-agent/skills/flash_esp.md` | ESP flashing instructions |
| `applications/lab-agent/skills/flash_nano.md` | Nano flashing instructions |
| `applications/lab-agent/ARCHITECTURE.md` | Full system architecture |
| `projects/cryptographic_beings/knowledge/connector_mapping.md` | Connector wiring knowledge |

---

## 14. Troubleshooting

| Problem | Fix |
|---------|-----|
| ESP not connecting to WiFi | Check SSID/password in `esp8266_ota/src/main.cpp`. Try `ping cryptobeings.local` |
| mDNS not resolving | Use IP directly: `172.16.1.115` |
| Nano upload fails "not in sync" | Board is `nanoatmega328new` (new bootloader). Check serial device |
| Motor not moving | Check 12V/24V power. Send `STATUS` to verify `ENABLED:1` |
| `ERROR:NOT_CALIBRATED` | Run `CALIBRATE` or `motor_calibrate()` first |
| `CAL_FAIL:NO_HALL` | Check sensor wiring. EXP_002: D2, EXP_005: D7. Check magnet alignment |
| OTA update fails | Ensure Mac is on `MEDICALEX` WiFi. Ping ESP first. If stuck, USB reflash |
| Remote Nano flash fails | Retry — serial sync sometimes needs multiple attempts. Bootloader window is ~500ms |
| Motor vibrates but doesn't turn | Check DIP switches on ISD04 (microstepping). Verify direction pin wiring |
| Tube offset resets on reboot | Expected — offset is NOT persisted. Call `SET_OFFSET` again after power cycle |
