# Lab Agent — Catchup

## 2026-03-02 — Documentation audit
- Created DOCS.md with full API reference, tools, architecture, and config
- Added lab-agent entry to applications/INDEX.md

## 2026-03-02 — Initial build
- Built agent core with think → act → observe loop using Ollama qwen2.5:14b
- 13 tools: file ops, terminal, HTTP, machine control (ESP/Nano), paper corpus search
- Timeline engine (JSONL) for persistent session history
- FastAPI server with REST (`/api/agent/chat`, status, sessions, timeline) + WebSocket
- File browsing API (`/api/files/list`, `/api/files/read`) for direct workspace access
- 3 agent skills: flash_esp, flash_nano, machine_control
- Deployed on 172.16.1.80:8003
