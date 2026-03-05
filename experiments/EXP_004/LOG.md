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

---

## 2026-03-04 — Visual Panel & Conflict Detection

- **L Panel visual map:** added interactive SVG of the controller plate (L1–L16) to the webapp. Mapped connectors turn green; unmapped stay gray.
- **Plate schematics:** added `plate_to_installation.svg` (p positions) and `connector_to_controler.svg` (L connectors) to the schematics reference section. Double-click to zoom, Escape to close.
- **⚠ L10 conflict observed:** multiple p positions map to L10 during continuity testing. This likely indicates a wiring issue (shorted or bridged connections at L10 on the controller plate). Needs physical inspection.
- **Conflict detection added to webapp:** if multiple p positions share the same L connector, the mapping list shows an orange ⚠️ warning banner and the L panel highlights conflicting connectors in pulsing orange.
