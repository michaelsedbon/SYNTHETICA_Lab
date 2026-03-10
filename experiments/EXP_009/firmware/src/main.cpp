/*
 * EXP_009 — 8-Channel LED Driver Board Firmware
 * ESP32-S3-WROOM-1 + PCA9685 (I2C PWM) + 8× DRV8870 H-bridge
 *
 * Features:
 *   - WiFi STA mode with mDNS (leddriver.local)
 *   - ArduinoOTA for wireless firmware updates
 *   - REST API for channel control
 *   - 5 built-in patterns: constant, pulse, blink, fade, sweep
 *   - LittleFS-served web dashboard
 *
 * I2C Pins: GPIO8 = SDA, GPIO9 = SCL
 * PCA9685 address: 0x40 (all addr pins LOW)
 * PWM mapping: LED0/1→M1, LED2/3→M2, ... LED14/15→M8
 */

#include <Arduino.h>
#if ARDUINO_USB_CDC_ON_BOOT
#define HWSerial USBSerial
#else
#define HWSerial Serial
#endif
#include <WiFi.h>
#include <ESPmDNS.h>
#include <ArduinoOTA.h>
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <HTTPClient.h>

// ── WiFi Log Ring Buffer ─────────────────────────
#define LOG_LINES 50
#define LOG_LINE_LEN 120
char logBuf[LOG_LINES][LOG_LINE_LEN];
int logHead = 0;
int logCount = 0;

void wifiLog(const char* fmt, ...) {
    char line[LOG_LINE_LEN];
    va_list args;
    va_start(args, fmt);
    vsnprintf(line, LOG_LINE_LEN, fmt, args);
    va_end(args);
    // Write to serial too
    HWSerial.println(line);
    // Store in ring buffer with uptime prefix
    unsigned long s = millis() / 1000;
    snprintf(logBuf[logHead], LOG_LINE_LEN, "[%lus] %s", s, line);
    logHead = (logHead + 1) % LOG_LINES;
    if (logCount < LOG_LINES) logCount++;
}

// ── WiFi Configuration ───────────────────────────
const char* WIFI_SSID     = "MEDICALEX";
const char* WIFI_PASSWORD = "94110Med+";
const char* HOSTNAME      = "leddriver";

// ── Discovery heartbeat ──────────────────────────
// Pings dev machine so we can find the board's IP
const char* HEARTBEAT_URL = "http://172.16.1.80:8000/api/heartbeat";

// ── Hardware ─────────────────────────────────────
#define I2C_SDA 6
#define I2C_SCL 1
#define PCA9685_ADDR 0x40
#define NUM_CHANNELS 8
#define PWM_MAX 4095
#define PWM_FREQ 1000  // 1 kHz PWM for LEDs

Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver(PCA9685_ADDR);
AsyncWebServer server(80);

// ── Channel State ────────────────────────────────
uint16_t channelPWM[NUM_CHANNELS] = {0};
float masterBrightness = 1.0f;

// ── Pattern Engine ───────────────────────────────
enum Pattern { PAT_NONE, PAT_PULSE, PAT_BLINK, PAT_FADE, PAT_SWEEP };
Pattern currentPattern = PAT_NONE;
int patternSpeed = 50;        // 0-100
int patternBrightness = 100;  // 0-100
unsigned long patternLastTick = 0;
float patternPhase = 0.0f;
int sweepChannel = 0;

// ── Forward Declarations ─────────────────────────
void setupWiFi();
void setupOTA();
void setupPCA9685();
void setupAPI();
void applyChannel(int ch, uint16_t val);
void applyAllChannels();
void runPattern();
String getStatusJSON();
const char* patternName(Pattern p);
void setupDebugAPI();
void reinitPCA9685();

// ── I2C register helpers ─────────────────────────
uint8_t readPCA9685Reg(uint8_t reg) {
    Wire.beginTransmission(PCA9685_ADDR);
    Wire.write(reg);
    Wire.endTransmission();
    Wire.requestFrom((uint8_t)PCA9685_ADDR, (uint8_t)1);
    return Wire.available() ? Wire.read() : 0xFF;
}

