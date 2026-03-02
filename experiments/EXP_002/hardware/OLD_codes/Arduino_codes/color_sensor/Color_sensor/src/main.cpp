

#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESPAsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <AsyncElegantOTA.h>
#include <esp8266httpclient.h>
#include <ezOutput.h>

#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_I2CDevice.h>

//IOExtender
#include <Adafruit_MCP23017.h>
Adafruit_MCP23017 mcp1;
Adafruit_MCP23017 mcp2;

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 32 // OLED display height, in pixels

bool debug = false;

String myI2CDevices[10];
int i2CDeviceCount = 0;

String globalIP;

// network terminal
//String ServerIP = "172.16.1.64";
//String ServerIP = "192.168.0.100";
String ServerIP = "192.168.0.101";
String ServerPort = "5001";

IPAddress local_IP(192, 168, 0, 102);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 0, 0);
IPAddress primaryDNS(8, 8, 8, 8);   //optional
IPAddress secondaryDNS(8, 8, 4, 4); //optional

#define S1 0
#define S0 1
#define S3 3
#define S2 2
#define OUT 0

#define S1_2 0
#define S0_2 1
#define S3_2 3
#define S2_2 2
#define OUT_2 2


#define TRANSITOR_LIGHT_COLOR_SENSOR 7

#define TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_1 8
#define TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_2 9

#define DEBUG_LED 8

#define DIP_SWITCH_PIN1 9
#define DIP_SWITCH_PIN2 10
#define DIP_SWITCH_PIN3 11
#define DIP_SWITCH_PIN4 12
#define DIP_SWITCH_PIN5 13

int dip_switch_value_1[5];

uint16_t frequency = 0;

bool i2c_scanner_mode = true;

int ping_interval = 3000;
ezOutput networkTerminalLoop(22);

// Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)
#define OLED_RESET -1 // Reset pin # (or -1 if sharing Arduino reset pin)
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#include <FastLED.h>
#define NUM_LEDS 13
#define DATA_PIN 13
CRGB leds[NUM_LEDS];
int count = 0;

#define NUMFLAKES 10 // Number of snowflakes in the animation example

#define LOGO_HEIGHT 16
#define LOGO_WIDTH 16
static const unsigned char PROGMEM logo_bmp[] =
    {B00000000, B11000000,
     B00000001, B11000000,
     B00000001, B11000000,
     B00000011, B11100000,
     B11110011, B11100000,
     B11111110, B11111000,
     B01111110, B11111111,
     B00110011, B10011111,
     B00011111, B11111100,
     B00001101, B01110000,
     B00011011, B10100000,
     B00111111, B11100000,
     B00111111, B11110000,
     B01111100, B11110000,
     B01110000, B01110000,
     B00000000, B00110000};

const char *ssid = "MEDICALEX";
const char *password = "FRANCEMED2018**";

bool ledState = 0;
const int ledPin = 2;

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

char i2cList[] PROGMEM = "";

#pragma region HTML
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE HTML><html>
<head>
  <title>ESP Web Server</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <style>
  html {
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
  }
  h1 {
    font-size: 1.8rem;
    color: white;
  }
  h2{
    font-size: 1.5rem;
    font-weight: bold;
    color: #143642;
  }
  .topnav {
    overflow: hidden;
    background-color: #143642;
  }
  body {
    margin: 0;
  }
  .content {
    padding: 30px;
    max-width: 600px;
    margin: 0 auto;
  }
  .card {
    background-color: #F8F7F9;;
    box-shadow: 2px 2px 12px 1px rgba(140,140,140,.5);
    padding-top:10px;
    padding-bottom:20px;
  }
  .button {
    padding: 15px 50px;
    font-size: 24px;
    text-align: center;
    outline: none;
    color: #fff;
    background-color: #0f8b8d;
    border: none;
    border-radius: 5px;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: rgba(0,0,0,0);
   }
   /*.button:hover {background-color: #0f8b8d}*/
   .button:active {
     background-color: #0f8b8d;
     box-shadow: 2 2px #CDCDCD;
     transform: translateY(2px);
   }
   .state {
     font-size: 1.5rem;
     color:#8c8c8c;
     font-weight: bold;
   }
  </style>
