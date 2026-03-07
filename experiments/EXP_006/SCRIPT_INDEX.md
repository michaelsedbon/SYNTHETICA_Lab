# EXP_006 — Script & File Index

Index of all scripts, firmware, data files, and generated artifacts.

---

## Model Scripts (`model/`)

| File | Description |
|------|-------------|
| `mycelium_spiking.py` | Single-cell conductance-based integrate-and-fire model (original) |
| `network_model.py` | Spatial 50-node network with gap junction coupling |
| `photoreceptor.py` | WC-1 blue-light photoreceptor kinetics (Hill function) |
| `adaptation.py` | Spike-frequency adaptation + resource depletion (fatigue) |
| `stimulation.py` | Optic fiber, flood light, and electrical stimulation manager |
| `music_mapper.py` | Bio→Music mapping (spike features → MIDI / Web Audio) |
| `server.py` | WebSocket server streaming network state at 30fps |
| `plot_results.py` | Generate validation plots (5 scenarios) |

## Generated Plots (`model/plots/`)

| File | Description |
|------|-------------|
| `01_spontaneous_spiking.png` | 5-minute baseline recording |
| `02_blue_light.png` | Blue light stimulation response |
| `03_uv_intensity_sweep.png` | UV amplitude vs intensity (4 levels) |
| `04_robot_protocol.png` | Repeated UV protocol (1s every 20s) |
| `05_distributions.png` | Amplitude and width histograms vs paper |

## Application

| File | Description |
|------|-------------|
| `applications/mycelium-sim/index.html` | P5.js interactive network visualization |
| `applications/mycelium-sim/README.md` | Full application documentation |
