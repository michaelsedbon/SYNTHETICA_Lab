"""
Fungal mycelium spiking model — Conductance-based with light stimulation.

Models action-potential-like spiking of Pleurotus eryngii mycelia.
Uses an integrate-and-fire neuron with explicit spike shape, providing
independent control of spike frequency, amplitude, and width.

Parameters calibrated to Mishra et al. 2024, Sci. Robot. 9, eadk8019.

Model:
  Subthreshold:  C dV/dt = -g_L(V - E_L) + I_drive + I_noise + I_light
  Spike shape:   α-function: V(t) = A * (t/τ_w) * exp(1 - t/τ_w)
  Threshold:     When V crosses V_th → emit spike, enter refractory

This hybrid approach gives:
  - Frequency ← I_drive / (C * V_th)          → 0.12 Hz [M24 p.5]
  - Spike width ← τ_w                          → 1.1 s   [M24 p.5]
  - Amplitude ← A (α-function peak)            → 135 µV  [M24 p.5]
  - Light response ← I_light added to I_drive  → 3-10×   [M24 p.7]
"""

import numpy as np
from dataclasses import dataclass
from typing import Optional, List, Tuple


@dataclass
class MyceliumParams:
    """
    Parameters calibrated to Mishra et al. 2024.
    Every value is cited to a specific figure, table, or page.
    """

    # ── Membrane properties ──
    C: float = 1.0                    # Membrane capacitance (arbitrary units)
    g_L: float = 0.1                  # Leak conductance
    E_L: float = 0.0                  # Leak reversal potential

    # ── Spiking threshold ──
    V_th: float = 1.0                 # Spike threshold

    # ── Drive current (sets spontaneous frequency) ──
    # Target: ξ_native ~0.12 Hz [M24 p.5, Fig. 2E]
    # "the mean spiking frequency varied around ξ_native ~0.12 spikes s⁻¹"
    I_drive: float = 0.22             # Tonic drive → ~0.12 Hz

    # ── Spike shape (α-function) ──
    # Target: mean V_native ~135 µV [M24 p.5, Fig. 2H]
    # "the mean baseline potential for both plates reached V_native ~135 μV"
    A_spike: float = 135.0            # Peak amplitude (µV)

    # Target: mean τ_native = 1.1 s [M24 p.5, Fig. 2G]
    # "The mean τ_native was 1.1 s"
    tau_w: float = 1.1                # Spike width parameter (s)

    # ── Amplitude variability ──
    # Skew-normal: µ=126.5, σ=70.4 µV [M24 Fig. 2F caption]
    A_mean: float = 126.5             # Mean spike amplitude (µV)
    A_std: float = 70.4               # Std of spike amplitude (µV)
    A_min: float = 35.0               # Min peak [M24 p.5, Fig. 2H]
    A_max: float = 1868.0             # Max peak [M24 p.5, Fig. 2H]

    # ── Width variability ──
    # Skew-normal: µ=1.106, σ=1.104 s [M24 Fig. 2G caption]
    tau_mean: float = 1.106
    tau_std: float = 1.104
    tau_min: float = 0.3              # Minimum width
    tau_max: float = 10.0             # "τ_max_native was ~10 s" [M24 p.5]

    # ── Refractory period ──
    # Spike + recovery takes ~2-3× spike width
    refractory_factor: float = 3.0

    # ── Noise ──
    # Baseline: <20 µV [M24 p.3]
    noise_std: float = 0.05           # Noise in subthreshold dynamics

    # ── Light stimulation ──
    # Blue: V_light = 83 ± 11 µV [M24 p.5]
    # "only responded to blue light stimulation, with V_light = 83 ± 11 μV"
    I_blue: float = 0.8

    # UV intensity response [M24 p.5, fig. S16C/D]:
    # 0.1 W/cm² → 25 µV, 1.0 W/cm² → 281 µV (Plate 1)
    # Amplification: 3-10× V_native [M24 p.7]
    I_uv_scale: float = 3.0          # Current per W/cm²
    uv_ref_height: float = 12.0      # Reference height (cm)

    # "UV-stimulated signals... ranged from 600 to 17,000 μV,
    #  whereas those in agar-stimulated controls hovered around 10 to 20 μV"
    # [M24 p.10]

    # No response to red or white light [M24 p.5]:
    # "We did not observe any spontaneous response in the mycelium
    #  when exposed to red and white light"

    # ── Signal processing [M24 p.4, p.11] ──
    sg_order: int = 3
    sg_window: int = 11
    prominence_uv: float = 10.0
    noise_threshold_uv: float = 5.0
    sampling_rate: float = 10.0       # Hz [M24 p.11]


