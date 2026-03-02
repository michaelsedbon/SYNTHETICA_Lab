/*
 * Cryptographic Beings — Arduino Nano Motor Controller
 * =====================================================
 * Controls the ISD04 NEMA17 integrated stepper via AccelStepper.
 * Receives commands from ESP8266 over serial.
 *
 * Wiring (from old working code + ISD04 datasheet):
 *   D0 (RX) ← ESP8266 TX   (serial commands)
 *   D3      ← Hall sensor   (homing/position feedback, interrupt)
 *   D4      → ISD04 DIR     (pin 4, direction)
 *   D5      → ISD04 STP     (pin 5, step pulse)
 *   D6      → ISD04 ENA     (pin 6, enable — optional)
 *   5V      → ISD04 VCC     (pin 3, signal reference)
 *   GND     → (shared)
 *
 * Serial protocol (115200 baud):
 *   Receives: MOVE <steps>, HOME, STATUS, STOP, SPEED <sps>,
 *             ENABLE, DISABLE, ZERO, PING, ACCEL <val>
 *   Sends:    OK, POS:<n>, HALL:<0|1>, ERROR:<msg>, HOMED, PONG
 */

#include <Arduino.h>
#include <AccelStepper.h>

// ── Pin definitions (matching old working code) ──
#define PIN_STEP      5    // D5 → ISD04 STP (pin 5)
#define PIN_DIR       4    // D4 → ISD04 DIR (pin 4)
#define PIN_ENABLE    6    // D6 → ISD04 ENA (pin 6)
#define PIN_HALL      3    // D3 ← Hall-effect sensor (interrupt-capable)

// ── Motor parameters ──
#define DEFAULT_MAX_SPEED     2000.0   // Steps per second
#define DEFAULT_ACCELERATION  1000.0   // Steps per second²
#define HOME_SPEED            500.0    // Slower speed for homing
#define HOME_MAX_STEPS        200000   // Max steps before homing fails (enough for geared motors)

// ── AccelStepper (type 1 = DRIVER: step + dir) ──
AccelStepper stepper(AccelStepper::DRIVER, PIN_STEP, PIN_DIR);

// ── State ──
volatile bool hallTriggered = false;
bool motorEnabled = true;
bool homing = false;

// ── Serial input ──
String inputBuffer = "";


// ══════════════════════════════════════════════
// ── Hall sensor interrupt ──
// ══════════════════════════════════════════════

void hallISR() {
    hallTriggered = true;
}


// ══════════════════════════════════════════════
// ── Command processing ──
// ══════════════════════════════════════════════

void processCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();

    if (cmd.length() == 0) return;

    // ── PING ──
    if (cmd == "PING") {
        Serial.println("PONG");
        return;
    }

    // ── STATUS ──
    if (cmd == "STATUS") {
        Serial.print("POS:"); Serial.println(stepper.currentPosition());
        Serial.print("HALL:"); Serial.println(digitalRead(PIN_HALL) == LOW ? 1 : 0);
        Serial.print("ENABLED:"); Serial.println(motorEnabled ? 1 : 0);
        Serial.print("SPEED:"); Serial.println((int)stepper.maxSpeed());
        Serial.print("MOVING:"); Serial.println(stepper.isRunning() ? 1 : 0);
        return;
    }

    // ── STOP ──
    if (cmd == "STOP") {
        stepper.stop();
        homing = false;
        Serial.println("OK STOPPED");
        return;
    }

    // ── ENABLE / DISABLE ──
    if (cmd == "ENABLE") {
        motorEnabled = true;
        stepper.enableOutputs();
        Serial.println("OK ENABLED");
        return;
    }
    if (cmd == "DISABLE") {
        motorEnabled = false;
        stepper.disableOutputs();
        Serial.println("OK DISABLED");
        return;
    }

    // ── ZERO ──
    if (cmd == "ZERO") {
        stepper.setCurrentPosition(0);
        Serial.println("OK ZEROED");
        return;
    }

    // ── HOME ──
    if (cmd == "HOME") {
        homing = true;
        hallTriggered = false;
        stepper.setMaxSpeed(HOME_SPEED);
        stepper.move(HOME_MAX_STEPS);  // Move forward until hall triggers
        Serial.println("OK HOMING");
        return;
    }

    // ── MOVE <steps> ──
    if (cmd.startsWith("MOVE ")) {
        long steps = cmd.substring(5).toInt();
        if (steps == 0 && cmd.substring(5) != "0") {
            Serial.println("ERROR:INVALID_STEPS");
            return;
        }
        stepper.move(steps);
        Serial.print("OK MOVE "); Serial.println(steps);
        return;
    }

    // ── SPEED <steps_per_sec> ──
    if (cmd.startsWith("SPEED ")) {
        float spd = cmd.substring(6).toFloat();
        if (spd < 1 || spd > 10000) {
            Serial.println("ERROR:SPEED_RANGE");
            return;
        }
        stepper.setMaxSpeed(spd);
        Serial.print("OK SPEED "); Serial.println((int)spd);
        return;
    }

    // ── ACCEL <steps_per_sec2> ──
    if (cmd.startsWith("ACCEL ")) {
        float accel = cmd.substring(6).toFloat();
        if (accel < 1 || accel > 50000) {
            Serial.println("ERROR:ACCEL_RANGE");
            return;
        }
        stepper.setAcceleration(accel);
        Serial.print("OK ACCEL "); Serial.println((int)accel);
        return;
    }

    // ── MOVETO <position> ──
    if (cmd.startsWith("MOVETO ")) {
        long pos = cmd.substring(7).toInt();
        stepper.moveTo(pos);
        Serial.print("OK MOVETO "); Serial.println(pos);
        return;
    }

    Serial.print("ERROR:UNKNOWN_CMD:"); Serial.println(cmd);
}


// ══════════════════════════════════════════════
// ── Setup ──
// ══════════════════════════════════════════════

void setup() {
    Serial.begin(115200);

    // Motor setup
    stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
    stepper.setAcceleration(DEFAULT_ACCELERATION);
    stepper.setEnablePin(PIN_ENABLE);
    stepper.setPinsInverted(false, false, true);  // ENA is active LOW on ISD04
    stepper.enableOutputs();

    // Hall sensor
    pinMode(PIN_HALL, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_HALL), hallISR, FALLING);

    Serial.println("READY");
    Serial.println("Cryptographic Beings - Nano Motor Controller (AccelStepper)");
    Serial.println("Commands: MOVE <n>, MOVETO <n>, HOME, STATUS, STOP, SPEED <sps>, ACCEL <a>, ENABLE, DISABLE, ZERO, PING");
}


// ══════════════════════════════════════════════
// ── Loop ──
// ══════════════════════════════════════════════

void loop() {
    // ── Run the stepper (must be called frequently) ──
    stepper.run();

    // ── Handle homing ──
    if (homing && hallTriggered) {
        stepper.stop();
        stepper.setCurrentPosition(0);
        stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
        homing = false;
        hallTriggered = false;
        Serial.println("HOMED");
    }

    // ── Report when movement finishes ──
    static bool wasRunning = false;
    bool running = stepper.isRunning();
    if (wasRunning && !running && !homing) {
        Serial.print("POS:"); Serial.println(stepper.currentPosition());
    }
    wasRunning = running;

    // ── Read serial commands ──
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
