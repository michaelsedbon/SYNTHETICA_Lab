# Lab Agent

**Slug:** `lab-agent`  
**Status:** ✅ Working  
**Port:** 8003 (API + WebSocket)

---

## Purpose

Autonomous AI lab agent running on the local server (`172.16.1.80`). Uses **Gemini** (`gemini-2.5-flash`) for task planning and reflection, and **Ollama** (`qwen2.5:14b`) for tool execution. Controls the Cryptographic Beings machine, reads papers, plans experiments, and documents everything on a visual timeline.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python · FastAPI · Ollama API · Gemini API |
| LLMs | Gemini 2.5 Flash (planner/reflector) + qwen2.5:14b (executor, local via Ollama) |
| Real-time | WebSocket event streaming |
| Data | JSONL session timelines |

---

## How to Run

```bash
# On server (172.16.1.80)
cd /opt/synthetica-lab/applications/lab-agent
pip install -r requirements.txt
OLLAMA_HOST=http://localhost:11434 LAB_WORKSPACE=/opt/synthetica-lab \
  python -m uvicorn server.main:app --host 0.0.0.0 --port 8003
```

---

## API Endpoints

### Agent

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/chat` | Send a message to the agent, returns timeline events |
| GET | `/api/agent/status` | Active agent sessions and status |
| GET | `/api/agent/sessions` | List all saved sessions |
| GET | `/api/agent/timeline/{id}` | Get filtered timeline events for a session |
| WS | `/ws/agent` | Real-time event stream (also accepts chat messages) |

### File Browsing (direct, no LLM)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files/list` | List directory contents (`?path=`) |
| GET | `/api/files/read` | Read file content (`?path=`) |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service info + health check |
| GET | `/health` | Health status |

---

## Architecture

```
lab-agent/
  agent/
    core.py         — Plan-Execute-Reflect agent loop (Gemini plans, Ollama executes)
    tools/          — Tool registry (6 modules: files, terminal, http, machine, knowledge, meta)
    timeline.py     — Timeline event logging engine (JSONL)
    memory.py       — System prompt builder + context management
  server/
    main.py         — FastAPI server with REST + WebSocket APIs
  skills/           — Agent skill documents (flash_esp, flash_nano, machine_control)
  data/sessions/    — Persisted session timelines (JSONL)
  ARCHITECTURE.md   — Full system architecture, wiring, network map
```

---

## Tools

| Tool | Description |
|------|-------------|
| `file_read` | Read any file in the workspace |
| `file_write` | Write/create files |
| `file_edit` | Search & replace in files |
| `list_directory` | List directory contents |
| `run_command` | Execute shell commands |
| `run_python` | Run Python scripts |
| `http_request` | Make HTTP requests |
| `send_command` | Send command to machine Nano (via ESP TCP bridge) |
| `get_machine_status` | Read ESP8266 status |
| `get_machine_log` | Read ESP8266 event log |
| `search_papers` | Search paper corpus |
| `read_paper` | Read full paper text |
| `search_experiments` | Search experiment index |

---

## Key Config

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `GEMINI_API_KEY` | (none) | Gemini API key for planner/reflector |
| `LAB_WORKSPACE` | `/opt/synthetica-lab` | Workspace root for file access |
| `AGENT_DATA_DIR` | `data/sessions/` | Session timeline storage |

---

## Routing & Safety

**All tasks** go through Gemini Plan-Execute-Reflect when a Gemini API key is set. Ollama fallback is used only when Gemini is unavailable.

Every `chat()` call has a `source` parameter (`user`, `scheduler`, `telegram`). For automated sources, hazardous hardware commands (MOVE, HOME, STOP, etc.) and dangerous tools (`run_command`, `run_experiment_script`) are **blocked at the tool execution layer**. Only `PING` and `STATUS` are permitted for scheduler/telegram tasks.

See `ARCHITECTURE.md` for the full routing table and `2026-03-03_agent_routing_incident.md` for background.

---

## Skills

Agent-specific skill documents in `skills/`:

| Skill | What it does |
|-------|-------------|
| `flash_esp.md` | Update ESP firmware via OTA |
| `flash_nano.md` | Update Nano firmware remotely via TCP bridge |
| `machine_control.md` | Send commands to the machine, safety rules |

See [ARCHITECTURE.md](ARCHITECTURE.md) for full network map, wiring tables, and machine details.
