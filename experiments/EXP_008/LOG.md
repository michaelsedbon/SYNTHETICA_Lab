# EXP_008 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-09 — Experiment Created

- Initialised experiment folder from `/design-pcb` workflow.
- Goal: Design a mycelium action potential sensor + stimulation PCB (Tier 2: 8 rec + 4 stim channels)
- Created `pcb/` subdirectory for all PCB design artifacts.

## 2026-03-09 — Step 2: Literature Scout Completed

- Searched GitHub, Hackaday, Open Ephys, TI, bioRxiv, PubMed for reference designs
- Found 12 projects, shortlisted 6 — see [RESEARCH_REPORT.md](pcb/RESEARCH_REPORT.md)
- Top reference designs:
  1. **OpenBCI Cyton** (ADS1299, 8ch recording, PIC32) ⭐ 5/5
  2. **Stimjim** (Open Ephys, 2ch Howland pump stimulation, KiCad) ⭐ 5/5
  3. **TI ADS1299EEGFE-PDK** (official evaluation board) ⭐ 4/5
  4. **OpenMEA** (16ch closed-loop record+stim, FPGA) ⭐ 3/5
  5. **BioAmp EXG Pill** (compact biopotential AFE) ⭐ 4/5
- Recommended architecture: ADS1299 + DAC + Howland pump + ESP32-S3 + USB-C
- Critical finding: signals are DC-coupled sub-Hz — must avoid AC coupling caps

## 2026-03-09 — Step 3: Component Analysis & Tiered Designs Completed

- Decomposed board into 5 functional blocks: electrode interface, recording (ADS1299), stimulation (DAC + Howland pump), MCU (ESP32-S3), power
- Created 4 design tiers with real LCSC pricing — see [TIERED_DESIGNS.md](pcb/TIERED_DESIGNS.md)
  - Tier 1 PoC: 4rec, ~$42
  - Tier 2 Explorer: 8rec + 4stim, ~$65 ⭐ recommended
  - Tier 3 Research: 16rec + 8stim, ~$120
  - Tier 4 Dense Grid: 32rec + 16stim, ~$225
- Generated complete pre-BOM CSV for Tier 2: [tier_2_prebom.csv](pcb/tier_2_prebom.csv) (38 line items)
- Key components: ADS1299IPAGR ($31), DAC8564IAPW ($11), OPA4188AIPWR ($1.78), ESP32-S3-WROOM ($3.25)

## 2026-03-09 — Step 4: LCSC/JLCPCB Sourcing Completed

- All 23 unique parts sourced from LCSC — see [SOURCED_BOM.csv](pcb/SOURCED_BOM.csv) and [SOURCING_REPORT.md](pcb/SOURCING_REPORT.md)
- 15 basic parts ($0 assembly fee) + 8 extended parts (~$3 each)
- One substitution: TLV71333 → TLV75733PDBVR (lower noise, same package, pin-compatible)
- No unavailable components — **board is 100% JLCPCB-assemblable**
- BOM cost per board: ~$52; assembly fee: ~$24; **total ~$94/board**

## 2026-03-09 — Step 5: Atopile Schematic Generation Completed

- Installed Atopile v0.2.69 via Python 3.11
- Created 6 `.ato` module files + `ato.yaml` project config — see `pcb/atopile/`
  - `main.ato` — top-level board with inter-block connections
  - `power.ato` — 3-rail power supply (DVDD, AVDD, ±5V)
  - `adc.ato` — ADS1299 8ch recording with ESD + crystal
  - `stim.ato` — 4ch Howland current pump stimulation
  - `mcu.ato` — ESP32-S3 with dual SPI + USB + LEDs
  - `connectors.ato` — USB-C + electrode headers + debug
- Atopile first-run setup wizard requires interactive terminal — user needs to run `ato build` once
- After build: KiCad project will be in `pcb/atopile/build/default/` for routing
