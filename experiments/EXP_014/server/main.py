"""
EXP_014 — Machine Controller Backend
FastAPI server for controlling motors via USB serial (DM556) and HTTP (ESP8266 ISD04).
Loads device config from devices.yaml.
"""
import asyncio
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Optional, Protocol

import httpx
import serial
import serial.tools.list_ports
import yaml
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

APP_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Device Protocol ─────────────────────────────────────────────────────────

class DeviceConnection(Protocol):
    device_id: str
    connected: bool
    device_type: str
    device_info: dict

    async def send(self, command: str) -> str: ...
    def close(self) -> None: ...


# ── USB Serial Motor Connection ─────────────────────────────────────────────

class USBMotorConnection:
    """Manages serial connection to a USB-connected Arduino Nano."""

    def __init__(self, port: str, device_id: str = "unknown", baudrate: int = 115200, info: dict = None):
        self.port = port
        self.device_id = device_id
        self.baudrate = baudrate
        self.ser: Optional[serial.Serial] = None
        self.lock = asyncio.Lock()
        self.connected = False
        self.device_type = "usb_serial"
        self.device_info = info or {}
        self.max_steps: Optional[int] = info.get("max_steps") if info else None
        # Unsolicited firmware events ("EVENT SENSOR:1") accumulate here and are
        # drained by status_poller after each STATUS poll.
        self.event_buffer: list[str] = []

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=2)
            time.sleep(2)  # wait for Nano boot (LED blink + READY message)
            # Drain buffer completely
            for _ in range(5):
                self.ser.read_all()
                time.sleep(0.2)
            self.ser.reset_input_buffer()
            time.sleep(0.1)
            # PING to verify
            self.ser.write(b"PING\n")
            time.sleep(0.5)
            resp = self.ser.read_all().decode("utf-8", errors="replace").strip()
            if "PONG" not in resp:
                logger.warning(f"No PONG from {self.port}, got: {repr(resp)}")
                self.connected = False
                self.ser.close()
                return
            # Try IDENTIFY for new firmware
            self.ser.write(b"IDENTIFY\n")
            time.sleep(0.3)
            ident = self.ser.read_all().decode("utf-8", errors="replace").strip()
            if ident.startswith("MOTOR_") or ident.startswith("SENSOR_"):
                self.device_id = ident
            elif self.device_id == "unknown":
                USBMotorConnection._counter = getattr(USBMotorConnection, '_counter', 0) + 1
                self.device_id = f"MOTOR_{USBMotorConnection._counter}"
            self.connected = True
            logger.info(f"USB connected: {self.device_id} on {self.port}")
        except Exception as e:
            logger.error(f"USB connect failed {self.port}: {e}")
            self.connected = False

    async def send(self, command: str) -> str:
        async with self.lock:
            if not self.ser or not self.connected:
                return "ERROR:NOT_CONNECTED"
            try:
                # Drain any pending unsolicited events that arrived since the
                # last call. We deliberately do NOT reset_input_buffer — that
                # would discard EVENT lines emitted between polls.
                pending = self.ser.read_all().decode("utf-8", errors="replace")
                for line in pending.splitlines():
                    line = line.strip()
                    if line.startswith("EVENT "):
                        self.event_buffer.append(line)
                    # other stale lines (e.g. lingering response) are dropped

                self.ser.write(f"{command}\n".encode())
                await asyncio.sleep(0.3)
                raw = self.ser.read_all().decode("utf-8", errors="replace")

                # Separate the command response from any events that arrived
                # during the 0.3s response window.
                response_lines: list[str] = []
                for line in raw.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("EVENT "):
                        self.event_buffer.append(line)
                    else:
                        response_lines.append(line)
                return "\n".join(response_lines)
            except serial.SerialException as e:
                logger.error(f"Serial disconnected {self.port}: {e}")
                self.connected = False
                try:
                    self.ser.close()
                except Exception:
                    pass
                self.ser = None
                return f"ERROR:DISCONNECTED"
            except Exception as e:
                logger.error(f"Serial error on {self.port}: {e}")
                self.connected = False
                return f"ERROR:{e}"

    def drain_events(self) -> list[str]:
        events = self.event_buffer
        self.event_buffer = []
        return events

    def close(self):
        if self.ser:
            self.ser.close()
        self.connected = False


