/*
 * Connector Mapper — Arduino Mega Firmware
 * EXP_004: Automated continuity scanning for Cryptographic Beings panels
 *
 * Pin layout:
 *   Panel A (outputs): D22–D37  (16 connectors)
 *   Panel B (inputs):  D38–D53  (16 connectors, INPUT_PULLUP)
 *
 * Protocol: JSON over Serial @ 115200 baud
 *   → {"cmd":"ping"}             ← {"type":"pong","out":16,"in":16}
 *   → {"cmd":"scan"}             ← {"type":"scan","map":[...]}
 *   → {"cmd":"test","pin":0}     ← {"type":"test","pin":0,"hits":[...]}
 */

#include <Arduino.h>
#include <ArduinoJson.h>

// ---------- Pin Configuration ----------
const int NUM_CONNECTORS = 16;

// Panel A: output pins (directly driven)
const int PANEL_A_PINS[NUM_CONNECTORS] = {
  22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37
};

// Panel B: input pins (with internal pull-up)
const int PANEL_B_PINS[NUM_CONNECTORS] = {
  38, 39, 40, 41, 42, 43, 44, 45,
  46, 47, 48, 49, 50, 51, 52, 53
};

// ---------- Forward declarations ----------
void handlePing();
void handleScan();
void handleTest(int pin);
void setAllOutputsHighZ();

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);
  while (!Serial) { ; }

  // Configure Panel B as inputs with pull-up
  for (int i = 0; i < NUM_CONNECTORS; i++) {
    pinMode(PANEL_B_PINS[i], INPUT_PULLUP);
  }

  // Set all Panel A pins to INPUT (high-Z) initially
  setAllOutputsHighZ();

  Serial.println("{\"type\":\"ready\",\"msg\":\"Connector Mapper v1.0\"}");
}

// ---------- Main Loop ----------
void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return;

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, line);
    if (err) {
      Serial.print("{\"type\":\"error\",\"msg\":\"JSON parse error: ");
      Serial.print(err.c_str());
      Serial.println("\"}");
      return;
    }

    const char* cmd = doc["cmd"];
    if (!cmd) {
      Serial.println("{\"type\":\"error\",\"msg\":\"Missing cmd field\"}");
      return;
    }

    if (strcmp(cmd, "ping") == 0) {
      handlePing();
    } else if (strcmp(cmd, "scan") == 0) {
      handleScan();
    } else if (strcmp(cmd, "test") == 0) {
      int pin = doc["pin"] | -1;
      if (pin < 0 || pin >= NUM_CONNECTORS) {
        Serial.println("{\"type\":\"error\",\"msg\":\"Invalid pin number\"}");
      } else {
        handleTest(pin);
      }
    } else {
      Serial.println("{\"type\":\"error\",\"msg\":\"Unknown command\"}");
    }
  }
}

// ---------- Set all output pins to high-impedance (INPUT mode) ----------
void setAllOutputsHighZ() {
  for (int i = 0; i < NUM_CONNECTORS; i++) {
    pinMode(PANEL_A_PINS[i], INPUT);       // high-Z
    digitalWrite(PANEL_A_PINS[i], LOW);    // no pull-up
  }
}

// ---------- Ping ----------
void handlePing() {
  JsonDocument doc;
  doc["type"] = "pong";
  doc["out"] = NUM_CONNECTORS;
  doc["in"] = NUM_CONNECTORS;
  serializeJson(doc, Serial);
  Serial.println();
}

// ---------- Full Scan ----------
void handleScan() {
  // Result: array of [panelA_index, [panelB_hits...]]
  JsonDocument doc;
  doc["type"] = "scan";
  JsonArray mapArr = doc["map"].to<JsonArray>();

  for (int a = 0; a < NUM_CONNECTORS; a++) {
    // Set all to high-Z first
    setAllOutputsHighZ();

    // Drive this one pin LOW (it will pull the connected input LOW,
    // while unconnected inputs stay HIGH via their pull-ups)
    pinMode(PANEL_A_PINS[a], OUTPUT);
    digitalWrite(PANEL_A_PINS[a], LOW);
    delay(10);  // settling time

    // Read all Panel B inputs
    JsonArray entry = mapArr.add<JsonArray>();
    entry.add(a);
    JsonArray hits = entry.add<JsonArray>();

    for (int b = 0; b < NUM_CONNECTORS; b++) {
      if (digitalRead(PANEL_B_PINS[b]) == LOW) {
        hits.add(b);
      }
    }

    // Release pin
    pinMode(PANEL_A_PINS[a], INPUT);
    digitalWrite(PANEL_A_PINS[a], LOW);
  }

  // Final cleanup
  setAllOutputsHighZ();

  serializeJson(doc, Serial);
  Serial.println();
}

// ---------- Test single pin ----------
void handleTest(int pin) {
  setAllOutputsHighZ();

  // Drive the requested pin LOW
  pinMode(PANEL_A_PINS[pin], OUTPUT);
  digitalWrite(PANEL_A_PINS[pin], LOW);
  delay(10);

  JsonDocument doc;
  doc["type"] = "test";
  doc["pin"] = pin;
  JsonArray hits = doc["hits"].to<JsonArray>();

  for (int b = 0; b < NUM_CONNECTORS; b++) {
    if (digitalRead(PANEL_B_PINS[b]) == LOW) {
      hits.add(b);
    }
  }

  // Release
  pinMode(PANEL_A_PINS[pin], INPUT);
  digitalWrite(PANEL_A_PINS[pin], LOW);

  serializeJson(doc, Serial);
  Serial.println();
}
