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

bool should_run = true;

int dir = 0;

int stepIncrement = 305000;

AccelStepper stepper(1, motorStepPin, motorDirPin);
int count = 0;
float Stepper_Max_speed = 10.0;
float Stepper_Max_Acceleration = 10.0;


String message = "";
bool messageReady = false;

int calibration_round = 0;
bool is_calibrated =false;
bool calibration_is_running = false;
int step_count = 0; 

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


void calibration_routine(){
  if (!is_calibrated){
    
    calibration_is_running = true;

    while(!is_calibrated){
      stepper.runSpeed();
      Serial.println("cal");
    }
    



    calibration_is_running = false;
  }
}

void Hall_effect_mark(){
  Serial.println("interupt");
  if(calibration_is_running){
    if(calibration_round == 0){
      calibration_round = calibration_round+1;
      stepper.setCurrentPosition(0); 
    }
    else if(calibration_round == 1){
      step_count = stepper.currentPosition();
      Serial.println(step_count);
    }
  }
}

void setup()
{  
  Serial.begin(115200);           // set up Serial library at 9600 bps
  Serial.println("Stepper test!");
  pinMode(motorStepPin,OUTPUT);
  pinMode(motorDirPin,OUTPUT);
  pinMode(Hall_effect_pin, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(Hall_effect_pin), blink, RISING );
  

  stepper.setMaxSpeed(4000);
  stepper.setSpeed(4000);  
  
  stepper.setAcceleration(1500);
   
}

void blink() {
  Serial.println("interupt");
  if(dir == 0){
    dir = 1;
  }else{
    dir =0;
  }

  Serial.println(dir);
}

void loop()
{  

  if(should_run){
    //Serial.println("tetst");
    stepper.runSpeed();
  }

   digitalWrite(motorDirPin,HIGH);

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
