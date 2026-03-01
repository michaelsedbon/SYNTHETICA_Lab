"""
Cryptographic Beings machine model.

3 levels × 6 glass tubes per level = 18 Marimo balls.
One motorized arm with a light rotates around the tower.
Each level has one fixed light and can rotate independently.

A tube receives light if:
  (a) the arm's light is ON and the arm is aligned with the tube, OR
  (b) the level is rotated so the tube faces the level's fixed light
"""

import numpy as np
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from marimo_bio import MarimoParams, MarimoState


@dataclass
class TubeConfig:
    """Configuration for a single glass tube."""
    level: int              # 0, 1, 2
    slot: int               # 0-5 (position on the level)
    base_angle: float       # radians — initial angular position
    

@dataclass 
class MachineConfig:
    """Physical configuration of the Cryptographic Beings machine."""
    n_levels: int = 3
    tubes_per_level: int = 6
    tube_height_m: float = 0.30       # height of each glass tube
    tower_radius_m: float = 0.15      # radius of the circular array
    arm_light_intensity: float = 200.0  # µmol/m²/s from arm light
    level_light_intensity: float = 150.0  # µmol/m²/s from fixed level light
    arm_angular_width: float = np.radians(30)  # angular coverage of arm light
    level_light_angular_width: float = np.radians(30)  # angular coverage of fixed light
    level_light_angles: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])  # fixed light positions per level


@dataclass
class MachineState:
    """Dynamic state of the entire machine."""
    # Arm
    arm_angle: float = 0.0            # radians
    arm_light_on: bool = False
    arm_target_angle: float = 0.0
    arm_speed: float = np.radians(30)  # rad/s
    
    # Levels — rotation angle for each level
    level_angles: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    level_target_angles: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0])
    level_speeds: List[float] = field(default_factory=lambda: [np.radians(45)] * 3)
    
    # Marimo states: indexed [level][slot]
    marimo_states: List[List[MarimoState]] = field(default_factory=list)
    marimo_params: List[List[MarimoParams]] = field(default_factory=list)
    
    # Time
    time_s: float = 0.0


def create_machine(config: MachineConfig = None,
                    params: MarimoParams = None) -> MachineState:
    """Initialize a machine with all Marimo balls."""
    if config is None:
        config = MachineConfig()
    if params is None:
        params = MarimoParams()
    
    state = MachineState()
    state.level_angles = [0.0] * config.n_levels
    state.level_target_angles = [0.0] * config.n_levels
    state.level_speeds = [np.radians(45)] * config.n_levels
    
    state.marimo_states = []
    state.marimo_params = []
    
    for level in range(config.n_levels):
        level_states = []
        level_params = []
        for slot in range(config.tubes_per_level):
            # Randomize initial circadian phase slightly
            ms = MarimoState()
            ms.circadian_phase = np.random.uniform(0, 2 * np.pi)
            ms.position_z = 0.0
            level_states.append(ms)
            level_params.append(MarimoParams(tube_height=config.tube_height_m))
        state.marimo_states.append(level_states)
        state.marimo_params.append(level_params)
    
    return state


def get_tube_angle(level: int, slot: int, config: MachineConfig,
                   machine_state: MachineState) -> float:
    """Get the current absolute angle of a tube (accounting for level rotation)."""
    base_angle = 2 * np.pi * slot / config.tubes_per_level
    return (base_angle + machine_state.level_angles[level]) % (2 * np.pi)


def angle_distance(a: float, b: float) -> float:
    """Shortest angular distance between two angles."""
    d = (a - b) % (2 * np.pi)
    return min(d, 2 * np.pi - d)


def get_light_intensity(level: int, slot: int, config: MachineConfig,
                        machine_state: MachineState) -> float:
    """
    Calculate light intensity on a specific tube.
    
    Light comes from two sources:
    1. The arm light (if ON and aligned with any level)
    2. The fixed light on this level (if tube is rotated to face it)
    """
    tube_angle = get_tube_angle(level, slot, config, machine_state)
    intensity = 0.0
    
    # Source 1: Arm light
    if machine_state.arm_light_on:
        arm_dist = angle_distance(tube_angle, machine_state.arm_angle)
        if arm_dist < config.arm_angular_width / 2:
            # Smooth falloff within angular window
            falloff = np.cos(np.pi * arm_dist / config.arm_angular_width)
            intensity += config.arm_light_intensity * max(0, falloff)
    
    # Source 2: Fixed level light
    level_light_angle = config.level_light_angles[level]
    level_dist = angle_distance(tube_angle, level_light_angle)
    if level_dist < config.level_light_angular_width / 2:
        falloff = np.cos(np.pi * level_dist / config.level_light_angular_width)
        intensity += config.level_light_intensity * max(0, falloff)
    
    return intensity


# ─── Command interface ───────────────────────────────────────────────

@dataclass
class Command:
    """A machine command to be executed at a specific time."""
    time_s: float           # when to execute
    action: str             # 'MOVE_ARM', 'ROTATE_LEVEL', 'SET_LIGHT', 'READ_STATE'
    params: dict = field(default_factory=dict)
    
    def __repr__(self):
        return f"Command(t={self.time_s:.1f}s, {self.action}, {self.params})"


def apply_command(cmd: Command, state: MachineState, config: MachineConfig):
    """Apply a command to the machine state."""
    if cmd.action == 'MOVE_ARM':
        state.arm_target_angle = np.radians(cmd.params.get('angle', 0))
    elif cmd.action == 'ROTATE_LEVEL':
        level = cmd.params.get('level', 0)
        angle = np.radians(cmd.params.get('angle', 0))
        if 0 <= level < config.n_levels:
            state.level_target_angles[level] = angle
    elif cmd.action == 'SET_LIGHT':
        state.arm_light_on = cmd.params.get('on', False)
    elif cmd.action == 'READ_STATE':
        pass  # handled by simulator


def step_motors(state: MachineState, config: MachineConfig, dt: float):
    """Update arm and level angles toward targets."""
    # Arm
    arm_diff = (state.arm_target_angle - state.arm_angle) % (2 * np.pi)
    if arm_diff > np.pi:
        arm_diff -= 2 * np.pi
    max_step = state.arm_speed * dt
    if abs(arm_diff) > max_step:
        state.arm_angle += np.sign(arm_diff) * max_step
    else:
        state.arm_angle = state.arm_target_angle
    state.arm_angle %= (2 * np.pi)
    
    # Levels
    for i in range(config.n_levels):
        level_diff = (state.level_target_angles[i] - state.level_angles[i]) % (2 * np.pi)
        if level_diff > np.pi:
            level_diff -= 2 * np.pi
        max_step = state.level_speeds[i] * dt
        if abs(level_diff) > max_step:
            state.level_angles[i] += np.sign(level_diff) * max_step
        else:
            state.level_angles[i] = state.level_target_angles[i]
        state.level_angles[i] %= (2 * np.pi)
