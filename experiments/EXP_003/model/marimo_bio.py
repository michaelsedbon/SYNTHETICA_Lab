"""
Marimo (Aegagropila linnaei) biophysical model.

Models photosynthesis-driven O₂ production, bubble trapping, buoyancy,
vertical dynamics, circadian gating, and photobleaching.

Parameters sourced from:
- Cano-Ramirez et al. 2018, Current Biology (DOI: 10.1016/j.cub.2018.07.027)
- Phillips et al. 2019, J Biol Eng (DOI: 10.1186/s13036-019-0200-5)
- Phillips et al. 2022, J Biol Eng (DOI: 10.1186/s13036-021-00279-0)
- Photoinhibition study 2023, IJMS (DOI: 10.3390/ijms24010060)
- Boedeker 2010, BioScience (DOI: 10.1525/bio.2010.60.3.5)
"""

import numpy as np
from dataclasses import dataclass, field


@dataclass
class MarimoParams:
    """Physical and biological parameters for a single Marimo ball."""
    
    # ── Geometry ──
    diameter_m: float = 0.06          # 60 mm (Phillips 2019)
    density_ball: float = 1003.0      # kg/m³ (barely denser than water — Phillips 2019)
    
    # ── Photosynthesis ──
    P_max: float = 2.5e-8             # mol O₂ / s at saturating light (calibrated to 1.5g lift in ~2h)
    K_half: float = 50.0              # µmol/m²/s — half-saturation light intensity
    hill_n: float = 2.0               # Hill coefficient for light response
    
    # ── Respiration ──
    R_dark: float = 3.0e-9            # mol O₂ / s consumed in dark respiration
    
    # ── Bubble dynamics ──
    k_release_base: float = 1e-4      # s⁻¹ — spontaneous bubble release rate
    k_release_mech: float = 5e-4      # s⁻¹ — additional release from mechanical disturbance
    bubble_retention: float = 0.7     # fraction of produced O₂ that stays trapped
    
    # ── Circadian ──
    circadian_period: float = 24.0 * 3600  # 24 h in seconds (Cano-Ramirez 2018)
    circadian_amplitude: float = 0.4  # amplitude of circadian modulation (0-1)
    circadian_peak_phase: float = 0.25  # fraction of cycle (peak ~6h after dawn)
    
    # ── Buoyancy ──
    max_lift_force: float = 0.0147    # N (≈ 1.5 g × 9.81 m/s², Phillips 2019)
    
    # ── Vertical dynamics ──
    tube_height: float = 0.30         # m — height of glass tube
    water_viscosity: float = 1e-3     # Pa·s (water at 20°C)
    water_density: float = 998.0      # kg/m³
    
    # ── Bleaching / Photoinhibition ──
    bleach_rate: float = 1e-6         # s⁻¹ — chlorophyll degradation rate under excess light
    bleach_light_threshold: float = 300.0  # µmol/m²/s — light intensity above which bleaching occurs
    recovery_rate: float = 5e-7       # s⁻¹ — chlorophyll recovery rate in moderate/dark conditions
    
    # ── Temperature ──
    T_opt: float = 293.15             # K — optimal temperature (20°C)
    T_ref: float = 293.15             # K — reference temperature
    Q10: float = 2.0                  # temperature coefficient
    
    @property
    def radius_m(self):
        return self.diameter_m / 2
    
    @property
    def volume_m3(self):
        return (4/3) * np.pi * self.radius_m**3
    
    @property
    def mass_kg(self):
        return self.density_ball * self.volume_m3
    
    @property
    def surface_area_m2(self):
        return 4 * np.pi * self.radius_m**2
    
    @property
    def cross_section_m2(self):
        return np.pi * self.radius_m**2


@dataclass
class MarimoState:
    """Dynamic state of a single Marimo ball."""
    O2_trapped: float = 0.0           # mol of O₂ trapped in filaments
    position_z: float = 0.0           # normalized position (0=bottom, 1=surface)
    circadian_phase: float = 0.0      # radians (0 to 2π)
    chlorophyll_health: float = 1.0   # 0-1, fraction of healthy chlorophyll
    velocity_z: float = 0.0           # m/s vertical velocity
    cumulative_light: float = 0.0     # µmol/m²/s·s — total light exposure
    
    def is_floating(self, threshold=0.95):
        """Binary state: 1 if at surface, 0 if sunk."""
        return 1 if self.position_z >= threshold else 0
    
    def copy(self):
        return MarimoState(
            O2_trapped=self.O2_trapped,
            position_z=self.position_z,
            circadian_phase=self.circadian_phase,
            chlorophyll_health=self.chlorophyll_health,
            velocity_z=self.velocity_z,
            cumulative_light=self.cumulative_light,
        )


# ─── Physics functions ───────────────────────────────────────────────

R_GAS = 8.314  # J/(mol·K)
G = 9.81       # m/s²


