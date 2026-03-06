/*
 * EXP_005 — Arduino Nano Motor Controller
 * =========================================
 * Motor control firmware with serial command interface.
 * Communicates with ESP8266 over hardware UART at 115200 baud.
 *
 * Wiring (DM542T board):
 *   D0 (RX) ← ESP8266 TX
 *   D1 (TX) → ESP8266 RX
 *   D4      → DM542T PUL+ (step)
 *   D2      → DM542T DIR+ (direction)
 *   D7      ← Proximity probe (hall sensor)
 *
 * Commands:
 *   PING           → PONG
 *   STATUS         → POS:<n> HALL:<0|1> SPEED:<n> MOVING:<0|1> SPR:<n> CAL:<0|1>
 *   MOVE <steps>   → OK MOVE <steps>
 *   MOVETO <pos>   → OK MOVETO <pos>
 *   HOME           → OK HOMING ... HOMED
 *   CALIBRATE      → CAL_START ... CAL_DONE SPR:<n>
 *   HALF           → OK HALF <steps>
 *   STOP           → OK STOPPED
 *   SPEED <sps>    → OK SPEED <sps>
 *   ACCEL <val>    → OK ACCEL <val>
 *   ZERO           → OK ZEROED
 *   ENABLE         → OK ENABLED
 *   DISABLE        → OK DISABLED
 */

#include <Arduino.h>
#include <AccelStepper.h>

// ── Pins (DM542T board) ──
#define PIN_STEP    4
#define PIN_DIR     2
#define PIN_HALL    7

// ── Motor defaults ──
#define DEFAULT_SPEED   2000.0
#define DEFAULT_ACCEL   1000.0
#define HOME_SPEED       500.0
#define CAL_SPEED        400.0
#define MAX_STEPS     200000L
#define CAL_ESCAPE       500

AccelStepper stepper(AccelStepper::DRIVER, PIN_STEP, PIN_DIR);

// ── State ──
String inputBuffer = "";
bool homing = false;
bool hallTriggered = false;
bool lastHall = false;

// ── Calibration ──
long stepsPerRev = 0;
bool calibrated = false;
bool calibrating = false;
int calPhase = 0;  // 0=idle, 1=homing, 2=escape, 3=measure

// ── Calibration state machine ──
void startCalibration() {
    calibrating = true;
    calibrated = false;
    calPhase = 1;
    hallTriggered = false;
    stepper.setMaxSpeed(HOME_SPEED);
    stepper.move(MAX_STEPS);
    Serial.println("CAL_START");
}

void updateCalibration() {
    if (!calibrating) return;

    switch (calPhase) {
        case 1:  // Home to sensor
            if (hallTriggered) {
                stepper.stop();
                if (!stepper.isRunning()) {
                    stepper.setCurrentPosition(0);
                    hallTriggered = false;
                    calPhase = 2;
                    stepper.setMaxSpeed(CAL_SPEED);
                    stepper.move(CAL_ESCAPE);
                }
            } else if (!stepper.isRunning()) {
                Serial.println("CAL_FAIL:NO_HALL");
                calibrating = false;
                calPhase = 0;
                stepper.setMaxSpeed(DEFAULT_SPEED);
            }
            break;

        case 2:  // Escape magnet zone
            if (!stepper.isRunning()) {
                stepper.setCurrentPosition(0);
                hallTriggered = false;
                calPhase = 3;
                stepper.setMaxSpeed(CAL_SPEED);
                stepper.move(MAX_STEPS);
            }
            break;

        case 3:  // Measure full revolution
            if (hallTriggered) {
                stepper.stop();
                if (!stepper.isRunning()) {
                    stepsPerRev = stepper.currentPosition();
                    calibrated = true;
                    calibrating = false;
                    calPhase = 0;
                    stepper.setCurrentPosition(0);
                    stepper.setMaxSpeed(DEFAULT_SPEED);
                    hallTriggered = false;
                    Serial.print("CAL_DONE SPR:");
                    Serial.println(stepsPerRev);
                }
            } else if (!stepper.isRunning()) {
                Serial.println("CAL_FAIL:NO_HALL_2ND");
                calibrating = false;
                calPhase = 0;
                stepper.setMaxSpeed(DEFAULT_SPEED);
            }
            break;
    }
}

