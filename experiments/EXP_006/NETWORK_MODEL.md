# Network Model Extensions — Mathematical Documentation

**EXP_006 | 2026-03-07**

Extends the single-cell model ([MODEL.md](MODEL.md)) into a spatial network with photoreceptor kinetics, adaptation, localized stimulation, and sonification.

---

## 1. Network Topology

### 1.1 Random Geometric Graph

$N = 50$ nodes placed uniformly in a $20 \times 20$ mm arena. Edges connect nodes within radius $r_c = 5$ mm.

$$\text{edge}(i,j) \iff \| \mathbf{x}_i - \mathbf{x}_j \| \leq r_c$$

Typical topology: ~211 edges, mean degree ~8.4.

### 1.2 Gap Junction Coupling

Each node's membrane equation gains a coupling term:

$$C \frac{dV_i}{dt} = -g_L(V_i - E_L) + I_{\text{drive},i} - w_i + I_{\text{stim},i} + I_{\text{gap},i} + I_{\text{noise}}$$

where the gap junction current is:

$$I_{\text{gap},i} = g_{\text{gap}} \sum_{j \in N(i)} (V_j - V_i)$$

| Parameter | Symbol | Value | Source |
|-----------|--------|-------|--------|
| Gap junction conductance | $g_{\text{gap}}$ | 0.02 | Calibrated |
| Propagation speed | — | 0.5 mm/s | Olsson & Hansson 1995 |
| Signal delay | $d_{ij}$ | $\|\mathbf{x}_i - \mathbf{x}_j\| / 0.5$ s | Derived |

### 1.3 Per-Node Variability

Each node has slightly different intrinsic properties:

$$I_{\text{drive},i} = I_{\text{drive}} \cdot (1 + U_i), \quad U_i \sim \text{Uniform}(-0.10, +0.10)$$
$$V_{\text{th},i} = V_{\text{th}} \cdot (1 + W_i), \quad W_i \sim \text{Uniform}(-0.05, +0.05)$$

This ensures nodes don't all fire in lockstep.

---

## 2. Photoreceptor Kinetics (WC-1)

### 2.1 Hill-Function Activation

Replaces instantaneous square light pulses with receptor dynamics:

$$\frac{dR}{dt} = \frac{R_\infty(I_{\text{light}}) - R}{\tau_R}$$

Steady-state activation follows a Hill function:

$$R_\infty = R_{\max} \cdot \frac{I_{\text{eff}}^n}{K^n + I_{\text{eff}}^n}$$

### 2.2 Wavelength Sensitivity

$$I_{\text{eff}} = I_{\text{light}} \cdot S(\lambda)$$

| Wavelength | $S(\lambda)$ | Source |
|------------|--------------|--------|
| UV (365 nm) | 3.0 | WC-1 peak sensitivity [Yu & Fischer 2019] |
| Blue (450 nm) | 1.0 | Baseline response [M24 p.5] |
| Red | 0.0 | No response [M24 p.5] |
| White | 0.0 | No response [M24 p.5] |

### 2.3 Asymmetric Kinetics

$$\tau_R = \begin{cases} \tau_{\text{act}} = 0.3 \text{ s} & \text{if } R_\infty > R \text{ (activating)} \\ \tau_{\text{deact}} = 1.5 \text{ s} & \text{if } R_\infty < R \text{ (deactivating)} \end{cases}$$

This captures the biological observation that photoreceptors activate quickly but deactivate slowly.

### 2.4 Parameters

| Parameter | Symbol | Value | Unit |
|-----------|--------|-------|------|
| Activation time constant | $\tau_{\text{act}}$ | 0.3 | s |
| Deactivation time constant | $\tau_{\text{deact}}$ | 1.5 | s |
| Hill coefficient | $n$ | 2.0 | — |
| Half-activation intensity | $K$ | 0.5 | W/cm² |
| Max activation | $R_{\max}$ | 1.0 | — |
| Current scale | $I_{\text{scale}}$ | 3.0 | — |

---

## 3. Adaptation & Fatigue

### 3.1 Spike-Frequency Adaptation

An adaptation current $w_i$ builds up with each spike and decays slowly:

