# EXP_002: Cryptographic Beings — LLM Autonomous Control

**Start Date:** 2026-03-01
**Project:** Cryptographic Beings LLM
**Status:** Phase 1 complete, Phase 2 in progress

---

## Overview

The Cryptographic Beings machine is a bio-hybrid system that uses Marimo moss balls (*Aegagropila linnaei*) as a biological medium for digital information storage. Each glass tube contains a moss ball that can be in one of two states:

- **Low (0):** Sinking — moss ball rests at the bottom (dark conditions)
- **High (1):** Floating — moss ball rises to the surface (light stimulates photosynthesis, producing gas vesicles)

By controlling light exposure per tube and reading the float/sink state, the machine encodes binary data using living organisms. The current setup can store a **5-letter word** using 6-bit character encoding.

Project page: https://michaelsedbon.com/Cryptographic-Beings

## Goal

Give **autonomous control** of the machine to a local **Ollama LLM** running on a server in the same network.

## Progress

### Phase 1: Hardware Documentation ✅
- Analyzed 5 PCB photos and identified all components
- Created SKiDL PCB description (`motor_level_controller.py`)
- Created schemdraw 2D schematic renderer (`render_schematic.py`)
- Built KiCad schematic with full connectivity (`level_motor_controler.kicad_sch`)
- Documented ISD04 NEMA17 integrated stepper motors

### Phase 2: Firmware & Communication ✅ (partial)
- **ESP8266 firmware deployed** — WiFi + OTA + web dashboard
  - IP: `172.16.1.115` / `cryptobeings.local`
  - Web dashboard: http://172.16.1.115
  - OTA updates enabled (no USB needed)
- **Arduino Nano firmware deployed** — motor controller
  - Serial command protocol: MOVE, HOME, STATUS, STOP, SPEED
  - ISD04 stepper driver with trapezoidal acceleration
  - Hall-effect sensor homing support
- **Not yet done**: Wire ESP↔Nano together, test full chain, add OLED

### Phase 3: Ollama Integration 🔲
- Deploy Ollama on local network server (172.16.1.80)
- Create agent wrapper with tool-use for machine control
- Define safety constraints and autonomous operation boundaries

## Hardware Summary

| Subsystem | Components |
|-----------|------------|
| **Structure** | Vertical tower with circular array of glass tubes |
| **Biological** | Marimo moss balls in liquid-filled glass cylinders |
| **Motion** | ISD04 NEMA17 integrated steppers (12-38V), timing belts & pulleys |
| **Sensing** | Hall-effect sensors for position feedback |
| **Display** | SSD1306 0.96" OLED (I2C) |
| **Control** | ESP8266 (WiFi brain) + Arduino Nano (motor controller) |
| **PCB** | Motor Level Controller board (custom, documented in KiCad) |

## Directory Structure

See `SCRIPT_INDEX.md` for detailed file documentation.

## References

- Phillips, N. et al. (2019). "Marimo machines"
- Phillips, N. et al. (2022). "Marimo actuated rover systems"
