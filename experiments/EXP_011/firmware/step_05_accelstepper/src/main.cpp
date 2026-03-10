/*
 * EXP_011 — Step 5+6: AccelStepper + Serial Commands
 * ====================================================
 * Tests AccelStepper library with the same pins that worked in raw GPIO.
 * Also adds serial command interface for interactive testing.
 *
 * On boot:
 *   1. Blink LED 3x
 *   2. Blocking AccelStepper move: 1000 steps forward
 *   3. Print result to serial
 *
 * Serial commands:
 *   PING            → PONG
 *   STATUS          → position, speed, moving state
 *   MOVE <steps>    → relative move
 *   STOP            → emergency stop
 *   SPEED <sps>     → set max speed
 *   ACCEL <val>     → set acceleration
 *   RAWTEST         → 200 raw GPIO pulses (bypass AccelStepper)
 *
 * Pins: D4 = STEP (PUL+), D2 = DIR (DIR+)
 */

#include <Arduino.h>
#include <AccelStepper.h>

#define PIN_STEP  4
#define PIN_DIR   2

AccelStepper stepper(AccelStepper::DRIVER, PIN_STEP, PIN_DIR);

String inputBuffer = "";

void processCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();
    if (cmd.length() == 0) return;

    if (cmd == "PING") {
        Serial.println("PONG");
        return;
    }

    if (cmd == "STATUS") {
        Serial.print("POS:"); Serial.println(stepper.currentPosition());
        Serial.print("SPEED:"); Serial.println((int)stepper.maxSpeed());
        Serial.print("MOVING:"); Serial.println(stepper.isRunning() ? 1 : 0);
        Serial.print("TARGET:"); Serial.println(stepper.targetPosition());
        return;
    }

    if (cmd == "STOP") {
        stepper.stop();
        Serial.println("OK STOPPED");
        return;
    }

    if (cmd.startsWith("MOVE ")) {
        long steps = cmd.substring(5).toInt();
        stepper.move(steps);
        Serial.print("OK MOVE "); Serial.println(steps);
        return;
    }

    if (cmd.startsWith("SPEED ")) {
        float spd = cmd.substring(6).toFloat();
        stepper.setMaxSpeed(spd);
        Serial.print("OK SPEED "); Serial.println((int)spd);
        return;
    }

    if (cmd.startsWith("ACCEL ")) {
        float a = cmd.substring(6).toFloat();
        stepper.setAcceleration(a);
        Serial.print("OK ACCEL "); Serial.println((int)a);
        return;
    }

    if (cmd == "RAWTEST") {
        Serial.println("RAWTEST_START");
        digitalWrite(PIN_DIR, LOW);
        for (int i = 0; i < 200; i++) {
            digitalWrite(PIN_STEP, HIGH);
            delayMicroseconds(500);
            digitalWrite(PIN_STEP, LOW);
            delayMicroseconds(500);
        }
        Serial.println("OK RAWTEST 200 pulses");
        return;
    }

    Serial.print("ERROR:UNKNOWN:"); Serial.println(cmd);
}

void setup() {
    Serial.begin(115200);

    // AccelStepper setup
    stepper.setMaxSpeed(2000.0);
    stepper.setAcceleration(1000.0);
    stepper.setMinPulseWidth(20);

    // Ensure pins are OUTPUT (AccelStepper should do this, but belt-and-suspenders)
    pinMode(PIN_STEP, OUTPUT);
    pinMode(PIN_DIR, OUTPUT);

    // Alive blink
    pinMode(LED_BUILTIN, OUTPUT);
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_BUILTIN, HIGH); delay(100);
        digitalWrite(LED_BUILTIN, LOW); delay(100);
    }

    Serial.println("READY — EXP_011 Step 5: AccelStepper Test");

    // Boot test: blocking move 1000 steps
    Serial.println("BOOT_TEST: AccelStepper 1000 steps...");
    stepper.move(1000);
    while (stepper.run()) { }
    Serial.print("BOOT_TEST: DONE at pos=");
    Serial.println(stepper.currentPosition());

    Serial.println("Commands: PING, STATUS, MOVE <n>, STOP, SPEED <n>, ACCEL <n>, RAWTEST");
}

void loop() {
    stepper.run();

    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n') {
            processCommand(inputBuffer);
            inputBuffer = "";
        } else if (c != '\r') {
            inputBuffer += c;
        }
        stepper.run();
    }
}
