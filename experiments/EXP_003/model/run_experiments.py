#!/usr/bin/env python3
"""
Run characterization experiments for the Cryptographic Beings machine.

Produces three levels of analysis:
1. Single tube — buoyancy dynamics under light/dark cycles
2. Single level — 6-tube interaction with rotation
3. Full installation — 3 levels × 6 tubes with arm control

Generates Plotly HTML figures and a scientific characterization report.
"""

import sys
import os
import json
import numpy as np

# Add model directory to path
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, MODEL_DIR)

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

from marimo_bio import MarimoParams, MarimoState, step_marimo
from machine import MachineConfig, MachineState, Command, create_machine
from simulator import Simulator, SimConfig, simulate_single_tube

# ─── Output directories ─────────────────────────────────────────────

EXP_DIR = os.path.dirname(MODEL_DIR)
FIGURES_DIR = os.path.join(EXP_DIR, 'figures')
DATA_DIR = os.path.join(EXP_DIR, 'data')
os.makedirs(FIGURES_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════
# EXPERIMENT 1: Single Tube Characterization
# ═══════════════════════════════════════════════════════════════════════

def exp1_single_tube_light_dark_cycle():
    """
    12h light / 12h dark cycle for 72 hours.
    Shows buoyancy oscillation, O₂ dynamics, and circadian gating.
    """
    print("\n═══ Experiment 1: Single Tube — Light/Dark Cycle (72h) ═══")
    
    def light_schedule(t):
        hour = (t / 3600) % 24
        return 200.0 if 6 <= hour < 18 else 0.0  # 12h light, 12h dark
    
    results = simulate_single_tube(light_schedule, total_hours=72, dt=5.0)
    
    times = [r['time_h'] for r in results]
    positions = [r['position_z'] for r in results]
    o2_levels = [r['O2_trapped'] * 1e6 for r in results]  # µmol
    lights = [r['light_intensity'] for r in results]
    health = [r['chlorophyll_health'] for r in results]
    states = [r['is_floating'] for r in results]
    
    # Create figure
    fig = make_subplots(
        rows=4, cols=1, shared_xaxes=True,
        subplot_titles=[
            'Vertical Position (0=bottom, 1=surface)',
            'Trapped O₂ (µmol)',
            'Light Intensity (µmol/m²/s)',
            'Binary State (0=sunk, 1=floating)'
        ],
        vertical_spacing=0.06,
    )
    
    fig.add_trace(go.Scatter(x=times, y=positions, name='Position',
                              line=dict(color='#2196F3', width=2)), row=1, col=1)
    fig.add_trace(go.Scatter(x=times, y=o2_levels, name='O₂',
                              line=dict(color='#4CAF50', width=2)), row=2, col=1)
    fig.add_trace(go.Scatter(x=times, y=lights, name='Light',
                              line=dict(color='#FFC107', width=2),
                              fill='tozeroy', fillcolor='rgba(255,193,7,0.15)'), row=3, col=1)
    fig.add_trace(go.Scatter(x=times, y=states, name='State',
                              line=dict(color='#E91E63', width=2, shape='hv')), row=4, col=1)
    
    # Add day/night shading
    for day in range(3):
        for h_start in [0, 18]:
            x0 = day * 24 + h_start
            x1 = x0 + 6 if h_start == 0 else x0 + 6
            for row in range(1, 5):
                fig.add_vrect(x0=day*24, x1=day*24+6, fillcolor='rgba(0,0,0,0.05)',
                             line_width=0, row=row, col=1)
                fig.add_vrect(x0=day*24+18, x1=(day+1)*24, fillcolor='rgba(0,0,0,0.05)',
                             line_width=0, row=row, col=1)
    
    fig.update_layout(
        title='Experiment 1: Single Tube Light/Dark Cycle (72h)',
        height=900, showlegend=False,
        template='plotly_white',
        font=dict(family='Inter, sans-serif'),
    )
    fig.update_xaxes(title_text='Time (hours)', row=4, col=1)
    
    path = os.path.join(FIGURES_DIR, 'exp1_light_dark_cycle.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp1_light_dark_cycle.png'),
                    width=1200, height=900, scale=2)
    print(f"  Saved: {path}")
    return results