# ── USB Serial Relay Connection ─────────────────────────────────────────────

class USBRelayConnection:
    """Manages serial connection to a USB-connected Arduino relay controller (EXP_022)."""

    def __init__(self, port: str, device_id: str = "unknown", baudrate: int = 115200, info: dict = None):
        self.port = port
        self.device_id = device_id
        self.baudrate = baudrate
        self.ser: Optional[serial.Serial] = None
        self.lock = asyncio.Lock()
        self.connected = False
        self.device_type = "usb_relay"
        self.device_info = info or {}
        self.num_channels: int = int(info.get("num_channels", 5)) if info else 5

    def connect(self):
        try:
            self.ser = serial.Serial(self.port, self.baudrate, timeout=2)
            time.sleep(2.2)  # wait for Uno auto-reset (DTR pulse on USB-CDC open)
            for _ in range(5):
                self.ser.read_all()
                time.sleep(0.2)
            self.ser.reset_input_buffer()
            time.sleep(0.1)
            self.ser.write(b"PING\n")
            time.sleep(0.4)
            resp = self.ser.read_all().decode("utf-8", errors="replace").strip()
            if "PONG" not in resp:
                logger.warning(f"No PONG from {self.port}, got: {repr(resp)}")
                self.connected = False
                self.ser.close()
                return
            self.ser.write(b"IDENTIFY\n")
            time.sleep(0.3)
            ident = self.ser.read_all().decode("utf-8", errors="replace").strip()
            if ident.startswith("LIGHTS_") or ident.startswith("RELAY_"):
                self.device_id = ident
            self.connected = True
            logger.info(f"Relay connected: {self.device_id} on {self.port}")
        except Exception as e:
            logger.error(f"Relay connect failed {self.port}: {e}")
            self.connected = False

    async def send(self, command: str) -> str:
        async with self.lock:
            if not self.ser or not self.connected:
                return "ERROR:NOT_CONNECTED"
            try:
                self.ser.reset_input_buffer()
                self.ser.write(f"{command}\n".encode())
                await asyncio.sleep(0.15)
                return self.ser.read_all().decode("utf-8", errors="replace").strip()
            except serial.SerialException as e:
                logger.error(f"Serial disconnected {self.port}: {e}")
                self.connected = False
                try:
                    self.ser.close()
                except Exception:
                    pass
                self.ser = None
                return "ERROR:DISCONNECTED"
            except Exception as e:
                logger.error(f"Serial error on {self.port}: {e}")
                self.connected = False
                return f"ERROR:{e}"

    def close(self):
        if self.ser:
            self.ser.close()
        self.connected = False


# ── ESP8266 HTTP Motor Connection ───────────────────────────────────────────

