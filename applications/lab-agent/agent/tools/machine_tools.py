"""
Machine control tools: high-level interface to the Cryptographic Beings machine.
Wraps the ESP8266 REST API at 172.16.1.115.

New API endpoints (/api/*) return structured JSON responses.
Legacy send_command still works via /send?cmd= for backward compatibility.
"""

import urllib.request
import urllib.error
import urllib.parse
import json
import os

MACHINE_IP = os.environ.get("MACHINE_IP", "172.16.1.115")
MACHINE_URL = f"http://{MACHINE_IP}"


# ══════════════════════════════════════════════
# ── API helper ──
# ══════════════════════════════════════════════

def _api_call(endpoint: str, params: dict = None, timeout: int = 120) -> dict:
    """Call an /api/ endpoint and return parsed JSON response."""
    url = f"{MACHINE_URL}/api/{endpoint}"
    if params:
        query = urllib.parse.urlencode(params)
        url += f"?{query}"
    
    req = urllib.request.Request(url, method="GET")
    req.add_header("User-Agent", "SyntheticaLabAgent/2.0")
    
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(body)
        except:
            return {"ok": False, "error": f"HTTP {e.code}: {body}"}
    except Exception as e:
        return {"ok": False, "error": f"unreachable: {e}"}


# ══════════════════════════════════════════════
# ── New API-based tools ──
# ══════════════════════════════════════════════

def motor_status() -> str:
    """Get the full motor status including position, calibration, and hall sensor state.
    
    Returns a human-readable summary of: position, hall sensor, enabled state,
    speed, moving, steps-per-revolution, and calibration status.
    """
    data = _api_call("status")
    if "error" in data and not data.get("pos") and data.get("pos") != 0:
        return f"ERROR: {data['error']}"
    
    cal_str = "yes" if data.get("calibrated", 0) else "no"
    spr = data.get("spr", 0)
    return (
        f"Position: {data.get('pos', '?')} steps | "
        f"Hall: {'triggered' if data.get('hall') else 'clear'} | "
        f"Enabled: {'yes' if data.get('enabled') else 'no'} | "
        f"Speed: {data.get('speed', '?')} sps | "
        f"Moving: {'yes' if data.get('moving') else 'no'} | "
        f"Calibrated: {cal_str} (SPR={spr})"
    )


def motor_half_rotation() -> str:
    """Move the motor exactly half a revolution. Requires calibration to be complete.
    
    The half rotation uses the steps-per-revolution measured during calibration.
    If calibration hasn't completed yet, this will return an error.
    """
    data = _api_call("half", timeout=60)
    if data.get("ok"):
        return f"OK — Half rotation started ({data.get('steps', '?')} steps)"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_home() -> str:
    """Home the motor to the hall sensor reference position.
    
    Moves slowly until the hall sensor triggers, then zeros the position counter.
    This does NOT re-measure steps-per-revolution (use motor_calibrate for that).
    """
    data = _api_call("home", timeout=120)
    if data.get("ok"):
        return "OK — Homed to hall sensor, position zeroed"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_calibrate() -> str:
    """Run full calibration: home to hall sensor, measure steps per revolution.
    
    This takes 1-2 minutes. The motor will:
    1. Home to the hall sensor
    2. Move past the magnet
    3. Do one full revolution back to hall
    4. Store the measured steps-per-revolution
    
    After this, HALF command becomes available.
    """
    data = _api_call("calibrate", timeout=180)
    if data.get("ok"):
        return f"OK — Calibration complete. Steps per revolution: {data.get('spr', '?')}"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_move(steps: int) -> str:
    """Move the motor a relative number of steps.
    
    Positive steps = forward, negative = backward.
    Start with small values (50-100) to test direction.
    
    Args:
        steps: Number of steps to move (positive or negative)
    """
    data = _api_call("move", params={"steps": steps}, timeout=30)
    if data.get("ok"):
        return f"OK — Moving {data.get('steps', steps)} steps"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_move_to(position: int) -> str:
    """Move the motor to an absolute position.
    
    Position is in steps relative to the home/zero point.
    
    Args:
        position: Target absolute position in steps
    """
    data = _api_call("move-to", params={"pos": position}, timeout=30)
    if data.get("ok"):
        return f"OK — Moving to position {data.get('target', position)}"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_stop() -> str:
    """Emergency stop the motor immediately.
    
    Use this if anything seems wrong. Also aborts calibration if in progress.
    """
    data = _api_call("stop", timeout=10)
    if data.get("ok"):
        return "OK — Motor stopped"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_set_speed(speed: int) -> str:
    """Set the motor's maximum speed in steps per second.
    
    Default is 2000. Range: 1-10000.
    Higher microstepping needs proportionally higher speed values.
    
    Args:
        speed: Max speed in steps/second (1-10000)
    """
    data = _api_call("speed", params={"value": speed}, timeout=10)
    if data.get("ok"):
        return f"OK — Speed set to {data.get('speed', speed)} steps/sec"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


