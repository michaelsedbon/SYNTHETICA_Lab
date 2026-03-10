/*
 * EXP_011 — Step 1: LED Blink
 * ============================
 * Bare minimum firmware to verify Nano is alive and flashing works.
 * No motor code, no serial, no libraries.
 *
 * Pass criteria: LED blinks visibly (500ms on/off)
 */

#include <Arduino.h>

void setup() {
    pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(500);
    digitalWrite(LED_BUILTIN, LOW);
    delay(500);
}