def exp1b_parameter_sweep():
    """
    Sweep light intensity and exposure duration.
    Measures time-to-float and time-to-sink.
    """
    print("\n═══ Experiment 1b: Parameter Sweep — Light Intensity vs Duration ═══")
    
    intensities = [25, 50, 100, 150, 200, 300, 500]
    durations_h = [1, 2, 4, 6, 8, 12]
    
    time_to_float = np.full((len(intensities), len(durations_h)), np.nan)
    time_to_sink = np.full((len(intensities), len(durations_h)), np.nan)
    
    for i, intensity in enumerate(intensities):
        for j, dur in enumerate(durations_h):
            def light_schedule(t, I=intensity, D=dur):
                return I if t < D * 3600 else 0.0
            
            results = simulate_single_tube(light_schedule, total_hours=max(dur * 3, 24), dt=10.0)
            
            # Find time to float
            for r in results:
                if r['is_floating'] and np.isnan(time_to_float[i, j]):
                    time_to_float[i, j] = r['time_h']
                    break
            
            # Find time to sink after light off
            if not np.isnan(time_to_float[i, j]):
                for r in results:
                    if r['time_h'] > dur and not r['is_floating']:
                        time_to_sink[i, j] = r['time_h'] - dur
                        break
    
    # ── Plot 1: Time to float vs intensity (one line per duration) ──
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=[
            'How fast does it float?',
            'How long does it stay floating after light off?'
        ],
    )
    
    colors = px.colors.qualitative.Set2
    
    for j, dur in enumerate(durations_h):
        # Time to float
        ttf = [time_to_float[i, j] for i in range(len(intensities))]
        fig.add_trace(go.Scatter(
            x=intensities, y=ttf, name=f'{dur}h exposure',
            mode='lines+markers',
            line=dict(color=colors[j % len(colors)], width=2),
            marker=dict(size=6),
        ), row=1, col=1)
        
        # Persistence after light off
        tts = [time_to_sink[i, j] for i in range(len(intensities))]
        fig.add_trace(go.Scatter(
            x=intensities, y=tts, name=f'{dur}h exposure',
            mode='lines+markers', showlegend=False,
            line=dict(color=colors[j % len(colors)], width=2),
            marker=dict(size=6),
        ), row=1, col=2)
    
    fig.update_xaxes(title_text='Light Intensity (µmol/m²/s)', row=1, col=1)
    fig.update_xaxes(title_text='Light Intensity (µmol/m²/s)', row=1, col=2)
    fig.update_yaxes(title_text='Time to reach surface (hours)', row=1, col=1)
    fig.update_yaxes(title_text='Stays floating for (hours)', row=1, col=2)
    
    fig.update_layout(
        title='Experiment 1b: How Light Intensity & Duration Affect Float/Sink Timing',
        height=450, template='plotly_white',
        font=dict(family='Inter, sans-serif'),
        legend=dict(title='Light exposure'),
    )
    
    path = os.path.join(FIGURES_DIR, 'exp1b_parameter_sweep.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp1b_parameter_sweep.png'),
                    width=1200, height=450, scale=2)
    print(f"  Saved: {path}")
    return time_to_float, time_to_sink


def exp1c_bleaching():
    """
    Compare normal light vs excessive light to show bleaching.
    """
    print("\n═══ Experiment 1c: Bleaching Under Excess Light ═══")
    
    scenarios = {
        'Normal (200 µmol)': lambda t: 200.0 if (t/3600) % 24 < 12 else 0.0,
        'High (400 µmol)': lambda t: 400.0 if (t/3600) % 24 < 12 else 0.0,
        'Extreme (800 µmol)': lambda t: 800.0 if (t/3600) % 24 < 12 else 0.0,
        'Constant extreme (600 µmol)': lambda t: 600.0,
    }
    
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        subplot_titles=['Chlorophyll Health', 'Vertical Position'])
    
    colors = ['#2196F3', '#FF9800', '#F44336', '#9C27B0']
    
    for (name, schedule), color in zip(scenarios.items(), colors):
        results = simulate_single_tube(schedule, total_hours=168, dt=10.0)  # 7 days
        times = [r['time_h'] for r in results]
        health = [r['chlorophyll_health'] for r in results]
        positions = [r['position_z'] for r in results]
        
        fig.add_trace(go.Scatter(x=times, y=health, name=name,
                                  line=dict(color=color, width=2)), row=1, col=1)
        fig.add_trace(go.Scatter(x=times, y=positions, name=name,
                                  line=dict(color=color, width=1, dash='dot'),
                                  showlegend=False), row=2, col=1)
    
    fig.update_layout(
        title='Experiment 1c: Photobleaching Under Different Light Regimes (7 days)',
        height=600, template='plotly_white',
        font=dict(family='Inter, sans-serif'),
    )
    fig.update_xaxes(title_text='Time (hours)', row=2, col=1)
    
    path = os.path.join(FIGURES_DIR, 'exp1c_bleaching.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp1c_bleaching.png'),
                    width=1200, height=600, scale=2)
    print(f"  Saved: {path}")


