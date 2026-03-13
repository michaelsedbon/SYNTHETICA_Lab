"""
EXP_013 — Step 2: Stimulus-Response Analysis
=============================================
Epoch data around each stimulus, compute mean response curves,
and statistically compare pre/during/post-stimulus voltage.

Usage:
    python 02_stimulus_response.py <path_to_data_dir>
"""

import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats as scipy_stats

# Import shared utilities
sys.path.insert(0, str(Path(__file__).parent))
from load_utils import load_session, extract_stim_regions, style_axis, estimate_fs, BG_COLOR

# ─── Configuration ────────────────────────────────────────────────────
PRE_WINDOW_S = 2.0    # seconds before onset
POST_WINDOW_S = 2.0   # seconds after offset
FIGSIZE = (14, 8)
DPI = 150


def epoch_around_stimulus(df: pd.DataFrame, stim: dict,
                          pre_s: float, post_s: float) -> dict:
    """Extract pre/during/post windows around a stimulus."""
    onset = stim["start"]
    offset = stim["end"]

    pre = df[(df["timestamp_s"] >= onset - pre_s) & (df["timestamp_s"] < onset)].copy()
    during = df[(df["timestamp_s"] >= onset) & (df["timestamp_s"] <= offset)].copy()
    post = df[(df["timestamp_s"] > offset) & (df["timestamp_s"] <= offset + post_s)].copy()

    return {
        "pre": pre, "during": during, "post": post,
        "onset": onset, "offset": offset,
        "pwm": stim.get("pwm", 0), "duration_s": stim.get("duration_s", 0),
    }


def compute_epoch_stats(epochs: list[dict]) -> pd.DataFrame:
    """Compute summary statistics for each epoch across all stimuli."""
    rows = []
    for i, ep in enumerate(epochs):
        for phase in ["pre", "during", "post"]:
            v = ep[phase]["voltage_uv"].values
            rows.append({
                "stimulus": i + 1,
                "phase": phase,
                "pwm": ep["pwm"],
                "duration_s": ep["duration_s"],
                "mean_uv": np.mean(v) if len(v) > 0 else np.nan,
                "std_uv": np.std(v) if len(v) > 0 else np.nan,
                "min_uv": np.min(v) if len(v) > 0 else np.nan,
                "max_uv": np.max(v) if len(v) > 0 else np.nan,
                "rms_uv": np.sqrt(np.mean(v**2)) if len(v) > 0 else np.nan,
                "peak_to_peak_uv": (np.max(v) - np.min(v)) if len(v) > 0 else np.nan,
                "n_samples": len(v),
            })
    return pd.DataFrame(rows)


