/*
 * Cryptographic Beings — ESP8266 Controller
 * ==========================================
 * Features:
 *   - WiFi connection
 *   - OTA (Over-The-Air) updates
 *   - Web dashboard (view logs, send commands)
 *   - Serial bridge to Arduino Nano (TX on GPIO1)
 *   - OLED display (SSD1306 via I2C on D1/D2)
 *
 * After first USB flash, future uploads go via OTA:
 *   pio run -e ota -t upload
 */

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include <ESP8266WebServer.h>

// ── WiFi credentials ──
const char* ssid     = "MEDICALEX";
const char* password = "94110Med+";

// ── OTA hostname ──
const char* hostname = "cryptobeings";

// ── Web server on port 80 ──
ESP8266WebServer server(80);

// ── Log buffer (ring buffer for web dashboard) ──
#define LOG_SIZE 50
String logBuffer[LOG_SIZE];
int logIndex = 0;

void addLog(String msg) {
    logBuffer[logIndex % LOG_SIZE] = String(millis()) + "ms | " + msg;
    logIndex++;
}

// ── Serial bridge buffer ──
String nanoBuffer = "";

// ── Web handlers ──

void handleRoot() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
    html += "<meta http-equiv='refresh' content='5'>";
    html += "<title>Cryptographic Beings</title>";
    html += "<style>";
    html += "body{font-family:monospace;background:#111;color:#0f0;padding:20px;margin:0}";
    html += "h1{color:#0ff;border-bottom:1px solid #333;padding-bottom:10px}";
    html += ".log{background:#1a1a1a;padding:10px;border:1px solid #333;";
    html += "max-height:400px;overflow-y:auto;font-size:12px;line-height:1.6}";
    html += ".info{color:#888;margin:10px 0}";
    html += "input{background:#222;color:#0f0;border:1px solid #444;padding:8px;";
    html += "font-family:monospace;width:60%}";
    html += "button{background:#0a0;color:#000;border:none;padding:8px 16px;";
    html += "cursor:pointer;font-family:monospace;font-weight:bold}";
    html += "button:hover{background:#0f0}";
    html += ".status{color:#0ff;font-size:14px}";
    html += "</style></head><body>";
    html += "<h1>CRYPTOGRAPHIC BEINGS</h1>";
    html += "<div class='status'>WiFi: " + WiFi.localIP().toString() + " | ";
    html += "Uptime: " + String(millis() / 1000) + "s | ";
    html += "Free RAM: " + String(ESP.getFreeHeap()) + " bytes</div>";

    // Command form
    html += "<h2>Send to Nano</h2>";
    html += "<form action='/send' method='GET'>";
    html += "<input name='cmd' placeholder='e.g. MOVE 200, HOME, STATUS'>";
    html += " <button type='submit'>SEND</button></form>";

    // Log output
    html += "<h2>Log</h2><div class='log'>";
    int start = max(0, logIndex - LOG_SIZE);
    for (int i = logIndex - 1; i >= start; i--) {
        html += logBuffer[i % LOG_SIZE] + "<br>";
    }
    html += "</div>";

    html += "<div class='info'>OTA enabled: " + String(hostname) + ".local:8266</div>";
    html += "</body></html>";

    server.send(200, "text/html", html);
}

void handleSend() {
    if (server.hasArg("cmd")) {
        String cmd = server.arg("cmd");
        Serial.println(cmd);  // Send to Nano via TX
        addLog("TX >> " + cmd);
    }
    server.sendHeader("Location", "/");
    server.send(302);
}

void handleStatus() {
    String json = "{";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"rssi\":" + String(WiFi.RSSI());
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

// ── Setup ──

void setup() {
    Serial.begin(115200);
    Serial.println("\n\n=== Cryptographic Beings ESP8266 ===");

    // Connect to WiFi
    WiFi.mode(WIFI_STA);
    WiFi.hostname(hostname);
    WiFi.begin(ssid, password);

    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        addLog("WiFi connected: " + WiFi.localIP().toString());
    } else {
        Serial.println("\nWiFi FAILED! Continuing without...");
        addLog("WiFi connection failed");
    }

    // Setup mDNS
    if (MDNS.begin(hostname)) {
        Serial.println("mDNS: " + String(hostname) + ".local");
        addLog("mDNS: " + String(hostname) + ".local");
    }

    // Setup OTA
    ArduinoOTA.setHostname(hostname);
    ArduinoOTA.setPort(8266);

    ArduinoOTA.onStart([]() {
        addLog("OTA update starting...");
        Serial.println("OTA Start");
    });
    ArduinoOTA.onEnd([]() {
        addLog("OTA update complete!");
        Serial.println("\nOTA End");
    });
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("OTA Progress: %u%%\r", (progress / (total / 100)));
    });
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("OTA Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });
    ArduinoOTA.begin();
    addLog("OTA ready on port 8266");

    // Setup web server
    server.on("/", handleRoot);
    server.on("/send", handleSend);
    server.on("/status", handleStatus);
    server.on("/log", handleLog);
    server.begin();
    addLog("Web server started on port 80");

    Serial.println("Ready! Open http://" + WiFi.localIP().toString());
    addLog("=== SYSTEM READY ===");
}

// ── Loop ──

void loop() {
    ArduinoOTA.handle();
    server.handleClient();
    MDNS.update();

    // Read data from Nano (via RX pin)
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n') {
            addLog("RX << " + nanoBuffer);
            nanoBuffer = "";
        } else if (c != '\r') {
            nanoBuffer += c;
        }
    }
}
