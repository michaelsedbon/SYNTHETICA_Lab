# KiCad Routing Checklist — Mycelium Sensor/Stim Board

## Setup

- [ ] Open KiCad → **New Project** → save in `experiments/EXP_008/pcb/kicad/`
- [ ] **PCB Editor** → File → Import Netlist → select `experiments/EXP_008/pcb/atopile/build/default.net`
- [ ] Set footprint library path: Preferences → Manage Footprint Libraries → add `experiments/EXP_008/pcb/atopile/build/footprints/footprints.pretty`
- [ ] Import netlist again (now footprints will resolve)
- [ ] Verify all 56 components appear on the board

## Board Setup

- [ ] Set **4-layer stackup**: F.Cu / In1.Cu (GND) / In2.Cu (Power) / B.Cu
- [ ] Board outline: ~50mm × 60mm (adjust after placement)
- [ ] Design rules: 0.2mm min trace, 0.3mm min clearance, 0.3mm min via drill
- [ ] Set JLCPCB constraints: [jlcpcb.com/capabilities](https://jlcpcb.com/capabilities/pcb-capabilities)

## Component Placement (do in this order)

- [ ] **Connectors first** — USB-C (U53) on one edge, electrode headers (U50, U51, U52) on opposite edge, debug (U56) on a side
- [ ] **ADS1299** (U11) — center-left, near electrode headers, short analog traces
- [ ] **ESD protection** (U19–U22) — between electrode headers and ADS1299
- [ ] **Crystal** (U13) + load caps (U14, U15) — close to ADS1299 CLK pin
- [ ] **ADC decoupling** (U16, U17, U18) — directly next to ADS1299 power pins
- [ ] **DAC8564** (U23) + **OPA4188** (U26) — opposite side from ADC to minimize crosstalk
- [ ] **Stimulation resistors** (U29–U40) — near OPA4188
- [ ] **Stim decoupling** (U24, U25, U27, U28) — next to DAC/opamp power pins
- [ ] **ESP32-S3** (U41) — near USB-C, digital side
- [ ] **MCU decoupling** (U42–U45) — next to ESP32 power pins
- [ ] **LEDs** (U46, U48) + resistors (U47, U49) — board edge, visible
- [ ] **Power supply** — LDOs (U1, U4), DC-DC (U7) near USB input
- [ ] **Power caps** (U2, U3, U5, U6, U8–U10) — next to their respective regulators

## Routing Priority

- [ ] **1. Ground plane** — pour In1.Cu as solid GND, split analog/digital with single bridge point under ADS1299
- [ ] **2. Power plane** — pour In2.Cu with 3.3V zones (AVDD and DVDD separate)
- [ ] **3. Analog input traces** — electrode to ESD to ADS1299, keep short and matched
- [ ] **4. Crystal traces** — short, guarded by GND vias
- [ ] **5. SPI buses** — MCU↔ADS1299 (SPI1), MCU↔DAC8564 (SPI2)
- [ ] **6. Stimulation output** — DAC→opamp→resistors→header
- [ ] **7. USB data** — 90Ω differential pair, keep short
- [ ] **8. Power routing** — VIN, DVDD, AVDD, V+5, V-5 on power plane or thick traces
- [ ] **9. LED and debug** — last priority

## Design Rules Check

- [ ] Run DRC → fix all errors
- [ ] Check unconnected nets → should be 0
- [ ] Verify all ground stitching vias are placed
- [ ] Check analog/digital ground split is clean

## Export for JLCPCB

- [ ] File → Plot → select Gerber, output all layers
- [ ] Generate drill files (Excellon format)
- [ ] Export BOM: use `experiments/EXP_008/pcb/atopile/build/default.csv`
- [ ] Export pick-and-place (CPL) file from KiCad
- [ ] Upload to [jlcpcb.com](https://jlcpcb.com) → PCB + Assembly
- [ ] Select: **4 layers**, **1.6mm**, **ENIG** finish (for fine-pitch), lead-free
- [ ] Upload BOM + CPL → verify all LCSC parts resolve → check 3D preview
- [ ] Order 🎉
