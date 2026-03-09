---
name: ato-to-schematic
description: Convert Atopile (.ato) source files into visual KiCad schematics (.kicad_sch). Generates auto-placed symbols with net labels from the .ato component/module definitions. Use after building an Atopile project to create a reviewable, printable schematic.
---

# Atopile → KiCad Schematic Converter

Generate a `.kicad_sch` schematic from Atopile `.ato` source files.

## When to Use

- After creating `.ato` files with the `pcb-schematic-generator` skill
- When you need a visual schematic for review, documentation, or compliance
- When the user asks to "export a schematic" from Atopile code

## Usage

```bash
python3 <skill_path>/scripts/ato_to_schematic.py <main.ato> [-o output.kicad_sch] [-m ModuleName]
```

### Arguments

| Arg | Description |
|-----|-------------|
| `<main.ato>` | Path to the entry `.ato` file |
| `-o` | Output path (default: `schematic.kicad_sch` in same directory) |
| `-m` | Entry module name (auto-detected if not specified) |

### Example

```bash
# Generate schematic for EXP_009
python3 .agent/skills/ato-to-schematic/scripts/ato_to_schematic.py \
  experiments/EXP_009/pcb/atopile/elec/src/main.ato \
  -o experiments/EXP_009/pcb/schematic.kicad_sch

# Open in KiCad
open experiments/EXP_009/pcb/schematic.kicad_sch
```

## What It Does

1. **Parses** all `.ato` files following imports (skips `generics/`)
2. **Extracts** components (pins, LCSC IDs, footprints) and modules (signals, connections)
3. **Builds** a connection graph using union-find to merge transitive nets
4. **Generates** KiCad symbol definitions on-the-fly from pin definitions
5. **Places** components on a grid, grouped by module
6. **Connects** using net labels (power nets as global labels, signals as local labels)

## Output

A valid KiCad 8 `.kicad_sch` file with:
- Auto-generated rectangular box symbols for each component type
- Pin names and numbers matching the `.ato` definitions
- Net labels connecting matching signals
- Module groupings with title annotations
- Footprint and LCSC ID properties on each symbol

## Limitations

- **Flat schematic** — all modules rendered on a single sheet (no hierarchical sheets)
- **Generic passives** — components imported from `generics/` (Resistor, Capacitor) are parsed but may lack explicit pin mappings
- **No wire routing** — connections use net labels, not drawn wires
- **No DRC** — the schematic is for visualization only; use the Atopile netlist for PCB design
