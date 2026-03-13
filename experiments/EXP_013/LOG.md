# EXP_013 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-03-10 — Experiment Created

- Initialised experiment folder from template.
- Goal: Test blue-light dose-response electrophysiology of *P. eryngii* mycelium using ADC-24 + LED-RING hardware from EXP_010.

## 2026-03-10 — EXP_013.1 Validation Runs

- Running two validation runs with the same protocol (`EXP_013_1_validation.json`):
  - **Run A — No Faraday cage** (open shielding) → quantify ambient noise + LED artifact
  - **Run B — With Faraday cage** (copper mesh enclosure) → shielded baseline
- Purpose: Compare noise floors and determine whether the cage is necessary for stimulus-response experiments.
- Analysis planned: overlay traces, compare RMS noise, compare stimulus-evoked deflections between conditions.