def motor_set_accel(accel: int) -> str:
    """Set the motor's acceleration in steps per second².
    
    Default is 1000. Range: 1-50000.
    
    Args:
        accel: Acceleration in steps/sec² (1-50000)
    """
    data = _api_call("accel", params={"value": accel}, timeout=10)
    if data.get("ok"):
        return f"OK — Acceleration set to {data.get('accel', accel)} steps/sec²"
    else:
        return f"ERROR: {data.get('error', 'unknown')}"


# ══════════════════════════════════════════════
# ── Legacy tools (kept for backward compatibility) ──
# ══════════════════════════════════════════════

def send_command(command: str) -> str:
    """Send a raw serial command to the Arduino Nano via the ESP8266 bridge.
    
    LEGACY: Prefer the motor_* tools which use the new JSON API.
    Available commands: MOVE <steps>, HOME, STATUS, STOP, SPEED <us>,
    ENABLE, DISABLE, ZERO, PING, CALIBRATE, HALF, SPR
    
    Returns the Nano's response after a short wait.
    """
    import time
    try:
        url = f"{MACHINE_URL}/send?cmd={urllib.parse.quote(command)}"
        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "SyntheticaLabAgent/1.0")
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                pass
        except urllib.error.HTTPError as e:
            if e.code != 302:  # 302 redirect is expected (success)
                return f"ERROR: HTTP {e.code}: {e.reason}"
        
        # Wait for the Nano to process and respond
        time.sleep(1.5)
        
        # Read the log to get the response
        log_url = f"{MACHINE_URL}/log"
        log_req = urllib.request.Request(log_url)
        log_req.add_header("User-Agent", "SyntheticaLabAgent/1.0")
        with urllib.request.urlopen(log_req, timeout=10) as resp:
            entries = json.loads(resp.read().decode("utf-8"))
        
        # Find the TX>> (our command) and subsequent RX<< (Nano responses)
        result_lines = []
        found_cmd = False
        for entry in entries:
            if f"TX >> {command}" in entry:
                found_cmd = True
                result_lines = [entry]  # Reset — only keep from last matching command
            elif found_cmd and "RX <<" in entry:
                result_lines.append(entry)
        
        if result_lines:
            return "Command sent. Log:\n" + "\n".join(result_lines)
        else:
            return f"Sent '{command}' but no response detected yet. Use get_machine_log() to check later."
    except Exception as e:
        return f"ERROR: Machine unreachable: {e}"


def get_machine_status() -> str:
    """Get the current status of the ESP8266 (IP, uptime, memory, signal)."""
    try:
        url = f"{MACHINE_URL}/status"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "SyntheticaLabAgent/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return json.dumps(data, indent=2)
    except Exception as e:
        return f"ERROR: Machine unreachable: {e}"


def get_machine_log() -> str:
    """Get recent log entries from the ESP8266 (last 50 events)."""
    try:
        url = f"{MACHINE_URL}/log"
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "SyntheticaLabAgent/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            entries = json.loads(resp.read().decode("utf-8"))
            return "\n".join(entries[-20:])  # Last 20 entries
    except Exception as e:
        return f"ERROR: Machine unreachable: {e}"


