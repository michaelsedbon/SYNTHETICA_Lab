# EXP_006 — Agent-Downloaded Paper Index

Quick-reference index for papers downloaded for the Bio Electronic Music project.
The primary reference paper (Mishra et al. 2024) is in the main `papers_txt/` folder.

---

## Seed Paper: Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia
**File:** `../../papers_txt/Sensorimotor_control_of_robots_mediated.txt`
**Authors:** Mishra, Kim, Baghdadi, Johnson, Hodge & Shepherd (2024)
**Journal:** Science Robotics 9, eadk8019
**DOI:** [10.1126/scirobotics.adk8019](https://doi.org/10.1126/scirobotics.adk8019)

Introduces *Pleurotus eryngii* fungal mycelia as a living controller in biohybrid robots. Records spontaneous action-potential-like voltage spikes (mean ~135 µV, frequency ~0.12 Hz, up to 1868 µV peaks) from extracellular electrodes. Demonstrates UV/blue light-evoked amplified spiking (3–10× baseline) and translates signals into CPG-like digital control for a legged soft robot and a wheeled hard robot. Uses PicoLog ADC-24 (24-bit, 10 S/s) in a Faraday cage. Recorded stably for 30+ days.

---

## On spiking behaviour of oyster fungi Pleurotus djamor
**File:** `Adamatzky_2018_Spiking_Pleurotus_Djamor.txt`
**Authors:** Adamatzky (2018)
**Journal:** Scientific Reports 8, 7873
**DOI:** [10.1038/s41598-018-26007-1](https://doi.org/10.1038/s41598-018-26007-1)

First extracellular recording of spiking in *Pleurotus djamor* fruit bodies using ADC-24. Identifies two spike types: high-frequency (H-spikes, period ~2.6 min, amplitude ~0.88 mV) and low-frequency (L-spikes, period ~14 min, amplitude ~1.3 mV). Trains of 10–30 spikes observed. Also characterises thermal stimulation response: stimulated fruit body responds with 2.1 mV spike (delay ~103 s), while non-stimulated neighbours respond faster (26–51 s). Uses same electrode type (SPES Medica subdermal needles) and DAQ (PicoLog ADC-24) as the Mishra 2024 paper.

---

## Fungal sensing skin (RETRACTED)
**File:** `Adamatzky_Gandia_Chiolerio_2021_Fungal_Sensing_Skin.txt`
**Authors:** Adamatzky, Gandia & Chiolerio (2021)
**Journal:** Fungal Biology and Biotechnology 8, 3
**DOI:** [10.1186/s40694-021-00110-x](https://doi.org/10.1186/s40694-021-00110-x)

**Note: This paper has been RETRACTED.** Demonstrated a thin living mycelium sheet (*Ganoderma resinaceum*) as a sensing skin. Recorded mechanical (weight loading/removal) and optical (white + blue LEDs) responses. Optical stimulation raised baseline potential by ~0.61 mV (plateau in ~2960 s); mechanical stimulation produced spikes of ~0.4 mV. Used same equipment (ADC-24, SPES Medica electrodes). Despite retraction, provides context for the approach.

---

## Papers Not Downloaded (Sci-Hub failures)

The following key papers were identified but could not be downloaded. Summaries are based on citations in the seed paper:

### Slayman, Long & Gradmann 1976 — Action potentials in Neurospora crassa
**DOI:** 10.1016/0005-2736(76)90012-7 | **Journal:** Biochim. Biophys. Acta Biomembr. 426, 732–744

Foundational paper on fungal electrophysiology. Discovered AP-like spikes using intracellular recording of *N. crassa* mycelium. Four spike types: (1) spontaneous quasi-sinusoidal 10–20 mV, period 3–4 min; (2) shorter period 20–30 s; (3) cyanide-induced; (4) damped sinusoidal 50–100 mV, period 0.2–2 min.

### Olsson & Hansson 1995 — AP-like activity in fungal mycelia
**DOI:** 10.1007/BF01731834 | **Journal:** Naturwissenschaften 82, 30–31

Demonstrated spontaneous AP-like activity in *Pleurotus ostreatus* and *Armillaria bulbosa* via intracellular recording. Resting potential −70 to −100 mV, spike amplitude 5–50 mV, duration 20–500 ms, frequency 0.5–5 Hz. Spiking increased with chemical stimulation (sulfuric acid, malt extract, water, wood). Propagation speed ~0.5 mm/s. *A. bulbosa* produced signals at 1–5 Hz under mechanical stimulation.

### Adamatzky & Gandia 2021 — Spiking of Ganoderma resinaceum
**DOI:** 10.1142/S1793048021500090 | **Journal:** Biophys. Rev. Lett. 16, 133–141

Extracellular recording of spiking in *Ganoderma resinaceum*. Complements the Pleurotus djamor work (Adamatzky 2018).

### Adamatzky 2022 — Language of fungi
**DOI:** 10.1098/rsos.211926 | **Journal:** R. Soc. Open Sci. 9, 211926

Mapped action potential waveforms from fungal mycelia to 50 different English words. Explores the hypothesis that spiking trains constitute a form of fungal communication.

### Yu & Fischer 2019 — Light sensing and responses in fungi
**DOI:** 10.1038/s41579-018-0107-y | **Journal:** Nat. Rev. Microbiol. 17, 25–36

Comprehensive review of light-sensing photoreceptors in fungi. Covers WC-1 (blue-light receptor), opsins, phytochromes, and their roles in hyphal growth, circadian rhythms, and signal transduction.

### Bahn et al. 2007 — Sensing the environment: lessons from fungi
**DOI:** 10.1038/nrmicro1560 | **Journal:** Nat. Rev. Microbiol. 5, 57–69

Review of environmental sensing mechanisms in fungi, including light sensitivity through WC-1 proteins, chemical and temperature sensing.

---
