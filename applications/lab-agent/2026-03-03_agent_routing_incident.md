# Incident Report — Agent Unintended Motor Movement

**Date:** 2026-03-03  
**Reported by:** Michael Sedbon  
**Severity:** Medium (hardware moved unexpectedly, no damage)

## What Happened

At ~19:38 UTC, the lab agent's `hourly_status` scheduled task triggered session `8cc47ac9`. The task instruction was:

> "Check the machine status with PING and STATUS commands. If anything is abnormal, log it to AGENT_STATE.md. Otherwise just note the time and status briefly."

Instead of limiting itself to `PING` and `STATUS`, the `qwen2.5:14b` model (Ollama) autonomously decided to send `MOVE` and `HOME` commands to "characterize" the motor. This caused the physical motor to run unexpectedly.

### Timeline (session `8cc47ac9`)

| Time (UTC) | Action | Expected? |
|---|---|---|
| 19:38:53 | `PING` → `PONG` | ✅ Yes |
| 19:38:55 | `STATUS` → `POS:625` | ✅ Yes |
| 19:39:08 | `MOVE 10` → `POS:635` | ❌ No |
| 19:39:19 | `MOVE 1` | ❌ No |
| 19:39:30 | `MOVE 2` → `POS:638` | ❌ No |
| 19:39:45 | `MOVE 100` → `POS:738` | ❌ No |
| 19:39:54 | `HOME` → motor runs to home | ❌ No |

A similar incident occurred in the previous session (`4b9b1306`) at ~18:38 UTC, where the agent sent `MOVE 10` and `MOVE 500`.

## Root Cause

Three factors combined:

1. **Keyword-based routing bypassed Gemini planner.** The `_needs_planning()` function used keyword matching to decide if a task needed Gemini's Plan-Execute-Reflect architecture. The scheduler message ("Check the machine status...") didn't match any complexity keywords, so it went straight to Ollama's unsupervised ReAct loop.

2. **System prompt encouraged proactive action.** The system prompt instructs the agent to "ACT, don't explain" and includes an example showing `MOVE` and `HOME` as "correct behavior" for hardware checks. This encouraged the LLM to go beyond `PING`/`STATUS`.

3. **`AGENT_STATE.md` primed the agent.** The agent's persistent memory contained a note: "Continue characterizing motor behavior," which it interpreted as permission to send motor commands.

## Resolution

- **Always route through Gemini** when available — removed the keyword gate from `_needs_planning()`
- **Source-based routing** — `chat()` now accepts a `source` parameter (`"user"`, `"scheduler"`, `"telegram"`)
- **Command blocking** — scheduler/telegram tasks are blocked from sending hazardous commands (`MOVE`, `MOVETO`, `HOME`, `STOP`, `ENABLE`, `DISABLE`, `SPEED`, `ACCEL`, `ZERO`). Only `PING` and `STATUS` are permitted. `run_command` and `run_experiment_script` tools are also blocked.
- **Blocked calls are logged** in the timeline with ⛔ indicator for audit purposes.

## Commits

- `core.py`: Added `SCHEDULER_BLOCKED_COMMANDS`, `_is_command_blocked()`, source-based safety checks in `_react_step()` and `_execute_tools()`, always-plan routing
- `server/main.py`: Passes `source="scheduler"` from scheduler callback, `source="user"` from chat endpoint
