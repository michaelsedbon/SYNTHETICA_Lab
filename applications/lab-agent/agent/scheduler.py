"""
Simple task scheduler for the lab agent.
Runs periodic tasks (e.g., hourly machine status checks) using asyncio.
"""

import asyncio
import json
import os
import time
from datetime import datetime
from typing import Optional

DATA_DIR = os.environ.get("AGENT_DATA_DIR", "data/sessions")
WORKSPACE = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab")


class ScheduledTask:
    """A recurring task definition."""

    def __init__(self, name: str, message: str, interval_seconds: int,
                 experiment: Optional[str] = None, enabled: bool = True):
        self.name = name
        self.message = message  # What to send to the agent
        self.interval_seconds = interval_seconds
        self.experiment = experiment
        self.enabled = enabled
        self.last_run: Optional[float] = None
        self.run_count: int = 0

    def is_due(self) -> bool:
        if not self.enabled:
            return False
        if self.last_run is None:
            return True
        return (time.time() - self.last_run) >= self.interval_seconds

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "message": self.message,
            "interval_seconds": self.interval_seconds,
            "interval_human": _human_interval(self.interval_seconds),
            "experiment": self.experiment,
            "enabled": self.enabled,
            "last_run": datetime.fromtimestamp(self.last_run).isoformat() if self.last_run else None,
            "run_count": self.run_count,
        }


def _human_interval(seconds: int) -> str:
    """Convert seconds to human-readable interval."""
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


# ── Default tasks ─────────────────────────────────────────────────

DEFAULT_TASKS = [
    ScheduledTask(
        name="hourly_status",
        message="Check the machine status with PING and STATUS commands. "
                "If anything is abnormal, log it to AGENT_STATE.md. "
                "Otherwise just note the time and status briefly.",
        interval_seconds=3600,  # Every hour
    ),
    ScheduledTask(
        name="daily_summary",
        message="Write a brief daily summary to AGENT_STATE.md. "
                "Review what experiments are active, what the machine state is, "
                "and what should be done next. Keep it to 5-10 lines.",
        interval_seconds=86400,  # Every 24 hours
        enabled=False,  # Disabled by default — user can enable
    ),
]


class Scheduler:
    """Manages and runs periodic agent tasks."""

    def __init__(self):
        self.tasks: dict[str, ScheduledTask] = {}
        self._running = False
        self._agent_callback = None  # Set by server to trigger agent.chat()

        # Load defaults
        for task in DEFAULT_TASKS:
            self.tasks[task.name] = task

    def set_agent_callback(self, callback):
        """Set the function to call when a task is due.
        Callback signature: async def callback(message: str, experiment: str = None)
        """
        self._agent_callback = callback

    def add_task(self, name: str, message: str, interval_seconds: int,
                 experiment: str = None) -> ScheduledTask:
        """Add or update a scheduled task."""
        task = ScheduledTask(name, message, interval_seconds, experiment)
        self.tasks[name] = task
        return task

    def remove_task(self, name: str) -> bool:
        if name in self.tasks:
            del self.tasks[name]
            return True
        return False

    def enable_task(self, name: str) -> bool:
        if name in self.tasks:
            self.tasks[name].enabled = True
            return True
        return False

    def disable_task(self, name: str) -> bool:
        if name in self.tasks:
            self.tasks[name].enabled = False
            return True
        return False

    def list_tasks(self) -> list[dict]:
        return [t.to_dict() for t in self.tasks.values()]

    async def run_loop(self):
        """Main scheduler loop. Checks every 60 seconds for due tasks."""
        self._running = True
        while self._running:
            for task in self.tasks.values():
                if task.is_due() and self._agent_callback:
                    task.last_run = time.time()
                    task.run_count += 1
                    try:
                        await self._agent_callback(task.message, task.experiment)
                    except Exception as e:
                        print(f"[Scheduler] Task '{task.name}' failed: {e}")
            await asyncio.sleep(60)  # Check every minute

    def stop(self):
        self._running = False


# Singleton
scheduler = Scheduler()
