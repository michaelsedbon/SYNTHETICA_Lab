"""
EXP_010 — Step 3: Summary Figures
===================================
Generate publication-quality multi-panel figure combining:
  - Full session trace with stimulus bands
  - Mean stimulus response with SEM
  - Box plot comparing pre/during/post RMS voltage
  - Power spectral density

Usage:
    python 03_summary_figures.py <path_to_experiment_dir>

Example:
    python 03_summary_figures.py ../data/experiment_20260310_154233_demo
"""

import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import signal as sp_signal

# ─── Shared utilities ─────────────────────────────────────────────────

def load_session(experiment_dir: Path) -> tuple[pd.DataFrame, dict]:
    csv_files = list(experiment_dir.glob("session_*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No session CSV in {experiment_dir}")
    df = pd.read_csv(csv_files[0])
    df.columns = df.columns.str.strip()
    protocol = {}
    p = experiment_dir / "protocol.json"
    if p.exists():
        with open(p) as f:
            protocol = json.load(f)
    return df, protocol


def extract_stim_regions(df: pd.DataFrame) -> list[dict]:
    regions, current = [], None
    for _, row in df.iterrows():
        ev = str(row.get("stim_event", "")).strip()
        if ev == "onset":
            current = {"start": row["timestamp_s"], "channel": int(row["stim_ch"]),
                        "pwm": int(row["stim_pwm"])}
        elif ev == "offset" and current:
            current["end"] = row["timestamp_s"]
            regions.append(current)
            current = None
    return regions


# ─── Panel Builders ───────────────────────────────────────────────────

def panel_trace(ax, df, stim_regions):
    """Full session trace with stimulus bands."""
    ax.plot(df["timestamp_s"], df["voltage_uv"], color="#22C55E", linewidth=0.6, alpha=0.85)
    for r in stim_regions:
        ax.axvspan(r["start"], r["end"], color="#3B82F6", alpha=0.13)
    ax.set_xlabel("Time (s)", fontsize=9, color="#A1A1AA")
    ax.set_ylabel("µV", fontsize=9, color="#A1A1AA")
    ax.set_title("A — Full Session Trace", fontsize=10, fontweight="bold", color="#E0E0E0")


def panel_mean_response(ax, df, stim_regions, fs):
    """Mean ± SEM onset-locked voltage."""
    all_v = []
    stim_dur = 0
    for r in stim_regions:
        mask = (df["timestamp_s"] >= r["start"]) & (df["timestamp_s"] <= r["end"])
        v = df.loc[mask, "voltage_uv"].values
        all_v.append(v)
        stim_dur = max(stim_dur, r["end"] - r["start"])

    if not all_v:
        return
    max_len = max(len(v) for v in all_v)
    padded = np.full((len(all_v), max_len), np.nan)
    for i, v in enumerate(all_v):
        padded[i, :len(v)] = v

    mean = np.nanmean(padded, axis=0)
    sem = np.nanstd(padded, axis=0) / np.sqrt(np.sum(~np.isnan(padded), axis=0))
    t = np.arange(max_len) / fs

    ax.axvspan(0, stim_dur, color="#3B82F6", alpha=0.12)
    ax.plot(t, mean, color="#22C55E", linewidth=1.2)
    ax.fill_between(t, mean - sem, mean + sem, color="#22C55E", alpha=0.2)
    ax.set_xlabel("Time from onset (s)", fontsize=9, color="#A1A1AA")
    ax.set_ylabel("µV", fontsize=9, color="#A1A1AA")
    ax.set_title("B — Mean Stimulus Response", fontsize=10, fontweight="bold", color="#E0E0E0")
    ax.axhline(0, color="#3F3F46", linewidth=0.5, linestyle="--")


def panel_boxplot(ax, df, stim_regions):
    """Box plot: RMS voltage in pre / during / post windows."""
    pre_rms, dur_rms, post_rms = [], [], []
    for r in stim_regions:
        pre = df[(df["timestamp_s"] >= r["start"] - 1) & (df["timestamp_s"] < r["start"])]["voltage_uv"]
        dur = df[(df["timestamp_s"] >= r["start"]) & (df["timestamp_s"] <= r["end"])]["voltage_uv"]
        pst = df[(df["timestamp_s"] > r["end"]) & (df["timestamp_s"] <= r["end"] + 1)]["voltage_uv"]
        if len(pre) > 0: pre_rms.append(np.sqrt(np.mean(pre.values**2)))
        if len(dur) > 0: dur_rms.append(np.sqrt(np.mean(dur.values**2)))
        if len(pst) > 0: post_rms.append(np.sqrt(np.mean(pst.values**2)))

    data = [pre_rms, dur_rms, post_rms]
    labels = ["Pre", "During", "Post"]
    colors = ["#71717A", "#3B82F6", "#22C55E"]

    bp = ax.boxplot(data, labels=labels, patch_artist=True, widths=0.6,
                    boxprops=dict(linewidth=0.8),
                    whiskerprops=dict(color="#71717A"),
                    capprops=dict(color="#71717A"),
                    medianprops=dict(color="#E0E0E0", linewidth=1.5),
                    flierprops=dict(marker="o", markersize=3, markerfacecolor="#71717A"))
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.5)

    ax.set_ylabel("RMS Voltage (µV)", fontsize=9, color="#A1A1AA")
    ax.set_title("C — Phase Comparison (RMS)", fontsize=10, fontweight="bold", color="#E0E0E0")


