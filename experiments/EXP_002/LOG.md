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
