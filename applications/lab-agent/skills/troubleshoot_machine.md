# Troubleshoot Machine — Diagnostic Workflow

When something isn't working (motor not moving, sensor not reading, connection failed), follow this systematic approach.

## Steps

1. **Connectivity check**
   - `send_command("PING")` → if no `PONG`, the problem is ESP or network
   - If PING fails: `http_request("GET", "http://172.16.1.115/")` → check if ESP web dashboard responds
   - If dashboard responds but PING fails: Nano may be unresponsive (needs power cycle or reflash)

2. **Status check**
   - `send_command("STATUS")` → look for abnormal values
   - Expected: `POS:<number> SPD:<number> HALL:<0|1> EN:<0|1> MOV:<0|1>`
   - Red flags: `EN:0` (motor disabled), `SPD:0` (speed not set)

3. **Read machine log for errors**
   - `get_machine_log(50)` → check recent serial output for error messages
   - Look for: `ERROR`, `timeout`, `unknown command`, `stall`

4. **Test individual subsystems**
   - Motor: `send_command("ENABLE")` → `send_command("MOVE 100")` → small test move
   - Hall sensor: `send_command("STATUS")` → note HALL value, move magnet, check again
   - Speed: `send_command("SPEED 1000")` → `send_command("ACCEL 500")` → reset if needed

5. **Recovery actions**
   - Motor stuck: `send_command("STOP")` → `send_command("DISABLE")` → wait 2s → `send_command("ENABLE")`
   - Position lost: `send_command("HOME")` to re-home using hall sensor
   - Firmware issue: follow `flash_nano.md` skill to reflash

6. **Log the issue**
   - Write findings to the active experiment's LOG.md
   - Update AGENT_STATE.md with what you learned