$$\frac{dw_i}{dt} = -\frac{w_i}{\tau_a} + b \cdot \delta(\text{spike}_i)$$

This current is **subtracted** from the drive, reducing excitability after spiking.

### 3.2 Resource Depletion

An amplitude pool $P_i$ depletes with each spike and recovers:

$$\frac{dP_i}{dt} = \frac{P_{\text{rest}} - P_i}{\tau_{\text{rec}}} - c \cdot \delta(\text{spike}_i)$$

Spike amplitude is then scaled: $A_{\text{actual}} = A_{\text{sampled}} \times P_i$

| Parameter | Symbol | Value | Unit |
|-----------|--------|-------|------|
| Adaptation time constant | $\tau_a$ | 30 | s |
| Adaptation increment | $b$ | 0.15 | — |
| Max adaptation current | $w_{\max}$ | 0.20 | — |
| Recovery time constant | $\tau_{\text{rec}}$ | 60 | s |
| Depletion per spike | $c$ | 0.02 | — |
| Resting pool | $P_{\text{rest}}$ | 1.0 | — |
| Minimum pool | $P_{\min}$ | 0.3 | — |

> *"gradual weakening observed over time"* — Mishra et al. 2024, p.10

---

## 4. Stimulation Modes

### 4.1 Optic Fiber (Localized Light)

Gaussian spatial falloff from fiber tip position $(x_f, y_f)$:

$$I_i^{\text{fiber}} = I_0 \cdot \exp\left(-\frac{(x_i - x_f)^2 + (y_i - y_f)^2}{2\sigma^2}\right)$$

where $\sigma$ is the fiber numerical aperture × distance (spot size). Light is routed through the photoreceptor model (§2).

### 4.2 Flood Light

All nodes receive equal intensity $I_0$. Routed through photoreceptor.

$$I_i^{\text{flood}} = I_0 \quad \forall i$$

### 4.3 Electrical Stimulation

Direct current injection with spatial decay from electrode position $(x_e, y_e)$:

$$I_i^{\text{elec}} = \frac{I_0}{1 + \left(\frac{r_i}{\lambda}\right)^2}, \quad r_i = \|\mathbf{x}_i - \mathbf{x}_e\|$$

Not routed through photoreceptor — bypasses WC-1 entirely.

**Waveforms supported:**

| Waveform | Formula |
|----------|---------|
| Monophasic | $I(t) = I_0$ (constant) |
| Biphasic | $I(t) = I_0 \cdot \text{sign}(\sin(2\pi f t))$ |
| Pulse train | $I(t) = I_0 \cdot \mathbb{1}_{[0, w]}(t \bmod 1/f)$ |

### 4.4 Parameters

| Parameter | Default | Unit | Description |
|-----------|---------|------|-------------|
| $I_0$ (light) | 0.5 | W/cm² | Source intensity |
| $\sigma$ (fiber) | 2.0 | mm | Gaussian spot size |
| $I_0$ (electrical) | 0.5 | µA | Electrode current |
| $\lambda$ (electrical) | 3.0 | mm | Spatial decay length |
| $f$ (pulse train) | 1.0 | Hz | Pulse frequency |
| $w$ (pulse train) | 0.5 | s | Pulse width |

---

## 5. Bio→Music Mapping

### 5.1 Spike Feature → Musical Parameter

| Input | Output | Mapping |
|-------|--------|---------|
| Amplitude (35–1868 µV) | MIDI velocity (20–127) | Linear: $v = 20 + \frac{A - 35}{1833} \times 107$ |
| Width (0.3–5.0 s) | Note duration (0.1–2.0 s) | Linear rescale |
| Y position (0–20 mm) | MIDI note (C2–C6, 36–84) | Linear, quantized to scale |
| X position (0–20 mm) | Stereo pan (0–127) | Linear: $\text{pan} = \frac{x}{20} \times 127$ |
| Quadrant | MIDI channel (0–3) | Spatial: TL=0, TR=1, BL=2, BR=3 |

### 5.2 Scale Quantization

Notes are quantized to the nearest note in the selected scale:

