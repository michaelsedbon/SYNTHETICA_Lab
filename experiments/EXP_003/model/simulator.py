"""
Time-accelerated simulator for the Cryptographic Beings machine.

Integrates marimo biophysics with machine geometry.
Runs faster than real-time for parameter exploration.
Outputs structured data for analysis and plotting.
"""

import numpy as np
import json
import time as pytime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Callable
from marimo_bio import MarimoParams, MarimoState, step_marimo
from machine import (
    MachineConfig, MachineState, Command,
    create_machine, get_light_intensity, apply_command, step_motors
)


@dataclass
class SimConfig:
    """Simulation configuration."""
    dt: float = 10.0                  # time step (seconds)
    total_time: float = 48 * 3600     # total simulation time (seconds)
    log_interval: float = 60.0        # how often to log state (seconds)
    temperature: float = 293.15       # K (20°C)
    ambient_light: float = 0.0        # µmol/m²/s — ambient light on all tubes


@dataclass
class SimSnapshot:
    """One logged state snapshot."""
    time_s: float
    time_h: float
    
    # Per-tube data: [level][slot]
    positions: List[List[float]]       # z positions
    O2_levels: List[List[float]]       # trapped O₂
    binary_states: List[List[int]]     # 0/1 (sunk/floating)
    light_intensities: List[List[float]]
    chlorophyll_health: List[List[float]]
    
    # Machine state
    arm_angle_deg: float
    arm_light_on: bool
    level_angles_deg: List[float]


