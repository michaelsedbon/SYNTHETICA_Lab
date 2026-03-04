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

---

## EXP_002
**Title:** Cryptographic Beings — LLM Autonomous Control
**Start Date:** 2026-03-01
**Airtable Links:** None
**Folder:** `experiments/EXP_002/`

Bio-hybrid machine (Marimo moss balls for binary data storage) — giving autonomous control to a local Ollama LLM. Phase 1: hardware documentation with SKiDL circuit descriptions. Phase 2: Ollama integration via network API.

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

Setup and configuration of specialized motor control PCBs for DM542T drivers (Board 3 & 4). Uses 24V power and NEMA 23/34 motors. Dedicated workspace to isolate hardware-specific firmware (D4=Step, D2=Dir) from the standard EXP_002 installation.

---

