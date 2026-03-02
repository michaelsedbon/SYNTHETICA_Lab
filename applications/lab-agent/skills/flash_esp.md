# Flash ESP Firmware (OTA)

Update the ESP8266 firmware on the Cryptographic Beings machine over WiFi.

## When to use
- You've modified files in `experiments/EXP_002/firmware/esp8266_ota/src/`
- You need to add new HTTP endpoints or change machine behavior
- The ESP dashboard needs updating

## Steps

1. **Edit the firmware** at `experiments/EXP_002/firmware/esp8266_ota/src/main.cpp`

2. **Build and upload via OTA:**
```bash
/home/michael/.pio-venv/bin/pio run -e ota -t upload -d /opt/synthetica-lab/experiments/EXP_002/firmware/esp8266_ota
```

3. **Verify** — wait 10 seconds for reboot, then check:
```bash
curl http://172.16.1.115/status
```

## Important
- The ESP is at `172.16.1.115` (hostname: `cryptobeings.local`)
- OTA uses port 8266
- After OTA, the device auto-reboots (~5s)
- If OTA fails, the device may need a power cycle or USB reflash
- The ESP runs: web dashboard (:80), WebSocket debug (:81), TCP serial bridge (:2323)
