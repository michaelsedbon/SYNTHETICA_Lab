# EXP_009 — Documentation Index

Index of all markdown and documentation files in this experiment.

---

## Experiment Core

| File | Description |
|------|-------------|
| [summary.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/summary.md) | Experiment overview, PCB identification, LED control feasibility |
| [LOG.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/LOG.md) | Chronological log — PCB analysis, pipeline execution, build results |
| [SCRIPT_INDEX.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/SCRIPT_INDEX.md) | Index of all scripts, Atopile files, BOMs, and resources |
| [DOC_INDEX.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/DOC_INDEX.md) | This file |

## PCB Documentation

| File | Description |
|------|-------------|
| [TIERED_DESIGNS.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/TIERED_DESIGNS.md) | Functional blocks, signal flow, component specs for both boards |
| [SOURCING_REPORT.md](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/SOURCING_REPORT.md) | LCSC sourcing decisions, cost breakdown (~$23/board) |
| [SOURCED_BOM.csv](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/SOURCED_BOM.csv) | Full BOM with LCSC part numbers, footprints, pricing |
| [driver_board_prebom.csv](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/driver_board_prebom.csv) | Pre-BOM for the 8-channel driver board |
| [led_array_prebom.csv](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/led_array_prebom.csv) | Pre-BOM for the circular LED array |

## Atopile Schematic

| File | Description |
|------|-------------|
| [main.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/main.ato) | Top-level board definition |
| [power.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/power.ato) | 12V input + 3.3V LDO |
| [mcu.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/mcu.ato) | ESP32-S3 module |
| [pwm.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/pwm.ato) | PCA9685PW 16-ch PWM |
| [drivers.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/drivers.ato) | 8× DRV8870 H-bridge |
| [connectors.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/connectors.ato) | USB-C connector |
| [led_array.ato](file:///Users/michaelsedbon/Documents/SYNTHETIC_PERSONAL_LAB/experiments/EXP_009/pcb/atopile/elec/src/led_array.ato) | Passive LED array board |
