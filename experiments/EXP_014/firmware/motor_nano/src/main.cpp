/*
 * EXP_014 — Motor Controller Firmware
 * ====================================
 * AccelStepper motor control + proximity sensor + serial command interface.
 * Based on EXP_011 Step 5+6, updated for EXP_014 machine controller.
 *
 * Serial commands (115200 baud, newline-terminated):
 *   PING            → PONG
 *   IDENTIFY        → MOTOR_1 (compile-time device ID)
 *   STATUS          → POS:x SPEED:x MOVING:x TARGET:x SENSOR:x
 *   MOVE <steps>    → relative move
 *   MOVETO <pos>    → absolute move
 *   HOME            → move until sensor triggers, then zero position
 *   STOP            → emergency stop
 *   SPEED <sps>     → set max speed
 *   ACCEL <val>     → set acceleration
 *   ZERO            → reset position to 0
 *
 * Pins: D4 = STEP (PUL+), D2 = DIR (DIR+), D3 = Proximity sensor
 */

#include <Arduino.h>
#include <AccelStepper.h>

// ── Configuration ──
#define DEVICE_ID     "MOTOR_1"
#define PIN_STEP      4
#define PIN_DIR       2
#define PIN_SENSOR    3
#define HOME_SPEED    800.0
#define HOME_DIR      -1       // direction toward sensor

AccelStepper stepper(AccelStepper::DRIVER, PIN_STEP, PIN_DIR);
String inputBuffer = "";
bool homing = false;

int readSensor() {
    return digitalRead(PIN_SENSOR) == LOW ? 1 : 0;  // NPN NO: LOW when triggered
}

void processCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();
    if (cmd.length() == 0) return;

    if (cmd == "PING") {
        Serial.println("PONG");
        return;
    }

    if (cmd == "IDENTIFY") {
        Serial.println(DEVICE_ID);
        return;
    }

    if (cmd == "STATUS") {
        Serial.print("POS:"); Serial.print(stepper.currentPosition());
        Serial.print(" SPEED:"); Serial.print((int)stepper.maxSpeed());
        Serial.print(" MOVING:"); Serial.print(stepper.isRunning() ? 1 : 0);
        Serial.print(" TARGET:"); Serial.print(stepper.targetPosition());
        Serial.print(" SENSOR:"); Serial.println(readSensor());
        return;
    }

    if (cmd == "STOP") {
        homing = false;
        stepper.stop();
        stepper.setCurrentPosition(stepper.currentPosition());  // force stop
        Serial.println("OK STOPPED");
        return;
    }

    if (cmd.startsWith("MOVE ")) {
        long steps = cmd.substring(5).toInt();
        stepper.move(steps);
        Serial.print("OK MOVE "); Serial.println(steps);
        return;
    }

    if (cmd.startsWith("MOVETO ")) {
        long pos = cmd.substring(7).toInt();
        stepper.moveTo(pos);
        Serial.print("OK MOVETO "); Serial.println(pos);
        return;
    }

    if (cmd == "HOME") {
        if (readSensor()) {
            // Already at home, just zero
            stepper.setCurrentPosition(0);
            Serial.println("OK HOME (already at sensor)");
        } else {
            homing = true;
            stepper.setMaxSpeed(HOME_SPEED);
            stepper.move(HOME_DIR * 100000L);  // move a long way toward sensor
            Serial.println("OK HOMING");
        }
        return;
    }

    if (cmd == "ZERO") {
        stepper.setCurrentPosition(0);
        Serial.println("OK ZERO");
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

    Serial.print("ERROR:UNKNOWN:"); Serial.println(cmd);
}

void setup() {
    Serial.begin(115200);

    // Motor setup
    stepper.setMaxSpeed(2000.0);
    stepper.setAcceleration(1000.0);
    stepper.setMinPulseWidth(20);
    pinMode(PIN_STEP, OUTPUT);
    pinMode(PIN_DIR, OUTPUT);

    // Sensor setup
    pinMode(PIN_SENSOR, INPUT_PULLUP);

    // Alive blink
    pinMode(LED_BUILTIN, OUTPUT);
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_BUILTIN, HIGH); delay(100);
        digitalWrite(LED_BUILTIN, LOW); delay(100);
    }

    Serial.print("READY ");
    Serial.println(DEVICE_ID);
}

void loop() {
    stepper.run();

    // Homing: stop when sensor triggers
    if (homing && readSensor()) {
        homing = false;
        stepper.stop();
        stepper.setCurrentPosition(0);
        stepper.setMaxSpeed(2000.0);  // restore normal speed
        Serial.println("HOME_DONE POS:0");
    }

    // Serial command processing
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
