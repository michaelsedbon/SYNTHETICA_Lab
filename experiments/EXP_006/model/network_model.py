"""
Spatial network model of mycelium electrical spiking.

Extends the single-cell integrate-and-fire model (mycelium_spiking.py)
into a graph of coupled nodes representing hyphal tips connected by
gap junctions.

Network structure: Random geometric graph (nodes randomly placed in 2D,
connected if within a coupling radius). Signal propagates via gap junction
coupling at ~0.5 mm/s [Olsson & Hansson 1995].

Each node has:
  - Its own membrane state (V, refractory, active spikes)
  - Photoreceptor state (WC-1 activation dynamics)
  - Adaptation state (fatigue / spike-frequency adaptation)
  - Local light input (can differ per node for fiber stimulation)

Refs:
  - Mishra et al. 2024 — seed paper
  - Olsson & Hansson 1995 — AP propagation speed ~0.5 mm/s
  - Adamatzky 2022 — spiking in mycelial networks
"""

import numpy as np
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from mycelium_spiking import MyceliumParams, SpikeEvent
from photoreceptor import PhotoreceptorParams, PhotoreceptorState, compute_receptor_current
from adaptation import AdaptationParams, AdaptationState


# ─── Network Parameters ─────────────────────────────────────────────

@dataclass
class NetworkParams:
    """Parameters for the spatial network."""
    # Geometry
    n_nodes: int = 50                  # Number of nodes
    arena_size: float = 20.0           # Arena size (mm) — 20×20 mm plate
    connection_radius: float = 5.0     # Connect nodes within this distance (mm)
    min_connections: int = 1           # Ensure at least this many connections per node

    # Gap junction coupling
    g_gap: float = 0.02               # Gap junction conductance
    propagation_speed: float = 0.5    # mm/s [Olsson & Hansson 1995]

    # Variability across nodes
    drive_variability: float = 0.1    # ±10% variation in I_drive per node
    threshold_variability: float = 0.05  # ±5% variation in V_th per node

    # Component params
    cell_params: MyceliumParams = field(default_factory=MyceliumParams)
    photo_params: PhotoreceptorParams = field(default_factory=PhotoreceptorParams)
    adapt_params: AdaptationParams = field(default_factory=AdaptationParams)


# ─── Node State ──────────────────────────────────────────────────────

@dataclass
class NodeState:
    """State of a single node in the network."""
    node_id: int
    x: float                    # Position (mm)
    y: float                    # Position (mm)
    V: float = 0.0              # Membrane voltage (dimensionless)
    refractory_until: float = 0.0
    active_spikes: list = field(default_factory=list)
    I_drive_local: float = 0.22  # This node's drive current (with variability)
    V_th_local: float = 1.0     # This node's threshold
    photoreceptor: PhotoreceptorState = field(default_factory=PhotoreceptorState)
    adaptation: AdaptationState = field(default_factory=AdaptationState)
    last_spike_time: float = -999.0
    total_spikes: int = 0


# ─── Network Model ───────────────────────────────────────────────────

