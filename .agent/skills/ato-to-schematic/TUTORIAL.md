# Atopile → KiCad PCB Design Workflow

A step-by-step guide to designing PCBs using Atopile code, from schematic to KiCad routing.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DESIGN          2. BUILD           3. VISUALIZE            │
│  Write .ato code → ato build →      ato_to_schematic.py →     │
│  (schematic)        (netlist)         (.kicad_sch)             │
│                                                                │
│  4. IMPORT          5. ROUTE           6. MANUFACTURE          │
│  KiCad Import →   KiCad PCB      →   Export Gerbers →         │
│  Netlist            Editor             JLCPCB                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create the Atopile Project

```bash
mkdir -p pcb/atopile/elec/src
cd pcb/atopile
```

Create `ato.yaml`:
```yaml
ato-version: ^0.2.0
paths:
  - elec/src
builds:
  default:
    entry: elec/src/main.ato:DriverBoard  # Your top-level module
```

Install the generics library:
```bash
ato install generics
```

---

## Step 2: Write the .ato Files

Each functional block gets its own file. The syntax is simple:

### Components — define IC/connector pin mappings

```ato
# power.ato
component AMS1117_3V3:
    lcsc_id = "C6186"
    footprint = "SOT-223-3_L6.5-W3.4-H1.6-LS7.0-BR"
    signal vin ~ pin 3
    signal vout ~ pin 2
    signal gnd ~ pin 1
```

### Modules — wire components together

```ato
module PowerSupply:
    signal v12
    signal v3v3
    signal gnd

    ldo = new AMS1117_3V3
    v12 ~ ldo.vin
    v3v3 ~ ldo.vout
    gnd ~ ldo.gnd
```

### Top-level — connect all modules

```ato
# main.ato
from "power.ato" import PowerSupply
from "mcu.ato" import MCU_Module

module DriverBoard:
    psu = new PowerSupply
    mcu = new MCU_Module
    psu.v3v3 ~ mcu.dvdd
    psu.gnd ~ mcu.dgnd
```

> **Key rule:** Each `~` connects exactly TWO things. Never chain: `a ~ b ~ c` ❌

---

## Step 3: Build the Netlist

```bash
cd pcb/atopile
ato build
```

This generates:
```
build/
├── default.net          ← KiCad netlist
├── default.csv          ← BOM
└── footprints/
    └── footprints.pretty/  ← Component footprints
```

### Fix footprint prefix (required after every build)

```bash
sed -i '' 's/"lib:/"footprints:/g' build/default.net
```

---

## Step 4: Generate Visual Schematic

```bash
python3 .agent/skills/ato-to-schematic/scripts/ato_to_schematic.py \
  elec/src/main.ato \
  -o ../schematic.kicad_sch
```

Open in KiCad to review:
```bash
open ../schematic.kicad_sch
```

---

## Step 5: Import into KiCad PCB Editor

1. **New project** → `pcb/kicad/my_board/`
2. Open **PCB Editor**
3. **Preferences → Manage Footprint Libraries → Project Specific Libraries**  
   Add: `path/to/atopile/build/footprints/footprints.pretty` (nickname: `footprints`)
4. **File → Import Netlist** → select `build/default.net`
5. Select **"Link footprints using reference designators"**
6. **Load and Test** → should show 0 errors
7. **Update PCB** → components appear on the board

### Missing footprints?

Atopile only bundles passive footprints. For ICs (TSSOP, QFN, SOT, etc.), create `.kicad_mod` files manually in `build/footprints/footprints.pretty/`.

---

## Step 6: Route and Export

1. Place components in KiCad's PCB editor
2. Route traces (interactive or autorouter)
3. Run DRC (Design Rule Check)
4. **File → Fabrication Outputs → Gerbers**
5. Upload to JLCPCB with the BOM (`build/default.csv`)

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `ato install generics` | Install passive component library |
| `ato build` | Compile .ato → netlist + footprints |
| `python3 ato_to_schematic.py main.ato` | Generate visual schematic |
| `sed -i '' 's/"lib:/"footprints:/g' build/default.net` | Fix footprint prefix |

## File Map

```
experiment/pcb/
├── atopile/
│   ├── ato.yaml              # Project config
│   ├── elec/src/
│   │   ├── main.ato          # Top-level board
│   │   ├── power.ato         # Power supply
│   │   ├── mcu.ato           # Microcontroller
│   │   └── ...               # Other modules
│   └── build/
│       ├── default.net       # KiCad netlist
│       ├── default.csv       # BOM
│       └── footprints/       # Component footprints
├── schematic.kicad_sch       # Visual schematic (generated)
└── kicad/
    └── my_board/             # KiCad project (for routing)
```

## Worked Example

See [EXP_009](experiments/EXP_009/) — 8-channel LED driver board with ESP32-S3, PCA9685, and DRV8870 drivers. Full pipeline executed with all 6 .ato files.