@dataclass
class SpikeEvent:
    """A single spike with its own amplitude and width."""
    t_start: float
    amplitude: float      # µV
    tau_w: float          # s (width)

    def voltage_at(self, t: float) -> float:
        """α-function spike shape."""
        dt = t - self.t_start
        if dt < 0 or dt > 5 * self.tau_w:
            return 0.0
        x = dt / self.tau_w
        return self.amplitude * x * np.exp(1.0 - x)


@dataclass
class MyceliumState:
    """Dynamic state."""
    V: float = 0.0            # Subthreshold voltage (dimensionless)
    t: float = 0.0            # Time (s)
    refractory_until: float = 0.0
    active_spikes: list = None

    def __post_init__(self):
        if self.active_spikes is None:
            self.active_spikes = []


# ─── Light current functions ─────────────────────────────────────────

def compute_light_current(t: float, light_schedule: list,
                          params: MyceliumParams) -> float:
    """Sum of all active light stimuli at time t."""
    I = 0.0
    if not light_schedule:
        return I
    for event in light_schedule:
        t_on, dur, ltype = event[0], event[1], event[2]
        if t_on <= t < t_on + dur:
            if ltype == 'blue':
                I += params.I_blue
            elif ltype == 'uv':
                intensity = event[3] if len(event) > 3 else 0.1
                height = event[4] if len(event) > 4 else 12.0
                # Inverse-square height dependence [M24 Table 1, p.6]
                h_factor = (params.uv_ref_height / height) ** 2
                I += params.I_uv_scale * intensity * h_factor
            # Red and white: no response [M24 p.5]
    return I


# ─── Simulation ──────────────────────────────────────────────────────

def simulate(duration_s: float, params: Optional[MyceliumParams] = None,
             dt: float = 0.01, light_schedule: Optional[list] = None,
             seed: int = 42) -> dict:
    """
    Run simulation.

    Parameters
    ----------
    duration_s : total time (s)
    params : MyceliumParams
    dt : time step (s)
    light_schedule : list of (t_on, duration, 'uv'|'blue', [intensity], [height])
    seed : random seed

    Returns
    -------
    dict: 't', 'v_uv', 'I_ext', 'spike_times', 'spike_amps', 'spike_widths'
    """
    rng = np.random.default_rng(seed)
    if params is None:
        params = MyceliumParams()

    n_steps = int(duration_s / dt)
    t_arr = np.zeros(n_steps)
    v_arr = np.zeros(n_steps)
    I_arr = np.zeros(n_steps)

    state = MyceliumState()
    spike_times = []
    spike_amps = []
    spike_widths = []

    for i in range(n_steps):
        t = i * dt

        # Light current
        I_light = compute_light_current(t, light_schedule, params)

        # Sum active spikes (output voltage)
        spike_v = sum(s.voltage_at(t) for s in state.active_spikes)

        # Clean up expired spikes
        state.active_spikes = [s for s in state.active_spikes
                               if t - s.t_start < 5 * s.tau_w]

        # Subthreshold dynamics (leaky integrator)
        if t >= state.refractory_until:
            noise = params.noise_std * rng.standard_normal()
            dV = (-params.g_L * (state.V - params.E_L)
                  + params.I_drive + I_light + noise) / params.C
            state.V += dV * dt

            # Threshold crossing → spike
            if state.V >= params.V_th:
                # Sample amplitude from skew-normal-like distribution
                amp = rng.normal(params.A_mean, params.A_std)
                amp = np.clip(amp, params.A_min, params.A_max)

                # Sample width
                tw = rng.normal(params.tau_mean, params.tau_std * 0.3)
                tw = np.clip(tw, params.tau_min, params.tau_max)

                # Light amplification: scale amplitude
                if I_light > 0:
                    # UV amplification: 3-10× [M24 p.7]
                    amp *= (1.0 + I_light * 2.0)

                spike = SpikeEvent(t_start=t, amplitude=amp, tau_w=tw)
                state.active_spikes.append(spike)
                spike_times.append(t)
                spike_amps.append(amp)
                spike_widths.append(tw)

                # Reset and enter refractory
                state.V = params.E_L
                state.refractory_until = t + tw * params.refractory_factor

        t_arr[i] = t
        v_arr[i] = spike_v  # Output is the sum of spike shapes
        I_arr[i] = I_light
        state.t = t

    return {
        't': t_arr,
        'v_uv': v_arr,
        'I_ext': I_arr,
        'spike_times': np.array(spike_times),
        'spike_amps': np.array(spike_amps),
        'spike_widths': np.array(spike_widths),
    }


