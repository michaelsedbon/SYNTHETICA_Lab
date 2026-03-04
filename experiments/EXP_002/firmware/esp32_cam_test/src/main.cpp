/*
 * ESP32-CAM Camera + WiFi Firmware
 * =================================
 * - Connects to WiFi (MEDICALEX)
 * - Initializes OV2640 camera
 * - Serves MJPEG stream at http://<ip>/stream
 * - Serves single JPEG capture at http://<ip>/capture
 * - Simple web UI at http://<ip>/
 * - Heartbeat blink on GPIO4 flash LED
 */

#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// ── WiFi credentials ──
const char* ssid     = "MEDICALEX";
const char* password = "94110Med+";

// ── AI-Thinker ESP32-CAM pin definitions ──
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Flash LED
#define LED_FLASH 4

// Web server on port 80
WebServer server(80);

// ── Camera init ──
bool initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = Y2_GPIO_NUM;
    config.pin_d1       = Y3_GPIO_NUM;
    config.pin_d2       = Y4_GPIO_NUM;
    config.pin_d3       = Y5_GPIO_NUM;
    config.pin_d4       = Y6_GPIO_NUM;
    config.pin_d5       = Y7_GPIO_NUM;
    config.pin_d6       = Y8_GPIO_NUM;
    config.pin_d7       = Y9_GPIO_NUM;
    config.pin_xclk     = XCLK_GPIO_NUM;
    config.pin_pclk     = PCLK_GPIO_NUM;
    config.pin_vsync    = VSYNC_GPIO_NUM;
    config.pin_href     = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    config.grab_mode    = CAMERA_GRAB_LATEST;

    // Use higher resolution if PSRAM is available
    if (psramFound()) {
        config.frame_size   = FRAMESIZE_VGA;    // 640x480
        config.jpeg_quality = 10;               // 0-63, lower = better quality
        config.fb_count     = 2;
    } else {
        config.frame_size   = FRAMESIZE_QVGA;   // 320x240
        config.jpeg_quality = 12;
        config.fb_count     = 1;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed: 0x%x\n", err);
        return false;
    }

    // Fine-tune sensor settings
    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 1);     // -2 to 2
        s->set_contrast(s, 1);       // -2 to 2
        s->set_saturation(s, 0);     // -2 to 2
        s->set_whitebal(s, 1);       // 0 = disable, 1 = enable
        s->set_awb_gain(s, 1);       // 0 = disable, 1 = enable
        s->set_wb_mode(s, 0);        // 0-4
        s->set_exposure_ctrl(s, 1);  // 0 = disable, 1 = enable
        s->set_aec2(s, 0);           // 0 = disable, 1 = enable
        s->set_gain_ctrl(s, 1);      // 0 = disable, 1 = enable
        s->set_agc_gain(s, 0);       // 0-30
        s->set_gainceiling(s, (gainceiling_t)6);  // 0-6
        s->set_bpc(s, 1);            // 0 = disable, 1 = enable
        s->set_wpc(s, 1);            // 0 = disable, 1 = enable
        s->set_raw_gma(s, 1);        // 0 = disable, 1 = enable
        s->set_lenc(s, 1);           // 0 = disable, 1 = enable
        s->set_hmirror(s, 0);        // 0 = disable, 1 = enable
        s->set_vflip(s, 0);          // 0 = disable, 1 = enable
    }

    Serial.println("Camera initialized OK");
    Serial.printf("PSRAM: %s (%d bytes free)\n",
        psramFound() ? "YES" : "NO",
        psramFound() ? ESP.getFreePsram() : 0);
    return true;
}

// ── Handle single JPEG capture ──
void handleCapture() {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        server.send(500, "text/plain", "Camera capture failed");
        return;
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send_P(200, "image/jpeg", (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
}

// ── Handle MJPEG stream ──
void handleStream() {
    WiFiClient client = server.client();

    String response = "HTTP/1.1 200 OK\r\n";
    response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n";
    response += "Access-Control-Allow-Origin: *\r\n";
    response += "\r\n";
    client.print(response);

    while (client.connected()) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Stream: capture failed");
            break;
        }

        String header = "--frame\r\n";
        header += "Content-Type: image/jpeg\r\n";
        header += "Content-Length: " + String(fb->len) + "\r\n";
        header += "\r\n";

        client.print(header);
        client.write(fb->buf, fb->len);
        client.print("\r\n");

        esp_camera_fb_return(fb);

        if (!client.connected()) break;
        delay(30);  // ~30 fps cap
    }
}

