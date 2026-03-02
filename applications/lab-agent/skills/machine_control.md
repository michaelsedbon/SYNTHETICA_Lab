# Machine Control — Cryptographic Beings

Send commands to the Cryptographic Beings machine via the ESP8266 controller.

## When to use
- Testing motor movement and homing
- Running experiments that require machine control
- Characterising machine behavior (response times, step accuracy, etc.)

## Quick commands

All commands go through the ESP HTTP API at `http://172.16.1.115`.

### Using your `send_command` tool
Your `send_command` tool sends a serial command to the Nano via the ESP.
Examples:
- `send_command("PING")` — check if Nano is alive → expect `PONG`
- `send_command("STATUS")` — get current position → `POS:<n>`
- `send_command("MOVE 500")` — move arm 500 steps forward
- `send_command("MOVE -500")` — move arm 500 steps backward
- `send_command("HOME")` — home to hall sensor → `HOMED`
- `send_command("STOP")` — emergency stop
- `send_command("SPEED 600")` — set step delay in microseconds (lower = faster)
- `send_command("ENABLE")` — enable motor driver
- `send_command("DISABLE")` — disable motor driver
- `send_command("ZERO")` — zero the position counter

### Using curl (from run_command)
```bash
curl 'http://172.16.1.115/send?cmd=PING'
```

### Reading responses
```bash
curl http://172.16.1.115/log | python3 -c 'import sys,json; [print(l) for l in json.load(sys.stdin)[-5:]]'
```

Or use `get_machine_log()` tool.

## Safety rules

1. **Always PING first** before sending motor commands
2. **Start with small movements** (MOVE 10, then MOVE 100) before large ones
3. **HOME before long moves** to establish a reference position
4. **Check STATUS** after every move to confirm position
5. **STOP immediately** if anything seems wrong
6. **DISABLE** the motor when done to reduce power consumption

## Machine details

- Motor: ISD04 NEMA17 integrated stepper
- Steps per revolution: depends on microstepping (default 200 full steps)
- Default speed: 800µs step delay
- Speed range: 200µs (fast) to 5000µs (slow)
- Hall sensor on D2 for homing
- The arm rotates around a tower with 3 levels × 6 tubes = 18 Marimo balls
