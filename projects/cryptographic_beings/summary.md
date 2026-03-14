# Cryptographic Beings

**Status:** Active
**Started:** 2026-03-01

---

## Overview

Bio-hybrid art installation that uses Marimo moss balls (*Aegagropila linnaei*) as biological binary storage elements. The machine encodes and decodes data through photosynthesis-driven buoyancy changes in 18 transparent tubes arranged in a 3×6 architecture.

Key subsystems:
- **Biological layer:** Marimo algae in water-filled tubes; light exposure triggers photosynthetic O₂ production → buoyancy rise (bit = 1), darkness → sinking (bit = 0)
- **Control hardware:** LattePanda Alpha SBC running Ubuntu 24.04, direct USB serial to Arduino Nanos (DM556 stepper drivers), ESP8266 HTTP proxy for ISD04 level motors, ESP32-CAM for imaging. Custom PCB for motor controllers.
- **Software:** FastAPI machine controller with tabbed web dashboard (motors, cameras, relays), WebSocket real-time updates, device registry via `devices.yaml`, manual calibration workflow with level % positioning.

## Quick Access

| Interface | URL |
|-----------|-----|
| **🖥️ Machine Controller** | **[http://172.16.1.128:8000](http://172.16.1.128:8000)** |
| ESP8266 Level Motor | [http://172.16.1.115](http://172.16.1.115) |
| ESP32-CAM | [http://172.16.1.120](http://172.16.1.120) |

## Experiments

<!-- AUTO:EXPERIMENTS -->
| Exp | Title | Start Date |
|-----|-------|------------|
| [EXP_002](../../experiments/EXP_002/summary.md) | Cryptographic Beings — LLM Autonomous Control | 2026-03-01 |
| [EXP_003](../../experiments/EXP_003/summary.md) | Marimo Buoyancy Mathematical Modeling | 2026-03-01 |
| [EXP_004](../../experiments/EXP_004/summary.md) | Connector Mapper — Cryptographic Beings | 2026-03-03 |
| [EXP_005](../../experiments/EXP_005/summary.md) | Cryptographic Beings — High-Power Motor Control (DM542T) | 2026-03-04 |
| [EXP_011](../../experiments/EXP_011/summary.md) | Sequential Motor Firmware Debug (DM542T) | 2026-03-10 |
| [EXP_012](../../experiments/EXP_012/summary.md) | ESP32 Motor Controller — PCB Design | 2026-03-10 |
| [EXP_014](../../experiments/EXP_014/summary.md) | LattePanda Alpha Serial Machine Controller | 2026-03-12 |
<!-- /AUTO:EXPERIMENTS -->

## Knowledge Base

- [System Documentation](SYSTEM_DOCUMENTATION.md) — Complete system reference: firmware, networking, API, wiring, agent integration
- [Connector Mapping](knowledge/connector_mapping.md) — How the machine's 16 GX16-4 aviator connectors map to installation plate positions

## Hardware

- [Level Motor Controller PCB](hardware/level_motor_controller/) — KiCad schematics and SKiDL description for the stepper motor control board
