"""
EXP_001 — Generate clean trace figure from ADC-24 long recording.
Applies multi-pass spike rejection (rolling-median + σ-clipping).
Outputs: trace_clean.png (full view) and trace_signal_onset.png (zoomed on signal onset).
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# ── Data ──────────────────────────────────────────────────────────────
session = "session_20260219_184841(2)test.csv"
df = pd.read_csv(session)
df = df.iloc[1:]  # Remove first sample
df["time_h"] = df["timestamp_s"] / 3600

# ── Spike filter params ──────────────────────────────────────────────
SPIKE_STD = 2
ROLLING_WINDOW = 51
N_PASSES = 2

def filter_spikes(df_in):
    df_f = df_in.copy()
    total = 0
    for _ in range(N_PASSES):
        med = df_f["voltage_uv"].rolling(ROLLING_WINDOW, center=True, min_periods=1).median()
        dev = (df_f["voltage_uv"] - med).abs()
        thresh = dev.median() + SPIKE_STD * dev.std()
        mask = dev < thresh
        total += (~mask).sum()
        df_f = df_f[mask]
    print(f"  Spike filter: removed {total} points over {N_PASSES} passes")
    return df_f

# ── Figure 1: Full recording (cleaned) ──────────────────────────────
print("Generating full trace...")
df_clean = filter_spikes(df)

fig, ax = plt.subplots(figsize=(16, 5), facecolor="#1a1a2e")
ax.set_facecolor("#1a1a2e")
ax.plot(df_clean["time_h"], df_clean["voltage_uv"], color="#10b981", linewidth=0.3)
ax.set_xlabel("Time (hours)", color="#a1a1aa")
ax.set_ylabel("Voltage (µV)", color="#a1a1aa")
ax.set_title("EXP_001 — Full ADC-24 Recording (spike-filtered)", color="#e4e4e7", fontsize=14)
ax.tick_params(colors="#71717a")
ax.spines[:].set_color("#3f3f46")
plt.tight_layout()
plt.savefig("trace_clean.png", dpi=150, facecolor="#1a1a2e")
plt.close()
print("  → Saved trace_clean.png")

# ── Figure 2: Signal onset region ────────────────────────────────────
print("Generating signal onset zoom...")
df_onset = df_clean[(df_clean["time_h"] >= 320) & (df_clean["time_h"] <= 430)]

fig, ax = plt.subplots(figsize=(16, 5), facecolor="#1a1a2e")
ax.set_facecolor("#1a1a2e")
ax.plot(df_onset["time_h"], df_onset["voltage_uv"], color="#10b981", linewidth=0.5)
ax.set_xlabel("Time (hours)", color="#a1a1aa")
ax.set_ylabel("Voltage (µV)", color="#a1a1aa")
ax.set_title("EXP_001 — Signal Onset: Mycelium Reaching Electrodes", color="#e4e4e7", fontsize=14)
ax.tick_params(colors="#71717a")
ax.spines[:].set_color("#3f3f46")
plt.tight_layout()
plt.savefig("trace_signal_onset.png", dpi=150, facecolor="#1a1a2e")
plt.close()
print("  → Saved trace_signal_onset.png")

print("Done.")
