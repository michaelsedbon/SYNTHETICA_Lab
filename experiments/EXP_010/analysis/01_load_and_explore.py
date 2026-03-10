"""
EXP_010 — Step 1: Load and Explore
===================================
Load a session CSV, parse stimulus events, and generate an overview plot.

Usage:
    python 01_load_and_explore.py <path_to_experiment_dir>

Example:
    python 01_load_and_explore.py ../data/experiment_20260310_154233_demo
"""

import sys
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# ─── Configuration ────────────────────────────────────────────────────
FIGSIZE = (14, 5)
DPI = 150
STIM_COLOR = "#3B82F6"  # blue-500
STIM_ALPHA = 0.15
TRACE_COLOR = "#22C55E"  # green-500


def load_session(experiment_dir: Path) -> tuple[pd.DataFrame, dict]:
    """Load CSV and protocol JSON from an experiment directory."""
    csv_files = list(experiment_dir.glob("session_*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No session CSV found in {experiment_dir}")

    df = pd.read_csv(csv_files[0])
    # Clean column names (strip whitespace from \r\n line endings)
    df.columns = df.columns.str.strip()

    protocol_path = experiment_dir / "protocol.json"
    protocol = {}
    if protocol_path.exists():
        with open(protocol_path) as f:
            protocol = json.load(f)

    return df, protocol


def extract_stim_regions(df: pd.DataFrame) -> list[dict]:
    """Extract stimulus ON/OFF regions from the stim columns."""
    regions = []
    current_onset = None

    for _, row in df.iterrows():
        event = str(row.get("stim_event", "")).strip()
        if event == "onset":
            current_onset = {
                "start": row["timestamp_s"],
                "channel": int(row["stim_ch"]),
                "pwm": int(row["stim_pwm"]),
            }
        elif event == "offset" and current_onset is not None:
            current_onset["end"] = row["timestamp_s"]
            regions.append(current_onset)
            current_onset = None

    return regions


def plot_overview(df: pd.DataFrame, stim_regions: list[dict], protocol: dict, save_path: Path):
    """Plot full-session voltage trace with stimulus bands."""
    fig, ax = plt.subplots(figsize=FIGSIZE, dpi=DPI)
    fig.patch.set_facecolor("#09090B")
    ax.set_facecolor("#09090B")

    # Voltage trace
    ax.plot(df["timestamp_s"], df["voltage_uv"], color=TRACE_COLOR,
            linewidth=0.8, alpha=0.9, label="Voltage (µV)")

    # Stimulus bands
    for region in stim_regions:
        ax.axvspan(region["start"], region["end"],
                   color=STIM_COLOR, alpha=STIM_ALPHA, zorder=0)

    # Styling
    ax.set_xlabel("Time (s)", color="#A1A1AA", fontsize=11)
    ax.set_ylabel("Voltage (µV)", color="#A1A1AA", fontsize=11)
    ax.tick_params(colors="#71717A", labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("#3F3F46")
    ax.spines["left"].set_color("#3F3F46")
    ax.grid(True, color="#27272A", linewidth=0.5)

    # Title
    proto_name = protocol.get("name", "Unknown Protocol")
    ax.set_title(f"EXP_010 — {proto_name} — Full Session Overview",
                 color="#E0E0E0", fontsize=13, fontweight="bold", pad=15)

    # Legend
    trace_patch = mpatches.Patch(color=TRACE_COLOR, label="Voltage trace")
    stim_patch = mpatches.Patch(color=STIM_COLOR, alpha=0.4, label="LED stimulus ON")
    ax.legend(handles=[trace_patch, stim_patch], loc="upper right",
              framealpha=0.3, facecolor="#1E1E1E", edgecolor="#3F3F46",
              labelcolor="#CCCCCC", fontsize=9)

    plt.tight_layout()
    fig.savefig(save_path, dpi=DPI, facecolor="#09090B", bbox_inches="tight")
    plt.close(fig)
    print(f"  → Saved: {save_path}")


def print_summary(df: pd.DataFrame, stim_regions: list[dict], protocol: dict):
    """Print basic session statistics."""
    duration = df["timestamp_s"].max() - df["timestamp_s"].min()
    sample_rate = len(df) / duration if duration > 0 else 0

    print("\n" + "=" * 60)
    print("  EXP_010 — Session Summary")
    print("=" * 60)
    print(f"  Protocol:       {protocol.get('name', 'N/A')}")
    print(f"  Reference:      {protocol.get('literature_reference', 'N/A')}")
    print(f"  Duration:       {duration:.1f} s")
    print(f"  Samples:        {len(df)}")
    print(f"  Sample rate:    {sample_rate:.1f} S/s")
    print(f"  Stimulus events:{len(stim_regions)} pulses")
    print()
    print(f"  Voltage range:  [{df['voltage_uv'].min():.1f}, {df['voltage_uv'].max():.1f}] µV")
    print(f"  Mean voltage:   {df['voltage_uv'].mean():.2f} µV")
    print(f"  Std voltage:    {df['voltage_uv'].std():.2f} µV")
    print()

    if stim_regions:
        pwm_val = stim_regions[0].get("pwm", "?")
        ch_val = stim_regions[0].get("channel", "?")
        durations = [r["end"] - r["start"] for r in stim_regions]
        print(f"  LED channel:    {ch_val}")
        print(f"  PWM intensity:  {pwm_val}")
        print(f"  Pulse duration: {np.mean(durations):.2f} ± {np.std(durations):.2f} s")

    print("=" * 60 + "\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python 01_load_and_explore.py <path_to_experiment_dir>")
        sys.exit(1)

    exp_dir = Path(sys.argv[1])
    if not exp_dir.exists():
        print(f"Error: directory not found: {exp_dir}")
        sys.exit(1)

    print(f"\nLoading data from: {exp_dir}")
    df, protocol = load_session(exp_dir)
    stim_regions = extract_stim_regions(df)

    print_summary(df, stim_regions, protocol)

    # Create output directory
    out_dir = exp_dir / "figures"
    out_dir.mkdir(exist_ok=True)

    plot_overview(df, stim_regions, protocol, out_dir / "01_overview.png")
    print("\nDone! Check the figures/ subdirectory.\n")


if __name__ == "__main__":
    main()
