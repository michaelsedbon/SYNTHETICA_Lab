/*
 * EXP_011 — Step 3: Raw GPIO Motor Test
 * =======================================
 * Bypasses AccelStepper entirely. Manually toggles step/dir pins
 * to verify hardware wiring to DM542T driver.
 *
 * On boot:
 *   1. Blink LED 3x (alive signal)
 *   2. Print "READY" on serial
 *   3. Move 200 pulses forward (DIR LOW)
 *   4. Pause 1 second
 *   5. Move 200 pulses reverse (DIR HIGH)
 *   6. Print "DONE" on serial
 *
 * In loop:
 *   - Serial echo (anything received is echoed back)
 *   - Send "GO" to repeat the motor test
 *
 * Pins: D4 = STEP, D2 = DIR
 *
 * Pass criteria: Motor physically moves on boot
 * If motor does NOT move → hardware issue (wiring, driver, power)
 */

#include <Arduino.h>

#define PIN_STEP  4
#define PIN_DIR   2

// Pulse speed: 500us HIGH + 500us LOW = 1000us per step = 1kHz
#define PULSE_DELAY_US 500

void rawMove(int steps, bool direction) {
    digitalWrite(PIN_DIR, direction ? HIGH : LOW);
    delayMicroseconds(100);  // DIR setup time for DM542T

    for (int i = 0; i < steps; i++) {
        digitalWrite(PIN_STEP, HIGH);
        delayMicroseconds(PULSE_DELAY_US);
        digitalWrite(PIN_STEP, LOW);
        delayMicroseconds(PULSE_DELAY_US);
    }
}

void motorTest() {
    Serial.println("MOTOR_TEST: 200 pulses forward...");
    rawMove(200, false);

    delay(1000);

    Serial.println("MOTOR_TEST: 200 pulses reverse...");
    rawMove(200, true);

    Serial.println("MOTOR_TEST: DONE");
}

String inputBuffer = "";

void setup() {
    Serial.begin(115200);

    // Configure motor pins
    pinMode(PIN_STEP, OUTPUT);
    pinMode(PIN_DIR, OUTPUT);
    digitalWrite(PIN_STEP, LOW);
    digitalWrite(PIN_DIR, LOW);

    // Alive blink
    pinMode(LED_BUILTIN, OUTPUT);
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_BUILTIN, HIGH); delay(100);
        digitalWrite(LED_BUILTIN, LOW); delay(100);
    }

    Serial.println("READY — EXP_011 Step 3: Raw GPIO Motor Test");
    Serial.println("Send 'GO' to run motor test, or any text to echo");

    // Auto-run motor test on boot
    motorTest();
}

void loop() {
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n') {
            inputBuffer.trim();
            inputBuffer.toUpperCase();

            if (inputBuffer == "GO") {
                motorTest();
            } else if (inputBuffer.length() > 0) {
                Serial.print("ECHO: ");
                Serial.println(inputBuffer);
            }
            inputBuffer = "";
        } else if (c != '\r') {
            inputBuffer += c;
        }
    }
}
