# Agent Presence Dashboard

**Full-screen kiosk display showing AI agent activity on the lab server's monitor.**

A white animated face with LLM-colored irises watches over the lab. When the agent is active, eyes track, blink, and breathe. A live terminal feed and LLM I/O panel show exactly what the agent is thinking and doing.

---

## Quick Start

```bash
# Local development
cd applications/agent-presence
python3 serve.py
# → http://localhost:3005
```

Requires the lab-agent running on port 8003 (WebSocket at `/ws/agent`).

## Server Deployment

Already deployed as a **systemd service** on `172.16.1.80`:

```bash
sudo systemctl status agent-presence    # Check status
sudo systemctl restart agent-presence   # Restart
journalctl -u agent-presence -f         # View logs
```

Chromium opens automatically in kiosk mode on GNOME login via `~/.config/autostart/agent-presence.desktop`.

For full setup from scratch, see [kiosk-setup.md](kiosk-setup.md).

---

## Architecture

```
agent-presence/
├── index.html          Two-panel layout (face + feed)
├── styles.css          VS Code dark theme, CRT scanlines, LLM I/O styling
├── face.js             Canvas face renderer (eyes, blinking, saccades)
├── app.js              WebSocket client, event routing, LLM I/O, idle detection
├── serve.py            Static file server + screen on/off API (port 3005)
├── screen-control.sh   Shell helper for xset dpms
├── kiosk-setup.md      One-time Linux kiosk setup guide
├── CATCHUP.md          Development log
└── README.md           This file
```

### No Build Step

This is a **static web app** — plain HTML, CSS, and vanilla JavaScript. No Node.js, no bundler, no framework. Served directly by a Python HTTP server.

---

## Features

### Left Panel — Agent Face

- **Canvas-rendered generative face** (600×600px) with:
  - White face background for high contrast on monitors
  - Realistic eye rendering: iris, pupil, highlight
  - **LLM-colored irises**: 🟦 Blue = Gemini, 🟠 Orange = Ollama
  - Smooth eye saccades (random micro-movements) when active
  - Blink animation every 2–6 seconds
  - Breathing animation (subtle scale oscillation)
  - Sleep mode: eyes close when idle
- **LLM badge** below face shows active model name
- **Agent label** with identifier

### Right Panel — Feed & I/O

#### Live Feed (top)
- Terminal-style monospace output with auto-scroll
- Color-coded event types:
  - 🟢 `reasoning` — green
  - 🔵 `plan` — blue
  - 🟡 `decision` — yellow
  - 🟣 `info` — purple
  - 🔴 `error` — red
  - 🟠 `reflect` — orange
  - 🩵 `tool_call` — cyan (shows tool name + duration)
- Max 150 lines, auto-prunes oldest

#### Bottom Tabs
- **⏱ Timeline** — Compact event cards with icons, newest first
- **⚡ LLM I/O** — Dedicated input/output view:
  - **Plan → Gemini** (blue badge) — planning prompts
  - **Reasoning ← Ollama** (green badge) — reasoning output
  - **Tool: name** (cyan badge) — shows ▸ Input / ◂ Output separately
  - **Decision** — final agent decisions
  - **Smart JSON formatting**: auto-detects JSON in content, syntax-highlights keys, strings, numbers, booleans, null
  - **Collapsible cards**: click header to toggle

### Screen Control

- **Auto-on**: Screen turns on when agent starts processing
- **Auto-off**: Screen turns off after 5 minutes of inactivity
- Uses `xset dpms force on/off` via `POST /screen/on` and `POST /screen/off`

### Status Bar

- Connection indicator (green = connected, orange = connecting, red = disconnected)
- Auto-reconnect with exponential backoff
- Real-time clock

---

## Data Sources

| Source | Endpoint | Purpose |
|--------|----------|---------|
| WebSocket | `ws://:8003/ws/agent` | Real-time timeline events |
| REST | `GET /api/agent/status` | Multi-agent detection |
| REST | `GET /api/agent/sessions` | Load recent timeline on startup |
| REST | `GET /api/agent/timeline/{id}` | Fetch session events |
| Local | `POST /screen/on` `POST /screen/off` | Monitor control via xset |

---

## Server Configuration

| Component | Details |
|-----------|---------|
| **Port** | 3005 (Python HTTP + screen control API) |
| **systemd** | `agent-presence.service` (enabled, auto-start) |
| **GDM** | Auto-login enabled for user `michael` |
| **Lock screen** | Disabled (`gsettings lock-enabled=false`) |
| **DPMS** | Controlled by the app (screen off after idle) |
| **Browser** | Chromium (snap v145), kiosk mode via autostart |
| **Tools** | `xdotool` installed for window management |

---

## Refreshing on Server

After pushing code changes:

```bash
# Pull and hard-refresh
ssh michael@172.16.1.80 "cd /opt/synthetica-lab && git pull"
ssh michael@172.16.1.80 "DISPLAY=:0 XAUTHORITY=/run/user/1000/gdm/Xauthority xdotool key ctrl+shift+r"
```