class ESPMotorConnection:
    """Manages HTTP connection to an ESP8266-based motor controller (EXP_002 ISD04)."""

    def __init__(self, host: str, device_id: str, info: dict = None):
        self.host = host
        self.base_url = f"http://{host}"
        self.device_id = device_id
        self.connected = False
        self.device_type = "esp_http"
        self.device_info = info or {}
        self.client = httpx.AsyncClient(timeout=5.0)

    async def probe(self):
        """Check if ESP is reachable."""
        try:
            resp = await self.client.get(f"{self.base_url}/api/ping")
            data = resp.json()
            self.connected = True
            logger.info(f"ESP connected: {self.device_id} at {self.host} — ping: {data}")
        except Exception as e:
            logger.warning(f"ESP unreachable: {self.device_id} at {self.host} — {e}")
            self.connected = False

    # Command mapping: translate unified commands to ESP API paths
    ESP_CMD_MAP = {
        "PING": "/api/ping",
        "STATUS": "/api/status",
        "STOP": "/api/stop",
        "HOME": "/api/home",
        "CALIBRATE": "/api/calibrate",
        "HALF": "/api/half",
    }

    async def send(self, command: str) -> str:
        if not self.connected:
            return "ERROR:NOT_CONNECTED"
        try:
            cmd_upper = command.strip().upper()
            # Simple commands
            if cmd_upper in self.ESP_CMD_MAP:
                resp = await self.client.get(f"{self.base_url}{self.ESP_CMD_MAP[cmd_upper]}")
                return json.dumps(resp.json())
            # MOVE <steps>
            if cmd_upper.startswith("MOVE "):
                steps = int(cmd_upper.split()[1])
                resp = await self.client.get(f"{self.base_url}/api/move", params={"steps": steps})
                return json.dumps(resp.json())
            # MOVETO <pos>
            if cmd_upper.startswith("MOVETO "):
                pos = int(cmd_upper.split()[1])
                resp = await self.client.get(f"{self.base_url}/api/move-to", params={"pos": pos})
                return json.dumps(resp.json())
            # SPEED <val>
            if cmd_upper.startswith("SPEED "):
                val = int(cmd_upper.split()[1])
                resp = await self.client.get(f"{self.base_url}/api/speed", params={"value": val})
                return json.dumps(resp.json())
            # ACCEL <val>
            if cmd_upper.startswith("ACCEL "):
                val = int(cmd_upper.split()[1])
                resp = await self.client.get(f"{self.base_url}/api/accel", params={"value": val})
                return json.dumps(resp.json())
            # GOTO <target> (named positions)
            if cmd_upper.startswith("GOTO "):
                target = command.strip().split(None, 1)[1]
                resp = await self.client.get(f"{self.base_url}/api/goto", params={"target": target})
                return json.dumps(resp.json())
            return f"ERROR:UNKNOWN_CMD:{command}"
        except httpx.TimeoutException:
            return "ERROR:TIMEOUT"
        except Exception as e:
            logger.error(f"ESP error {self.host}: {e}")
            return f"ERROR:{e}"

    def close(self):
        self.connected = False


# ── Device Manager ──────────────────────────────────────────────────────────

