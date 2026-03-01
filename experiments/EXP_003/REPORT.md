# Cryptographic Beings — Marimo Buoyancy Characterization Report

**EXP_003 | 2026-03-01**

---

## 1. Introduction

This report presents a mathematical model and simulation of the **Cryptographic Beings** machine — a bio-hybrid system using Marimo moss balls (*Aegagropila linnaei*) for binary data storage. The machine exploits photosynthesis-driven buoyancy to encode binary states: a floating Marimo represents `1`, a sunk one represents `0`.

### Machine Architecture

- **3 levels** × **6 glass tubes per level** = 18 Marimo balls total
- **1 motorized arm** with a light source, rotating around the tower
- **1 fixed light per level** at a single angular position
- **Each level rotates independently** — any tube can face the fixed light or the arm

---

## 2. Model Description

### 2.1 What kind of model is this?

The model is a system of coupled **ordinary differential equations (ODEs)**, one set per Marimo ball. Each ball has 4 state variables that evolve over time. The ODEs are integrated numerically using **explicit Euler** time-stepping with a step size of 5–10 seconds — small enough for numerical stability, large enough for the simulator to run at >70,000× real-time. The implementation is in [marimo_bio.py](model/marimo_bio.py), [machine.py](model/machine.py), and [simulator.py](model/simulator.py).

This is **not** a spatially-resolved model. Each Marimo is treated as a lumped object (uniform internal state), and the water column is 1-dimensional (vertical position only). This is appropriate because: (a) Marimo balls are small enough that internal gradients equilibrate quickly, (b) the tube is narrow enough to suppress horizontal motion, and (c) we care about the binary outcome (float/sink), not the detailed flow field.

### 2.2 State Variables

Each Marimo ball carries 4 dynamical variables:

| Variable | Symbol | Unit | Physical meaning |
|----------|--------|------|-----------------|
| **Trapped O₂** | $n_{O_2}$ | mol | Amount of gaseous oxygen trapped within the filament network. This is the primary driver of buoyancy. |
| **Vertical position** | $z$ | — (0–1) | Normalised height in the tube: 0 = resting on the bottom, 1 = at the water surface. |
| **Circadian phase** | $\phi$ | rad | Where the Marimo is in its internal 24-hour biological clock cycle (0 to 2π). This clock runs independently of the light schedule. |
| **Chlorophyll health** | $\chi$ | — (0–1) | Fraction of functional photosynthetic pigments. Decreases under excessive light (photobleaching), recovers in darkness. |

### 2.3 Equation 1 — Oxygen Balance

This is the central equation. It describes how the amount of trapped O₂ changes over time:

$$\frac{dn_{O_2}}{dt} = \underbrace{P_{\max} \cdot f(I) \cdot g(\phi) \cdot h(T) \cdot \chi}_{\text{O₂ production by photosynthesis}} \cdot \eta_{\text{ret}} - \underbrace{R_{\text{dark}}}_{\text{O₂ consumed by respiration}} - \underbrace{k_{\text{rel}} \cdot n_{O_2}}_{\text{spontaneous bubble loss}}$$

**Three competing processes:**

1. **Production** — Photosynthesis splits water molecules and releases O₂ gas, which gets trapped in the dense filament network of the Marimo ball. The production rate is modulated by 4 multiplicative factors (light, clock, temperature, health) and a retention fraction $\eta_{\text{ret}}$ = 0.7 (30% of produced O₂ escapes immediately as free bubbles).

2. **Respiration** — Like all living cells, the algae consume O₂ continuously (day and night) for cellular metabolism. This is a constant drain of $R_{\text{dark}}$ = 3×10⁻⁹ mol/s.

3. **Bubble release** — Trapped bubbles slowly escape from the filament matrix at a rate proportional to the current amount of gas. Rate constant $k_{\text{rel}}$ = 10⁻⁴ s⁻¹ gives a half-life of ~1.9 hours — meaning if you turn off the light, the ball loses half its buoyancy in about 2 hours.

#### Light response function $f(I)$

$$f(I) = \frac{I^n}{K_m^n + I^n}$$

This is a **Hill function** — a standard model for saturating biological responses. At low light, photosynthesis increases roughly linearly with intensity. At high light, the photosynthetic machinery is saturated and additional photons don't help.

