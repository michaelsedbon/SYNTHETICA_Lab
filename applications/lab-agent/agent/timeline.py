"""
Timeline logging engine.
Every agent action is logged as a timeline event and persisted to JSONL files.
Events are broadcast via callback for real-time streaming.
"""

import json
import os
import uuid
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Callable, Optional


@dataclass
class TimelineEvent:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:12])
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    agent_id: str = "default"
    event_type: str = "info"  # reasoning, tool_call, observation, error, decision, info
    title: str = ""
    content: str = ""
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_output: Optional[str] = None
    duration_ms: Optional[int] = None
    files_touched: list = field(default_factory=list)
    parent_id: Optional[str] = None
    session_id: str = ""
    experiment: Optional[str] = None

    def to_dict(self) -> dict:
        d = asdict(self)
        # Remove None values for cleaner JSON
        return {k: v for k, v in d.items() if v is not None}


class Timeline:
    """Timeline event logger with JSONL persistence and real-time broadcast."""

    def __init__(self, session_id: str, data_dir: str, agent_id: str = "default"):
        self.session_id = session_id
        self.agent_id = agent_id
        self.data_dir = data_dir
        self.events: list[TimelineEvent] = []
        self._listeners: list[Callable[[TimelineEvent], None]] = []

        # Ensure directory exists
        os.makedirs(data_dir, exist_ok=True)
        self._file_path = os.path.join(data_dir, f"{session_id}.jsonl")

    def add_listener(self, callback: Callable[[TimelineEvent], None]):
        """Add a real-time listener (e.g., WebSocket broadcast)."""
        self._listeners.append(callback)

    def remove_listener(self, callback: Callable[[TimelineEvent], None]):
        self._listeners = [l for l in self._listeners if l is not callback]

    def log(
        self,
        event_type: str,
        title: str,
        content: str = "",
        tool_name: str = None,
        tool_input: dict = None,
        tool_output: str = None,
        duration_ms: int = None,
        files_touched: list = None,
        experiment: str = None,
        parent_id: str = None,
    ) -> TimelineEvent:
        """Log a timeline event."""
        event = TimelineEvent(
            session_id=self.session_id,
            agent_id=self.agent_id,
            event_type=event_type,
            title=title,
            content=content,
            tool_name=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            duration_ms=duration_ms,
            files_touched=files_touched or [],
            experiment=experiment,
            parent_id=parent_id,
        )
        self.events.append(event)

        # Persist to JSONL
        with open(self._file_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(event.to_dict()) + "\n")

        # Broadcast to listeners
        for listener in self._listeners:
            try:
                listener(event)
            except Exception:
                pass

        return event

    def log_reasoning(self, content: str, experiment: str = None) -> TimelineEvent:
        """Log LLM reasoning/thinking."""
        return self.log("reasoning", "Thinking", content, experiment=experiment)

    def log_tool_call(
        self, tool_name: str, tool_input: dict, tool_output: str,
        duration_ms: int, files_touched: list = None, experiment: str = None,
    ) -> TimelineEvent:
        """Log a tool call with input, output, and duration."""
        return self.log(
            "tool_call",
            f"Tool: {tool_name}",
            f"Called {tool_name}",
            tool_name=tool_name,
            tool_input=tool_input,
            tool_output=tool_output,
            duration_ms=duration_ms,
            files_touched=files_touched,
            experiment=experiment,
        )

    def log_decision(self, title: str, content: str, experiment: str = None) -> TimelineEvent:
        """Log an agent decision."""
        return self.log("decision", title, content, experiment=experiment)

    def log_error(self, title: str, content: str, experiment: str = None) -> TimelineEvent:
        """Log an error."""
        return self.log("error", f"⚠️ {title}", content, experiment=experiment)

    def get_events(
        self,
        agent_id: str = None,
        event_type: str = None,
        experiment: str = None,
        limit: int = 100,
    ) -> list[dict]:
        """Get filtered timeline events."""
        results = self.events
        if agent_id:
            results = [e for e in results if e.agent_id == agent_id]
        if event_type:
            results = [e for e in results if e.event_type == event_type]
        if experiment:
            results = [e for e in results if e.experiment == experiment]
        return [e.to_dict() for e in results[-limit:]]

    @classmethod
    def load_session(cls, session_id: str, data_dir: str) -> "Timeline":
        """Load a timeline from a JSONL file."""
        tl = cls(session_id, data_dir)
        file_path = os.path.join(data_dir, f"{session_id}.jsonl")
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        data = json.loads(line)
                        event = TimelineEvent(**{
                            k: v for k, v in data.items()
                            if k in TimelineEvent.__dataclass_fields__
                        })
                        tl.events.append(event)
        return tl

    @classmethod
    def list_sessions(cls, data_dir: str) -> list[dict]:
        """List all available sessions."""
        sessions = []
        if not os.path.isdir(data_dir):
            return sessions
        for fname in sorted(os.listdir(data_dir)):
            if fname.endswith(".jsonl"):
                sid = fname.replace(".jsonl", "")
                path = os.path.join(data_dir, fname)
                stat = os.stat(path)
                # Read first and last event for time range
                first_time = None
                last_time = None
                event_count = 0
                with open(path, "r") as f:
                    for line in f:
                        event_count += 1
                        data = json.loads(line.strip())
                        if first_time is None:
                            first_time = data.get("timestamp")
                        last_time = data.get("timestamp")
                sessions.append({
                    "session_id": sid,
                    "event_count": event_count,
                    "first_event": first_time,
                    "last_event": last_time,
                    "size_bytes": stat.st_size,
                })
        return sessions
