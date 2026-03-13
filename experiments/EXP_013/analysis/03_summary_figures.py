"""
EXP_013 — Step 3: Summary Figures
===================================
4-panel summary figure: trace, mean response, RMS box plot, PSD.

Usage:
    python 03_summary_figures.py <path_to_data_dir>
"""

import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import signal as sp_signal

sys.path.insert(0, str(Path(__file__).parent))
from load_utils import load_session, extract_stim_regions, style_axis, estimate_fs, BG_COLOR


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
    all_v, stim_dur = [], 0
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
        pre = df[(df["timestamp_s"] >= r["start"] - 2) & (df["timestamp_s"] < r["start"])]["voltage_uv"]
        dur = df[(df["timestamp_s"] >= r["start"]) & (df["timestamp_s"] <= r["end"])]["voltage_uv"]
        pst = df[(df["timestamp_s"] > r["end"]) & (df["timestamp_s"] <= r["end"] + 2)]["voltage_uv"]
        if len(pre) > 0: pre_rms.append(np.sqrt(np.mean(pre.values**2)))
        if len(dur) > 0: dur_rms.append(np.sqrt(np.mean(dur.values**2)))
        if len(pst) > 0: post_rms.append(np.sqrt(np.mean(pst.values**2)))

    bp = ax.boxplot([pre_rms, dur_rms, post_rms], labels=["Pre", "During", "Post"],
                    patch_artist=True, widths=0.6,
                    boxprops=dict(linewidth=0.8),
                    whiskerprops=dict(color="#71717A"),
                    capprops=dict(color="#71717A"),
                    medianprops=dict(color="#E0E0E0", linewidth=1.5),
                    flierprops=dict(marker="o", markersize=3, markerfacecolor="#71717A"))
    for patch, color in zip(bp["boxes"], ["#71717A", "#3B82F6", "#22C55E"]):
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
        print("Usage: python 03_summary_figures.py <path_to_data_dir>")
        sys.exit(1)

    data_dir = Path(sys.argv[1])
    df, protocol = load_session(data_dir)
    stim_regions = extract_stim_regions(df)
    fs = estimate_fs(df)

    fig, axes = plt.subplots(2, 2, figsize=(16, 10), dpi=150)
    fig.patch.set_facecolor(BG_COLOR)
    for ax in axes.flat:
        style_axis(ax)

    panel_trace(axes[0, 0], df, stim_regions)
    panel_mean_response(axes[0, 1], df, stim_regions, fs)
    panel_boxplot(axes[1, 0], df, stim_regions)
    panel_psd(axes[1, 1], df, fs)

    proto_name = protocol.get("name", "Protocol")
    fig.suptitle(f"EXP_013 — {proto_name} — Analysis Summary",
                 color="#E0E0E0", fontsize=14, fontweight="bold", y=1.01)

    plt.tight_layout()
    out_dir = data_dir / "figures"
    out_dir.mkdir(exist_ok=True)
    save_path = out_dir / "03_summary_panel.png"
    fig.savefig(save_path, dpi=150, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")
    print("\nDone!\n")


if __name__ == "__main__":
    main()
