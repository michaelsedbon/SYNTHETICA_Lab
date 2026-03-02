# Run Experiment — Step-by-Step Workflow

When the user asks you to "run an experiment", "test something", or "measure something", follow this workflow.

## Steps

1. **Check machine connectivity**
   - `send_command("PING")` → expect `PONG`
   - `send_command("STATUS")` → note position, enabled state

2. **Create or verify experiment folder**
   - Check if `experiments/EXP_XXX/` exists (use the experiment specified, or create new)
   - Ensure it has: `summary.md`, `LOG.md`, `SCRIPT_INDEX.md`, `DOC_INDEX.md`
   - Read `summary.md` for context on what this experiment is about

3. **Write hypothesis and method to LOG.md**
   - Before doing anything, log:
     ```
     ## [Date] — [Title]
     **Hypothesis:** [What you expect]
     **Method:** [What you'll do]
     ```

4. **HOME the motor** (if position-dependent)
   - `send_command("HOME")` → wait for completion
   - `send_command("STATUS")` → verify position = 0

5. **Execute the experiment**
   - Perform the actual measurements/actions
   - Collect data points (log each to LOG.md as you go)

6. **Record results in LOG.md**
   ```
   **Results:**
   - [Data point 1]
   - [Data point 2]
   
   **Conclusion:** [What you learned]
   ```

7. **Update AGENT_STATE.md**
   - Add findings to "Completed Work" section
   - Update "Next Steps" if new questions emerged
   - Update calibration data if you measured something new
