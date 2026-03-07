"""
Generate visualization plots for the fungal spiking model.
Saves to experiments/EXP_006/model/plots/
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mycelium_spiking import MyceliumParams, simulate, analyze_spikes

PLOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plots')
os.makedirs(PLOT_DIR, exist_ok=True)

# Style
plt.rcParams.update({
    'figure.facecolor': '#1a1a2e',
    'axes.facecolor': '#16213e',
    'axes.edgecolor': '#e0e0e0',
    'axes.labelcolor': '#e0e0e0',
    'text.color': '#e0e0e0',
    'xtick.color': '#e0e0e0',
    'ytick.color': '#e0e0e0',
    'grid.color': '#2a2a4a',
    'grid.alpha': 0.5,
    'font.family': 'sans-serif',
    'font.size': 11,
})

params = MyceliumParams()

# ═══════════════════════════════════════════════════════════════
# PLOT 1: Spontaneous spiking (5 minutes)
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 1: Spontaneous spiking...")
r1 = simulate(300, params, dt=0.01, seed=42)

fig, ax = plt.subplots(figsize=(14, 4))
ax.plot(r1['t'], r1['v_uv'], color='#00d4ff', linewidth=0.5, alpha=0.9)
ax.axhline(y=135, color='#ff6b6b', linestyle='--', alpha=0.5, label='Mean V_native = 135 µV [M24 Fig.2H]')
ax.set_xlabel('Time (s)')
ax.set_ylabel('Voltage (µV)')
ax.set_title('Spontaneous Spiking — Pleurotus eryngii Model (5 min)', fontsize=13, fontweight='bold')
ax.legend(loc='upper right', fontsize=9)
ax.grid(True, alpha=0.3)
ax.set_xlim(0, 300)
fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '01_spontaneous_spiking.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════
# PLOT 2: Blue light stimulation
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 2: Blue light response...")
r2 = simulate(120, params, dt=0.01, seed=42,
              light_schedule=[(60, 2, 'blue')])

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 6), height_ratios=[3, 1],
                                sharex=True)

ax1.plot(r2['t'], r2['v_uv'], color='#00d4ff', linewidth=0.6)
ax1.axvspan(60, 62, alpha=0.3, color='#4169E1', label='Blue light (2 s)')
ax1.set_ylabel('Voltage (µV)')
ax1.set_title('Blue Light Stimulation — V_light = 83 ± 11 µV [M24 p.5]',
              fontsize=13, fontweight='bold')
ax1.legend(loc='upper right', fontsize=9)
ax1.grid(True, alpha=0.3)

ax2.fill_between(r2['t'], 0, r2['I_ext'], color='#4169E1', alpha=0.6)
ax2.set_ylabel('I_light')
ax2.set_xlabel('Time (s)')
ax2.set_xlim(0, 120)
ax2.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '02_blue_light.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════
# PLOT 3: UV intensity sweep
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 3: UV intensity sweep...")
intensities = [0.0, 0.1, 0.5, 1.0]
colors = ['#00d4ff', '#ffd700', '#ff8c00', '#ff4444']
labels = ['No UV', '0.1 W/cm²', '0.5 W/cm²', '1.0 W/cm²']

fig, axes = plt.subplots(4, 1, figsize=(14, 10), sharex=True)
fig.suptitle('UV Intensity Sweep — Amplitude scales linearly [M24 p.5, fig. S16C]',
             fontsize=14, fontweight='bold')

for i, (intensity, color, label) in enumerate(zip(intensities, colors, labels)):
    sched = [(60, 2, 'uv', intensity, 12.0)] if intensity > 0 else None
    r = simulate(120, params, dt=0.01, seed=42, light_schedule=sched)
    s = analyze_spikes(r, params)

    axes[i].plot(r['t'], r['v_uv'], color=color, linewidth=0.6)
    if intensity > 0:
        axes[i].axvspan(60, 62, alpha=0.2, color='#9b59b6', label='UV pulse')
    axes[i].set_ylabel('µV')
    axes[i].set_title('{} — max={:.0f} µV, peaks={}'.format(
        label, s['max_amplitude_uv'], s['n_peaks']), fontsize=10, loc='left')
    axes[i].grid(True, alpha=0.3)
    axes[i].set_xlim(0, 120)

axes[-1].set_xlabel('Time (s)')
fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '03_uv_intensity_sweep.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════
# PLOT 4: Robot control protocol
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 4: Robot control protocol...")
sched_robot = [(t, 1, 'uv', 0.1, 12.0) for t in range(100, 300, 20)]
r4 = simulate(360, params, dt=0.01, seed=42, light_schedule=sched_robot)
s4 = analyze_spikes(r4, params)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 6), height_ratios=[3, 1],
                                sharex=True)

ax1.plot(r4['t'], r4['v_uv'], color='#00d4ff', linewidth=0.5)
for t_on in range(100, 300, 20):
    ax1.axvspan(t_on, t_on + 1, alpha=0.15, color='#9b59b6')
ax1.set_ylabel('Voltage (µV)')
ax1.set_title('Robot Protocol — 1 s UV every 20 s [M24 p.7] — freq={:.3f} Hz, mean_amp={:.0f} µV'.format(
    s4['mean_frequency_hz'], s4['mean_amplitude_uv']),
    fontsize=13, fontweight='bold')
ax1.grid(True, alpha=0.3)

ax2.fill_between(r4['t'], 0, r4['I_ext'], color='#9b59b6', alpha=0.6)
ax2.set_ylabel('I_UV')
ax2.set_xlabel('Time (s)')
ax2.set_xlim(0, 360)
ax2.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '04_robot_protocol.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════
# PLOT 5: Amplitude distribution (compare to Fig. 2F)
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 5: Amplitude distribution...")
r_long = simulate(1800, params, dt=0.01, seed=42)  # 30 min
s_long = analyze_spikes(r_long, params)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
fig.suptitle('Spike Statistics (30 min simulation)', fontsize=14, fontweight='bold')

# Amplitude histogram
if len(r_long['spike_amps']) > 0:
    ax1.hist(r_long['spike_amps'], bins=25, color='#00d4ff', alpha=0.7, edgecolor='#16213e')
    ax1.axvline(x=np.mean(r_long['spike_amps']), color='#ff6b6b', linestyle='--',
                label='Mean={:.0f} µV\n(target: µ=126.5 µV [M24 Fig.2F])'.format(
                    np.mean(r_long['spike_amps'])))
    ax1.set_xlabel('Amplitude (µV)')
    ax1.set_ylabel('Count')
    ax1.set_title('Peak Amplitude Distribution')
    ax1.legend(fontsize=9)
    ax1.grid(True, alpha=0.3)

# Width histogram
if len(r_long['spike_widths']) > 0:
    ax2.hist(r_long['spike_widths'], bins=25, color='#ffd700', alpha=0.7, edgecolor='#16213e')
    ax2.axvline(x=np.mean(r_long['spike_widths']), color='#ff6b6b', linestyle='--',
                label='Mean={:.2f} s\n(target: µ=1.106 s [M24 Fig.2G])'.format(
                    np.mean(r_long['spike_widths'])))
    ax2.set_xlabel('Width (s)')
    ax2.set_ylabel('Count')
    ax2.set_title('Peak Width Distribution')
    ax2.legend(fontsize=9)
    ax2.grid(True, alpha=0.3)

fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '05_distributions.png'), dpi=150)
plt.close()

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 50)
print("All plots saved to: {}".format(PLOT_DIR))
print("\n30-min simulation summary:")
print("  Spikes: {}".format(len(r_long['spike_amps'])))
print("  Frequency: {:.3f} Hz (target: 0.12 Hz)".format(s_long['mean_frequency_hz']))
print("  Mean amplitude: {:.1f} µV (target: 126.5 µV)".format(np.mean(r_long['spike_amps'])))
print("  Std amplitude: {:.1f} µV (target: 70.4 µV)".format(np.std(r_long['spike_amps'])))
print("  Mean width: {:.2f} s (target: 1.106 s)".format(np.mean(r_long['spike_widths'])))
print("=" * 50)
