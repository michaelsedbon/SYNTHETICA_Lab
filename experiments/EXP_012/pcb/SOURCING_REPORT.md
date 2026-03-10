# ESP32 Motor Controller — Sourcing Report

## Summary

All 28 component types sourced from LCSC. **24 are JLCPCB Basic parts** (no extra assembly fee), **3 are Extended** (small per-component fee applies).

---

## Cost Estimate (5 boards)

| Category | Per Board | 5 Boards |
|----------|----------|----------|
| ESP32-WROOM-32-N4 (extended) | $2.81 | $14.05 |
| CH340C (extended) | $0.57 | $2.85 |
| XL1509-5.0E1 (basic) | $0.11 | $0.55 |
| AMS1117-3.3 (basic) | $0.20 | $1.00 |
| All other components (basic) | ~$0.80 | ~$4.00 |
| **Component total** | **~$4.49** | **~$22.45** |
| PCB fabrication (2-layer, ~60x45mm) | — | ~$5.00 |
| SMT assembly fee | — | ~$8.00 |
| Extended part fee (3 parts x $3) | — | ~$9.00 |
| **Estimated grand total** | — | **~$44.45** |

> Shipping extra (~$10-20 depending on method).

---

## JLCPCB Part Classification

### Basic Parts (24 types — no extra fee)

| Component | LCSC # | Price |
|-----------|--------|-------|
| XL1509-5.0E1 | C61063 | $0.11 |
| AMS1117-3.3 | C6186 | $0.20 |
| USB-C Connector | C165948 | $0.10 |
| USBLC6-2SC6 | C7519 | $0.14 |
| S8050 NPN (x4) | C2146 | $0.01 |
| SS34 Schottky | C8678 | $0.04 |
| 3.3V Zener | C15127 | $0.01 |
| 100uF/50V Cap | C108785 | $0.05 |
| 220uF/16V Cap | C106456 | $0.04 |
| 22uF Ceramic (x2) | C45783 | $0.03 |
| 10uF Ceramic | C15850 | $0.01 |
| 100nF Ceramic (x4) | C14663 | $0.003 |
| 1uF Ceramic | C15849 | $0.01 |
| 10kΩ Resistor (x4) | C25804 | $0.003 |
| 5.1kΩ Resistor (x2) | C23186 | $0.003 |
| 1kΩ Resistor (x5) | C21190 | $0.003 |
| 4.7kΩ Resistor (x2) | C23162 | $0.003 |
| 330Ω Resistor (x3) | C23138 | $0.003 |
| Green LED | C72043 | $0.01 |
| Blue LED | C72041 | $0.02 |
| Yellow LED | C72038 | $0.01 |
| Screw Terminal (x3) | C8269 | $0.07 |
| 4-pin Header | C124378 | $0.02 |
| Tactile Button (x2) | C318884 | $0.02 |

### Extended Parts (3 types — ~$3 extra fee each)

| Component | LCSC # | Price | Why Extended |
|-----------|--------|-------|-------------|
| ESP32-WROOM-32-N4 | C82899 | $2.81 | Specialty module |
| CH340C | C84681 | $0.57 | USB-serial IC |
| 100uH Inductor | C107564 | $0.15 | Power inductor |

---

## Sourcing Decisions

### USB-to-Serial: CH340C (C84681)
- Currently in stock (38k+ units)
- SOP-16 package
- If out of stock at order time: **CH340N** (SOP-8, C2977592) is pin-different but functionally identical (internal oscillator, 3.3V compatible). Would require different footprint.

### Buck Converter: XL1509-5.0E1 (C61063)
- Fixed 5V output — simplest possible circuit
- JLCPCB basic part — no extra fee
- If out of stock: **XL1509-ADJ** (C61059, basic) with feedback resistors for 5V

### Inductor: PRS6028-101MT (C107564)
- 100µH, 2A saturation, 6x6mm shielded
- Extended part ($3 fee) — no basic 100µH inductor with sufficient current rating available
- This is acceptable since we already have 2 other extended parts

### Screw Terminals
- Using 2-position 5.08mm pitch (C8269)
- Motor connector should ideally be 3-position (PUL+, DIR+, GND) — can use one 2-pos + one separate GND, or substitute a 3-position terminal (C8293) for motor

---

## Stock Status

All components confirmed in stock on LCSC as of 2026-03-10. The ESP32-WROOM-32-N4 and CH340C have 38k+ units each — no shortage risk.

---

## Files

- `SOURCED_BOM.csv` — complete BOM with LCSC part numbers
- `tier_1_prebom.csv` — pre-sourcing BOM (input)
- `TIERED_DESIGNS.md` — functional block diagram
- `RESEARCH_REPORT.md` — full research and architecture decisions
