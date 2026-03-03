"""
Core agent loop: Plan → Execute → Reflect.

Architecture (when Gemini is available):
  1. PLAN:    Gemini decomposes user goal into numbered steps
  2. EXECUTE: Ollama runs existing ReAct loop for each step
  3. REFLECT: Gemini summarises outcomes and updates AGENT_STATE.md

Falls back to the original ReAct-only loop when no Gemini key is set.
"""

import json
import re
import time
import os
from typing import Generator

from .tools import get_tool_schemas, execute_tool, TOOL_REGISTRY
from .timeline import Timeline
from .memory import build_system_prompt, trim_conversation
from .llm import ollama_chat, gemini_chat, has_gemini, OLLAMA_MODEL, OLLAMA_CODER_MODEL, GEMINI_MODEL

DATA_DIR = os.environ.get("AGENT_DATA_DIR", "data/sessions")

# ── Planning prompts ────────────────────────────────────────────────

PLANNER_SYSTEM = """You are a planning module for a lab agent that controls the Cryptographic Beings machine.
Your job is to break a user goal into a numbered list of concrete steps.

Available tools the executor has:
- file_read(path) — read a file
- file_write(path, content) — write/create a file
- file_edit(path, old_text, new_text) — edit part of a file
- run_command(command, cwd) — run a shell command
- http_request(method, url, body) — make an HTTP request
- send_command(command) — send serial command to the machine (PING, HOME, STATUS, MOVE, LEVEL, LIGHT, etc.)
- get_machine_log(lines) — read recent machine serial log
- search_papers(query) — search the paper corpus
- search_experiments(query) — search experiment files

Rules:
1. Each step must be a single, concrete action (not "analyze and then...")
2. Include verification steps (e.g., "Check STATUS after MOVE")
3. Always start hardware tasks with PING
4. End with a logging step (update LOG.md or AGENT_STATE.md)
5. Return ONLY the numbered list, no preamble
6. Maximum 15 steps
"""

REFLECTOR_SYSTEM = """You are a reflection module for a lab agent. You just completed a task.
Given the execution log below, write a brief reflection in this exact format:

## Task Summary
(1-2 sentences: what was done)

## Results
(Key findings or outcomes, bullet points)

## Issues
(Any failures, retries, or unexpected behavior — or "None")

## Next Steps
(What should be done next, bullet points)

Keep it concise. This will be appended to the agent's persistent memory file.
"""

# Keywords that suggest a task needs planning (vs simple one-shot)
COMPLEX_KEYWORDS = {
    "calibrate", "analyze", "analyse", "investigate", "design", "plan",
    "experiment", "test", "measure", "characterise", "characterize",
    "debug", "troubleshoot", "compare", "review", "write a report",
    "set up", "configure", "run experiment", "full", "comprehensive",
    "step by step", "systematic", "multiple", "all",
}


def _needs_planning(message: str) -> bool:
    """Heuristic: does this message need a multi-step plan?"""
    lower = message.lower()
    # Explicit skip
    if lower.startswith(("ping", "status", "home", "what is", "show me", "read ")):
        return False
    # Check for complexity keywords
    return any(kw in lower for kw in COMPLEX_KEYWORDS)


def _parse_plan(text: str) -> list[str]:
    """Extract numbered steps from planner output."""
    steps = []
    for line in text.strip().split("\n"):
        line = line.strip()
        # Match "1. Do something" or "1) Do something"
        match = re.match(r"^\d+[\.\)]\s*(.+)$", line)
        if match:
            steps.append(match.group(1).strip())
    return steps


# Keywords that suggest a step involves coding
CODING_KEYWORDS = {
    "write a script", "write script", "create script", "python script",
    "bash script", "shell script", "cron", "crontab",
    "firmware", "arduino", "esp", "platformio",
    "write code", "write a program", "create a program",
    "modify the code", "edit the code", "fix the code", "debug the code",
    "write a function", "implement", "refactor",
    ".py", ".sh", ".ino", ".cpp", ".c", ".js",
    "pip install", "npm install", "requirements",
    "dockerfile", "systemd", "service file",
}