<title>ESP Web Server</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
</head>
<body>
  <div class="topnav">
    <h1>ESP WebSocket Server</h1>
  </div>
  <div class="content">
    <div class="card">
      <h2>Output - GPIO 2</h2>
      <p class="state">state: <span id="state">%STATE%</span></p>
      <p><button id="button" class="button">Toggle</button></p>
      <p><button id="button" class="button" href="/close_claw" target="_blank">close_claw</button></p>
      <p><button id="button" class="button" href="/open_claw" target="_blank">open_claw</button></p>
      <p><button id="button" class="button" href="/update" target="_blank">update</button></p>
    </div>
  </div>
<script>
  var gateway = `ws://${window.location.hostname}/ws`;
  var websocket;
  window.addEventListener('load', onLoad);
  function initWebSocket() {
    console.log('Trying to open a WebSocket connection...');
    websocket = new WebSocket(gateway);
    websocket.onopen    = onOpen;
    websocket.onclose   = onClose;
    websocket.onmessage = onMessage; // <-- add this line
  }
  function onOpen(event) {
    console.log('Connection opened');
  }
  function onClose(event) {
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
  }
  function onMessage(event) {
    var state;
    if (event.data == "1"){
      state = "ON";
    }
    else{
      state = "OFF";
    }
    document.getElementById('state').innerHTML = state;
  }
  function onLoad(event) {
    initWebSocket();
    initButton();
  }
  function initButton() {
    document.getElementById('button').addEventListener('click', toggle);
  }
  function toggle(){
    websocket.send('toggle');
  }
</script>
</body>
</html>)rawliteral";

#pragma endregion

#pragma region serverThings

void notifyClients()
{
  ws.textAll(String(ledState));
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len)
{
  AwsFrameInfo *info = (AwsFrameInfo *)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
  {
    data[len] = 0;
    if (strcmp((char *)data, "toggle") == 0)
    {
      ledState = !ledState;
      notifyClients();
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len)
{
  switch (type)
  {
  case WS_EVT_CONNECT:
    Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
    break;
  case WS_EVT_DISCONNECT:
    Serial.printf("WebSocket client #%u disconnected\n", client->id());
    break;
  case WS_EVT_DATA:
    handleWebSocketMessage(arg, data, len);
    break;
  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

void initWebSocket()
{
  ws.onEvent(onEvent);
  server.addHandler(&ws);
}

String processor(const String &var)
{
  Serial.println(var);
  if (var == "STATE")
  {
    if (ledState)
    {
      return "ON";
    }
    else
    {
      return "OFF";
    }
  }
  return String();
}
#pragma endregion

#pragma region DisplayFunctions

void Display_variables()
{
  display.clearDisplay();

  display.setTextSize(1);             // Draw 2X-scale text
  display.setTextColor(BLACK, WHITE); // Draw white text
  display.println(ssid);

  display.setTextSize(1);      // Normal 1:1 pixel scale
  display.setTextColor(WHITE); // Draw white text
  display.setCursor(0, 0);     // Start at top-left corner
  display.println("IP ADDRESS:");

  display.setTextSize(1); // Draw 2X-scale text
  display.setTextColor(BLACK, WHITE);
  display.println(globalIP);

  display.display();
}

#pragma endregion

void i2c_Scanning()
{
  if (i2c_scanner_mode)
  {
    Serial.println("____________________________I2C_SCANNING____________________________");
    byte error, address; //variable for error and I2C address
    int nDevices;

    Serial.println("Scanning...");

    nDevices = 0;
    for (address = 1; address < 127; address++)
    {

      Wire.beginTransmission(address);
      error = Wire.endTransmission();

      if (error == 0)
      {
        Serial.print("I2C device found at address 0x");
        if (address < 16)
          Serial.print("0");
        Serial.print(address, HEX);
        Serial.println("  !");
        nDevices++;
      }
      else if (error == 4)
      {
        Serial.print("Unknown error at address 0x");
        if (address < 16)
          Serial.print("0");
        Serial.println(address, HEX);
      }
    }
    if (nDevices == 0)
      Serial.println("No I2C devices found\n");
    else
      Serial.println("done\n");
    Serial.println("::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::");
  }
}

void printNetwork(String toPrint)
{

  String Address = "http://" + ServerIP + ":" + ServerPort;
  String function_declare = "function=print";
  String args = "content=" + toPrint;
  String Address_Pars = Address + "/" + "?" + function_declare + "&" + args;
  //Serial.println(Address_Pars);

  if (WiFi.status() == WL_CONNECTED)
  { //Check WiFi connection status

    HTTPClient http; //Declare an object of class HTTPClient

    http.begin(Address_Pars);  //Specify request destination
    int httpCode = http.GET(); //Send the request

    if (httpCode > 0)
    { //Check the returning code

      String payload = http.getString(); //Get the request response payload
    }

    http.end(); //Close connection
  }
}

void stop_all()
{
  mcp1.digitalWrite(S0, LOW);
  mcp1.digitalWrite(S1, LOW);
  mcp1.digitalWrite(S2, LOW);
  mcp1.digitalWrite(S3, LOW);
}
void read_20()
{ // Setting frequency-scaling to 20%
  mcp1.digitalWrite(S0, HIGH);
  mcp1.digitalWrite(S1, LOW);
}

void stop_all_2()
{
  mcp2.digitalWrite(S0_2, LOW);
  mcp2.digitalWrite(S1_2, LOW);
  mcp2.digitalWrite(S2_2, LOW);
  mcp2.digitalWrite(S3_2, LOW);
}
void read_20_2()
{ // Setting frequency-scaling to 20%
  mcp2.digitalWrite(S0_2, HIGH);
  mcp2.digitalWrite(S1_2, LOW);
}

void switch_color_sensing_light(int color_sensor_index, bool value)
{
  if (color_sensor_index == 1)
  {
    if (value == true)
    {
      mcp1.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, HIGH); //Pin Leds of color sensor
    }
    else
    {
      mcp1.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, LOW); //Pin Leds of color sensor
    }
    
    
  }
  else if (color_sensor_index == 2)
  {
     if (value == true)
    {
      mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, HIGH); //Pin Leds of color sensor
    }
    else
    {
      mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, LOW); //Pin Leds of color sensor
    }
  }
}

