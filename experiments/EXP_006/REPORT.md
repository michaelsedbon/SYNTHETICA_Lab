# EXP_006 — Fungal Electrophysiology Characterization Report

## Overview

This report extracts and systematizes all quantitative data on electrical spiking from *Pleurotus eryngii* mycelia, with a focus on the blue/UV light-evoked response. **Every claim is cited with the exact location in the source paper.** The primary data source is **Mishra et al. 2024** (*Science Robotics* 9, eadk8019). Comparative data from **Adamatzky 2018** (*Scientific Reports* 8, 7873) is included where relevant.

### Citation key

- **[M24]** = Mishra et al. 2024, *Sci. Robot.* 9, eadk8019
- **[A18]** = Adamatzky 2018, *Sci. Rep.* 8, 7873
- **[FSS21]** = Adamatzky, Gandia & Chiolerio 2021, *Fungal Biol. Biotechnol.* 8, 3 (RETRACTED)

---

## 1. Organism

| Parameter | Value | Citation |
|-----------|-------|----------|
| Species | *Pleurotus eryngii* (king oyster mushroom) | [M24] p.2: *"We selected Pleurotus eryngii as the fungus to interface with our electromechanical system because of its favorable characteristics, such as filamentous mycelial growth pattern, rapid growth rate, and nonpoisonous character"* |
| Source | Commercial mushroom kit | [M24] p.10: *"We first purchased a P. eryngii (king oyster) mushroom kit from Amazon.com (root mushroom farm)"* |
| Growth medium | Potato dextrose agar (PDA), 3.6% w/v | [M24] p.10: *"In our fungal model, we used potato dextrose agar (PDA). For medium preparation, we used a recipe of 3.6% (w/v) PDA powder"* |
| Growth time (small, 60 mm) | ~14 days | [M24] p.2: *"The fungus typically requires ~14 to 33 days to fully integrate into the robot's scaffolding, depending on the dish size"* |
| Growth time (large, 150 mm) | ~33 days | [M24] p.2: same quote as above |

---

## 2. Recording Hardware

| Parameter | Value | Citation |
|-----------|-------|----------|
| DAQ system | PicoLog ADC-24 (Pico Technology) | [M24] p.2: *"We connected E1 and E2 to differential input ports and EGND to a ground port of our high-resolution data acquisition system (ADC-24, PicoLog)"* |
| Resolution | 24-bit ADC | [M24] p.2: *"high-resolution data acquisition system (ADC-24, PicoLog) that has a 24-bit analog-to-digital converter"* |
| Channels | 4 max (differential voltage) | [M24] p.11: *"four digital I/O channel maximum of ±2500 mV and minimum of ±39 mV, and 16 single-ended voltage/8 differential voltage inputs"* |
| Voltage range used | ±39 mV | [M24] p.11: *"±39 mV channel at a 10 S/s (<500-nV resolution) setting"* |
| Resolution at ±39 mV | <500 nV | [M24] p.11: same quote |
| Sampling rate | 10 S/s | [M24] p.11: same quote |
| Electrodes | Subdermal needle, stainless steel, iridium-coated, 220 mm × 0.4 mm | [M24] p.11: *"twisted subdermal needle electrodes made of stainless steel… electrodes of 220-mm length and 0.4-mm diameter (Spes Medica, Italy)"* |
| Electrode config | E1 + E2 differential, E_GND in agar | [M24] p.2: *"two electrodes (E1 and E2) in the mycelium and a ground electrode (EGND) in agar medium"* |
| Faraday cage | 1 m × 1 m × 1.5 m, copper mesh, black cloth | [M24] p.11: *"We constructed a large Faraday cage (1 m by 1 m by 1.5 m) using a heavy metal block. The Faraday cage was covered by copper mesh from all sides and wrapped with black cloth to block out light"* |

### Electrode resistance

