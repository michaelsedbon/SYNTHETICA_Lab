/*
 * Cryptographic Beings — ESP8266 Controller
 * ==========================================
 * Features:
 *   - WiFi connection + mDNS (cryptobeings.local)
 *   - OTA (Over-The-Air) firmware updates
 *   - Web dashboard on port 80 with live WebSocket logs
 *   - WebSocket debug server on port 81 (replaces Serial debug)
 *   - Serial bridge to Arduino Nano (hardware UART, 115200 baud)
 *   - OLED display (SSD1306 128x64, I2C on D1/D2)
 *   - REST API (/api/*) with JSON responses for agent control
 *
 * API endpoints:
 *   GET /api/ping         → {"ok":true,"response":"PONG"}
 *   GET /api/status       → {"pos":0,"hall":0,"enabled":1,...}
 *   GET /api/calibrate    → {"ok":true,"spr":30144}
 *   GET /api/half         → {"ok":true,"steps":15072}
 *   GET /api/home         → {"ok":true}
 *   GET /api/move?steps=N → {"ok":true,"steps":N}
 *   GET /api/move-to?pos=N → {"ok":true,"target":N}
 *   GET /api/stop         → {"ok":true}
 *   GET /api/speed?value=N → {"ok":true,"speed":N}
 *   GET /api/accel?value=N → {"ok":true,"accel":N}
 *
 * Debug strategy:
 *   Hardware Serial (TX/RX) is dedicated to the Nano link.
 *   All debug output goes through WebSocket on port 81.
 *   Open http://<ip> to see live-streaming logs.
 *
 * After first USB flash, future uploads go via OTA:
 *   pio run -e ota -t upload -d firmware/esp8266_ota
 */

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include <ESP8266WebServer.h>
#include <WebSocketsServer.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ── Nano reset pin (ESP D5 = GPIO14 → Nano RST) ──
#define PIN_NANO_RESET 14

// ── WiFi credentials ──
const char* ssid     = "MEDICALEX";
const char* password = "94110Med+";

// ── OTA hostname (configurable via build flags for Board 3/4) ──
#ifndef WIFI_HOSTNAME
  #define WIFI_HOSTNAME "cryptobeings-dm542t"
#endif
const char* hostname = WIFI_HOSTNAME;

// ── OLED setup (128x64, I2C, address 0x3C) ──
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1  // No reset pin
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
bool oledReady = false;

// ── Web server on port 80 ──
ESP8266WebServer server(80);

// ── WebSocket server on port 81 (debug pipe) ──
WebSocketsServer webSocket = WebSocketsServer(81);

// ── TCP serial bridge on port 2323 (raw bytes for flashing) ──
WiFiServer tcpBridge(2323);
WiFiClient tcpClient;

// ── Log buffer (ring buffer for web dashboard + WebSocket) ──
#define LOG_SIZE 50
String logBuffer[LOG_SIZE];
int logIndex = 0;

// ── Serial bridge buffer (reads from Nano) ──
String nanoBuffer = "";

// ── API response collection ──
// When an API call is in progress, we collect Nano responses here
#define API_RESPONSE_MAX 16
String apiResponseLines[API_RESPONSE_MAX];
int apiResponseCount = 0;
bool apiWaiting = false;
unsigned long apiStartTime = 0;
unsigned long apiTimeoutMs = 5000;  // Default 5s timeout


// ══════════════════════════════════════════════
// ── Debug logging (WiFi pipe) ──
// ══════════════════════════════════════════════

void debugLog(String msg) {
    // Store in ring buffer
    String entry = String(millis()) + "ms | " + msg;
    logBuffer[logIndex % LOG_SIZE] = entry;
    logIndex++;

    // Sanitize: strip non-printable/non-ASCII bytes to keep WebSocket text frames valid UTF-8
    String clean;
    clean.reserve(entry.length());
    for (unsigned int i = 0; i < entry.length(); i++) {
        char c = entry[i];
        if (c >= 0x20 && c < 0x7F) clean += c;  // printable ASCII only
        else if (c == '\n' || c == '\t') clean += c;
    }

    // Broadcast to all connected WebSocket clients
    webSocket.broadcastTXT(clean);
}

// ══════════════════════════════════════════════
// ── OLED display ──
// ══════════════════════════════════════════════

void oledShowBoot(String ip) {
    if (!oledReady) return;
    display.clearDisplay();

    // Title
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(4, 4);
    display.println(F("CRYPTOGRAPHIC"));
    display.setCursor(4, 16);
    display.println(F("   BEINGS"));

    // Divider line
    display.drawLine(0, 28, 128, 28, SSD1306_WHITE);

    // IP address
    display.setCursor(4, 34);
    display.print(F("IP: "));
    display.println(ip);

    // Status
    display.setCursor(4, 48);
    display.println(F("WiFi OK  |  API ON"));

    display.display();
}

