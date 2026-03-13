# Experiment Index

Quick-reference index for the AI lab assistant. When an experiment question arises,
scan the summaries below to decide which experiment folder(s) to load.

---

<!-- New entries are appended below by sync_experiments.py and the AI assistant -->

## EXP_001
**Title:** Growing pleurotus. eryngii
**Start Date:** 2026-02-17
**Airtable Links:** MS_S_001
**Folder:** `experiments/EXP_001/`

Inoculated PDA petri dishes with King Oyster (*P. eryngii*) samples from Mycosphere (liquid and plate cultures). 
Using PDA + Streptomycin (100 µM/ml final concentration).

**System Characterization (2026-02-19):** Compared custom ADC-24 web app vs PicoLog commercial software for baseline noise (no biology). Custom app shows 68× lower noise (0.4 vs 27 µV std) and 41× lower DC offset. PicoLog settings need verification. See `summary.md` for full analysis.

**Long-Term Recording (2026-03-09):** ~430-hour recording shows voltage ramp from ~0 µV to ~150 µV beginning at hour 330, indicating mycelium bridged electrodes. Sustained signal (~120–150 µV) consistent with Mishra et al. 2024 (~135 µV).

---

## EXP_002
**Title:** Cryptographic Beings — LLM Autonomous Control
**Start Date:** 2026-03-01
**Airtable Links:** None
**Folder:** `experiments/EXP_002/`

Bio-hybrid machine (Marimo moss balls for binary data storage) — giving autonomous control to a local Ollama LLM. Phase 1: hardware documentation (SKiDL + KiCad schematics). Phase 2: ESP8266 + Nano firmware deployed. Phase 3: Lab Agent app running qwen2.5:14b with 13 tools, WebSocket streaming, and Agent Presence kiosk display.

---

## EXP_003
**Title:** Marimo Buoyancy Mathematical Modeling
**Start Date:** 2026-03-01
**Airtable Links:** None
**Folder:** `experiments/EXP_003/`

Mathematical model and simulation of the Cryptographic Beings machine. Models photosynthesis-driven O₂ buoyancy, circadian gating, and photobleaching of Marimo (*Aegagropila linnaei*) in a 3×6 tube architecture. Simulation runs at 74K–232K× real-time for parameter exploration. Key finding: arm light angular spread (30°) causes cross-talk between adjacent tubes at 61% encoding accuracy.

---

## EXP_004
**Title:** Connector Mapper — Cryptographic Beings
**Start Date:** 2026-03-03
**Airtable Links:** None
**Folder:** `experiments/EXP_004/`

Cable-pair continuity testing tool for the Cryptographic Beings installation. Arduino Mega-based 4×4 cross-scan discovers which controller plate connector (L1–L16) maps to which installation plate position (p1–p18) with full pin-to-pin wire mapping. Includes single-file HTML webapp with guided workflow, live scanning, and JSON import/export.

---

## EXP_005
**Title:** Cryptographic Beings — High-Power Motor Control (DM542T)
**Start Date:** 2026-03-04
**Airtable Links:** None
**Folder:** `experiments/EXP_005/`

Setup and configuration of specialized motor control PCBs for DM542T drivers (Board 3 & 4). Uses 24V power and NEMA 23/34 motors. ⚠️ **Blocked**: fatal PCB TX/RX short discovered — Nano TX wired to both ESP TX and RX. Motor works via USB but fails over WiFi. Superseded by EXP_011 (debug) and EXP_012 (new PCB).

---

## EXP_006
**Title:** Fungal Electrophysiology Literature Review & Characterization
**Start Date:** 2026-03-06
**Airtable Links:** None
**Folder:** `experiments/EXP_006/`
**Project:** Bio Electronic Music

Literature review and quantitative characterization of fungal mycelium electrophysiology, focusing on *Pleurotus eryngii* spiking behaviour and blue/UV light-evoked responses. Based on Mishra et al. 2024 (Science Robotics). Includes paper index (8 papers), citation network analysis, and comprehensive data report.

---

## EXP_007
**Title:** MyceliumBrain — Reproducing DishBrain with Fungal Networks
**Start Date:** 2026-03-06
**Airtable Links:** None
**Folder:** `experiments/EXP_007/`