class DeviceManager:
    """Manages all motor connections (USB and ESP)."""

    def __init__(self):
        self.motors: dict[str, DeviceConnection] = {}
        self.relays: dict[str, USBRelayConnection] = {}
        self.cameras: dict[str, dict] = {}
        self.ws_clients: list[WebSocket] = []
        self.config: dict = {}

    def load_config(self):
        config_path = os.path.join(APP_DIR, "devices.yaml")
        if os.path.exists(config_path):
            with open(config_path) as f:
                self.config = yaml.safe_load(f) or {}
            logger.info(f"Loaded config: {len(self.config.get('esp_devices', []))} ESP, "
                        f"{len(self.config.get('usb_devices', []))} USB, "
                        f"{len(self.config.get('relay_devices', []))} relay, "
                        f"{len(self.config.get('camera_devices', []))} camera devices")
        else:
            logger.warning(f"No devices.yaml found at {config_path}")

    async def scan_and_connect(self):
        """Connect to all devices defined in devices.yaml."""
        self.close_all()
        self.motors.clear()
        self.relays.clear()
        self.load_config()

        # ── USB devices (config-driven, no vendor scan) ──
        for usb_cfg in self.config.get("usb_devices", []):
            port = usb_cfg["port"]
            device_id = usb_cfg["id"]
            info = {k: v for k, v in usb_cfg.items() if k not in ("id", "port")}
            motor = USBMotorConnection(port, device_id=device_id, info=info)
            if os.path.exists(port):
                motor.connect()
            else:
                logger.warning(f"USB port not found: {port} for {device_id}")
            # Add even if not connected — card shows as disconnected
            self.motors[device_id] = motor

        # ── ESP devices ──
        for esp_cfg in self.config.get("esp_devices", []):
            device_id = esp_cfg["id"]
            info = {k: v for k, v in esp_cfg.items() if k != "id"}
            esp = ESPMotorConnection(esp_cfg["host"], device_id, info=info)
            await esp.probe()
            # Add even if not connected — the card will show as disconnected
            self.motors[device_id] = esp

        # ── Relay devices ──
        for relay_cfg in self.config.get("relay_devices", []):
            port = relay_cfg["port"]
            device_id = relay_cfg["id"]
            info = {k: v for k, v in relay_cfg.items() if k not in ("id", "port")}
            relay = USBRelayConnection(port, device_id=device_id, info=info)
            if os.path.exists(port):
                relay.connect()
            else:
                logger.warning(f"Relay port not found: {port} for {device_id}")
            # Add even if not connected — card shows as disconnected
            self.relays[device_id] = relay

        # ── Camera devices ──
        for cam_cfg in self.config.get("camera_devices", []):
            device_id = cam_cfg["id"]
            host = cam_cfg["host"]
            info = {k: v for k, v in cam_cfg.items() if k != "id"}
            connected = False
            try:
                async with httpx.AsyncClient(timeout=3.0) as client:
                    r = await client.get(f"http://{host}/capture")
                    connected = r.status_code == 200
                    logger.info(f"Camera connected: {device_id} at {host}")
            except Exception:
                logger.warning(f"Camera offline: {device_id} at {host}")
            self.cameras[device_id] = {
                "id": device_id,
                "host": host,
                "connected": connected,
                "type": "esp_camera",
                **{k: v for k, v in info.items() if k not in ("host",)},
            }

    def get_motor(self, motor_id: str) -> Optional[DeviceConnection]:
        return self.motors.get(motor_id)

    def get_relay(self, relay_id: str) -> Optional["USBRelayConnection"]:
        return self.relays.get(relay_id)

    def list_relays(self) -> list[dict]:
        out = []
        for rid, r in self.relays.items():
            entry = {
                "id": rid,
                "connected": r.connected,
                "type": r.device_type,
                "port": r.port,
                "num_channels": r.num_channels,
            }
            if r.device_info:
                entry["description"] = r.device_info.get("description", "")
                entry["experiment"] = r.device_info.get("experiment", "")
                if "channels" in r.device_info:
                    entry["channels"] = r.device_info["channels"]
            out.append(entry)
        return out

    def list_motors(self) -> list[dict]:
        result = []
        for mid, m in self.motors.items():
            entry = {
                "id": mid,
                "connected": m.connected,
                "type": m.device_type,
            }
            if hasattr(m, "port"):
                entry["port"] = m.port
            if hasattr(m, "host"):
                entry["host"] = m.host
            if hasattr(m, "max_steps") and m.max_steps:
                entry["max_steps"] = m.max_steps
            if m.device_info:
                entry["description"] = m.device_info.get("description", "")
                entry["experiment"] = m.device_info.get("experiment", "")
            result.append(entry)
        # Include camera devices
        for cid, cam in self.cameras.items():
            result.append(cam)
        return result

    async def broadcast(self, data: dict):
        for ws in self.ws_clients[:]:
            try:
                await ws.send_json(data)
            except:
                self.ws_clients.remove(ws)

    def close_all(self):
        for m in self.motors.values():
            m.close()
        for r in self.relays.values():
            r.close()

    def save_max_steps(self, motor_id: str, value: int):
        """Persist max_steps to devices.yaml."""
        config_path = os.path.join(APP_DIR, "devices.yaml")
        for section in ["usb_devices", "esp_devices"]:
            for dev in self.config.get(section, []):
                if dev.get("id") == motor_id:
                    dev["max_steps"] = value
                    break
        with open(config_path, "w") as f:
            yaml.dump(self.config, f, default_flow_style=False)
        logger.info(f"Saved max_steps={value} for {motor_id} to devices.yaml")


# ── App Setup ───────────────────────────────────────────────────────────────

mgr = DeviceManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Machine Controller...")
    await mgr.scan_and_connect()
    poller_task = asyncio.create_task(status_poller())
    reconnect_task = asyncio.create_task(reconnection_poller())
    yield
    poller_task.cancel()
    reconnect_task.cancel()
    mgr.close_all()

app = FastAPI(title="Machine Controller", lifespan=lifespan)
app.mount("/static", StaticFiles(directory=os.path.join(APP_DIR, "static")), name="static")


def parse_event(line: str) -> dict:
    """Turn a firmware EVENT line into a partial status dict.

    Examples:
        "EVENT SENSOR:1"                          -> {"sensor": 1}
        "EVENT CAL_DOWN_DONE POS:0 -> ..."        -> {"event": "CAL_DOWN_DONE", "pos": 0, "raw": "..."}
        "EVENT CAL_DONE POS:5000"                 -> {"event": "CAL_DONE", "pos": 5000}
    """
    body = line[len("EVENT "):].strip() if line.startswith("EVENT ") else line.strip()
    out: dict = {"raw": line}
    parts = body.split()
    if parts:
        first = parts[0]
        # Plain "WORD" with no colon is the event name (CAL_DONE, etc.).
        # If it has a colon it's a key:value pair like SENSOR:1.
        if ":" not in first:
            out["event"] = first
            parts = parts[1:]
        for pair in parts:
            if ":" not in pair:
                continue
            k, v = pair.split(":", 1)
            try:
                out[k.lower()] = int(v)
            except ValueError:
                out[k.lower()] = v
    return out


