# EXP_014: LattePanda Alpha Serial Machine Controller

**Start Date:** 2026-03-12
**Status:** Phase 5 complete — production hardening (udev, systemd, reconnection)
**Airtable Links:** None
**Parent Experiments:** EXP_005, EXP_011, EXP_012

---

## Overview

Full machine control platform for the Cryptographic Beings installation, replacing the failed ESP8266+Nano WiFi bridge with direct USB serial from a LattePanda Alpha 864s running Ubuntu 24.04. The LattePanda hosts a FastAPI backend + tabbed web dashboard and exposes a complete REST API for remote control (browser, Antigravity agents, lab server).

## Goal

Build a scalable, headless machine controller that:
- Controls DM556 stepper motors via Arduino Nanos over USB serial
- Controls ISD04 level motors via ESP8266 HTTP proxy
- Reads proximity sensors per motor
- Serves a tabbed web dashboard (Motors / Cameras / Relays)
- Exposes a full REST API for external/agent control
- Supports ESP32-CAM live feeds and relay board control
- Runs as a systemd service with SSH access from Mac + server

## Hardware

| Component | Details |
|-----------|---------|
| **Controller** | [LattePanda Alpha 864s](https://www.lattepanda.com/lattepanda-alpha) — Intel Core m3-8100Y, 8GB RAM, 3× USB 3.0 + USB-C, WiFi AC, GbE |
| **Motor driver** | DM556 (Yundan), 24V DC, up to 5.6A |
| **Motor** | StepperOnline 23HP22-2804S (NEMA 23, 2.8A, 1.20 Nm) |
| **Level motor** | ISD04 NEMA17 integrated stepper (EXP_002) via ESP8266 HTTP |
| **Sensor** | LJ8A3-2-Z/BX NPN NO proximity probe |
| **Camera** | AI-Thinker ESP32-CAM (EXP_005), MJPEG stream on port 81 |
| **Interface** | Arduino Nano USB serial (115200 baud, old bootloader 57600 upload) |
| **Confirmed config** | AccelStepper DRIVER mode, D4=Step, D2=Dir, D3=Sensor, 2000 sps, 1000 accel |

## Progress

- ✅ **Phase 1:** Ubuntu 24.04 installed, SSH configured (`ssh lp`), Python venv + dependencies.
- ✅ **Phase 2:** Nano detected, firmware flashed, PING/MOVE/STATUS verified, motor physically moves.
- ✅ **Phase 3:** FastAPI backend + web dashboard at `http://172.16.1.128:8000`.
- ✅ **Phase 4A:** ISD04 level motors via ESP HTTP, `devices.yaml` registry with experiment refs.
- ✅ **Phase 4B:** EXP_014 firmware flashed (IDENTIFY/SENSOR/HOME), 57600 baud bootloader fix.
- ✅ **Phase 4C:** Manual calibration (max_steps, level %), tabbed dashboard (Motors/Cameras/Relays), ESP32-CAM card.
- ✅ **Phase 5:** Udev rules (`/dev/motor_1`), systemd auto-start, USB/ESP/camera reconnection, deploy script.

## Results

- Tabbed dashboard live at `http://172.16.1.128:8000` — Motors, Cameras, Relays tabs.
- Controls 1× DM556 motor (MOTOR_1) + 1× ISD04 level motor (LEVEL_1) + 1× ESP32-CAM (CAM_1).
- Manual calibration: zero position → set max_steps → level % slider (0–100%).
- Full REST API: move, moveto, home, stop, zero, sensor, max_steps, level, config, scan.
- Device registry: `devices.yaml` with experiment refs, firmware paths, persistent max_steps.
- Sensor beep on proximity trigger (Web Audio API).
- SSH access: `ssh lp` (key-based, passwordless sudo).
- Server deployed at `~/machine-controller-app/` on LattePanda.

## References

- [EXP_005 — Original DM556 setup](../EXP_005/summary.md)
- [EXP_002 — ISD04 Level Motor + LLM Control](../EXP_002/summary.md)
- [EXP_011 — Confirmed working serial config](../EXP_011/LOG.md)
- [EXP_012 — ESP32 PCB redesign (alternative approach)](../EXP_012/summary.md)
- [LattePanda Alpha specs](https://www.lattepanda.com/lattepanda-alpha)

