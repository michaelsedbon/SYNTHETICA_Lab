# CATCHUP — Agent Presence Dashboard

## What is this?

A full-screen kiosk web app that runs on the Linux server's monitor. It displays an animated "face" that represents the AI agent and shows real-time activity feeds. Purpose: give the lab a visual indicator of agent activity without needing to SSH in or check logs.

## When was it built?

**March 4, 2026** — built in a single session.

## Key decisions

1. **Static app (no framework)** — No Next.js, no build step. Just HTML/CSS/JS served by a 90-line Python server. Fastest path to a working kiosk display.

2. **Canvas face rendering** — Uses HTML5 Canvas with `requestAnimationFrame` for smooth 60fps animation. Eyes change color based on which LLM is active (Gemini = blue, Ollama = orange).

3. **White face on dark background** — Started with dark-on-dark (VS Code theme) but the contrast was too low on the server monitor. Iterated to a white/light grey face for maximum visibility.

4. **Screen on/off via xset** — The Python server exposes `POST /screen/on` and `POST /screen/off` which run `xset dpms force on/off`. The app calls these automatically based on agent activity.

5. **Snap Chromium + GNOME autostart** — Ubuntu 24.04 defaults to snap Chromium. Kiosk mode uses `--kiosk --start-fullscreen` flags plus `xdotool key F11` for reliable fullscreen.

6. **Tabbed bottom panel** — Timeline and LLM I/O share the bottom section via tabs. LLM I/O shows formatted inputs/outputs with JSON syntax highlighting.

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `index.html` | ~75 | Two-panel layout, tabbed bottom section |
| `styles.css` | ~530 | VS Code dark theme, face styling, LLM I/O cards, JSON highlighting |
| `face.js` | ~240 | Canvas face renderer: eyes, blinking, saccades, breathing |
| `app.js` | ~320 | WebSocket client, event routing, LLM detection, JSON formatting |
| `serve.py` | ~90 | Python HTTP server + screen control endpoints |
| `screen-control.sh` | ~20 | Shell helper for xset dpms |
| `kiosk-setup.md` | ~120 | Step-by-step Linux kiosk setup guide |

## How it connects to the agent

```
Lab Agent (port 8003)
  ├── WebSocket /ws/agent  ──→  Real-time events
  ├── GET /api/agent/status ──→  Multi-agent detection
  └── GET /api/agent/sessions ──→  Load history on startup
              │
              ▼
Agent Presence Dashboard (port 3005)
  ├── Canvas face animation
  ├── Terminal-style live feed
  ├── Timeline cards
  ├── LLM I/O panel (JSON formatted)
  └── Screen on/off control (xset dpms)
```

## Server setup summary

- **systemd**: `agent-presence.service` (enabled, auto-restart)
- **GDM auto-login**: `/etc/gdm3/custom.conf` → `AutomaticLogin=michael`
- **Lock screen disabled**: via gsettings
- **Chromium kiosk**: `~/.config/autostart/agent-presence.desktop`
- **xdotool**: installed for F11 fullscreen and Ctrl+Shift+R refresh
