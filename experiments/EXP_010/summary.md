# EXP_010: Light-Evoked Electrophysiology — Infrastructure & Tooling

**Start Date:** 2026-03-09
**End Date:** 2026-03-10
**Status:** Complete (infrastructure phase)
**Airtable Links:** None

---

## Overview

Built the complete toolchain for light-evoked electrophysiology experiments on *Pleurotus eryngii* mycelium. This experiment focused on software infrastructure — the actual dose-response and adaptation experiments will run as EXP_013.

## Outcome

All tooling is operational and validated with demo data. Ready for real experiments.

## What Was Built

### Experiment Designer (standalone app)
- Protocol builder UI: block/stimulus editors, timeline preview, JSON import/export
- Literature presets for dose-response (15 blocks, 105 stimuli) and adaptation (50 reps)
- LED channel picker, hover tooltips on all fields
- Deployed at `http://172.16.1.80:3006`

### ADC-24 Dashboard Extensions
- `led_client.py` — async HTTP client for LED-DRV8, retry logic
- `stimulus_scheduler.py` — background thread executing protocols with precise timing
- Extended CSV: 7 columns (`timestamp_s, channel, raw_adc, voltage_uv, stim_ch, stim_pwm, stim_event`)
- Protocol endpoints: `/api/protocol/load`, `/start`, `/stop`, `/status`
- Experiment runner: `/api/experiment/run`, `/timeline`, `/finish`
- Live chart with stimulus highlight bands (pre-computed from schedule)
- Fixed: overlapping lines, USB handle recovery, LED stop at post-baseline

### Analysis Pipeline
- `analysis/01_load_and_explore.py` — load CSV, stats, full-session trace with stim bands
- `analysis/02_stimulus_response.py` — epoch analysis, mean response, paired t-tests
- `analysis/03_summary_figures.py` — 4-panel publication figure
- `analysis/analysis_notebook.ipynb` — interactive Jupyter notebook

## Scientific Brainstorming (carried to EXP_013)

Three brainstorming rounds produced:
- **H1:** Blue-light evoked spikes detectable via WC-1 photoreceptor (λ ~450 nm)
- **H2:** PWM intensity maps monotonically to evoked spike amplitude
- **H3:** Sub-threshold priming (speculative, lower priority)
- Protocol matrix: 3 durations × 5 PWM levels = 15 conditions × 7 reps
- Adaptation protocol: 50 reps at fixed intensity to measure desensitisation
- Risk analysis: thermal artifacts, electrode drift, LED wavelength, photobleaching

## Hardware

| Component | Detail |
|-----------|--------|
| **DAQ** | PicoLog ADC-24 (24-bit, ±39 mV, 10 S/s, differential) |
| **Light source** | LED-DRV8 → LED-RING (~70 blue LEDs), below petri dish |
| **Control** | ADC-24 Dashboard sends timed HTTP calls to LED-DRV8 |
| **Shielding** | Faraday cage (copper mesh) — LED-RING + dish + electrodes inside |

## References

- EXP_001 — Growing *P. eryngii* & electrophysiology recording setup
- EXP_006 — Fungal Electrophysiology Literature Review
- EXP_009 — LED-DRV8 board firmware, REST API
- Mishra et al. 2024 — *Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia*
- Yu & Fischer 2019 — *Light sensing and responses in fungi* (WC-1 photoreceptor)
