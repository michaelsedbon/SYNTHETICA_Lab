"""
WebSocket server bridging the mycelium network model to the P5.js frontend.

Runs the NetworkModel at ~30 steps/s and streams state snapshots
to connected browser clients. Receives stimulation commands (add/remove/move
light sources, electrodes) from the frontend.

Usage:
    python server.py       # Starts on ws://localhost:8765
    python server.py 8766  # Custom port
"""

import asyncio
import json
import sys
import os
import time
import numpy as np

# Add model directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from network_model import NetworkModel, NetworkParams
from stimulation import StimulationManager
from music_mapper import MusicMapper, MusicParams, spike_to_web_audio_params

# Custom JSON encoder for NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'websockets'])
    import websockets


# ─── Server ──────────────────────────────────────────────────────────

class SimulationServer:
    """WebSocket server for the mycelium network simulation."""

    def __init__(self, port: int = 8765):
        self.port = port
        self.clients = set()
        self.running = False
        self.paused = False
        self.speed = 1.0  # Simulation speed multiplier

        # Model
        self.net_params = NetworkParams(n_nodes=50)
        self.model = NetworkModel(self.net_params)
        self.model.build_network(seed=42)

        # Stimulation manager
        self.stim_mgr = StimulationManager()

        # Music mapper
        self.music = MusicMapper()

        # Simulation timing
        self.dt = 0.02        # Model time step (s)
        self.target_fps = 30  # WebSocket send rate

    async def register(self, ws):
        """Register a new client and send initial topology."""
        self.clients.add(ws)
        # Send topology + full state on connect
        topo = self.model.get_topology()
        topo['type'] = 'topology'
        topo['stimuli'] = self.stim_mgr.get_all_info()
        topo['music'] = {
            'scale': self.music.params.scale,
            'scale_notes': self.music.get_scale_notes(),
        }
        await ws.send(json.dumps(topo, cls=NumpyEncoder))
        print(f"Client connected ({len(self.clients)} total)")

    async def unregister(self, ws):
        self.clients.discard(ws)
        print(f"Client disconnected ({len(self.clients)} total)")

    async def handle_message(self, ws, message):
        """Handle incoming commands from the frontend."""
        try:
            data = json.loads(message)
            cmd = data.get('cmd')

            if cmd == 'add_stimulus':
                stype = data.get('stim_type', 'optic_fiber')
                sid = data.get('id', f'{stype}_{len(self.stim_mgr.stimuli)}')
                if stype == 'flood_light':
                    self.stim_mgr.add_flood(sid,
                        wavelength=data.get('wavelength', 'uv'),
                        intensity=data.get('intensity', 0.5))
                elif stype == 'optic_fiber':
                    self.stim_mgr.add_fiber(sid,
                        x=data.get('x', 10), y=data.get('y', 10),
                        wavelength=data.get('wavelength', 'uv'),
                        sigma=data.get('sigma', 2.0),
                        intensity=data.get('intensity', 0.5))
                elif stype == 'electrical':
                    self.stim_mgr.add_electrode(sid,
                        x=data.get('x', 10), y=data.get('y', 10),
                        intensity=data.get('intensity', 0.5),
                        sigma=data.get('sigma', 3.0),
                        waveform=data.get('waveform', 'monophasic'),
                        pulse_freq=data.get('pulse_freq', 1.0))
                self.stim_mgr.activate(sid, data.get('intensity', 0.5))
                await self._broadcast_stimuli()

            elif cmd == 'remove_stimulus':
                self.stim_mgr.remove(data.get('id', ''))
                await self._broadcast_stimuli()

            elif cmd == 'move_stimulus':
                self.stim_mgr.move(data.get('id', ''), data.get('x', 0), data.get('y', 0))

            elif cmd == 'set_intensity':
                self.stim_mgr.set_intensity(data.get('id', ''), data.get('intensity', 0.5))

            elif cmd == 'set_sigma':
                self.stim_mgr.set_sigma(data.get('id', ''), data.get('sigma', 2.0))

            elif cmd == 'activate':
                self.stim_mgr.activate(data.get('id', ''), data.get('intensity'))

            elif cmd == 'deactivate':
                self.stim_mgr.deactivate(data.get('id', ''))

            elif cmd == 'pause':
                self.paused = True

            elif cmd == 'resume':
                self.paused = False

            elif cmd == 'reset':
                self.model = NetworkModel(self.net_params)
                self.model.build_network(seed=int(time.time()) % 10000)
                self.stim_mgr = StimulationManager()
                topo = self.model.get_topology()
                topo['type'] = 'topology'
                topo['stimuli'] = []
                await self._broadcast(topo)

            elif cmd == 'set_speed':
                self.speed = max(0.1, min(5.0, data.get('speed', 1.0)))

            elif cmd == 'set_scale':
                self.music.params.scale = data.get('scale', 'minor_pentatonic')

            elif cmd == 'set_nodes':
                n = max(10, min(200, int(data.get('n_nodes', 50))))
                self.net_params.n_nodes = n
                self.model = NetworkModel(self.net_params)
                self.model.build_network(seed=int(time.time()) % 10000)
                self.stim_mgr = StimulationManager()
                topo = self.model.get_topology()
                topo['type'] = 'topology'
                topo['stimuli'] = []
                await self._broadcast(topo)

        except Exception as e:
            print(f"Error handling message: {e}")

    async def _broadcast(self, data: dict):
        """Send data to all connected clients."""
        if self.clients:
            msg = json.dumps(data, cls=NumpyEncoder)
            await asyncio.gather(
                *[client.send(msg) for client in self.clients],
                return_exceptions=True
            )

    async def _broadcast_stimuli(self):
        """Broadcast current stimuli state."""
        await self._broadcast({
            'type': 'stimuli_update',
            'stimuli': self.stim_mgr.get_all_info(),
        })

    async def simulation_loop(self):
        """Main simulation loop — runs continuously."""
        self.running = True
        frame_interval = 1.0 / self.target_fps

        while self.running:
            if not self.paused and self.clients:
                # Advance model
                steps_per_frame = max(1, int(self.speed * 2))
                stimuli = self.stim_mgr.get_active_stimuli()

                for _ in range(steps_per_frame):
                    snapshot = self.model.step(self.dt, stimuli=stimuli)
                    self.stim_mgr.advance_all(self.dt)

                # Generate music events
                music_events = self.music.process_spikes(snapshot)
                audio_params = [spike_to_web_audio_params(n) for n in music_events]

                # Build frame
                frame = {
                    'type': 'frame',
                    't': snapshot['t'],
                    'nodes': snapshot['nodes'],
                    'new_spikes': snapshot['new_spikes'],
                    'stats': self.model.get_stats(),
                    'audio': audio_params,
                }

                await self._broadcast(frame)

            await asyncio.sleep(frame_interval)

    async def handler(self, ws):
        """Handle a WebSocket connection."""
        await self.register(ws)
        try:
            async for message in ws:
                await self.handle_message(ws, message)
        finally:
            await self.unregister(ws)

    async def start(self):
        """Start the server."""
        print(f"Mycelium Network Simulation Server")
        print(f"  WebSocket: ws://localhost:{self.port}")
        print(f"  Nodes: {self.net_params.n_nodes}")
        print(f"  dt: {self.dt}s, target FPS: {self.target_fps}")
        print(f"  Open the P5.js app in your browser to connect.\n")

        async with websockets.serve(self.handler, "0.0.0.0", self.port):
            await self.simulation_loop()


# ─── Main ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    server = SimulationServer(port)
    try:
        asyncio.run(server.start())
    except KeyboardInterrupt:
        print("\nServer stopped.")