class NetworkModel:
    """
    Mycelium network simulation.

    Usage:
        model = NetworkModel(params)
        model.build_network(seed=42)
        for _ in range(n_steps):
            state = model.step(dt, stimuli=[...])
    """

    def __init__(self, params: Optional[NetworkParams] = None):
        self.params = params or NetworkParams()
        self.nodes: List[NodeState] = []
        self.adjacency: Dict[int, List[int]] = {}  # node_id -> neighbor_ids
        self.edge_delays: Dict[Tuple[int, int], float] = {}  # (i,j) -> delay (s)
        self.t: float = 0.0
        self.rng = None

        # Event log for streaming to frontend
        self.spike_log: List[dict] = []

    def build_network(self, seed: int = 42):
        """
        Generate a random geometric graph.
        Nodes placed uniformly in [0, arena_size]².
        Edges connect nodes within connection_radius.
        """
        self.rng = np.random.default_rng(seed)
        p = self.params
        cp = p.cell_params

        # Place nodes
        self.nodes = []
        for i in range(p.n_nodes):
            x = self.rng.uniform(0, p.arena_size)
            y = self.rng.uniform(0, p.arena_size)

            # Per-node variability
            I_drive = cp.I_drive * (1 + self.rng.uniform(-p.drive_variability,
                                                          p.drive_variability))
            V_th = cp.V_th * (1 + self.rng.uniform(-p.threshold_variability,
                                                     p.threshold_variability))

            node = NodeState(
                node_id=i, x=x, y=y,
                I_drive_local=I_drive,
                V_th_local=V_th,
            )
            self.nodes.append(node)

        # Build adjacency (random geometric graph)
        self.adjacency = {i: [] for i in range(p.n_nodes)}
        self.edge_delays = {}

        positions = np.array([(n.x, n.y) for n in self.nodes])
        for i in range(p.n_nodes):
            for j in range(i + 1, p.n_nodes):
                dist = np.linalg.norm(positions[i] - positions[j])
                if dist <= p.connection_radius:
                    self.adjacency[i].append(j)
                    self.adjacency[j].append(i)
                    # Signal delay based on propagation speed
                    delay = dist / p.propagation_speed if p.propagation_speed > 0 else 0
                    self.edge_delays[(i, j)] = delay
                    self.edge_delays[(j, i)] = delay

        # Ensure minimum connectivity (connect isolated nodes to nearest)
        for i in range(p.n_nodes):
            if len(self.adjacency[i]) < p.min_connections:
                dists = np.linalg.norm(positions - positions[i], axis=1)
                dists[i] = np.inf  # Exclude self
                for existing in self.adjacency[i]:
                    dists[existing] = np.inf  # Exclude existing neighbors
                nearest = np.argmin(dists)
                self.adjacency[i].append(nearest)
                self.adjacency[nearest].append(i)
                dist = np.linalg.norm(positions[i] - positions[nearest])
                delay = dist / p.propagation_speed if p.propagation_speed > 0 else 0
                self.edge_delays[(i, nearest)] = delay
                self.edge_delays[(nearest, i)] = delay

    def step(self, dt: float, stimuli: Optional[list] = None) -> dict:
        """
        Advance the network by one time step.

        Parameters
        ----------
        dt : time step (s)
        stimuli : list of stimulus dicts, each with:
            {
                'type': 'flood_light' | 'optic_fiber' | 'electrical',
                'wavelength': 'blue' | 'uv',    # for light types
                'intensity': float,               # W/cm² or µA
                'x': float, 'y': float,           # position (for fiber/electrode)
                'sigma': float,                    # spread (mm)
                'waveform': 'monophasic' | 'biphasic',  # for electrical
                'active': bool,                   # on/off
            }

        Returns
        -------
        dict : network state snapshot for streaming
        """
        p = self.params
        cp = p.cell_params

        new_spikes = []  # Spike events this step

        for node in self.nodes:
            # ── 1. Compute stimulation current at this node ──
            I_stim = 0.0
            wavelength = 'blue'  # default

            if stimuli:
                for stim in stimuli:
                    if not stim.get('active', True):
                        continue
                    s_type = stim.get('type', 'flood_light')
                    s_intensity = stim.get('intensity', 0.0)

                    if s_type == 'flood_light':
                        wavelength = stim.get('wavelength', 'blue')
                        I_local = s_intensity
                    elif s_type == 'optic_fiber':
                        wavelength = stim.get('wavelength', 'uv')
                        sx, sy = stim.get('x', 0), stim.get('y', 0)
                        sigma = stim.get('sigma', 1.0)
                        dist_sq = (node.x - sx) ** 2 + (node.y - sy) ** 2
                        I_local = s_intensity * np.exp(-dist_sq / (2 * sigma ** 2))
                    elif s_type == 'electrical':
                        sx, sy = stim.get('x', 0), stim.get('y', 0)
                        lam = stim.get('sigma', 2.0)  # Spatial decay length
                        dist = np.sqrt((node.x - sx) ** 2 + (node.y - sy) ** 2)
                        I_local = s_intensity / (1 + (dist / lam) ** 2)
                        # Direct current injection, skip photoreceptor
                        I_stim += I_local
                        continue
                    else:
                        continue

                    # Route light through photoreceptor kinetics
                    activation = node.photoreceptor.step(
                        I_local, wavelength, dt, p.photo_params
                    )
                    I_stim += compute_receptor_current(activation, cp.I_uv_scale)

            # ── 2. Gap junction coupling ──
            I_gap = 0.0
            for neighbor_id in self.adjacency[node.node_id]:
                neighbor = self.nodes[neighbor_id]
                I_gap += p.g_gap * (neighbor.V - node.V)

            # ── 3. Output voltage (sum of active spike shapes) ──
            spike_v = sum(s.voltage_at(self.t) for s in node.active_spikes)
            node.active_spikes = [s for s in node.active_spikes
                                  if self.t - s.t_start < 5 * s.tau_w]

            # ── 4. Subthreshold dynamics ──
            spiked = False
            if self.t >= node.refractory_until:
                noise = cp.noise_std * self.rng.standard_normal()
                I_adapt, amp_scale = node.adaptation.step(
                    dt, spiked=False, params=p.adapt_params
                )

                dV = (-cp.g_L * (node.V - cp.E_L)
                      + node.I_drive_local - I_adapt
                      + I_stim + I_gap + noise) / cp.C
                node.V += dV * dt

                # ── 5. Threshold crossing → spike ──
                if node.V >= node.V_th_local:
                    spiked = True

                    # Sample amplitude and width
                    amp = self.rng.normal(cp.A_mean, cp.A_std)
                    amp = np.clip(amp, cp.A_min, cp.A_max)
                    amp *= amp_scale  # Apply fatigue

                    tw = self.rng.normal(cp.tau_mean, cp.tau_std * 0.3)
                    tw = np.clip(tw, cp.tau_min, cp.tau_max)

                    # Light amplification
                    if I_stim > 0:
                        amp *= (1.0 + I_stim * 2.0)

                    spike = SpikeEvent(t_start=self.t, amplitude=amp, tau_w=tw)
                    node.active_spikes.append(spike)
                    node.last_spike_time = self.t
                    node.total_spikes += 1

                    # Reset and refractory
                    node.V = cp.E_L
                    node.refractory_until = self.t + tw * cp.refractory_factor

                    # Update adaptation with spike
                    node.adaptation.step(dt, spiked=True, params=p.adapt_params)

                    new_spikes.append({
                        'node_id': int(node.node_id),
                        'time': float(self.t),
                        'amplitude': float(amp),
                        'width': float(tw),
                        'x': float(node.x),
                        'y': float(node.y),
                    })

        # Log spikes
        self.spike_log.extend(new_spikes)

        self.t += dt

        # Return state snapshot
        return self._get_snapshot(new_spikes)

    def _get_snapshot(self, new_spikes: list) -> dict:
        """Get JSON-serializable state for streaming."""
        return {
            't': round(self.t, 4),
            'nodes': [
                {
                    'id': n.node_id,
                    'x': round(n.x, 2),
                    'y': round(n.y, 2),
                    'V': round(n.V, 4),
                    'spike_v': round(
                        sum(s.voltage_at(self.t) for s in n.active_spikes), 2
                    ),
                    'receptor': round(n.photoreceptor.R, 4),
                    'fatigue': round(n.adaptation.P, 4),
                    'spiking': self.t - n.last_spike_time < 0.5,
                }
                for n in self.nodes
            ],
            'edges': [
                {'from': i, 'to': j}
                for i in self.adjacency
                for j in self.adjacency[i]
                if j > i  # Avoid duplicates
            ],
            'new_spikes': new_spikes,
        }

    def get_topology(self) -> dict:
        """Get static topology for initial frontend render."""
        return {
            'n_nodes': self.params.n_nodes,
            'arena_size': self.params.arena_size,
            'nodes': [
                {'id': n.node_id, 'x': round(n.x, 2), 'y': round(n.y, 2)}
                for n in self.nodes
            ],
            'edges': [
                {
                    'from': i, 'to': j,
                    'delay': round(self.edge_delays.get((i, j), 0), 3)
                }
                for i in self.adjacency
                for j in self.adjacency[i]
                if j > i
            ],
        }

    def get_stats(self) -> dict:
        """Get network-level statistics."""
        total_spikes = sum(n.total_spikes for n in self.nodes)
        active_nodes = sum(1 for n in self.nodes if n.total_spikes > 0)
        return {
            'time': round(self.t, 2),
            'total_spikes': total_spikes,
            'active_nodes': active_nodes,
            'mean_frequency_hz': total_spikes / max(self.t, 1e-6) / self.params.n_nodes,
            'mean_fatigue': np.mean([n.adaptation.P for n in self.nodes]),
        }