// ==========================================================
// Setup
// ==========================================================
// ── Heartbeat ────────────────────────────────────
unsigned long lastHeartbeat = 0;

void setup() {
    HWSerial.begin(115200);
    // Wait for USB CDC to enumerate (ESP32-S3 USB-Serial/JTAG)
    unsigned long waitStart = millis();
    while (!HWSerial && (millis() - waitStart < 3000)) {
        delay(10);
    }
    delay(200);
    wifiLog("========================================");
    wifiLog("[EXP_009] LED Driver Board — Booting...");
    wifiLog("========================================");

    // LittleFS for web dashboard
    if (!LittleFS.begin(true)) {
        wifiLog("[FS] LittleFS mount failed!");
    } else {
        wifiLog("[FS] LittleFS mounted");
    }

    setupPCA9685();
    setupWiFi();
    setupOTA();
    setupAPI();
    setupDebugAPI();

    wifiLog("[READY] http://leddriver.local");
}

// ==========================================================
// Loop
// ==========================================================
void loop() {
    ArduinoOTA.handle();

    if (currentPattern != PAT_NONE) {
        runPattern();
    }

    // Heartbeat every 15 seconds — ping dev machine + serial log
    unsigned long now = millis();
    if (now - lastHeartbeat > 15000) {
        lastHeartbeat = now;
        wifiLog("[HB] uptime=%lus WiFi=%s IP=%s RSSI=%d pat=%s",
            now / 1000,
            (WiFi.status() == WL_CONNECTED) ? "OK" : "FAIL",
            WiFi.localIP().toString().c_str(),
            WiFi.RSSI(),
            patternName(currentPattern));

        // Non-blocking HTTP ping to dev machine
        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            String url = String(HEARTBEAT_URL)
                + "?ip=" + WiFi.localIP().toString()
                + "&rssi=" + String(WiFi.RSSI())
                + "&uptime=" + String(now / 1000)
                + "&hostname=" + String(HOSTNAME);
            http.begin(url);
            http.setTimeout(2000);
            int code = http.GET();
            if (code > 0) {
                wifiLog("[HB] Pinged dev machine, response: %d", code);
            } else {
                wifiLog("[HB] Ping failed: %s", http.errorToString(code).c_str());
            }
            http.end();
        }
    }
}

// ==========================================================
// WiFi
// ==========================================================
void setupWiFi() {
    HWSerial.printf("[WiFi] Connecting to %s", WIFI_SSID);  // can't use wifiLog yet, no clients
    WiFi.setHostname(HOSTNAME);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        HWSerial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiLog("[WiFi] Connected! IP: %s", WiFi.localIP().toString().c_str());
        if (MDNS.begin(HOSTNAME)) {
            MDNS.addService("http", "tcp", 80);
            wifiLog("[mDNS] %s.local", HOSTNAME);
        }
    } else {
        wifiLog("[WiFi] Failed — starting AP mode");
        WiFi.mode(WIFI_AP);
        WiFi.softAP("LED-Driver-Setup", "12345678");
        wifiLog("[AP] SSID: LED-Driver-Setup, IP: %s",
                      WiFi.softAPIP().toString().c_str());
    }
}

// ==========================================================
// OTA
// ==========================================================
void setupOTA() {
    ArduinoOTA.setHostname(HOSTNAME);
    ArduinoOTA.setPort(3232);

    ArduinoOTA.onStart([]() {
        String type = (ArduinoOTA.getCommand() == U_FLASH)
                          ? "firmware" : "filesystem";
        wifiLog("[OTA] Updating %s...", type.c_str());
    });
    ArduinoOTA.onEnd([]() {
        wifiLog("[OTA] Done! Rebooting...");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        HWSerial.printf("[OTA] %u%%\r", (progress * 100) / total);  // progress stays serial-only
    });
    ArduinoOTA.onError([](ota_error_t error) {
        const char* errMsg = "Unknown";
        if (error == OTA_AUTH_ERROR) errMsg = "Auth Failed";
        else if (error == OTA_BEGIN_ERROR) errMsg = "Begin Failed";
        else if (error == OTA_CONNECT_ERROR) errMsg = "Connect Failed";
        else if (error == OTA_RECEIVE_ERROR) errMsg = "Receive Failed";
        else if (error == OTA_END_ERROR) errMsg = "End Failed";
        wifiLog("[OTA] Error[%u]: %s", error, errMsg);
    });

    ArduinoOTA.begin();
    wifiLog("[OTA] Ready on port 3232");
}