async def status_poller():
    """Poll motor + relay status every second and broadcast to WebSocket clients."""
    while True:
        try:
            for mid, motor in list(mgr.motors.items()):
                if motor.connected and mgr.ws_clients:
                    resp = await motor.send("STATUS")
                    status = parse_status(resp, motor.device_type)
                    status["id"] = mid
                    status["type"] = motor.device_type
                    await mgr.broadcast({"type": "status", "motor": status})
                    # Drain any firmware-pushed events captured during the call
                    # and broadcast them as partial status updates so the UI
                    # picks up edge changes immediately.
                    if hasattr(motor, "drain_events"):
                        for ev in motor.drain_events():
                            partial = parse_event(ev)
                            partial["id"] = mid
                            partial["type"] = motor.device_type
                            await mgr.broadcast({"type": "status", "motor": partial})
                            logger.info(f"{mid} event: {ev}")
            for rid, relay in list(mgr.relays.items()):
                if relay.connected and mgr.ws_clients:
                    resp = await relay.send("STATUS")
                    state = parse_status(resp, "usb_relay")
                    state["id"] = rid
                    state["type"] = relay.device_type
                    await mgr.broadcast({"type": "relay_status", "relay": state})
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Poller error: {e}")
            await asyncio.sleep(2)


async def reconnection_poller():
    """Periodically attempt to reconnect disconnected USB and ESP devices."""
    while True:
        try:
            await asyncio.sleep(15)
            for mid, motor in list(mgr.motors.items()):
                if motor.connected:
                    continue
                # ── USB reconnect ──
                if isinstance(motor, USBMotorConnection):
                    if os.path.exists(motor.port):
                        logger.info(f"Attempting USB reconnect: {mid} on {motor.port}")
                        motor.connect()
                        if motor.connected:
                            logger.info(f"USB reconnected: {mid}")
                            await mgr.broadcast({"type": "reconnect", "device": mid})
                # ── ESP reconnect ──
                elif isinstance(motor, ESPMotorConnection):
                    await motor.probe()
                    if motor.connected:
                        logger.info(f"ESP reconnected: {mid}")
                        await mgr.broadcast({"type": "reconnect", "device": mid})

            # ── Relay reconnect ──
            for rid, relay in list(mgr.relays.items()):
                if relay.connected:
                    continue
                if os.path.exists(relay.port):
                    logger.info(f"Attempting Relay reconnect: {rid} on {relay.port}")
                    relay.connect()
                    if relay.connected:
                        logger.info(f"Relay reconnected: {rid}")
                        await mgr.broadcast({"type": "reconnect", "device": rid})

            # ── Camera reconnect ──
            for cid, cam in mgr.cameras.items():
                if cam.get("connected"):
                    continue
                host = cam["host"]
                try:
                    async with httpx.AsyncClient(timeout=3.0) as client:
                        r = await client.get(f"http://{host}/capture")
                        if r.status_code == 200:
                            cam["connected"] = True
                            logger.info(f"Camera reconnected: {cid}")
                            await mgr.broadcast({"type": "reconnect", "device": cid})
                except Exception:
                    pass

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Reconnection poller error: {e}")
            await asyncio.sleep(5)


def parse_status(raw: str, device_type: str = "usb_serial") -> dict:
    """Parse status response into a dict."""
    if device_type == "esp_http":
        # ESP returns JSON
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                # Normalize keys
                result = {}
                for k, v in data.items():
                    result[k.lower()] = v
                return result
        except:
            pass
    # Serial format: 'POS:0 SPEED:2000 MOVING:0 TARGET:0 SENSOR:0'
    result = {}
    for part in raw.split():
        if ":" in part:
            k, v = part.split(":", 1)
            try:
                result[k.lower()] = int(v)
            except ValueError:
                result[k.lower()] = v
    return result