void read_dip_switch_1(){
  dip_switch_value_1[0] = mcp2.digitalRead(DIP_SWITCH_PIN1);
  dip_switch_value_1[1] = mcp2.digitalRead(DIP_SWITCH_PIN2);
  dip_switch_value_1[2] = mcp2.digitalRead(DIP_SWITCH_PIN3);
  dip_switch_value_1[3] = mcp2.digitalRead(DIP_SWITCH_PIN4);
  dip_switch_value_1[4] = mcp2.digitalRead(DIP_SWITCH_PIN5);
  

  Serial.println("::::::::::::::::::::::::::::::::DIP_SWITCHES_VALUES::::::::::::::::::::::::::::::::");
  String values = "";
  for (size_t i = 0; i < 5; i++)
  {
    values = values + "dip" + String(i) + " = " + String(dip_switch_value_1[i]) + "  |  ";
  }
  Serial.println(values);
  Serial.println("::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::");

  
}

void initialize()
{

  Wire.begin(); // Wire communication begin

  //networkTerminalLoop.blink(ping_interval, ping_interval); //comment if not necessary

  // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C))
  {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;)
      ; // Don't proceed, loop forever
  }

  // Show initial display buffer contents on the screen --
  // the library initializes this with an Adafruit splash screen.
  display.display();
  delay(100); //

  // Clear the buffer
  display.clearDisplay();

  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  mcp1.begin(3);
  mcp1.pinMode(TRANSITOR_LIGHT_COLOR_SENSOR, OUTPUT);
  mcp1.pinMode(DEBUG_LED, OUTPUT);

  mcp1.pinMode(S0, OUTPUT);
  mcp1.pinMode(S1, OUTPUT);
  mcp1.pinMode(S2, OUTPUT);
  mcp1.pinMode(S3, OUTPUT);

  mcp2.begin(2);
  mcp2.pinMode(TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_2, OUTPUT);
  mcp2.pinMode(TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_1, OUTPUT);
  //mcp2.pinMode(DEBUG_LED, OUTPUT);

  mcp2.pinMode(S0_2, OUTPUT);
  mcp2.pinMode(S1_2, OUTPUT);
  mcp2.pinMode(S2_2, OUTPUT);
  mcp2.pinMode(S3_2, OUTPUT);

  pinMode(OUT_2, INPUT);
  pinMode(OUT, INPUT);

  mcp2.pinMode(DIP_SWITCH_PIN1, INPUT);
  mcp2.pinMode(DIP_SWITCH_PIN2, INPUT);
  mcp2.pinMode(DIP_SWITCH_PIN3, INPUT);
  mcp2.pinMode(DIP_SWITCH_PIN4, INPUT);
  mcp2.pinMode(DIP_SWITCH_PIN5, INPUT);

  mcp2.pullUp(DIP_SWITCH_PIN1, HIGH);  // turn on a 100K pullup internally
  mcp2.pullUp(DIP_SWITCH_PIN2, HIGH);  // turn on a 100K pullup internally
  mcp2.pullUp(DIP_SWITCH_PIN3, HIGH);  // turn on a 100K pullup internally
  mcp2.pullUp(DIP_SWITCH_PIN4, HIGH);  // turn on a 100K pullup internally
  mcp2.pullUp(DIP_SWITCH_PIN5, HIGH);  // turn on a 100K pullup internally
  for (size_t i = 0; i < 5; i++)
  {
    dip_switch_value_1[i] = 0;
  }
  
  read_dip_switch_1();
  







  //if specific IP address on network address
  /*
  //https://randomnerdtutorials.com/esp8266-nodemcu-static-fixed-ip-address-arduino/
  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS, secondaryDNS))
  {
    Serial.println("STA Failed to configure");
  }
  */

  //http client:

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  int count = 0;
  while (WiFi.status() != WL_CONNECTED)
  {
    delay(1000);
    Serial.println("Connecting to WiFi..");
    count = count + 1;

    if (count > 10)
    {
      ESP.restart();
    }
  }

  
  read_20();
  read_20_2();

  // Print ESP Local IP Address
  Serial.println(WiFi.localIP());
  String LocalAddress_STR = String(WiFi.localIP()[0]) + String(".") +
                            String(WiFi.localIP()[1]) + String(".") +
                            String(WiFi.localIP()[2]) + String(".") +
                            String(WiFi.localIP()[3]);
  //DiplayPrintString(LocalAddress_STR);
  globalIP = LocalAddress_STR;

  Display_variables();
  initWebSocket();
  //String to_print = "identity_" + globalIP;
  //printNetwork(to_print);

  //mcp1.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, HIGH); //Pin Leds of color sensor
  //mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, HIGH); //Pin Leds of color sensor
}