// ==========================================================
// PCA9685
// ==========================================================
void setupPCA9685() {
    Wire.begin(I2C_SDA, I2C_SCL);
    delay(50);  // Let I2C bus stabilize

    // Retry initialization up to 5 times
    bool found = false;
    for (int attempt = 0; attempt < 5; attempt++) {
        Wire.beginTransmission(PCA9685_ADDR);
        uint8_t err = Wire.endTransmission();
        if (err == 0) {
            found = true;
            wifiLog("[PCA9685] Found on attempt %d", attempt + 1);
            break;
        }
        wifiLog("[PCA9685] Not found (attempt %d, err=%d), retrying...", attempt + 1, err);
        delay(500);
    }

    if (!found) {
        wifiLog("[PCA9685] WARNING: chip not found after 5 attempts!");
        wifiLog("[PCA9685] Run /api/reinit or /api/debug/scanpins to recover");
    }

    pwm.begin();
    pwm.setOscillatorFrequency(25000000);
    pwm.setPWMFreq(PWM_FREQ);
    delay(10);

    // Verify the frequency was actually set by reading the prescale register
    uint8_t prescale = readPCA9685Reg(0xFE);
    float actualFreq = 25000000.0f / (4096.0f * (prescale + 1));
    wifiLog("[PCA9685] Init @ 0x%02X, target=%dHz actual=%dHz prescale=%d",
            PCA9685_ADDR, PWM_FREQ, (int)actualFreq, prescale);

    // All channels off
    for (int i = 0; i < 16; i++) {
        pwm.setPWM(i, 0, 0);
    }
}

// Re-initialize PCA9685 (callable via API after pin scanner or bus glitch)
void reinitPCA9685() {
    Wire.end();
    delay(50);
    Wire.begin(I2C_SDA, I2C_SCL);
    delay(50);
    pwm.begin();
    pwm.setOscillatorFrequency(25000000);
    pwm.setPWMFreq(PWM_FREQ);
    delay(10);
    for (int i = 0; i < 16; i++) {
        pwm.setPWM(i, 0, 0);
    }
    uint8_t prescale = readPCA9685Reg(0xFE);
    float actualFreq = 25000000.0f / (4096.0f * (prescale + 1));
    wifiLog("[PCA9685] Re-init complete: %dHz (prescale=%d)", (int)actualFreq, prescale);
}

// Apply PWM to a channel (sets both IN1 and IN2 of the DRV8870)
// For LED driving: IN1=PWM (forward), IN2=0 (ground path)
void applyChannel(int ch, uint16_t val) {
    if (ch < 0 || ch >= NUM_CHANNELS) return;
    uint16_t scaled = (uint16_t)(val * masterBrightness);
    if (scaled > PWM_MAX) scaled = PWM_MAX;
    int in1 = ch * 2;      // PCA9685 LED channel for IN1
    int in2 = ch * 2 + 1;  // PCA9685 LED channel for IN2
    if (scaled == 0) {
        pwm.setPWM(in1, 0, 0);     // IN1 OFF
        pwm.setPWM(in2, 0, 0);     // IN2 OFF (coast/brake)
    } else if (scaled == PWM_MAX) {
        pwm.setPWM(in1, 4096, 0);  // IN1 fully ON
        pwm.setPWM(in2, 0, 0);     // IN2 OFF
    } else {
        pwm.setPWM(in1, 0, scaled); // IN1 PWM
        pwm.setPWM(in2, 0, 0);     // IN2 OFF
    }
}

void applyAllChannels() {
    for (int i = 0; i < NUM_CHANNELS; i++) {
        applyChannel(i, channelPWM[i]);
    }
}

