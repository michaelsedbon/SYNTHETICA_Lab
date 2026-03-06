/*
 * EXP_005 — ESP8266 Motor Controller
 * ====================================
 * Bridges WiFi to Arduino Nano serial for motor control.
 *
 * Features:
 *   - WiFi + OTA (port 8266)
 *   - Web dashboard on port 80 with motor controls
 *   - REST API for agent/script access
 *   - Serial bridge to Nano (115200 baud)
 *   - TCP bridge on port 2323 (for flash_nano.py)
 *   - Nano reset via D5 (GPIO14)
 *
 * API:
 *   GET /              → web dashboard
 *   GET /api/ping      → PING test
 *   GET /api/status    → full motor status
 *   GET /api/send?cmd= → arbitrary command
 *   GET /api/move?steps=N
 *   GET /api/home
 *   GET /api/stop
 *   GET /api/calibrate
 *   GET /api/half
 *   GET /api/speed?value=N
 *   GET /api/accel?value=N
 *   GET /reset-nano
 */

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <ArduinoOTA.h>
#include <ESP8266WebServer.h>

#define PIN_NANO_RESET 14

const char* ssid     = "MEDICALEX";
const char* password = "94110Med+";
const char* hostname = "cryptobeings";

ESP8266WebServer server(80);
WiFiServer tcpBridge(2323);
WiFiClient tcpClient;

String nanoBuffer = "";

// ── Log ring buffer ──
#define LOG_MAX 40
String logEntries[LOG_MAX];
int logIdx = 0;

void addLog(String msg) {
    logEntries[logIdx % LOG_MAX] = String(millis()/1000) + "s " + msg;
    logIdx++;
}

// ── Send command to Nano and collect response ──
String sendToNano(String cmd, unsigned long timeout = 3000) {
    while (Serial.available()) Serial.read();  // drain
    Serial.println(cmd);
    addLog("TX> " + cmd);

    String response = "";
    String line = "";
    unsigned long start = millis();

    while (millis() - start < timeout) {
        while (Serial.available()) {
            char c = Serial.read();
            if (c == '\n') {
                if (line.length() > 0) {
                    addLog("RX< " + line);
                    if (response.length() > 0) response += "\n";
                    response += line;
                    // Terminal responses
                    if (line == "PONG" || line.startsWith("OK") ||
                        line.startsWith("ERROR") || line.startsWith("HOMED") ||
                        line.startsWith("CAL_DONE") || line.startsWith("CAL_FAIL") ||
                        line.startsWith("CAL_ABORTED") || line.startsWith("CAL:")) {
                        return response;
                    }
                    line = "";
                }
            } else if (c != '\r') {
                line += c;
            }
        }
        yield();
        delay(5);
    }
    if (line.length() > 0) {
        if (response.length() > 0) response += "\n";
        response += line;
    }
    return response.length() > 0 ? response : "TIMEOUT";
}

void cors() { server.sendHeader("Access-Control-Allow-Origin", "*"); }

// ══════════════════════════════════════
// ── API Handlers ──
// ══════════════════════════════════════

void handleApiPing() {
    cors();
    String r = sendToNano("PING");
    server.send(200, "application/json",
        r.indexOf("PONG") >= 0
            ? "{\"ok\":true,\"response\":\"PONG\"}"
            : "{\"ok\":false,\"error\":\"" + r + "\"}");
}

void handleApiStatus() {
    cors();
    String r = sendToNano("STATUS", 5000);
    // Parse multi-line status
    long pos=0; int hall=0,speed=0,moving=0,spr=0,cal=0;
    int idx = 0;
    while (idx < (int)r.length()) {
        int nl = r.indexOf('\n', idx);
        String ln = (nl >= 0) ? r.substring(idx, nl) : r.substring(idx);
        if (ln.startsWith("POS:")) pos = ln.substring(4).toInt();
        else if (ln.startsWith("HALL:")) hall = ln.substring(5).toInt();
        else if (ln.startsWith("SPEED:")) speed = ln.substring(6).toInt();
        else if (ln.startsWith("MOVING:")) moving = ln.substring(7).toInt();
        else if (ln.startsWith("SPR:")) spr = ln.substring(4).toInt();
        else if (ln.startsWith("CAL:")) cal = ln.substring(4).toInt();
        if (nl < 0) break;
        idx = nl + 1;
    }
    String j = "{\"pos\":" + String(pos) + ",\"hall\":" + String(hall) +
               ",\"speed\":" + String(speed) + ",\"moving\":" + String(moving) +
               ",\"spr\":" + String(spr) + ",\"calibrated\":" + String(cal) + "}";
    server.send(200, "application/json", j);
}