def exp1d_temperature_sweep():
    """
    Compare buoyancy dynamics at different temperatures (10-30°C).
    Shows how Q10 scaling affects rise/sink timing and O2 accumulation.
    """
    print("\n═══ Experiment 1d: Temperature Sweep (10°C – 30°C) ═══")
    
    temperatures = {
        '10°C': 283.15,
        '15°C': 288.15,
        '20°C (baseline)': 293.15,
        '25°C': 298.15,
        '30°C': 303.15,
    }
    
    # 12h light / 12h dark
    def light_schedule(t):
        hour = (t / 3600) % 24
        return 200.0 if 6 <= hour < 18 else 0.0
    
    fig = make_subplots(
        rows=3, cols=1, shared_xaxes=True,
        subplot_titles=[
            'Vertical Position',
            'Trapped O₂ (µmol)',
            'Binary State (0=sunk, 1=float)',
        ],
        vertical_spacing=0.06,
    )
    
    colors = ['#2196F3', '#00BCD4', '#4CAF50', '#FF9800', '#F44336']
    
    # Track metrics for summary table
    metrics = {}
    
    for (name, T), color in zip(temperatures.items(), colors):
        results = simulate_single_tube(light_schedule, total_hours=72, dt=5.0,
                                       temperature=T)
        times = [r['time_h'] for r in results]
        positions = [r['position_z'] for r in results]
        o2_levels = [r['O2_trapped'] * 1e6 for r in results]
        states = [r['is_floating'] for r in results]
        
        # Find first float time
        first_float = None
        for r in results:
            if r['is_floating']:
                first_float = r['time_h']
                break
        
        max_o2 = max(o2_levels)
        metrics[name] = {'first_float_h': first_float, 'max_o2': max_o2, 'T_C': T - 273.15}
        
        fig.add_trace(go.Scatter(x=times, y=positions, name=name,
                                  line=dict(color=color, width=2)), row=1, col=1)
        fig.add_trace(go.Scatter(x=times, y=o2_levels, name=name,
                                  line=dict(color=color, width=1.5, dash='dot'),
                                  showlegend=False), row=2, col=1)
        fig.add_trace(go.Scatter(x=times, y=states, name=name,
                                  line=dict(color=color, width=2, shape='hv'),
                                  showlegend=False), row=3, col=1)
    
    # Day/night shading
    for day in range(3):
        for row in range(1, 4):
            fig.add_vrect(x0=day*24, x1=day*24+6, fillcolor='rgba(0,0,0,0.05)',
                         line_width=0, row=row, col=1)
            fig.add_vrect(x0=day*24+18, x1=(day+1)*24, fillcolor='rgba(0,0,0,0.05)',
                         line_width=0, row=row, col=1)
    
    fig.update_layout(
        title='Experiment 1d: Temperature Sweep — 10°C to 30°C (72h, 12:12 light)',
        height=800, template='plotly_white',
        font=dict(family='Inter, sans-serif'),
    )
    fig.update_xaxes(title_text='Time (hours)', row=3, col=1)
    
    path = os.path.join(FIGURES_DIR, 'exp1d_temperature_sweep.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp1d_temperature_sweep.png'),
                    width=1200, height=800, scale=2)
    print(f"  Saved: {path}")
    
    # Print summary
    print("\n  Temperature sweep summary:")
    print(f"  {'Temp':>12s}  {'First float':>12s}  {'Max O₂':>10s}")
    for name, m in metrics.items():
        ff = f"{m['first_float_h']:.1f}h" if m['first_float_h'] else 'Never'
        print(f"  {name:>12s}  {ff:>12s}  {m['max_o2']:.0f} µmol")
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════
# EXPERIMENT 2: Single Level (6 tubes)
# ═══════════════════════════════════════════════════════════════════════

