# LED-DRV8 REST API

| Field | Value |
|-------|-------|
| **Base URL** | `http://leddriver.local` or `http://172.16.1.126` |
| **Port** | 80 |
| **Framework** | ESPAsyncWebServer (ESP32-S3) |
| **Auth** | None |
| **CORS** | Enabled (Allow-Origin: `*`) |
| **Source** | [`experiments/EXP_009/firmware/src/main.cpp`](../../../experiments/EXP_009/firmware/src/main.cpp) |

## Endpoints

### Control Endpoints

#### `GET /api/status`

Returns full board state.

**Response:**
```json
{
  "channels": [0, 0, 0, 0, 0, 0, 0, 0],
  "master": 100,
  "pattern": "none",
  "speed": 50,
  "brightness": 100,
  "wifi": {
    "ip": "172.16.1.126",
    "rssi": -45,
    "hostname": "leddriver.local"
  }
}
```

---

#### `POST /api/channel`

Set a single channel PWM value. Stops any active pattern.

**Body:**
```json
{"channel": 0, "pwm": 2048}
```

Channel can also be passed as query param: `/api/channel?ch=0`

**Response:** `{"ok": true, "channel": 0, "pwm": 2048}`

---

#### `POST /api/all`

Set all 8 channels to the same PWM value. Stops any active pattern.

**Body:**
```json
{"pwm": 4095}
```

**Response:** `{"ok": true, "pwm": 4095}`

---

#### `POST /api/master`

Set master brightness (scales all channel outputs).

**Body:**
```json
{"brightness": 75}
```

Value: 0–100 (percentage).

**Response:** `{"ok": true, "master": 75}`

---

#### `POST /api/pattern`

Start a light pattern on all channels.

**Body:**
```json
{"name": "pulse", "speed": 50, "brightness": 100}
```

| Param | Type | Range | Description |
|-------|------|-------|-------------|
| `name` | string | `pulse`, `blink`, `fade`, `sweep` | Pattern type |
| `speed` | int | 0–100 | Animation speed |
| `brightness` | int | 0–100 | Max brightness |

**Response:** `{"ok": true, "pattern": "pulse", "speed": 50, "brightness": 100}`

---

#### `POST /api/stop`

Stop pattern and turn all channels off. No body required.

**Response:** `{"ok": true, "pattern": "none"}`

---

#### `POST /api/reinit`

Re-initialize PCA9685 I²C connection (recovery after bus glitch).

**Response:**
```json
{"ok": true, "i2c_present": true, "freq_hz": 1000, "prescale": 5}
```

### Debug Endpoints

#### `GET /api/debug/i2c`

Scan the I²C bus for all devices.

**Response:**
```json
{
  "count": 1,
  "status": "ok",
  "devices": [
    {"address": "0x40", "decimal": 64, "name": "PCA9685 (PWM driver)"}
  ]
}
```

---

#### `GET /api/debug/pca9685`

Full PCA9685 register dump: MODE1/MODE2, prescale, and all 16 LED channel registers.

**Response:** (truncated)
```json
{
  "i2c_present": true,
  "control": {
    "MODE1": 33, "MODE1_sleep": false, "MODE1_autoincr": true,
    "MODE2": 4, "MODE2_outdrv": "totem-pole",
    "PRESCALE": 5, "PWM_freq_hz": 1000
  },
  "channels": [
    {"led": 0, "on_reg": 0, "off_reg": 0, "full_on": false, "full_off": true, "state": "OFF"},
    ...
  ]
}
```

---

#### `POST /api/debug/test`

Set channel(s) and read back PCA9685 register to verify output.

**Body (single channel):**
```json
{"channel": 0, "pwm": 2048}
```

**Body (all channels):**
```json
{"all": true, "pwm": 2048}
```

**Response:** Includes `readback` value, `full_on`/`full_off` flags, and `match` boolean.

---

#### `GET /api/debug/log`

Returns the WiFi log ring buffer (last 50 entries).

**Response:**
```json
{
  "count": 12,
  "entries": ["[0s] [EXP_009] LED Driver Board — Booting...", ...]
}
```

---

#### `GET /api/debug/scanpins`

Scans all safe ESP32-S3 GPIO pairs to find PCA9685. Useful for debugging I²C pin wiring.

**Response:**
```json
{
  "status": "found",
  "attempts": 42,
  "found": [{"sda": 6, "scl": 1, "address": "0x40", "other_devices": []}]
}
```

## Code Examples

### Python — Set a channel

```python
import requests

BASE = "http://leddriver.local"

# Set channel 0 to 50%
requests.post(f"{BASE}/api/channel", json={"channel": 0, "pwm": 2048})

# All channels full brightness
requests.post(f"{BASE}/api/all", json={"pwm": 4095})

# Start pulse pattern
requests.post(f"{BASE}/api/pattern", json={"name": "pulse", "speed": 50, "brightness": 100})

# Stop everything
requests.post(f"{BASE}/api/stop")
```

### curl — Quick commands

```bash
# Status
curl http://leddriver.local/api/status

# Channel 3 at 75%
curl -X POST http://leddriver.local/api/channel \
  -H 'Content-Type: application/json' \
  -d '{"channel":3,"pwm":3072}'

# All OFF
curl -X POST http://leddriver.local/api/all \
  -H 'Content-Type: application/json' \
  -d '{"pwm":0}'

# Sweep pattern
curl -X POST http://leddriver.local/api/pattern \
  -H 'Content-Type: application/json' \
  -d '{"name":"sweep","speed":30,"brightness":80}'
```
