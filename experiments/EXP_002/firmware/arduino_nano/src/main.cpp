/*
 * Cryptographic Beings — Arduino Nano Motor Controller
 * =====================================================
 * Receives serial commands from the ESP8266 and controls
 * ISD04 NEMA17 integrated stepper motors.
 *
 * Wiring (from KiCad schematic):
 *   D0 (RX) ← ESP8266 TX   (serial commands)
 *   D2      ← Hall sensor   (homing/position feedback)
 *   D4      → ISD04 PUL+    (step pulse)
 *   D5      → ISD04 DIR+    (direction)
 *   D6      → ISD04 ENA+    (enable, active LOW on most drivers)
 *
 * Serial protocol (115200 baud):
 *   Receives: MOVE <steps>, HOME, STATUS, STOP, SPEED <us>
 *   Sends:    OK, POS:<n>, HALL:<0|1>, ERROR:<msg>, HOMED
 *
 * ISD04 driver:
 *   - Integrated stepper + driver, accepts STEP/DIR signals
 *   - PUL+/PUL-: pulse input (one step per rising edge)
 *   - DIR+/DIR-: direction input (HIGH/LOW)
 *   - ENA+/ENA-: enable input (LOW = enabled on most units)
 *   - Power: 12-38V DC via J4 IDC connector
 */

#include <Arduino.h>
#define PIN_STEP      4    // D4 → ISD04 PUL+
#define PIN_DIR       5    // D5 → ISD04 DIR+
#define PIN_ENABLE    6    // D6 → ISD04 ENA+ (optional, active LOW)
#define PIN_HALL      2    // D2 ← Hall-effect sensor (interrupt capable)

// ── Motor parameters ──
#define DEFAULT_STEP_DELAY_US  800   // Microseconds between steps (controls speed)
#define MIN_STEP_DELAY_US      200   // Fastest allowed
#define MAX_STEP_DELAY_US      5000  // Slowest allowed
#define ACCEL_STEPS            50    // Steps to ramp up/down speed
#define HOME_SPEED_US          1200  // Slower speed for homing
#define HOME_MAX_STEPS         10000 // Max steps before homing fails

// ── State ──
long currentPosition = 0;       // Current position in steps
int  stepDelayUs = DEFAULT_STEP_DELAY_US;
bool motorEnabled = true;
volatile bool hallTriggered = false;
bool isMoving = false;
bool stopRequested = false;

// ── Serial command buffer ──
String cmdBuffer = "";

// ── Hall sensor interrupt ──
void hallISR() {
    hallTriggered = true;
}

// ── Motor control functions ──

void enableMotor(bool enable) {
    motorEnabled = enable;
    digitalWrite(PIN_ENABLE, enable ? LOW : HIGH);  // Active LOW
}

void setDirection(bool forward) {
    digitalWrite(PIN_DIR, forward ? HIGH : LOW);
}

/*
 * Move the stepper motor by a given number of steps.
 * Positive = forward, negative = reverse.
 * Uses trapezoidal acceleration profile.
 * Can be interrupted by STOP command or hall sensor.
 */
void moveSteps(long steps) {
    if (steps == 0) return;

    bool forward = (steps > 0);
    long totalSteps = abs(steps);
    setDirection(forward);
    enableMotor(true);
    isMoving = true;
    stopRequested = false;

    for (long i = 0; i < totalSteps; i++) {
        // Check for stop request (from serial or hall sensor)
        if (stopRequested) {
            Serial.println("STOPPED");
            break;
        }

        // Check for serial commands during movement
        if (Serial.available()) {
            char c = Serial.read();
            if (c == '\n') {
                cmdBuffer.trim();
                if (cmdBuffer == "STOP") {
                    stopRequested = true;
                    cmdBuffer = "";
                    continue;
                }
                cmdBuffer = "";
            } else if (c != '\r') {
                cmdBuffer += c;
            }
        }

        // Calculate speed with acceleration ramp
        int currentDelay = stepDelayUs;
        long rampSteps = min((long)ACCEL_STEPS, totalSteps / 2);
        if (i < rampSteps) {
            // Accelerating
            currentDelay = map(i, 0, rampSteps, stepDelayUs * 3, stepDelayUs);
        } else if (i > totalSteps - rampSteps) {
            // Decelerating
            currentDelay = map(i, totalSteps - rampSteps, totalSteps, stepDelayUs, stepDelayUs * 3);
        }

        // Generate step pulse
        digitalWrite(PIN_STEP, HIGH);
        delayMicroseconds(currentDelay);
        digitalWrite(PIN_STEP, LOW);
        delayMicroseconds(currentDelay);

        // Update position
        currentPosition += forward ? 1 : -1;
    }

    isMoving = false;
}