# ── API Routes ──────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index():
    return FileResponse(os.path.join(APP_DIR, "static", "index.html"))

@app.get("/api/devices")
async def list_devices():
    return {"motors": mgr.list_motors(), "relays": mgr.list_relays()}

# ── Relay endpoints ─────────────────────────────────────────────────────────

@app.get("/api/relays")
async def list_relay_devices():
    return {"relays": mgr.list_relays()}

@app.get("/api/relays/{relay_id}/status")
async def relay_status(relay_id: str):
    relay = mgr.get_relay(relay_id)
    if not relay:
        return {"error": "Relay not found"}
    resp = await relay.send("STATUS")
    state = parse_status(resp, "usb_relay")
    state["id"] = relay_id
    state["type"] = relay.device_type
    state["raw"] = resp
    return state

@app.post("/api/relays/{relay_id}/all/{action}")
async def relay_all_action(relay_id: str, action: str):
    """Set all channels at once. action ∈ {on, off}.

    Declared BEFORE the per-channel route below so FastAPI matches "all" as a
    literal segment rather than trying to parse it as the int `channel`.
    """
    relay = mgr.get_relay(relay_id)
    if not relay:
        return {"error": "Relay not found"}
    action_l = action.lower()
    if action_l not in ("on", "off"):
        return {"error": f"Unknown action: {action}"}
    cmd = f"ALL {action_l.upper()}"
    resp = await relay.send(cmd)
    if relay.connected:
        s_resp = await relay.send("STATUS")
        state = parse_status(s_resp, "usb_relay")
        state["id"] = relay_id
        state["type"] = relay.device_type
        await mgr.broadcast({"type": "relay_status", "relay": state})
    return {"ok": True, "command": cmd, "response": resp}

@app.post("/api/relays/{relay_id}/{channel}/{action}")
async def relay_action(relay_id: str, channel: int, action: str):
    """Set a single relay channel. action ∈ {on, off, toggle}."""
    relay = mgr.get_relay(relay_id)
    if not relay:
        return {"error": "Relay not found"}
    action_l = action.lower()
    if action_l not in ("on", "off", "toggle"):
        return {"error": f"Unknown action: {action}"}
    if channel < 1 or channel > relay.num_channels:
        return {"error": f"Channel out of range (1..{relay.num_channels})"}
    cmd = f"{action_l.upper()} {channel}"
    resp = await relay.send(cmd)
    # Broadcast a fresh status so all UI clients update immediately
    if relay.connected:
        s_resp = await relay.send("STATUS")
        state = parse_status(s_resp, "usb_relay")
        state["id"] = relay_id
        state["type"] = relay.device_type
        await mgr.broadcast({"type": "relay_status", "relay": state})
    return {"ok": True, "command": cmd, "response": resp}

@app.post("/api/relays/{relay_id}/raw")
async def relay_raw(relay_id: str, command: str):
    relay = mgr.get_relay(relay_id)
    if not relay:
        return {"error": "Relay not found"}
    resp = await relay.send(command)
    return {"ok": True, "response": resp}

