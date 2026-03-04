# Machine Control — Cryptographic Beings

Control the motor on the Cryptographic Beings machine via the ESP8266 REST API.
The ESP is at `http://172.16.1.115`. Motor uses AccelStepper (ISD04 NEMA17).

The machine auto-calibrates on every boot: it homes to the hall sensor and measures the steps per full revolution. Use `/api/status` to check calibration state before moving.

## When to use
- Testing motor movement and homing
- Running experiments that require positioning
- Asking the machine to do a half rotation, full rotation, or precise moves
- Checking if calibration is done

---

## REST API Endpoints

All endpoints return JSON with `Content-Type: application/json`.

| Endpoint | Description | Example Response |
|----------|-------------|------------------|
| `GET /api/ping` | Check Nano is alive | `{"ok":true,"response":"PONG"}` |
| `GET /api/status` | Motor status + calibration | `{"pos":0,"hall":0,"enabled":1,"speed":2000,"moving":0,"spr":30144,"calibrated":1}` |
| `GET /api/calibrate` | Re-run full calibration | `{"ok":true,"spr":30144}` |
| `GET /api/half` | Move exactly half a revolution | `{"ok":true,"steps":15072}` |
| `GET /api/home` | Home to hall sensor | `{"ok":true}` |
| `GET /api/move?steps=N` | Relative move (N steps) | `{"ok":true,"steps":500}` |
| `GET /api/move-to?pos=N` | Move to absolute position | `{"ok":true,"target":1000}` |
| `GET /api/stop` | Emergency stop | `{"ok":true}` |
| `GET /api/speed?value=N` | Set max speed (steps/sec) | `{"ok":true,"speed":4000}` |
| `GET /api/accel?value=N` | Set acceleration (steps/sec²) | `{"ok":true,"accel":2000}` |

### Using your tools
Use the dedicated tool functions:
- `motor_status()` — get position, calibration, and all state
- `motor_half_rotation()` — do a half rotation (requires calibration)
- `motor_home()` — home to hall sensor
- `motor_calibrate()` — re-run calibration
- `motor_move(steps)` — relative move (positive=forward, negative=backward)
- `motor_stop()` — emergency stop

### Using curl (for debugging)
```bash
curl http://172.16.1.115/api/ping
curl http://172.16.1.115/api/status
curl http://172.16.1.115/api/half
curl 'http://172.16.1.115/api/move?steps=500'
curl http://172.16.1.115/api/calibrate
```

---

## Auto-Calibration

On every boot/reset, the Nano automatically:
1. Homes to the hall sensor (finds reference position)
2. Moves past the magnet, then measures one full revolution back to hall
3. Stores the `stepsPerRevolution` value

Check with `motor_status()` — look for `calibrated: 1` and `spr > 0`.

If calibration fails (no hall sensor found), `calibrated: 0`. In that case:
- Check wiring: hall sensor on D3, magnet alignment
- Try `motor_calibrate()` to retry

---

## Safety rules
1. Check `motor_status()` first — ensure `calibrated: 1`
2. Start small with `motor_move(50)` before large moves
3. Use `motor_stop()` immediately if anything seems wrong
4. Calibration blocks other motor commands — wait for it to finish

## Machine details
- Motor: ISD04 NEMA17 integrated stepper (12V)
- Library: AccelStepper (type DRIVER)
- Pins: D5=STP, D4=DIR, D6=ENA, D3=Hall
- ESP IP: 172.16.1.115 (mDNS: cryptobeings.local)
- Calibration speed: 400 steps/sec, default speed: 2000 steps/sec

## Legacy interface
The old `send_command("MOVE 500")` tool still works via `/send?cmd=`. Use the new API endpoints when possible — they return structured JSON instead of requiring log scraping.
