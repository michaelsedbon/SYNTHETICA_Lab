"""
Machine control tools: high-level interface to the Cryptographic Beings machine.
Wraps the ESP8266 web API at 172.16.1.115.
"""

import urllib.request
import urllib.error
import json
import os

MACHINE_IP = os.environ.get("MACHINE_IP", "172.16.1.115")
MACHINE_URL = f"http://{MACHINE_IP}"


def send_command(command: str) -> str:
    """Send a serial command to the Arduino Nano via the ESP8266 bridge.
    
    Available commands: MOVE <steps>, HOME, STATUS, STOP, SPEED <us>,
    ENABLE, DISABLE, ZERO, PING
    """
    try:
        url = f"{MACHINE_URL}/send?cmd={urllib.parse.quote(command)}"
        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "SyntheticaLabAgent/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            # The ESP redirects to /, but the command is sent
            return f"OK: Sent '{command}' to Nano via ESP bridge"
    except urllib.error.HTTPError as e:
        # 302 redirect is expected (success)
        if e.code == 302:
            return f"OK: Sent '{command}' to Nano via ESP bridge"
        return f"ERROR: HTTP {e.code}: {e.reason}"
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


# Need urllib.parse for quote
import urllib.parse


MACHINE_TOOLS = {
    "send_command": {
        "function": send_command,
        "description": "Send a command to the Cryptographic Beings machine's Arduino Nano via the ESP8266 serial bridge. Commands: MOVE <steps>, HOME, STATUS, STOP, SPEED <us>, ENABLE, DISABLE, ZERO, PING. Be cautious with MOVE — test small values first.",
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
        "description": "Get the current status of the ESP8266 controller (IP, uptime, free memory, WiFi signal strength).",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
    "get_machine_log": {
        "function": get_machine_log,
        "description": "Get the last 20 log entries from the ESP8266 (commands sent, responses received, system events).",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
}
