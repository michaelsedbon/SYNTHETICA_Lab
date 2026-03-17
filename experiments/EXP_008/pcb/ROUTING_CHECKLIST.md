# KiCad Routing Checklist — Mycelium Sensor/Stim Board

## Setup

- [ ] Open KiCad → **New Project** → save in `experiments/EXP_008/pcb/kicad/`
- [ ] **PCB Editor** → File → Import Netlist → select `experiments/EXP_008/pcb/atopile/build/default.net`
- [ ] Set footprint library path: Preferences → Manage Footprint Libraries → add `experiments/EXP_008/pcb/atopile/build/footprints/footprints.pretty`
- [ ] Import netlist again (now footprints will resolve)
- [ ] Verify all components appear on the board

## Board Setup

- [ ] Set **4-layer stackup**: F.Cu / In1.Cu (GND) / In2.Cu (Power) / B.Cu
- [ ] Board outline: ~50mm × 60mm (adjust after placement)
- [ ] Design rules: 0.2mm min trace, 0.3mm min clearance, 0.3mm min via drill
- [ ] Set JLCPCB constraints: [jlcpcb.com/capabilities](https://jlcpcb.com/capabilities/pcb-capabilities)

## Component Placement (do in this order)

- [ ] **Connectors first** — USB-C on one edge, electrode headers on opposite edge, debug on a side
- [ ] **ADS1299** (TQFP-64) — center-left, near electrode headers, short analog traces
- [ ] **ESD protection** (PRTR5V0U2X ×8) — between electrode headers and ADS1299
- [ ] **Crystal** (HC-49S) + load caps (22pF ×2) — close to ADS1299 CLK pin
- [ ] **ADC decoupling** (100nF, 1µF) — directly next to ADS1299 power pins
- [ ] **DAC8564** (TSSOP-16) + **OPA4188** (TSSOP-14) — opposite side from ADC for crosstalk isolation
- [ ] **Stimulation resistors** (10kΩ ×8, 1kΩ ×4) — near OPA4188
- [ ] **Stim decoupling** (100nF ×3, 10µF) — next to DAC/opamp power pins
- [ ] **ESP32-S3** (WiFi module) — near USB-C, digital side
- [ ] **MCU decoupling** (100nF, 10µF, 1µF) — next to ESP32 power pins
- [ ] **LEDs** (green + blue) + resistors (1kΩ ×2) — board edge, visible
- [ ] **Power supply** — AMS1117 (SOT-223), TLV75733 (SOT-23-5), TPS65131 (QFN-24) near USB input
- [ ] **Power caps** — 10µF ×5, 4.7µF ×2 next to their respective regulators

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