void handleApiSend() {
    cors();
    if (!server.hasArg("cmd")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing cmd\"}");
        return;
    }
    String cmd = server.arg("cmd");
    unsigned long t = server.hasArg("timeout") ? server.arg("timeout").toInt() : 5000;
    String r = sendToNano(cmd, t);
    // Escape quotes in response
    r.replace("\"", "'");
    server.send(200, "application/json", "{\"ok\":true,\"cmd\":\"" + cmd + "\",\"response\":\"" + r + "\"}");
}

void handleApiMove() {
    cors();
    if (!server.hasArg("steps")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing steps\"}");
        return;
    }
    String r = sendToNano("MOVE " + server.arg("steps"));
    server.send(200, "application/json",
        r.startsWith("OK") ? "{\"ok\":true,\"steps\":" + server.arg("steps") + "}"
                           : "{\"ok\":false,\"error\":\"" + r + "\"}");
}

void handleApiHome() {
    cors();
    String r = sendToNano("HOME", 60000);
    // HOME returns "OK HOMING" then later "HOMED"
    if (r.indexOf("HOMED") < 0) {
        // Wait longer for the actual HOMED
        String r2 = sendToNano("", 60000);  // just listen
        r += "\n" + r2;
    }
    server.send(200, "application/json",
        r.indexOf("HOMED") >= 0 ? "{\"ok\":true}" : "{\"ok\":false,\"error\":\"homing_incomplete\"}");
}

void handleApiStop() {
    cors();
    sendToNano("STOP");
    server.send(200, "application/json", "{\"ok\":true}");
}

void handleApiCalibrate() {
    cors();
    String r = sendToNano("CALIBRATE", 120000);
    if (r.indexOf("CAL_DONE") >= 0) {
        int idx = r.indexOf("SPR:");
        long spr = (idx >= 0) ? r.substring(idx+4).toInt() : 0;
        server.send(200, "application/json", "{\"ok\":true,\"spr\":" + String(spr) + "}");
    } else {
        server.send(200, "application/json", "{\"ok\":false,\"error\":\"" + r + "\"}");
    }
}

void handleApiHalf() {
    cors();
    String r = sendToNano("HALF", 30000);
    server.send(200, "application/json",
        r.startsWith("OK") ? "{\"ok\":true}" : "{\"ok\":false,\"error\":\"" + r + "\"}");
}

void handleApiSpeed() {
    cors();
    if (!server.hasArg("value")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing value\"}");
        return;
    }
    String r = sendToNano("SPEED " + server.arg("value"));
    server.send(200, "application/json",
        r.startsWith("OK") ? "{\"ok\":true,\"speed\":" + server.arg("value") + "}"
                           : "{\"ok\":false,\"error\":\"" + r + "\"}");
}

void handleApiAccel() {
    cors();
    if (!server.hasArg("value")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing value\"}");
        return;
    }
    String r = sendToNano("ACCEL " + server.arg("value"));
    server.send(200, "application/json",
        r.startsWith("OK") ? "{\"ok\":true,\"accel\":" + server.arg("value") + "}"
                           : "{\"ok\":false,\"error\":\"" + r + "\"}");
}

void handleResetNano() {
    cors();
    digitalWrite(PIN_NANO_RESET, LOW);
    delay(100);
    digitalWrite(PIN_NANO_RESET, HIGH);
    addLog("Nano reset via D5");
    server.send(200, "application/json", "{\"ok\":true,\"msg\":\"Nano reset\"}");
}

void handleApiLog() {
    cors();
    String j = "[";
    int start = max(0, logIdx - LOG_MAX);
    for (int i = logIdx - 1; i >= start; i--) {
        if (i < logIdx - 1) j += ",";
        String entry = logEntries[i % LOG_MAX];
        entry.replace("\"", "'");
        j += "\"" + entry + "\"";
    }
    j += "]";
    server.send(200, "application/json", j);
}

// ══════════════════════════════════════
// ── Web Dashboard ──
// ══════════════════════════════════════