// ==========================================================
// Pattern Engine
// ==========================================================
void runPattern() {
    // Speed → tick interval: speed=0 → 100ms, speed=100 → 5ms
    unsigned long interval = map(patternSpeed, 0, 100, 100, 5);
    unsigned long now = millis();
    if (now - patternLastTick < interval) return;
    patternLastTick = now;

    float maxPWM = (patternBrightness / 100.0f) * PWM_MAX;
    patternPhase += 0.02f;
    if (patternPhase > TWO_PI) patternPhase -= TWO_PI;

    switch (currentPattern) {
        case PAT_PULSE: {
            // Smooth sine wave on all channels
            uint16_t val = (uint16_t)(((sin(patternPhase) + 1.0f) / 2.0f) * maxPWM);
            for (int i = 0; i < NUM_CHANNELS; i++) {
                channelPWM[i] = val;
                applyChannel(i, val);
            }
            break;
        }
        case PAT_BLINK: {
            // Square wave toggle
            uint16_t val = (patternPhase < PI) ? (uint16_t)maxPWM : 0;
            for (int i = 0; i < NUM_CHANNELS; i++) {
                channelPWM[i] = val;
                applyChannel(i, val);
            }
            break;
        }
        case PAT_FADE: {
            // Sawtooth ramp up then reset
            float frac = patternPhase / TWO_PI;
            uint16_t val = (uint16_t)(frac * maxPWM);
            for (int i = 0; i < NUM_CHANNELS; i++) {
                channelPWM[i] = val;
                applyChannel(i, val);
            }
            break;
        }
        case PAT_SWEEP: {
            // One channel at a time
            float frac = patternPhase / TWO_PI;
            int activeChannel = (int)(frac * NUM_CHANNELS) % NUM_CHANNELS;
            for (int i = 0; i < NUM_CHANNELS; i++) {
                uint16_t val = (i == activeChannel) ? (uint16_t)maxPWM : 0;
                channelPWM[i] = val;
                applyChannel(i, val);
            }
            break;
        }
        default:
            break;
    }
}

Pattern parsePattern(const String& name) {
    if (name == "pulse") return PAT_PULSE;
    if (name == "blink") return PAT_BLINK;
    if (name == "fade")  return PAT_FADE;
    if (name == "sweep") return PAT_SWEEP;
    return PAT_NONE;
}

const char* patternName(Pattern p) {
    switch (p) {
        case PAT_PULSE: return "pulse";
        case PAT_BLINK: return "blink";
        case PAT_FADE:  return "fade";
        case PAT_SWEEP: return "sweep";
        default:        return "none";
    }
}

// ==========================================================
// Status JSON
// ==========================================================
String getStatusJSON() {
    JsonDocument doc;
    JsonArray ch = doc["channels"].to<JsonArray>();
    for (int i = 0; i < NUM_CHANNELS; i++) {
        ch.add(channelPWM[i]);
    }
    doc["master"] = (int)(masterBrightness * 100);
    doc["pattern"] = patternName(currentPattern);
    doc["speed"] = patternSpeed;
    doc["brightness"] = patternBrightness;

    JsonObject wifi = doc["wifi"].to<JsonObject>();
    wifi["ip"] = WiFi.localIP().toString();
    wifi["rssi"] = WiFi.RSSI();
    wifi["hostname"] = String(HOSTNAME) + ".local";

    String out;
    serializeJson(doc, out);
    return out;
}

