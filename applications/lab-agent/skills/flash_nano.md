# Flash Arduino Nano Remotely

Update the Arduino Nano firmware on the Cryptographic Beings machine over WiFi,
through the ESP8266's TCP serial bridge.

## When to use
- You've modified the Nano motor controller code
- You need to change motor behavior, add commands, or fix bugs
- You want to test new firmware on the Nano without touching the hardware

## Steps

1. **Edit the firmware** at `experiments/EXP_002/firmware/arduino_nano/src/main.cpp`

2. **Run the remote flasher:**
```bash
cd /opt/synthetica-lab
export PATH=/home/michael/.pio-venv/bin:$PATH
python3 experiments/EXP_002/firmware/flash_nano.py
```

3. **Verify** — send a PING command:
```bash
curl 'http://172.16.1.115/send?cmd=PING'
sleep 2
curl http://172.16.1.115/log | python3 -c 'import sys,json; [print(l) for l in json.load(sys.stdin)[-3:]]'
```
   Expected: you should see `PONG` in the log.

## How it works

The flasher script (`flash_nano.py`) does:
1. Compiles the Nano code with PlatformIO
2. Calls `http://172.16.1.115/reset-nano` to reset the Nano into bootloader mode (ESP GPIO14 → Nano RST)
3. Connects to the ESP's TCP serial bridge on port 2323
4. Uses STK500v1 protocol to upload the compiled hex file
5. Nano reboots and runs the new firmware

## Nano serial commands

After flashing, send commands via the ESP:
```bash
curl 'http://172.16.1.115/send?cmd=STATUS'    # Get motor position
curl 'http://172.16.1.115/send?cmd=MOVE 200'   # Move 200 steps
curl 'http://172.16.1.115/send?cmd=HOME'        # Home to hall sensor
curl 'http://172.16.1.115/send?cmd=STOP'        # Emergency stop
curl 'http://172.16.1.115/send?cmd=SPEED 600'   # Set step delay (µs)
curl 'http://172.16.1.115/send?cmd=ENABLE'      # Enable motor driver
curl 'http://172.16.1.115/send?cmd=DISABLE'     # Disable motor driver
```

## Important
- The Nano bootloader window is short (~500ms) — the flasher handles timing automatically
- Flash takes ~20 seconds total (compile + upload)
- If flashing fails, try again — sometimes serial sync needs a retry
- ATmega328P signature: `1e950f`
