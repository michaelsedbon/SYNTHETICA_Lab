# EXP_008: Mycelium Sensor/Stim Board — PCB Design

**Start Date:** 2026-03-09
**Status:** In progress
**Airtable Links:** None
**Project:** Bio Electronic Music / MyceliumBrain

---

## Overview

PCB design for a board that records extracellular action potentials from *Pleurotus eryngii* mycelium and delivers electrical stimulation pulses. Uses the `/design-pcb` workflow pipeline.

## Goal

Design and fabricate (via JLCPCB) a custom PCB with:
- **8 recording channels** — µV-range sensitivity, 24-bit ADC, <5 µV noise floor
- **4 stimulation channels** — programmable current pulses (0–200 µA)
- **USB communication** to host PC
- All components sourced from LCSC for JLCPCB SMT assembly

## Target Tier

**Tier 2** — 8 recording + 4 stimulation channels, based on ADS1299 (or equivalent) integrated bio-ADC.

## Pipeline Progress

- [/] Step 1: Create experiment ✓
- [/] Step 2: Literature scout (in progress)
- [ ] Step 3: Component analysis & tiered designs
- [ ] Step 4: LCSC/JLCPCB sourcing
- [ ] Step 5: Atopile schematic generation
- [ ] Step 6: KiCad routing (manual)

## References

- Mishra et al. 2024 — Sensorimotor control of robots via fungal mycelia (Science Robotics)
- Kagan et al. 2022 — In vitro neurons learn and exhibit sentience (DishBrain) (Neuron)
- EXP_006 — Fungal electrophysiology literature review
- EXP_007 — MyceliumBrain feasibility study