// ==========================================================
// REST API
// ==========================================================
void setupAPI() {
    // CORS headers for all responses
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");

    // ── Serve dashboard from LittleFS ─────────────
    server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

    // ── GET /api/status ───────────────────────────
    server.on("/api/status", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", getStatusJSON());
    });

    // ── POST /api/channel/{n} ─────────────────────
    // Body: {"pwm": 0-4095}
    server.on("/api/channel", HTTP_POST, [](AsyncWebServerRequest *request) {},
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            // Parse channel number from URL parameter
            int ch = -1;
            if (request->hasParam("ch")) {
                ch = request->getParam("ch")->value().toInt();
            }
            // Also try path: /api/channel?ch=N
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, (char*)data, len);
            if (err) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            // Channel can also be in body
            if (ch < 0 && doc["channel"].is<int>()) {
                ch = doc["channel"].as<int>();
            }
            if (ch < 0 || ch >= NUM_CHANNELS) {
                request->send(400, "application/json", "{\"error\":\"Invalid channel (0-7)\"}");
                return;
            }
            uint16_t val = doc["pwm"].as<uint16_t>();
            if (val > PWM_MAX) val = PWM_MAX;

            channelPWM[ch] = val;
            currentPattern = PAT_NONE;  // Stop pattern when manually setting
            applyChannel(ch, val);

            JsonDocument resp;
            resp["ok"] = true;
            resp["channel"] = ch;
            resp["pwm"] = val;
            String out;
            serializeJson(resp, out);
            request->send(200, "application/json", out);
        });

    // ── POST /api/all ─────────────────────────────
    // Body: {"pwm": 0-4095}
    server.on("/api/all", HTTP_POST, [](AsyncWebServerRequest *request) {},
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, (char*)data, len);
            if (err) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            uint16_t val = doc["pwm"].as<uint16_t>();
            if (val > PWM_MAX) val = PWM_MAX;

            currentPattern = PAT_NONE;
            for (int i = 0; i < NUM_CHANNELS; i++) {
                channelPWM[i] = val;
            }
            applyAllChannels();

            JsonDocument resp;
            resp["ok"] = true;
            resp["pwm"] = val;
            String out;
            serializeJson(resp, out);
            request->send(200, "application/json", out);
        });

    // ── POST /api/master ──────────────────────────
    // Body: {"brightness": 0-100}
    server.on("/api/master", HTTP_POST, [](AsyncWebServerRequest *request) {},
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, (char*)data, len);
            if (err) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            int val = doc["brightness"].as<int>();
            if (val < 0) val = 0;
            if (val > 100) val = 100;
            masterBrightness = val / 100.0f;
            applyAllChannels();

            JsonDocument resp;
            resp["ok"] = true;
            resp["master"] = val;
            String out;
            serializeJson(resp, out);
            request->send(200, "application/json", out);
        });

    // ── POST /api/pattern ─────────────────────────
    // Body: {"name": "pulse|blink|fade|sweep", "speed": 0-100, "brightness": 0-100}
    server.on("/api/pattern", HTTP_POST, [](AsyncWebServerRequest *request) {},
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, (char*)data, len);
            if (err) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }
            String name = doc["name"].as<String>();
            Pattern p = parsePattern(name);
            if (p == PAT_NONE) {
                request->send(400, "application/json", "{\"error\":\"Unknown pattern\"}");
                return;
            }
            currentPattern = p;
            patternPhase = 0;
            if (doc["speed"].is<int>()) patternSpeed = doc["speed"].as<int>();
            if (doc["brightness"].is<int>()) patternBrightness = doc["brightness"].as<int>();
            if (patternSpeed < 0) patternSpeed = 0;
            if (patternSpeed > 100) patternSpeed = 100;
            if (patternBrightness < 0) patternBrightness = 0;
            if (patternBrightness > 100) patternBrightness = 100;

            JsonDocument resp;
            resp["ok"] = true;
            resp["pattern"] = name;
            resp["speed"] = patternSpeed;
            resp["brightness"] = patternBrightness;
            String out;
            serializeJson(resp, out);
            request->send(200, "application/json", out);
        });

    // ── POST /api/stop ────────────────────────────
    server.on("/api/stop", HTTP_POST, [](AsyncWebServerRequest *request) {
        currentPattern = PAT_NONE;
        for (int i = 0; i < NUM_CHANNELS; i++) {
            channelPWM[i] = 0;
            applyChannel(i, 0);
        }
        request->send(200, "application/json", "{\"ok\":true,\"pattern\":\"none\"}");
    });

    // ── POST /api/reinit ─────────────────────────
    server.on("/api/reinit", HTTP_POST, [](AsyncWebServerRequest *request) {
        wifiLog("[API] PCA9685 re-init requested");
        reinitPCA9685();
        // Verify
        Wire.beginTransmission(PCA9685_ADDR);
        uint8_t err = Wire.endTransmission();
        uint8_t prescale = readPCA9685Reg(0xFE);
        float freq = 25000000.0f / (4096.0f * (prescale + 1));
        JsonDocument resp;
        resp["ok"] = (err == 0);
        resp["i2c_present"] = (err == 0);
        resp["freq_hz"] = (int)freq;
        resp["prescale"] = prescale;
        String out;
        serializeJson(resp, out);
        request->send(200, "application/json", out);
    });

    // ── OPTIONS (CORS preflight) ──────────────────
    server.on("/api/*", HTTP_OPTIONS, [](AsyncWebServerRequest *request) {
        request->send(204);
    });

    server.begin();
    wifiLog("[API] Server started on port 80");
}

