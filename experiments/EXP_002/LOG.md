# EXP_002 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-01 — Experiment Created

- Started Cryptographic Beings LLM autonomous control project.
- Goal: give autonomous control of the Marimo machine to a local Ollama LLM.

---

## 2026-03-01 — Phase 1: Hardware Documentation

- Analysed 5 PCB photos, identified all components.
- Created SKiDL PCB description (`hardware/pcb_descriptions/motor_level_controller.py`).
- Created schemdraw 2D schematic renderer (`hardware/pcb_descriptions/render_schematic.py`).
- Built KiCad schematic (`level_motor_controler.kicad_sch`).
- Documented ISD04 NEMA17 integrated stepper motors.

---

## 2026-03-01 — Phase 2: Firmware & Communication

- Deployed ESP8266 firmware — WiFi + OTA + web dashboard.
  - IP: 172.16.1.115 / cryptobeings.local
  - OTA updates enabled.
- Deployed Arduino Nano firmware — motor controller.
  - Serial commands: MOVE, HOME, STATUS, STOP, SPEED.
  - ISD04 stepper with trapezoidal acceleration.
  - Hall-effect sensor homing.

---

## 2026-03-02 — Phase 2: WiFi Debug Pipe + OLED

- Rewrote ESP8266 firmware for dedicated serial bridge architecture:
  - Hardware Serial (TX/RX) now reserved for Nano communication only
  - All debug logging redirected to WebSocket server on port 81
  - Web dashboard updated with live WebSocket-driven log stream (no more page refresh)
  - Commands can be sent to Nano from both web form and WebSocket
- Added OLED SSD1306 (128×64) support:
  - Boot screen shows "CRYPTOGRAPHIC BEINGS" + WiFi IP
  - OTA progress bar displayed on OLED during updates
- Added library deps: Adafruit SSD1306, Adafruit GFX, WebSockets
- Build verified: RAM 42.6%, Flash 34.5%
- Next: Wire ESP TX→Nano RX, RX→TX, GND→GND and test full chain

---

## 2026-03-03 — Lab Agent Improvements

- Fixed agent routing: all tasks now planned by Gemini first before execution.
- Added source-based routing with restricted tool access for scheduler tasks.
- Added coder model routing: coding tasks routed to `qwen2.5-coder:14b`.
- Added incident report with full LLM reasoning trace.
- Added copy button for session IDs on agent dashboard.

---

## 2026-03-04 — Motor Control REST API + Auto-Calibration

- **Arduino Nano firmware** — added auto-calibration on boot:
  - Homes to hall sensor, then measures one full revolution to determine `stepsPerRevolution`.
  - New serial commands: `CALIBRATE`, `HALF`, `ACCEL`, `MOVETO`.
  - Reports calibration state in `STATUS` response.
- **ESP8266 firmware** — complete REST API (11 JSON endpoints):
  - `/api/ping`, `/api/status`, `/api/calibrate`, `/api/half`, `/api/home`
  - `/api/move?steps=N`, `/api/move-to?pos=N`, `/api/stop`
  - `/api/speed?value=N`, `/api/accel?value=N`
  - All return structured JSON — replaces fragile log-scraping approach.
- **Lab Agent `machine_tools.py`** — rewritten to call REST API endpoints.
  - New tool functions: `motor_status()`, `motor_half_rotation()`, `motor_home()`, `motor_calibrate()`, `motor_move()`, `motor_stop()`.
- **Lab Agent skill doc** (`machine_control.md`) — full REST API reference + safety rules.
- Flash script updated for new board config.