def run_experiment_script(script_path: str) -> str:
    """Run a Python script from the workspace and return its output.
    
    Use this for long-running operations like characterisation,
    or any multi-step procedure that needs to poll the machine over time.
    The script runs synchronously and its stdout is captured and returned.
    
    Args:
        script_path: Relative path from workspace root (e.g. 'experiments/EXP_002/firmware/calibrate_rotation.py')
    """
    import subprocess
    workspace = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")
    full_path = os.path.join(workspace, script_path)
    
    if not os.path.isfile(full_path):
        return f"ERROR: Script not found: {full_path}"
    
    try:
        result = subprocess.run(
            ["python3", full_path],
            capture_output=True,
            text=True,
            timeout=600,  # 10 minute timeout
            env={
                **os.environ,
                "LAB_WORKSPACE": workspace,
                "MACHINE_IP": MACHINE_IP,
            },
            cwd=workspace,
        )
        output = result.stdout
        if result.stderr:
            output += f"\n\nSTDERR:\n{result.stderr}"
        if result.returncode != 0:
            output += f"\n\nExit code: {result.returncode}"
        return output if output.strip() else "(no output)"
    except subprocess.TimeoutExpired:
        return "ERROR: Script timed out after 600 seconds"
    except Exception as e:
        return f"ERROR: {e}"


# ══════════════════════════════════════════════
# ── Tool registry ──
# ══════════════════════════════════════════════

MACHINE_TOOLS = {
    # ── New API-based tools (preferred) ──
    "motor_status": {
        "function": motor_status,
        "description": "Get full motor status: position, hall sensor, calibration state, speed, steps-per-revolution. Always check this first before moving.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "motor_half_rotation": {
        "function": motor_half_rotation,
        "description": "Move the motor exactly half a revolution. Requires calibration to be complete (the machine auto-calibrates on boot).",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "motor_home": {
        "function": motor_home,
        "description": "Home the motor to the hall sensor. Zeros position. Does NOT remeasure steps-per-revolution.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "motor_calibrate": {
        "function": motor_calibrate,
        "description": "Run full calibration: home + measure steps per revolution. Takes 1-2 minutes. The machine does this on boot, but you can re-run it.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "motor_move": {
        "function": motor_move,
        "description": "Move the motor a relative number of steps. Positive = forward, negative = backward. Start small (50) then increase.",
        "parameters": {
            "type": "object",
            "properties": {
                "steps": {"type": "integer", "description": "Steps to move (positive or negative)"},
            },
            "required": ["steps"],
        },
    },
    "motor_move_to": {
        "function": motor_move_to,
        "description": "Move the motor to an absolute position in steps (relative to home/zero point).",
        "parameters": {
            "type": "object",
            "properties": {
                "position": {"type": "integer", "description": "Target position in steps"},
            },
            "required": ["position"],
        },
    },
    "motor_stop": {
        "function": motor_stop,
        "description": "Emergency stop the motor. Use this if anything seems wrong. Also aborts calibration.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "motor_set_speed": {
        "function": motor_set_speed,
        "description": "Set motor max speed in steps/second. Default 2000, range 1-10000.",
        "parameters": {
            "type": "object",
            "properties": {
                "speed": {"type": "integer", "description": "Max speed in steps/sec (1-10000)"},
            },
            "required": ["speed"],
        },
    },
    "motor_set_accel": {
        "function": motor_set_accel,
        "description": "Set motor acceleration in steps/sec². Default 1000, range 1-50000.",
        "parameters": {
            "type": "object",
            "properties": {
                "accel": {"type": "integer", "description": "Acceleration in steps/sec² (1-50000)"},
            },
            "required": ["accel"],
        },
    },
    # ── Legacy tools (backward compatibility) ──
    "send_command": {
        "function": send_command,
        "description": "LEGACY: Send a raw serial command to the Nano. Prefer motor_* tools instead. Commands: MOVE <steps>, MOVETO <pos>, HOME, STATUS, STOP, SPEED <sps>, ACCEL <a>, ENABLE, DISABLE, ZERO, PING, CALIBRATE, HALF, SPR.",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Command to send (e.g. 'PING', 'MOVE 100', 'STATUS')"},
            },
            "required": ["command"],
        },
    },
    "get_machine_status": {
        "function": get_machine_status,
        "description": "Get ESP8266 controller status (IP, uptime, memory, WiFi). For motor status, use motor_status() instead.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "get_machine_log": {
        "function": get_machine_log,
        "description": "Get the last 20 log entries from the ESP8266 debug log.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "run_experiment_script": {
        "function": run_experiment_script,
        "description": "Run a Python experiment script from the workspace. Timeout: 10 minutes.",
        "parameters": {
            "type": "object",
            "properties": {
                "script_path": {"type": "string", "description": "Path relative to workspace root"},
            },
            "required": ["script_path"],
        },
    },
}
