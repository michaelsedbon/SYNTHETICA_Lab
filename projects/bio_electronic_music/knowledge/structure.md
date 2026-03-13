# System Architecture

> Last updated: 2026-03-12

## Overview

The Bio Electronic Music system captures electrical signals from living fungal mycelia (*Pleurotus eryngii*) and transforms them into musical parameters. The setup consists of electrophysiology recording hardware, a programmable LED stimulation board, and analysis/control software running on a development workstation.

## Network Topology

```
┌────────────────────────────────────────────────────────────────┐
│                    MEDICALEX WiFi Network                       │
│                                                                │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  Dev Workstation  │         │    LED-DRV8       │             │
│  │  172.16.1.80      │◀──WiFi─▶│  172.16.1.126     │             │
│  │  (macOS)          │  HTTP   │  leddriver.local   │             │
│  └────────┬─────────┘         └──────────────────┘             │
│           │ USB                                                 │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │  PicoScope ADC-24 │   Electrodes → Mycelium                 │
│  │  (USB HID)        │◀──────────────┘                         │
│  └──────────────────┘                                          │
└────────────────────────────────────────────────────────────────┘
```

## Devices

| Device | Type | Connection | Address | Role |
|--------|------|------------|---------|------|
| LED-DRV8 | 8-ch LED driver | WiFi (STA) | `172.16.1.126` / `leddriver.local` | UV/Blue light stimulation of mycelium |
| LED-RING | Circular LED array | Wired to LED-DRV8 outputs | — | Light delivery to mycelium plate |
| PicoScope ADC-24 | 24-bit USB ADC | USB | — | Extracellular potential recording |
| Dev Workstation | macOS | Ethernet/WiFi | `172.16.1.80` | Data acquisition, analysis, dashboards |

## Data Flow

```
Control flow (stimulation):
   Dev Workstation
    ├─ Experiment Designer (localhost:3006) → design protocols
    └─ ADC-24 Dashboard
        ├─ stimulus_scheduler.py → HTTP POST → LED-DRV8 → LED-RING → Mycelium
        └─ PicoScope ADC-24 (USB) → raw_adc → voltage_uv → CSV

Data flow (recording):
   Mycelium → Electrodes → PicoScope ADC-24
    ├─ USB → adc24_dashboard.py → live plot + CSV logging
    └─ Post-hoc: analysis/ scripts → spike detection, statistics
```

## PCB Designs

### LED-DRV8 (Active — EXP_009)

8-channel LED driver board. Designed, fabricated, and operational.

- **PCB files:** `experiments/EXP_009/pcb/`
- **Status:** ✅ Fabricated and deployed

### Mycelium Sensor/Stim Board (In Progress — EXP_008)

Combined 8-channel ADS1299 recording + 4-channel Howland pump stimulation board.

- **PCB files:** `experiments/EXP_008/pcb/`
- **Status:** 🔶 Design phase (KiCad schematic + Atopile)
- **Design docs:** [RESEARCH_REPORT.md](../../experiments/EXP_008/pcb/RESEARCH_REPORT.md), [TIERED_DESIGNS.md](../../experiments/EXP_008/pcb/TIERED_DESIGNS.md)
