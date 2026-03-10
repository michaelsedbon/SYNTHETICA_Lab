"""
EXP_010 — Step 2: Stimulus-Response Analysis
=============================================
Epoch the data around each stimulus, compute mean response curves,
and statistically compare pre vs during vs post-stimulus voltage.

Usage:
    python 02_stimulus_response.py <path_to_experiment_dir>

Example:
    python 02_stimulus_response.py ../data/experiment_20260310_154233_demo
"""

import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats as scipy_stats

# ─── Configuration ────────────────────────────────────────────────────
PRE_WINDOW_S = 1.0    # seconds before onset to include
POST_WINDOW_S = 1.0   # seconds after offset to include
FIGSIZE = (14, 8)
DPI = 150


def load_session(experiment_dir: Path) -> tuple[pd.DataFrame, dict]:
    """Load CSV and protocol JSON."""
    csv_files = list(experiment_dir.glob("session_*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No session CSV found in {experiment_dir}")
    df = pd.read_csv(csv_files[0])
    df.columns = df.columns.str.strip()
    protocol = {}
    proto_path = experiment_dir / "protocol.json"
    if proto_path.exists():
        with open(proto_path) as f:
            protocol = json.load(f)
    return df, protocol


def extract_stim_regions(df: pd.DataFrame) -> list[dict]:
    """Extract onset/offset pairs."""
    regions = []
    current = None
    for _, row in df.iterrows():
        event = str(row.get("stim_event", "")).strip()
        if event == "onset":
            current = {"start": row["timestamp_s"], "channel": int(row["stim_ch"]),
                        "pwm": int(row["stim_pwm"])}
        elif event == "offset" and current:
            current["end"] = row["timestamp_s"]
            regions.append(current)
            current = None
    return regions


def epoch_around_stimulus(df: pd.DataFrame, stim: dict,
                          pre_s: float, post_s: float) -> dict:
    """
    Extract three windows around a stimulus:
      - pre:    [onset - pre_s, onset)
      - during: [onset, offset]
      - post:   (offset, offset + post_s]
    Returns dict with 'pre', 'during', 'post' DataFrames.
    """
    onset = stim["start"]
    offset = stim["end"]

    pre = df[(df["timestamp_s"] >= onset - pre_s) & (df["timestamp_s"] < onset)].copy()
    during = df[(df["timestamp_s"] >= onset) & (df["timestamp_s"] <= offset)].copy()
    post = df[(df["timestamp_s"] > offset) & (df["timestamp_s"] <= offset + post_s)].copy()

    return {"pre": pre, "during": during, "post": post, "onset": onset, "offset": offset}


def compute_epoch_stats(epochs: list[dict]) -> pd.DataFrame:
    """Compute summary statistics for each epoch across all stimuli."""
    rows = []
    for i, ep in enumerate(epochs):
        for phase in ["pre", "during", "post"]:
            v = ep[phase]["voltage_uv"].values
            rows.append({
                "stimulus": i + 1,
                "phase": phase,
                "mean_uv": np.mean(v) if len(v) > 0 else np.nan,
                "std_uv": np.std(v) if len(v) > 0 else np.nan,
                "min_uv": np.min(v) if len(v) > 0 else np.nan,
                "max_uv": np.max(v) if len(v) > 0 else np.nan,
                "rms_uv": np.sqrt(np.mean(v**2)) if len(v) > 0 else np.nan,
                "n_samples": len(v),
            })
    return pd.DataFrame(rows)


def plot_epoch_overlay(epochs: list[dict], save_path: Path):
    """Overlay all stimulus-locked epochs on a single plot."""
    fig, axes = plt.subplots(1, 3, figsize=FIGSIZE, dpi=DPI, sharey=True)
    fig.patch.set_facecolor("#09090B")

    phase_labels = ["Pre-stimulus", "During stimulus", "Post-stimulus"]
    phase_colors = ["#71717A", "#3B82F6", "#22C55E"]
    phase_keys = ["pre", "during", "post"]

    for ax, phase, label, color in zip(axes, phase_keys, phase_labels, phase_colors):
        ax.set_facecolor("#09090B")
        ax.set_title(label, color=color, fontsize=12, fontweight="bold")

        for i, ep in enumerate(epochs):
            data = ep[phase]
            if len(data) == 0:
                continue
            # Time-lock: make onset = 0 for 'during', relative times otherwise
            if phase == "pre":
                t = data["timestamp_s"].values - ep["onset"]
            elif phase == "during":
                t = data["timestamp_s"].values - ep["onset"]
            else:
                t = data["timestamp_s"].values - ep["offset"]

            ax.plot(t, data["voltage_uv"].values, color=color, alpha=0.3,
                    linewidth=0.8, label=f"Stim {i+1}" if i == 0 else None)

        ax.set_xlabel("Time (s)", color="#A1A1AA", fontsize=10)
        ax.tick_params(colors="#71717A", labelsize=9)
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color("#3F3F46")
        ax.spines["left"].set_color("#3F3F46")
        ax.grid(True, color="#27272A", linewidth=0.5)
        ax.axhline(0, color="#3F3F46", linewidth=0.5, linestyle="--")

    axes[0].set_ylabel("Voltage (µV)", color="#A1A1AA", fontsize=10)

    fig.suptitle("EXP_010 — Stimulus-Locked Epochs (all trials overlaid)",
                 color="#E0E0E0", fontsize=13, fontweight="bold", y=1.02)
    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor="#09090B", bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def plot_mean_response(epochs: list[dict], sampling_rate: float, save_path: Path):
    """Plot mean ± SEM of the voltage response, time-locked to onset."""
    fig, ax = plt.subplots(figsize=(12, 5), dpi=DPI)
    fig.patch.set_facecolor("#09090B")
    ax.set_facecolor("#09090B")

    # Compute the max epoch length across all trials
    all_during = []
    stim_dur = 0
    for ep in epochs:
        d = ep["during"]
        if len(d) > 0:
            t_rel = d["timestamp_s"].values - ep["onset"]
            all_during.append(d["voltage_uv"].values)
            stim_dur = max(stim_dur, t_rel[-1])

    if not all_during:
        print("  ⚠ No stimulus data to plot mean response")
        return

    # Pad shorter epochs with NaN
    max_len = max(len(a) for a in all_during)
    padded = np.full((len(all_during), max_len), np.nan)
    for i, a in enumerate(all_during):
        padded[i, :len(a)] = a

    mean_v = np.nanmean(padded, axis=0)
    sem_v = np.nanstd(padded, axis=0) / np.sqrt(np.sum(~np.isnan(padded), axis=0))
    t = np.arange(max_len) / sampling_rate

    # Stimulus band
    ax.axvspan(0, stim_dur, color="#3B82F6", alpha=0.12, zorder=0, label="LED ON")

    # Mean ± SEM
    ax.plot(t, mean_v, color="#22C55E", linewidth=1.5, label="Mean voltage")
    ax.fill_between(t, mean_v - sem_v, mean_v + sem_v, color="#22C55E", alpha=0.2, label="± SEM")

    ax.set_xlabel("Time from onset (s)", color="#A1A1AA", fontsize=11)
    ax.set_ylabel("Voltage (µV)", color="#A1A1AA", fontsize=11)
    ax.set_title("EXP_010 — Mean Stimulus Response (onset-locked)",
                 color="#E0E0E0", fontsize=13, fontweight="bold", pad=15)
    ax.tick_params(colors="#71717A", labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("#3F3F46")
    ax.spines["left"].set_color("#3F3F46")
    ax.grid(True, color="#27272A", linewidth=0.5)
    ax.axhline(0, color="#3F3F46", linewidth=0.5, linestyle="--")
    ax.legend(framealpha=0.3, facecolor="#1E1E1E", edgecolor="#3F3F46",
              labelcolor="#CCCCCC", fontsize=9)

    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor="#09090B", bbox_inches="tight")
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

    # Paired t-test: pre vs during
    pre_means = epoch_stats[epoch_stats["phase"] == "pre"]["mean_uv"].values
    during_means = epoch_stats[epoch_stats["phase"] == "during"]["mean_uv"].values
    post_means = epoch_stats[epoch_stats["phase"] == "post"]["mean_uv"].values

    n = min(len(pre_means), len(during_means), len(post_means))
    if n >= 2:
        t_stat, p_val = scipy_stats.ttest_rel(pre_means[:n], during_means[:n])
        print(f"\n  Paired t-test (pre vs during):")
        print(f"    t = {t_stat:.3f}, p = {p_val:.4f}")
        sig = "YES ✓" if p_val < 0.05 else "NO ✗"
        print(f"    Significant (α=0.05): {sig}")

        t_stat2, p_val2 = scipy_stats.ttest_rel(during_means[:n], post_means[:n])
        print(f"\n  Paired t-test (during vs post):")
        print(f"    t = {t_stat2:.3f}, p = {p_val2:.4f}")
        sig2 = "YES ✓" if p_val2 < 0.05 else "NO ✗"
        print(f"    Significant (α=0.05): {sig2}")
    else:
        print("\n  ⚠ Not enough stimuli for statistical testing (need ≥ 2)")

    print("=" * 60 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python 02_stimulus_response.py <path_to_experiment_dir>")
        sys.exit(1)

    exp_dir = Path(sys.argv[1])
    df, protocol = load_session(exp_dir)
    stim_regions = extract_stim_regions(df)

    if not stim_regions:
        print("No stimulus events found in the data.")
        sys.exit(1)

    # Estimate sample rate
    dt = np.diff(df["timestamp_s"].values[:20])
    sampling_rate = 1.0 / np.median(dt)
    print(f"\nEstimated sampling rate: {sampling_rate:.1f} S/s")
    print(f"Found {len(stim_regions)} stimulus events")

    # Epoch the data
    epochs = [epoch_around_stimulus(df, s, PRE_WINDOW_S, POST_WINDOW_S)
              for s in stim_regions]

    # Compute stats
    epoch_stats = compute_epoch_stats(epochs)

    # Save stats CSV
    out_dir = exp_dir / "figures"
    out_dir.mkdir(exist_ok=True)
    stats_path = out_dir / "epoch_stats.csv"
    epoch_stats.to_csv(stats_path, index=False)
    print(f"  → Saved: {stats_path}")

    # Plots
    plot_epoch_overlay(epochs, out_dir / "02_epoch_overlay.png")
    plot_mean_response(epochs, sampling_rate, out_dir / "02_mean_response.png")

    # Statistics
    statistical_comparison(epoch_stats)


if __name__ == "__main__":
    main()
