/*
 * Cryptographic Beings — Arduino Nano Motor Controller
 * =====================================================
 * Controls the ISD04 NEMA17 integrated stepper via AccelStepper.
 * Receives commands from ESP8266 over serial.
 *
 * Auto-calibration on boot:
 *   1. Homes to hall sensor (finds reference position)
 *   2. Measures steps per full revolution (hall → hall)
 *   3. Stores stepsPerRevolution for HALF command
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
 *   Receives: MOVE <steps>, MOVETO <n>, HOME, STATUS, STOP, SPEED <sps>,
 *             ENABLE, DISABLE, ZERO, PING, ACCEL <val>,
 *             CALIBRATE, HALF, SPR,
 *             GOTO <name>, SET_OFFSET <steps>, POSITIONS
 *   Sends:    OK, POS:<n>, HALL:<0|1>, ERROR:<msg>, HOMED, PONG,
 *             CAL_START, CAL_DONE SPR:<n>, CAL_FAIL, SPR:<n>
 *
 * Named positions (after calibration):
 *   HOME, HALF, QUARTER, THREE_QUARTER,
 *   TUBE1..TUBE5 (evenly spaced, offset from hall sensor)
 */

#include <Arduino.h>
#include <AccelStepper.h>

// ── Pin definitions (specialized for DM542T high-power motor board) ──
#define PIN_STEP      4    // D4 → DM542T PUL+
#define PIN_DIR       2    // D2 → DM542T DIR+
#define PIN_ENABLE   -1    // Not connected on this board
#define PIN_HALL      3    // D3 ← Proximity probe / sensor

// ── Motor parameters ──
#define DEFAULT_MAX_SPEED     2000.0   // Steps per second
#define DEFAULT_ACCELERATION  1000.0   // Steps per second²
#define HOME_SPEED            500.0    // Slower speed for homing
#define CALIBRATION_SPEED     400.0    // Speed during calibration measurement
#define HOME_MAX_STEPS        200000   // Max steps before homing fails
#define CALIBRATION_ESCAPE    500      // Steps to move past magnet before re-measuring
#define NUM_TUBES             5        // Number of algae tubes

// ── AccelStepper (type 1 = DRIVER: step + dir) ──
AccelStepper stepper(AccelStepper::DRIVER, PIN_STEP, PIN_DIR);

// ── State ──
volatile bool hallTriggered = false;
bool motorEnabled = true;
bool homing = false;

// ── Calibration state ──
long stepsPerRevolution = 0;
bool calibrated = false;
bool calibrating = false;
int calPhase = 0;  // 0=idle, 1=homing, 2=escaping magnet, 3=measuring

// ── Named positions ──
// tubeOffset = steps from hall sensor (home) to tube 1
// Set via SET_OFFSET command after physically aligning
long tubeOffset = 0;
long namedPositions[NUM_TUBES + 4];  // tube1-5 + home, half, quarter, three_quarter
const char* positionNames[] = {
    "TUBE1", "TUBE2", "TUBE3", "TUBE4", "TUBE5",
    "HOME", "HALF", "QUARTER", "THREE_QUARTER"
};
#define POS_COUNT (NUM_TUBES + 4)

void computePositions() {
    if (stepsPerRevolution == 0) return;
    // Tubes: evenly spaced, starting at tubeOffset
    for (int i = 0; i < NUM_TUBES; i++) {
        namedPositions[i] = (tubeOffset + (long)i * stepsPerRevolution / NUM_TUBES) % stepsPerRevolution;
    }
    // Named fractions
    namedPositions[NUM_TUBES]     = 0;                          // HOME
    namedPositions[NUM_TUBES + 1] = stepsPerRevolution / 2;     // HALF
    namedPositions[NUM_TUBES + 2] = stepsPerRevolution / 4;     // QUARTER
    namedPositions[NUM_TUBES + 3] = 3L * stepsPerRevolution / 4; // THREE_QUARTER
}

long getNamedPosition(String name) {
    name.toUpperCase();
    for (int i = 0; i < POS_COUNT; i++) {
        if (name == positionNames[i]) return namedPositions[i];
    }
    return -1;  // Not found
}

// ── Serial input ──
String inputBuffer = "";


// ══════════════════════════════════════════════
// ── Hall sensor interrupt ──
// ══════════════════════════════════════════════

void hallISR() {
    hallTriggered = true;
}


// ══════════════════════════════════════════════
// ── Calibration routine (non-blocking, state machine) ──
// ══════════════════════════════════════════════

void startCalibration() {
    calibrating = true;
    calibrated = false;
    calPhase = 1;  // Phase 1: home to hall sensor
    hallTriggered = false;
    stepper.setMaxSpeed(HOME_SPEED);
    stepper.move(HOME_MAX_STEPS);
    Serial.println("CAL_START");
}

