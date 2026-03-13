# EXP_013 — TODO

Blue Light Dose-Response Electrophysiology of *P. eryngii*

> [!IMPORTANT]
> LEDs are ~3–5 mm from agar. PWM 4095 may exceed 1.0 W/cm² (Mishra's max was 1.0 W/cm² at 12 cm). **Start low. Monitor for thermal effects.**

## Hypotheses

| ID | Hypothesis | Priority |
|----|-----------|----------|
| H1 | Blue LED stimulation produces measurable evoked potentials (~83 ± 11 µV at 2s, per Mishra) | HIGH |
| H2 | PWM intensity maps monotonically to evoked spike amplitude (dose-response curve) | HIGH |
| H3 | Sub-threshold priming — a low PWM "primer" pulse (PWM ~500, 1s) delivered 5s before a full stimulus increases evoked amplitude by 20–50% via WC-1 transcription factor mobilization | LOW (speculative) |
| H4 | Repeated stimulation causes adaptation/desensitisation — evoked amplitude decays over 50 consecutive pulses | MEDIUM |

## Hardware

| Component | Detail |
|-----------|--------|
| DAQ | PicoLog ADC-24 (24-bit, ±39 mV, 10 S/s, differential) |
| Light source | LED-DRV8 → LED-RING (~70 blue LEDs), directly below petri dish (~3–5 mm) |
| Shielding | Faraday cage (copper mesh) — see `EXP_010/FARADAY_CAGE_GUIDE.md` |
| Control | ADC-24 Dashboard (http://172.16.1.80:3001) — protocol execution + stim-annotated CSV · **LED channel 7** |
| Protocol Design | Experiment Designer (http://172.16.1.80:3006) — JSON export to dashboard |
| Analysis | Scripts + notebook in `EXP_010/analysis/` — reuse for EXP_013 |

---

## Setup

- [x] Faraday cage assembled (see `EXP_010/FARADAY_CAGE_GUIDE.md`)
- [x] Electrodes inserted in mycelium
- [x] LED-RING positioned below dish
- [x] ADC-24 connected, baseline noise < 5 µV
- [ ] No-biology control plate prepared

---

## EXP_013.1 — Validation Run

**Goal:** Confirm that the system records real signal and that blue light produces any detectable response.

**Protocol:** 5 pulses @ PWM 2048, 2s duration, ISI 20s · 5 min pre/post-baseline · ~7 min total

**Success criteria:** Noise floor < 5 µV, any visible deflection during stimulus.

**Two conditions (Faraday cage comparison):**
- Run A — No Faraday cage (open shielding)
- Run B — With Faraday cage (copper mesh)

- [x] Create stimulation protocol JSON → `protocols/EXP_013_1_validation.json` (API id: ca854702, ch 7)
- [/] Run experiment (A: no cage, B: with cage)
- [ ] Collect and download data
- [ ] Analyse: confirm signal quality
- [ ] Analyse: compare cage vs no-cage (RMS noise, stimulus response)

---

## EXP_013.2 — Dose-Response (H1 + H2)

**Goal:** Map the relationship between LED intensity/duration and evoked spike amplitude.

**Protocol:** 3 durations (1s, 2s, 5s) × 5 PWM levels (100, 500, 1024, 2048, 4095) = 15 blocks × 7 reps = 105 stimuli · ISI 20s · 5 min pre/post-baseline · Randomise block order (seed 42) · ~54 min total

**Analysis:** Dose-response curves (PWM vs evoked amplitude), grouped by duration.

- [x] Create protocol JSON (15 blocks × 7 reps, randomised) → `protocols/EXP_013_2_dose_response.json` (API id: 08fe0027, ch 7)
- [ ] Run experiment
- [ ] Collect and download data
- [ ] Analyse: dose-response curves

---

## EXP_013.3 — Adaptation / Desensitisation (H4)

**Goal:** Characterise how the mycelium adapts to repeated identical stimulation.

**Protocol:** Fixed PWM 2048, 2s exposure · ISI 20s · 50 consecutive reps · 5 min pre-baseline, 5 min rest, then 10 more reps (recovery test) · ~30 min total

**Analysis:** Evoked amplitude vs repetition number → fit exponential decay, extract time constant. Compare post-rest amplitude to initial.

- [x] Create protocol JSON (50 reps + recovery) → `protocols/EXP_013_3_adaptation.json` (API id: 776b41ea, ch 7)
- [ ] Run experiment
- [ ] Collect and download data
- [ ] Analyse: decay curve + recovery

---

## EXP_013.4 — Priming (if H1 succeeds) (H3)

**Goal:** Test whether a low-intensity primer enhances subsequent evoked response.

**Protocol:**
- Condition A (primed): PWM 500 for 1s → 5s gap → PWM 2048 for 2s → ISI 20s
- Condition B (unprimed): PWM 2048 for 2s → ISI 20s
- 15 reps each, interleaved randomly · 5 min pre/post-baseline · ~15 min total

**Analysis:** Compare evoked amplitude between primed vs unprimed trials (paired t-test).

- [x] Create protocol JSON (primed vs unprimed) → `protocols/EXP_013_4_priming.json` (API id: a6308eb2, ch 7)
- [ ] Run experiment
- [ ] Collect and download data
- [ ] Analyse: primed vs unprimed comparison

---

## EXP_013.C1 — Dark Control

**Goal:** Quantify spontaneous spike rate without any stimulation.

**Protocol:** 30 min continuous recording, no stimulation · Same electrode setup, Faraday cage closed.

**Analysis:** Spontaneous spike frequency, amplitude distribution.

- [ ] Run 30 min silent recording
- [ ] Analyse: spontaneous rate

---

## EXP_013.C2 — No-Biology Control (agar-only plate)

**Goal:** Quantify thermal and electrical artifacts from LED activation.

**Protocol:** Same as EXP_013.2 dose-response protocol, but on a plain agar plate (no mycelium). Any signal here is artifact, not biology.

**Analysis:** Compare artifact amplitudes to biological responses from EXP_013.2.

- [ ] Swap to agar-only plate
- [ ] Run dose-response protocol → uses `protocols/EXP_013_C2_no_biology_control.json` (API id: d8394c95, ch 7)
- [ ] Analyse: artifact characterisation

---

## References

- `experiments/EXP_010/` — infrastructure, brainstorming, analysis scripts, Faraday cage guide
- `experiments/EXP_006/` — literature review (Mishra et al. 2024 data)
- `experiments/EXP_009/` — LED-DRV8 firmware, REST API
- `experiments/EXP_001/` — mycelium growth & recording setup
- Mishra et al. 2024 — *Sensorimotor control of robots mediated by electrophysiological measurements of fungal mycelia*
- Yu & Fischer 2019 — *Light sensing and responses in fungi*