def exp2_single_level():
    """
    Simulate one level with 6 tubes.
    Rotate the level to expose tubes sequentially.
    """
    print("\n═══ Experiment 2: Single Level — Sequential Exposure ═══")
    
    config = MachineConfig(n_levels=1, tubes_per_level=6)
    sim_config = SimConfig(dt=10.0, total_time=48 * 3600, log_interval=120)
    
    sim = Simulator(config, sim_config=sim_config)
    
    # Schedule: rotate level to expose each tube for 2h
    for cycle in range(4):  # 4 cycles of 12h
        for slot in range(6):
            t = cycle * 12 * 3600 + slot * 2 * 3600
            angle = slot * 60  # degrees
            sim.add_command(Command(time_s=t, action='ROTATE_LEVEL',
                                    params={'level': 0, 'angle': angle}))
    
    results = sim.run()
    
    # Plot
    fig = make_subplots(rows=2, cols=1, shared_xaxes=True,
                        subplot_titles=['Tube Positions', 'Binary States'])
    
    times = [s.time_h for s in results]
    colors = px.colors.qualitative.Set2
    
    for slot in range(6):
        pos = [s.positions[0][slot] for s in results]
        state = [s.binary_states[0][slot] for s in results]
        
        fig.add_trace(go.Scatter(x=times, y=pos, name=f'Tube {slot}',
                                  line=dict(color=colors[slot], width=1.5)), row=1, col=1)
        fig.add_trace(go.Scatter(x=times, y=[s + slot * 0.05 for s in state],
                                  name=f'Tube {slot}', showlegend=False,
                                  line=dict(color=colors[slot], width=2, shape='hv')), row=2, col=1)
    
    fig.update_layout(
        title='Experiment 2: Single Level — Sequential Tube Exposure (48h)',
        height=600, template='plotly_white',
        font=dict(family='Inter, sans-serif'),
    )
    fig.update_xaxes(title_text='Time (hours)', row=2, col=1)
    
    path = os.path.join(FIGURES_DIR, 'exp2_single_level.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp2_single_level.png'),
                    width=1200, height=600, scale=2)
    print(f"  Saved: {path}")
    return results


# ═══════════════════════════════════════════════════════════════════════
# EXPERIMENT 3: Full Installation (3 × 6 = 18 tubes)
# ═══════════════════════════════════════════════════════════════════════

def exp3_full_installation():
    """
    Simulate the full 3-level installation.
    Write a binary pattern across tubes using arm scanning.
    
    Strategy: The arm moves to each target tube and holds light for 3h
    to induce buoyancy. Only one tube can be addressed at a time 
    (constraint of the physical machine).
    """
    print("\n═══ Experiment 3: Full Installation — Binary Pattern Encoding ═══")
    
    # Target: turn ON tubes [L0-T1, L0-T4, L1-T1, L1-T4, L2-T1]
    # This encodes a pattern visible as a vertical stripe
    target_tubes = [(0, 1), (0, 4), (1, 1), (1, 4), (2, 1)]
    
    exposure_hours = 3.0  # hours per tube
    total_hours = len(target_tubes) * exposure_hours + 12  # extra time to observe decay
    
    config = MachineConfig()
    sim_config = SimConfig(dt=10.0, total_time=total_hours * 3600, log_interval=120)
    
    sim = Simulator(config, sim_config=sim_config)
    
    # Schedule: arm visits each target tube sequentially
    for i, (level, slot) in enumerate(target_tubes):
        t_start = i * exposure_hours * 3600
        t_end = (i + 1) * exposure_hours * 3600
        
        # Move arm to tube's angle (slot * 60°)
        arm_angle = slot * 60
        sim.add_command(Command(time_s=t_start, action='MOVE_ARM',
                                params={'angle': arm_angle}))
        sim.add_command(Command(time_s=t_start, action='SET_LIGHT',
                                params={'on': True}))
        
        # Also rotate the level so this tube faces the arm
        # Tube base angle = slot * 60°, arm at slot * 60° → tube faces arm directly
        # No level rotation needed if arm aligns with tube position
        
        # Turn off light before moving to next tube
        sim.add_command(Command(time_s=t_end, action='SET_LIGHT',
                                params={'on': False}))
    
    results = sim.run()
    
    # Final state
    final = results[-1]
    print(f"\n  Final binary state at t={final.time_h:.1f}h:")
    for level in range(3):
        row = final.binary_states[level]
        print(f"    Level {level}: {row}")
    
    # Target check
    target_set = set(target_tubes)
    correct = 0
    total = 0
    for level in range(3):
        for slot in range(6):
            expected = 1 if (level, slot) in target_set else 0
            actual = final.binary_states[level][slot]
            if expected == actual:
                correct += 1
            total += 1
    print(f"  Accuracy: {correct}/{total} ({100*correct/total:.0f}%)")
    
    # Heatmap over time
    fig = make_subplots(rows=3, cols=1, shared_xaxes=True,
                        subplot_titles=[f'Level {i}' for i in range(3)],
                        vertical_spacing=0.08)
    
    times = [s.time_h for s in results]
    
    for level in range(3):
        z = np.array([[s.positions[level][slot] for s in results] 
                       for slot in range(6)])
        fig.add_trace(go.Heatmap(
            z=z, x=times, y=[f'Tube {s}' for s in range(6)],
            colorscale='Blues', showscale=(level == 0),
            zmin=0, zmax=1,
            hovertemplate='t=%{x:.1f}h<br>%{y}<br>Position: %{z:.2f}',
        ), row=level+1, col=1)
    
    # Mark target tubes
    for level, slot in target_tubes:
        fig.add_annotation(
            x=times[-1] + 0.5, y=f'Tube {slot}',
            text='◆', showarrow=False,
            font=dict(size=14, color='#E91E63'),
            row=level+1, col=1,
        )
    
    fig.update_layout(
        title="Experiment 3: Full Installation — Binary Pattern Encoding",
        height=700, template='plotly_white',
        font=dict(family='Inter, sans-serif'),
    )
    fig.update_xaxes(title_text='Time (hours)', row=3, col=1)
    
    path = os.path.join(FIGURES_DIR, 'exp3_full_installation.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp3_full_installation.png'),
                    width=1200, height=700, scale=2)
    print(f"  Saved: {path}")
    return results