- At $I = K_m$ = 50 µmol/m²/s: $f$ = 0.5 (half-maximum rate)
- At $I$ = 200 µmol/m²/s: $f$ ≈ 0.94 (near saturation)
- The Hill coefficient $n$ = 2 makes the curve **sigmoidal** — there's a relatively sharp transition from "not enough light" to "enough light", which helps produce clean binary switching. In practice, the minimum intensity to achieve buoyancy is ~35 µmol/m²/s.

#### Circadian gate $g(\phi)$

$$g(\phi) = 1 - A \cdot \frac{1 - \cos(\phi - \phi_{\text{peak}})}{2}$$

Cano-Ramirez et al. [1] demonstrated that Marimo buoyancy is regulated by an internal circadian clock — buoyancy rhythms persist even in constant dim red light (i.e., without any light/dark cue). This function is a cosine modulation of photosynthetic efficiency:

- **At the circadian peak** ($\phi = \phi_{\text{peak}}$): $g = 1.0$ → full photosynthetic efficiency
- **At the trough** (12h later): $g = 1 - A = 0.6$ → 60% efficiency

The paper describes these as **"low amplitude" oscillations**. We set $A$ = 0.4 and $\phi_{\text{peak}}$ = 6h after dawn (inferred from their ZT3 vs ZT15 measurements, which showed higher quantum yield during the day). These are **estimates** — the paper confirms the effect exists and is low-amplitude, but does not quantify the percentage precisely.

#### Temperature scaling $h(T)$

$$h(T) = Q_{10}^{(T - T_{\text{ref}})/10}$$

This is a **Q₁₀ model** — a standard empirical rule for how enzymatic reaction rates depend on temperature. With $Q_{10}$ = 2.0 (a generic biochemistry value, not specifically measured for Marimo), photosynthesis rate doubles for every 10°C increase:

| Temperature | $h(T)$ | Effect on photosynthesis |
|-------------|--------|--------------------------|
| 10°C | 0.50 | Half the baseline rate |
| 15°C | 0.71 | 30% reduction |
| **20°C** | **1.00** | **Baseline** |
| 25°C | 1.41 | 41% increase |
| 30°C | 2.00 | Double the baseline rate |

> **Limitation:** The Q₁₀ = 2.0 is a generic value, not specifically calibrated for *A. linnaei*. Moreover, Kudoh et al. [4] showed that low temperature + high light produces a **synergistic** photoinhibition effect that our simple multiplicative model doesn't capture — in reality, cold Marimos suffer more from the same light intensity than warm ones.

### 2.4 Equation 2 — Buoyancy Force

Once we know how much O₂ is trapped, we compute the upward force. The trapped gas occupies some volume (computed via the ideal gas law) and displaces water, providing lift:

$$V_{O_2} = \frac{n_{O_2} \cdot R \cdot T}{P} \qquad \text{(ideal gas law)}$$

$$F_{\text{net}} = \underbrace{\rho_w \cdot g \cdot V_{O_2}}_{\text{lift from gas displacement}} - \underbrace{(\rho_{\text{ball}} - \rho_w) \cdot V_{\text{ball}} \cdot g}_{\text{sinking force from density excess}}$$

The ball floats when $F_{\text{net}} > 0$, i.e., when the gas has displaced enough water to overcome the ball's slight density excess. For our parameters:

- **Excess weight** (ball heavier than water): 0.57 g = 5.6 mN
- **O₂ needed to neutralise this**: ~24 µmol
- **Steady-state O₂** under constant light at 20°C: ~145 µmol → plenty of margin = ~2.9 g usable lift

**Calibration note:** The ball density (1003 kg/m³) was calibrated so the float threshold (~24 µmol O₂) produces buoyancy within ~45 minutes at 200 µmol/m²/s — consistent with the timescales reported by Phillips et al. [2]. An earlier version of the model used 1020 kg/m³, which required 103.6 µmol O₂ to float — more than the ball could accumulate with circadian gating, so it never floated at all.

### 2.5 Equation 3 — Vertical Dynamics

The ball moves vertically under the net buoyancy force, resisted by viscous drag:

$$m_{\text{eff}} \cdot \frac{dv_z}{dt} = F_{\text{net}} - \text{sign}(v_z) \cdot |F_{\text{drag}}|$$

where:
- **Stokes drag:** $F_{\text{drag}} = 6\pi \eta r \cdot v_z$ (valid at low Reynolds number, Re ~1–10)
- **Effective mass:** $m_{\text{eff}} = m_{\text{ball}} + \frac{1}{2}\rho_w V_{\text{ball}}$ — includes the **added mass** effect (the fluid entrained by the sphere adds to its inertia, with coefficient 0.5 for a sphere)