void handleRoot() {
    String h = R"rawhtml(<!DOCTYPE html><html><head>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<title>EXP_005 Motor Control</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Courier New',monospace;background:#0a0a0f;color:#e0e0e0;padding:16px;max-width:600px;margin:0 auto}
h1{color:#00e5ff;font-size:18px;letter-spacing:2px;border-bottom:1px solid #1a3a4a;padding-bottom:8px;margin-bottom:16px}
.card{background:#12121a;border:1px solid #1e2a3a;border-radius:8px;padding:12px;margin-bottom:12px}
.card h2{color:#64b5f6;font-size:13px;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px}
.grid{display:grid;gap:6px}
.g2{grid-template-columns:1fr 1fr}
.g3{grid-template-columns:1fr 1fr 1fr}
.g4{grid-template-columns:1fr 1fr 1fr 1fr}
button{background:#1a2a3a;color:#80cbc4;border:1px solid #2a3a4a;border-radius:4px;
 padding:10px 6px;font-family:inherit;font-size:12px;cursor:pointer;transition:all .15s}
button:hover{background:#2a3a5a;border-color:#4a6a8a}
button:active{transform:scale(.96)}
.btn-stop{background:#3a1a1a;color:#ef5350;border-color:#5a2a2a}
.btn-stop:hover{background:#5a2a2a}
.btn-home{background:#1a2a1a;color:#66bb6a;border-color:#2a4a2a}
.btn-home:hover{background:#2a4a2a}
.btn-cal{background:#2a2a1a;color:#ffc107;border-color:#4a4a2a}
.btn-cal:hover{background:#4a4a2a}
.stat{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1a1a2a;font-size:12px}
.stat .label{color:#888}.stat .val{color:#00e5ff;font-weight:bold}
.hall-on{color:#66bb6a !important}.hall-off{color:#555 !important}
.moving-yes{color:#ffc107 !important}
input[type=text]{background:#0e0e18;color:#e0e0e0;border:1px solid #2a3a4a;border-radius:4px;
 padding:8px;font-family:inherit;font-size:12px;width:100%}
input[type=range]{width:100%;accent-color:#00e5ff}
.range-row{display:flex;align-items:center;gap:8px;margin:6px 0}
.range-row span{color:#00e5ff;font-size:12px;min-width:50px;text-align:right}
#log{background:#08080e;border:1px solid #1a1a2a;border-radius:4px;padding:8px;
 font-size:11px;max-height:200px;overflow-y:auto;line-height:1.5;color:#666}
.tx{color:#ffc107}.rx{color:#66bb6a}
.indicator{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.led-on{background:#66bb6a;box-shadow:0 0 6px #66bb6a}.led-off{background:#333}
.conn{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px}
.conn-ok{background:#0a1f0a;border:1px solid #1a4a1a;color:#66bb6a}
.conn-fail{background:#1f0a0a;border:1px solid #4a1a1a;color:#ef5350}
.conn .dot{width:10px;height:10px;border-radius:50%;margin-right:8px;display:inline-block}
.conn-ok .dot{background:#66bb6a;box-shadow:0 0 8px #66bb6a}
.conn-fail .dot{background:#ef5350;box-shadow:0 0 8px #ef5350}
.conn .info{color:#666;font-size:11px}
</style></head><body>
<h1>&#9881; EXP_005 MOTOR CONTROL</h1>

<div id='connBanner' class='conn conn-fail'>
<div><span class='dot'></span><strong id='connText'>CHECKING...</strong></div>
<span class='info' id='connInfo'></span>
</div>

<div class='card'><h2>Status</h2>
<div class='stat'><span class='label'>Position</span><span class='val' id='pos'>—</span></div>
<div class='stat'><span class='label'>Hall Sensor</span><span class='val' id='hall'><span class='indicator led-off' id='hallLed'></span>—</span></div>
<div class='stat'><span class='label'>Speed</span><span class='val' id='spd'>—</span></div>
<div class='stat'><span class='label'>Moving</span><span class='val' id='mov'>—</span></div>
<div class='stat'><span class='label'>SPR</span><span class='val' id='spr'>—</span></div>
<div class='stat'><span class='label'>Calibrated</span><span class='val' id='cal'>—</span></div>
</div>

<div class='card'><h2>Movement</h2>
<div class='grid g4'>
<button onclick="api('/api/move?steps=-1000')">-1000</button>
<button onclick="api('/api/move?steps=-100')">-100</button>
<button onclick="api('/api/move?steps=100')">+100</button>
<button onclick="api('/api/move?steps=1000')">+1000</button>
</div>
<div class='grid g3' style='margin-top:6px'>
<button class='btn-home' onclick="api('/api/home')">HOME</button>
<button onclick="api('/api/half')">HALF</button>
<button class='btn-stop' onclick="api('/api/stop')">&#9724; STOP</button>
</div>
<div class='grid g2' style='margin-top:6px'>
<button class='btn-cal' onclick="if(confirm('Start calibration?'))api('/api/calibrate')">CALIBRATE</button>
<button onclick="api('/api/send?cmd=ZERO')">ZERO</button>
</div>
</div>

<div class='card'><h2>Speed / Acceleration</h2>
<div class='range-row'>
<span id='spdVal'>2000</span>
<input type='range' id='spdRange' min='100' max='8000' value='2000' step='100'
 oninput="document.getElementById('spdVal').textContent=this.value">
<button onclick="api('/api/speed?value='+document.getElementById('spdRange').value)" style='min-width:50px'>Set</button>
</div>
<div class='range-row'>
<span id='accVal'>1000</span>
<input type='range' id='accRange' min='100' max='10000' value='1000' step='100'
 oninput="document.getElementById('accVal').textContent=this.value">
<button onclick="api('/api/accel?value='+document.getElementById('accRange').value)" style='min-width:50px'>Set</button>
</div>
</div>

<div class='card'><h2>Manual Command</h2>
<div style='display:flex;gap:6px'>
<input type='text' id='cmd' placeholder='e.g. MOVE 500, STATUS, PING'>
<button onclick="api('/api/send?cmd='+encodeURIComponent(document.getElementById('cmd').value))" style='min-width:50px'>Send</button>
</div>
</div>

<div class='card'><h2>Log</h2><div id='log'></div></div>

<script>
function api(url){
 fetch(url).then(r=>r.json()).then(d=>{
  appendLog(JSON.stringify(d));
  if(url.indexOf('/api/send')<0)pollStatus();
 }).catch(e=>appendLog('ERR: '+e));
}
function appendLog(msg){
 var l=document.getElementById('log');
 var cls=msg.indexOf('TX>')>=0?'tx':msg.indexOf('RX<')>=0?'rx':'';
 l.innerHTML='<div'+(cls?' class="'+cls+'"':'')+'>'+msg+'</div>'+l.innerHTML;
 if(l.children.length>80)l.removeChild(l.lastChild);
}
var connected=false;
function setConn(ok,info){
 var b=document.getElementById('connBanner');
 b.className='conn '+(ok?'conn-ok':'conn-fail');
 document.getElementById('connText').textContent=ok?'NANO CONNECTED':'NANO DISCONNECTED';
 document.getElementById('connInfo').textContent=info||'';
 connected=ok;
}
function pollStatus(){
 fetch('/api/status',{signal:AbortSignal.timeout(4000)}).then(r=>r.json()).then(d=>{
  setConn(true,'pos:'+d.pos+' | speed:'+d.speed+' sps');
  document.getElementById('pos').textContent=d.pos;
  var hEl=document.getElementById('hall');
  hEl.innerHTML=(d.hall?'<span class="indicator led-on"></span>TRIGGERED':'<span class="indicator led-off"></span>CLEAR');
  document.getElementById('spd').textContent=d.speed+' sps';
  var mEl=document.getElementById('mov');
  mEl.textContent=d.moving?'YES':'NO';
  mEl.className='val'+(d.moving?' moving-yes':'');
  document.getElementById('spr').textContent=d.spr||'\u2014';
  document.getElementById('cal').textContent=d.calibrated?'YES':'NO';
 }).catch(()=>{ setConn(false,'No response from Nano'); });
}
pollStatus();
setInterval(pollStatus,3000);
</script>
</body></html>)rawhtml";
    server.send(200, "text/html", h);
}


// ══════════════════════════════════════
// ── Setup ──
// ══════════════════════════════════════

void setup() {
    Serial.begin(115200);
    pinMode(PIN_NANO_RESET, OUTPUT);
    digitalWrite(PIN_NANO_RESET, HIGH);

    WiFi.mode(WIFI_STA);
    WiFi.hostname(hostname);
    WiFi.begin(ssid, password);
    int att = 0;
    while (WiFi.status() != WL_CONNECTED && att < 30) { delay(500); att++; }

    MDNS.begin(hostname);
    ArduinoOTA.setHostname(hostname);
    ArduinoOTA.setPort(8266);
    ArduinoOTA.begin();

    // Routes
    server.on("/", handleRoot);
    server.on("/api/ping", handleApiPing);
    server.on("/api/status", handleApiStatus);
    server.on("/api/send", handleApiSend);
    server.on("/api/move", handleApiMove);
    server.on("/api/home", handleApiHome);
    server.on("/api/stop", handleApiStop);
    server.on("/api/calibrate", handleApiCalibrate);
    server.on("/api/half", handleApiHalf);
    server.on("/api/speed", handleApiSpeed);
    server.on("/api/accel", handleApiAccel);
    server.on("/api/log", handleApiLog);
    server.on("/reset-nano", handleResetNano);
    server.begin();

    tcpBridge.begin();
    addLog("System ready — " + WiFi.localIP().toString());
}


// ══════════════════════════════════════
// ── Loop ──
// ══════════════════════════════════════

void loop() {
    ArduinoOTA.handle();
    server.handleClient();
    MDNS.update();

    // TCP bridge for Nano flashing
    if (tcpBridge.hasClient()) {
        if (tcpClient && tcpClient.connected()) tcpClient.stop();
        tcpClient = tcpBridge.accept();
        addLog("TCP client connected");
    }

    if (tcpClient && tcpClient.connected()) {
        while (tcpClient.available()) Serial.write(tcpClient.read());
        while (Serial.available()) tcpClient.write(Serial.read());
    }
}
