# EXP_004 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-03 — Experiment Created

- Initialised experiment folder from template.
- Goal: Automate connector mapping between Panel A and Panel B using Arduino Mega.
- Arduino Mega detected at `/dev/cu.usbserial-21220` with DFRobot MEGA Sensor Shield V2.4.

---

## 2026-03-03 — Firmware + Web App Build

- **Firmware v1.0 → v3.0:** evolved from simple continuity check to full 4×4 cross-scan. Tests each of 4 output pins against all 4 input pins to catch cross-wired cables.
- **Web app built:** single-file HTML/JS app with:
  - Guided workflow: select position → continuous scan → beep on match → confirm connector
  - Live wire-level display showing pin-to-pin connections
  - Import/export JSON for session persistence
  - Delete individual mappings and reset all
- **Pin-number refactor:** replaced wire-color references with pin numbers in JSON export format (e.g. `aviator_pin1 → m_pin4`). Updated UI to display pin numbers. Import function made backwards-compatible with older color-based format.
- **Connector schematics:** added Aviator GX16-4, M12, and M8 pinout references to the webapp for easy visual cross-reference.
