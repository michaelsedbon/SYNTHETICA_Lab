"""
EXP_013 — Step 4: Faraday Cage Comparison
==========================================
Compare two validation runs (same protocol):
  - Run A: No Faraday cage (open shielding)
  - Run B: With Faraday cage (copper mesh enclosure)

Generates:
  - Side-by-side trace overlay
  - RMS noise comparison (baseline only)
  - PSD comparison
  - Stimulus-evoked response comparison
  - Summary statistics table

Usage:
    python 04_cage_comparison.py <no_cage_dir> <with_cage_dir>

Example:
    python 04_cage_comparison.py \
        ../data/EXP_013.1_validation_no_cage \
        ../data/EXP_013.1_validation_with_cage
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import signal as sp_signal, stats as scipy_stats

sys.path.insert(0, str(Path(__file__).parent))
from load_utils import (
    load_session, extract_stim_regions, style_axis, estimate_fs,
    compute_rms, BG_COLOR, DPI, STIM_COLOR, TRACE_COLOR,
)

# ─── Colors ───────────────────────────────────────────────────────────
COLOR_NO_CAGE = "#F97316"    # orange-500
COLOR_WITH_CAGE = "#22C55E"  # green-500
LABEL_NO_CAGE = "No Faraday Cage"
LABEL_WITH_CAGE = "With Faraday Cage"


def get_baseline_data(df: pd.DataFrame, stim_regions: list[dict]) -> pd.DataFrame:
    """Extract pre-stimulus baseline data (before first stimulus)."""
    if stim_regions:
        first_onset = stim_regions[0]["start"]
        return df[df["timestamp_s"] < first_onset].copy()
    else:
        # Use first 60 seconds as baseline
        return df[df["timestamp_s"] < df["timestamp_s"].min() + 60].copy()


def plot_trace_comparison(df_a: pd.DataFrame, df_b: pd.DataFrame,
                          stim_a: list, stim_b: list, save_path: Path):
    """Side-by-side full traces."""
    fig, axes = plt.subplots(2, 1, figsize=(16, 8), dpi=DPI, sharex=False)
    fig.patch.set_facecolor(BG_COLOR)

    for ax, df, stim, color, label in [
        (axes[0], df_a, stim_a, COLOR_NO_CAGE, LABEL_NO_CAGE),
        (axes[1], df_b, stim_b, COLOR_WITH_CAGE, LABEL_WITH_CAGE),
    ]:
        style_axis(ax)
        ax.plot(df["timestamp_s"], df["voltage_uv"], color=color,
                linewidth=0.6, alpha=0.85)
        for r in stim:
            ax.axvspan(r["start"], r["end"], color=STIM_COLOR, alpha=0.13)
        ax.set_ylabel("µV", fontsize=10, color="#A1A1AA")
        ax.set_title(f"A — {label}", fontsize=11, fontweight="bold", color=color)

    axes[1].set_xlabel("Time (s)", fontsize=10, color="#A1A1AA")

    fig.suptitle("EXP_013.1 — Faraday Cage Comparison: Full Traces",
                 color="#E0E0E0", fontsize=14, fontweight="bold", y=1.01)
    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def plot_noise_histogram(baseline_a: pd.DataFrame, baseline_b: pd.DataFrame, save_path: Path):
    """Histogram of baseline voltage distribution (noise)."""
    fig, ax = plt.subplots(figsize=(10, 5), dpi=DPI)
    fig.patch.set_facecolor(BG_COLOR)
    style_axis(ax)

    v_a = baseline_a["voltage_uv"].values
    v_b = baseline_b["voltage_uv"].values

    bins = np.linspace(
        min(v_a.min(), v_b.min()),
        max(v_a.max(), v_b.max()),
        80,
    )

    ax.hist(v_a, bins=bins, alpha=0.5, color=COLOR_NO_CAGE, label=f"{LABEL_NO_CAGE} (RMS={compute_rms(v_a):.2f} µV)", density=True)
    ax.hist(v_b, bins=bins, alpha=0.5, color=COLOR_WITH_CAGE, label=f"{LABEL_WITH_CAGE} (RMS={compute_rms(v_b):.2f} µV)", density=True)

    ax.set_xlabel("Voltage (µV)", fontsize=11, color="#A1A1AA")
    ax.set_ylabel("Density", fontsize=11, color="#A1A1AA")
    ax.set_title("Baseline Noise Distribution", color="#E0E0E0", fontsize=13, fontweight="bold", pad=15)
    ax.legend(framealpha=0.3, facecolor="#1E1E1E", edgecolor="#3F3F46",
              labelcolor="#CCCCCC", fontsize=10)

    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def plot_psd_comparison(baseline_a: pd.DataFrame, baseline_b: pd.DataFrame,
                        fs: float, save_path: Path):
    """Overlay PSD from both conditions."""
    fig, ax = plt.subplots(figsize=(10, 5), dpi=DPI)
    fig.patch.set_facecolor(BG_COLOR)
    style_axis(ax)

    for baseline, color, label in [
        (baseline_a, COLOR_NO_CAGE, LABEL_NO_CAGE),
        (baseline_b, COLOR_WITH_CAGE, LABEL_WITH_CAGE),
    ]:
        v = baseline["voltage_uv"].values
        nperseg = min(len(v), 256)
        freqs, psd = sp_signal.welch(v, fs=fs, nperseg=nperseg, noverlap=nperseg // 2)
        ax.semilogy(freqs, psd, color=color, linewidth=1.0, alpha=0.85, label=label)

    ax.set_xlabel("Frequency (Hz)", fontsize=11, color="#A1A1AA")
    ax.set_ylabel("PSD (µV²/Hz)", fontsize=11, color="#A1A1AA")
    ax.set_title("Power Spectral Density — Baseline Comparison",
                 color="#E0E0E0", fontsize=13, fontweight="bold", pad=15)
    ax.set_xlim(0, fs / 2)
    ax.legend(framealpha=0.3, facecolor="#1E1E1E", edgecolor="#3F3F46",
              labelcolor="#CCCCCC", fontsize=10)

    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def plot_evoked_comparison(df_a: pd.DataFrame, df_b: pd.DataFrame,
                           stim_a: list, stim_b: list,
                           fs: float, save_path: Path):
    """Compare mean evoked response between conditions."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5), dpi=DPI, sharey=True)
    fig.patch.set_facecolor(BG_COLOR)

    for ax, df, stims, color, label in [
        (axes[0], df_a, stim_a, COLOR_NO_CAGE, LABEL_NO_CAGE),
        (axes[1], df_b, stim_b, COLOR_WITH_CAGE, LABEL_WITH_CAGE),
    ]:
        style_axis(ax)
        all_v, stim_dur = [], 0
        for r in stims:
            mask = (df["timestamp_s"] >= r["start"]) & (df["timestamp_s"] <= r["end"])
            v = df.loc[mask, "voltage_uv"].values
            if len(v) > 0:
                all_v.append(v)
                stim_dur = max(stim_dur, r["end"] - r["start"])

        if all_v:
            max_len = max(len(v) for v in all_v)
            padded = np.full((len(all_v), max_len), np.nan)
            for i, v in enumerate(all_v):
                padded[i, :len(v)] = v

            mean = np.nanmean(padded, axis=0)
            sem = np.nanstd(padded, axis=0) / np.sqrt(np.sum(~np.isnan(padded), axis=0))
            t = np.arange(max_len) / fs

            ax.axvspan(0, stim_dur, color=STIM_COLOR, alpha=0.12)
            ax.plot(t, mean, color=color, linewidth=1.2)
            ax.fill_between(t, mean - sem, mean + sem, color=color, alpha=0.2)

        ax.set_xlabel("Time from onset (s)", fontsize=10, color="#A1A1AA")
        ax.set_title(label, fontsize=11, fontweight="bold", color=color)
        ax.axhline(0, color="#3F3F46", linewidth=0.5, linestyle="--")

    axes[0].set_ylabel("Voltage (µV)", fontsize=10, color="#A1A1AA")

    fig.suptitle("EXP_013.1 — Mean Evoked Response: Cage Comparison",
                 color="#E0E0E0", fontsize=14, fontweight="bold", y=1.02)
    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def print_comparison_stats(baseline_a, baseline_b, stim_a, stim_b, df_a, df_b):
    """Print side-by-side noise and evoked amplitude statistics."""
    v_a = baseline_a["voltage_uv"].values
    v_b = baseline_b["voltage_uv"].values

    print("\n" + "=" * 70)
    print("  FARADAY CAGE COMPARISON — EXP_013.1")
    print("=" * 70)
    print(f"\n  {'Metric':<35} {'No Cage':>14} {'With Cage':>14}")
    print("  " + "─" * 65)
    print(f"  {'Baseline RMS (µV)':<35} {compute_rms(v_a):>14.3f} {compute_rms(v_b):>14.3f}")
    print(f"  {'Baseline Std (µV)':<35} {np.std(v_a):>14.3f} {np.std(v_b):>14.3f}")
    print(f"  {'Baseline Peak-to-Peak (µV)':<35} {np.ptp(v_a):>14.3f} {np.ptp(v_b):>14.3f}")
    print(f"  {'Baseline Mean (µV)':<35} {np.mean(v_a):>14.3f} {np.mean(v_b):>14.3f}")
    print(f"  {'Samples':<35} {len(v_a):>14d} {len(v_b):>14d}")

    # Noise reduction factor
    rms_ratio = compute_rms(v_a) / compute_rms(v_b) if compute_rms(v_b) > 0 else float('inf')
    print(f"\n  Noise reduction factor:  {rms_ratio:.2f}× (cage reduces noise by {(1 - 1/rms_ratio)*100:.1f}%)")

    # Evoked amplitude comparison
    if stim_a and stim_b:
        def mean_evoked(df, stims):
            vals = []
            for r in stims:
                mask = (df["timestamp_s"] >= r["start"]) & (df["timestamp_s"] <= r["end"])
                v = df.loc[mask, "voltage_uv"].values
                if len(v) > 0:
                    vals.append(np.ptp(v))
            return np.mean(vals) if vals else 0

        evoked_a = mean_evoked(df_a, stim_a)
        evoked_b = mean_evoked(df_b, stim_b)
        print(f"\n  {'Mean evoked peak-to-peak (µV)':<35} {evoked_a:>14.3f} {evoked_b:>14.3f}")

        # SNR = evoked amplitude / baseline RR
        snr_a = evoked_a / compute_rms(v_a) if compute_rms(v_a) > 0 else 0
        snr_b = evoked_b / compute_rms(v_b) if compute_rms(v_b) > 0 else 0
        print(f"  {'SNR (evoked/baseline RMS)':<35} {snr_a:>14.2f} {snr_b:>14.2f}")

    # Welch's t-test on baseline distributions
    t_stat, p_val = scipy_stats.ttest_ind(v_a, v_b, equal_var=False)
    print(f"\n  Welch's t-test (baseline means):  t={t_stat:.3f}, p={p_val:.4f}")

    # Levene's test on baseline variances
    lev_stat, lev_p = scipy_stats.levene(v_a, v_b)
    print(f"  Levene's test (baseline var):     F={lev_stat:.3f}, p={lev_p:.4f}")

    print("=" * 70 + "\n")


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 3:
        print("Usage: python 04_cage_comparison.py <no_cage_dir> <with_cage_dir>")
        sys.exit(1)

    dir_a = Path(sys.argv[1])
    dir_b = Path(sys.argv[2])

    print(f"\nLoading Run A (no cage):   {dir_a}")
    df_a, proto_a = load_session(dir_a)
    stim_a = extract_stim_regions(df_a)

    print(f"Loading Run B (with cage): {dir_b}")
    df_b, proto_b = load_session(dir_b)
    stim_b = extract_stim_regions(df_b)

    fs = estimate_fs(df_a)
    print(f"Sampling rate: {fs:.1f} S/s")
    print(f"Run A: {len(df_a)} samples, {len(stim_a)} stimuli")
    print(f"Run B: {len(df_b)} samples, {len(stim_b)} stimuli")

    # Baseline = data before first stimulus
    baseline_a = get_baseline_data(df_a, stim_a)
    baseline_b = get_baseline_data(df_b, stim_b)

    # Output directory (in the parent data/ folder)
    out_dir = dir_a.parent / "cage_comparison"
    out_dir.mkdir(exist_ok=True)

    # Generate figures
    plot_trace_comparison(df_a, df_b, stim_a, stim_b, out_dir / "04_traces.png")
    plot_noise_histogram(baseline_a, baseline_b, out_dir / "04_noise_histogram.png")
    plot_psd_comparison(baseline_a, baseline_b, fs, out_dir / "04_psd_comparison.png")
    plot_evoked_comparison(df_a, df_b, stim_a, stim_b, fs, out_dir / "04_evoked_comparison.png")

    # Print stats
    print_comparison_stats(baseline_a, baseline_b, stim_a, stim_b, df_a, df_b)

    print(f"All figures saved to: {out_dir}\n")


if __name__ == "__main__":
    main()