void networkTerminal()
{

  String Address = "http://" + ServerIP + ":" + ServerPort;
  String function_declare = "function=ping";
  String Address_Pars = Address + "/" + "?" + function_declare + "?";

  //Serial.println(Address_Pars);
  //ping.loopQuerry(Address);
  networkTerminalLoop.loopQuerry(Address_Pars, false);
}

void serverRoutes()
{
  // Route for root / web page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send_P(200, "text/html", index_html, processor);
  });

  server.on("/test1", HTTP_GET, [](AsyncWebServerRequest *request) {
    Serial.println("Reached /test1");
    request->send_P(200, "text/html", "OK");
  });

  //To test, open web browther to: http://172.16.1.89/args?param1=22&param2=hello_world
  server.on("/args", HTTP_GET, [](AsyncWebServerRequest *request) {
    int paramsNr = request->params();
    Serial.println(paramsNr);
    String param1 = "";
    for (int i = 0; i < paramsNr; i++)
    {

      AsyncWebParameter *p = request->getParam(i);

      Serial.print("Param name: ");
      Serial.println(p->name());

      Serial.print("Param value: ");
      if (i == 0)
      {
        param1 = p->value();
      }
      Serial.println(p->value());

      Serial.println("------");
    }

    request->send_P(200, "text/html", "args");
  });
}

