"""
SYNTHETICA Lab Agent — FastAPI Server
Provides REST and WebSocket APIs for the agent UI.
Includes: Scheduler (cron tasks), Telegram bot bridge.
Port: 8003
"""

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agent.core import Agent
from agent.timeline import Timeline
from agent.scheduler import scheduler
from agent.telegram_bot import telegram_bot, is_configured as telegram_configured

# ── Config ──
DATA_DIR = os.environ.get(
    "AGENT_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sessions"),
)


# ── State ──
active_agents: dict[str, Agent] = {}
ws_clients: list[WebSocket] = []


# ── Agent callback for scheduler + telegram ──
async def agent_execute(message: str, context: str = None) -> str:
    """Execute a message through the agent. Used by scheduler and Telegram."""
    agent = get_or_create_agent(experiment="EXP_002")
    loop = asyncio.get_event_loop()
    events = []

    def run():
        collected = []
        for event in agent.chat(message, source="scheduler"):
            collected.append(event)
            asyncio.run_coroutine_threadsafe(broadcast_event(event), loop)
        return collected

    events = await loop.run_in_executor(None, run)

    # Extract the final text response
    text_parts = []
    for e in events:
        if e.get("event_type") in ("reasoning", "decision") and e.get("content"):
            text_parts.append(e["content"])

    return "\n\n".join(text_parts[-3:]) if text_parts else "Task completed (no text output)."


# ── App ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start scheduler
    scheduler.set_agent_callback(
        lambda msg, exp=None: agent_execute(msg, exp)
    )
    scheduler_task = asyncio.create_task(scheduler.run_loop())

    # Start Telegram bot
    telegram_task = None
    if telegram_configured():
        telegram_bot.set_agent_callback(
            lambda msg, chat_id: agent_execute(msg, chat_id)
        )
        telegram_task = asyncio.create_task(telegram_bot.run_loop())
        print("[Server] Telegram bot started.")

    print(f"[Server] Scheduler started with {len(scheduler.tasks)} tasks.")

    yield

    # Cleanup
    scheduler.stop()
    if telegram_task:
        telegram_bot.stop()
    active_agents.clear()