// ── Command processing ──
void processCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();
    if (cmd.length() == 0) return;

    if (calibrating && cmd != "STOP" && cmd != "STATUS" && cmd != "PING") {
        Serial.println("ERROR:CALIBRATING");
        return;
    }

    if (cmd == "PING") {
        Serial.println("PONG");
        return;
    }

    if (cmd == "STATUS") {
        Serial.print("POS:"); Serial.println(stepper.currentPosition());
        Serial.print("HALL:"); Serial.println(digitalRead(PIN_HALL) == LOW ? 1 : 0);
        Serial.print("SPEED:"); Serial.println((int)stepper.maxSpeed());
        Serial.print("MOVING:"); Serial.println(stepper.isRunning() ? 1 : 0);
        Serial.print("SPR:"); Serial.println(stepsPerRev);
        Serial.print("CAL:"); Serial.println(calibrated ? 1 : 0);
        return;
    }

    if (cmd == "STOP") {
        stepper.stop();
        homing = false;
        if (calibrating) {
            calibrating = false;
            calPhase = 0;
            stepper.setMaxSpeed(DEFAULT_SPEED);
            Serial.println("CAL_ABORTED");
        }
        Serial.println("OK STOPPED");
        return;
    }

    if (cmd == "HOME") {
        homing = true;
        hallTriggered = false;
        stepper.setMaxSpeed(HOME_SPEED);
        stepper.move(MAX_STEPS);
        Serial.println("OK HOMING");
        return;
    }

    if (cmd == "CALIBRATE") {
        startCalibration();
        return;
    }

    if (cmd == "HALF") {
        if (!calibrated || stepsPerRev == 0) {
            Serial.println("ERROR:NOT_CALIBRATED");
            return;
        }
        long h = stepsPerRev / 2;
        stepper.moveTo(h);
        Serial.print("OK HALF "); Serial.println(h);
        return;
    }

    if (cmd == "ZERO") {
        stepper.setCurrentPosition(0);
        Serial.println("OK ZEROED");
        return;
    }

    if (cmd == "ENABLE") {
        stepper.enableOutputs();
        Serial.println("OK ENABLED");
        return;
    }

    if (cmd == "DISABLE") {
        stepper.disableOutputs();
        Serial.println("OK DISABLED");
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

    if (cmd.startsWith("SPEED ")) {
        float spd = cmd.substring(6).toFloat();
        if (spd < 1 || spd > 10000) { Serial.println("ERROR:SPEED_RANGE"); return; }
        stepper.setMaxSpeed(spd);
        Serial.print("OK SPEED "); Serial.println((int)spd);
        return;
    }

    if (cmd.startsWith("ACCEL ")) {
        float a = cmd.substring(6).toFloat();
        if (a < 1 || a > 50000) { Serial.println("ERROR:ACCEL_RANGE"); return; }
        stepper.setAcceleration(a);
        Serial.print("OK ACCEL "); Serial.println((int)a);
        return;
    }

    Serial.print("ERROR:UNKNOWN:"); Serial.println(cmd);
}

void setup() {
    Serial.begin(115200);
    stepper.setMaxSpeed(DEFAULT_SPEED);
    stepper.setAcceleration(DEFAULT_ACCEL);
    pinMode(PIN_HALL, INPUT_PULLUP);

    // Blink LED to show we're alive
    pinMode(LED_BUILTIN, OUTPUT);
    for (int i = 0; i < 3; i++) {
        digitalWrite(LED_BUILTIN, LOW); delay(100);
        digitalWrite(LED_BUILTIN, HIGH); delay(100);
    }

    Serial.println("READY");
}

void loop() {
    // Poll hall sensor for falling edge
    bool h = (digitalRead(PIN_HALL) == LOW);
    if (h && !lastHall) hallTriggered = true;
    lastHall = h;

    stepper.run();
    updateCalibration();

    // Handle manual HOME
    if (homing && hallTriggered) {
        stepper.stop();
        if (!stepper.isRunning()) {
            stepper.setCurrentPosition(0);
            stepper.setMaxSpeed(DEFAULT_SPEED);
            homing = false;
            hallTriggered = false;
            Serial.println("HOMED");
        }
    }

    // Read serial commands
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n') {
            processCommand(inputBuffer);
            inputBuffer = "";
        } else if (c != '\r') {
            inputBuffer += c;
        }
    }
}