void shutdown()
{

  ESP.deepSleep(0);
}

void setup()
{

  Serial.begin(115200);

  initialize();
  serverRoutes();

  // Start ElegantOTA
  AsyncElegantOTA.begin(&server);
  // Start server
  server.begin();
  Serial.println("begin");
  delay(100);
}

void read_color()
{
  Serial.println("____________________________COLOR_READING___1__________________");
  switch_color_sensing_light(1, true);
  //switch_color_sensing_light(1, false);
  delay(1000);
  read_20();
  delay(100);
  // Setting red filters
  mcp1.digitalWrite(S2, LOW);
  mcp1.digitalWrite(S3, LOW);
  frequency = pulseIn(OUT, LOW);
  Serial.print("RED = ");
  Serial.print(frequency);
  Serial.print("\t");
  delay(200);
  // Setting Green filters
  mcp1.digitalWrite(S2, HIGH);
  mcp1.digitalWrite(S3, HIGH);
  frequency = pulseIn(OUT, LOW);
  Serial.print("GREEN = ");
  Serial.print(frequency);
  Serial.print("\t");
  delay(200);

  // Setting Blue filters
  mcp1.digitalWrite(S2, LOW);
  mcp1.digitalWrite(S3, HIGH);
  frequency = pulseIn(OUT, LOW);
  Serial.print("BLUE = ");
  Serial.println(frequency);
  delay(200);
  stop_all();
  switch_color_sensing_light(1, false);
  delay(4000);
  Serial.println("::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::");
}


void read_color_2()
{
  Serial.println("____________________________COLOR_READING___2__________________");
  switch_color_sensing_light(2, true);
  delay(1000);
  read_20_2();
  delay(100);
  // Setting red filters
  mcp1.digitalWrite(S2_2, LOW);
  mcp1.digitalWrite(S3_2, LOW);
  frequency = pulseIn(OUT_2, LOW);
  Serial.print("RED = ");
  Serial.print(frequency);
  Serial.print("\t");
  delay(200);
  // Setting Green filters
  mcp1.digitalWrite(S2_2, HIGH);
  mcp1.digitalWrite(S3_2, HIGH);
  frequency = pulseIn(OUT_2, LOW);
  Serial.print("GREEN = ");
  Serial.print(frequency);
  Serial.print("\t");
  delay(200);

  // Setting Blue filters
  mcp1.digitalWrite(S2_2, LOW);
  mcp1.digitalWrite(S3_2, HIGH);
  frequency = pulseIn(OUT_2, LOW);
  Serial.print("BLUE = ");
  Serial.println(frequency);
  delay(200);
  stop_all_2();
  switch_color_sensing_light(2, false);
  delay(4000);
  Serial.println("::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::");
}


void loop()
{

  Display_variables();
  AsyncElegantOTA.loop();
  ws.cleanupClients();
  //i2c_Scanning();

  //Serial.println("loopLED..");

  //sanity check blink LED
  //mcp1.digitalWrite(DEBUG_LED, HIGH);
  //mcp2.digitalWrite(DEBUG_LED, HIGH);
  delay(500);
  //mcp1.digitalWrite(DEBUG_LED, LOW);
  //mcp2.digitalWrite(DEBUG_LED, LOW);
  delay(500); // wait 5 seconds for the next I2C scan

  //i2c_Scanning();
  //read_color();
  //read_color_2();
  mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_2, HIGH); //Pin Leds of color sensor
  mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_1, HIGH); //Pin Leds of color sensor
  mcp1.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, HIGH); //Pin Leds of color sensor

  Serial.println("on");
  delay(1500); // wait 5 seconds for the next I2C scan
  mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_2, LOW); //Pin Leds of color sensor
  mcp2.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR_SENSOR_1, LOW); //Pin Leds of color sensor
  mcp1.digitalWrite(TRANSITOR_LIGHT_COLOR_SENSOR, LOW); //Pin Leds of color sensor
  delay(1500); // wait 5 seconds for the next I2C scan
  Serial.println("OFF");

  //read_dip_switch_1();
  //Serial.println(mcp2.digitalRead(DIP_SWITCH_PIN1));

  

}
