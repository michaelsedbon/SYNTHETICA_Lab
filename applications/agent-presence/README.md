# Agent Presence Dashboard

**Full-screen kiosk display showing AI agent activity on the lab server's monitor.**

Animated face with live terminal feed and timeline. Eyes change color by LLM (blue=Gemini, orange=Ollama). Screen turns on automatically when agents are active, turns off after 5 minutes idle.

## How to Run

```bash
cd applications/agent-presence
python3 serve.py
# → http://localhost:3005
```

Requires the lab-agent running on port 8003 (WebSocket at `/ws/agent`).

## Kiosk Mode (Server)

See [kiosk-setup.md](kiosk-setup.md) for auto-login + Chromium kiosk configuration.

## Architecture

```
agent-presence/
  index.html        — Two-panel layout (face + feed)
  styles.css        — VS Code dark theme, CRT scanlines
  face.js           — Canvas face renderer (eyes, blinking, saccades)
  app.js            — WebSocket client, event routing, idle detection
  serve.py          — Static file server + screen on/off API (port 3005)
  screen-control.sh — Shell helper for xset dpms
  kiosk-setup.md    — One-time Linux kiosk setup guide
```

## Data Sources

| Source | Endpoint | Purpose |
|--------|----------|---------|
| WebSocket | `ws://:8003/ws/agent` | Real-time timeline events |
| REST | `/api/agent/status` | Multi-agent detection |
| REST | `/api/agent/sessions` | Load recent timeline on startup |
| Local | `POST /screen/on` `POST /screen/off` | Monitor control via xset |