def light_response(intensity: float, params: MarimoParams) -> float:
    """Hill function for light-dependent photosynthesis rate (0-1)."""
    if intensity <= 0:
        return 0.0
    return intensity**params.hill_n / (params.K_half**params.hill_n + intensity**params.hill_n)


def circadian_gate(phase: float, params: MarimoParams) -> float:
    """Circadian gating factor (0-1). Peak at circadian_peak_phase."""
    peak_rad = params.circadian_peak_phase * 2 * np.pi
    return 1.0 - params.circadian_amplitude * (1 - np.cos(phase - peak_rad)) / 2


def O2_to_volume(O2_mol: float, T: float = 293.15, P: float = 101325.0) -> float:
    """Convert moles of O₂ to volume (m³) using ideal gas law."""
    return O2_mol * R_GAS * T / P


def buoyancy_force(O2_mol: float, params: MarimoParams, T: float = 293.15) -> float:
    """Net buoyancy force (N). Positive = upward."""
    V_gas = O2_to_volume(O2_mol, T)
    # Displaced water by gas bubbles provides lift
    F_gas_buoyancy = params.water_density * G * V_gas
    # Weight of the Marimo minus buoyancy of its body
    F_weight = (params.density_ball - params.water_density) * params.volume_m3 * G
    return F_gas_buoyancy - F_weight


def stokes_drag(velocity: float, params: MarimoParams) -> float:
    """Stokes drag force on a sphere (low Re regime)."""
    return 6 * np.pi * params.water_viscosity * params.radius_m * velocity


def temperature_factor(T: float, params: MarimoParams) -> float:
    """Q10 temperature scaling for photosynthesis rate."""
    return params.Q10 ** ((T - params.T_ref) / 10.0)


# ─── Time stepping ───────────────────────────────────────────────────

def step_marimo(state: MarimoState, params: MarimoParams, dt: float,
                light_intensity: float, temperature: float = 293.15,
                mechanical_disturbance: float = 0.0) -> MarimoState:
    """
    Advance a Marimo by one time step.
    
    Parameters
    ----------
    state : MarimoState
    params : MarimoParams
    dt : float — time step in seconds
    light_intensity : float — µmol/m²/s photosynthetically active radiation
    temperature : float — K
    mechanical_disturbance : float — 0-1, intensity of mechanical perturbation
    
    Returns
    -------
    MarimoState — updated state
    """
    s = state.copy()
    
    # ── 1. Circadian phase advance ──
    s.circadian_phase += 2 * np.pi * dt / params.circadian_period
    s.circadian_phase %= (2 * np.pi)
    
    # ── 2. Photosynthesis ──
    f_light = light_response(light_intensity, params)
    f_circ = circadian_gate(s.circadian_phase, params)
    f_temp = temperature_factor(temperature, params)
    f_health = s.chlorophyll_health  # degraded chlorophyll reduces photosynthesis
    
    photosynthesis_rate = params.P_max * f_light * f_circ * f_temp * f_health
    
    # ── 3. O₂ balance ──
    production = photosynthesis_rate * params.bubble_retention * dt
    respiration = params.R_dark * dt
    release = (params.k_release_base + mechanical_disturbance * params.k_release_mech) * s.O2_trapped * dt
    
    s.O2_trapped += production - respiration - release
    s.O2_trapped = max(0.0, s.O2_trapped)
    
    # ── 4. Buoyancy & vertical dynamics ──
    F_net = buoyancy_force(s.O2_trapped, params, temperature)
    F_drag = stokes_drag(s.velocity_z, params)
    
    # Acceleration (F = ma, with added mass for sphere in fluid)
    m_eff = params.mass_kg + 0.5 * params.water_density * params.volume_m3  # added mass
    acceleration = (F_net - np.sign(s.velocity_z) * abs(F_drag)) / m_eff
    
    s.velocity_z += acceleration * dt
    # Damping for stability
    s.velocity_z *= 0.99
    
    # Update position
    new_z = s.position_z + s.velocity_z * dt / params.tube_height
    s.position_z = np.clip(new_z, 0.0, 1.0)
    
    # Bounce off boundaries
    if s.position_z <= 0.0 or s.position_z >= 1.0:
        s.velocity_z = 0.0
    
    # ── 5. Bleaching / Photoinhibition ──
    if light_intensity > params.bleach_light_threshold:
        excess = (light_intensity - params.bleach_light_threshold) / params.bleach_light_threshold
        s.chlorophyll_health -= params.bleach_rate * excess * dt
    else:
        # Recovery in moderate light or dark
        s.chlorophyll_health += params.recovery_rate * dt
    s.chlorophyll_health = np.clip(s.chlorophyll_health, 0.0, 1.0)
    
    # ── 6. Track cumulative light ──
    s.cumulative_light += light_intensity * dt
    
    return s