// ══════════════════════════════════════════════
// ── API helper: send command and collect response ──
// ══════════════════════════════════════════════

void apiSendAndCollect(String cmd) {
    // Clear previous response
    apiResponseCount = 0;
    for (int i = 0; i < API_RESPONSE_MAX; i++) apiResponseLines[i] = "";

    // Send command to Nano
    Serial.println(cmd);
    debugLog("TX >> " + cmd);

    // Mark that we're waiting for response
    apiWaiting = true;
    apiStartTime = millis();
}

bool apiCollectLines(unsigned long timeout) {
    apiTimeoutMs = timeout;
    unsigned long start = millis();

    while (millis() - start < timeout) {
        // Read any available serial data
        while (Serial.available()) {
            char c = Serial.read();
            if (c == '\n') {
                if (nanoBuffer.length() > 0) {
                    debugLog("RX << " + nanoBuffer);
                    if (apiResponseCount < API_RESPONSE_MAX) {
                        apiResponseLines[apiResponseCount++] = nanoBuffer;
                    }
                    nanoBuffer = "";
                }
            } else if (c != '\r') {
                nanoBuffer += c;
            }
        }

        // Check if we have a complete response
        // Most commands respond with one line starting with OK, ERROR, PONG, HOMED, POS, etc.
        if (apiResponseCount > 0) {
            String lastLine = apiResponseLines[apiResponseCount - 1];
            // STATUS sends multiple lines, wait for all of them
            // We know STATUS ends with CAL: line now
            if (lastLine.startsWith("CAL:") || lastLine.startsWith("OK") ||
                lastLine.startsWith("ERROR") || lastLine.startsWith("PONG") ||
                lastLine.startsWith("HOMED") || lastLine.startsWith("CAL_DONE") ||
                lastLine.startsWith("CAL_FAIL") || lastLine.startsWith("CAL_ABORTED") ||
                lastLine.startsWith("SPR:")) {
                // For STATUS, we need to wait for the CAL: line which is the last field
                // For other commands, one response line is enough
                apiWaiting = false;
                return true;
            }
        }

        yield();  // Feed the ESP watchdog
        delay(10);
    }

    apiWaiting = false;
    return apiResponseCount > 0;
}

void sendCorsHeaders() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}


// ══════════════════════════════════════════════
// ── API endpoints ──
// ══════════════════════════════════════════════

