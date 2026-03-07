"""
Bio→Music mapping — convert spike features to MIDI parameters.

Maps mycelium network activity to musical parameters:
  - Spike frequency → rhythm / trigger rate
  - Amplitude → velocity / filter cutoff
  - Width → note duration
  - Node position → stereo pan / instrument assignment
  - UV amplification → crescendo / intensity
  - Network propagation → arpeggiation / note cascades

Output: MIDI-compatible dicts (can be sent to any DAW via python-rtmidi
or used internally for sonification).
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional


@dataclass
class MusicParams:
    """Mapping parameters from biological to musical space."""
    # Amplitude → MIDI velocity
    amp_min: float = 35.0         # µV — maps to velocity 20
    amp_max: float = 1868.0       # µV — maps to velocity 127
    velocity_min: int = 20
    velocity_max: int = 127

    # Width → note duration (s)
    width_min: float = 0.3        # s
    width_max: float = 5.0        # s
    duration_min: float = 0.1     # s (shortest note)
    duration_max: float = 2.0     # s (longest note)

    # Position → MIDI note (pitch)
    # Map arena Y position to pitch range
    pitch_low: int = 36           # C2
    pitch_high: int = 84          # C6

    # Position → stereo pan (0-127, 64=center)
    # Map arena X position to pan

    # Node → MIDI channel (instrument)
    n_instruments: int = 4        # Number of instrument groups
    # Spatial quadrants map to instruments:
    #   Top-left=0, Top-right=1, Bottom-left=2, Bottom-right=3

    # Scale/mode for quantizing pitches
    scale: str = 'minor_pentatonic'
    root_note: int = 60           # C4

    # Timing
    min_interval: float = 0.05    # Minimum time between notes (s)


# Musical scales (as semitone intervals from root)
SCALES = {
    'chromatic': list(range(12)),
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'minor_pentatonic': [0, 3, 5, 7, 10],
    'major_pentatonic': [0, 2, 4, 7, 9],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'whole_tone': [0, 2, 4, 6, 8, 10],
    'blues': [0, 3, 5, 6, 7, 10],
}


def quantize_to_scale(note: int, scale_name: str, root: int = 60) -> int:
    """Quantize a MIDI note to the nearest note in the given scale."""
    intervals = SCALES.get(scale_name, SCALES['chromatic'])
    # Build full set of valid notes in MIDI range
    valid_notes = set()
    for octave in range(-2, 9):
        for interval in intervals:
            n = root + octave * 12 + interval
            if 0 <= n <= 127:
                valid_notes.add(n)
    if not valid_notes:
        return note
    return min(valid_notes, key=lambda n: abs(n - note))


@dataclass
class MusicMapper:
    """
    Maps network spike events to MIDI note events.

    Usage:
        mapper = MusicMapper()
        notes = mapper.process_spikes(network_snapshot)
    """
    params: MusicParams = field(default_factory=MusicParams)
    last_note_time: Dict[int, float] = field(default_factory=dict)

    def process_spikes(self, snapshot: dict) -> List[dict]:
        """
        Convert network snapshot spike events to MIDI note events.

        Parameters
        ----------
        snapshot : dict from NetworkModel.step(), specifically 'new_spikes'

        Returns
        -------
        list of MIDI note dicts:
            {
                'type': 'note_on' | 'note_off',
                'channel': int (0-15),
                'note': int (0-127),
                'velocity': int (0-127),
                'duration': float (s),
                'pan': int (0-127),
                'node_id': int,
                'time': float,
            }
        """
        p = self.params
        notes = []

        for spike in snapshot.get('new_spikes', []):
            node_id = spike['node_id']
            t = spike['time']

            # Rate limiting — prevent note floods
            if node_id in self.last_note_time:
                if t - self.last_note_time[node_id] < p.min_interval:
                    continue

            # ── Amplitude → Velocity ──
            amp = spike['amplitude']
            vel_frac = np.clip((amp - p.amp_min) / (p.amp_max - p.amp_min), 0, 1)
            velocity = int(p.velocity_min + vel_frac * (p.velocity_max - p.velocity_min))

            # ── Width → Duration ──
            width = spike['width']
            dur_frac = np.clip((width - p.width_min) / (p.width_max - p.width_min), 0, 1)
            duration = p.duration_min + dur_frac * (p.duration_max - p.duration_min)

            # ── Position → Pitch ──
            # Y position maps to pitch (higher Y = higher pitch)
            arena_size = snapshot.get('arena_size', 20.0)
            y_frac = spike['y'] / arena_size
            raw_note = int(p.pitch_low + y_frac * (p.pitch_high - p.pitch_low))
            note = quantize_to_scale(raw_note, p.scale, p.root_note)

            # ── Position → Pan ──
            x_frac = spike['x'] / arena_size
            pan = int(x_frac * 127)

            # ── Position → Channel (instrument) ──
            qx = 0 if spike['x'] < arena_size / 2 else 1
            qy = 0 if spike['y'] < arena_size / 2 else 1
            channel = qy * 2 + qx  # 0-3, mapped to 4 quadrants

            notes.append({
                'type': 'note_on',
                'channel': channel,
                'note': note,
                'velocity': velocity,
                'duration': duration,
                'pan': pan,
                'node_id': node_id,
                'time': t,
                'amplitude_uv': round(amp, 1),
            })

            self.last_note_time[node_id] = t

        return notes

    def get_scale_notes(self) -> List[int]:
        """Return all valid MIDI notes in the current scale."""
        intervals = SCALES.get(self.params.scale, SCALES['chromatic'])
        notes = []
        for octave in range(-2, 9):
            for interval in intervals:
                n = self.params.root_note + octave * 12 + interval
                if self.params.pitch_low <= n <= self.params.pitch_high:
                    notes.append(n)
        return sorted(notes)


# ─── Web Audio synthesis helper ──────────────────────────────────────

def spike_to_web_audio_params(note_event: dict) -> dict:
    """
    Convert MIDI note event to Web Audio API parameters.
    Used by the P5.js frontend for browser-based sonification.
    """
    midi_note = note_event['note']
    freq = 440.0 * (2 ** ((midi_note - 69) / 12))

    # Velocity → gain (logarithmic mapping)
    vel = note_event['velocity']
    gain = (vel / 127) ** 2 * 0.3  # Peak gain 0.3 to avoid clipping

    return {
        'frequency': round(freq, 2),
        'gain': round(gain, 4),
        'duration': round(note_event['duration'], 3),
        'pan': (note_event['pan'] - 64) / 64,  # -1 to +1
        'channel': note_event['channel'],
        'type': 'sine' if note_event['channel'] < 2 else 'triangle',
    }
