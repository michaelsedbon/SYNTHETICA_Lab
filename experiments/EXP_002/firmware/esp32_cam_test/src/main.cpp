/*
 * ESP32-CAM Camera Server
 * ========================
 * Uses esp_http_server (async, multi-client capable) instead of
 * Arduino WebServer which causes boot loops with camera streaming.
 *
 * Endpoints:
 *   GET /          → Web UI with embedded stream
 *   GET /capture   → Single JPEG snapshot
 *   GET /stream    → MJPEG live stream
 */

#include <WiFi.h>
#include "esp_camera.h"
#include "esp_http_server.h"

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

#define LED_FLASH 4

// MJPEG stream boundary
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t camera_httpd = NULL;
httpd_handle_t stream_httpd = NULL;

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

    if (psramFound()) {
        config.frame_size   = FRAMESIZE_VGA;   // 640x480
        config.jpeg_quality = 10;
        config.fb_count     = 2;
    } else {
        config.frame_size   = FRAMESIZE_QVGA;  // 320x240
        config.jpeg_quality = 12;
        config.fb_count     = 1;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed: 0x%x\n", err);
        return false;
    }

    sensor_t *s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 1);
        s->set_contrast(s, 1);
        s->set_whitebal(s, 1);
        s->set_awb_gain(s, 1);
        s->set_exposure_ctrl(s, 1);
        s->set_gain_ctrl(s, 1);
    }

    Serial.printf("Camera OK | PSRAM: %s (%d KB free)\n",
        psramFound() ? "YES" : "NO",
        psramFound() ? ESP.getFreePsram() / 1024 : 0);
    return true;
}

// ── /capture handler ──
static esp_err_t capture_handler(httpd_req_t *req) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }

    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    esp_err_t res = httpd_resp_send(req, (const char*)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return res;
}

// ── /stream handler ──
static esp_err_t stream_handler(httpd_req_t *req) {
    esp_err_t res = ESP_OK;
    char part_buf[64];

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if (res != ESP_OK) return res;

    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

    while (true) {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Stream: capture failed");
            res = ESP_FAIL;
            break;
        }

        size_t hlen = snprintf(part_buf, 64, _STREAM_PART, fb->len);
        res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
        if (res == ESP_OK)
            res = httpd_resp_send_chunk(req, part_buf, hlen);
        if (res == ESP_OK)
            res = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);

        esp_camera_fb_return(fb);

        if (res != ESP_OK) break;
    }
    return res;
}

// ── / handler (web UI) ──
static esp_err_t index_handler(httpd_req_t *req) {
    String ip = WiFi.localIP().toString();
    String html = "<!DOCTYPE html><html><head>"
        "<meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>ESP32-CAM</title>"
        "<style>"
        "body{font-family:monospace;background:#111;color:#0f0;margin:0;padding:20px;text-align:center}"
        "h1{color:#0ff;margin-bottom:5px}"
        ".info{color:#888;font-size:12px;margin-bottom:15px}"
        "img{max-width:100%;border:2px solid #333;border-radius:8px}"
        ".btn{background:#0a0;color:#000;border:none;padding:10px 20px;margin:5px;"
        "cursor:pointer;font-family:monospace;font-weight:bold;border-radius:4px;font-size:14px}"
        ".btn:hover{background:#0f0}"
        "</style></head><body>"
        "<h1>ESP32-CAM</h1>"
        "<div class='info'>IP: " + ip + " | "
        "PSRAM: " + String(psramFound() ? "YES" : "NO") + " | "
        "Heap: " + String(ESP.getFreeHeap() / 1024) + " KB</div>"
        "<div><img id='feed' src='http://" + ip + ":81/stream'></div>"
        "<div style='margin:15px 0'>"
        "<button class='btn' onclick=\"document.getElementById('feed').src='http://" + ip + ":81/stream?'+Date.now()\">Stream</button>"
        "<button class='btn' onclick=\"document.getElementById('feed').src='/capture?'+Date.now()\">Snapshot</button>"
        "</div>"
        "<div class='info'>"
        "Stream: <a href='http://" + ip + ":81/stream' style='color:#0f0'>:" + "81/stream</a> | "
        "Capture: <a href='/capture' style='color:#0f0'>/capture</a>"
        "</div></body></html>";

    httpd_resp_set_type(req, "text/html");
    return httpd_resp_send(req, html.c_str(), html.length());
}

