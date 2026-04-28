/*
 * LIGHTS_1 — Front-Panel 220 V Relay Controller
 * EXP_022 — Cryptographic Beings
 *
 * Drives a 5-channel mechanical relay module that switches 220 V to the
 * controller-box front-panel connectors C03/C05/C06/C07/C08. Talks to the
 * LattePanda Machine Controller (EXP_014) over USB serial @ 115200, mirroring
 * the motor_nano_dm556 protocol so it slots into the existing FastAPI device
 * abstraction.
 *
 * Protocol (newline-terminated ASCII, 115200 baud):
 *   PING                  → PONG
 *   IDENTIFY              → LIGHTS_1
 *   STATUS                → R1:0 R2:0 R3:0 R4:0 R5:0 R6:0 R7:0 R8:0
 *   ON  <n>               → OK ON <n>           (n = 1..8)
 *   OFF <n>               → OK OFF <n>
 *   TOGGLE <n>            → OK TOGGLE <n> -> <0|1>
 *   RELAY <n> <0|1>       → OK RELAY <n> <0|1>
 *   ALL ON                → OK ALL ON
 *   ALL OFF               → OK ALL OFF
 *   <anything else>       → ERROR:UNKNOWN:<echo>
 *
 * Active-LOW relay convention: writing LOW to the digital pin energises the
 * relay coil and closes the contacts (i.e. "ON"). Set ACTIVE_LOW=false if
 * your board uses active-HIGH wiring.
 */

#include <Arduino.h>

#define DEVICE_ID "LIGHTS_1"
#define NUM_RELAYS 8
// Polarity of the relay control input. Set per the relay-module datasheet.
//   true  → mechanical 5 V relay boards (LOW on the pin energises the coil)
//   false → solid-state relays / SSR boards (HIGH on the pin turns the SSR on)
// LIGHTS_1 uses an SSR module → ACTIVE_LOW = false.
#define ACTIVE_LOW false

// Channel index 0..7 maps to digital pins D2..D9 (in order).
const uint8_t RELAY_PINS[NUM_RELAYS] = { 2, 3, 4, 5, 6, 7, 8, 9 };

// Logical state per channel (0 = OFF, 1 = ON), independent of active-LOW wiring.
uint8_t relayState[NUM_RELAYS] = { 0, 0, 0, 0, 0, 0, 0, 0 };

void writeRelay(uint8_t idx, uint8_t on) {
    relayState[idx] = on ? 1 : 0;
    uint8_t level = ACTIVE_LOW ? (on ? LOW : HIGH) : (on ? HIGH : LOW);
    digitalWrite(RELAY_PINS[idx], level);
}

void allOff() {
    for (uint8_t i = 0; i < NUM_RELAYS; i++) writeRelay(i, 0);
}

void allOn() {
    for (uint8_t i = 0; i < NUM_RELAYS; i++) writeRelay(i, 1);
}

void printStatus() {
    for (uint8_t i = 0; i < NUM_RELAYS; i++) {
        Serial.print('R'); Serial.print(i + 1); Serial.print(':'); Serial.print(relayState[i]);
        if (i < NUM_RELAYS - 1) Serial.print(' ');
    }
    Serial.println();
}

void blinkLED(uint8_t times, uint16_t period_ms) {
    for (uint8_t i = 0; i < times; i++) {
        digitalWrite(LED_BUILTIN, HIGH);
        delay(period_ms / 2);
        digitalWrite(LED_BUILTIN, LOW);
        delay(period_ms / 2);
    }
}

void updateActivityLED() {
    bool anyOn = false;
    for (uint8_t i = 0; i < NUM_RELAYS; i++) if (relayState[i]) { anyOn = true; break; }
    digitalWrite(LED_BUILTIN, anyOn ? HIGH : LOW);
}

// Parse a small positive integer from the start of `s`. Returns -1 on failure.
int parseSmallInt(const String& s) {
    if (s.length() == 0) return -1;
    int v = 0;
    for (uint16_t i = 0; i < s.length(); i++) {
        char c = s.charAt(i);
        if (c < '0' || c > '9') return -1;
        v = v * 10 + (c - '0');
        if (v > 1000) return -1;
    }
    return v;
}

