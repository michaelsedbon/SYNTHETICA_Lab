# EXP_005 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-04 — Experiment Created

- Initialised experiment folder from template.
- Goal: Setup 2 additional DM542T motor controllers (Board 3 & 4) with 24V power.
- Reverted all changes to EXP_002 to maintain separation between hardware revisions.
- Prepared specialized firmware environments for DM542T boards.

## 2026-03-05 — Slewing Bearing Motor Wiring

- **Motor:** StepperOnline 23HP22-2804S (NEMA 23, 2.8A, 1.20 Nm) — drives the attach-to-slewing-bearing up/down motion.
- Soldered motor leads to an **M12 4-pin** connector for the installation plate.
- Pin mapping: Pin 1 → A+ (Black), Pin 2 → A- (Green), Pin 3 → B+ (Red), Pin 4 → B- (Blue).
- Full wiring reference added to [connector_mapping.md](../../projects/cryptographic_beings/knowledge/connector_mapping.md).

## 2026-03-05 — Proximity Sensor Wiring

- **Sensor:** LJ8A3-2-Z/BX (NPN NO, 10-30V DC, 2mm detection, M8 body)
- Cable color mapping: Brown(VCC)→Red, Blue(GND)→Yellow, Black(Signal)→White
- Connected to Arduino Nano D3 with internal pull-up (`INPUT_PULLUP` in firmware)
- External 10kΩ pull-up **not needed** — internal pull-up is sufficient

## 2026-03-05 — ESP8266 + Nano Firmware Flashing

### ESP8266 (NodeMCU)
- Flashed via USB: `pio run -e nodemcuv2 -t upload -d esp8266_ota`
- **IP:** `172.16.1.115` | **Hostname:** `cryptobeings-dm542t.local`
- **MAC:** `ac:0b:fb:d8:56:8c`
- Firmware features: WiFi, OTA on port 8266, WebSocket debug on port 81, HTTP API on port 80, TCP serial bridge on port 2323, OLED display

### Arduino Nano
- Flashed OTA via `flash_nano.py arduino_nano` (through ESP TCP bridge)
- Verified: ATmega328P signature confirmed, PING→PONG working

### Web Dashboard (NEW)
- Full motor control interface at `http://172.16.1.115/`
- **Motor buttons:** MOVE ±100/±1000, HOME, STOP, CALIBRATE, HALF, ZERO, STATUS
- **Proximity sensor panel:** Live LED indicator + audible beep on trigger (Web Audio API)
- **Speed/Accel sliders:** Range controls with Apply buttons
- **Status grid:** Position, speed, moving, calibrated, SPR, enabled — auto-polled every 5s
- **Live log:** WebSocket debug log with TX (yellow) / RX (green) color coding
- **Manual command input:** Type any raw serial command

### Firmware Changes Made
1. **WebSocket sanitizer** — strips non-printable/non-ASCII bytes from serial data before `broadcastTXT()` to prevent browser `Could not decode text frame as UTF-8` errors
2. **OLED init sequence** — added `display.display()` + `delay(100)` splash before clearing (matches old working firmware pattern)
3. **Disabled auto-calibration on boot** — Nano `setup()` no longer calls `startCalibration()`. Motor sits idle until commanded via web interface.

## 2026-03-06 — Nano Firmware Flashed (Auto-Cal Disabled)

- Flashed updated Nano firmware via OTA (`flash_nano.py arduino_nano`)
- Required power-cycle trick: unplug → re-plug → flash within first seconds before old auto-cal blocks ESP HTTP server
- **Reset response:** `{"ok":true,"msg":"Nano reset, bootloader active"}`
- **Signature:** `1e950f` (ATmega328P confirmed)
- **Flash:** 110/110 pages written (13,962 bytes), completed in ~9 seconds
- **Post-flash status:** `pos:0, hall:1, moving:0, calibrated:0, speed:2000`
- ✅ Motor is idle on boot — no auto-calibration
- ✅ Proximity sensor responding (`hall:1` — sensor is triggered at current position)

## ⚠ PENDING — Must Complete Next Session

### ~~Nano firmware not yet deployed~~ ✅ DONE (2026-03-06)
- Flashed via power-cycle trick + `flash_nano.py arduino_nano`

### OLED display still glitchy
- **Low priority** — dashboard provides all info via web

### Motor direction — NEEDS TESTING
- On first boot, motor went UP instead of DOWN toward the sensor
- Test with `MOVE 100` / `MOVE -100` via dashboard and check physical direction
- If wrong: swap DIR wiring or negate in firmware (`stepper.setPinsInverted(true, false, false)`)

### ~~Sensor not yet tested~~ ✅ CONFIRMED WORKING (2026-03-06)
- Status shows `hall:1` — sensor is triggered at current position
- Still need to test: does it toggle when object moves away?

## 2026-03-06 — Barebone Firmware Restart

Serial communication between ESP and Nano stopped working. Rewrote both firmwares from scratch to isolate the issue.

### Changes
- **ESP8266**: Stripped from 896 to ~170 lines. Removed OLED, WebSocket, all motor-specific API endpoints. Kept: WiFi, OTA, serial bridge, TCP bridge, `/api/ping`, `/api/send`.
- **Arduino Nano**: Stripped from 464 to ~100 lines. Removed calibration, named positions, homing. Kept: PING/PONG, STATUS, MOVE, STOP, SPEED. Added LED blink on boot.
- **platformio.ini**: Removed OLED/WebSocket library dependencies.

### Result
- ✅ ESP flashed via OTA — 15 seconds
- ✅ Nano flashed via `flash_nano.py` — 81 pages, ATmega328P confirmed
- ✅ `PING → PONG` working
- ✅ `STATUS → POS:0` working
- ✅ `MOVE 100 → OK MOVE 100` working

**Root cause hypothesis**: Removing the OLED (I2C on D1/D2) and WebSocket server eliminated interference. The OLED's I2C init may have been corrupting serial lines on boot.
