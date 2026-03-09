# EXP_010: Light-Evoked Electrophysiology of P. eryngii

**Start Date:** 2026-03-09
**Status:** In progress
**Airtable Links:** None

---

## Overview

Systematic characterisation of light-evoked electrical responses in *Pleurotus eryngii* mycelium using the ADC-24 DAQ and LED-DRV8 driver board. The ADC-24 dashboard serves as the single control center — recording electrophysiology data and driving LED stimulation in sync, so stimulus events are embedded in the same data stream as voltage recordings.

## Goal

1. Confirm that blue LEDs evoke detectable voltage spikes in *P. eryngii* (replicating Mishra et al. 2024 blue light response)
2. Map the dose-response relationship between LED PWM intensity and evoked spike amplitude
3. Characterise adaptation/desensitisation dynamics across repeated stimulations
4. Build a companion Experiment Designer app for protocol design and a protocol execution mode in the ADC-24 dashboard

## Hardware

| Component | Detail |
|-----------|--------|
| **DAQ** | PicoLog ADC-24 (24-bit, ±39 mV, 10 S/s, differential) |
| **Light source** | LED-DRV8 board → LED-RING (~70 blue LEDs), positioned below petri dish |
| **Control** | ADC-24 Dashboard (FastAPI + Next.js) sends timed HTTP calls to LED-DRV8 |
| **Shielding** | Faraday cage (copper mesh) — LED-RING + petri dish + electrodes inside |

## Progress

_See brainstorming/ folder for Phase 0 collaborative scoping._

## References

- EXP_006 — Fungal Electrophysiology Literature Review (Mishra et al. 2024 data)
- EXP_009 — LED-DRV8 board firmware, REST API
- EXP_001 — Growing *P. eryngii* & electrophysiology recording setup
- Mishra et al. 2024 — *Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia.* Science Robotics 9, eadk8019