| Condition | Resistance | Citation |
|-----------|-----------|----------|
| Agar plate (no mycelium) | 2.2 ± 0.2 MΩ | [M24] p.3: *"The electrode resistance was 2.2 ± 0.2 megohms for the agar plate"* |
| Mycelium plate | 1.4 ± 0.25 MΩ | [M24] p.3: *"1.4 ± 0.25 megohms for the mycelium plate"* |

### Control validation

> *"Our recorded data display no electrical spiking activity before the hyphae contacting the electrodes or in control plates with a baseline signal of <20 μV"*
> — [M24] p.3, referring to Fig. 1A and fig. S5C

---

## 3. Spontaneous Spiking (Baseline)

All data from 30-day continuous recording of both small (60 mm) and large (150 mm) plates.

### 30-day summary (most comprehensive)

| Parameter | Value | Citation |
|-----------|-------|----------|
| Mean baseline potential (V_native) | ~135 µV | [M24] p.5: *"the mean baseline potential for both plates reached V_native ~135 μV"* (Fig. 2H) |
| Maximum peak amplitude | 1868 µV | [M24] p.5: *"maximum peaks of V_native ~1868 μV"* (Fig. 2H) |
| Minimum detectable peak | ~35 µV | [M24] p.5: *"minimum peaks of V_native ~35 μV"* (Fig. 2H) |

### 14th-day recording (5-hour session, small plate)

| Parameter | Value | Citation |
|-----------|-------|----------|
| Mean amplitude (V_native) | ~194 µV | [M24] p.5: *"The V_native had an average value of ~194 μV"* (Fig. 2F) |
| Maximum positive peak | 1140 µV | [M24] p.5: *"with a maximum positive peak of 1140 μV"* (Fig. 2F) |
| Maximum negative spike | −216 µV | [M24] p.5: *"and a negative spike of −216 μV"* (Fig. 2F) |
| Mean spike height | 60 µV | [M24] p.5: *"The mean spike height was 60 μV, with a range of up to 1000 μV"* (Fig. 2G) |
| Max spike height | 1000 µV | [M24] p.5: same quote (Fig. 2G, fig. S7A) |

### Spike width

| Parameter | Value | Citation |
|-----------|-------|----------|
| Mean width (τ_native) | 1.1 s | [M24] p.5: *"The mean τ_native was 1.1 s"* (Fig. 2G, fig. S7C/D) |
| Maximum width (τ_max) | ~10 s | [M24] p.5: *"and the τ_max_native was ~10 s"* |
| Width bands observed | 1.5 s, 2.0 s, 2.5 s | [M24] p.5: *"Our results show the existence of multiple bands of signal widths (τ_native), such as 1.5, 2, and 2.5 s"* (Fig. 2D) |

### Spiking frequency

| Parameter | Value | Citation |
|-----------|-------|----------|
| Mean frequency (ξ_native) | ~0.12 spikes/s (7.2 /min) | [M24] p.5: *"the mean spiking frequency varied around ξ_native ~0.12 spikes s⁻¹"* (Fig. 2E, figs. S8–S15) |
| Maximum frequency | ~0.6 spikes/s (36 /min) | [M24] p.5: *"with a maximum of ξ_native ~0.6 spikes s⁻¹ over the course of the 30-day recordings"* |
| Mean from 14th-day recording | 11 peaks/min | [M24] p.5: *"the spiking frequency (ξ_native) can reach up to 36 peaks min⁻¹, with a mean of 11 peaks min⁻¹"* (Fig. 2E) |

### Distribution fits

| Parameter | Distribution | Mean (µ) | Std Dev (σ) | Citation |
|-----------|-------------|----------|-------------|----------|
| Peak amplitude | Skew-normal | 126.5 µV | 70.4 µV | [M24] Fig. 2F caption: *"The mean (μ) of the peaks is 126.487 μV with an SD (σ) of 70.371 μV"* |
| Peak width | Skew-normal | 1.106 s | 1.104 s | [M24] Fig. 2G caption: *"the mean (μ) is 1.106 s with an SD (σ) of 1.104 s"* |

### Weekly data structure