def _needs_coding(text: str) -> bool:
    """Heuristic: does this step involve coding?"""
    lower = text.lower()
    return any(kw in lower for kw in CODING_KEYWORDS)


class Agent:
    """
    Autonomous lab agent with Plan-Execute-Reflect architecture.

    When Gemini is available and task is complex:
      Plan (Gemini) → Execute steps (Ollama ReAct) → Reflect (Gemini)

    Otherwise: direct ReAct loop with Ollama (backward compatible).
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
        self.max_iterations = 20  # Max tool-call loops per step

        model_info = f"Ollama: {OLLAMA_MODEL} + Coder: {OLLAMA_CODER_MODEL}"
        if has_gemini():
            model_info += f" + Gemini: {GEMINI_MODEL}"
        self.timeline.log("info", "Agent initialized", model_info)

    # ── Plan-Execute-Reflect (Gemini + Ollama) ──────────────────────

    def chat(self, user_message: str) -> Generator[dict, None, None]:
        """
        Process a user message.

        If Gemini is available and task is complex → Plan-Execute-Reflect.
        Otherwise → direct ReAct loop (backward compatible).
        """
        self.is_running = True
        self.messages.append({"role": "user", "content": user_message})

        # Log user message
        event = self.timeline.log("info", "User message", user_message)
        yield event.to_dict()

        # Decide: plan or direct execute?
        use_planner = has_gemini() and _needs_planning(user_message)

        if use_planner:
            yield from self._plan_execute_reflect(user_message)
        else:
            yield from self._react_loop(user_message)

        self.is_running = False

    def _plan_execute_reflect(self, goal: str) -> Generator[dict, None, None]:
        """Plan with Gemini → Execute each step with Ollama → Reflect with Gemini."""

        # ── PHASE 1: PLAN ───────────────────────────────────────────
        plan_event = self.timeline.log("reasoning", "📋 Planning with Gemini",
            f"Decomposing goal: {goal}")
        yield plan_event.to_dict()

        try:
            plan_messages = [
                {"role": "system", "content": PLANNER_SYSTEM},
                {"role": "user", "content": f"Goal: {goal}"},
            ]
            start = time.time()
            plan_response = gemini_chat(plan_messages, temperature=0.2)
            plan_duration = int((time.time() - start) * 1000)

            plan_text = plan_response["content"]
            steps = _parse_plan(plan_text)

            if not steps:
                # Planner didn't return usable steps — fall back to direct ReAct
                self.timeline.log("reasoning", "Planner returned no steps, using direct execution",
                    plan_text)
                yield from self._react_loop(goal)
                return

            plan_event = self.timeline.log("decision", f"Plan: {len(steps)} steps",
                "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps)),
                duration_ms=plan_duration)
            yield plan_event.to_dict()

        except Exception as e:
            error_event = self.timeline.log("error", "Planner failed, falling back to direct",
                str(e))
            yield error_event.to_dict()
            yield from self._react_loop(goal)
            return

        # ── PHASE 2: EXECUTE ────────────────────────────────────────
        execution_log = []  # Track results for reflection

        for i, step in enumerate(steps):
            step_label = f"Step {i+1}/{len(steps)}: {step}"

            step_event = self.timeline.log("decision", f"▶ {step_label}", "")
            yield step_event.to_dict()

            # Inject step as a focused instruction
            step_prompt = (
                f"Execute this step (step {i+1} of {len(steps)} in the plan):\n\n"
                f"**{step}**\n\n"
                f"Original goal: {goal}\n"
                f"Use your tools to complete this specific step, then stop."
            )
            self.messages.append({"role": "user", "content": step_prompt})

            # Run ReAct loop for this step (with lower iteration limit)
            step_results = []
            for event_dict in self._react_step(step, max_iterations=8):
                yield event_dict
                step_results.append(event_dict)

            execution_log.append({
                "step": step_label,
                "events": len(step_results),
            })

        # ── PHASE 3: REFLECT ────────────────────────────────────────
        yield from self._reflect(goal, steps, execution_log)

    def _reflect(self, goal: str, steps: list[str], execution_log: list[dict]) -> Generator[dict, None, None]:
        """Post-task reflection using Gemini. Updates AGENT_STATE.md."""
        reflect_event = self.timeline.log("reasoning", "🔍 Reflecting on task", "")
        yield reflect_event.to_dict()

        try:
            # Build a summary of what happened
            log_summary = f"Goal: {goal}\n\nPlan:\n"
            for i, s in enumerate(steps):
                log_summary += f"  {i+1}. {s}\n"
            log_summary += f"\nExecution: {len(execution_log)} steps completed.\n"

            # Include recent conversation for context
            recent_msgs = self.messages[-20:]  # Last 20 messages
            conversation = ""
            for m in recent_msgs:
                role = m.get("role", "?")
                content = str(m.get("content", ""))[:500]
                if role != "system":
                    conversation += f"[{role}]: {content}\n"

            reflect_messages = [
                {"role": "system", "content": REFLECTOR_SYSTEM},
                {"role": "user", "content": f"{log_summary}\n\nConversation log:\n{conversation}"},
            ]

            start = time.time()
            reflection = gemini_chat(reflect_messages, temperature=0.2)
            duration = int((time.time() - start) * 1000)

            reflection_text = reflection["content"]

            ref_event = self.timeline.log("decision", "📝 Reflection",
                reflection_text, duration_ms=duration)
            yield ref_event.to_dict()

            # Append reflection to AGENT_STATE.md
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
            state_path = os.environ.get("LAB_WORKSPACE", "/opt/synthetica-lab") + "/AGENT_STATE.md"

            appendix = f"\n\n---\n\n### Reflection — {timestamp}\n\n{reflection_text}\n"
            try:
                with open(state_path, "a", encoding="utf-8") as f:
                    f.write(appendix)
                self.timeline.log("info", "Updated AGENT_STATE.md", "Appended reflection")
            except Exception as e:
                self.timeline.log("error", "Could not update AGENT_STATE.md", str(e))

        except Exception as e:
            error_event = self.timeline.log("error", "Reflection failed", str(e))
            yield error_event.to_dict()

    # ── ReAct Loop (Ollama) ─────────────────────────────────────────

    def _react_loop(self, goal: str) -> Generator[dict, None, None]:
        """Original ReAct loop — direct Ollama execution without planning."""
        iteration = 0
        tool_calls_made = 0
        self_prompts_sent = 0

        while iteration < self.max_iterations:
            iteration += 1

            trimmed = trim_conversation(self.messages, max_tokens=12000)

            thinking_event = self.timeline.log("reasoning", "Calling LLM",
                f"Iteration {iteration}/{self.max_iterations}")
            yield thinking_event.to_dict()

            try:
                start = time.time()
                # Route to coder model if this looks like a coding task
                model = OLLAMA_CODER_MODEL if _needs_coding(goal) else None
                response = ollama_chat(trimmed, self.tool_schemas, model=model)
                llm_duration = int((time.time() - start) * 1000)
            except Exception as e:
                error_event = self.timeline.log("error", "LLM call failed", str(e))
                yield error_event.to_dict()
                return

            content = response["content"]
            tool_calls = response["tool_calls"]

            # Add assistant message to history
            self.messages.append(response["raw_message"])

            if content:
                reasoning_event = self.timeline.log(
                    "reasoning", "LLM response", content,
                    duration_ms=llm_duration)
                yield reasoning_event.to_dict()

            # No tool calls — agent wants to stop
            if not tool_calls:
                if tool_calls_made < 3 and self_prompts_sent == 0:
                    self_prompts_sent += 1
                    nudge = (
                        f"You have only made {tool_calls_made} tool calls. "
                        f"The original goal was: \"{goal}\"\n"
                        f"Have you completed ALL steps? If not, keep using tools. "
                        f"If yes, summarize what you did."
                    )
                    self.messages.append({"role": "user", "content": nudge})
                    self.timeline.log("reasoning", "Self-check",
                        f"Agent stopped after {tool_calls_made} tool calls. Nudging once.")
                    continue

                self.timeline.log("decision", "Goal achieved",
                    f"Agent completed task with {tool_calls_made} tool calls. "
                    f"{content[:100] if content else '(no content)'}")
                return

            # Execute tool calls
            tool_calls_made += self._execute_tools(tool_calls)

            yield from []  # Keep generator alive

    def _react_step(self, step: str, max_iterations: int = 8) -> Generator[dict, None, None]:
        """Execute a single plan step using Ollama ReAct (bounded iterations)."""
        iteration = 0
        tool_calls_made = 0

        while iteration < max_iterations:
            iteration += 1

            trimmed = trim_conversation(self.messages, max_tokens=12000)

            try:
                start = time.time()
                # Route to coder model if this step involves coding
                model = OLLAMA_CODER_MODEL if _needs_coding(step) else None
                response = ollama_chat(trimmed, self.tool_schemas, model=model)
                llm_duration = int((time.time() - start) * 1000)
            except Exception as e:
                error_event = self.timeline.log("error", "LLM call failed", str(e))
                yield error_event.to_dict()
                return

            content = response["content"]
            tool_calls = response["tool_calls"]

            self.messages.append(response["raw_message"])

            if content:
                reasoning_event = self.timeline.log(
                    "reasoning", "LLM response", content,
                    duration_ms=llm_duration)
                yield reasoning_event.to_dict()

            # No tool calls — step complete
            if not tool_calls:
                return

            # Execute tool calls
            for tc in tool_calls:
                fn = tc.get("function", {})
                tool_name = fn.get("name", "unknown")
                tool_args = fn.get("arguments", {})

                self.timeline.log(
                    "tool_call", f"Calling {tool_name}",
                    json.dumps(tool_args, indent=2),
                    tool_name=tool_name, tool_input=tool_args)

                start = time.time()
                result = execute_tool(tool_name, tool_args)
                exec_duration = int((time.time() - start) * 1000)
                tool_calls_made += 1

                files_touched = []
                if tool_name in ("file_write", "file_edit") and "path" in tool_args:
                    files_touched.append(tool_args["path"])

                tool_event = self.timeline.log_tool_call(
                    tool_name, tool_args, result,
                    duration_ms=exec_duration,
                    files_touched=files_touched,
                    experiment=self.active_experiment)
                yield tool_event.to_dict()

                self.messages.append({"role": "tool", "content": result})

    def _execute_tools(self, tool_calls: list[dict]) -> int:
        """Execute tool calls and append results to conversation. Returns count."""
        count = 0
        for tc in tool_calls:
            fn = tc.get("function", {})
            tool_name = fn.get("name", "unknown")
            tool_args = fn.get("arguments", {})

            self.timeline.log(
                "tool_call", f"Calling {tool_name}",
                json.dumps(tool_args, indent=2),
                tool_name=tool_name, tool_input=tool_args)

            start = time.time()
            result = execute_tool(tool_name, tool_args)
            exec_duration = int((time.time() - start) * 1000)
            count += 1

            files_touched = []
            if tool_name in ("file_write", "file_edit") and "path" in tool_args:
                files_touched.append(tool_args["path"])

            self.timeline.log_tool_call(
                tool_name, tool_args, result,
                duration_ms=exec_duration,
                files_touched=files_touched,
                experiment=self.active_experiment)

            self.messages.append({"role": "tool", "content": result})

        return count

    def get_status(self) -> dict:
        """Get current agent status."""
        return {
            "session_id": self.session_id,
            "agent_id": self.agent_id,
            "model": OLLAMA_MODEL,
            "coder_model": OLLAMA_CODER_MODEL,
            "gemini_model": GEMINI_MODEL if has_gemini() else None,
            "planner_enabled": has_gemini(),
            "is_running": self.is_running,
            "active_experiment": self.active_experiment,
            "message_count": len(self.messages),
            "event_count": len(self.timeline.events),
        }
