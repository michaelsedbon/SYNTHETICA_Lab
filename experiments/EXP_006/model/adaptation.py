"""
Spike-frequency adaptation and fatigue dynamics.

Models the gradual weakening of spiking observed in long recordings:
  "gradual weakening observed over time" — Mishra et al. 2024, p.10

Two mechanisms:
1. Adaptation current: w increases with each spike, reducing excitability
   dw/dt = -w / tau_a + b * delta(spike)

2. Resource depletion: available amplitude pool depletes with activity
   dP/dt = (P_rest - P) / tau_recovery - c * delta(spike)
"""

import numpy as np
from dataclasses import dataclass


@dataclass
class AdaptationParams:
    """Adaptation and fatigue parameters."""
    # Spike-frequency adaptation
    tau_a: float = 30.0        # Adaptation time constant (s) — slow decay
    b_adapt: float = 0.15      # Adaptation increment per spike
    max_adapt: float = 0.20    # Max adaptation current (caps I_drive reduction)

    # Resource depletion (amplitude fatigue)
    tau_recovery: float = 60.0  # Recovery time constant (s)
    depletion_per_spike: float = 0.02  # Pool depleted per spike
    P_rest: float = 1.0        # Resting pool level
    P_min: float = 0.3         # Minimum pool (30% of baseline, never fully silent)


@dataclass
class AdaptationState:
    """Per-node adaptation state."""
    w: float = 0.0   # Adaptation current (reduces excitability)
    P: float = 1.0   # Resource pool (scales amplitude) [0.3, 1.0]

    def step(self, dt: float, spiked: bool = False,
             params: AdaptationParams = None) -> tuple:
        """
        Update adaptation state.

        Parameters
        ----------
        dt : time step (s)
        spiked : whether this node just fired a spike
        params : AdaptationParams

        Returns
        -------
        tuple : (I_adapt, amplitude_scale)
            I_adapt : current to subtract from drive (reduces excitability)
            amplitude_scale : multiplier for spike amplitude [P_min, 1.0]
        """
        if params is None:
            params = AdaptationParams()

        # Adaptation current decay
        dw = -self.w / params.tau_a
        if spiked:
            dw += params.b_adapt / dt  # Delta function approximation
        self.w += dw * dt
        self.w = np.clip(self.w, 0.0, params.max_adapt)

        # Resource pool recovery
        dP = (params.P_rest - self.P) / params.tau_recovery
        if spiked:
            dP -= params.depletion_per_spike / dt
        self.P += dP * dt
        self.P = np.clip(self.P, params.P_min, params.P_rest)

        return self.w, self.P