> *"Each weekly dataset consists of a 48-hour period, with a sample size of n = 1,728,000 data points collected at a frequency of 10 Hz from a 30-day period, totaling 25,920,000 samples."*
> — [M24] Fig. 2H caption

---

## 4. UV Light Stimulation

### UV source

| Parameter | Value | Citation |
|-----------|-------|----------|
| Lamp | OmniCure S1500 mercury lamp | [M24] p.11: *"We used an OmniCure versatile UV mercury lamp (OmniCure S1500 Spot UV curing system, 435-nm Excelitas Technologies Corp.)"* |
| Delivery | Flexible optical fiber + collimator | [M24] p.11: *"equipped with a long flexible optical fiber cable and a collimator"* |
| Orientation | Perpendicular to scaffold surface | [M24] p.11: *"We ensured that the UV lens was set up to irradiate the scaffold surface perpendicularly"* |
| Repetitions | Each test repeated ≥7 times | [M24] p.5: *"repeated all of the experiments at least seven times"* |

### Intensity-dependent response (Plate 1)

Conditions: UV source height = 12 cm, exposure = 2 s

| Intensity (W/cm²) | V_light (µV) | τ_light (s) | Citation |
|-------------------|--------------|-------------|----------|
| 0.1 | 25 ± 4 | 1.3 ± 0.1 | [M24] p.5: *"ranging from V_light = 25 ± 4 μV at 0.1 W cm⁻²"* (fig. S16C/D) |
| 1.0 | 281 ± 14 | 1.3 ± 0.1 | [M24] p.5: *"to V_light = 281 ± 14 μV at 1 W cm⁻² with a constant width of 1.3 ± 0.1 s"* |

> *"In contrast, UV stimulation of the agar plate alone did not show any substantial spiking activity"*
> — [M24] p.5, referring to fig. S16E

### Intensity-dependent response (Plate 2)

| V_light range (µV) | Citation |
|--------------------|----------|
| 208 ± 72 to 18,569 ± 1772 | [M24] p.5: *"For the second mycelium plate, we observed even larger peaks ranging between V_light = 208 ± 72 μV and V_light = 18,569 ± 1772 μV"* (fig. S16F) |

⚠️ **High biological variability between plates.**

### Distance-dependent response (Table 1)

Conditions: intensity = 0.1 W/cm², exposure = 2 s

| Source height (cm) | V_light (µV) | τ_light (s) | Citation |
|-------------------|--------------|-------------|----------|
| 14 | 736 ± 48 | 2.0 ± 0.1 | [M24] Table 1 (p.6): Variable height tests |
| 20 | 306 ± 12 | 2.0 ± 0.1 | [M24] Table 1 (p.6) |

### Exposure time dependence (Table 1)

Conditions: height = 12 cm, intensity = 0.1 W/cm²

| Exposure time (s) | V_light (µV) | τ_light (s) | Citation |
|-------------------|--------------|-------------|----------|
| 2 | 237 ± 41 | 1.4 ± 0.4 | [M24] Table 1 (p.6): Variable exposure time tests |
| 12 | 499 ± 52 | 5.0 ± 0.1 | [M24] Table 1 (p.6) |

### Amplification ratio

| Parameter | Value | Citation |
|-----------|-------|----------|
| V_light / V_native ratio | 3× to 10× | [M24] p.7: *"the height ratios were 3 to 10 times larger than the spontaneous signal"* |
| Control (agar, UV stimulated) | 10–20 µV | [M24] p.10: *"UV-stimulated signals in the mycelia ranged from 600 to 17,000 μV, whereas those in agar-stimulated controls hovered around 10 to 20 μV"* |
| Signal-to-control ratio | 60× to 1000× | [M24] p.10: *"signals were 60- to 1000-fold larger"* |

### UV protocol for robot control

