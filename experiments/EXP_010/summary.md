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

### Phase 0 — Brainstorming & Scoping (Complete)
- 3 brainstorming rounds: hypotheses, protocol design, JSON schema
- Verified WC-1 photoreceptor claims against Mishra et al. 2024 + Yu & Fischer 2019
- Co-designed companion app scope and ADC-24 dashboard extensions

### Phase 1 — Experiment Designer Companion App (Complete)
- Standalone protocol designer: `applications/experiment-designer/`
- Next.js 16 + Tailwind 4 + shadcn, Skill Manager dark theme
- Block/stimulus editors, interactive timeline preview, JSON import/export
- Literature presets: dose-response (15 blocks, 105 stimuli) and adaptation (50 reps)
- FastAPI backend with CRUD + validation
- Registered in App Launcher at ports 8005 (backend) / 3006 (frontend)

### Phase 2 — ADC-24 Dashboard Extensions (Complete)
- `led_client.py` — async HTTP client for LED-DRV8 REST API
- `stimulus_scheduler.py` — background thread executing protocols with precise timing
- Extended CSV: 7 columns (`timestamp_s, channel, raw_adc, voltage_uv, stim_ch, stim_pwm, stim_event`)
- 4 new endpoints: `/api/protocol/load`, `/start`, `/stop`, `/status`
- `ProtocolControls` sidebar component (JSON loader, start/stop, progress bar)
- Deployed to production server (172.16.1.80)

### Phase 3 — Analysis (Pending)
- Stimulus-triggered averaging
- Dose-response curves
- Evoked vs spontaneous amplitude comparison

## References

- EXP_006 — Fungal Electrophysiology Literature Review (Mishra et al. 2024 data)
- EXP_009 — LED-DRV8 board firmware, REST API
- EXP_001 — Growing *P. eryngii* & electrophysiology recording setup
- Mishra et al. 2024 — *Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia.* Science Robotics 9, eadk8019
