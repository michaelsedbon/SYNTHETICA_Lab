"""
Camera tools: capture images from the ESP32-CAM module.
Wraps the ESP32-CAM HTTP server at 172.16.1.120.

Endpoints:
  GET /capture  → JPEG image
  GET /         → Web UI (HTML)
"""

import urllib.request
import urllib.error
import os
import time
from datetime import datetime

CAMERA_IP = os.environ.get("CAMERA_IP", "172.16.1.120")
CAMERA_URL = f"http://{CAMERA_IP}"


def camera_capture(filename: str = "") -> str:
    """Capture a JPEG image from the ESP32-CAM and save it to the workspace.

    The image is saved to experiments/EXP_002/captures/ with a timestamped
    filename if none is provided.

    Args:
        filename: Optional filename (e.g. 'test.jpg'). Auto-generated if empty.

    Returns:
        Path to the saved image, or error message.
    """
    workspace = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")
    capture_dir = os.path.join(workspace, "experiments", "EXP_002", "captures")
    os.makedirs(capture_dir, exist_ok=True)

    if not filename:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"capture_{timestamp}.jpg"
    if not filename.endswith(".jpg"):
        filename += ".jpg"

    save_path = os.path.join(capture_dir, filename)
    url = f"{CAMERA_URL}/capture"

    try:
        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "SyntheticaLabAgent/2.0")

        with urllib.request.urlopen(req, timeout=10) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "image" not in content_type:
                return f"ERROR: Unexpected content type: {content_type}"

            data = resp.read()
            if len(data) < 1000:
                return f"ERROR: Image too small ({len(data)} bytes) — camera may not be working"

            with open(save_path, "wb") as f:
                f.write(data)

            size_kb = len(data) / 1024
            return f"OK — Captured {size_kb:.1f} KB image → {save_path}"

    except urllib.error.URLError as e:
        return f"ERROR: Camera unreachable at {CAMERA_IP}: {e.reason}"
    except Exception as e:
        return f"ERROR: {type(e).__name__}: {e}"


def camera_status() -> str:
    """Check if the ESP32-CAM is reachable and responding.

    Fetches the root page and checks for a valid response.
    Also reports the camera IP address.
    """
    url = f"{CAMERA_URL}/"

    try:
        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "SyntheticaLabAgent/2.0")

        with urllib.request.urlopen(req, timeout=5) as resp:
            html = resp.read().decode("utf-8", errors="replace")
            # Extract info from the HTML page
            info = f"Camera online at {CAMERA_IP}"
            if "PSRAM: YES" in html:
                info += " | PSRAM: YES"
            elif "PSRAM: NO" in html:
                info += " | PSRAM: NO"
            if "Heap:" in html:
                try:
                    heap = html.split("Heap: ")[1].split(" KB")[0]
                    info += f" | Heap: {heap} KB"
                except:
                    pass
            info += f" | Capture: {CAMERA_URL}/capture"
            info += f" | Stream: {CAMERA_URL}:81/stream"
            return info

    except urllib.error.URLError as e:
        return f"Camera OFFLINE at {CAMERA_IP}: {e.reason}"
    except Exception as e:
        return f"Camera OFFLINE at {CAMERA_IP}: {e}"


# ══════════════════════════════════════════════
# ── Tool registry ──
# ══════════════════════════════════════════════

CAMERA_TOOLS = {
    "camera_capture": {
        "function": camera_capture,
        "description": "Capture a JPEG image from the ESP32-CAM and save it. Returns the file path of the saved image. Images are saved to experiments/EXP_002/captures/.",
        "parameters": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Optional filename (e.g. 'test.jpg'). Auto-generated with timestamp if empty.",
                },
            },
        },
    },
    "camera_status": {
        "function": camera_status,
        "description": "Check if the ESP32-CAM camera is online and reachable. Returns connection status, PSRAM, and memory info.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
}
