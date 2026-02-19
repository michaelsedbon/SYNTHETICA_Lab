from __future__ import annotations

"""
Signal processing for fungal electrophysiology data.

Implements the same processing pipeline as Mishra et al., Sci. Robot. 2024:
  - Savitzky-Golay filter (3rd order polynomial, window size 11)
  - Peak detection using scipy.signal.find_peaks with prominence threshold
  - Noise gate: signals < 5 µV are classified as noise
"""

import numpy as np
from dataclasses import dataclass
from scipy.signal import savgol_filter, find_peaks, peak_widths

# ---------------------------------------------------------------------------
# Paper parameters
# ---------------------------------------------------------------------------

SAVGOL_WINDOW = 11       # Window size (number of points)
SAVGOL_ORDER = 3         # Polynomial order
NOISE_FLOOR_UV = 5.0     # µV — signals below this are noise
PROMINENCE_UV = 10.0     # µV — minimum prominence for peak detection
PEAK_WIDTH_REL_HEIGHT = 0.8  # Width measured at 80% of peak height


@dataclass
class Peak:
    """A detected action potential peak."""
    index: int
    time: float          # seconds
    height_uv: float     # µV (above baseline)
    width_s: float       # seconds
    polarity: str        # "positive" or "negative"


@dataclass
class ProcessingResult:
    """Result of signal processing on a data window."""
    times: list[float]
    raw_uv: list[float]
    filtered_uv: list[float]
    peaks: list[Peak]
    mean_amplitude_uv: float
    spike_frequency_hz: float
    rms_noise_uv: float


def apply_savgol_filter(signal: np.ndarray) -> np.ndarray:
    """
    Apply Savitzky-Golay filter to smooth the signal.
    
    Uses 3rd-order polynomial with window size 11 as per the paper.
    """
    if len(signal) < SAVGOL_WINDOW:
        return signal.copy()
    return savgol_filter(signal, SAVGOL_WINDOW, SAVGOL_ORDER)


def detect_peaks(
    filtered_signal: np.ndarray,
    times: np.ndarray,
    prominence: float = PROMINENCE_UV,
) -> list[Peak]:
    """
    Detect action potential peaks (both positive and negative).
    
    Returns list of Peak objects with height, width, and polarity.
    """
    peaks_list = []

    # Detect positive peaks
    pos_indices, pos_props = find_peaks(
        filtered_signal,
        prominence=prominence,
        height=NOISE_FLOOR_UV,
    )

    if len(pos_indices) > 0:
        try:
            widths, _, _, _ = peak_widths(
                filtered_signal, pos_indices, rel_height=PEAK_WIDTH_REL_HEIGHT
            )
            # Convert width from samples to seconds
            if len(times) > 1:
                dt = np.mean(np.diff(times))
            else:
                dt = 0.1  # default 10 S/s
            width_seconds = widths * dt
        except Exception:
            width_seconds = np.zeros(len(pos_indices))

        for i, idx in enumerate(pos_indices):
            peaks_list.append(Peak(
                index=int(idx),
                time=float(times[idx]),
                height_uv=float(filtered_signal[idx]),
                width_s=float(width_seconds[i]) if i < len(width_seconds) else 0.0,
                polarity="positive",
            ))

    # Detect negative peaks (invert signal)
    neg_indices, neg_props = find_peaks(
        -filtered_signal,
        prominence=prominence,
        height=NOISE_FLOOR_UV,
    )

    if len(neg_indices) > 0:
        try:
            widths, _, _, _ = peak_widths(
                -filtered_signal, neg_indices, rel_height=PEAK_WIDTH_REL_HEIGHT
            )
            if len(times) > 1:
                dt = np.mean(np.diff(times))
            else:
                dt = 0.1
            width_seconds = widths * dt
        except Exception:
            width_seconds = np.zeros(len(neg_indices))

        for i, idx in enumerate(neg_indices):
            peaks_list.append(Peak(
                index=int(idx),
                time=float(times[idx]),
                height_uv=float(filtered_signal[idx]),
                width_s=float(width_seconds[i]) if i < len(width_seconds) else 0.0,
                polarity="negative",
            ))

    # Sort by time
    peaks_list.sort(key=lambda p: p.time)
    return peaks_list


def process_window(
    times: np.ndarray,
    raw_uv: np.ndarray,
) -> ProcessingResult:
    """
    Process a window of data: filter, detect peaks, compute statistics.
    
    Args:
        times: Array of timestamps (seconds)
        raw_uv: Array of raw voltage values (µV)
    
    Returns:
        ProcessingResult with filtered signal, peaks, and statistics
    """
    # Apply Savitzky-Golay filter
    filtered = apply_savgol_filter(raw_uv)

    # Noise gate — zero out values below noise floor
    filtered_gated = np.where(np.abs(filtered) < NOISE_FLOOR_UV, 0.0, filtered)

    # Detect peaks
    peaks = detect_peaks(filtered_gated, times)

    # Statistics
    above_noise = np.abs(raw_uv) > NOISE_FLOOR_UV
    if np.any(above_noise):
        mean_amplitude = float(np.mean(np.abs(raw_uv[above_noise])))
    else:
        mean_amplitude = 0.0

    duration = times[-1] - times[0] if len(times) > 1 else 1.0
    spike_freq = len(peaks) / duration if duration > 0 else 0.0

    rms_noise = float(np.sqrt(np.mean(raw_uv[~above_noise] ** 2))) if np.any(~above_noise) else 0.0

    return ProcessingResult(
        times=times.tolist(),
        raw_uv=raw_uv.tolist(),
        filtered_uv=filtered_gated.tolist(),
        peaks=peaks,
        mean_amplitude_uv=mean_amplitude,
        spike_frequency_hz=spike_freq,
        rms_noise_uv=rms_noise,
    )