app = FastAPI(
    title="SYNTHETICA Lab Agent",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    experiment: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    events: list[dict]


class ScheduleTaskRequest(BaseModel):
    name: str
    message: str
    interval_seconds: int
    experiment: Optional[str] = None


# ── Helper ──
async def broadcast_event(event: dict):
    """Broadcast a timeline event to all WebSocket clients."""
    msg = json.dumps(event)
    disconnected = []
    for ws in ws_clients:
        try:
            await ws.send_text(msg)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        ws_clients.remove(ws)


def get_or_create_agent(session_id: str = None, experiment: str = None) -> Agent:
    """Get an existing agent or create a new one."""
    if session_id and session_id in active_agents:
        return active_agents[session_id]

    sid = session_id or str(uuid.uuid4())[:8]
    agent = Agent(
        session_id=sid,
        agent_id="default",
        active_experiment=experiment or "EXP_002",
        data_dir=DATA_DIR,
    )
    active_agents[sid] = agent
    return agent


# ── Routes ──

@app.post("/api/agent/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Send a message to the agent and get events back."""
    agent = get_or_create_agent(req.session_id, req.experiment)

    events = []
    loop = asyncio.get_event_loop()

    def run_agent():
        collected = []
        for event in agent.chat(req.message, source="user"):
            collected.append(event)
            asyncio.run_coroutine_threadsafe(broadcast_event(event), loop)
        return collected

    events = await loop.run_in_executor(None, run_agent)

    return ChatResponse(session_id=agent.session_id, events=events)


@app.get("/api/agent/status")
async def agent_status():
    """Get status of all active agents."""
    return {
        "agents": {sid: a.get_status() for sid, a in active_agents.items()},
        "total_sessions": len(active_agents),
        "scheduler": {
            "tasks": scheduler.list_tasks(),
        },
        "telegram": {
            "enabled": telegram_configured(),
            "chat_id": telegram_bot._authorized_chat_id,
        },
    }


@app.get("/api/agent/sessions")
async def list_sessions():
    """List all saved sessions."""
    return Timeline.list_sessions(DATA_DIR)


@app.get("/api/agent/timeline/{session_id}")
async def get_timeline(
    session_id: str,
    agent_id: str = None,
    event_type: str = None,
    experiment: str = None,
    limit: int = 200,
):
    """Get timeline events for a session, with optional filters."""
    if session_id in active_agents:
        tl = active_agents[session_id].timeline
    else:
        tl = Timeline.load_session(session_id, DATA_DIR)

    return tl.get_events(
        agent_id=agent_id,
        event_type=event_type,
        experiment=experiment,
        limit=limit,
    )


# ── Scheduler endpoints ──

@app.get("/api/scheduler/tasks")
async def get_scheduled_tasks():
    """List all scheduled tasks."""
    return scheduler.list_tasks()


@app.post("/api/scheduler/tasks")
async def add_scheduled_task(req: ScheduleTaskRequest):
    """Add a new scheduled task."""
    task = scheduler.add_task(req.name, req.message, req.interval_seconds, req.experiment)
    return task.to_dict()


@app.delete("/api/scheduler/tasks/{name}")
async def remove_scheduled_task(name: str):
    """Remove a scheduled task."""
    if scheduler.remove_task(name):
        return {"ok": True, "removed": name}
    return {"ok": False, "error": f"Task '{name}' not found"}


@app.post("/api/scheduler/tasks/{name}/enable")
async def enable_scheduled_task(name: str):
    if scheduler.enable_task(name):
        return {"ok": True, "enabled": name}
    return {"ok": False, "error": f"Task '{name}' not found"}


@app.post("/api/scheduler/tasks/{name}/disable")
async def disable_scheduled_task(name: str):
    if scheduler.disable_task(name):
        return {"ok": True, "disabled": name}
    return {"ok": False, "error": f"Task '{name}' not found"}


# ── Telegram endpoints ──

@app.post("/api/telegram/notify")
async def telegram_notify(message: str):
    """Send a notification to the registered Telegram chat."""
    if not telegram_configured():
        return {"ok": False, "error": "Telegram not configured"}
    telegram_bot.notify(message)
    return {"ok": True}


# ── WebSocket ──

@app.websocket("/ws/agent")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket for real-time timeline event streaming."""
    await ws.accept()
    ws_clients.append(ws)
    try:
        while True:
            data = await ws.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "chat":
                    agent = get_or_create_agent(
                        msg.get("session_id"),
                        msg.get("experiment"),
                    )
                    loop = asyncio.get_event_loop()

                    def run():
                        source = msg.get("source", "user")
                        for event in agent.chat(msg.get("message", ""), source=source):
                            asyncio.run_coroutine_threadsafe(
                                broadcast_event(event), loop
                            )

                    await loop.run_in_executor(None, run)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        if ws in ws_clients:
            ws_clients.remove(ws)


# ── File browsing (direct, no LLM) ──
WORKSPACE = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")

@app.get("/api/files/list")
async def list_files(path: str = ""):
    """List directory contents."""
    target = os.path.join(WORKSPACE, path) if path else WORKSPACE
    target = os.path.realpath(target)
    if not target.startswith(WORKSPACE):
        return {"error": "Outside workspace"}
    if not os.path.isdir(target):
        return {"error": "Not a directory"}
    entries = []
    try:
        for name in sorted(os.listdir(target)):
            if name.startswith("."):
                continue
            full = os.path.join(target, name)
            is_dir = os.path.isdir(full)
            size = os.path.getsize(full) if not is_dir else None
            entries.append({"name": name, "is_dir": is_dir, "size": size})
    except PermissionError:
        return {"error": "Permission denied"}
    return {"path": target, "entries": entries}


@app.get("/api/files/read")
async def read_file(path: str):
    """Read a file's content."""
    target = os.path.join(WORKSPACE, path) if not path.startswith("/") else path
    target = os.path.realpath(target)
    if not target.startswith(WORKSPACE):
        return {"error": "Outside workspace"}
    if not os.path.isfile(target):
        return {"error": "Not a file"}
    try:
        size = os.path.getsize(target)
        if size > 500_000:
            return {"error": f"File too large ({size} bytes)", "path": target}
        with open(target, "r", errors="replace") as f:
            return {"path": target, "content": f.read(), "size": size}
    except Exception as e:
        return {"error": str(e)}


# ── Health check + root ──
@app.get("/")
async def root():
    return {
        "service": "lab-agent",
        "version": "0.2.0",
        "health": "ok",
        "features": {
            "planner": True,
            "scheduler": True,
            "telegram": telegram_configured(),
        },
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "lab-agent"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