def panel_psd(ax, df, fs):
    """Power spectral density of the full voltage trace."""
    v = df["voltage_uv"].values
    if len(v) < 10:
        return
    nperseg = min(len(v), 256)
    freqs, psd = sp_signal.welch(v, fs=fs, nperseg=nperseg, noverlap=nperseg // 2)
    ax.semilogy(freqs, psd, color="#A78BFA", linewidth=0.8)
    ax.set_xlabel("Frequency (Hz)", fontsize=9, color="#A1A1AA")
    ax.set_ylabel("PSD (µV²/Hz)", fontsize=9, color="#A1A1AA")
    ax.set_title("D — Power Spectral Density", fontsize=10, fontweight="bold", color="#E0E0E0")
    ax.set_xlim(0, fs / 2)


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print("Usage: python 03_summary_figures.py <path_to_experiment_dir>")
        sys.exit(1)

    exp_dir = Path(sys.argv[1])
    df, protocol = load_session(exp_dir)
    stim_regions = extract_stim_regions(df)
    dt = np.diff(df["timestamp_s"].values[:20])
    fs = 1.0 / np.median(dt)

    # 4-panel figure
    fig, axes = plt.subplots(2, 2, figsize=(16, 10), dpi=150)
    fig.patch.set_facecolor("#09090B")

    for ax in axes.flat:
        ax.set_facecolor("#09090B")
        ax.tick_params(colors="#71717A", labelsize=8)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color("#3F3F46")
        ax.spines["left"].set_color("#3F3F46")
        ax.grid(True, color="#27272A", linewidth=0.5)

    panel_trace(axes[0, 0], df, stim_regions)
    panel_mean_response(axes[0, 1], df, stim_regions, fs)
    panel_boxplot(axes[1, 0], df, stim_regions)
    panel_psd(axes[1, 1], df, fs)

    proto_name = protocol.get("name", "Protocol")
    fig.suptitle(f"EXP_010 — {proto_name} — Analysis Summary",
                 color="#E0E0E0", fontsize=14, fontweight="bold", y=1.01)

    plt.tight_layout()
    out_dir = exp_dir / "figures"
    out_dir.mkdir(exist_ok=True)
    save_path = out_dir / "03_summary_panel.png"
    fig.savefig(save_path, dpi=150, facecolor="#09090B", bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")
    print("\nDone!\n")


if __name__ == "__main__":
    main()
