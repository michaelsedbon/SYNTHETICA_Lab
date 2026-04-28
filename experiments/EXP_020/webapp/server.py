#!/usr/bin/env python3
"""Static server for EXP_020 cable continuity webapp.

Serves the webapp directory and exposes:
  - GET  /cables.csv        → returns the project cables.csv
  - POST /api/save_result   → appends/replaces a cable record in results/cable_continuity.json
  - GET  /api/results       → returns current results JSON
"""

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8043
HERE = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(HERE, "results")
RESULTS_FILE = os.path.join(RESULTS_DIR, "cable_continuity.json")
CABLES_CSV = os.path.abspath(
    os.path.join(HERE, "..", "..", "..", "projects", "cryptographic_beings", "cables", "cables.csv")
)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/cables.csv":
            self._serve_file(CABLES_CSV, "text/csv")
        elif self.path == "/api/results":
            self._send_json(self._load_results())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/save_result":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                entry = json.loads(body)
                results = self._load_results()
                wn = entry.get("wire_number")
                if entry.get("_deleted"):
                    results = [r for r in results if r.get("wire_number") != wn]
                    replaced = True
                else:
                    replaced = False
                    for i, e in enumerate(results):
                        if e.get("wire_number") == wn:
                            results[i] = entry
                            replaced = True
                            break
                    if not replaced:
                        results.append(entry)
                os.makedirs(RESULTS_DIR, exist_ok=True)
                with open(RESULTS_FILE, "w") as f:
                    json.dump(results, f, indent=2)
                self._send_json({"ok": True, "replaced": replaced, "count": len(results)})
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, path, content_type):
        if not os.path.exists(path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"not found")
            return
        with open(path, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _load_results(self):
        if not os.path.exists(RESULTS_FILE):
            return []
        try:
            with open(RESULTS_FILE) as f:
                return json.load(f)
        except Exception:
            return []


if __name__ == "__main__":
    os.chdir(HERE)
    print(f"Serving EXP_020 cable continuity app on http://0.0.0.0:{PORT}")
    print(f"Results file: {RESULTS_FILE}")
    print(f"Cables CSV:   {CABLES_CSV}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
