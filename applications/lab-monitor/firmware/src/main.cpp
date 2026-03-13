/*
 * Lab Monitor — ESP8266 Sensor Node
 * ==================================
 * Hardware: Wemos D1 Mini + DHT22 (AM2302)
 * 
 * Wiring:
 *   DHT22 +   → D1 Mini 5V
 *   DHT22 out → D1 Mini D4 (GPIO2)
 *   DHT22 -   → D1 Mini GND
 *
 * Features:
 *   - Reads temperature + humidity every 30 seconds
 *   - Publishes to MQTT broker (lab/<sensor-name>/temperature, etc.)
 *   - MQTT Last Will and Testament (LWT) for offline detection
 *   - OTA firmware updates via ArduinoOTA
 *   - mDNS for easy discovery (<sensor-name>.local)
 *   - Watchdog-safe with yield() calls
 *
 * MQTT Topics Published:
 *   lab/<name>/temperature  — °C (float, 1 decimal)
 *   lab/<name>/humidity     — %RH (float, 1 decimal)
 *   lab/<name>/rssi         — WiFi signal strength (dBm)
 *   lab/<name>/uptime       — seconds since boot
 *   lab/<name>/status       — "online" (retained) / "offline" (LWT)
 *
 * After first USB flash, future uploads via OTA:
 *   pio run -e ota -t upload -d applications/lab-monitor/firmware
 */

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
#include <DHT.h>

// ═══════════════════════════════════════
// ── Configuration ──
// ═══════════════════════════════════════

// WiFi
const char* WIFI_SSID     = "MEDICALEX";
const char* WIFI_PASSWORD = "94110Med+";

// MQTT Broker (server LAN IP — update this to match your server)
const char* MQTT_SERVER   = "172.16.1.80";
const int   MQTT_PORT     = 1883;

// Sensor identity
const char* SENSOR_NAME   = "incubator-1";
const char* OTA_HOSTNAME  = "incubator-1";

// DHT22 sensor
#define DHT_PIN   D4       // GPIO2
#define DHT_TYPE  DHT22

// Timing
#define PUBLISH_INTERVAL_MS  30000   // 30 seconds between readings
#define MQTT_RECONNECT_MS    5000    // 5 seconds between MQTT reconnect attempts
#define WIFI_TIMEOUT_S       30      // WiFi connection timeout

// ═══════════════════════════════════════
// ── Global objects ──
// ═══════════════════════════════════════

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);
DHT          dht(DHT_PIN, DHT_TYPE);

unsigned long lastPublish    = 0;
unsigned long lastMqttRetry  = 0;
unsigned long bootTime       = 0;

// Topic buffers (built once in setup)
char topicTemp[64];
char topicHum[64];
char topicRssi[64];
char topicUptime[64];
char topicStatus[64];

// ═══════════════════════════════════════
// ── WiFi ──
// ═══════════════════════════════════════

void setupWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.hostname(OTA_HOSTNAME);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < WIFI_TIMEOUT_S * 2) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("WiFi connected — IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("WiFi connection FAILED — will retry in loop");
    }
}

// ═══════════════════════════════════════
// ── MQTT ──
// ═══════════════════════════════════════

void buildTopics() {
    snprintf(topicTemp,   sizeof(topicTemp),   "lab/%s/temperature", SENSOR_NAME);
    snprintf(topicHum,    sizeof(topicHum),    "lab/%s/humidity",    SENSOR_NAME);
    snprintf(topicRssi,   sizeof(topicRssi),   "lab/%s/rssi",       SENSOR_NAME);
    snprintf(topicUptime, sizeof(topicUptime), "lab/%s/uptime",     SENSOR_NAME);
    snprintf(topicStatus, sizeof(topicStatus), "lab/%s/status",     SENSOR_NAME);
}

void connectMqtt() {
    if (mqtt.connected()) return;
    if (WiFi.status() != WL_CONNECTED) return;

    unsigned long now = millis();
    if (now - lastMqttRetry < MQTT_RECONNECT_MS) return;
    lastMqttRetry = now;

    Serial.print("MQTT connecting to ");
    Serial.print(MQTT_SERVER);
    Serial.print("... ");

    // Client ID = sensor name
    // LWT: publish "offline" to status topic if connection drops
    if (mqtt.connect(SENSOR_NAME, NULL, NULL, topicStatus, 1, true, "offline")) {
        Serial.println("connected!");
        // Publish online status (retained)
        mqtt.publish(topicStatus, "online", true);
    } else {
        Serial.print("failed (rc=");
        Serial.print(mqtt.state());
        Serial.println(") — will retry");
    }
}

