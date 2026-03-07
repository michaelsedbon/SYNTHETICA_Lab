# Mycelium Network — Interactive Simulator

**Real-time spatial simulation of fungal mycelium electrical spiking with interactive light and electrical stimulation.**

A P5.js app connected via WebSocket to a Python network model. Place optic fibers, flood lights, or electrodes on a 50-node mycelial network and watch signal propagation in real-time. Includes browser-based sonification (spikes → musical notes).

---

## Quick Start

```bash
# Terminal 1: Start the simulation server
cd experiments/EXP_006/model
python3 server.py
# → ws://localhost:8765

# Terminal 2: Open the app
open applications/mycelium-sim/index.html
```

Requires: Python 3.9+, `numpy`, `scipy`, `websockets`

---

## Architecture

```
applications/mycelium-sim/
└── index.html          P5.js single-page app (no build step)

experiments/EXP_006/model/
├── network_model.py    Spatial random geometric graph (50 nodes, gap junctions)
├── photoreceptor.py    WC-1 blue-light receptor kinetics (Hill function)
├── adaptation.py       Spike-frequency adaptation + resource depletion
├── stimulation.py      Optic fiber, flood light, electrical stimulation
├── music_mapper.py     Spike features → MIDI/Web Audio parameters
├── server.py           WebSocket server (30fps state streaming)
├── mycelium_spiking.py Original single-cell model [EXP_006]
└── plot_results.py     Matplotlib validation plots
```

### No Build Step

The frontend is a **static web app** — plain HTML, CSS, vanilla JavaScript, and P5.js loaded from CDN. No Node.js, no bundler, no framework.

---

## Features

### Network Visualization (P5.js Canvas)

- **50-node random geometric graph** rendered as circles (nodes) and lines (edges)
- **Real-time spiking**: nodes flash red/orange when firing, ripple effect radiates outward
- **Edge highlighting**: connections glow teal during signal propagation
- **Stimulus zones**: purple rings (UV fiber), blue rings (blue light), yellow rings (electrode)
- **Fatigue visualization**: node opacity decreases with resource depletion

### Stimulation Tools (Sidebar)

| Tool | Icon | Effect |
|------|------|--------|
| UV Fiber | 🟣 | Localized UV light (Gaussian falloff from click position) |
| Blue Light | 🔵 | Localized blue light via fiber |
| Flood UV | 💡 | Uniform UV across all nodes |
| Electrode | ⚡ | Current injection with spatial decay |

- **Intensity slider** — 0.0 to 1.0 W/cm² (light) or µA (electrical)
- **Spot size slider** — 0.5 to 8.0 mm Gaussian sigma
- Click anywhere on the canvas to place a stimulus at that position
- Active sources listed with remove (✕) buttons

### Simulation Controls

- **Speed** — 0.1× to 5.0× time multiplier
- **Nodes** — 10 to 200 (rebuilds network on change)
- **Pause / Resume**
- **Reset** — new random network topology

### Sonification (Web Audio API)

- **Toggle sound on/off** — each spike generates a tone
- **Scale selection**: Minor Pentatonic, Major Pentatonic, Minor, Major, Dorian, Blues, Whole Tone
- **Volume control** — 0–100%
- **Mapping**:
  - Spike amplitude → note velocity (louder for bigger spikes)
  - Node Y position → pitch (higher = higher note)
  - Node X position → stereo pan (left/right spatial audio)
  - Network quadrant → instrument type (sine / triangle)

### Live Stats

- Simulation time (s)
- Node count / edge count
- Total spike count
- Mean firing frequency (Hz)
- Network fatigue level (%)

---

## Model Details

### Network

- **Random geometric graph**: nodes placed uniformly in 20×20 mm arena
- **Gap junction coupling**: $g_{gap} = 0.02$, signal propagates at ~0.5 mm/s
- **Per-node variability**: ±10% drive current, ±5% threshold
- **Connection radius**: 5 mm (nodes within radius are connected)

### Photoreceptor — WC-1

- Hill-function activation: $R_\infty = I^n / (K^n + I^n)$
- Asymmetric kinetics: fast on ($\tau_{act} = 0.3$ s), slow off ($\tau_{deact} = 1.5$ s)
- Wavelength sensitivity: UV = 3×, Blue = 1×, Red/White = 0

### Adaptation

- Adaptation current: $dw/dt = -w/\tau_a + b \cdot \delta(\text{spike})$
- Resource depletion: pool depletes per spike, recovers with $\tau_{recovery} = 60$ s
- Minimum 30% baseline (never fully silenced)

### Stimulation Modes

| Mode | Spatial Model | Parameters |
|------|---------------|------------|
| Optic Fiber | $I(r) = I_0 \exp(-r^2 / 2\sigma^2)$ | intensity, position, sigma |
| Flood Light | Uniform $I_0$ to all nodes | intensity |
| Electrical | $I(r) = I_0 / (1 + (r/\lambda)^2)$ | intensity, position, sigma, waveform |

Electrical waveforms: monophasic, biphasic, pulse train (configurable frequency/width).

---

## Data Flow

```
Python Model                    WebSocket                 Browser
─────────────                    ─────────                 ───────
NetworkModel.step()  ──→  JSON frame (30fps)  ──→  P5.js draw()
                                                   Web Audio playTone()
Browser clicks       ──→  JSON command       ──→  StimulationManager
```

| Direction | Format | Content |
|-----------|--------|---------|
| Server → Client | `topology` | Initial node positions, edges, delays |
| Server → Client | `frame` | Node voltages, spike events, stats, audio params |
| Client → Server | `add_stimulus` | Type, position, intensity, sigma |
| Client → Server | `remove_stimulus` | Stimulus ID |
| Client → Server | `move_stimulus` | New x, y coordinates |
| Client → Server | `pause` / `resume` / `reset` | Simulation control |
| Client → Server | `set_speed` / `set_nodes` / `set_scale` | Parameter changes |

---

## References

- Mishra et al. 2024, *Science Robotics* — seed paper (original spiking data)
- Olsson & Hansson 1995 — AP propagation speed ~0.5 mm/s in mycelia
- Yu & Fischer 2019, *Nat Rev Microbiol* — light sensing in fungi
