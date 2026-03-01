# EXP_003 — Marimo Buoyancy Mathematical Modeling

## Status: Active

## Goal

Build a mathematical model of the Cryptographic Beings machine to simulate Marimo (*Aegagropila linnaei*) photosynthesis-driven buoyancy. The model enables accelerated parameter exploration before hardware deployment, and will serve as a virtual testbed for LLM-controlled experiments.

## Machine Architecture

- 3 levels × 6 glass tubes per level = 18 Marimo balls
- 1 motorized arm with light (rotates around tower)
- 1 fixed light per level
- Each level rotates independently

## Model

ODE system per Marimo ball with 4 state variables: trapped O₂, vertical position, circadian phase, chlorophyll health. Equations cover photosynthesis (Hill function), O₂ balance, buoyancy via ideal gas law, Stokes drag, and photobleaching. Parameters sourced from 5 published papers + calibration. Full model documentation in [REPORT.md](REPORT.md).

Key parameters:
- Ball density: 1003 kg/m³ (calibrated to match Phillips 2019 rise times)
- O₂ threshold to float: ~24 µmol (~33 min at 200 µmol/m²/s)
- Bubble half-life: ~1.9h
- Simulation speed: 74K–244K× real-time

## Key Results

1. **Single tube** responds correctly to 12:12 light/dark with clean binary switching (~33 min rise, ~2h sink) — [plot](figures/exp1_light_dark_cycle.html)
2. **Parameter sweep** shows minimum ~35 µmol/m²/s threshold for floatation, ~0.7h at 200 µmol — [plot](figures/exp1b_parameter_sweep.html)
3. **Bleaching** degrades chlorophyll above 300 µmol/m²/s sustained exposure — [plot](figures/exp1c_bleaching.html)
4. **Temperature** has 6× effect on peak O₂ (10°C vs 30°C). At 10°C, buoyancy is marginal — [plot](figures/exp1d_temperature_sweep.html)
5. **Full installation encoding** achieves 56% accuracy — arm light angular spread (30°) causes cross-talk — [plot](figures/exp3_full_installation.html)

## Files

- [marimo_bio.py](model/marimo_bio.py) — biophysics ODE system
- [machine.py](model/machine.py) — machine geometry (3×6 tower)
- [simulator.py](model/simulator.py) — accelerated simulation engine
- [run_experiments.py](model/run_experiments.py) — 7 experiments with Plotly plots
- [REPORT.md](REPORT.md) — full scientific report with equations, parameters, and bibliography
- [LOG.md](LOG.md) — chronological experiment log
- [figures/](figures/) — 7 HTML + PNG Plotly figures

## Bibliography

1. Cano-Ramirez et al. 2018, Current Biology — circadian buoyancy
2. Phillips et al. 2019, J Biol Eng — Marimo machines
3. Phillips et al. 2022, J Biol Eng — MARS rovers
4. Kudoh et al. 2023, IJMS — photoinhibition at low temperature
5. Boedeker 2010, BioScience — *A. linnaei* ecology