// ═══════════════════════════════════════
// ── OTA ──
// ═══════════════════════════════════════

void setupOTA() {
    ArduinoOTA.setHostname(OTA_HOSTNAME);
    ArduinoOTA.setPort(8266);

    ArduinoOTA.onStart([]() {
        Serial.println("OTA: update starting...");
        // Publish offline before update (graceful)
        if (mqtt.connected()) {
            mqtt.publish(topicStatus, "updating", true);
            mqtt.disconnect();
        }
    });

    ArduinoOTA.onEnd([]() {
        Serial.println("\nOTA: update complete!");
    });

    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("OTA: %u%%\r", (progress / (total / 100)));
    });

    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("OTA Error [%u]: ", error);
        if      (error == OTA_AUTH_ERROR)    Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR)   Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR)     Serial.println("End Failed");
    });

    ArduinoOTA.begin();
    Serial.println("OTA ready on port 8266");
}

// ═══════════════════════════════════════
// ── Sensor Reading & Publishing ──
// ═══════════════════════════════════════

void publishReadings() {
    // Read DHT22
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();

    // Validate readings
    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("DHT22 read failed — skipping this cycle");
        return;
    }

    // Format values
    char tempStr[8], humStr[8], rssiStr[8], uptimeStr[12];
    dtostrf(temperature, 4, 1, tempStr);
    dtostrf(humidity,    4, 1, humStr);
    snprintf(rssiStr,   sizeof(rssiStr),   "%d", WiFi.RSSI());
    snprintf(uptimeStr, sizeof(uptimeStr), "%lu", (millis() - bootTime) / 1000);

    // Publish to MQTT
    mqtt.publish(topicTemp,   tempStr);
    mqtt.publish(topicHum,    humStr);
    mqtt.publish(topicRssi,   rssiStr);
    mqtt.publish(topicUptime, uptimeStr);

    // Serial debug
    Serial.printf("Published: T=%s°C  H=%s%%  RSSI=%sdBm  Up=%ss\n",
                  tempStr, humStr, rssiStr, uptimeStr);
}

// ═══════════════════════════════════════
// ── Setup ──
// ═══════════════════════════════════════

void setup() {
    Serial.begin(115200);
    Serial.println();
    Serial.println("=== Lab Monitor Sensor Node ===");
    Serial.printf("Sensor: %s\n", SENSOR_NAME);

    bootTime = millis();

    // Build MQTT topics
    buildTopics();

    // Initialize DHT22
    dht.begin();
    Serial.println("DHT22 initialized on pin D4");

    // Connect WiFi
    setupWiFi();

    // Setup mDNS
    if (MDNS.begin(OTA_HOSTNAME)) {
        Serial.printf("mDNS: %s.local\n", OTA_HOSTNAME);
    }

    // Setup OTA
    setupOTA();

    // Setup MQTT
    mqtt.setServer(MQTT_SERVER, MQTT_PORT);

    Serial.println("Setup complete — entering main loop");
    Serial.println();
}

// ═══════════════════════════════════════
// ── Main Loop ──
// ═══════════════════════════════════════

void loop() {
    // Handle OTA
    ArduinoOTA.handle();

    // Handle mDNS
    MDNS.update();

    // Maintain MQTT connection
    if (!mqtt.connected()) {
        connectMqtt();
    }
    mqtt.loop();

    // Publish sensor readings at interval
    unsigned long now = millis();
    if (mqtt.connected() && (now - lastPublish >= PUBLISH_INTERVAL_MS)) {
        lastPublish = now;
        publishReadings();
    }

    // WiFi reconnect if dropped
    if (WiFi.status() != WL_CONNECTED) {
        static unsigned long lastWifiRetry = 0;
        if (now - lastWifiRetry > 30000) {
            lastWifiRetry = now;
            Serial.println("WiFi lost — reconnecting...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
        }
    }

    yield();  // Feed the watchdog
}