# ═══════════════════════════════════════════════════════════════════════
# EXPERIMENT 4: Machine State Visualization
# ═══════════════════════════════════════════════════════════════════════

def exp4_tower_visualization(results=None):
    """
    Create a top-down tower view showing final state of all tubes.
    """
    if results is None:
        return
    
    print("\n═══ Experiment 4: Tower Top-Down Visualization ═══")
    
    final = results[-1]
    
    fig = go.Figure()
    
    level_radii = [0.8, 0.55, 0.3]
    level_colors = ['#1565C0', '#2E7D32', '#E65100']
    
    for level in range(3):
        for slot in range(6):
            angle = 2 * np.pi * slot / 6
            r = level_radii[level]
            x = r * np.cos(angle)
            y = r * np.sin(angle)
            
            pos = final.positions[level][slot]
            is_up = final.binary_states[level][slot]
            
            fig.add_trace(go.Scatter(
                x=[x], y=[y],
                mode='markers+text',
                marker=dict(
                    size=30 + pos * 20,
                    color=f'rgba({100}, {int(150 + pos*105)}, {255}, {0.4 + pos*0.6})',
                    line=dict(color=level_colors[level], width=2),
                ),
                text=f'{"▲" if is_up else "▼"}',
                textposition='middle center',
                textfont=dict(size=14, color='white' if is_up else '#333'),
                name=f'L{level} T{slot}',
                hovertemplate=f'Level {level}, Tube {slot}<br>Position: {pos:.2f}<br>State: {"FLOAT" if is_up else "SINK"}',
            ))
    
    # Add level labels
    for level, r in enumerate(level_radii):
        fig.add_annotation(x=0, y=r + 0.08, text=f'Level {level}',
                          showarrow=False, font=dict(size=12, color=level_colors[level]))
    
    # Add arm indicator
    arm_angle = np.radians(final.arm_angle_deg)
    fig.add_trace(go.Scatter(
        x=[0, 1.0 * np.cos(arm_angle)], y=[0, 1.0 * np.sin(arm_angle)],
        mode='lines',
        line=dict(color='#F44336' if final.arm_light_on else '#999', width=3, dash='dash'),
        name='Arm' + (' (ON)' if final.arm_light_on else ' (OFF)'),
    ))
    
    fig.update_layout(
        title=f'Tower State at t={final.time_h:.1f}h',
        xaxis=dict(range=[-1.2, 1.2], scaleanchor='y', visible=False),
        yaxis=dict(range=[-1.2, 1.2], visible=False),
        height=600, width=600,
        template='plotly_white',
        font=dict(family='Inter, sans-serif'),
        showlegend=False,
    )
    
    path = os.path.join(FIGURES_DIR, 'exp4_tower_visualization.html')
    fig.write_html(path)
    fig.write_image(os.path.join(FIGURES_DIR, 'exp4_tower_visualization.png'),
                    width=600, height=600, scale=2)
    print(f"  Saved: {path}")


# ═══════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  Cryptographic Beings — Marimo Buoyancy Characterization ║")
    print("╚══════════════════════════════════════════════════════════╝")
    
    # Run all experiments
    exp1_results = exp1_single_tube_light_dark_cycle()
    exp1b_parameter_sweep()
    exp1c_bleaching()
    exp1d_temperature_sweep()
    exp2_results = exp2_single_level()
    exp3_results = exp3_full_installation()
    exp4_tower_visualization(exp3_results)
    
    print("\n✅ All experiments complete!")
    print(f"   Figures saved to: {FIGURES_DIR}/")
