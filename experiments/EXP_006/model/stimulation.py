"""
Stimulation module — unified interface for all stimulation modes.

Supports:
1. Flood light — all nodes receive equal light (current behavior)
2. Optic fiber — localized light with Gaussian spatial falloff
3. Electrical — current injection with spatial decay from electrode

Future expansion: multi-electrode arrays, patterned stimulation,
closed-loop stimulation based on spiking activity.
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Stimulus:
    """A single stimulation source."""
    stim_id: str                      # Unique identifier
    stim_type: str = 'flood_light'    # 'flood_light', 'optic_fiber', 'electrical'
    wavelength: str = 'uv'            # For light: 'blue', 'uv'
    intensity: float = 0.0            # W/cm² for light, µA for electrical
    x: float = 0.0                    # Position (mm) — for fiber/electrode
    y: float = 0.0                    # Position (mm)
    sigma: float = 2.0                # Spread (mm) — Gaussian sigma for fiber,
                                      #   decay length for electrode
    active: bool = False              # On/off
    # Electrical waveform
    waveform: str = 'monophasic'      # 'monophasic', 'biphasic', 'pulse_train'
    pulse_freq: float = 1.0           # Hz (for pulse trains)
    pulse_width: float = 0.5          # s (for pulse trains)
    phase: float = 0.0               # Current phase (internal)

    def to_dict(self) -> dict:
        """Convert to dict for network_model.step()."""
        return {
            'type': self.stim_type,
            'wavelength': self.wavelength,
            'intensity': self._current_intensity(),
            'x': self.x,
            'y': self.y,
            'sigma': self.sigma,
            'active': self.active,
        }

    def _current_intensity(self) -> float:
        """Apply waveform modulation for electrical stimulation."""
        if self.stim_type != 'electrical' or self.waveform == 'monophasic':
            return self.intensity
        elif self.waveform == 'biphasic':
            # Alternating polarity
            return self.intensity * np.sign(np.sin(2 * np.pi * self.pulse_freq * self.phase))
        elif self.waveform == 'pulse_train':
            # Square pulse train
            cycle = self.phase % (1.0 / self.pulse_freq) if self.pulse_freq > 0 else 0
            return self.intensity if cycle < self.pulse_width else 0.0
        return self.intensity

    def advance(self, dt: float):
        """Advance waveform phase."""
        self.phase += dt


@dataclass
class StimulationManager:
    """
    Manages multiple stimulation sources.

    Usage:
        mgr = StimulationManager()
        fiber = mgr.add_fiber('fiber1', x=10, y=10, wavelength='uv')
        mgr.activate('fiber1', intensity=0.5)
        stimuli = mgr.get_active_stimuli()
        # Pass stimuli to network_model.step()
    """
    stimuli: dict = field(default_factory=dict)  # stim_id -> Stimulus

    def add_flood(self, stim_id: str, wavelength: str = 'uv',
                  intensity: float = 0.0) -> Stimulus:
        """Add a flood light source (illuminates all nodes equally)."""
        s = Stimulus(
            stim_id=stim_id,
            stim_type='flood_light',
            wavelength=wavelength,
            intensity=intensity,
        )
        self.stimuli[stim_id] = s
        return s

    def add_fiber(self, stim_id: str, x: float, y: float,
                  wavelength: str = 'uv', sigma: float = 2.0,
                  intensity: float = 0.0) -> Stimulus:
        """Add an optic fiber source (localized, Gaussian falloff)."""
        s = Stimulus(
            stim_id=stim_id,
            stim_type='optic_fiber',
            wavelength=wavelength,
            intensity=intensity,
            x=x, y=y,
            sigma=sigma,
        )
        self.stimuli[stim_id] = s
        return s

    def add_electrode(self, stim_id: str, x: float, y: float,
                      intensity: float = 0.0, sigma: float = 3.0,
                      waveform: str = 'monophasic',
                      pulse_freq: float = 1.0,
                      pulse_width: float = 0.5) -> Stimulus:
        """Add an electrical stimulation electrode."""
        s = Stimulus(
            stim_id=stim_id,
            stim_type='electrical',
            intensity=intensity,
            x=x, y=y,
            sigma=sigma,
            waveform=waveform,
            pulse_freq=pulse_freq,
            pulse_width=pulse_width,
        )
        self.stimuli[stim_id] = s
        return s

    def activate(self, stim_id: str, intensity: Optional[float] = None):
        """Turn on a stimulus (optionally set intensity)."""
        if stim_id in self.stimuli:
            self.stimuli[stim_id].active = True
            if intensity is not None:
                self.stimuli[stim_id].intensity = intensity

    def deactivate(self, stim_id: str):
        """Turn off a stimulus."""
        if stim_id in self.stimuli:
            self.stimuli[stim_id].active = False

    def move(self, stim_id: str, x: float, y: float):
        """Move a stimulus source to a new position."""
        if stim_id in self.stimuli:
            self.stimuli[stim_id].x = x
            self.stimuli[stim_id].y = y

    def set_intensity(self, stim_id: str, intensity: float):
        """Change stimulus intensity."""
        if stim_id in self.stimuli:
            self.stimuli[stim_id].intensity = intensity

    def set_sigma(self, stim_id: str, sigma: float):
        """Change stimulus spread."""
        if stim_id in self.stimuli:
            self.stimuli[stim_id].sigma = sigma

    def remove(self, stim_id: str):
        """Remove a stimulus."""
        self.stimuli.pop(stim_id, None)

    def advance_all(self, dt: float):
        """Advance all waveform phases."""
        for s in self.stimuli.values():
            s.advance(dt)

    def get_active_stimuli(self) -> List[dict]:
        """Get list of active stimulus dicts for network_model.step()."""
        return [s.to_dict() for s in self.stimuli.values() if s.active]

    def get_all_info(self) -> List[dict]:
        """Get info about all stimuli (for frontend state sync)."""
        return [
            {
                'id': s.stim_id,
                'type': s.stim_type,
                'wavelength': s.wavelength,
                'intensity': s.intensity,
                'x': s.x, 'y': s.y,
                'sigma': s.sigma,
                'active': s.active,
                'waveform': s.waveform,
            }
            for s in self.stimuli.values()
        ]
