---
description: Orient yourself in a new conversation — read persistent memory files in the right order
---

# Orient

// turbo-all

Run this at the start of a new conversation to load context about the lab.

## 1. Read agent state

Read `AGENT_STATE.md` in the workspace root. This tells you:
- Current mission and active projects
- Machine hardware, IPs, calibration data
- Completed work and open questions
- Next steps and priorities

## 2. Read experiment index

Read `experiments/EXP_INDEX.md` to know what every experiment is about.

## 3. Identify the active project

Check which project the user is likely working on based on context or ask them. Then read:
- `projects/<project>/summary.md` — overview and linked experiments
- `projects/<project>/knowledge/GUIDE.md` — knowledge base structure

## 4. Check recent conversation summaries

Scan the conversation summary list (provided automatically) for recent work context.

## 5. Report orientation

Tell the user:
- What you understand the current priorities are
- What the last conversation was about
- Ask if there's anything specific they want to work on
