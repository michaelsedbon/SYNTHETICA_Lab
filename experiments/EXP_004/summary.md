# EXP_004: Automated Connector Mapping

**Start Date:** 2026-03-03
**Status:** In progress
**Airtable Links:** None

---

## Overview

Cable-pair continuity testing tool for the Cryptographic Beings installation. Uses an Arduino Mega to discover which controller plate connector (L1–L16) maps to which installation plate position (p1–p18), and which internal wires connect to which.

## Hardware Setup

**Arduino Mega 2560** with 8 wires:

| Side | Connector | Wire | Arduino Pin |
|------|-----------|------|-------------|
| Controller Plate | Aviator GX16-4 Pin 1 | 🔴 Red | D22 |
| Controller Plate | Aviator GX16-4 Pin 2 | ⚫ Black | D23 |
| Controller Plate | Aviator GX16-4 Pin 3 | ⚪ White | D24 |
| Controller Plate | Aviator GX16-4 Pin 4 | 🔵 Blue | D25 |
| Installation Plate | M12/M8 Pin 1 | (varies) | D38 |
| Installation Plate | M12/M8 Pin 2 | (varies) | D39 |
| Installation Plate | M12/M8 Pin 3 | (varies) | D40 |
| Installation Plate | M12/M8 Pin 4 | (varies) | D41 |

**Wire colors by connector type:**
- **M12:** Pin1=White, Pin2=Blue, Pin3=Black, Pin4=Red
- **M8:** Pin1=Blue, Pin2=Black, Pin3=White, Pin4=Red

## Firmware

`firmware/src/main.cpp` — v3.0 (full cross-scan)
- Runs on Arduino Mega 2560 @ 115200 baud
- JSON protocol: `ping`, `scan`
- Full 4×4 cross-scan: tests each of 4 output pins against ALL 4 input pins
- Catches cross-wired cables and reports complete wire map

## Web App

`webapp/index.html` — single-file HTML app (open in Chrome/Edge)

### Workflow
1. Select which **p** position your M12/M8 cable is plugged into
2. Click **Start Scanning** (continuous scan every 300ms)
3. Try plugging aviator into successive L connectors until you hear a **loud beep**
4. Select which L you just plugged in → **Confirm**
5. Auto-advances to next p → move cable and repeat

### Features
- **Live wire-level display:** Shows which Aviator pin connects to which M12/M8 pin (with color codes)
- **Import JSON:** Load a previously exported mapping to view/edit/correct
- **Export JSON:** Saves connector mapping + wire-level detail
- **Delete individual mappings** or **Reset all**
- **Connector schematics** reference (Aviator, M12, M8 pinouts)

## Progress

- 2026-03-03: Firmware v1.0 → v3.0 (full cross-scan), webapp built with live scan, import/export, error correction

## Results

_Mapping in progress._

## References

- EXP_002: Main Cryptographic Beings experiment
- `documentation/Illustrator/` — annotated connector SVGs