Position update:
$$\frac{dz}{dt} = \frac{v_z}{H_{\text{tube}}}$$

$z$ is clamped to [0, 1] and velocity is zeroed when the ball hits a boundary (bottom or surface).

### 2.6 Equation 4 — Photobleaching

Excess light damages the photosynthetic pigments (primarily chlorophyll) through **photoinhibition** — the D1 protein in Photosystem II is degraded faster than it can be repaired [4]:

$$\frac{d\chi}{dt} = \begin{cases} -k_{\text{bleach}} \cdot \frac{I - I_{\text{thresh}}}{I_{\text{thresh}}} & \text{if } I > I_{\text{thresh}} \quad \text{(damage)} \\[6pt] +k_{\text{rec}} & \text{otherwise} \quad \text{(recovery)} \end{cases}$$

- **Damage** occurs only above the threshold $I_{\text{thresh}}$ = 300 µmol/m²/s, and is proportional to how much the light exceeds it. Kudoh et al. [4] measured significant drops in Fv/Fm (a measure of PSII functionality) above this level.
- **Recovery** occurs in moderate light or darkness at a constant rate. Recovery is slower than damage ($k_{\text{rec}} < k_{\text{bleach}}$), reflecting the biological reality that D1 repair requires protein synthesis.

The health factor $\chi$ feeds back into photosynthesis: a bleached ball with $\chi = 0.5$ produces O₂ at only 50% of the rate of a healthy one.

### 2.7 Equation 5 — Circadian Clock

The internal clock runs freely at a fixed period:

$$\frac{d\phi}{dt} = \frac{2\pi}{\tau_{\text{circ}}}$$

In our model, the clock is **not entrained** by the light schedule — it's a free-running oscillator. This is a simplification; real circadian clocks are entrained by light (the zeitgeber), but free-running in constant conditions. For a more complete model, one could add light-dependent phase resetting.

---

## 3. Parameters

### 3.1 Parameters from Literature

These values are directly extracted or closely derived from published measurements:

| Parameter | Symbol | Value | Source | How it was obtained |
|-----------|--------|-------|--------|---------------------|
| Ball diameter | $d$ | 60 mm | Phillips 2019 [2] | Experimental standard size |
| Usable lift force | — | ~1.5 g | Phillips 2019 [2] | Direct force measurement on 60mm balls |
| Circadian period | $\tau_{\text{circ}}$ | ~24 h | Cano-Ramirez 2018 [1] | Buoyancy rhythms persisted for 3+ days in constant dim light |
| Photoinhibition onset | $I_{\text{thresh}}$ | ~300 µmol/m²/s | Kudoh 2023 [4] | Fv/Fm drop measured at high irradiance |

### 3.2 Estimated / Calibrated Parameters

These values are plausible estimates, calibrated to reproduce the qualitative and quantitative behaviour reported in the literature:

| Parameter | Symbol | Value | Unit | Rationale |
|-----------|--------|-------|------|-----------|
| Ball density | $\rho_{\text{ball}}$ | 1003 | kg/m³ | Calibrated so float time ≈ 0.7h at 200 µmol/m²/s. Marimos are porous algal filaments — barely denser than water. |
| Max photosynthesis | $P_{\max}$ | 2.5×10⁻⁸ | mol/s | Set to reach ~1.5g net lift within 2h |
| Half-saturation | $K_m$ | 50 | µmol/m²/s | Estimated from the known shade-adaptation of *A. linnaei* [5] |
| Hill coefficient | $n$ | 2 | — | Produces clean sigmoidal switching |
| Dark respiration | $R_{\text{dark}}$ | 3×10⁻⁹ | mol/s | ~12% of $P_{\max}$ (typical for green algae) |
| Bubble retention | $\eta_{\text{ret}}$ | 0.7 | — | Estimated — 70% of O₂ stays trapped |
| Release rate | $k_{\text{rel}}$ | 10⁻⁴ | s⁻¹ | Gives ~2h sink time after dark |
| Circadian amplitude | $A$ | 0.4 | — | Estimated from "low amplitude" description in [1] |
| Circadian peak | $\phi_{\text{peak}}$ | 6h | — | Estimated from ZT3 vs ZT15 data in [1] |
| $Q_{10}$ | $Q_{10}$ | 2.0 | — | Generic biochemistry value |
| Bleach rate | $k_{\text{bleach}}$ | 10⁻⁶ | s⁻¹ | Estimated from multi-day degradation in [4] |
| Recovery rate | $k_{\text{rec}}$ | 5×10⁻⁷ | s⁻¹ | Set slower than damage |