Feasibility study for reproducing the DishBrain paradigm (in vitro neurons playing Pong) using *P. eryngii* mycelium networks. Comprehensive literature review (16 papers with inline citations), gap analysis, and 4-phase experimental plan. Key precedent: non-living EAP hydrogels showed 8-10% Pong improvement via ion memory (Strong et al. 2024).

---

## EXP_008
**Title:** Mycelium Sensor/Stim Board — PCB Design
**Start Date:** 2026-03-09
**Airtable Links:** None
**Folder:** `experiments/EXP_008/`
**Project:** Bio Electronic Music / MyceliumBrain

Custom PCB design for recording extracellular action potentials (8ch) and delivering stimulation (4ch) to *P. eryngii* mycelium. Uses `/design-pcb` workflow pipeline with JLCPCB assembly.

---

## EXP_009
**Title:** LED Stimulation of Mycelium via Existing PCBs
**Start Date:** 2026-03-09
**Airtable Links:** None
**Folder:** `experiments/EXP_009/`
**Project:** Bio Electronic Music

Using existing lab PCBs to control LEDs and deliver optical stimulation to *P. eryngii* mycelium, aiming to elicit electrical spiking responses. All 9 pipeline steps complete: firmware, web dashboard, PCA9685 init retry, heartbeat auto-discovery, and full integration with ADC-24 dashboard for EXP_010.

---

## EXP_010
**Title:** Light-Evoked Electrophysiology of P. eryngii
**Start Date:** 2026-03-09
**Airtable Links:** None
**Folder:** `experiments/EXP_010/`
**Project:** Bio Electronic Music

Systematic characterisation of light-evoked electrical responses in *P. eryngii* mycelium using ADC-24 + LED-DRV8. Includes companion Experiment Designer app for protocol design and integrated stimulus-recording in the ADC-24 dashboard.

---

## EXP_011
**Title:** Sequential Motor Firmware Debug (DM542T)
**Start Date:** 2026-03-10
**Airtable Links:** None
**Folder:** `experiments/EXP_011/`
**Parent:** EXP_005

Fresh-start debug of DM542T motor controller. Steps 1–6 passed (LED blink, raw GPIO, AccelStepper, serial commands). Step 7 (ESP bridge) failed — root cause: **PCB TX/RX short** (Nano TX wired to both ESP TX and RX). Confirmed working config: AccelStepper DRIVER mode, 2000 sps, 1000 accel, 20 µs min pulse. Led to EXP_012 (ESP32 redesign).

---

## EXP_012
**Title:** ESP32 Motor Controller — PCB Design
**Start Date:** 2026-03-10
**Airtable Links:** None
**Folder:** `experiments/EXP_012/`
**Parent:** EXP_005, EXP_011

Custom PCB design replacing the dual-chip ESP8266+Nano motor controller with a single ESP32. Controls 1× DM542T stepper driver, WiFi + OTA, proximity sensor, 24V→3.3V regulation. JLCPCB fabrication.

---

## EXP_013
**Title:** Blue Light Dose-Response Electrophysiology of P. eryngii
**Start Date:** 2026-03-10
**Airtable Links:** None
**Folder:** `experiments/EXP_013/`
**Project:** Bio Electronic Music
**Parent:** EXP_010

Testing blue-light dose-response electrophysiology of *P. eryngii* mycelium via WC-1 photoreceptor (λ ~450 nm). Sub-experiments: validation, dose-response, adaptation, priming, dark control, no-biology control. Uses ADC-24 + LED-DRV8 hardware from EXP_010.

---

## EXP_014
**Title:** LattePanda Alpha Serial Machine Controller
**Start Date:** 2026-03-12
**Status:** Phase 3 complete — backend + dashboard running
**Airtable Links:** None
**Folder:** `experiments/EXP_014/`
**Parent:** EXP_005, EXP_011, EXP_012

Full machine control platform for Cryptographic Beings. LattePanda Alpha 864s (Ubuntu 24.04) controlling DM556 stepper motors via Arduino Nanos over USB serial. FastAPI backend + web dashboard live at `http://172.16.1.128:8000`. REST API + WebSocket real-time status. SSH access via `ssh lp`.

---
