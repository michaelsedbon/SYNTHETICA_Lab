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

// ── OTA hostname ──
const char* hostname = "cryptobeings";

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

// ══════════════════════════════════════════════
// ── Debug logging (WiFi pipe) ──
// ══════════════════════════════════════════════

void debugLog(String msg) {
    // Store in ring buffer
    String entry = String(millis()) + "ms | " + msg;
    logBuffer[logIndex % LOG_SIZE] = entry;
    logIndex++;

    // Broadcast to all connected WebSocket clients
    webSocket.broadcastTXT(entry);
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
    display.println(F("WiFi OK  |  OTA ON"));

    display.display();
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
// ── Web handlers ──
// ══════════════════════════════════════════════

void handleRoot() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
    html += "<title>Cryptographic Beings</title>";
    html += "<style>";
    html += "body{font-family:monospace;background:#111;color:#0f0;padding:20px;margin:0}";
    html += "h1{color:#0ff;border-bottom:1px solid #333;padding-bottom:10px;margin-top:0}";
    html += ".log{background:#1a1a1a;padding:10px;border:1px solid #333;";
    html += "max-height:400px;overflow-y:auto;font-size:12px;line-height:1.6}";
    html += ".log div{padding:2px 0;border-bottom:1px solid #1f1f1f}";
    html += ".info{color:#888;margin:10px 0;font-size:12px}";
    html += "input{background:#222;color:#0f0;border:1px solid #444;padding:8px;";
    html += "font-family:monospace;width:60%}";
    html += "button{background:#0a0;color:#000;border:none;padding:8px 16px;";
    html += "cursor:pointer;font-family:monospace;font-weight:bold}";
    html += "button:hover{background:#0f0}";
    html += ".status{color:#0ff;font-size:14px;margin-bottom:16px}";
    html += ".ws-status{color:#f80;font-size:12px;margin:6px 0}";
    html += "</style></head><body>";
    html += "<h1>CRYPTOGRAPHIC BEINGS</h1>";
    html += "<div class='status'>WiFi: " + WiFi.localIP().toString() + " | ";
    html += "Uptime: " + String(millis() / 1000) + "s | ";
    html += "Free RAM: " + String(ESP.getFreeHeap()) + " bytes</div>";
    html += "<div class='ws-status' id='wsStatus'>WebSocket: connecting...</div>";

    // Command form
    html += "<h2>Send to Nano</h2>";
    html += "<form id='cmdForm' onsubmit='sendCmd(event)'>";
    html += "<input id='cmd' placeholder='e.g. MOVE 200, HOME, STATUS, PING'>";
    html += " <button type='submit'>SEND</button></form>";

    // Log output
    html += "<h2>Live Debug Log</h2><div class='log' id='logDiv'></div>";

    // JavaScript: WebSocket client
    html += "<script>";
    html += "var ws;var logDiv=document.getElementById('logDiv');";
    html += "function connect(){";
    html += "ws=new WebSocket('ws://'+location.hostname+':81/');";
    html += "ws.onopen=function(){document.getElementById('wsStatus').innerHTML='WebSocket: <span style=color:#0f0>connected</span>';};";
    html += "ws.onmessage=function(e){";
    html += "var d=document.createElement('div');d.textContent=e.data;";
    html += "logDiv.insertBefore(d,logDiv.firstChild);";
    html += "if(logDiv.children.length>100)logDiv.removeChild(logDiv.lastChild);};";
    html += "ws.onclose=function(){document.getElementById('wsStatus').innerHTML='WebSocket: <span style=color:red>disconnected</span> (reconnecting...)';setTimeout(connect,2000);};";
    html += "ws.onerror=function(){ws.close();};";
    html += "}connect();";
    html += "function sendCmd(e){e.preventDefault();var c=document.getElementById('cmd').value;if(c&&ws&&ws.readyState===1){ws.send(c);document.getElementById('cmd').value='';}}";
    html += "</script>";

    html += "<div class='info'>OTA enabled: " + String(hostname) + ".local:8266 | WS debug: port 81</div>";
    html += "</body></html>";

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
    Wire.begin();  // D1=SCL, D2=SDA (ESP8266 defaults)
    if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
        oledReady = true;
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
    server.on("/", handleRoot);
    server.on("/send", handleSend);
    server.on("/status", handleStatus);
    server.on("/log", handleLog);
    server.on("/reset-nano", handleResetNano);
    server.begin();
    debugLog("Web server started on port 80");

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
    } else {
        // Normal mode: read Nano responses line-by-line for logging
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
