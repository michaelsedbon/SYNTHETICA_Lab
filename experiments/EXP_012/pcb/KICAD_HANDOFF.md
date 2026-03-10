# ESP32 Motor Controller — KiCad Handoff Guide

## Build Summary

- **Atopile build:** ✅ SUCCESS (51 components, 0 errors)
- **Netlist:** `atopile/build/default.net` (KiCad format, `footprints:` prefix applied)
- **BOM:** `atopile/build/default.csv` (27 unique LCSC parts)
- **Components:** 51 total placed parts

## Footprints Required (18 unique)

| # | Footprint Name | Components Using It |
|---|---------------|---------------------|
| 1 | R0603 | Resistors (17 total) |
| 2 | C0603 | Small caps + 1µF (4 total) |
| 3 | C0805 | 10µF, 22µF caps (3 total) |
| 4 | LED0603 | Green, Blue, Yellow LEDs (3 total) |
| 5 | SOT-23-3_L2.9-W1.6-H1.2-LS2.8-BR | S8050 NPN transistors (5 total) |
| 6 | SOT-23-6_L2.9-W1.6-H1.2-LS2.8-BR | USBLC6-2SC6 ESD (1) |
| 7 | SOT-223-3_L6.5-W3.4-H1.6-LS7.0-BR | AMS1117-3.3 LDO (1) |
| 8 | SOP-8_L4.9-W3.9-P1.27-LS6.0 | XL1509 buck (1) |
| 9 | SOP-16_L10.0-W3.9-P1.27-LS6.0 | CH340C USB-serial (1) |
| 10 | SMA_L4.4-W2.8-LS5.4 | SS34 Schottky diode (1) |
| 11 | SOD-323_L1.8-W1.3-LS2.5-RD | 3.3V Zener (1) |
| 12 | IND-SMD_L6.6-W6.6 | 100µH inductor (1) |
| 13 | CAP-SMD_BD6.3-L6.6-W6.6-LS7.6-FD | Electrolytic caps (2 total) |
| 14 | USB-C-SMD_TYPE-C-31-M-12 | USB-C connector (1) |
| 15 | CONN-TH_2P-P5.08_WJ128V-5.0-2P | Screw terminals (4 total) |
| 16 | HDR-TH_4P-P2.54-V | OLED header (1) |
| 17 | SW-SMD_L5.1-W5.1-P3.70 | Tactile buttons (2 total) |
| 18 | WIFI-SMD_ESP32-WROOM-32 | ESP32 module (1) |

## KiCad Import Steps

### 1. Download Footprints from LCSC/EasyEDA

For each LCSC part number, download the KiCad footprint:

1. Go to [https://www.lcsc.com](https://www.lcsc.com)
2. Search for each LCSC part number (e.g., C61063)
3. Click the part → scroll to "Footprint" section → click "Download"
4. Select "KiCad" format
5. Save all `.kicad_mod` files to: `atopile/build/footprints/footprints.pretty/`

**Alternatively**, use the [EasyEDA2KiCad](https://github.com/uPesy/easyeda2kicad.py) tool:

```bash
pip install easyeda2kicad
# For each LCSC part:
easyeda2kicad --lcsc_id C61063 --output ./atopile/build/footprints/footprints.pretty/
easyeda2kicad --lcsc_id C82899 --output ./atopile/build/footprints/footprints.pretty/
# ... repeat for each unique LCSC part
```

LCSC parts to download footprints for:
```
C61063 C8678 C107564 C108785 C106456 C14663 C6186 C45783
C2146 C21190 C165948 C23186 C7519 C84681 C25804 C82899
C8269 C124378 C318884 C15850 C15849 C15127 C23162 C72043
C23138 C72041 C72038
```

### 2. Create KiCad Project

1. Open KiCad → **New Project** → save to `pcb/kicad/esp32_motor_controller`
2. Open **PCB Editor** (not schematic editor — we're importing the netlist directly)

### 3. Add Footprint Library

1. In PCB Editor → **Preferences** → **Manage Footprint Libraries**
2. Go to **Project Specific Libraries** tab
3. Click **Add existing library to table** (folder icon)
4. Navigate to `pcb/atopile/build/footprints/footprints.pretty/`
5. Nickname should be `footprints` (matches the netlist prefix)

### 4. Import Netlist

1. **File** → **Import** → **Netlist**
2. Browse to `pcb/atopile/build/default.net`
3. Click **Load and Test** — should show **0 errors**
4. Click **Update PCB** — all 51 components appear

### 5. Layout & Routing

Recommended component placement zones:
```
┌─────────────────────────────┐
│ USB-C  │  CH340C  │  ESP32  │ ← Top edge (antenna overhang)
│────────┤──────────┤─────────│
│ BOOT   │  Auto-   │  LEDs   │
│ RESET  │  Reset   │         │
│────────┤──────────┤─────────│
│ XL1509 │ AMS1117  │  NPN    │ ← Power section (left)
│ Buck   │  LDO     │  Level  │
│────────┤──────────┤  Shift  │
│ Caps   │ Inductor │         │
│────────┴──────────┴─────────│
│ J_24V │ J_PUL │ J_DIR │ J_SEN│ ← Bottom edge (screw terminals)
└─────────────────────────────┘
         │ J_OLED (header) │
```

**Critical layout rules:**
- Keep ESP32 antenna area **free of copper** (no ground plane under antenna)
- Keep XL1509 → inductor → output cap loop **tight** (minimize EMI)
- Place decoupling caps **close** to their IC power pins
- Ground plane on bottom layer

### 6. Final Steps

1. Run **DRC** (Design Rule Check) — fix any clearance/unconnected issues
2. **Generate Gerbers** → Gerber X2 format
3. **Generate Drill files** → Excellon format
4. Upload to [JLCPCB](https://jlcpcb.com) → select SMT assembly
5. Upload BOM (`atopile/build/default.csv`) + pick-and-place file

---

## GPIO Pin Quick Reference

| GPIO | Function | Direction |
|------|----------|-----------|
| 0 | BOOT button | Input (boot mode) |
| 1 | UART0 TX → CH340C RXD | Output |
| 3 | UART0 RX ← CH340C TXD | Input |
| 16 | STEP (PUL+) | Output |
| 17 | DIR (DIR+) | Output |
| 18 | ENA (ENA+) | Output |
| 21 | I2C SDA (OLED) | Bidirectional |
| 22 | I2C SCL (OLED) | Output |
| 23 | WiFi LED | Output |
| 25 | Motor LED | Output |
| 34 | Sensor input | Input only |
| EN | Reset button + auto-reset | — |

## Files Index

| File | Location |
|------|----------|
| Research Report | `pcb/RESEARCH_REPORT.md` |
| Tiered Designs | `pcb/TIERED_DESIGNS.md` |
| Pre-BOM | `pcb/tier_1_prebom.csv` |
| Sourced BOM | `pcb/SOURCED_BOM.csv` |
| Sourcing Report | `pcb/SOURCING_REPORT.md` |
| Atopile Project | `pcb/atopile/` |
| KiCad Netlist | `pcb/atopile/build/default.net` |
| KiCad BOM | `pcb/atopile/build/default.csv` |
| This Guide | `pcb/KICAD_HANDOFF.md` |