void handleCommand(String cmd) {
    cmd.trim();
    if (cmd.length() == 0) return;

    // Uppercase a copy for case-insensitive matching of the verb
    String up = cmd;
    up.toUpperCase();

    if (up == "PING") {
        Serial.println("PONG");
        return;
    }
    if (up == "IDENTIFY" || up == "ID") {
        Serial.println(DEVICE_ID);
        return;
    }
    if (up == "STATUS") {
        printStatus();
        return;
    }
    if (up == "ALL ON") {
        allOn();
        Serial.println("OK ALL ON");
        updateActivityLED();
        return;
    }
    if (up == "ALL OFF") {
        allOff();
        Serial.println("OK ALL OFF");
        updateActivityLED();
        return;
    }

    // Verbs that take arguments: ON <n>, OFF <n>, TOGGLE <n>, RELAY <n> <0|1>
    int sp1 = up.indexOf(' ');
    if (sp1 > 0) {
        String verb = up.substring(0, sp1);
        String rest = up.substring(sp1 + 1); rest.trim();

        if (verb == "ON" || verb == "OFF" || verb == "TOGGLE") {
            int n = parseSmallInt(rest);
            if (n < 1 || n > NUM_RELAYS) {
                Serial.print("ERROR:CHANNEL_OUT_OF_RANGE:"); Serial.println(rest);
                return;
            }
            uint8_t idx = (uint8_t)(n - 1);
            uint8_t newState;
            if (verb == "ON")          newState = 1;
            else if (verb == "OFF")    newState = 0;
            else /* TOGGLE */          newState = relayState[idx] ? 0 : 1;
            writeRelay(idx, newState);
            updateActivityLED();
            if (verb == "TOGGLE") {
                Serial.print("OK TOGGLE "); Serial.print(n); Serial.print(" -> "); Serial.println(newState);
            } else {
                Serial.print("OK "); Serial.print(verb); Serial.print(' '); Serial.println(n);
            }
            return;
        }

        if (verb == "RELAY") {
            // RELAY <n> <0|1>
            int sp2 = rest.indexOf(' ');
            if (sp2 < 1) {
                Serial.print("ERROR:MISSING_VALUE:"); Serial.println(cmd);
                return;
            }
            int n = parseSmallInt(rest.substring(0, sp2));
            String valStr = rest.substring(sp2 + 1); valStr.trim();
            int v = parseSmallInt(valStr);
            if (n < 1 || n > NUM_RELAYS) {
                Serial.print("ERROR:CHANNEL_OUT_OF_RANGE:"); Serial.println(n);
                return;
            }
            if (v != 0 && v != 1) {
                Serial.print("ERROR:VALUE_NOT_BOOLEAN:"); Serial.println(valStr);
                return;
            }
            writeRelay((uint8_t)(n - 1), (uint8_t)v);
            updateActivityLED();
            Serial.print("OK RELAY "); Serial.print(n); Serial.print(' '); Serial.println(v);
            return;
        }
    }

    Serial.print("ERROR:UNKNOWN:"); Serial.println(cmd);
}

void setup() {
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, LOW);

    // Drive every relay pin OFF *before* setting it as OUTPUT to avoid a
    // momentary energise when the line floats LOW on an active-LOW board.
    for (uint8_t i = 0; i < NUM_RELAYS; i++) {
        pinMode(RELAY_PINS[i], OUTPUT);
        digitalWrite(RELAY_PINS[i], ACTIVE_LOW ? HIGH : LOW); // OFF
        relayState[i] = 0;
    }

    Serial.begin(115200);
    while (!Serial && millis() < 2000) { /* wait briefly for USB on Uno */ }

    blinkLED(2, 200);
    Serial.print("READY ");
    Serial.println(DEVICE_ID);
}

void loop() {
    static String buf;
    while (Serial.available() > 0) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (buf.length() > 0) {
                handleCommand(buf);
                buf = "";
            }
        } else {
            if (buf.length() < 96) buf += c; // bound input length
        }
    }
}
