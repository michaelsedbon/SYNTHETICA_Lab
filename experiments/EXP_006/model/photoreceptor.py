"""
Photoreceptor kinetics — WC-1 blue-light receptor activation model.

Replaces square-pulse light stimulation with realistic receptor dynamics:
  dR/dt = (R_inf(I_light) - R) / tau_R

WC-1 is sensitive to blue (450 nm) and UV (365 nm) wavelengths.
Red and white light produce no response [Mishra et al. 2024, p.5].

Refs:
  - Yu & Fischer 2019, Nat Rev Microbiol — light sensing in fungi
  - Mishra et al. 2024, Sci Robot — WC-1 photoreceptor description
"""

import numpy as np
from dataclasses import dataclass, field


@dataclass
class PhotoreceptorParams:
    """WC-1 photoreceptor parameters."""
    tau_activate: float = 0.3     # Activation time constant (s) — fast on
    tau_deactivate: float = 1.5   # Deactivation time constant (s) — slow off
    sensitivity_blue: float = 1.0  # Relative sensitivity to blue (450 nm)
    sensitivity_uv: float = 3.0    # UV is 3× more effective [M24 p.5]
    sensitivity_red: float = 0.0   # No response [M24 p.5]
    sensitivity_white: float = 0.0 # No response [M24 p.5]
    hill_n: float = 2.0            # Hill coefficient for saturation
    hill_k: float = 0.5            # Half-activation intensity
    max_activation: float = 1.0    # Maximum receptor activation


@dataclass
class PhotoreceptorState:
    """Per-node photoreceptor state."""
    R: float = 0.0  # Current activation level [0, max_activation]

    def step(self, I_light: float, wavelength: str, dt: float,
             params: PhotoreceptorParams = None) -> float:
        """
        Update receptor state and return current activation.

        Parameters
        ----------
        I_light : light intensity at this node
        wavelength : 'blue', 'uv', 'red', or 'white'
        dt : time step (s)
        params : PhotoreceptorParams

        Returns
        -------
        float : current receptor activation R
        """
        if params is None:
            params = PhotoreceptorParams()

        # Wavelength sensitivity
        sensitivity_map = {
            'blue': params.sensitivity_blue,
            'uv': params.sensitivity_uv,
            'red': params.sensitivity_red,
            'white': params.sensitivity_white,
        }
        sensitivity = sensitivity_map.get(wavelength, 0.0)

        # Effective intensity after wavelength filtering
        I_eff = I_light * sensitivity

        # Steady-state activation (Hill function for saturation)
        R_inf = params.max_activation * (
            I_eff ** params.hill_n /
            (params.hill_k ** params.hill_n + I_eff ** params.hill_n + 1e-12)
        )

        # Time constant depends on whether activating or deactivating
        if R_inf > self.R:
            tau = params.tau_activate   # Fast on
        else:
            tau = params.tau_deactivate  # Slow off

        # First-order dynamics
        dR = (R_inf - self.R) / tau
        self.R += dR * dt
        self.R = np.clip(self.R, 0.0, params.max_activation)

        return self.R


def compute_receptor_current(activation: float, I_scale: float = 3.0) -> float:
    """
    Convert receptor activation to membrane current.

    Parameters
    ----------
    activation : receptor state R ∈ [0, 1]
    I_scale : scaling factor (maps max activation to current)

    Returns
    -------
    float : current to inject into membrane equation
    """
    return activation * I_scale
