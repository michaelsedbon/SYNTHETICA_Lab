# Machine Control — Cryptographic Beings

Send commands to the Cryptographic Beings machine via the ESP8266 controller.
Motor uses AccelStepper library for smooth acceleration/deceleration.

## When to use
- Testing motor movement and homing
- Running experiments that require machine control
- Characterising machine behavior

## Commands

All commands go through the ESP at `http://172.16.1.115`.

### Using your `send_command` tool
- `send_command("PING")` — check Nano is alive → `PONG`
- `send_command("STATUS")` — get position, speed, hall, enabled, moving
- `send_command("MOVE 500")` — move 500 steps forward (relative)
- `send_command("MOVE -500")` — move 500 steps backward
- `send_command("MOVETO 0")` — move to absolute position 0
- `send_command("HOME")` — home to hall sensor
- `send_command("STOP")` — emergency stop
- `send_command("SPEED 4000")` — set max speed (steps/sec)
- `send_command("ACCEL 2000")` — set acceleration (steps/sec²)
- `send_command("ENABLE")` / `send_command("DISABLE")` — motor driver
- `send_command("ZERO")` — zero position counter

### Using curl
```bash
curl 'http://172.16.1.115/send?cmd=PING'
```

### Reading responses
```bash
curl http://172.16.1.115/log | python3 -c 'import sys,json; [print(l) for l in json.load(sys.stdin)[-5:]]'
```

## Tuning smoothness
- For smoother motion, increase microstepping via ISD04 DIP switches (1/8 or 1/16)
- Higher microstepping needs proportionally higher SPEED and MOVE values
- Good defaults: `SPEED 4000`, `ACCEL 2000`

## Safety rules
1. **Always PING first** before motor commands
2. **Start small** (MOVE 50) before large moves
3. **HOME before long moves** to establish reference
4. **Check STATUS** after every move
5. **STOP immediately** if anything seems wrong

## Machine details
- Motor: ISD04 NEMA17 integrated stepper (12V)
- Library: AccelStepper (type DRIVER)
- Pins: D5=STP, D4=DIR, D6=ENA, D3=Hall
- VCC (ISD04 pin 3) must connect to Nano 5V