class Simulator:
    """
    Main simulation engine.
    
    Usage:
        sim = Simulator()
        sim.add_command(Command(time_s=3600, action='SET_LIGHT', params={'on': True}))
        results = sim.run()
    """
    
    def __init__(self, machine_config: MachineConfig = None,
                 marimo_params: MarimoParams = None,
                 sim_config: SimConfig = None):
        self.machine_config = machine_config or MachineConfig()
        self.marimo_params = marimo_params or MarimoParams()
        self.sim_config = sim_config or SimConfig()
        self.commands: List[Command] = []
        self.snapshots: List[SimSnapshot] = []
        self.machine_state: Optional[MachineState] = None
        
    def add_command(self, cmd: Command):
        """Schedule a command."""
        self.commands.append(cmd)
        
    def add_commands(self, cmds: List[Command]):
        """Schedule multiple commands."""
        self.commands.extend(cmds)
    
    def _take_snapshot(self, config: MachineConfig, state: MachineState) -> SimSnapshot:
        """Capture current state."""
        positions = []
        O2_levels = []
        binary_states = []
        light_intensities = []
        chlorophyll_health = []
        
        for level in range(config.n_levels):
            pos_row = []
            o2_row = []
            bin_row = []
            light_row = []
            chl_row = []
            for slot in range(config.tubes_per_level):
                ms = state.marimo_states[level][slot]
                pos_row.append(ms.position_z)
                o2_row.append(ms.O2_trapped)
                bin_row.append(ms.is_floating())
                light_row.append(get_light_intensity(level, slot, config, state))
                chl_row.append(ms.chlorophyll_health)
            positions.append(pos_row)
            O2_levels.append(o2_row)
            binary_states.append(bin_row)
            light_intensities.append(light_row)
            chlorophyll_health.append(chl_row)
        
        return SimSnapshot(
            time_s=state.time_s,
            time_h=state.time_s / 3600,
            positions=positions,
            O2_levels=O2_levels,
            binary_states=binary_states,
            light_intensities=light_intensities,
            chlorophyll_health=chlorophyll_health,
            arm_angle_deg=np.degrees(state.arm_angle),
            arm_light_on=state.arm_light_on,
            level_angles_deg=[np.degrees(a) for a in state.level_angles],
        )
    
    def run(self, progress_callback: Optional[Callable] = None) -> List[SimSnapshot]:
        """
        Run the simulation.
        
        Returns list of SimSnapshot objects.
        """
        config = self.machine_config
        sc = self.sim_config
        
        # Initialize
        self.machine_state = create_machine(config, self.marimo_params)
        state = self.machine_state
        
        # Sort commands by time
        pending_cmds = sorted(self.commands, key=lambda c: c.time_s)
        cmd_idx = 0
        
        self.snapshots = []
        last_log_time = -sc.log_interval  # log at t=0
        n_steps = int(sc.total_time / sc.dt)
        
        t0 = pytime.time()
        
        for step in range(n_steps + 1):
            t = step * sc.dt
            state.time_s = t
            
            # Execute pending commands
            while cmd_idx < len(pending_cmds) and pending_cmds[cmd_idx].time_s <= t:
                apply_command(pending_cmds[cmd_idx], state, config)
                cmd_idx += 1
            
            # Update motors
            step_motors(state, config, sc.dt)
            
            # Update all Marimo balls
            for level in range(config.n_levels):
                for slot in range(config.tubes_per_level):
                    light = get_light_intensity(level, slot, config, state) + sc.ambient_light
                    state.marimo_states[level][slot] = step_marimo(
                        state.marimo_states[level][slot],
                        state.marimo_params[level][slot],
                        sc.dt,
                        light_intensity=light,
                        temperature=sc.temperature,
                    )
            
            # Log snapshot
            if t - last_log_time >= sc.log_interval:
                self.snapshots.append(self._take_snapshot(config, state))
                last_log_time = t
            
            # Progress
            if progress_callback and step % 1000 == 0:
                progress_callback(step / n_steps)
        
        elapsed = pytime.time() - t0
        sim_hours = sc.total_time / 3600
        print(f"Simulation complete: {sim_hours:.1f}h simulated in {elapsed:.1f}s "
              f"({sim_hours * 3600 / elapsed:.0f}× real-time)")
        
        return self.snapshots
    
    def to_dict(self) -> Dict:
        """Convert results to a serializable dict."""
        return {
            'config': {
                'n_levels': self.machine_config.n_levels,
                'tubes_per_level': self.machine_config.tubes_per_level,
                'tube_height_m': self.machine_config.tube_height_m,
                'arm_light_intensity': self.machine_config.arm_light_intensity,
                'level_light_intensity': self.machine_config.level_light_intensity,
                'dt': self.sim_config.dt,
                'total_time_h': self.sim_config.total_time / 3600,
                'temperature_C': self.sim_config.temperature - 273.15,
            },
            'snapshots': [asdict(s) for s in self.snapshots],
        }
    
    def save_json(self, path: str):
        """Save results to JSON."""
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
        print(f"Results saved to {path}")


# ─── Convenience: single tube simulation ─────────────────────────────

def simulate_single_tube(light_schedule: Callable,
                         total_hours: float = 48,
                         dt: float = 5.0,
                         params: MarimoParams = None,
                         temperature: float = 293.15) -> List[dict]:
    """
    Simulate a single Marimo in isolation with a light schedule function.
    
    Parameters
    ----------
    light_schedule : callable(t_seconds) -> float (µmol/m²/s)
    total_hours : simulation duration in hours
    dt : time step in seconds
    params : MarimoParams (defaults used if None)
    temperature : K
    
    Returns
    -------
    List of dicts with time, position, O2, state, etc.
    """
    if params is None:
        params = MarimoParams()
    
    state = MarimoState()
    results = []
    
    n_steps = int(total_hours * 3600 / dt)
    for step in range(n_steps + 1):
        t = step * dt
        light = light_schedule(t)
        
        if step > 0:
            state = step_marimo(state, params, dt, light, temperature)
        
        if step % max(1, int(60 / dt)) == 0:  # log every ~60s
            results.append({
                'time_s': t,
                'time_h': t / 3600,
                'position_z': state.position_z,
                'O2_trapped': state.O2_trapped,
                'is_floating': state.is_floating(),
                'velocity_z': state.velocity_z,
                'chlorophyll_health': state.chlorophyll_health,
                'light_intensity': light,
                'circadian_phase': state.circadian_phase,
            })
    
    return results
