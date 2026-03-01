# EXP_003 — Log

## 2026-03-01 — Experiment Setup & Literature Review

- Defined experiment scope: mathematical modeling of Marimo buoyancy for Cryptographic Beings machine
- Copied 3 skills from PhD project: `fetch-papers`, `explore-paper-network`, `verify-paper-claims`
- Copied supporting scripts: `fetch_papers.py`, `explore_paper_network.py`
- Updated MANIFEST.md with skills listing and `agent_papers/` directories
- Identified and downloaded 5 key papers:
  - Cano-Ramirez et al. 2018 — circadian buoyancy regulation
  - Phillips et al. 2019 — Marimo machines, buoyancy force (~1.5g for 60mm)
  - Phillips et al. 2022 — MARS autonomous rovers
  - Kudoh et al. 2023 — photoinhibition at low temperature
  - Boedeker 2010 — global ecology and morphology review
- Papers saved to `agent_papers/` with text extracts in `agent_papers_txt/`

## 2026-03-01 — Model Implementation

- Created [marimo_bio.py](model/marimo_bio.py) — biophysics ODE system:
  - Photosynthesis: Hill function of light × circadian gate × Q₁₀ temperature × chlorophyll health
  - O₂ balance: production − respiration − bubble release
  - Buoyancy: ideal gas law → displaced water → net force
  - Vertical dynamics: Stokes drag, added mass
  - Photobleaching: excess light degrades chlorophyll, recovery in dark
- Created [machine.py](model/machine.py) — machine geometry (3 levels × 6 tubes, arm + level rotation, dual light sources)
- Created [simulator.py](model/simulator.py) — accelerated simulation engine with command queue
- Created [run_experiments.py](model/run_experiments.py) — characterization experiments with Plotly figures

## 2026-03-01 — Bug Fix: Ball Density

- **Bug:** Ball density was 1020 kg/m³ → O₂ threshold to float was 103.6 µmol, but steady-state O₂ only reached ~100 µmol with circadian gating. Ball never floated.
- **Fix:** Reduced density to 1003 kg/m³. Marimo balls are porous algal filaments, barely denser than water. New threshold: ~24 µmol O₂ → floats within ~1.5h at 200 µmol/m²/s.
- Validated against Phillips 2019 timescales.

## 2026-03-01 — Characterization Experiments

Ran 7 experiments at 3 scales:

1. **Exp 1 — Single tube light/dark cycle (72h):** Clean binary switching, ~33 min rise, ~2h sink
2. **Exp 1b — Parameter sweep:** Light intensity (25–500 µmol) × duration (1–12h). Min threshold ~35 µmol/m²/s. Float time ~0.7h at 200 µmol. Replaced heatmaps with clearer line plots.
3. **Exp 1c — Bleaching (7 days):** Normal (200 µmol) is safe. >300 µmol causes chlorophyll degradation. Constant 600 µmol without dark periods = worst case.
4. **Exp 1d — Temperature sweep (10–30°C):** 6× difference in peak O₂ between 10°C and 30°C. At 10°C, ball barely floats (39 vs 24 µmol threshold). Q₁₀ = 2.0 is generic, not species-specific.
5. **Exp 2 — Single level (48h):** Sequential tube exposure creates buoyancy "wave"
6. **Exp 3 — Full installation encoding:** 56% accuracy. Arm light angular spread (30°) causes cross-talk between adjacent tubes.
7. **Exp 4 — Tower visualization:** Top-down state view.

Performance: 74K–244K× real-time. Full day simulated in ~1s.

## 2026-03-02 — Report Improvements

- Rewrote [REPORT.md](REPORT.md) with full model documentation:
  - All 5 ODE equations explained in plain language
  - Clear separation: literature-sourced vs estimated parameters
  - Q₁₀ explicitly flagged as generic (not species-specific)
  - New "Model Limitations" section (5 known simplifications)
  - Temperature sweep results added
- Replaced exp1b heatmaps with line plots for clarity
