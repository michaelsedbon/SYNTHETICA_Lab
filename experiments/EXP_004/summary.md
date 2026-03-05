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
- 2026-03-04: Added L panel visual map, plate schematics, double-click zoom, conflict detection. Completed first full mapping pass.

## Results — Connector Map (2026-03-04)

13 of 16 L connectors mapped. Data exported from `webapp/connectome/connector_mapping_2026-03-04 (3).json`.

| L (Controller Plate) | p (Installation Plate) | Wires | Pin Mapping |
|---|---|---|---|
| L1 | p5 | 2/4 | avi1→m4, avi2→m2+m3 |
| L2 | p6 | 1/4 | avi1→m4 |
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
| L16 | p2 | 4/4 ✅ | avi1→m4, avi2→m3, avi3→m2, avi4→m1 |

### Unmapped

| Not found | Notes |
|---|---|
| L3, L9, L13 | No L connector found for these positions |
| p1, p7, p13, p14, p18 | No matching cable tested yet |

### Observations

- **Only L16→p2 has a clean 4/4 mapping.** All other cables show partial connectivity (1–3 wires).
- Many cables show `avi2→m2+m3` (pin 2 bridged to both m2 and m3), suggesting a common wiring pattern or possible short between m_pin2 and m_pin3 on the M12/M8 side.
- L2→p6 has only 1/4 wires — this cable may be damaged or have very high resistance on 3 wires.

## References

- EXP_002: Main Cryptographic Beings experiment
- `documentation/Illustrator/` — annotated connector SVGs
- `webapp/connectome/` — exported JSON mapping files