// ── Web UI ──
void handleRoot() {
    String ip = WiFi.localIP().toString();
    String html = "<!DOCTYPE html><html><head>";
    html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
    html += "<title>ESP32-CAM</title>";
    html += "<style>";
    html += "body{font-family:monospace;background:#111;color:#0f0;margin:0;padding:20px;text-align:center}";
    html += "h1{color:#0ff;margin-bottom:5px}";
    html += ".info{color:#888;font-size:12px;margin-bottom:20px}";
    html += "img{max-width:100%;border:2px solid #333;border-radius:8px}";
    html += ".btn{background:#0a0;color:#000;border:none;padding:10px 20px;margin:5px;";
    html += "cursor:pointer;font-family:monospace;font-weight:bold;border-radius:4px;font-size:14px}";
    html += ".btn:hover{background:#0f0}";
    html += ".controls{margin:15px 0}";
    html += "</style></head><body>";
    html += "<h1>ESP32-CAM</h1>";
    html += "<div class='info'>IP: " + ip + " | ";
    html += "RSSI: " + String(WiFi.RSSI()) + " dBm | ";
    html += "PSRAM: " + String(psramFound() ? "YES" : "NO") + " | ";
    html += "Heap: " + String(ESP.getFreeHeap() / 1024) + " KB</div>";
    html += "<div><img id='stream' src='/stream'></div>";
    html += "<div class='controls'>";
    html += "<button class='btn' onclick=\"document.getElementById('stream').src='/stream?'+Date.now()\">Stream</button>";
    html += "<button class='btn' onclick=\"document.getElementById('stream').src='/capture?'+Date.now()\">Snapshot</button>";
    html += "</div>";
    html += "<div class='info'>Stream: <a href='/stream' style='color:#0f0'>/stream</a> | ";
    html += "Capture: <a href='/capture' style='color:#0f0'>/capture</a></div>";
    html += "</body></html>";
    server.send(200, "text/html", html);
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n================================");
    Serial.println("ESP32-CAM Camera Server");
    Serial.println("================================");

    // Flash LED setup
    pinMode(LED_FLASH, OUTPUT);
    digitalWrite(LED_FLASH, LOW);

    // Boot blink
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_FLASH, HIGH); delay(200);
        digitalWrite(LED_FLASH, LOW);  delay(200);
    }

    // ── Connect WiFi FIRST (before camera, GPIO0 XCLK interferes) ──
    Serial.printf("Connecting to WiFi: %s\n", ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("========== WiFi CONNECTED ==========");
        Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
        Serial.printf("Signal: %d dBm\n", WiFi.RSSI());
        Serial.println("=====================================");
    } else {
        Serial.println("WiFi connection failed! Will retry after camera init...");
    }

    // ── Init camera AFTER WiFi ──
    if (!initCamera()) {
        Serial.println("FATAL: Camera init failed!");
        while (true) {
            digitalWrite(LED_FLASH, HIGH); delay(50);
            digitalWrite(LED_FLASH, LOW);  delay(50);
        }
    }

    // Retry WiFi if it failed the first time
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Retrying WiFi...");
        WiFi.disconnect();
        delay(1000);
        WiFi.begin(ssid, password);
        attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 40) {
            delay(500);
            Serial.print(".");
            attempts++;
        }
        Serial.println();
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("========== READY ==========");
        Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
        Serial.println("");
        Serial.println("Open in browser:");
        Serial.printf("  http://%s/         (web UI)\n", WiFi.localIP().toString().c_str());
        Serial.printf("  http://%s/stream   (MJPEG stream)\n", WiFi.localIP().toString().c_str());
        Serial.printf("  http://%s/capture  (single JPEG)\n", WiFi.localIP().toString().c_str());
        Serial.println("============================");

        // Victory flash
        for (int i = 0; i < 5; i++) {
            digitalWrite(LED_FLASH, HIGH); delay(100);
            digitalWrite(LED_FLASH, LOW);  delay(100);
        }
    } else {
        Serial.println("WiFi FAILED after retries!");
    }

    // Web server routes
    server.on("/", handleRoot);
    server.on("/capture", handleCapture);
    server.on("/stream", handleStream);
    server.begin();
    Serial.println("HTTP server started on port 80");
}

void loop() {
    server.handleClient();

    // Heartbeat every 10s (less frequent to not interfere with stream)
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > 10000) {
        lastBlink = millis();
        Serial.printf("[%lus] WiFi %s | IP: %s | RSSI: %d | Heap: %u\n",
            millis() / 1000,
            WiFi.status() == WL_CONNECTED ? "OK" : "LOST",
            WiFi.localIP().toString().c_str(),
            WiFi.RSSI(),
            ESP.getFreeHeap());
    }

    // Reconnect if WiFi drops
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost, reconnecting...");
        WiFi.reconnect();
        delay(5000);
    }
}
