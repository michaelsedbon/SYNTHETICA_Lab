# EXP_002 — Script & File Index

Comprehensive index of all scripts, firmware, and documentation files.

---

## Python Scripts

### `hardware/pcb_descriptions/motor_level_controller.py`
**Purpose:** SKiDL-based PCB description documenting all components and connections on the Motor Level Controller board.

**What it contains:**
- Component definitions matching the physical PCB (extracted from KiCad schematic)
- Net connections: `GND`, `Vin`, `12V+`, `tx`, `D4`, `D5`, `SCK`, `SDA`, `VCC`, `hall_effect`
- 7 components: Arduino Nano (A1), ESP headers (J1/J2), OLED (J3), motor IDC (J4), sensor IDC (J5), power (J6)

**Dependencies:** `skidl` (pip install skidl)

**Run:**
```bash
python3 motor_level_controller.py           # Print component summary
python3 motor_level_controller.py --svg     # Generate SVG schematic
python3 motor_level_controller.py --netlist # Generate KiCad netlist
```

---

### `hardware/pcb_descriptions/render_schematic.py`
**Purpose:** Generates a 2D SVG schematic diagram using the `schemdraw` library.

**What it renders:** Visual schematic showing ESP8266, Arduino Nano, MCP23017, OLED, LM317T regulators, IDC connectors, DIP switch, and their connections.

**Output:** `motor_level_controller_schematic.svg`

**Dependencies:** `schemdraw` (pip install schemdraw)

**Run:**
```bash
/opt/anaconda3/bin/python3 render_schematic.py
```

**Notes:**
- Avoid Unicode characters in labels (causes XML parse errors in schemdraw)
- Avoid `&`, `#`, `→` characters — use ASCII alternatives

---

## Firmware

### `firmware/esp8266_ota/src/main.cpp`
**Board:** NodeMCU v1.0 (ESP-12E / ESP8266)  
**PlatformIO env:** `nodemcuv2` (USB) / `ota` (wireless)

**Features:**
- WiFi connection (SSID: `MEDICALEX`)
- ArduinoOTA for wireless firmware updates (port 8266)
- mDNS hostname: `cryptobeings.local`
- ESP8266WebServer on port 80:
  - `/` — HTML dashboard with auto-refresh logs and command form
  - `/status` — JSON status (ip, uptime, heap, rssi)
  - `/log` — JSON array of log entries (ring buffer, 50 entries)
  - `/send?cmd=...` — Send serial command to Nano
- Serial bridge: relays commands via TX to Arduino Nano, logs RX responses

**Upload:**
```bash
pio run -e nodemcuv2 -t upload -d firmware/esp8266_ota    # USB
pio run -e ota -t upload -d firmware/esp8266_ota           # OTA (wireless)
```

---

### `firmware/arduino_nano/src/main.cpp`
**Board:** Arduino Nano ATmega328P (new bootloader)  
**PlatformIO env:** `nanoatmega328`

**Features:**
- Serial command parser (115200 baud)
- ISD04 NEMA17 stepper motor driver (STEP/DIR/ENA on D4/D5/D6)
- Trapezoidal acceleration profile (50-step ramp)
- Hall-effect sensor homing with interrupt on D2
- Emergency stop support (STOP command works mid-move)

**Commands:** `MOVE <n>`, `HOME`, `STATUS`, `STOP`, `SPEED <us>`, `ENABLE`, `DISABLE`, `ZERO`, `PING`

**Upload:**
```bash
pio run -e nanoatmega328 -t upload -d firmware/arduino_nano    # USB only
```

---

## KiCad Project

### `Project_space/Cryptographic_beings/level_motor_controler/`
**Purpose:** Full KiCad 8.0 schematic of the Motor Level Controller PCB.

**Key file:** `level_motor_controler.kicad_sch`

**Components in schematic:**
| Ref | Part | Library |
|-----|------|---------|
| A1 | Arduino Nano v3.x | MCU_Module |
| J1 | ESP8266 left header (15-pin) | Connector_Generic |
| J2 | ESP8266 right header (15-pin) | Connector_Generic |
| J3 | OLED display (4-pin) | Connector_Generic |
| J4 | Motor IDC 2x3 | Connector_Generic |
| J5 | Hall sensor IDC 2x3 | Connector_Generic |
| J6 | Power 12V (2-pin) | Connector_Generic |

---

## Documentation

| File | Description |
|------|-------------|
| `summary.md` | Experiment overview, goals, and progress |
| `firmware/README.md` | Architecture, wiring, commands, upload instructions, troubleshooting |
| `hardware/README.md` | Hardware subsystem overview |
| `hardware/pcb_descriptions/README.md` | PCB documentation approach (SKiDL + schemdraw) |

## PCB Photos

Located in `hardware/pcb_descriptions/level_motor_controler/`:
| File | Shows |
|------|-------|
| `IMG_0707.jpeg` | Full board front — MCP23017, OLED, IDC connectors |
| `IMG_0708.jpeg` | Board back — NodeMCU ESP8266, version label |
| `IMG_0709.jpeg` | Close-up — LM317T regulator area |
| `IMG_0710.jpeg` | Close-up — DIP switch, capacitors, OLED header |
| `IMG_0711.jpeg` | Close-up — power section, regulator heatsink |

## Datasheets

| File | Component |
|------|-----------|
| `ISD04-10_Full_Datasheet.pdf` | ISD04 NEMA17 integrated stepper motor+driver |
| `ISD02-04-08.pdf` | ISD series comparison datasheet |
