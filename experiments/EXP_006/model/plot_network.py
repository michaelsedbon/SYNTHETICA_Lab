"""
Generate validation plots for the network model extensions.
Saves to experiments/EXP_006/model/plots/
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

PLOT_DIR = os.path.join(os.path.dirname(__file__), 'plots')
os.makedirs(PLOT_DIR, exist_ok=True)

# Style
plt.rcParams.update({
    'figure.facecolor': '#0c0c10',
    'axes.facecolor': '#0c0c10',
    'axes.edgecolor': '#333',
    'axes.labelcolor': '#ccc',
    'text.color': '#ccc',
    'xtick.color': '#888',
    'ytick.color': '#888',
    'grid.color': '#222',
    'legend.facecolor': '#14141a',
    'legend.edgecolor': '#333',
    'font.family': 'sans-serif',
})

# ═══════════════════════════════════════════════════════════════
# PLOT 6: Photoreceptor WC-1 Kinetics
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 6: Photoreceptor WC-1 kinetics...")

from photoreceptor import PhotoreceptorParams, PhotoreceptorState

params_photo = PhotoreceptorParams()
dt = 0.01
t_total = 15.0
t = np.arange(0, t_total, dt)

# Simulate: 2s UV pulse at t=3s, then 2s blue at t=9s
receptor_uv = PhotoreceptorState()
receptor_blue = PhotoreceptorState()
R_uv = np.zeros_like(t)
R_blue = np.zeros_like(t)
I_uv = np.zeros_like(t)
I_blue = np.zeros_like(t)

for i, ti in enumerate(t):
    # UV pulse: t=3 to t=5
    if 3.0 <= ti < 5.0:
        I_light = 0.5
        I_uv[i] = I_light
        R_uv[i] = receptor_uv.step(I_light, 'uv', dt, params_photo)
    else:
        I_uv[i] = 0
        R_uv[i] = receptor_uv.step(0, 'uv', dt, params_photo)

    # Blue pulse: t=9 to t=11
    if 9.0 <= ti < 11.0:
        I_light = 0.5
        I_blue[i] = I_light
        R_blue[i] = receptor_blue.step(I_light, 'blue', dt, params_photo)
    else:
        I_blue[i] = 0
        R_blue[i] = receptor_blue.step(0, 'blue', dt, params_photo)

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 6), sharex=True, height_ratios=[1, 2])
fig.suptitle('WC-1 Photoreceptor Kinetics — Hill Function Activation',
             fontsize=14, fontweight='bold')

# Light pulses
ax1.fill_between(t, I_uv * 3, alpha=0.3, color='#c084fc', label='UV (0.5 W/cm², sensitivity=3×)')
ax1.fill_between(t, I_blue, alpha=0.3, color='#569cd6', label='Blue (0.5 W/cm², sensitivity=1×)')
ax1.set_ylabel('Light Intensity')
ax1.legend(loc='upper right', fontsize=9)
ax1.set_ylim(-0.1, 2.0)
ax1.grid(True, alpha=0.3)

# Receptor activation
ax2.plot(t, R_uv, color='#c084fc', linewidth=2, label='UV receptor activation')
ax2.plot(t, R_blue, color='#569cd6', linewidth=2, label='Blue receptor activation')
ax2.axhline(y=1.0, color='#e06060', linestyle='--', alpha=0.4, label='$R_{max}$ = 1.0')
ax2.set_xlabel('Time (s)')
ax2.set_ylabel('Receptor Activation R')
ax2.legend(loc='upper right', fontsize=9)
ax2.grid(True, alpha=0.3)
ax2.annotate('τ_act = 0.3s\n(fast on)', xy=(3.3, 0.5), fontsize=9, color='#c084fc')
ax2.annotate('τ_deact = 1.5s\n(slow off)', xy=(5.3, 0.4), fontsize=9, color='#c084fc')

fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '06_photoreceptor_kinetics.png'), dpi=150)
plt.close()
print("  ✓ 06_photoreceptor_kinetics.png")

# ═══════════════════════════════════════════════════════════════
# PLOT 7: Hill Function Dose-Response Curve
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 7: Hill function dose-response...")

intensities = np.linspace(0, 2.0, 200)
R_inf_uv = params_photo.max_activation * (
    (intensities * params_photo.sensitivity_uv)**params_photo.hill_n /
    (params_photo.hill_k**params_photo.hill_n + (intensities * params_photo.sensitivity_uv)**params_photo.hill_n + 1e-12)
)
R_inf_blue = params_photo.max_activation * (
    (intensities * params_photo.sensitivity_blue)**params_photo.hill_n /
    (params_photo.hill_k**params_photo.hill_n + (intensities * params_photo.sensitivity_blue)**params_photo.hill_n + 1e-12)
)

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(intensities, R_inf_uv, color='#c084fc', linewidth=2.5, label='UV (sensitivity=3×)')
ax.plot(intensities, R_inf_blue, color='#569cd6', linewidth=2.5, label='Blue (sensitivity=1×)')
ax.axhline(y=0.5, color='#888', linestyle=':', alpha=0.5, label='Half-activation')
ax.axvline(x=params_photo.hill_k/params_photo.sensitivity_uv, color='#c084fc', linestyle=':', alpha=0.3)
ax.axvline(x=params_photo.hill_k/params_photo.sensitivity_blue, color='#569cd6', linestyle=':', alpha=0.3)
ax.set_xlabel('Light Intensity (W/cm²)')
ax.set_ylabel('Steady-State Activation $R_\\infty$')
ax.set_title('WC-1 Dose–Response Curve (Hill function, n=2)',
             fontsize=13, fontweight='bold')
ax.legend(fontsize=10)
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '07_hill_dose_response.png'), dpi=150)
plt.close()
print("  ✓ 07_hill_dose_response.png")

# ═══════════════════════════════════════════════════════════════
# PLOT 8: Adaptation & Fatigue Over Time
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 8: Adaptation & fatigue dynamics...")

from adaptation import AdaptationParams, AdaptationState

params_adapt = AdaptationParams()
state_adapt = AdaptationState()
dt = 0.01
t_total = 120.0
t = np.arange(0, t_total, dt)
w_arr = np.zeros_like(t)
P_arr = np.zeros_like(t)

# Simulate with spikes every ~8s for first 60s, then silence
spike_interval = 8.0
next_spike = 2.0
for i, ti in enumerate(t):
    spiked = False
    if ti < 60 and ti >= next_spike:
        spiked = True
        next_spike = ti + spike_interval + np.random.uniform(-1, 1)
    w, P = state_adapt.step(dt, spiked=spiked, params=params_adapt)
    w_arr[i] = w
    P_arr[i] = P

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 6), sharex=True)
fig.suptitle('Spike-Frequency Adaptation & Resource Depletion',
             fontsize=14, fontweight='bold')

ax1.plot(t, w_arr, color='#e06060', linewidth=1.5)
ax1.axhline(y=params_adapt.max_adapt, color='#e06060', linestyle='--', alpha=0.4,
            label=f'$w_{{max}}$ = {params_adapt.max_adapt}')
ax1.axvspan(0, 60, alpha=0.05, color='white', label='Spiking period')
ax1.set_ylabel('Adaptation Current $w$')
ax1.legend(fontsize=9)
ax1.grid(True, alpha=0.3)

ax2.plot(t, P_arr * 100, color='#4ec9b0', linewidth=1.5)
ax2.axhline(y=params_adapt.P_min * 100, color='#fbbf24', linestyle='--', alpha=0.5,
            label=f'$P_{{min}}$ = {params_adapt.P_min*100:.0f}%')
ax2.axhline(y=100, color='#4ec9b0', linestyle='--', alpha=0.3,
            label='$P_{rest}$ = 100%')
ax2.axvspan(0, 60, alpha=0.05, color='white')
ax2.axvspan(60, 120, alpha=0.03, color='#4ec9b0', label='Recovery period')
ax2.set_xlabel('Time (s)')
ax2.set_ylabel('Resource Pool $P$ (%)')
ax2.set_ylim(20, 105)
ax2.legend(fontsize=9)
ax2.grid(True, alpha=0.3)

fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '08_adaptation_fatigue.png'), dpi=150)
plt.close()
print("  ✓ 08_adaptation_fatigue.png")

# ═══════════════════════════════════════════════════════════════
# PLOT 9: Network Spatial Response — Fiber vs Flood
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 9: Network spatial response (fiber vs flood)...")

from network_model import NetworkModel, NetworkParams

# Build network
net_params = NetworkParams(n_nodes=50)
model = NetworkModel(net_params)
model.build_network(seed=42)

# Run 20s spontaneous to establish baseline
dt = 0.05
for _ in range(int(20 / dt)):
    model.step(dt)

# Record baseline spike counts per node
baseline_spikes = {n.node_id: n.total_spikes for n in model.nodes}

# Run 20s with UV fiber at center
fiber = {'type': 'optic_fiber', 'wavelength': 'uv', 'intensity': 0.5,
         'x': net_params.arena_size/2, 'y': net_params.arena_size/2,
         'sigma': 2.0, 'active': True}
for _ in range(int(20 / dt)):
    model.step(dt, stimuli=[fiber])

# Count spikes during stimulation per node
stim_spikes = {n.node_id: n.total_spikes - baseline_spikes[n.node_id] for n in model.nodes}

# Plot: circle size = spike count, color by distance to fiber
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
fig.suptitle('Optic Fiber Spatial Selectivity — Spikes During 20s UV Stimulation',
             fontsize=14, fontweight='bold')

cx, cy = net_params.arena_size/2, net_params.arena_size/2

# Left: spatial map
for n in model.nodes:
    dist = np.sqrt((n.x - cx)**2 + (n.y - cy)**2)
    spikes = stim_spikes[n.node_id]
    size = 30 + spikes * 40
    alpha = min(0.3 + spikes * 0.2, 1.0)
    color = '#c084fc' if dist < 3.0 else '#4ec9b0' if dist < 6.0 else '#569cd6'
    ax1.scatter(n.x, n.y, s=size, c=color, alpha=alpha, edgecolors='#333', linewidth=0.5)

# Draw fiber zone
circle = plt.Circle((cx, cy), 2.0, fill=False, color='#c084fc', linestyle='--', linewidth=1.5, alpha=0.6)
ax1.add_patch(circle)
circle2 = plt.Circle((cx, cy), 4.0, fill=False, color='#c084fc', linestyle=':', linewidth=1, alpha=0.3)
ax1.add_patch(circle2)
ax1.set_xlabel('X position (mm)')
ax1.set_ylabel('Y position (mm)')
ax1.set_title('Node positions (size = spike count)')
ax1.set_xlim(-1, net_params.arena_size + 1)
ax1.set_ylim(-1, net_params.arena_size + 1)
ax1.set_aspect('equal')
ax1.grid(True, alpha=0.2)

# Right: distance vs spike count
distances = []
spike_counts = []
for n in model.nodes:
    dist = np.sqrt((n.x - cx)**2 + (n.y - cy)**2)
    distances.append(dist)
    spike_counts.append(stim_spikes[n.node_id])

ax2.scatter(distances, spike_counts, c='#c084fc', s=40, alpha=0.7, edgecolors='#333', linewidth=0.5)
ax2.set_xlabel('Distance from Fiber Tip (mm)')
ax2.set_ylabel('Spikes During Stimulation')
ax2.set_title('Localized UV Fiber — Gaussian Falloff')
ax2.axvline(x=2.0, color='#c084fc', linestyle='--', alpha=0.4, label='σ = 2.0 mm')

# Fit gaussian overlay
d_fit = np.linspace(0, max(distances), 100)
max_spikes = max(spike_counts) if spike_counts else 1
gaussian_fit = max_spikes * np.exp(-d_fit**2 / (2 * 2.0**2))
ax2.plot(d_fit, gaussian_fit, color='#e06060', linestyle='--', alpha=0.6,
         label='Expected Gaussian ($\\sigma$=2 mm)')
ax2.legend(fontsize=9)
ax2.grid(True, alpha=0.3)

fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '09_fiber_spatial_response.png'), dpi=150)
plt.close()
print("  ✓ 09_fiber_spatial_response.png")

# ═══════════════════════════════════════════════════════════════
# PLOT 10: Network Topology + Spontaneous Activity Heatmap
# ═══════════════════════════════════════════════════════════════
print("Generating Plot 10: Network topology...")

# Use same model (has 40s of history)
fig, ax = plt.subplots(figsize=(8, 8))
ax.set_title('Mycelium Network Topology — 50 Nodes, Random Geometric Graph',
             fontsize=13, fontweight='bold')

# Draw edges
for i in model.adjacency:
    for j in model.adjacency[i]:
        if j > i:
            ni, nj = model.nodes[i], model.nodes[j]
            ax.plot([ni.x, nj.x], [ni.y, nj.y], color='#333', linewidth=0.6, alpha=0.5)

# Draw nodes — color by total spikes
max_total = max(n.total_spikes for n in model.nodes)
for n in model.nodes:
    intensity = n.total_spikes / max(max_total, 1)
    color = plt.cm.cool(intensity)
    size = 40 + intensity * 80
    ax.scatter(n.x, n.y, s=size, c=[color], edgecolors='#555', linewidth=0.5, zorder=5)

sm = plt.cm.ScalarMappable(cmap=plt.cm.cool, norm=plt.Normalize(0, max_total))
cbar = plt.colorbar(sm, ax=ax, label='Total Spikes', shrink=0.7)
ax.set_xlabel('X (mm)')
ax.set_ylabel('Y (mm)')
ax.set_xlim(-1, net_params.arena_size + 1)
ax.set_ylim(-1, net_params.arena_size + 1)
ax.set_aspect('equal')
ax.grid(True, alpha=0.2)
fig.tight_layout()
fig.savefig(os.path.join(PLOT_DIR, '10_network_topology.png'), dpi=150)
plt.close()
print("  ✓ 10_network_topology.png")

# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 50)
print("All network model plots generated!")
print("=" * 50)