### 3.3 Derived Quantities

| Quantity | Formula | Value |
|----------|---------|-------|
| Ball volume | $\frac{4}{3}\pi r^3$ | 113.1 cm³ |
| Excess weight | $(\rho_b - \rho_w) V g$ | 0.57 g (5.6 mN) |
| O₂ threshold to float | — | ~24 µmol |
| Steady-state O₂ (constant light, 20°C) | $(P_{\max}\eta - R) / k_{\text{rel}}$ | ~145 µmol |
| Peak net lift | — | ~2.9 g |
| Bubble half-life | $\ln 2 / k_{\text{rel}}$ | ~1.9 h |

---

## 4. Results

### 4.1 Experiment 1: Single Tube — Light/Dark Cycle (72h)

A single Marimo ball subjected to 12h:12h light:dark (200 µmol/m²/s) over 3 days.

**Observations:**
- The ball **floats ~33 minutes after light onset** as O₂ accumulates past the 24 µmol threshold
- It **sinks ~2h after dark** as bubbles escape (half-life ~1.9h)
- Peak O₂ reaches ~103 µmol per cycle
- The binary state switches cleanly between 0 and 1 each cycle
- Timing is remarkably consistent across all 3 days (0.55h rise, 1.97h sink)

![Experiment 1: Light/Dark Cycle](figures/exp1_light_dark_cycle.png)

➡️ [Interactive plot](figures/exp1_light_dark_cycle.html)

---

### 4.2 Experiment 1b: Parameter Sweep — Light Intensity × Duration

Systematic sweep of light intensity (25–500 µmol/m²/s) × exposure duration (1–12h).

**Observations:**
- At 200 µmol/m²/s, the ball floats in ~0.7h (44 min). At 100 µmol: ~0.9h. At 50 µmol: ~2.1h.
- Below ~35 µmol/m²/s the ball never floats — the Hill function gives negligible production at low intensity
- Time-to-sink after light-off is proportional to accumulated O₂ (more gas = longer persistence)

![Experiment 1b: Parameter Sweep](figures/exp1b_parameter_sweep.png)

➡️ [Interactive plot](figures/exp1b_parameter_sweep.html)

---

### 4.3 Experiment 1c: Photobleaching (7 days)

Long-duration simulation under 4 light regimes.

**Observations:**
- **Normal (200 µmol):** No bleaching. Stable oscillation for days.
- **High (400 µmol):** Gradual chlorophyll degradation (~10% over 7 days). Buoyancy amplitude slightly reduced.
- **Extreme (800 µmol):** >50% degradation. The ball still oscillates but with reduced lift and delayed float times.
- **Constant extreme (600 µmol, no dark periods):** Worst case — without dark recovery periods, degradation accumulates faster.

![Experiment 1c: Photobleaching](figures/exp1c_bleaching.png)

➡️ [Interactive plot](figures/exp1c_bleaching.html)

---

### 4.4 Experiment 1d: Temperature Sweep (10°C – 30°C)

Five temperatures compared over 72h with the same 12:12 light/dark schedule.

| Temperature | First float time | Peak O₂ | Q₁₀ factor |
|-------------|-----------------|---------|------------|
| 10°C | 7.8 h | 39 µmol | 0.50× |
| 15°C | 6.9 h | 65 µmol | 0.71× |
| **20°C** | **6.5 h** | **103 µmol** | **1.00×** |
| 25°C | 6.3 h | 157 µmol | 1.41× |
| 30°C | 6.2 h | 233 µmol | 2.00× |

**Observations:**
- Temperature has a **dramatic effect on peak O₂**: 6× difference between 10°C and 30°C
- Float time is less affected (7.8h vs 6.2h) because even at 10°C, the O₂ eventually exceeds the ~24 µmol threshold — it just takes longer
- At 10°C, the ball barely exceeds the float threshold (39 µmol peak vs 24 µmol threshold), making it **marginal** — a slightly denser ball or stronger circadian gating could prevent floating entirely
- At 30°C, the O₂ is far above threshold, meaning the ball spends almost the entire light period floating — less time at intermediate states

**Implication for the machine:** Indoor temperature (~20°C) is fine. But if the room gets cold (e.g., winter, no heating), the machine's response time will increase significantly.

![Experiment 1d: Temperature Sweep](figures/exp1d_temperature_sweep.png)

➡️ [Interactive plot](figures/exp1d_temperature_sweep.html)

---