| Parameter | Value | Citation |
|-----------|-------|----------|
| Exposure | 1 s at 20-s intervals | [M24] p.7: *"We exposed the mycelium plate to UV light for 1 s at a 20-s interval to generate a light-stimulated spiking pattern"* |
| Threshold for robot activation | ~3 × V_native | [M24] p.7: *"We then set a threshold value of typically ~3 V_native"* |
| MCU signal when above threshold | 100% duty cycle | [M24] p.7: *"we generated a high-frequency signal from the MCU at 100% duty cycle without using the fungal peak height and width properties"* |

---

## 5. Blue Light Response

| Parameter | Value | Citation |
|-----------|-------|----------|
| V_light (blue) | 83 ± 11 µV | [M24] p.5: *"our mycelium scaffold only responded to blue light stimulation, with V_light potentials reaching 83 ± 11 μV"* |
| Distance | 12 cm | [M24] p.5: *"at an illumination distance of 12 cm"* |
| Exposure time | 2 s | [M24] p.5: *"and an exposure time of 2 s"* |
| Red light response | **None** | [M24] p.5: *"We did not, however, observe any spontaneous response in the mycelium when exposed to red and white light"* |
| White light response | **None** | [M24] p.5: same quote |

### Photoreceptor mechanism (WC-1)

> *"WC-1 is a blue-light photoreceptor that is sensitive to the wavelengths between blue and ultraviolet (UV)"*
> — [M24] p.2, citing refs. 39, 47, 48

> *"Their light sensitivity is believed to be because of proteins, such as opsins, phytochromes, and white collar-1 (WC-1), that change conformation in response to light."*
> — [M24] p.2

> *"These light-sensitive proteins are also likely involved in hyphal growth regulation and circadian rhythms"*
> — [M24] p.2, citing ref. 49

---

## 6. Signal Processing Pipeline

### Filtering

| Parameter | Value | Citation |
|-----------|-------|----------|
| Filter type | Savitzky-Golay | [M24] p.4: *"We applied the Savitzky-Golay filter to a set of digital data points for the purpose of smoothing"* |
| Polynomial order | k = 3 (3rd order) | [M24] p.4: *"we used a third-order polynomial (k = 3)"* |
| Window size | n = 11 points | [M24] p.4: *"and a commonly used window size of 11 points (n = 11)"* |
| Noise exclusion threshold | <5 µV | [M24] p.11: *"We classified any fungal signal below 5 μV as noise and excluded it from further analysis"* |
| Baseline voltage change ΔB(t) | <2 µV | [M24] p.5: *"We identified the baseline voltage, B(t), and net baseline voltage changes ΔB(t) of the recorded signal… as approximately less than 2 μV"* |

### Peak detection

| Parameter | Value | Citation |
|-----------|-------|----------|
| Prominence threshold (P) | 10 µV | [M24] p.11: *"setting P = 10 μV for all analyses"* |
| Method | SciPy `find_peaks` + `peak_widths` | [M24] p.11: *"we used the find_peaks and peak_widths functions, using a predefined prominence"* |
| Width measurement | At 80% of peak height | [M24] p.11: *"the peak_widths function calculated the width, representing the time between depolarization and repolarization at 80% of the spike height"* |
| Programming language | Python 3.9.13 + SciPy signal | [M24] p.11: *"we used Python (version 3.9.13) with the SciPy signal library"* |

### Real-time control sampling

| Parameter | Value | Citation |
|-----------|-------|----------|
| Sampling window | 30 s | [M24] p.12: *"we saved fungal data points in a text file every 30 s"* |
| Data points per window | 300 | [M24] p.12: *"at a sampling rate of 10 S/s, resulting in a total of 300 data points per file"* |
| First 30 s | Discarded | [M24] p.12: *"To ensure stability in the membrane potential, we discarded the initial 30-s data"* |
| MCU interface | Python → Arduino via pyFirmata 1.1.0 | [M24] p.12: *"We used the pyFirmata library (version 1.1.0), which enabled access to the Arduino microcontroller"* |

### ADC conversion formula

> V = (ADC_Value_raw / ADC_Value_max) × V_max

— [M24] p.12, Eq. 6

---

## 7. Comparative Data: Other Fungal Species

### *Pleurotus djamor* (Adamatzky 2018)

