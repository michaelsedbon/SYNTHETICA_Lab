#include <Arduino.h>

#include <AccelStepper.h>

int motorDirPin = 4;  //digital pin 2     < ===THIS IS A DIRECTION PIN
int motorStepPin = 5; //digital pin 3

int Hall_effect_pin = 3;

bool running = false;

bool should_run = true;

int dir = 0;

AccelStepper stepper(1, motorStepPin, motorDirPin);
int count = 0;
float Stepper_Max_speed = 10.0;
float Stepper_Max_Acceleration = 10.0;

String message = "";
bool messageReady = false;

int calibration_round = 0;
bool is_calibrated = false;
bool calibration_is_running = false;
long step_count = 0;

long destination = 0;
long destinations_breackdown = 0;

void calibration_routine()
{
  if (!is_calibrated)
  {
    Serial.println("should start calibration");
    calibration_is_running = true;

    while (!is_calibrated)
    {
      stepper.runSpeed();
      step_count = step_count + 1;
    }
    calibration_is_running = false;
  }
}

void Hall_effect_mark()
{
  Serial.println("interupt");
  if (calibration_is_running)
  {
    if (calibration_round == 0)
    {
      Serial.println("calibration round");
      calibration_round = calibration_round + 1;
      step_count = 0;
      stepper.setCurrentPosition(step_count);

      Serial.print("current pos =");
      Serial.println(stepper.currentPosition());
    }
    else if (calibration_round == 1)
    {
      Serial.println("calibration round should be over");
      stepper.setCurrentPosition(0);
      Serial.println(stepper.currentPosition());
      is_calibrated = true;
      step_count = abs(step_count);

      delay(1000);
      Serial.print("step_count should be = ");
      Serial.println(step_count);
      destination = int(step_count / 2);
      destinations_breackdown = int(step_count / 6);
      stepper.moveTo(-destination);
      Serial.print("destination should be = ");
      Serial.println(destination);

      delay(2000);
    }
  }
}

void setup()
{
  Serial.begin(115200); // set up Serial library at 9600 bps
  Serial.println("Stepper test!");
  pinMode(motorStepPin, OUTPUT);
  pinMode(motorDirPin, OUTPUT);
  pinMode(Hall_effect_pin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(Hall_effect_pin), Hall_effect_mark, RISING);

  stepper.setMaxSpeed(4000);
  stepper.setSpeed(4000);
  stepper.setAcceleration(1500);
}

void target(int target)
{
  destination = int(step_count / 2);
  stepper.moveTo(destination);
}

void set_new_destination(int target)
{
  int loca_dest = destinations_breackdown * (target-1);

  stepper.moveTo(loca_dest);
}

void loop()
{
  calibration_routine();

  //Serial.println("destination should be"); Serial.print(destination);
  //Serial.println(stepper.distanceToGo());
  
  if (should_run && is_calibrated)
  {
    //Serial.println("tetst");
    stepper.run();
  }

  digitalWrite(motorDirPin, HIGH);

  while (Serial.available())
  {
    message = Serial.readString();

    messageReady = true;
  }
  if (messageReady)
  {
    Serial.println(message);
    Serial.println(message.length());
    if (message == "0")
    {
      should_run = false;
      Serial.println("should not run");
    }
    //-------------
    if (message == "1")
    {
      should_run = true;
      Serial.println("should run");
    }
    //-------------

    //-------------
    if (message == "2")
    {
      if (is_calibrated)
      {
        should_run = true;
        set_new_destination(1);
        Serial.println("DESTINATION SHOULD BE 1");
      }
    }
    //-------------

    //-------------
    if (message == "3")
    {
      if (is_calibrated)
      {
        should_run = true;
        set_new_destination(2);
        Serial.println("DESTINATION SHOULD BE 2");
      }
    }
    //-------------

    //-------------
    if (message == "4")
    {
      if (is_calibrated)
      {
        should_run = true;
        set_new_destination(3);
        Serial.println("DESTINATION SHOULD BE 3");
      }
    }
    //-------------

    //-------------
    if (message == "5")
    {
      if (is_calibrated)
      {
        should_run = true;
        set_new_destination(4);
        Serial.println("DESTINATION SHOULD BE 4");
      }
    }
    //-------------

    //-------------
    if (message == "6")
    {
      if (is_calibrated)
      {
        should_run = true;
        set_new_destination(5);
        Serial.println("DESTINATION SHOULD BE 5");
      }
    }
    //-------------

        //-------------
    if (message == "7")
    {
      if (is_calibrated)
      {
        should_run = true;
        set_new_destination(6);
        Serial.println("DESTINATION SHOULD BE 6");
      }
    }
    //-------------

    //-------------
    if (message == "b")
    {
      if (is_calibrated)
      {
        should_run = true;
        Serial.println("should run");
      }
    }
    //-------------

    messageReady = false;
  }
}