// ==========================================================
// Debug API Endpoints
// ==========================================================
void setupDebugAPI() {

    // ── GET /api/debug/i2c — I2C Bus Scanner ─────────
    server.on("/api/debug/i2c", HTTP_GET, [](AsyncWebServerRequest *request) {
        wifiLog("[DEBUG] I2C bus scan requested");
        JsonDocument doc;
        JsonArray devices = doc["devices"].to<JsonArray>();
        int found = 0;
        for (uint8_t addr = 1; addr < 127; addr++) {
            Wire.beginTransmission(addr);
            uint8_t err = Wire.endTransmission();
            if (err == 0) {
                JsonObject dev = devices.add<JsonObject>();
                char hex[8];
                snprintf(hex, sizeof(hex), "0x%02X", addr);
                dev["address"] = String(hex);
                dev["decimal"] = addr;
                // Identify known devices
                if (addr == 0x40) dev["name"] = "PCA9685 (PWM driver)";
                else if (addr >= 0x50 && addr <= 0x57) dev["name"] = "EEPROM";
                else if (addr == 0x68 || addr == 0x69) dev["name"] = "IMU/RTC";
                else dev["name"] = "unknown";
                found++;
                wifiLog("[I2C] Found device at 0x%02X", addr);
            }
        }
        doc["count"] = found;
        doc["status"] = found > 0 ? "ok" : "no_devices";
        wifiLog("[I2C] Scan complete: %d device(s) found", found);
        String out;
        serializeJson(doc, out);
        request->send(200, "application/json", out);
    });

    // ── GET /api/debug/pca9685 — Register Dump ───────
    server.on("/api/debug/pca9685", HTTP_GET, [](AsyncWebServerRequest *request) {
        wifiLog("[DEBUG] PCA9685 register dump requested");
        JsonDocument doc;

        // Check if device is present
        Wire.beginTransmission(PCA9685_ADDR);
        uint8_t i2cErr = Wire.endTransmission();
        doc["i2c_present"] = (i2cErr == 0);
        if (i2cErr != 0) {
            doc["error"] = "PCA9685 not responding on I2C bus";
            wifiLog("[PCA9685] NOT FOUND on I2C bus! Error=%d", i2cErr);
            String out;
            serializeJson(doc, out);
            request->send(200, "application/json", out);
            return;
        }

        // Read control registers
        uint8_t mode1 = readPCA9685Reg(0x00);
        uint8_t mode2 = readPCA9685Reg(0x01);
        uint8_t prescale = readPCA9685Reg(0xFE);

        JsonObject ctrl = doc["control"].to<JsonObject>();
        ctrl["MODE1"] = mode1;
        ctrl["MODE1_hex"] = String("0x") + String(mode1, HEX);
        ctrl["MODE1_sleep"] = (mode1 & 0x10) ? true : false;
        ctrl["MODE1_autoincr"] = (mode1 & 0x20) ? true : false;
        ctrl["MODE1_restart"] = (mode1 & 0x80) ? true : false;
        ctrl["MODE2"] = mode2;
        ctrl["MODE2_hex"] = String("0x") + String(mode2, HEX);
        ctrl["MODE2_outdrv"] = (mode2 & 0x04) ? "totem-pole" : "open-drain";
        ctrl["PRESCALE"] = prescale;
        // Calculate actual PWM frequency: freq = 25MHz / (4096 * (prescale + 1))
        float freq = 25000000.0f / (4096.0f * (prescale + 1));
        ctrl["PWM_freq_hz"] = (int)freq;

        wifiLog("[PCA9685] MODE1=0x%02X sleep=%d, MODE2=0x%02X, PRE=%d freq=%dHz",
            mode1, (mode1 & 0x10) ? 1 : 0, mode2, prescale, (int)freq);

        // Read all 16 LED channel registers
        JsonArray channels = doc["channels"].to<JsonArray>();
        for (int i = 0; i < 16; i++) {
            uint8_t baseReg = 0x06 + (i * 4);  // LEDn_ON_L
            uint8_t onL  = readPCA9685Reg(baseReg);
            uint8_t onH  = readPCA9685Reg(baseReg + 1);
            uint8_t offL = readPCA9685Reg(baseReg + 2);
            uint8_t offH = readPCA9685Reg(baseReg + 3);
            uint16_t onVal  = onL | (onH << 8);
            uint16_t offVal = offL | (offH << 8);
            bool fullOn  = (onH & 0x10);
            bool fullOff = (offH & 0x10);

            JsonObject ch = channels.add<JsonObject>();
            ch["led"] = i;
            ch["on_reg"] = onVal & 0x0FFF;
            ch["off_reg"] = offVal & 0x0FFF;
            ch["full_on"] = fullOn;
            ch["full_off"] = fullOff;
            if (fullOff) ch["state"] = "OFF";
            else if (fullOn) ch["state"] = "FULL_ON";
            else ch["state"] = String("PWM:") + String(offVal & 0x0FFF);
        }

        String out;
        serializeJson(doc, out);
        request->send(200, "application/json", out);
    });

    // ── POST /api/debug/test — Channel Test + Readback ─
    server.on("/api/debug/test", HTTP_POST, [](AsyncWebServerRequest *request) {},
        NULL,
        [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
            JsonDocument doc;
            DeserializationError err = deserializeJson(doc, (char*)data, len);
            if (err) {
                request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
                return;
            }

            bool testAll = doc["all"].is<bool>() && doc["all"].as<bool>();
            int ch = doc["channel"].as<int>();
            uint16_t val = doc["pwm"].as<uint16_t>();
            if (val > PWM_MAX) val = PWM_MAX;

            JsonDocument resp;
            resp["commanded_pwm"] = val;

            if (testAll) {
                wifiLog("[TEST] All channels → PWM %d", val);
                for (int i = 0; i < NUM_CHANNELS; i++) {
                    channelPWM[i] = val;
                    applyChannel(i, val);
                }
                currentPattern = PAT_NONE;

                // Readback all channels from PCA9685
                JsonArray results = resp["readback"].to<JsonArray>();
                for (int i = 0; i < NUM_CHANNELS; i++) {
                    int in1 = i * 2;
                    uint8_t baseReg = 0x06 + (in1 * 4);
                    uint8_t offL = readPCA9685Reg(baseReg + 2);
                    uint8_t offH = readPCA9685Reg(baseReg + 3);
                    uint16_t readVal = offL | ((offH & 0x0F) << 8);
                    bool fullOn = (readPCA9685Reg(baseReg + 1) & 0x10);
                    bool fullOff = (offH & 0x10);

                    JsonObject r = results.add<JsonObject>();
                    r["channel"] = i;
                    r["readback"] = readVal;
                    r["full_on"] = fullOn;
                    r["full_off"] = fullOff;
                    r["match"] = (val == 0 && fullOff) || (val == PWM_MAX && fullOn) || (readVal == val);
                    wifiLog("[TEST] CH%d: cmd=%d read=%d fullOn=%d fullOff=%d",
                        i, val, readVal, fullOn, fullOff);
                }
            } else {
                if (ch < 0 || ch >= NUM_CHANNELS) {
                    request->send(400, "application/json", "{\"error\":\"channel 0-7\"}");
                    return;
                }
                wifiLog("[TEST] CH%d → PWM %d", ch, val);
                channelPWM[ch] = val;
                currentPattern = PAT_NONE;
                applyChannel(ch, val);

                // Readback from PCA9685
                int in1 = ch * 2;
                uint8_t baseReg = 0x06 + (in1 * 4);
                uint8_t offL = readPCA9685Reg(baseReg + 2);
                uint8_t offH = readPCA9685Reg(baseReg + 3);
                uint16_t readVal = offL | ((offH & 0x0F) << 8);
                bool fullOn = (readPCA9685Reg(baseReg + 1) & 0x10);
                bool fullOff = (offH & 0x10);

                resp["channel"] = ch;
                resp["readback"] = readVal;
                resp["full_on"] = fullOn;
                resp["full_off"] = fullOff;
                resp["match"] = (val == 0 && fullOff) || (val == PWM_MAX && fullOn) || (readVal == val);
                wifiLog("[TEST] CH%d: cmd=%d read=%d fullOn=%d fullOff=%d match=%s",
                    ch, val, readVal, fullOn, fullOff,
                    resp["match"].as<bool>() ? "YES" : "NO");
            }

            resp["ok"] = true;
            String out;
            serializeJson(resp, out);
            request->send(200, "application/json", out);
        });

    // ── GET /api/debug/log — WiFi Log Buffer ─────────
    server.on("/api/debug/log", HTTP_GET, [](AsyncWebServerRequest *request) {
        JsonDocument doc;
        JsonArray entries = doc["entries"].to<JsonArray>();
        // Read from oldest to newest
        int start = (logCount < LOG_LINES) ? 0 : logHead;
        for (int i = 0; i < logCount; i++) {
            int idx = (start + i) % LOG_LINES;
            entries.add(String(logBuf[idx]));
        }
        doc["count"] = logCount;
        String out;
        serializeJson(doc, out);
        request->send(200, "application/json", out);
    });

    // ── GET /api/debug/scanpins — GPIO Pin Scanner ─────
    // Scan exposed ESP32-S3-WROOM-1 GPIO pairs to find PCA9685
    server.on("/api/debug/scanpins", HTTP_GET, [](AsyncWebServerRequest *request) {
        wifiLog("[DEBUG] GPIO I2C pin scan starting...");
        JsonDocument doc;
        JsonArray found = doc["found"].to<JsonArray>();

        // Only GPIOs exposed on ESP32-S3-WROOM-1 module that are safe for I2C
        // Excluded: GPIO0 (BOOT strap), GPIO19/20 (USB), GPIO26-32 (SPI flash)
        // GPIO33-37 (SPI flash on octal variants), GPIO43/44 (default UART0)
        const int gpios[] = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39, 40, 41, 42, 45, 46, 47, 48};
        const int numGpios = sizeof(gpios) / sizeof(gpios[0]);

        int attempts = 0;
        for (int si = 0; si < numGpios && found.size() == 0; si++) {
            for (int ci = 0; ci < numGpios && found.size() == 0; ci++) {
                if (si == ci) continue;
                int sda = gpios[si];
                int scl = gpios[ci];

                Wire.end();
                Wire.begin(sda, scl);
                delay(2);

                Wire.beginTransmission(PCA9685_ADDR);
                uint8_t err = Wire.endTransmission();
                attempts++;

                // Feed watchdog every iteration
                yield();

                if (err == 0) {
                    wifiLog("[SCANPINS] *** PCA9685 FOUND at SDA=GPIO%d, SCL=GPIO%d ***", sda, scl);
                    JsonObject hit = found.add<JsonObject>();
                    hit["sda"] = sda;
                    hit["scl"] = scl;
                    hit["address"] = "0x40";

                    // Scan for other devices on this bus
                    JsonArray others = hit["other_devices"].to<JsonArray>();
                    for (uint8_t a = 1; a < 127; a++) {
                        if (a == PCA9685_ADDR) continue;
                        Wire.beginTransmission(a);
                        if (Wire.endTransmission() == 0) {
                            char hex[8];
                            snprintf(hex, sizeof(hex), "0x%02X", a);
                            others.add(String(hex));
                        }
                        yield();
                    }
                    // Don't stop — keep scanning for more valid pin pairs
                    // Actually, stop after first find to keep response fast
                }
            }
            // Feed watchdog between outer loop iterations
            yield();
        }

        doc["attempts"] = attempts;
        doc["status"] = found.size() > 0 ? "found" : "not_found";

        if (found.size() == 0) {
            wifiLog("[SCANPINS] No PCA9685 found on any GPIO pair (%d attempts)", attempts);
        }

        // Restore original I2C config
        Wire.end();
        Wire.begin(I2C_SDA, I2C_SCL);

        String out;
        serializeJson(doc, out);
        request->send(200, "application/json", out);
    });

    wifiLog("[DEBUG] Debug API endpoints registered");
}
