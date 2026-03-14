---
description: End-of-day memory update — refresh AGENT_STATE.md with today's work and priorities
---

# End of Day

// turbo-all

Run this at the end of a work session to persist what was done and what's next.

## 1. Review today's work

Look at what was done in this conversation:
- Which experiments were updated?
- Which apps were modified or deployed?
- Any new hardware, firmware, or infrastructure changes?
- Any blockers discovered?

## 2. Update AGENT_STATE.md

Edit `AGENT_STATE.md` in the workspace root:

- **Completed Work:** Add any new items with `- [x]` prefix
- **Open Questions:** Add new questions, mark resolved ones
- **Next Steps:** Reorder based on current priorities, remove completed items
- **Machine Knowledge:** Update IPs, calibration, or hardware if changed
- **Timestamp:** Update the `*Last updated*` line at the top

## 3. Check project summaries

If experiments were updated, verify their parent project summaries have current experiment tables:
- `projects/bio_electronic_music/summary.md`
- `projects/cryptographic_beings/summary.md`

## 4. Confirm

Report to the user:
- Summary of what was persisted
- Current top priorities for next session