# ─── Main — Basic test ──────────────────────────────────────────────

if __name__ == '__main__':
    print("=" * 60)
    print("Mycelium Network Model — Spatial Graph")
    print("=" * 60)

    params = NetworkParams(n_nodes=50)
    model = NetworkModel(params)
    model.build_network(seed=42)

    topo = model.get_topology()
    n_edges = len(topo['edges'])
    degrees = [len(model.adjacency[i]) for i in range(params.n_nodes)]
    print(f"\nTopology: {params.n_nodes} nodes, {n_edges} edges")
    print(f"Degree: min={min(degrees)}, max={max(degrees)}, mean={np.mean(degrees):.1f}")

    # Run 60s with no light
    print("\n── Spontaneous (60 s) ──")
    dt = 0.01
    for _ in range(int(60 / dt)):
        model.step(dt)
    stats = model.get_stats()
    print(f"  Total spikes: {stats['total_spikes']}")
    print(f"  Active nodes: {stats['active_nodes']}/{params.n_nodes}")
    print(f"  Mean freq: {stats['mean_frequency_hz']:.3f} Hz (target: ~0.12 Hz)")
    print(f"  Mean fatigue: {stats['mean_fatigue']:.3f}")

    # Run 30s with localized UV fiber
    print("\n── Optic fiber UV (30 s, center of plate) ──")
    fiber = {
        'type': 'optic_fiber',
        'wavelength': 'uv',
        'intensity': 0.5,
        'x': params.arena_size / 2,
        'y': params.arena_size / 2,
        'sigma': 2.0,
        'active': True,
    }
    t_before = model.t
    spikes_before = sum(n.total_spikes for n in model.nodes)
    for _ in range(int(30 / dt)):
        model.step(dt, stimuli=[fiber])
    spikes_during = sum(n.total_spikes for n in model.nodes) - spikes_before
    print(f"  Spikes during stimulation: {spikes_during}")
    print(f"  Mean freq: {spikes_during / 30 / params.n_nodes:.3f} Hz")

    # Check spatial locality — nodes near fiber center should spike more
    center = np.array([params.arena_size / 2, params.arena_size / 2])
    near_nodes = [n for n in model.nodes
                  if np.sqrt((n.x - center[0])**2 + (n.y - center[1])**2) < 3.0]
    far_nodes = [n for n in model.nodes
                 if np.sqrt((n.x - center[0])**2 + (n.y - center[1])**2) > 8.0]
    print(f"  Near fiber ({len(near_nodes)} nodes): "
          f"{sum(n.total_spikes for n in near_nodes) / max(len(near_nodes),1):.1f} spikes/node")
    print(f"  Far from fiber ({len(far_nodes)} nodes): "
          f"{sum(n.total_spikes for n in far_nodes) / max(len(far_nodes),1):.1f} spikes/node")

    # Electrical stimulation test
    print("\n── Electrical stimulation (10 s, corner) ──")
    electrode = {
        'type': 'electrical',
        'intensity': 0.5,
        'x': 2.0,
        'y': 2.0,
        'sigma': 3.0,
        'active': True,
    }
    spikes_before = sum(n.total_spikes for n in model.nodes)
    for _ in range(int(10 / dt)):
        model.step(dt, stimuli=[electrode])
    spikes_during = sum(n.total_spikes for n in model.nodes) - spikes_before
    print(f"  Spikes during electrical stim: {spikes_during}")

    print(f"\n{'=' * 60}")
    print(f"Final stats: {model.get_stats()}")
    print(f"{'=' * 60}")
