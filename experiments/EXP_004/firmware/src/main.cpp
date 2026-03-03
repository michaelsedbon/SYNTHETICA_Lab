/*
 * Connector Mapper — Arduino Mega Firmware v3.0
 * EXP_004: Full cross-scan cable-pair testing for Cryptographic Beings
 *
 * Setup: ONE cable pair at a time
 *   Aviator GX16-4 (controller plate side) — 4 output pins:
 *     Pin1=Red→D22, Pin2=Black→D23, Pin3=White→D24, Pin4=Blue→D25
 *   M12 or M8 (installation plate side) — 4 input pins:
 *     Pin1→D38, Pin2→D39, Pin3→D40, Pin4→D41
 *
 * Protocol: JSON over Serial @ 115200 baud
 *   → {"cmd":"ping"}         ← {"type":"pong","out":4,"in":4}
 *   → {"cmd":"scan"}         ← {"type":"scan","map":[[0,[1,3]],[1,[0]],[2,[]],[3,[2]]]}
 *
 * Scan does full 4×4 cross-test:
 *   For each output pin, drives it LOW and reads ALL 4 input pins.
 *   Reports which inputs went LOW for each output.
 *   This catches cross-wired cables and broken wires.
 */

#include <Arduino.h>
#include <ArduinoJson.h>

const int NUM_WIRES = 4;
const int OUT_PINS[NUM_WIRES] = { 22, 23, 24, 25 };
const int IN_PINS[NUM_WIRES]  = { 38, 39, 40, 41 };

void handlePing();
void handleScan();
void setAllOutputsHighZ();

void setup() {
  Serial.begin(115200);
  while (!Serial) { ; }

  for (int i = 0; i < NUM_WIRES; i++) {
    pinMode(IN_PINS[i], INPUT_PULLUP);
  }
  setAllOutputsHighZ();

  Serial.println("{\"type\":\"ready\",\"msg\":\"Connector Mapper v3.0 — full cross-scan\"}");
}

void loop() {
  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) return;

    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, line);
    if (err) {
      Serial.print("{\"type\":\"error\",\"msg\":\"JSON parse: ");
      Serial.print(err.c_str());
      Serial.println("\"}");
      return;
    }

    const char* cmd = doc["cmd"];
    if (!cmd) {
      Serial.println("{\"type\":\"error\",\"msg\":\"Missing cmd\"}");
      return;
    }

    if (strcmp(cmd, "ping") == 0) {
      handlePing();
    } else if (strcmp(cmd, "scan") == 0) {
      handleScan();
    } else {
      Serial.println("{\"type\":\"error\",\"msg\":\"Unknown command\"}");
    }
  }
}

void setAllOutputsHighZ() {
  for (int i = 0; i < NUM_WIRES; i++) {
    pinMode(OUT_PINS[i], INPUT);
    digitalWrite(OUT_PINS[i], LOW);
  }
}

void handlePing() {
  JsonDocument doc;
  doc["type"] = "pong";
  doc["out"] = NUM_WIRES;
  doc["in"] = NUM_WIRES;
  serializeJson(doc, Serial);
  Serial.println();
}

// Full 4×4 cross-scan with double-read verification
void handleScan() {
  JsonDocument doc;
  doc["type"] = "scan";
  JsonArray mapArr = doc["map"].to<JsonArray>();

  for (int out = 0; out < NUM_WIRES; out++) {
    setAllOutputsHighZ();
    delay(10);  // let pull-ups charge lines back to HIGH

    // Drive this output LOW
    pinMode(OUT_PINS[out], OUTPUT);
    digitalWrite(OUT_PINS[out], LOW);
    delay(15);  // settle time for signal propagation

    // Check ALL inputs with double-read verification
    JsonArray entry = mapArr.add<JsonArray>();
    entry.add(out);
    JsonArray hits = entry.add<JsonArray>();

    for (int in = 0; in < NUM_WIRES; in++) {
      int read1 = digitalRead(IN_PINS[in]);
      delay(2);
      int read2 = digitalRead(IN_PINS[in]);
      // Only count as connected if BOTH reads are LOW
      if (read1 == LOW && read2 == LOW) {
        hits.add(in);
      }
    }

    // Release
    pinMode(OUT_PINS[out], INPUT);
    digitalWrite(OUT_PINS[out], LOW);
  }

  setAllOutputsHighZ();
  serializeJson(doc, Serial);
  Serial.println();
}