### 4.5 Experiment 2: Single Level — Sequential Exposure (48h)

One level (6 tubes) with the level rotating to expose each tube for 2h sequentially.

**Observations:**
- Each tube responds independently to its individual light window
- Sequential exposure creates a **buoyancy wave** — tubes rise and sink in sequence
- Earlier-exposed tubes start sinking while later ones are still rising

![Experiment 2: Single Level](figures/exp2_single_level.png)

➡️ [Interactive plot](figures/exp2_single_level.html)

---

### 4.6 Experiment 3: Full Installation — Binary Encoding

Full 3-level (18 tube) simulation. The arm scans 5 target tubes with 3h exposure each.

**Target:** tubes (L0-T1, L0-T4, L1-T1, L1-T4, L2-T1) should be HIGH.

**Result:** 56% accuracy (10/18 correct). Adjacent tubes received leaked light from the arm's angular spread (30° beam with cosine falloff).

**Key insight:** The angular spacing between tubes is 60° (6 tubes per level), but the arm's 30° beam width means adjacent tubes receive nonzero illumination. Possible solutions:
1. Narrow the beam to <20° (optical collimation)
2. Add physical baffles between tubes
3. Use only fixed level lights + rotation (slower but no cross-talk)

![Experiment 3: Binary Encoding](figures/exp3_full_installation.png)

➡️ [Interactive plot](figures/exp3_full_installation.html)

---

### 4.7 Experiment 4: Tower Top-Down Visualization

Top-down state view at end of encoding experiment.

![Experiment 4: Tower State](figures/exp4_tower_visualization.png)

➡️ [Interactive plot](figures/exp4_tower_visualization.html)

---

## 5. Simulation Performance

| Metric | Value |
|--------|-------|
| Time step (dt) | 5–10 s |
| Single tube, 72h | < 1 s wall time |
| Single level (6 tubes), 48h | 0.8 s (229K× real-time) |
| Full machine (18 tubes), 27h | 1.3 s (74K× real-time) |

Fast enough for real-time parameter exploration and as a virtual testbed for LLM-controlled experiments. All experiments are run via [run_experiments.py](model/run_experiments.py).

---

## 6. Model Limitations

1. **No light entrainment** — the circadian clock free-runs at 24h, not entrained by the actual light schedule. Real clocks would synchronise.
2. **No temperature×light synergy** — the bleaching model treats temperature and light independently, but Kudoh [4] shows low temperature worsens photoinhibition.
3. **Spatially uniform** — each Marimo is a single compartment. In reality, the outer surface photosynthesises much more than the interior (Boedeker [5] reports a 4–5 cm photosynthetic depth limit).
4. **Stokes drag** — the low-Re Stokes formula may underestimate drag for a porous, hairy sphere. Real Marimos likely experience higher drag.
5. **Calibrated, not fitted** — the key parameters ($\rho_{\text{ball}}$, $P_{\max}$, $k_{\text{rel}}$) were hand-tuned to match literature timescales, not statistically fitted to data.

---

## 7. Bibliography

1. Cano-Ramirez DL et al. **Photosynthesis and circadian rhythms regulate the buoyancy of marimo lake balls.** *Current Biology* 28(16):R869-R870. 2018. DOI: [10.1016/j.cub.2018.07.027](https://doi.org/10.1016/j.cub.2018.07.027)

2. Phillips N, Adamatzky A, Mayne R. **Marimo machines: oscillators, biosensors and actuators.** *Journal of Biological Engineering* 13:72. 2019. DOI: [10.1186/s13036-019-0200-5](https://doi.org/10.1186/s13036-019-0200-5)

3. Phillips N, Adamatzky A. **Marimo actuated rover systems.** *Journal of Biological Engineering* 16:3. 2022. DOI: [10.1186/s13036-021-00279-0](https://doi.org/10.1186/s13036-021-00279-0)

4. Kudoh S, Uchida A, Kashino Y. **Effects of High Irradiance and Low Water Temperature on Photoinhibition and Repair of Photosystems in Marimo (*Aegagropila linnaei*).** *Int. J. Mol. Sci.* 24(1):60. 2023. DOI: [10.3390/ijms24010060](https://doi.org/10.3390/ijms24010060)

5. Boedeker C et al. **Global Decline of and Threats to *Aegagropila linnaei*, with Special Reference to the Lake Ball Habit.** *BioScience* 60(3):187-198. 2010. DOI: [10.1525/bio.2010.60.3.5](https://doi.org/10.1525/bio.2010.60.3.5)