def plot_epoch_overlay(epochs: list[dict], save_path: Path):
    """Overlay all stimulus-locked epochs on a single plot."""
    fig, axes = plt.subplots(1, 3, figsize=FIGSIZE, dpi=DPI, sharey=True)
    fig.patch.set_facecolor(BG_COLOR)

    phase_labels = ["Pre-stimulus", "During stimulus", "Post-stimulus"]
    phase_colors = ["#71717A", "#3B82F6", "#22C55E"]
    phase_keys = ["pre", "during", "post"]

    for ax, phase, label, color in zip(axes, phase_keys, phase_labels, phase_colors):
        style_axis(ax)
        ax.set_title(label, color=color, fontsize=12, fontweight="bold")

        for i, ep in enumerate(epochs):
            data = ep[phase]
            if len(data) == 0:
                continue
            if phase == "post":
                t = data["timestamp_s"].values - ep["offset"]
            else:
                t = data["timestamp_s"].values - ep["onset"]

            ax.plot(t, data["voltage_uv"].values, color=color, alpha=0.3,
                    linewidth=0.8, label=f"Stim {i+1}" if i == 0 else None)

        ax.set_xlabel("Time (s)", color="#A1A1AA", fontsize=10)
        ax.axhline(0, color="#3F3F46", linewidth=0.5, linestyle="--")

    axes[0].set_ylabel("Voltage (µV)", color="#A1A1AA", fontsize=10)

    fig.suptitle("EXP_013 — Stimulus-Locked Epochs (all trials overlaid)",
                 color="#E0E0E0", fontsize=13, fontweight="bold", y=1.02)
    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def plot_mean_response(epochs: list[dict], fs: float, save_path: Path):
    """Plot mean ± SEM of the voltage response, time-locked to onset."""
    fig, ax = plt.subplots(figsize=(12, 5), dpi=DPI)
    fig.patch.set_facecolor(BG_COLOR)
    style_axis(ax)

    all_during = []
    stim_dur = 0
    for ep in epochs:
        d = ep["during"]
        if len(d) > 0:
            all_during.append(d["voltage_uv"].values)
            stim_dur = max(stim_dur, d["timestamp_s"].values[-1] - ep["onset"])

    if not all_during:
        print("  ⚠ No stimulus data to plot mean response")
        return

    max_len = max(len(a) for a in all_during)
    padded = np.full((len(all_during), max_len), np.nan)
    for i, a in enumerate(all_during):
        padded[i, :len(a)] = a

    mean_v = np.nanmean(padded, axis=0)
    sem_v = np.nanstd(padded, axis=0) / np.sqrt(np.sum(~np.isnan(padded), axis=0))
    t = np.arange(max_len) / fs

    ax.axvspan(0, stim_dur, color="#3B82F6", alpha=0.12, zorder=0, label="LED ON")
    ax.plot(t, mean_v, color="#22C55E", linewidth=1.5, label="Mean voltage")
    ax.fill_between(t, mean_v - sem_v, mean_v + sem_v, color="#22C55E", alpha=0.2, label="± SEM")

    ax.set_xlabel("Time from onset (s)", color="#A1A1AA", fontsize=11)
    ax.set_ylabel("Voltage (µV)", color="#A1A1AA", fontsize=11)
    ax.set_title("EXP_013 — Mean Stimulus Response (onset-locked)",
                 color="#E0E0E0", fontsize=13, fontweight="bold", pad=15)
    ax.axhline(0, color="#3F3F46", linewidth=0.5, linestyle="--")
    ax.legend(framealpha=0.3, facecolor="#1E1E1E", edgecolor="#3F3F46",
              labelcolor="#CCCCCC", fontsize=9)

    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor=BG_COLOR, bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def statistical_comparison(epoch_stats: pd.DataFrame):
    """Compare mean voltage across pre/during/post phases."""
    print("\n" + "=" * 60)
    print("  Statistical Comparison: Pre vs During vs Post")
    print("=" * 60)

    for phase in ["pre", "during", "post"]:
        subset = epoch_stats[epoch_stats["phase"] == phase]
        print(f"\n  {phase.upper()}:")
        print(f"    Mean ± SD:  {subset['mean_uv'].mean():.2f} ± {subset['mean_uv'].std():.2f} µV")
        print(f"    RMS:        {subset['rms_uv'].mean():.2f} µV")
        print(f"    N stimuli:  {len(subset)}")

    pre_means = epoch_stats[epoch_stats["phase"] == "pre"]["mean_uv"].values
    during_means = epoch_stats[epoch_stats["phase"] == "during"]["mean_uv"].values
    post_means = epoch_stats[epoch_stats["phase"] == "post"]["mean_uv"].values

    n = min(len(pre_means), len(during_means), len(post_means))
    if n >= 2:
        t_stat, p_val = scipy_stats.ttest_rel(pre_means[:n], during_means[:n])
        print(f"\n  Paired t-test (pre vs during):")
        print(f"    t = {t_stat:.3f}, p = {p_val:.4f}")
        print(f"    Significant (α=0.05): {'YES ✓' if p_val < 0.05 else 'NO ✗'}")

        t_stat2, p_val2 = scipy_stats.ttest_rel(during_means[:n], post_means[:n])
        print(f"\n  Paired t-test (during vs post):")
        print(f"    t = {t_stat2:.3f}, p = {p_val2:.4f}")
        print(f"    Significant (α=0.05): {'YES ✓' if p_val2 < 0.05 else 'NO ✗'}")
    else:
        print("\n  ⚠ Not enough stimuli for statistical testing (need ≥ 2)")

    print("=" * 60 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python 02_stimulus_response.py <path_to_data_dir>")
        sys.exit(1)

    data_dir = Path(sys.argv[1])
    df, protocol = load_session(data_dir)
    stim_regions = extract_stim_regions(df)

    if not stim_regions:
        print("No stimulus events found in the data.")
        sys.exit(1)

    fs = estimate_fs(df)
    print(f"\nEstimated sampling rate: {fs:.1f} S/s")
    print(f"Found {len(stim_regions)} stimulus events")

    # Epoch the data
    epochs = [epoch_around_stimulus(df, s, PRE_WINDOW_S, POST_WINDOW_S)
              for s in stim_regions]

    epoch_stats = compute_epoch_stats(epochs)

    out_dir = data_dir / "figures"
    out_dir.mkdir(exist_ok=True)
    epoch_stats.to_csv(out_dir / "epoch_stats.csv", index=False)
    print(f"  → Saved: {out_dir / 'epoch_stats.csv'}")

    plot_epoch_overlay(epochs, out_dir / "02_epoch_overlay.png")
    plot_mean_response(epochs, fs, out_dir / "02_mean_response.png")
    statistical_comparison(epoch_stats)


if __name__ == "__main__":
    main()