Same genus as *P. eryngii*. Same recording equipment (ADC-24, SPES Medica electrodes).

#### Spontaneous spiking (Table 1 in [A18])

| Parameter | H-spikes | L-spikes | Citation |
|-----------|----------|----------|----------|
| Period | 160.5 (±15.1) s | 838.8 (±147.2) s | [A18] Table 1 (p.4) |
| Amplitude | 0.88 (±0.14) mV | 1.3 (±0.21) mV | [A18] Table 1 |
| Duration | 115.5 (±28.1) s | 142.6 (±33.1) s | [A18] Table 1 |
| Depolarisation rate | 0.022 (±0.006) mV/s | 0.025 (±0.01) mV/s | [A18] Table 1 |
| Repolarisation rate | 0.012 (±0.002) mV/s | 0.024 (±0.007) mV/s | [A18] Table 1 |
| Refractory period | 25.5 (±4.2) s | 256.2 (±80.6) s | [A18] Table 1 |
| Train duration | 80–150 min | 130–360 min | [A18] Table 1 |

> *"We observed two types of spike trains: high-frequency (H-spikes), a spike per c. 2.6 min, and low-frequency (L-spikes), a spike per c. 14 min"*
> — [A18] p.3

#### Thermal stimulation response (Table 2 in [A18])

| Stimulus | Amplitude (mV) | Depol. rate (mV/s) | Repol. rate (mV/s) | Duration (s) |
|----------|----------------|---------------------|---------------------|-------------|
| Water | 6.1 | 0.2 | 0.05 | 141.5 |
| Spirit (40% ethanol) | 0.8 | 0.03 | 0.02 | 51.2 |
| Thermal (5 s flame) | 2.1 | 0.1 | 0.03 | 99 |

> *"While the stimulated fruit body responded to a thermal stimulation after c. 103 sec delay, two other fruit bodies in the same cluster shown shorter latency times"*
> — [A18] p.3

### Historical data from other species (cited in [M24])

| Species | Recording type | Key parameters | Source |
|---------|---------------|----------------|--------|
| *Neurospora crassa* | Intracellular | 4 types: 10–20 mV quasi-sinusoidal (3–4 min period), 20–30 s short, cyanide-induced, damped sinusoidal 50–100 mV (0.2–2 min) | [M24] p.2: *"Action potential–like signals have been recorded intracellularly and extracellularly from several fungal species, such as Neurospora crassa (45)"*; [A18] p.1: *"Four types of action potential have been identified"* |
| *Armillaria bulbosa* | Intracellular | 1–5 Hz under mechanical stimulation; resting −70 to −100 mV, amplitude 5–50 mV, duration 20–500 ms | [M24] p.2: *"A. bulbosa can produce electrical signals between 1 and 5 Hz under mechanical stimulation (46)"*; [A18] p.1: *"resting potential is −70 to −100 mV, amplitude of spikes varies from 5 to 50 mV, duration from 20 to 500 ms, frequency 0.5–5 Hz"* |
| *Ganoderma resinaceum* | Extracellular (EEP) | LF spikes: 0.2 mV amplitude, 1500 s width; HF spikes: 1.6–2.6 mV amplitude, 160–340 s width | [FSS21] Fig. 1c/d captions: *"average spike's width there is 1500 s, a distance between spike peaks is 3000 s and average amplitude is 0.2 mV"* |

### Cross-species comparison table

| Species | Recording | Amplitude | Width | Frequency | Source |
|---------|-----------|-----------|-------|-----------|--------|
| *P. eryngii* | Extracellular | 35–1868 µV | 1.1 s mean | 0.12 Hz | [M24] |
| *P. djamor* (H) | Extracellular | 0.88 mV | 115.5 s | 1/160 Hz | [A18] |
| *P. djamor* (L) | Extracellular | 1.3 mV | 142.6 s | 1/839 Hz | [A18] |
| *N. crassa* | Intracellular | 10–100 mV | — | 0.008–0.3 Hz | [A18] citing ref. 10 |
| *P. ostreatus/A. bulbosa* | Intracellular | 5–50 mV | 20–500 ms | 0.5–5 Hz | [A18] citing ref. 11 |
| *G. resinaceum* | Extracellular | 0.2–2.6 mV | 160–1500 s | — | [FSS21] |

