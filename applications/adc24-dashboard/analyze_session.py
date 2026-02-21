#!/usr/bin/env python3
"""
ADC-24 Session Analyzer — Interactive Plotly visualization of recorded CSV data.

Usage:
    python analyze_session.py                    # shows latest session
    python analyze_session.py session_20260219_184841.csv   # specific file
    python analyze_session.py --list             # list all sessions

The script auto-discovers CSV files in the local data/ directory.
"""

import argparse
import sys
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent / "data"
ADC_MAX_COUNT = 8_388_607  # 2^23 - 1


def list_sessions() -> list[Path]:
    """List all session CSV files sorted by modification time (newest first)."""
    files = sorted(DATA_DIR.glob("session_*.csv"), key=lambda f: f.stat().st_mtime, reverse=True)
    return files


def load_session(path: Path) -> pd.DataFrame:
    """Load a session CSV into a DataFrame."""
    df = pd.read_csv(path)
    # Convert timestamp to minutes for readability
    df["time_min"] = df["timestamp_s"] / 60.0
    return df


def create_figure(df: pd.DataFrame, title: str) -> go.Figure:
    """Create an interactive Plotly figure with voltage trace and stats."""

    fig = make_subplots(
        rows=2, cols=1,
        shared_xaxes=True,
        vertical_spacing=0.08,
        row_heights=[0.75, 0.25],
        subplot_titles=("Voltage (µV)", "Raw ADC counts"),
    )

    # --- Voltage trace ---
    fig.add_trace(
        go.Scattergl(
            x=df["time_min"],
            y=df["voltage_uv"],
            mode="lines",
            name="Voltage",
            line=dict(color="#10b981", width=1),
            hovertemplate="<b>%{y:.1f} µV</b><br>%{x:.2f} min<extra></extra>",
        ),
        row=1, col=1,
    )

    # --- Raw ADC trace ---
    fig.add_trace(
        go.Scattergl(
            x=df["time_min"],
            y=df["raw_adc"],
            mode="lines",
            name="Raw ADC",
            line=dict(color="#6366f1", width=1),
            hovertemplate="<b>%{y}</b> counts<br>%{x:.2f} min<extra></extra>",
        ),
        row=2, col=1,
    )

    # --- Stats annotation ---
    duration_s = df["timestamp_s"].iloc[-1] - df["timestamp_s"].iloc[0]
    duration_min = duration_s / 60
    n_samples = len(df)
    sample_rate = n_samples / duration_s if duration_s > 0 else 0
    mean_uv = df["voltage_uv"].mean()
    std_uv = df["voltage_uv"].std()
    min_uv = df["voltage_uv"].min()
    max_uv = df["voltage_uv"].max()

    stats_text = (
        f"Samples: {n_samples:,}  |  "
        f"Duration: {duration_min:.1f} min  |  "
        f"Rate: {sample_rate:.1f} S/s  |  "
        f"Mean: {mean_uv:.1f} µV  |  "
        f"SD: {std_uv:.1f} µV  |  "
        f"Range: [{min_uv:.1f}, {max_uv:.1f}] µV"
    )

    # --- Layout ---
    fig.update_layout(
        title=dict(text=title, font=dict(size=18)),
        template="plotly_dark",
        paper_bgcolor="#09090b",
        plot_bgcolor="#18181b",
        font=dict(family="Inter, sans-serif", color="#d4d4d8"),
        height=700,
        showlegend=False,
        hovermode="x unified",
        annotations=[
            dict(
                text=stats_text,
                xref="paper", yref="paper",
                x=0.5, y=-0.08,
                showarrow=False,
                font=dict(size=11, color="#a1a1aa"),
                xanchor="center",
            )
        ],
    )

    fig.update_xaxes(title_text="Time (min)", row=2, col=1, gridcolor="#27272a")
    fig.update_xaxes(gridcolor="#27272a", row=1, col=1)
    fig.update_yaxes(title_text="µV", row=1, col=1, gridcolor="#27272a")
    fig.update_yaxes(title_text="ADC counts", row=2, col=1, gridcolor="#27272a")

    return fig


def main():
    parser = argparse.ArgumentParser(description="Visualize ADC-24 recording sessions")
    parser.add_argument("file", nargs="?", help="CSV file name or path (default: latest)")
    parser.add_argument("--list", action="store_true", help="List all available sessions")
    args = parser.parse_args()

    if args.list:
        sessions = list_sessions()
        if not sessions:
            print(f"No sessions found in {DATA_DIR}")
            sys.exit(1)
        print(f"\n{'Session':<45} {'Size':>10} {'Samples':>10}")
        print("─" * 70)
        for f in sessions:
            size = f.stat().st_size
            # Quick line count without loading entire file
            with open(f) as fh:
                lines = sum(1 for _ in fh) - 1  # minus header
            size_str = f"{size / 1024:.1f} KB" if size < 1024 * 1024 else f"{size / 1024 / 1024:.1f} MB"
            print(f"  {f.name:<43} {size_str:>10} {lines:>10}")
        print()
        sys.exit(0)

    # Determine which file to load
    if args.file:
        path = Path(args.file)
        if not path.exists():
            # Try in data dir
            path = DATA_DIR / args.file
        if not path.exists():
            print(f"File not found: {args.file}")
            sys.exit(1)
    else:
        sessions = list_sessions()
        if not sessions:
            print(f"No sessions found in {DATA_DIR}")
            sys.exit(1)
        path = sessions[0]
        print(f"Loading latest session: {path.name}")

    # Load and plot
    df = load_session(path)
    title = f"⚡ ADC-24 Recording — {path.stem}"
    fig = create_figure(df, title)
    fig.show()


if __name__ == "__main__":
    main()
