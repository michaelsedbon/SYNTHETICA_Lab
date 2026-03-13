# EXP_013: Blue Light Dose-Response Electrophysiology of P. eryngii

**Start Date:** 2026-03-10
**Status:** ⚠️ Inconclusive — mycelium did not bridge electrodes
**Airtable Links:** None
**Project:** Bio Electronic Music
**Parent:** EXP_010

---

## Overview

Testing whether blue LEDs (λ ~450 nm) evoke detectable voltage spikes in *Pleurotus eryngii* mycelium via the WC-1 photoreceptor, as reported by Mishra et al. 2024 (*Science Robotics*). Uses the PicoLog ADC-24 + LED-DRV8 + LED-RING hardware stack built and verified in EXP_010, inside a Faraday cage.

## Goal

1. Confirm blue-light evoked potentials are real and measurable (H1).
2. Map dose-response: PWM intensity × duration → evoked amplitude (H2).
3. Characterise adaptation/desensitisation over repeated stimulation (H4).
4. Exploratory: test sub-threshold priming effect (H3).
5. Run dark and no-biology controls to rule out artifacts.

## Progress

- [x] Designed 5 stimulation protocols (validation, dose-response, adaptation, priming, no-biology control)
- [x] Collected data for all 7 sub-experiments (EXP_013.1 A/B, .2, .3, .4, C1, C2)
- [x] Built 6 analysis scripts + Jupyter notebook
- [x] Ran Faraday cage comparison (cage vs no-cage validation)
- [x] Visual inspection of mycelium/electrode contact

## Results

**Experiment is inconclusive.** Physical inspection revealed that the mycelium did not bridge the two electrodes. Any signals observed during recording cannot be attributed to biological activity — the source of previously observed voltage deflections remains unexplained.

**Next steps:** Re-inoculate a new plate with confirmed electrode bridging before repeating dose-response experiments. Consider using a microscope to verify hyphal contact with electrodes before starting recordings.

## References

- `experiments/EXP_010/` — infrastructure, brainstorming, analysis scripts, Faraday cage guide
- `experiments/EXP_006/` — literature review (Mishra et al. 2024 data)
- `experiments/EXP_009/` — LED-DRV8 firmware, REST API
- `experiments/EXP_001/` — mycelium growth & recording setup
- Mishra et al. 2024 — *Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia*
- Yu & Fischer 2019 — *Light sensing and responses in fungi*