/*
 * Homing routine: move in reverse until the hall sensor triggers,
 * then reset position to zero.
 */
void homeMotor() {
    Serial.println("HOMING...");
    hallTriggered = false;
    setDirection(false);  // Reverse toward home
    enableMotor(true);
    isMoving = true;
    stopRequested = false;

    for (long i = 0; i < HOME_MAX_STEPS; i++) {
        if (hallTriggered || stopRequested) break;

        // Check for STOP during homing
        if (Serial.available()) {
            char c = Serial.read();
            if (c == '\n') {
                cmdBuffer.trim();
                if (cmdBuffer == "STOP") {
                    stopRequested = true;
                    cmdBuffer = "";
                    break;
                }
                cmdBuffer = "";
            } else if (c != '\r') {
                cmdBuffer += c;
            }
        }

        digitalWrite(PIN_STEP, HIGH);
        delayMicroseconds(HOME_SPEED_US);
        digitalWrite(PIN_STEP, LOW);
        delayMicroseconds(HOME_SPEED_US);
    }

    isMoving = false;

    if (hallTriggered) {
        currentPosition = 0;
        hallTriggered = false;
        Serial.println("HOMED");
    } else if (stopRequested) {
        Serial.println("ERROR:homing_stopped");
    } else {
        Serial.println("ERROR:homing_failed_no_sensor");
    }
}

// ── Command parser ──

void processCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();

    if (cmd.startsWith("MOVE ")) {
        long steps = cmd.substring(5).toInt();
        if (steps == 0 && cmd.substring(5) != "0") {
            Serial.println("ERROR:invalid_steps");
            return;
        }
        Serial.print("OK MOVE ");
        Serial.println(steps);
        moveSteps(steps);
        Serial.print("POS:");
        Serial.println(currentPosition);

    } else if (cmd == "HOME") {
        Serial.println("OK HOME");
        homeMotor();

    } else if (cmd == "STATUS") {
        Serial.print("POS:");
        Serial.println(currentPosition);
        Serial.print("HALL:");
        Serial.println(digitalRead(PIN_HALL) == LOW ? "1" : "0");
        Serial.print("ENABLED:");
        Serial.println(motorEnabled ? "1" : "0");
        Serial.print("SPEED:");
        Serial.println(stepDelayUs);
        Serial.print("MOVING:");
        Serial.println(isMoving ? "1" : "0");

    } else if (cmd == "STOP") {
        stopRequested = true;
        enableMotor(false);
        Serial.println("STOPPED");

    } else if (cmd.startsWith("SPEED ")) {
        int spd = cmd.substring(6).toInt();
        if (spd < MIN_STEP_DELAY_US || spd > MAX_STEP_DELAY_US) {
            Serial.print("ERROR:speed_out_of_range_");
            Serial.print(MIN_STEP_DELAY_US);
            Serial.print("_");
            Serial.println(MAX_STEP_DELAY_US);
            return;
        }
        stepDelayUs = spd;
        Serial.print("OK SPEED ");
        Serial.println(stepDelayUs);

    } else if (cmd == "ENABLE") {
        enableMotor(true);
        Serial.println("OK ENABLED");

    } else if (cmd == "DISABLE") {
        enableMotor(false);
        Serial.println("OK DISABLED");

    } else if (cmd == "ZERO") {
        currentPosition = 0;
        Serial.println("OK ZEROED");

    } else if (cmd == "PING") {
        Serial.println("PONG");

    } else if (cmd.length() > 0) {
        Serial.print("ERROR:unknown_cmd:");
        Serial.println(cmd);
    }
}

// ── Setup ──

void setup() {
    Serial.begin(115200);

    // Pin setup
    pinMode(PIN_STEP, OUTPUT);
    pinMode(PIN_DIR, OUTPUT);
    pinMode(PIN_ENABLE, OUTPUT);
    pinMode(PIN_HALL, INPUT_PULLUP);  // Hall sensor, active LOW

    // Default state
    digitalWrite(PIN_STEP, LOW);
    digitalWrite(PIN_DIR, LOW);
    enableMotor(true);

    // Hall sensor interrupt (triggers on falling edge)
    attachInterrupt(digitalPinToInterrupt(PIN_HALL), hallISR, FALLING);

    Serial.println("READY");
    Serial.println("Cryptographic Beings - Nano Motor Controller");
    Serial.print("Commands: MOVE <n>, HOME, STATUS, STOP, SPEED <us>, ");
    Serial.println("ENABLE, DISABLE, ZERO, PING");
}

// ── Loop ──

void loop() {
    // Read serial commands
    while (Serial.available()) {
        char c = Serial.read();
        if (c == '\n') {
            processCommand(cmdBuffer);
            cmdBuffer = "";
        } else if (c != '\r') {
            cmdBuffer += c;
        }
    }
}