| Scale | Intervals (semitones from root) |
|-------|---------------------------------|
| Minor Pentatonic | 0, 3, 5, 7, 10 |
| Major Pentatonic | 0, 2, 4, 7, 9 |
| Blues | 0, 3, 5, 6, 7, 10 |
| Dorian | 0, 2, 3, 5, 7, 9, 10 |
| Whole Tone | 0, 2, 4, 6, 8, 10 |

### 5.3 Web Audio Synthesis

MIDI notes converted to frequency: $f = 440 \times 2^{(n - 69)/12}$

Envelope: linear attack (20 ms), exponential decay to note duration.

---

## 6. Results

All plots generated by [plot_network.py](model/plot_network.py) and saved to `model/plots/`.

### 6.1 Photoreceptor WC-1 Kinetics

A 2-second UV pulse (t=3–5s) and a 2-second blue pulse (t=9–11s), both at 0.5 W/cm². The receptor activates fast (τ_act=0.3s) and deactivates slowly (τ_deact=1.5s). UV reaches R≈0.9 due to 3× sensitivity; blue reaches R≈0.5.

![WC-1 photoreceptor kinetics — fast activation, slow deactivation, UV 3× stronger than blue](model/plots/06_photoreceptor_kinetics.png)

### 6.2 Hill Function Dose–Response

Steady-state activation $R_\infty$ as a function of light intensity. The Hill function (n=2) produces a sigmoid curve. UV saturates much earlier than blue due to the 3× sensitivity multiplier.

![Hill function dose-response — UV saturates earlier due to sensitivity=3×](model/plots/07_hill_dose_response.png)

### 6.3 Adaptation & Fatigue Dynamics

Simulated spiking every ~8 seconds for 60s, then silence for 60s recovery. The adaptation current $w$ builds up during activity (reducing excitability) and the resource pool $P$ depletes to ~70% but never falls below $P_{min}$ = 30%. Full recovery takes ~3 minutes.

![Adaptation current and resource pool — activity-dependent fatigue with slow recovery](model/plots/08_adaptation_fatigue.png)

### 6.4 Optic Fiber Spatial Selectivity

UV fiber positioned at the center of the 20×20mm plate (σ=2mm). Left: node positions colored by proximity (purple=near, teal=medium, blue=far), sized by spike count. Right: spike count vs. distance from fiber — matches the expected Gaussian falloff.

![Optic fiber spatial selectivity — localized response follows Gaussian falloff](model/plots/09_fiber_spatial_response.png)

| Distance from fiber | Spikes | Comment |
|---------------------|--------|---------|
| 0–2 mm (1σ) | 5–6 | Maximum response |
| 2–4 mm (2σ) | 3–5 | Moderate response |
| 4–6 mm (3σ) | 0–1 | Minimal response |
| >6 mm | 0–1 | Spontaneous only |

### 6.5 Network Topology

50-node random geometric graph (connection radius 5mm). Colormap shows accumulated spike activity (cool = few spikes, warm = many spikes). Central region shows higher activity due to UV fiber stimulation in the spatial selectivity test.

![Network topology — 50 nodes, random geometric graph, colored by spike activity](model/plots/10_network_topology.png)

---

## 7. Implementation Files

| Module | Lines | Key Classes/Functions |
|--------|-------|----------------------|
| `network_model.py` | ~300 | `NetworkParams`, `NodeState`, `NetworkModel` |
| `photoreceptor.py` | ~98 | `PhotoreceptorParams`, `PhotoreceptorState` |
| `adaptation.py` | ~74 | `AdaptationParams`, `AdaptationState` |
| `stimulation.py` | ~180 | `Stimulus`, `StimulationManager` |
| `music_mapper.py` | ~195 | `MusicMapper`, `spike_to_web_audio_params` |
| `server.py` | ~200 | `SimulationServer` (WebSocket at port 8765) |

---

## 8. References

1. Mishra et al. 2024, *Sci. Robot.* 9, eadk8019 — seed paper
2. Olsson S, Hansson B. 1995, *Naturwissenschaften* — propagation speed 0.5 mm/s
3. Yu Z, Fischer R. 2019, *Nat Rev Microbiol* — light sensing in fungi
4. Adamatzky A. 2022 — language of fungi from spiking patterns
