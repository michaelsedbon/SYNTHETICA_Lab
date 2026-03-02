// ConstantSpeed.pde
// -*- mode: C++ -*-
//
// Shows how to run AccelStepper in the simplest,
// fixed speed mode with no accelerations
// Requires the AFMotor library (https://github.com/adafruit/Adafruit-Motor-Shield-library)
// And AccelStepper with AFMotor support (https://github.com/adafruit/AccelStepper)
// Public domain!

#include <AccelStepper.h>


int motorDirPin = 4; //digital pin 2     < ===THIS IS A DIRECTION PIN
int motorStepPin = 5; //digital pin 3

int Hall_effect_pin = 3;

bool running = false ;

bool should_run = false;

int stepIncrement = 35000;

AccelStepper stepper(1, motorStepPin, motorDirPin);
int count = 0;
float Stepper_Max_speed = 5000.0;
float Stepper_Max_Acceleration = 5000.0;


String message = "";
bool messageReady = false;

void back_and_forth_motor_test()
{
  int currPos = 0;
  running = true;
  
  int small_increment = stepIncrement / 6;
  currPos = stepper.currentPosition() + small_increment;
  //Serial.println(state_limit1);
  //ESP.wdtFeed();
  stepper.moveTo(currPos);
  stepper.runToPosition();
  Serial.println("BACK AND FORTH");
  stepIncrement = stepIncrement * -1;
  if (count< 6 -1 )
  {
     count = count + 1;
  }else{
    count = 0;
  }
}


void setup()
{  
   Serial.begin(115200);           // set up Serial library at 9600 bps
   Serial.println("Stepper test!");
  pinMode(motorStepPin,OUTPUT);
  pinMode(motorDirPin,OUTPUT);
  pinMode(Hall_effect_pin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(Hall_effect_pin), blink, LOW);
  
   stepper.setSpeed(Stepper_Max_speed);	
  stepper.setMaxSpeed(Stepper_Max_speed);
  stepper.setAcceleration(Stepper_Max_Acceleration);
}

void blink() {
  Serial.println("interupt");
}

void loop()
{  

  if(should_run){
    stepper.runSpeed();
  }
   

   while(Serial.available()){
    message = Serial.readString();
    messageReady = true;
   }
   if(messageReady){
    Serial.println(message);
    Serial.println(message.length());
    if(message == "0"){
      should_run = false;
      Serial.println("should not run");
    }
    //-------------
    if(message == "1"){
      should_run = true;
      Serial.println("should run");
    }
    //-------------


    //-------------
    if(message == "b"){
      should_run = true;
      Serial.println("should run");
    }
    //-------------

    
    messageReady = false;
   }
   
   //Serial.println("Stepper test!");
   //back_and_forth_motor_test();
}
