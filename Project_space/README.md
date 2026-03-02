# Project Space

Hardware design files and CAD assets for SYNTHETICA projects. This directory is for design artifacts that are not experiment-specific (e.g. shared PCB designs, mechanical assemblies, 3D models).

## Projects

### Cryptographic Beings — Level Motor Controller

**Path:** `Cryptographic_beings/level_motor_controler/`

Custom PCB and KiCad schematics for the motor level controller used in the Cryptographic Beings machine. This board connects ISD04 NEMA17 integrated stepper motors, hall-effect sensors, and the ESP8266 + Arduino Nano control stack.

**Contents:**

| File | Description |
|------|-------------|
| `level_motor_controler.kicad_sch` | KiCad schematic with full connectivity |
| `motor_level_controller.py` | SKiDL PCB description (Python netlist generation) |
| `render_schematic.py` | schemdraw 2D schematic renderer |
| PCB photos | Reference photos used for reverse-engineering |

**Related experiment:** [EXP_002](../experiments/EXP_002/summary.md) — Cryptographic Beings LLM Autonomous Control.

## Adding New Projects

Create a subdirectory named after the project. Include a brief `README.md` at the project level documenting the contents and linking to any related experiments.
