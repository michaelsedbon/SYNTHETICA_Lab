"""
Core agent loop: Think → Act → Observe.
Integrates with Ollama for LLM inference and the tool registry for actions.
"""

import json
import time
import os
from typing import Optional, Generator

from .tools import get_tool_schemas, execute_tool, TOOL_REGISTRY
from .timeline import Timeline
from .memory import build_system_prompt, trim_conversation

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
MODEL = os.environ.get("AGENT_MODEL", "qwen2.5:14b")
DATA_DIR = os.environ.get("AGENT_DATA_DIR", "data/sessions")


def _ollama_chat(messages: list[dict], tools: list[dict] = None) -> dict:
    """Call Ollama chat API with tool support."""
    import urllib.request

    payload = {
        "model": MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "num_predict": 4096,
        },
    }
    if tools:
        payload["tools"] = tools

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=300) as resp:
        return json.loads(resp.read().decode("utf-8"))


class Agent:
    """
    Autonomous lab agent with tool-calling capabilities.
    Runs the think→act→observe loop against Ollama.
    """

    def __init__(
        self,
        session_id: str,
        agent_id: str = "default",
        active_experiment: str = None,
        data_dir: str = None,
    ):
        self.session_id = session_id
        self.agent_id = agent_id
        self.active_experiment = active_experiment
        self.data_dir = data_dir or DATA_DIR

        # Build system prompt
        self.system_prompt = build_system_prompt(active_experiment)

        # Initialize timeline
        self.timeline = Timeline(session_id, self.data_dir, agent_id)

        # Conversation history
        self.messages: list[dict] = [
            {"role": "system", "content": self.system_prompt}
        ]

        # Tool schemas for Ollama
        self.tool_schemas = get_tool_schemas()

        # State
        self.is_running = False
        self.max_iterations = 20  # Safety: max tool-call loops per user message

        self.timeline.log("info", "Agent initialized", f"Model: {MODEL}, Experiment: {active_experiment}")

    def chat(self, user_message: str) -> Generator[dict, None, None]:
        """
        Process a user message through the agent loop.
        Yields timeline events as they happen (for streaming to the UI).
        Uses self-prompting to keep working until the goal is achieved.
        """
        self.is_running = True
        self.messages.append({"role": "user", "content": user_message})
        original_goal = user_message  # Remember what we're trying to achieve

        # Log user message
        event = self.timeline.log("info", "User message", user_message)
        yield event.to_dict()

        iteration = 0
        tool_calls_made = 0
        self_prompts_sent = 0
        max_self_prompts = 5   # Max times we'll ask "are you done?"

        while iteration < self.max_iterations:
            iteration += 1

            # Trim conversation to fit context window
            trimmed = trim_conversation(self.messages, max_tokens=12000)

            # Call Ollama
            thinking_event = self.timeline.log("reasoning", "Calling LLM", f"Iteration {iteration}/{self.max_iterations}")
            yield thinking_event.to_dict()

            try:
                start = time.time()
                response = _ollama_chat(trimmed, self.tool_schemas)
                llm_duration = int((time.time() - start) * 1000)
            except Exception as e:
                error_event = self.timeline.log("error", "LLM call failed", str(e))
                yield error_event.to_dict()
                self.is_running = False
                return

            message = response.get("message", {})
            content = message.get("content", "")
            tool_calls = message.get("tool_calls", [])

            # Add assistant message to history
            self.messages.append(message)

            # If there's text content, log it
            if content:
                reasoning_event = self.timeline.log(
                    "reasoning", "LLM response",
                    content,
                    duration_ms=llm_duration,
                )
                yield reasoning_event.to_dict()

            # If no tool calls — agent wants to stop. Decide if we should let it.
            if not tool_calls:
                # If agent barely did anything, nudge it once to keep going
                if tool_calls_made < 3 and self_prompts_sent == 0:
                    self_prompts_sent += 1
                    nudge = (
                        f"You have only made {tool_calls_made} tool calls. "
                        f"The original goal was: \"{original_goal}\"\n"
                        f"Have you completed ALL steps? If not, keep using tools. "
                        f"If yes, summarize what you did."
                    )
                    self.messages.append({"role": "user", "content": nudge})
                    self.timeline.log("reasoning", "Self-check",
                        f"Agent stopped after {tool_calls_made} tool calls. Nudging once.")
                    continue

                # Agent has done enough work or already been nudged — let it stop
                self.timeline.log("decision", "Goal achieved",
                    f"Agent completed task with {tool_calls_made} tool calls. "
                    f"{content[:100] if content else '(no content)'}")
                self.is_running = False
                return

            # Execute tool calls
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "unknown")
                tool_args = fn.get("arguments", {})

                # Log the call
                self.timeline.log(
                    "tool_call", f"Calling {tool_name}",
                    json.dumps(tool_args, indent=2),
                    tool_name=tool_name,
                    tool_input=tool_args,
                )

                # Execute
                start = time.time()
                result = execute_tool(tool_name, tool_args)
                exec_duration = int((time.time() - start) * 1000)
                tool_calls_made += 1

                # Detect files touched
                files_touched = []
                if tool_name in ("file_write", "file_edit") and "path" in tool_args:
                    files_touched.append(tool_args["path"])

                # Log result
                tool_event = self.timeline.log_tool_call(
                    tool_name, tool_args, result,
                    duration_ms=exec_duration,
                    files_touched=files_touched,
                    experiment=self.active_experiment,
                )
                yield tool_event.to_dict()

                # Add tool result to conversation
                self.messages.append({
                    "role": "tool",
                    "content": result,
                })

        # If we hit max iterations
        warning = self.timeline.log(
            "error", "Max iterations reached",
            f"Agent stopped after {self.max_iterations} tool-call iterations",
        )
        yield warning.to_dict()
        self.is_running = False

    def get_status(self) -> dict:
        """Get current agent status."""
        return {
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "model": MODEL,
            "is_running": self.is_running,
            "active_experiment": self.active_experiment,
            "message_count": len(self.messages),
            "event_count": len(self.timeline.events),
        }
