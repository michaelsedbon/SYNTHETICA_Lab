# EXP_001: Growing pleurotus. eryngii

**Start Date:** 2026-02-17
**Airtable Links:** MS_S_001

---

Starting from Petri dish culture and liquid culture

from here https://mail.google.com/mail/u/0/?ogbl#search/contact%40lamycosphere.com/FMfcgzQfBkFZTkDNBTslVKTDdxvlpKDx

Grown in PDA + Streptomycin 100uM/ml (final concentration)

## Inoculation Details (Update 2026-02-17)
- Inoculated PDA petri dish with samples from **Mycosphere** liquid culture.
- Inoculated PDA petri dish with samples from **Mycosphere** petri dish plate culture.

---

## Data Acquisition Setup (ADC-24)
- **Device:** Pico Log ADC-24 (24-bit, USB)
- **Mode:** Differential (E1/E2 → diff, EGND → ground in agar)
- **Voltage range:** ±39 mV (<500 nV resolution)
- **Sampling rate:** 10 S/s (100 ms conversion time)
- **Mains rejection:** 50 Hz
- **Filter:** Savitzky-Golay (3rd order, window 11)
- **Peak detection:** Prominence ≥ 10 µV, noise floor 5 µV
- **Reference:** Mishra et al., Sci. Robot. 2024
- **Dashboard:** `../../applications/adc24-dashboard/` (Next.js + FastAPI)

---

## Data Files

| File | Source | Description |
|------|--------|-------------|
| `data/faraday cage.hdf5` | PicoLog (commercial software) | Baseline recording inside Faraday cage, no biology. Exported as HDF5. |
| `data/faaraday.csv` | Custom web app (FastAPI + ADC-24 driver) | Baseline recording inside Faraday cage, no biology. Exported as CSV. |
| `data/session_20260219_154112.csv` | Custom web app | Longer session recording (different run). |
| `data/2.hdf5` | PicoLog | Earlier test recording. |
| `data/Untitled.hdf5` | PicoLog | Earlier test recording. |
| `data/plot_recording.ipynb` | — | Notebook analysing the PicoLog HDF5 recording. |
| `data/plot_csv_recording.ipynb` | — | Notebook analysing the custom web app CSV recording. |

---

## System Characterisation — Custom Software vs PicoLog (2026-02-19)

**Goal:** Compare our custom ADC-24 dashboard (Next.js + FastAPI + Python driver) against the commercial PicoLog software. Both recordings taken with **no biology** (electrodes not bridged by mycelium) to measure the instrument baseline noise floor.

### Recording Parameters (both recordings)

Both use the same physical ADC-24 unit with identical electrode setup:
- Differential mode (channels E1/E2), EGND in agar
- ±39 mV range
- ~10 S/s sampling rate
- 50 Hz mains rejection
- Recorded inside Faraday cage

### Results

| Metric | PicoLog (HDF5) | Custom App (CSV) | Ratio |
|--------|----------------|-----------------|-------|
| Duration | 157 s (2.6 min) | 207 s (3.5 min) | — |
| Samples | 1,571 | 1,726 | — |
| **Mean** | **96.7 µV** | **2.36 µV** | **41×** |
| **Std (noise)** | **27.2 µV** | **0.40 µV** | **68×** |
| Min | −299.0 µV | 1.10 µV | — |
| Max | 383.3 µV | 18.17 µV | — |
| Peak-to-peak | 682 µV | 17 µV | **40×** |

### Raw Traces

![Comparison of raw voltage traces from PicoLog and custom web app](data/comparison_traces.png)

### Noise Distribution

![Amplitude distribution histograms for both systems](data/comparison_histograms.png)

### Analysis

The custom web app shows **68× lower noise** (0.4 µV vs 27 µV std) and a **41× lower DC offset** (2.4 µV vs 97 µV) compared to PicoLog.

**Possible explanations for the discrepancy:**

1. **PicoLog may be configured to a different voltage range** — a wider range (e.g., ±2500 mV) would scale up the quantisation noise. Need to verify PicoLog's input range setting matches ±39 mV.
2. **PicoLog may be using single-ended mode** instead of differential, causing higher offset and noise.
3. **Calibration differences** — PicoLog may apply different internal calibration constants.
4. **Different grounding/wiring** — if the electrode setup changed between the two sessions (though both were done back-to-back).

### Voltage Conversion Reference

Custom driver formula (`adc24_driver.py`):
```
voltage_µV = (raw_adc / 8,388,607) × 39.0 × 1000.0
```
Where 8,388,607 = 2²³ − 1 (24-bit signed ADC max count).

PicoLog exports HDF5 in **volts** (float32), converted to µV via `× 1e6`.

### Conclusions

- The custom software produces a **much cleaner baseline** than PicoLog.
- Before attributing this to software quality, the **PicoLog settings must be verified** (voltage range and channel mode).
- If both are confirmed to use ±39 mV differential, the custom software is the better acquisition path.
- **Next step:** Record simultaneously with both software from the same ADC to isolate the variable. Then begin biological recordings once mycelium bridges the electrodes.
