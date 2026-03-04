"""
Agent Presence Dashboard — Static file server with screen control.
Serves the dashboard on port 3005 and provides screen on/off endpoints.
"""

import http.server
import json
import os
import subprocess
import threading
from functools import partial
from urllib.parse import urlparse

PORT = int(os.environ.get("PRESENCE_PORT", 3005))
DISPLAY = os.environ.get("DISPLAY", ":0")
STATIC_DIR = os.path.dirname(os.path.abspath(__file__))


class PresenceHandler(http.server.SimpleHTTPRequestHandler):
    """Serve static files + screen control API."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/screen/on":
            self._screen_on()
            self._respond(200, {"ok": True, "action": "screen_on"})
        elif path == "/screen/off":
            self._screen_off()
            self._respond(200, {"ok": True, "action": "screen_off"})
        else:
            self._respond(404, {"error": "Not found"})

    def _screen_on(self):
        """Turn the monitor on."""
        env = {**os.environ, "DISPLAY": DISPLAY}
        try:
            subprocess.run(["xset", "dpms", "force", "on"], env=env, timeout=5)
            subprocess.run(["xset", "s", "reset"], env=env, timeout=5)
        except Exception as e:
            print(f"[screen-on] Error: {e}")

    def _screen_off(self):
        """Turn the monitor off."""
        env = {**os.environ, "DISPLAY": DISPLAY}
        try:
            subprocess.run(["xset", "dpms", "force", "off"], env=env, timeout=5)
        except Exception as e:
            print(f"[screen-off] Error: {e}")

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        """Suppress routine request logging."""
        if "/screen/" in str(args[0]) or args[1] != "200":
            super().log_message(format, *args)


def main():
    server = http.server.HTTPServer(("0.0.0.0", PORT), PresenceHandler)
    print(f"[Agent Presence] Serving on http://0.0.0.0:{PORT}")
    print(f"[Agent Presence] Static dir: {STATIC_DIR}")
    print(f"[Agent Presence] Screen control: DISPLAY={DISPLAY}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Agent Presence] Shutting down.")
        server.shutdown()


if __name__ == "__main__":
    main()
