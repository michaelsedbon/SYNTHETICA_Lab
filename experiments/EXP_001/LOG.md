# EXP_001 — Experiment Log

Chronological record of all actions, changes, and observations.

---

## 2026-02-17 — Experiment Created

- Inoculated PDA petri dishes with King Oyster (*P. eryngii*) from Mycosphere (liquid + plate cultures).
- Using PDA + Streptomycin (100 µM/ml final concentration).

---

## 2026-02-19 — System Characterisation

- Compared custom ADC-24 web app vs PicoLog commercial software for baseline noise.
- Custom app: 68× lower noise (0.4 vs 27 µV std) and 41× lower DC offset.
- See `summary.md` for full analysis, traces, and histograms.

---

## 2026-03-09 — Long-Term Recording Analysis: Signal Onset

- Analysed full 430-hour ADC-24 recording (`session_20260219_184841(2)test.csv`, 330 MB).
- Applied multi-pass spike rejection (rolling median + 2σ, 2 passes) — removed 274,648 artefact points.
- **Key finding:** Clear voltage ramp starting at ~hour 330, reaching ~150 µV — mycelium has bridged the electrodes.
- Sustained signal at 120–150 µV (hours 380–420) matches expected extracellular amplitudes from literature (Mishra et al. 2024).
- Generated `trace_clean.png` and `trace_signal_onset.png` via `generate_trace.py`.
- **Next:** New experiment with blue/UV light stimulation to evoke spiking.