> **Key pattern:** Extracellular recordings show µV-scale signals with second-scale widths; intracellular recordings show mV-scale signals with ms-scale widths. This is consistent with voltage attenuation through the extracellular medium. As noted by Adamatzky: *"Amplitudes of spikes measured were very low comparing to amplitudes reported in [Slayman, Olsson] because the works cited used intra-cellular recording while we used extra-cellular"* — [A18] p.6

---

## 8. Key Parameters for Bio Electronic Music

### Hardware compatibility

> The lab already has a **PicoLog ADC-24** (used in the `adc24-dashboard` application). This is the *exact same DAQ system* used in [M24].

| [M24] requirement | Lab status |
|-------------------|------------|
| PicoLog ADC-24 (24-bit, ±39 mV, 10 S/s) | ✅ Available |
| SPES Medica subdermal needle electrodes | ❌ Need to purchase |
| Faraday cage (1m × 1m × 1.5m) + copper mesh | ❌ Need to build |
| Python 3.9 + SciPy + pyFirmata | ✅ Available |
| UV/Blue light source | ❌ Need to source |

### Musically relevant signal characteristics

| Parameter | Value | Musical interpretation | Citation |
|-----------|-------|-----------------------|----------|
| Spontaneous rate | 7–36 spikes/min | Natural tempo range (~7–36 BPM triggers) | [M24] p.5: *"spiking frequency can reach up to 36 peaks min⁻¹, with a mean of 11 peaks min⁻¹"* |
| Spike width | 1–10 s | Note duration / envelope | [M24] p.5: *"The mean τ_native was 1.1 s, and the τ_max_native was ~10 s"* |
| Amplitude range | 35–1868 µV | Velocity / dynamics | [M24] p.5 (Fig. 2H) |
| UV amplification | 3–10× | Intensity control via light | [M24] p.7 |
| Blue light response | 83 µV | Secondary trigger channel | [M24] p.5 |
| Signal persistence | 30+ days | Long-term installation viable | [M24] p.3: *"more than 30 days"* |
| Real-time latency | 30 s sampling window | Acceptable for ambient/generative music | [M24] p.12 |
| Positive + negative spikes | Both detected | Two control channels from one source | [M24] p.5: *"addressing both positive and negative spikes"* |

---

## Bibliography

1. **[M24]** Mishra, A.K., Kim, J., Baghdadi, H., Johnson, B.R., Hodge, K.T. & Shepherd, R.F. (2024). Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia. *Science Robotics* 9, eadk8019. [DOI](https://doi.org/10.1126/scirobotics.adk8019)
2. **[A18]** Adamatzky, A. (2018). On spiking behaviour of oyster fungi *Pleurotus djamor*. *Scientific Reports* 8, 7873. [DOI](https://doi.org/10.1038/s41598-018-26007-1)
3. **[FSS21]** Adamatzky, A., Gandia, A. & Chiolerio, A. (2021). Fungal sensing skin. *Fungal Biology and Biotechnology* 8, 3. (RETRACTED) [DOI](https://doi.org/10.1186/s40694-021-00110-x)
4. Slayman, C.L., Long, W.S. & Gradmann, D. (1976). Action potentials in *Neurospora crassa*. *Biochimica et Biophysica Acta* 426, 732–744.
5. Olsson, S. & Hansson, B. (1995). Action potential-like activity found in fungal mycelia is sensitive to stimulation. *Naturwissenschaften* 82, 30–31.
6. Yu, Z. & Fischer, R. (2019). Light sensing and responses in fungi. *Nature Reviews Microbiology* 17, 25–36.
7. Bahn, Y.-S. et al. (2007). Sensing the environment: lessons from fungi. *Nature Reviews Microbiology* 5, 57–69.
