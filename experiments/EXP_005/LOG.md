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

## ⚠ PENDING — Must Complete Next Session

### Nano firmware not yet deployed
- The Nano is still running OLD firmware with auto-calibration (motor moves on boot)
- The updated firmware (no auto-cal) is compiled but **not yet flashed**
- **Reason:** ESP HTTP server blocks when Nano floods serial during calibration, preventing OTA flash
- **To fix:** Unplug USB → wait for ESP to join WiFi → immediately run `python3 flash_nano.py arduino_nano` before calibration blocks things. Alternatively, power-cycle the board and flash in the first 10s window.

### OLED display still glitchy
- Tried: `Wire.begin()`, `setRotation(2)`, splash screen init sequence
- Display shows garbled/inverted text on this PCB — may be a hardware difference (different SSD1306 variant or 128x32 vs 128x64)
- Old working firmware used identical Adafruit_SSD1306 library and init code
- **Low priority** — dashboard provides all info via web

### Motor direction
- On first boot, motor went UP instead of DOWN toward the sensor
- After Nano firmware update deploys, test direction and swap DIR wiring or negate step direction in firmware if needed

### Sensor not yet tested
- Proximity sensor is wired but untested
- Use dashboard "Refresh Sensor" or STATUS command to check HALL value
- Sound beep should play in browser when sensor triggers
