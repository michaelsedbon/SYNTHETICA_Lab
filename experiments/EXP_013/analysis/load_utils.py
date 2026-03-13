"""
EXP_013 — Shared Loading Utilities
====================================
Common functions used across all analysis scripts.
Import with: from load_utils import load_session, extract_stim_regions, ...
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

# ─── Style Constants ──────────────────────────────────────────────────
BG_COLOR = "#09090B"
STIM_COLOR = "#3B82F6"
STIM_ALPHA = 0.15
TRACE_COLOR = "#22C55E"
DPI = 150


def load_session(data_dir: Path) -> tuple[pd.DataFrame, dict]:
    """
    Load a session CSV and protocol JSON from a data directory.
    Returns (dataframe, protocol_dict).
    """
    csv_files = sorted(data_dir.glob("session_*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"No session CSV found in {data_dir}")

    df = pd.read_csv(csv_files[0])
    df.columns = df.columns.str.strip()

    # Try loading protocol from multiple locations
    protocol = {}
    for proto_path in [
        data_dir / "protocol.json",
        data_dir.parent.parent / "protocols" / f"{data_dir.name}.json",
    ]:
        if proto_path.exists():
            with open(proto_path) as f:
                protocol = json.load(f)
            break

    return df, protocol


def extract_stim_regions(df: pd.DataFrame) -> list[dict]:
    """Extract stimulus ON/OFF regions with metadata."""
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
            current_onset["duration_s"] = current_onset["end"] - current_onset["start"]
            regions.append(current_onset)
            current_onset = None

    return regions


def style_axis(ax):
    """Apply consistent dark-theme styling to a matplotlib axis."""
    ax.set_facecolor(BG_COLOR)
    ax.tick_params(colors="#71717A", labelsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["bottom"].set_color("#3F3F46")
    ax.spines["left"].set_color("#3F3F46")
    ax.grid(True, color="#27272A", linewidth=0.5)


def estimate_fs(df: pd.DataFrame) -> float:
    """Estimate sampling rate from timestamps."""
    dt = np.diff(df["timestamp_s"].values[:50])
    return 1.0 / np.median(dt)


def compute_rms(values: np.ndarray) -> float:
    """Compute RMS of a voltage array."""
    return float(np.sqrt(np.mean(values**2))) if len(values) > 0 else 0.0