@app.get("/api/motors/{motor_id}/status")
async def motor_status(motor_id: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("STATUS")
    status = parse_status(resp, motor.device_type)
    status["id"] = motor_id
    status["type"] = motor.device_type
    return status

@app.get("/api/motors/{motor_id}/sensor")
async def motor_sensor(motor_id: str):
    """Read current sensor state — for manual verification before calibration."""
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("STATUS")
    status = parse_status(resp, motor.device_type)
    sensor_val = status.get("sensor", status.get("hall", None))
    return {"id": motor_id, "sensor": sensor_val, "raw": resp}

@app.put("/api/motors/{motor_id}/max_steps")
async def set_max_steps(motor_id: str, value: int):
    """Set max steps for manual calibration (user measures travel by hand)."""
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    motor.max_steps = value
    logger.info(f"{motor_id} max_steps set to {value}")
    # Persist to devices.yaml
    mgr.save_max_steps(motor_id, value)
    await mgr.broadcast({"type": "config", "motor": motor_id, "max_steps": value})
    return {"ok": True, "max_steps": value}

@app.get("/api/motors/{motor_id}/level")
async def get_level(motor_id: str):
    """Get current position as 0-100% of max_steps."""
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("STATUS")
    status = parse_status(resp, motor.device_type)
    pos = status.get("pos", 0)
    max_s = getattr(motor, 'max_steps', None)
    if not max_s:
        return {"id": motor_id, "pos": pos, "percent": None, "max_steps": None}
    percent = round((pos / max_s) * 100, 1)
    percent = max(0, min(100, percent))  # clamp 0-100
    return {"id": motor_id, "pos": pos, "percent": percent, "max_steps": max_s}

@app.post("/api/motors/{motor_id}/level")
async def set_level(motor_id: str, percent: float):
    """Move motor to a position expressed as 0-100% of max_steps."""
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    max_s = getattr(motor, 'max_steps', None)
    if not max_s:
        return {"error": "max_steps not set — calibrate first"}
    target = int((percent / 100.0) * max_s)
    resp = await motor.send(f"MOVETO {target}")
    return {"ok": True, "percent": percent, "target_steps": target, "response": resp}

@app.post("/api/motors/{motor_id}/move")
async def motor_move(motor_id: str, steps: int):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send(f"MOVE {steps}")
    await mgr.broadcast({"type": "command", "motor": motor_id, "cmd": f"MOVE {steps}", "resp": resp})
    return {"ok": True, "response": resp}

@app.post("/api/motors/{motor_id}/moveto")
async def motor_moveto(motor_id: str, position: int):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send(f"MOVETO {position}")
    return {"ok": True, "response": resp}

@app.post("/api/motors/{motor_id}/home")
async def motor_home(motor_id: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("HOME")
    return {"ok": True, "response": resp}

@app.post("/api/motors/{motor_id}/stop")
async def motor_stop(motor_id: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("STOP")
    return {"ok": True, "response": resp}

@app.post("/api/motors/{motor_id}/zero")
async def motor_zero(motor_id: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("ZERO")
    return {"ok": True, "response": resp}

@app.put("/api/motors/{motor_id}/config")
async def motor_config(motor_id: str, speed: Optional[int] = None, accel: Optional[int] = None):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    results = []
    if speed is not None:
        r = await motor.send(f"SPEED {speed}")
        results.append(r)
    if accel is not None:
        r = await motor.send(f"ACCEL {accel}")
        results.append(r)
    return {"ok": True, "responses": results}

@app.post("/api/motors/{motor_id}/raw")
async def motor_raw(motor_id: str, command: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send(command)
    return {"ok": True, "response": resp}

# ESP-specific endpoints (level motors)
@app.post("/api/motors/{motor_id}/calibrate")
async def motor_calibrate(motor_id: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("CALIBRATE")
    return {"ok": True, "response": resp}

@app.post("/api/motors/{motor_id}/half")
async def motor_half(motor_id: str):
    motor = mgr.get_motor(motor_id)
    if not motor:
        return {"error": "Motor not found"}
    resp = await motor.send("HALF")
    return {"ok": True, "response": resp}

@app.post("/api/system/scan")
async def system_scan():
    await mgr.scan_and_connect()
    return {"ok": True, "motors": mgr.list_motors()}

@app.get("/api/system/health")
async def system_health():
    return {"status": "ok", "motors": mgr.list_motors(), "uptime": time.time()}

@app.get("/api/system/config")
async def system_config():
    """Return full device config (experiment refs, firmware paths, etc.)."""
    return mgr.config

@app.post("/api/stop-all")
async def stop_all():
    results = {}
    for mid, motor in mgr.motors.items():
        resp = await motor.send("STOP")
        results[mid] = resp
    return {"ok": True, "results": results}

# ── WebSocket ───────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    mgr.ws_clients.append(ws)
    logger.info(f"WS connected ({len(mgr.ws_clients)} total)")
    try:
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "command":
                motor = mgr.get_motor(msg["motor_id"])
                if motor:
                    resp = await motor.send(msg["command"])
                    await ws.send_json({"type": "response", "motor": msg["motor_id"], "response": resp})
    except WebSocketDisconnect:
        mgr.ws_clients.remove(ws)
        logger.info(f"WS disconnected ({len(mgr.ws_clients)} total)")
