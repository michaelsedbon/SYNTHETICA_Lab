# EXP_013 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Analysis Scripts (`analysis/`)

| Script | Purpose |
|--------|---------|
| `load_utils.py` | Shared utilities: CSV loading, stimulus extraction, axis styling, RMS |
| `01_load_and_explore.py` | Load session, print summary stats, generate overview trace plot |
| `02_stimulus_response.py` | Epoch around stimuli, overlay plots, mean response ± SEM, t-tests |
| `03_summary_figures.py` | 4-panel summary: trace, mean response, RMS box plot, PSD |
| `04_cage_comparison.py` | Compare Faraday cage vs open: noise, PSD, evoked response, SNR |
| `analysis_notebook.ipynb` | Interactive Jupyter notebook combining all analysis steps |

### Usage

```bash
# Single-session analysis
python analysis/01_load_and_explore.py data/EXP_013.1_validation_no_cage
python analysis/02_stimulus_response.py data/EXP_013.1_validation_no_cage
python analysis/03_summary_figures.py data/EXP_013.1_validation_no_cage

# Cage comparison (requires both validation runs)
python analysis/04_cage_comparison.py \
    data/EXP_013.1_validation_no_cage \
    data/EXP_013.1_validation_with_cage
```

## Stimulation Protocols (`protocols/`)

| File | Sub-Experiment | Description |
|------|---------------|-------------|
| `EXP_013_1_validation.json` | EXP_013.1 | Validation: 5 pulses @ PWM 2048, 2s, ISI 20s (API id: ca854702, ch 7) |
| `EXP_013_2_dose_response.json` | EXP_013.2 | Dose-response: 15 blocks × 7 reps, randomised (API id: 08fe0027, ch 7) |
| `EXP_013_3_adaptation.json` | EXP_013.3 | Adaptation: 50 reps + 10 recovery (API id: 776b41ea, ch 7) |
| `EXP_013_4_priming.json` | EXP_013.4 | Priming: 15 primed vs 15 unprimed, interleaved (API id: a6308eb2, ch 7) |
| `EXP_013_C2_no_biology_control.json` | EXP_013.C2 | No-biology control: dose-response on plain agar (API id: d8394c95, ch 7) |

## Data Folders (`data/`)

| Folder | Sub-Experiment | Description |
|--------|---------------|-------------|
| `EXP_013.1_validation_no_cage/` | EXP_013.1 Run A | Validation recording without Faraday cage |
| `EXP_013.1_validation_with_cage/` | EXP_013.1 Run B | Validation recording with Faraday cage |
| `EXP_013.2_dose_response/` | EXP_013.2 | Dose-response recording |
| `EXP_013.3_adaptation/` | EXP_013.3 | Adaptation/desensitisation recording |
| `EXP_013.4_priming/` | EXP_013.4 | Priming effect recording |
| `EXP_013.C1_dark_control/` | EXP_013.C1 | 30 min dark control (no stimulation) |
| `EXP_013.C2_no_biology_control/` | EXP_013.C2 | Agar-only no-biology control |
| `photos/` | — | Experimental setup photographs |

## Notes

| File | Description |
|------|-------------|
| `notes.txt` | Experimental observations and findings |