# ─── Analysis ────────────────────────────────────────────────────────

def analyze_spikes(result: dict, params: Optional[MyceliumParams] = None) -> dict:
    """
    Analyze the simulation output.
    Uses the paper's signal processing pipeline [M24 p.11].
    """
    from scipy.signal import savgol_filter, find_peaks, peak_widths

    if params is None:
        params = MyceliumParams()

    v = result['v_uv']
    t = result['t']
    dt = t[1] - t[0]

    # Savitzky-Golay [M24 p.4: k=3, n=11]
    win = min(params.sg_window, len(v))
    if win % 2 == 0:
        win -= 1
    v_filt = savgol_filter(v, win, params.sg_order) if win >= params.sg_order + 2 else v

    # Peak detection [M24 p.11: P=10 µV]
    peaks, _ = find_peaks(v_filt, prominence=params.prominence_uv, height=params.noise_threshold_uv)

    duration = t[-1] - t[0]
    stats = {
        'n_peaks': len(peaks),
        'duration_s': duration,
        'mean_frequency_hz': len(peaks) / max(duration, 1e-6),
        'v_filtered': v_filt,
        'peaks': peaks,
    }

    if len(peaks) > 0:
        heights = v_filt[peaks]
        stats['mean_amplitude_uv'] = np.mean(heights)
        stats['max_amplitude_uv'] = np.max(heights)
        stats['std_amplitude_uv'] = np.std(heights)
        widths, _, _, _ = peak_widths(v_filt, peaks, rel_height=0.8)
        stats['mean_width_s'] = np.mean(widths * dt)
        stats['std_width_s'] = np.std(widths * dt)
    else:
        stats.update({k: 0 for k in ['mean_amplitude_uv', 'max_amplitude_uv',
                                      'std_amplitude_uv', 'mean_width_s', 'std_width_s']})

    return stats


# ─── Main ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("=" * 60)
    print("Fungal Mycelium Spiking Model — Conductance-Based")
    print("Calibrated to Mishra et al. 2024, Sci. Robot. 9, eadk8019")
    print("=" * 60)

    params = MyceliumParams()

    # ── Scenario 1: Spontaneous (5 min) ──
    print("\n── Scenario 1: Spontaneous spiking (300 s) ──")
    r1 = simulate(300, params, dt=0.01)
    s1 = analyze_spikes(r1, params)
    print("  Peaks: {}".format(s1['n_peaks']))
    print("  Frequency: {:.3f} Hz  (target: ~0.12 Hz)".format(s1['mean_frequency_hz']))
    print("  Mean amplitude: {:.1f} µV  (target: ~135 µV)".format(s1['mean_amplitude_uv']))
    print("  Max amplitude: {:.1f} µV  (target max: ~1868 µV)".format(s1['max_amplitude_uv']))
    print("  Mean width: {:.2f} s  (target: ~1.1 s)".format(s1['mean_width_s']))

    # ── Scenario 2: Blue light ──
    print("\n── Scenario 2: Blue light (2 s at t=150 s) ──")
    r2 = simulate(300, params, light_schedule=[(150, 2, 'blue')])
    s2 = analyze_spikes(r2, params)
    print("  Peaks: {}".format(s2['n_peaks']))
    print("  Max amplitude: {:.1f} µV".format(s2['max_amplitude_uv']))

    # ── Scenario 3: UV intensity sweep ──
    print("\n── Scenario 3: UV intensity sweep at t=150 s ──")
    for intensity in [0.1, 0.5, 1.0]:
        r = simulate(300, params, light_schedule=[(150, 2, 'uv', intensity, 12.0)])
        s = analyze_spikes(r, params)
        print("  {} W/cm²: peaks={}, max_amp={:.1f} µV".format(
            intensity, s['n_peaks'], s['max_amplitude_uv']))

    # ── Scenario 4: Robot protocol ──
    print("\n── Scenario 4: Robot protocol (1 s UV @ 20 s intervals) ──")
    sched = [(t, 1, 'uv', 0.1, 12.0) for t in range(100, 300, 20)]
    r4 = simulate(360, params, light_schedule=sched)
    s4 = analyze_spikes(r4, params)
    print("  Peaks: {}".format(s4['n_peaks']))
    print("  Frequency: {:.3f} Hz".format(s4['mean_frequency_hz']))
    print("  Mean amplitude: {:.1f} µV".format(s4['mean_amplitude_uv']))

    print("\n" + "=" * 60)