void updateCalibration() {
    if (!calibrating) return;

    switch (calPhase) {
        case 1:  // Homing: waiting for hall trigger
            if (hallTriggered) {
                stepper.stop();
                // Let deceleration finish
                if (!stepper.isRunning()) {
                    stepper.setCurrentPosition(0);
                    hallTriggered = false;
                    // Phase 2: escape the magnet zone
                    calPhase = 2;
                    stepper.setMaxSpeed(CALIBRATION_SPEED);
                    stepper.move(CALIBRATION_ESCAPE);
                }
            } else if (!stepper.isRunning()) {
                // Motor stopped without finding hall
                Serial.println("CAL_FAIL:NO_HALL");
                calibrating = false;
                calPhase = 0;
                stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
            }
            break;

        case 2:  // Escaping magnet: waiting for escape move to finish
            if (!stepper.isRunning()) {
                // Now zero and start full rotation measurement
                stepper.setCurrentPosition(0);
                hallTriggered = false;
                calPhase = 3;
                stepper.setMaxSpeed(CALIBRATION_SPEED);
                stepper.move(HOME_MAX_STEPS);  // Move until hall triggers again
            }
            break;

        case 3:  // Measuring: waiting for hall to trigger again (= 1 full revolution)
            if (hallTriggered) {
                stepper.stop();
                if (!stepper.isRunning()) {
                    stepsPerRevolution = stepper.currentPosition();
                    calibrated = true;
                    calibrating = false;
                    calPhase = 0;

                    // Reset to working state
                    stepper.setCurrentPosition(0);
                    stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
                    hallTriggered = false;

                    Serial.print("CAL_DONE SPR:");
                    Serial.println(stepsPerRevolution);

                    // Compute named positions now that SPR is known
                    computePositions();
                }
            } else if (!stepper.isRunning()) {
                // Motor stopped without finding hall on second pass
                Serial.println("CAL_FAIL:NO_HALL_2ND");
                calibrating = false;
                calPhase = 0;
                stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
            }
            break;
    }
}


// ══════════════════════════════════════════════
// ── Command processing ──
// ══════════════════════════════════════════════

void processCommand(String cmd) {
    cmd.trim();
    cmd.toUpperCase();

    if (cmd.length() == 0) return;

    // Block motor commands during calibration
    if (calibrating && cmd != "STOP" && cmd != "STATUS" && cmd != "PING") {
        Serial.println("ERROR:CALIBRATING");
        return;
    }

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
        Serial.print("SPR:"); Serial.println(stepsPerRevolution);
        Serial.print("CAL:"); Serial.println(calibrated ? 1 : 0);
        return;
    }

    // ── STOP ──
    if (cmd == "STOP") {
        stepper.stop();
        homing = false;
        if (calibrating) {
            calibrating = false;
            calPhase = 0;
            stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
            Serial.println("CAL_ABORTED");
        }
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

    // ── CALIBRATE ──
    if (cmd == "CALIBRATE") {
        startCalibration();
        return;
    }

    // ── HALF ──
    if (cmd == "HALF") {
        if (!calibrated || stepsPerRevolution == 0) {
            Serial.println("ERROR:NOT_CALIBRATED");
            return;
        }
        long halfPos = stepsPerRevolution / 2;
        stepper.moveTo(halfPos);
        Serial.print("OK HALF "); Serial.println(halfPos);
        return;
    }

    // ── GOTO <name> ── (absolute move to a named position)
    if (cmd.startsWith("GOTO ")) {
        if (!calibrated || stepsPerRevolution == 0) {
            Serial.println("ERROR:NOT_CALIBRATED");
            return;
        }
        String target = cmd.substring(5);
        target.trim();
        long pos = getNamedPosition(target);
        if (pos < 0) {
            Serial.print("ERROR:UNKNOWN_POS:"); Serial.println(target);
            return;
        }
        stepper.moveTo(pos);
        Serial.print("OK GOTO "); Serial.print(target);
        Serial.print(" POS:"); Serial.println(pos);
        return;
    }

    // ── SET_OFFSET <steps> ── (set tube offset from hall sensor)
    if (cmd.startsWith("SET_OFFSET ")) {
        tubeOffset = cmd.substring(11).toInt();
        computePositions();
        Serial.print("OK OFFSET "); Serial.println(tubeOffset);
        return;
    }

    // ── POSITIONS ── (list all named positions)
    if (cmd == "POSITIONS") {
        if (!calibrated || stepsPerRevolution == 0) {
            Serial.println("ERROR:NOT_CALIBRATED");
            return;
        }
        Serial.print("OFFSET:"); Serial.println(tubeOffset);
        for (int i = 0; i < POS_COUNT; i++) {
            Serial.print(positionNames[i]);
            Serial.print(":");
            Serial.println(namedPositions[i]);
        }
        Serial.println("END_POSITIONS");
        return;
    }

    // ── SPR ── (query steps per revolution)
    if (cmd == "SPR") {
        Serial.print("SPR:"); Serial.println(stepsPerRevolution);
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
    if (PIN_ENABLE >= 0) {
        stepper.setEnablePin(PIN_ENABLE);
        stepper.setPinsInverted(false, false, true);  // ENA is active LOW on ISD04
        stepper.enableOutputs();
    }

    // Hall sensor
    pinMode(PIN_HALL, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_HALL), hallISR, FALLING);

    Serial.println("READY");
    Serial.println("Cryptographic Beings - Nano Motor Controller v2 (manual mode)");

    // Motor sits idle — all control via web interface
    // (Use CALIBRATE command manually when sensor is verified)
}


// ══════════════════════════════════════════════
// ── Loop ──
// ══════════════════════════════════════════════

void loop() {
    // ── Run the stepper (must be called frequently) ──
    stepper.run();

    // ── Handle calibration state machine ──
    updateCalibration();

    // ── Handle homing (manual HOME command) ──
    if (homing && hallTriggered) {
        stepper.stop();
        if (!stepper.isRunning()) {
            stepper.setCurrentPosition(0);
            stepper.setMaxSpeed(DEFAULT_MAX_SPEED);
            homing = false;
            hallTriggered = false;
            Serial.println("HOMED");
        }
    }

    // ── Report when movement finishes ──
    static bool wasRunning = false;
    bool running = stepper.isRunning();
    if (wasRunning && !running && !homing && !calibrating) {
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
