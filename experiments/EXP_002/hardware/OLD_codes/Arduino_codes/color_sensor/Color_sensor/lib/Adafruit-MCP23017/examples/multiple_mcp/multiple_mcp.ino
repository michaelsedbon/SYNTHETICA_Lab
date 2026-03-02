#include <Wire.h>
#include "Adafruit_MCP23017.h"

// Basic pin reading and pullup test for the MCP23017 I/O expander
// public domain!

// Connect pin #12 of the expander to Analog 5 (i2c clock)
// Connect pin #13 of the expander to Analog 4 (i2c data)
// Connect pins #15, 16 and 17 of the expander to ground (address selection)
// Connect pin #9 of the expander to 5V (power)
// Connect pin #10 of the expander to ground (common ground)
// Connect pin #18 through a ~10kohm resistor to 5V (reset pin, active low)

// Output #0 is on pin 21 so connect an LED or whatever from that to ground

/*-------------------------------------------------
addr 0 = A2 low , A1 low , A0 low  000
addr 1 = A2 low , A1 low , A0 high 001
addr 2 = A2 low , A1 high , A0 low  010
addr 3 = A2 low , A1 high , A0 high  011
addr 4 = A2 high , A1 low , A0 low  100
addr 5 = A2 high , A1 low , A0 high  101
addr 6 = A2 high , A1 high , A0 low  110
addr 7 = A2 high, A1 high, A0 high 111

-----------------------------------------
*/

Adafruit_MCP23017 mcp1; // chip 1
Adafruit_MCP23017 mcp2; // chip 2

#define addr1 7 // 7 = A2 high, A1 high, A0 high
#define addr2 0 // 0 = A2 high, A1 high, A0 high

void setup() 
  {
    Serial.begin(9600); 
    mcp1.begin(addr1);
    mcp2.begin(addr2);

    mcp1.pinMode(0, INPUT); //pin 21 on chip
    mcp2.pinMode(0, INPUT); //pin 21 on chip

  } 

  void loop()
  { 
      if(mcp1.digitalRead(0)== HIGH )
      Serial.println("HIGH"); 
      delay(1000);

      if(mcp2.digitalRead(0)== HIGH )
      Serial.println("HIGH 2"); 
      delay(1000);
  }