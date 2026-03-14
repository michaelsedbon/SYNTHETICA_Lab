# Bio Electronic Music

**Status:** Active
**Started:** 2026-03-04

---

## Overview

Exploring the intersection of biological signals and electronic music production. The project aims to capture electrical signals from living fungal mycelia (*Pleurotus eryngii*) and transform them into musical parameters. The mycelium's spontaneous action-potential-like spiking (~0.12 Hz, 35–1868 µV) provides a natural rhythmic substrate, while UV/blue light stimulation (3–10× amplification) enables real-time modulation.

## Reference Paper

Mishra et al. 2024 — *Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia.* Science Robotics 9, eadk8019. [DOI](https://doi.org/10.1126/scirobotics.adk8019)

## Hardware

### LED-DRV8 — 8-Channel Driver Board (EXP_009)

An 8-channel LED driver board is available for light stimulation of mycelium.

| Component | Detail |
|-----------|--------|
| **MCU** | ESP32-S3-WROOM-1 (WiFi/BLE) |
| **PWM Driver** | NXP PCA9685PW — 16-ch, 12-bit I2C |
| **Output Drivers** | 8× TI DRV8870 H-bridge (6.5–45V, 3.6A peak) |
| **Outputs** | 8× screw terminal pairs (M1–M8) |
| **Power** | 12V barrel jack |
| **I2C Pins** | SDA = GPIO6, SCL = GPIO1 |

**Dashboard:** http://leddriver.local  
**IP:** 172.16.1.126 (MEDICALEX network)  
**Firmware:** [`experiments/EXP_009/firmware/`](../../experiments/EXP_009/firmware/)

#### Quick Start

1. Power the board via 12V barrel jack + USB-C
2. Open http://leddriver.local in a browser
3. Use sliders or "All ON" to control channels
4. LED array goes on screw terminal M*+ / M*−

#### Firmware Update (OTA)

```bash
cd experiments/EXP_009/firmware
pio run -e ota -t upload      # Flash firmware
pio run -e ota -t uploadfs    # Flash dashboard
```

#### API

```bash
# Status
curl http://leddriver.local/api/status

# Set channel 0 to 50%
curl -X POST http://leddriver.local/api/channel \
  -H 'Content-Type: application/json' \
  -d '{"channel":0,"pwm":2048}'

# All ON
curl -X POST http://leddriver.local/api/all \
  -H 'Content-Type: application/json' \
  -d '{"pwm":4095}'

# Start pulse pattern
curl -X POST http://leddriver.local/api/pattern \
  -H 'Content-Type: application/json' \
  -d '{"name":"pulse","speed":50,"brightness":100}'
```

### LED-RING — Circular LED Array

A circular LED array (~70 LEDs in radial spiral) on a separate PCB. Passive board — just needs 12V+ and GND switched by the driver board.

## Experiments

<!-- AUTO:EXPERIMENTS -->
| Exp | Title | Start Date |
|-----|-------|------------|
| [EXP_006](../../experiments/EXP_006/summary.md) | Fungal Electrophysiology Literature Review & Characterization | 2026-03-06 |
| [EXP_008](../../experiments/EXP_008/summary.md) | Mycelium Sensor/Stim Board — PCB Design | 2026-03-09 |
| [EXP_009](../../experiments/EXP_009/summary.md) | LED Stimulation of Mycelium via Existing PCBs | 2026-03-09 |
| [EXP_010](../../experiments/EXP_010/summary.md) | Light-Evoked Electrophysiology of P. eryngii | 2026-03-09 |
| [EXP_013](../../experiments/EXP_013/summary.md) | Blue Light Dose-Response Electrophysiology of P. eryngii | 2026-03-10 |
<!-- /AUTO:EXPERIMENTS -->

## Knowledge Base

- [EXP_006 REPORT](../../experiments/EXP_006/REPORT.md) — Characterization of fungal spiking data (spontaneous, UV, blue light)
- [EXP_006 Paper INDEX](../../experiments/EXP_006/agent_papers_txt/INDEX.md) — Literature summaries (8 papers)
- [Citation network](../../experiments/EXP_006/citation_network_report.md) — Semantic Scholar exploration
- [EXP_009 Summary](../../experiments/EXP_009/summary.md) — LED driver board firmware, API, debug tools