// ── Start servers ──
void startCameraServer() {
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;

    // Main server on port 80 (UI + capture)
    httpd_uri_t index_uri = { .uri = "/",        .method = HTTP_GET, .handler = index_handler,   .user_ctx = NULL };
    httpd_uri_t capture_uri = { .uri = "/capture", .method = HTTP_GET, .handler = capture_handler, .user_ctx = NULL };

    if (httpd_start(&camera_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(camera_httpd, &index_uri);
        httpd_register_uri_handler(camera_httpd, &capture_uri);
        Serial.println("HTTP server on port 80 (UI + capture)");
    }

    // Stream server on port 81 (separate so streaming doesn't block UI)
    config.server_port = 81;
    config.ctrl_port += 1;

    httpd_uri_t stream_uri = { .uri = "/stream", .method = HTTP_GET, .handler = stream_handler, .user_ctx = NULL };

    if (httpd_start(&stream_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(stream_httpd, &stream_uri);
        Serial.println("Stream server on port 81 (/stream)");
    }
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n================================");
    Serial.println("ESP32-CAM Camera Server v2");
    Serial.println("================================");

    pinMode(LED_FLASH, OUTPUT);
    digitalWrite(LED_FLASH, LOW);

    // Boot blink
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_FLASH, HIGH); delay(150);
        digitalWrite(LED_FLASH, LOW);  delay(150);
    }

    // WiFi first (before camera — GPIO0 XCLK conflict)
    Serial.printf("WiFi: connecting to %s\n", ssid);
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
        Serial.printf("WiFi OK: %s (%d dBm)\n",
            WiFi.localIP().toString().c_str(), WiFi.RSSI());
    } else {
        Serial.println("WiFi FAILED — will retry after camera init");
    }

    // Camera init
    if (!initCamera()) {
        Serial.println("FATAL: Camera init failed!");
        while (1) { digitalWrite(LED_FLASH, HIGH); delay(50); digitalWrite(LED_FLASH, LOW); delay(50); }
    }

    // Retry WiFi if needed
    if (WiFi.status() != WL_CONNECTED) {
        WiFi.disconnect(); delay(1000);
        WiFi.begin(ssid, password);
        attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 40) { delay(500); Serial.print("."); attempts++; }
        Serial.println();
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi FAILED after retries!");
        while (1) { digitalWrite(LED_FLASH, HIGH); delay(100); digitalWrite(LED_FLASH, LOW); delay(100); }
    }

    // Start HTTP servers
    startCameraServer();

    Serial.println("========== READY ==========");
    Serial.printf("  http://%s/       (web UI)\n", WiFi.localIP().toString().c_str());
    Serial.printf("  http://%s/capture (JPEG)\n", WiFi.localIP().toString().c_str());
    Serial.printf("  http://%s:81/stream (MJPEG)\n", WiFi.localIP().toString().c_str());
    Serial.println("============================");

    // Victory flash
    for (int i = 0; i < 5; i++) {
        digitalWrite(LED_FLASH, HIGH); delay(80);
        digitalWrite(LED_FLASH, LOW);  delay(80);
    }
}

void loop() {
    static unsigned long lastLog = 0;
    if (millis() - lastLog > 30000) {
        lastLog = millis();
        Serial.printf("[%lus] WiFi:%s IP:%s RSSI:%d Heap:%uKB\n",
            millis() / 1000,
            WiFi.status() == WL_CONNECTED ? "OK" : "LOST",
            WiFi.localIP().toString().c_str(),
            WiFi.RSSI(),
            ESP.getFreeHeap() / 1024);
    }

    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost, reconnecting...");
        WiFi.reconnect();
        delay(5000);
    }

    delay(100);
}