void handleApiPing() {
    sendCorsHeaders();
    apiSendAndCollect("PING");
    if (apiCollectLines(3000)) {
        bool pong = false;
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i] == "PONG") pong = true;
        }
        if (pong) {
            server.send(200, "application/json", "{\"ok\":true,\"response\":\"PONG\"}");
        } else {
            server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
        }
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiStatus() {
    sendCorsHeaders();
    apiSendAndCollect("STATUS");
    // STATUS returns 7 lines: POS, HALL, ENABLED, SPEED, MOVING, SPR, CAL
    if (apiCollectLines(5000)) {
        long pos = 0;
        int hall = 0, enabled = 0, speed = 0, moving = 0, spr = 0, cal = 0;

        for (int i = 0; i < apiResponseCount; i++) {
            String line = apiResponseLines[i];
            if (line.startsWith("POS:")) pos = line.substring(4).toInt();
            else if (line.startsWith("HALL:")) hall = line.substring(5).toInt();
            else if (line.startsWith("ENABLED:")) enabled = line.substring(8).toInt();
            else if (line.startsWith("SPEED:")) speed = line.substring(6).toInt();
            else if (line.startsWith("MOVING:")) moving = line.substring(7).toInt();
            else if (line.startsWith("SPR:")) spr = line.substring(4).toInt();
            else if (line.startsWith("CAL:")) cal = line.substring(4).toInt();
        }

        String json = "{";
        json += "\"pos\":" + String(pos) + ",";
        json += "\"hall\":" + String(hall) + ",";
        json += "\"enabled\":" + String(enabled) + ",";
        json += "\"speed\":" + String(speed) + ",";
        json += "\"moving\":" + String(moving) + ",";
        json += "\"spr\":" + String(spr) + ",";
        json += "\"calibrated\":" + String(cal);
        json += "}";
        server.send(200, "application/json", json);
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiCalibrate() {
    sendCorsHeaders();
    apiSendAndCollect("CALIBRATE");
    // Calibration takes a long time — home + full revolution
    if (apiCollectLines(120000)) {  // 2 minute timeout
        bool done = false;
        long spr = 0;
        String errorMsg = "";

        for (int i = 0; i < apiResponseCount; i++) {
            String line = apiResponseLines[i];
            if (line.startsWith("CAL_DONE SPR:")) {
                done = true;
                spr = line.substring(13).toInt();
            } else if (line.startsWith("CAL_FAIL")) {
                errorMsg = line;
            }
        }

        if (done) {
            server.send(200, "application/json",
                "{\"ok\":true,\"spr\":" + String(spr) + "}");
        } else if (errorMsg.length() > 0) {
            server.send(200, "application/json",
                "{\"ok\":false,\"error\":\"" + errorMsg + "\"}");
        } else {
            server.send(200, "application/json",
                "{\"ok\":false,\"error\":\"calibration_incomplete\"}");
        }
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiHalf() {
    sendCorsHeaders();
    apiSendAndCollect("HALF");
    if (apiCollectLines(30000)) {  // 30s — half rotation may be slow
        for (int i = 0; i < apiResponseCount; i++) {
            String line = apiResponseLines[i];
            if (line.startsWith("OK HALF ")) {
                long steps = line.substring(8).toInt();
                server.send(200, "application/json",
                    "{\"ok\":true,\"steps\":" + String(steps) + "}");
                return;
            } else if (line.startsWith("ERROR:")) {
                server.send(200, "application/json",
                    "{\"ok\":false,\"error\":\"" + line + "\"}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiHome() {
    sendCorsHeaders();
    apiSendAndCollect("HOME");
    if (apiCollectLines(60000)) {  // 60s to home
        bool homed = false;
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i] == "HOMED") homed = true;
            if (apiResponseLines[i].startsWith("OK HOMING")) {
                // HOME responds with OK HOMING immediately, then HOMED later
                // We need to wait longer for the HOMED response
            }
        }
        // If we got OK HOMING but not yet HOMED, keep waiting
        if (!homed) {
            if (apiCollectLines(60000)) {
                for (int i = 0; i < apiResponseCount; i++) {
                    if (apiResponseLines[i] == "HOMED") homed = true;
                }
            }
        }
        if (homed) {
            server.send(200, "application/json", "{\"ok\":true}");
        } else {
            server.send(200, "application/json", "{\"ok\":false,\"error\":\"homing_incomplete\"}");
        }
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiMove() {
    sendCorsHeaders();
    if (!server.hasArg("steps")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_steps_param\"}");
        return;
    }
    long steps = server.arg("steps").toInt();
    apiSendAndCollect("MOVE " + String(steps));
    if (apiCollectLines(5000)) {
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i].startsWith("OK MOVE")) {
                server.send(200, "application/json",
                    "{\"ok\":true,\"steps\":" + String(steps) + "}");
                return;
            } else if (apiResponseLines[i].startsWith("ERROR:")) {
                server.send(200, "application/json",
                    "{\"ok\":false,\"error\":\"" + apiResponseLines[i] + "\"}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiMoveTo() {
    sendCorsHeaders();
    if (!server.hasArg("pos")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_pos_param\"}");
        return;
    }
    long pos = server.arg("pos").toInt();
    apiSendAndCollect("MOVETO " + String(pos));
    if (apiCollectLines(5000)) {
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i].startsWith("OK MOVETO")) {
                server.send(200, "application/json",
                    "{\"ok\":true,\"target\":" + String(pos) + "}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiStop() {
    sendCorsHeaders();
    apiSendAndCollect("STOP");
    if (apiCollectLines(3000)) {
        server.send(200, "application/json", "{\"ok\":true}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiSpeed() {
    sendCorsHeaders();
    if (!server.hasArg("value")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_value_param\"}");
        return;
    }
    int value = server.arg("value").toInt();
    apiSendAndCollect("SPEED " + String(value));
    if (apiCollectLines(3000)) {
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i].startsWith("OK SPEED")) {
                server.send(200, "application/json",
                    "{\"ok\":true,\"speed\":" + String(value) + "}");
                return;
            } else if (apiResponseLines[i].startsWith("ERROR:")) {
                server.send(200, "application/json",
                    "{\"ok\":false,\"error\":\"" + apiResponseLines[i] + "\"}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiAccel() {
    sendCorsHeaders();
    if (!server.hasArg("value")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_value_param\"}");
        return;
    }
    int value = server.arg("value").toInt();
    apiSendAndCollect("ACCEL " + String(value));
    if (apiCollectLines(3000)) {
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i].startsWith("OK ACCEL")) {
                server.send(200, "application/json",
                    "{\"ok\":true,\"accel\":" + String(value) + "}");
                return;
            } else if (apiResponseLines[i].startsWith("ERROR:")) {
                server.send(200, "application/json",
                    "{\"ok\":false,\"error\":\"" + apiResponseLines[i] + "\"}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiGoto() {
    sendCorsHeaders();
    if (!server.hasArg("target")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_target_param\"}");
        return;
    }
    String target = server.arg("target");
    target.toUpperCase();
    apiSendAndCollect("GOTO " + target);
    if (apiCollectLines(30000)) {
        for (int i = 0; i < apiResponseCount; i++) {
            String line = apiResponseLines[i];
            if (line.startsWith("OK GOTO")) {
                // Parse "OK GOTO TUBE1 POS:5943"
                int posIdx = line.indexOf("POS:");
                long pos = (posIdx >= 0) ? line.substring(posIdx + 4).toInt() : 0;
                server.send(200, "application/json",
                    "{\"ok\":true,\"target\":\"" + target + "\",\"pos\":" + String(pos) + "}");
                return;
            } else if (line.startsWith("ERROR:")) {
                server.send(200, "application/json",
                    "{\"ok\":false,\"error\":\"" + line + "\"}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

void handleApiPositions() {
    sendCorsHeaders();
    apiSendAndCollect("POSITIONS");
    // POSITIONS returns multiple lines ending with END_POSITIONS
    // Override apiCollectLines end-detection — we need to wait for END_POSITIONS
    unsigned long start = millis();
    while (millis() - start < 10000) {
        while (Serial.available()) {
            char c = Serial.read();
            if (c == '\n') {
                if (nanoBuffer.length() > 0) {
                    debugLog("RX << " + nanoBuffer);
                    if (apiResponseCount < API_RESPONSE_MAX) {
                        apiResponseLines[apiResponseCount++] = nanoBuffer;
                    }
                    if (nanoBuffer == "END_POSITIONS") goto positions_done;
                    if (nanoBuffer.startsWith("ERROR:")) {
                        server.send(200, "application/json",
                            "{\"ok\":false,\"error\":\"" + nanoBuffer + "\"}");
                        apiWaiting = false;
                        return;
                    }
                    nanoBuffer = "";
                }
            } else if (c != '\r') {
                nanoBuffer += c;
            }
        }
        yield();
        delay(10);
    }
    apiWaiting = false;
    server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    return;

    positions_done:
    apiWaiting = false;
    nanoBuffer = "";
    // Build JSON from collected lines
    String json = "{\"ok\":true,\"positions\":{";
    long offset = 0;
    bool first = true;
    for (int i = 0; i < apiResponseCount; i++) {
        String line = apiResponseLines[i];
        if (line == "END_POSITIONS") break;
        int colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            String key = line.substring(0, colonIdx);
            String val = line.substring(colonIdx + 1);
            key.toLowerCase();
            if (key == "offset") {
                offset = val.toInt();
            } else {
                if (!first) json += ",";
                json += "\"" + key + "\":" + val;
                first = false;
            }
        }
    }
    json += "},\"offset\":" + String(offset) + "}";
    server.send(200, "application/json", json);
}

void handleApiSetOffset() {
    sendCorsHeaders();
    if (!server.hasArg("value")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_value_param\"}");
        return;
    }
    long value = server.arg("value").toInt();
    apiSendAndCollect("SET_OFFSET " + String(value));
    if (apiCollectLines(5000)) {
        for (int i = 0; i < apiResponseCount; i++) {
            if (apiResponseLines[i].startsWith("OK OFFSET")) {
                server.send(200, "application/json",
                    "{\"ok\":true,\"offset\":" + String(value) + "}");
                return;
            }
        }
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"unexpected_response\"}");
    } else {
        server.send(504, "application/json", "{\"ok\":false,\"error\":\"timeout\"}");
    }
}

// ══════════════════════════════════════════════
// ── WebSocket event handler ──
// ══════════════════════════════════════════════

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            break;
        case WStype_CONNECTED:
            {
                // Send recent log history to newly connected client
                int start = max(0, logIndex - LOG_SIZE);
                for (int i = start; i < logIndex; i++) {
                    webSocket.sendTXT(num, logBuffer[i % LOG_SIZE]);
                }
            }
            break;
        case WStype_TEXT:
            {
                // Client can also send commands to Nano via WebSocket
                String cmd = String((char*)payload);
                cmd.trim();
                if (cmd.length() > 0) {
                    Serial.println(cmd);  // Forward to Nano
                    debugLog("TX >> " + cmd);
                }
            }
            break;
        default:
            break;
    }
}

// ══════════════════════════════════════════════
// ── Legacy web handlers (kept for backward compatibility) ──
// ══════════════════════════════════════════════

void handleRoot() {
    String html = R"rawhtml(<!DOCTYPE html><html><head>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>Cryptographic Beings - Motor Control</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier New',monospace;background:#0a0a0f;color:#c8d6e5;min-height:100vh}
.header{background:linear-gradient(135deg,#0d1117,#161b22);padding:16px 20px;border-bottom:1px solid #30363d}
.header h1{font-size:16px;color:#58a6ff;letter-spacing:2px}
.header .ip{font-size:11px;color:#8b949e;margin-top:4px}
.ws-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#f85149;margin-right:6px;vertical-align:middle}
.ws-dot.ok{background:#3fb950}

.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;max-width:900px;margin:0 auto}
@media(max-width:600px){.grid{grid-template-columns:1fr}}

.panel{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px}
.panel h2{font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:1px solid #21262d;padding-bottom:6px}

.btn-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.btn{background:#21262d;color:#c9d1d9;border:1px solid #30363d;padding:8px 12px;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;transition:all .15s}
.btn:hover{background:#30363d;border-color:#58a6ff}
.btn:active{transform:scale(.95)}
.btn.danger{border-color:#f8514950;color:#f85149}.btn.danger:hover{background:#f8514920}
.btn.success{border-color:#3fb95050;color:#3fb950}.btn.success:hover{background:#3fb95020}
.btn.warn{border-color:#d2992050;color:#d29920}.btn.warn:hover{background:#d2992020}
.btn.primary{border-color:#58a6ff50;color:#58a6ff}.btn.primary:hover{background:#58a6ff20}

.sensor-box{display:flex;align-items:center;gap:12px;padding:10px;background:#0d1117;border-radius:6px;border:1px solid #21262d}
.sensor-led{width:20px;height:20px;border-radius:50%;background:#21262d;border:2px solid #30363d;transition:all .2s}
.sensor-led.active{background:#3fb950;box-shadow:0 0 12px #3fb95080}
.sensor-label{font-size:13px;color:#8b949e}
.sensor-val{font-size:18px;font-weight:bold;color:#c9d1d9}
.sound-toggle{font-size:11px;color:#8b949e;cursor:pointer;user-select:none}
.sound-toggle:hover{color:#58a6ff}

.status-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.stat{background:#0d1117;padding:8px;border-radius:4px;border:1px solid #21262d}
.stat-label{font-size:10px;color:#8b949e;text-transform:uppercase}
.stat-val{font-size:16px;color:#58a6ff;font-weight:bold;margin-top:2px}

.cmd-input{display:flex;gap:6px;margin-bottom:8px}
.cmd-input input{flex:1;background:#0d1117;color:#3fb950;border:1px solid #30363d;padding:8px 10px;border-radius:6px;font-family:inherit;font-size:12px;outline:none}
.cmd-input input:focus{border-color:#58a6ff}

.log-box{background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:8px;max-height:300px;overflow-y:auto;font-size:11px;line-height:1.7}
.log-box div{padding:1px 0;border-bottom:1px solid #161b22;word-break:break-all}
.log-box .tx{color:#d29920}
.log-box .rx{color:#3fb950}

.range-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.range-row label{font-size:11px;color:#8b949e;min-width:50px}
.range-row input[type=range]{flex:1;accent-color:#58a6ff}
.range-row .val{font-size:12px;color:#58a6ff;min-width:50px;text-align:right}

.full{grid-column:1/-1}
</style></head><body>

<div class='header'>
  <h1>CRYPTOGRAPHIC BEINGS - MOTOR CONTROL</h1>
  <div class='ip'><span class='ws-dot' id='wsDot'></span><span id='wsLabel'>Connecting...</span> | )rawhtml";
    html += "IP: " + WiFi.localIP().toString() + " | Up: " + String(millis()/1000) + "s</div></div>";
    html += R"rawhtml(
</div>

<div class='grid'>

  <!-- Motor Controls -->
  <div class='panel'>
    <h2>Motor Controls</h2>
    <div class='btn-row'>
      <button class='btn' onclick='cmd("MOVE -1000")'>&lt;&lt; -1000</button>
      <button class='btn' onclick='cmd("MOVE -100")'>&lt; -100</button>
      <button class='btn danger' onclick='cmd("STOP")'>[STOP]</button>
      <button class='btn' onclick='cmd("MOVE 100")'>100 &gt;</button>
      <button class='btn' onclick='cmd("MOVE 1000")'>1000 &gt;&gt;</button>
    </div>
    <div class='btn-row'>
      <button class='btn success' onclick='cmd("HOME")'>HOME</button>
      <button class='btn warn' onclick='cmd("CALIBRATE")'>CALIBRATE</button>
      <button class='btn primary' onclick='cmd("HALF")'>HALF</button>
      <button class='btn' onclick='cmd("ZERO")'>ZERO</button>
      <button class='btn' onclick='cmd("STATUS")'>STATUS</button>
    </div>
  </div>

  <!-- Sensor -->
  <div class='panel'>
    <h2>Proximity Sensor</h2>
    <div class='sensor-box'>
      <div class='sensor-led' id='sensorLed'></div>
      <div>
        <div class='sensor-label'>HALL / PROXIMITY</div>
        <div class='sensor-val' id='sensorVal'>--</div>
      </div>
    </div>
    <div style='margin-top:8px'>
      <span class='sound-toggle' id='soundBtn' onclick='toggleSound()'>Sound on trigger: ON</span>
    </div>
    <div style='margin-top:10px'>
      <button class='btn primary' onclick='cmd("STATUS")' style='width:100%'>Refresh Sensor</button>
    </div>
  </div>

  <!-- Speed / Accel -->
  <div class='panel'>
    <h2>Speed / Acceleration</h2>
    <div class='range-row'>
      <label>Speed</label>
      <input type='range' id='speedSlider' min='200' max='5000' value='2000' oninput='document.getElementById("speedVal").textContent=this.value'>
      <span class='val' id='speedVal'>2000</span>
    </div>
    <button class='btn' onclick='cmd("SPEED "+document.getElementById("speedSlider").value)' style='width:100%'>Apply Speed</button>
    
    <div class='range-row' style='margin-top:10px'>
      <label>Accel</label>
      <input type='range' id='accelSlider' min='10' max='200' value='50' oninput='document.getElementById("accelVal").textContent=this.value'>
      <span class='val' id='accelVal'>50</span>
    </div>
    <button class='btn' onclick='cmd("ACCEL "+document.getElementById("accelSlider").value)' style='width:100%'>Apply Accel</button>
  </div>

  <!-- Status -->
  <div class='panel'>
    <h2>Status</h2>
    <div class='status-grid'>
      <div class='stat'><div class='stat-label'>Position</div><div class='stat-val' id='stPos'>--</div></div>
      <div class='stat'><div class='stat-label'>Speed</div><div class='stat-val' id='stSpeed'>--</div></div>
      <div class='stat'><div class='stat-label'>Moving</div><div class='stat-val' id='stMoving'>--</div></div>
      <div class='stat'><div class='stat-label'>Calibrated</div><div class='stat-val' id='stCal'>--</div></div>
      <div class='stat'><div class='stat-label'>SPR</div><div class='stat-val' id='stSpr'>--</div></div>
      <div class='stat'><div class='stat-label'>Enabled</div><div class='stat-val' id='stEnabled'>--</div></div>
    </div>
  </div>

  <!-- Command + Log -->
  <div class='panel full'>
    <h2>Command & Live Log</h2>
    <div class='cmd-input'>
      <input id='cmdIn' placeholder='Type command: MOVE 200, HOME, STATUS, PING...' onkeydown='if(event.key==="Enter")sendManual()'>
      <button class='btn primary' onclick='sendManual()'>SEND</button>
      <button class='btn' onclick='document.getElementById("logDiv").innerHTML=""'>CLEAR</button>
    </div>
    <div class='log-box' id='logDiv'></div>
  </div>

</div>

<script>
var ws,logDiv=document.getElementById('logDiv'),soundOn=true,lastHall=-1;
var actx,beepReady=false;

function initAudio(){
  try{actx=new(window.AudioContext||window.webkitAudioContext)();beepReady=true;}catch(e){}
}

function beep(freq,dur){
  if(!beepReady||!soundOn)return;
  try{
    var o=actx.createOscillator(),g=actx.createGain();
    o.connect(g);g.connect(actx.destination);
    o.type='sine';o.frequency.value=freq||880;
    g.gain.value=0.3;
    o.start();o.stop(actx.currentTime+(dur||0.15));
  }catch(e){}
}

function toggleSound(){
  soundOn=!soundOn;
  if(soundOn&&!beepReady)initAudio();
  document.getElementById('soundBtn').textContent='🔊 Sound on trigger: '+(soundOn?'ON':'OFF');
}

function connect(){
  ws=new WebSocket('ws://'+location.hostname+':81/');
  ws.onopen=function(){
    document.getElementById('wsDot').className='ws-dot ok';
    document.getElementById('wsLabel').textContent='Connected';
    if(!beepReady)initAudio();
  };
  ws.onmessage=function(e){
    var msg=e.data;
    var d=document.createElement('div');
    d.textContent=msg;
    if(msg.indexOf('TX')>=0)d.className='tx';
    else if(msg.indexOf('RX')>=0)d.className='rx';
    logDiv.insertBefore(d,logDiv.firstChild);
    if(logDiv.children.length>200)logDiv.removeChild(logDiv.lastChild);

    // Parse status fields
    if(msg.indexOf('RX << POS:')>=0){var v=msg.split('POS:')[1];document.getElementById('stPos').textContent=v;}
    if(msg.indexOf('RX << SPEED:')>=0){var v=msg.split('SPEED:')[1];document.getElementById('stSpeed').textContent=v;}
    if(msg.indexOf('RX << MOVING:')>=0){var v=msg.split('MOVING:')[1];document.getElementById('stMoving').textContent=v==='0'?'No':'YES';}
    if(msg.indexOf('RX << CAL:')>=0){var v=msg.split('CAL:')[1];document.getElementById('stCal').textContent=v==='1'?'✅':'❌';}
    if(msg.indexOf('RX << SPR:')>=0){var v=msg.split('SPR:')[1];document.getElementById('stSpr').textContent=v;}
    if(msg.indexOf('RX << ENABLED:')>=0){var v=msg.split('ENABLED:')[1];document.getElementById('stEnabled').textContent=v==='1'?'✅':'❌';}
    if(msg.indexOf('RX << HALL:')>=0){
      var v=parseInt(msg.split('HALL:')[1]);
      document.getElementById('sensorVal').textContent=v?'DETECTED':'clear';
      var led=document.getElementById('sensorLed');
      if(v){led.classList.add('active');}else{led.classList.remove('active');}
      if(v&&lastHall===0){beep(880,0.15);setTimeout(function(){beep(1100,0.1);},160);}
      lastHall=v;
    }
  };
  ws.onclose=function(){
    document.getElementById('wsDot').className='ws-dot';
    document.getElementById('wsLabel').textContent='Disconnected (reconnecting...)';
    setTimeout(connect,2000);
  };
  ws.onerror=function(){ws.close();};
}
connect();

function cmd(c){if(ws&&ws.readyState===1)ws.send(c);}
function sendManual(){var i=document.getElementById('cmdIn');if(i.value){cmd(i.value);i.value='';}}

// Auto-poll status every 5s
setInterval(function(){cmd('STATUS');},5000);
</script>
</body></html>)rawhtml";
    server.send(200, "text/html", html);
}

void handleSend() {
    if (server.hasArg("cmd")) {
        String cmd = server.arg("cmd");
        Serial.println(cmd);  // Send to Nano via hardware TX
        debugLog("TX >> " + cmd);
    }
    server.sendHeader("Location", "/");
    server.send(302);
}

void handleStatus() {
    String json = "{";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"oled\":" + String(oledReady ? "true" : "false");
    json += "}";
    server.send(200, "application/json", json);
}

void handleLog() {
    String json = "[";
    int start = max(0, logIndex - LOG_SIZE);
    for (int i = start; i < logIndex; i++) {
        if (i > start) json += ",";
        json += "\"" + logBuffer[i % LOG_SIZE] + "\"";
    }
    json += "]";
    server.send(200, "application/json", json);
}

void handleResetNano() {
    debugLog("Resetting Nano via D5...");
    // Pull RESET low for 100ms, then release
    digitalWrite(PIN_NANO_RESET, LOW);
    delay(100);
    digitalWrite(PIN_NANO_RESET, HIGH);
    debugLog("Nano reset complete — bootloader window open");
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Nano reset, bootloader active\"}");
}

// ══════════════════════════════════════════════
// ── Setup ──
// ══════════════════════════════════════════════

void setup() {
    // Hardware Serial → dedicated to Nano communication
    Serial.begin(115200);

    // Nano reset pin — start HIGH (not resetting)
    pinMode(PIN_NANO_RESET, OUTPUT);
    digitalWrite(PIN_NANO_RESET, HIGH);

    // ── OLED init ──
    // Match original firmware init sequence (splash + delay required for stable display)
    Wire.begin();  // D1=SCL, D2=SDA (ESP8266 defaults)
    if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        oledReady = true;
        // Show Adafruit splash — this fully initializes the display buffer
        display.display();
        delay(100);
        // Now safe to clear and write
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE);
        display.setCursor(4, 24);
        display.println(F("Booting..."));
        display.display();
    }

    // ── WiFi ──
    WiFi.mode(WIFI_STA);
    WiFi.hostname(hostname);
    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        attempts++;
    }

    String ip = "NO WIFI";
    if (WiFi.status() == WL_CONNECTED) {
        ip = WiFi.localIP().toString();
        debugLog("WiFi connected: " + ip);
    } else {
        debugLog("WiFi connection FAILED");
    }

    // ── mDNS ──
    if (MDNS.begin(hostname)) {
        debugLog("mDNS: " + String(hostname) + ".local");
    }

    // ── OTA ──
    ArduinoOTA.setHostname(hostname);
    ArduinoOTA.setPort(8266);

    ArduinoOTA.onStart([]() {
        debugLog("OTA update starting...");
        if (oledReady) {
            display.clearDisplay();
            display.setCursor(4, 24);
            display.println(F("OTA updating..."));
            display.display();
        }
    });
    ArduinoOTA.onEnd([]() {
        debugLog("OTA update complete!");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        // Progress updates — only to OLED to avoid WebSocket spam
        if (oledReady) {
            int pct = progress / (total / 100);
            display.clearDisplay();
            display.setCursor(4, 16);
            display.println(F("OTA updating..."));
            display.setCursor(4, 32);
            display.print(pct);
            display.println(F("%"));
            // Progress bar
            display.drawRect(4, 48, 120, 10, SSD1306_WHITE);
            display.fillRect(4, 48, (120 * pct) / 100, 10, SSD1306_WHITE);
            display.display();
        }
    });
    ArduinoOTA.onError([](ota_error_t error) {
        String errMsg = "OTA Error: ";
        if (error == OTA_AUTH_ERROR) errMsg += "Auth Failed";
        else if (error == OTA_BEGIN_ERROR) errMsg += "Begin Failed";
        else if (error == OTA_CONNECT_ERROR) errMsg += "Connect Failed";
        else if (error == OTA_RECEIVE_ERROR) errMsg += "Receive Failed";
        else if (error == OTA_END_ERROR) errMsg += "End Failed";
        debugLog(errMsg);
    });
    ArduinoOTA.begin();
    debugLog("OTA ready on port 8266");

    // ── WebSocket server (debug pipe) ──
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    debugLog("WebSocket debug server on port 81");

    // ── HTTP server ──
    // Legacy endpoints
    server.on("/", handleRoot);
    server.on("/send", handleSend);
    server.on("/status", handleStatus);
    server.on("/log", handleLog);
    server.on("/reset-nano", handleResetNano);

    // New REST API endpoints
    server.on("/api/ping", handleApiPing);
    server.on("/api/status", handleApiStatus);
    server.on("/api/calibrate", handleApiCalibrate);
    server.on("/api/half", handleApiHalf);
    server.on("/api/home", handleApiHome);
    server.on("/api/move", handleApiMove);
    server.on("/api/move-to", handleApiMoveTo);
    server.on("/api/stop", handleApiStop);
    server.on("/api/speed", handleApiSpeed);
    server.on("/api/accel", handleApiAccel);
    server.on("/api/goto", handleApiGoto);
    server.on("/api/positions", handleApiPositions);
    server.on("/api/set-offset", handleApiSetOffset);

    server.begin();
    debugLog("Web server started on port 80 (legacy + API)");

    // ── TCP serial bridge (for Nano flashing) ──
    tcpBridge.begin();
    debugLog("TCP serial bridge on port 2323");

    // ── Show boot screen on OLED ──
    oledShowBoot(ip);

    debugLog("=== SYSTEM READY ===");
}

// ══════════════════════════════════════════════
// ── Loop ──
// ══════════════════════════════════════════════

void loop() {
    ArduinoOTA.handle();
    server.handleClient();
    MDNS.update();
    webSocket.loop();

    // ── TCP serial bridge: raw byte forwarding ──
    if (tcpBridge.hasClient()) {
        if (tcpClient && tcpClient.connected()) {
            tcpClient.stop();  // Only one client at a time
        }
        tcpClient = tcpBridge.accept();
        debugLog("TCP bridge client connected");
    }

    if (tcpClient && tcpClient.connected()) {
        // TCP → Serial (raw bytes from flasher to Nano)
        while (tcpClient.available()) {
            Serial.write(tcpClient.read());
        }
        // Serial → TCP (raw bytes from Nano to flasher)
        while (Serial.available()) {
            tcpClient.write(Serial.read());
        }
    } else if (!apiWaiting) {
        // Normal mode: read Nano responses line-by-line for logging
        // (Skip when API is waiting — it handles its own serial reads)
        while (Serial.available()) {
            char c = Serial.read();
            if (c == '\n') {
                debugLog("RX << " + nanoBuffer);
                nanoBuffer = "";
            } else if (c != '\r') {
                nanoBuffer += c;
            }
        }
    }
}
