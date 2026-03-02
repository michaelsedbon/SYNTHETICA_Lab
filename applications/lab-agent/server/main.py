"""
SYNTHETICA Lab Agent — FastAPI Server
Provides REST and WebSocket APIs for the agent UI.
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

# ── Config ──
DATA_DIR = os.environ.get(
    "AGENT_DATA_DIR",
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "sessions"),
)


# ── State ──
active_agents: dict[str, Agent] = {}
ws_clients: list[WebSocket] = []


# ── App ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanup
    active_agents.clear()

app = FastAPI(
    title="SYNTHETICA Lab Agent",
    version="0.1.0",
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
    # Run agent in thread pool to avoid blocking
    loop = asyncio.get_event_loop()

    def run_agent():
        collected = []
        for event in agent.chat(req.message):
            collected.append(event)
            # Schedule broadcast on the event loop
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
    # Check active agents first
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


@app.websocket("/ws/agent")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket for real-time timeline event streaming."""
    await ws.accept()
    ws_clients.append(ws)
    try:
        while True:
            # Keep connection alive, handle incoming messages
            data = await ws.receive_text()
            # Client can send chat messages via WebSocket too
            try:
                msg = json.loads(data)
                if msg.get("type") == "chat":
                    agent = get_or_create_agent(
                        msg.get("session_id"),
                        msg.get("experiment"),
                    )
                    # Run in background
                    loop = asyncio.get_event_loop()

                    def run():
                        for event in agent.chat(msg.get("message", "")):
                            asyncio.run_coroutine_threadsafe(
                                broadcast_event(event), loop
                            )

                    await loop.run_in_executor(None, run)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        if ws in ws_clients:
            ws_clients.remove(ws)


# ── Health check ──
@app.get("/health")
async def health():
    return {"status": "ok", "service": "lab-agent"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
