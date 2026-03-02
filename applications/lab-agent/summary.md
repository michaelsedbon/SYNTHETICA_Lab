# Lab Agent

**Created:** 2026-03-02  
**Stack:** Python · FastAPI · Ollama (qwen2.5:14b) · WebSocket  
**Ports:** 8003 (API + WebSocket)

---

## Overview

Autonomous AI lab agent running on the local server (`172.16.1.80`) using Ollama. Controls the Cryptographic Beings machine, reads papers, plans experiments, and documents everything on a visual timeline.

## Architecture

| Component | Description |
|-----------|-------------|
| `agent/core.py` | Main agent loop (think → act → observe) |
| `agent/tools/` | Tool registry (files, terminal, HTTP, machine, knowledge) |
| `agent/timeline.py` | Timeline event logging engine (JSONL) |
| `agent/memory.py` | System prompt builder + context management |
| `server/main.py` | FastAPI server with REST + WebSocket APIs |

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
| `send_command` | Send command to machine Nano |
| `get_machine_status` | Read ESP8266 status |
| `get_machine_log` | Read ESP8266 event log |
| `search_papers` | Search paper corpus |
| `read_paper` | Read full paper text |
| `search_experiments` | Search experiment index |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agent/chat` | Send message, get events |
| GET | `/api/agent/status` | Agent status |
| GET | `/api/agent/sessions` | List all sessions |
| GET | `/api/agent/timeline/{id}` | Get filtered timeline |
| WS | `/ws/agent` | Real-time event stream |

## Running

```bash
# On server (172.16.1.80)
cd /opt/synthetica-lab/applications/lab-agent
pip install -r requirements.txt
OLLAMA_HOST=http://localhost:11434 LAB_WORKSPACE=/opt/synthetica-lab python -m uvicorn server.main:app --host 0.0.0.0 --port 8003
```
