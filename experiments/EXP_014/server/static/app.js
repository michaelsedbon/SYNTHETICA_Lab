/**
 * EXP_014 — Machine Controller Dashboard
 * Real-time motor control for USB serial (DM556) and ESP HTTP (ISD04) devices.
 */

const API = window.location.origin;
let ws = null;
let motors = {};
let relays = {};
let sensorState = {};  // track previous sensor values per motor

// Beep when sensor triggers (0 → 1)
function sensorBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.3;
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
}

// ── WebSocket ──────────────────────────────────────────────────────────────

function connectWebSocket() {
    const wsUrl = `ws://${window.location.host}/ws`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        document.getElementById('wsIndicator').classList.add('connected');
        document.getElementById('wsLabel').textContent = 'Connected';
        log('WebSocket connected', 'info');
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'status') {
            updateMotorStatus(msg.motor);
        } else if (msg.type === 'relay_status') {
            updateRelayStatus(msg.relay);
        } else if (msg.type === 'command') {
            log(`${msg.motor} ← ${msg.cmd}`, 'cmd');
            log(`${msg.motor} → ${msg.resp}`, 'resp');
        } else if (msg.type === 'reconnect') {
            log(`${msg.device} reconnected`, 'info');
            loadDevices();
        }
    };

    ws.onclose = () => {
        document.getElementById('wsIndicator').classList.remove('connected');
        document.getElementById('wsLabel').textContent = 'Disconnected';
        log('WebSocket disconnected, reconnecting...', 'err');
        setTimeout(connectWebSocket, 2000);
    };

    ws.onerror = () => { ws.close(); };
}

// ── API Helpers ────────────────────────────────────────────────────────────

async function api(method, path, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    const url = new URL(path, API);
    if (body && (method === 'POST' || method === 'PUT')) {
        for (const [k, v] of Object.entries(body)) {
            url.searchParams.set(k, v);
        }
    }
    try {
        const res = await fetch(url, opts);
        return await res.json();
    } catch (e) {
        log(`API error: ${e.message}`, 'err');
        return null;
    }
}

// ── Motor Card Rendering ───────────────────────────────────────────────────

function createMotorCard(motor) {
    const tpl = document.getElementById('motorCardTemplate');
    const card = tpl.content.cloneNode(true).querySelector('.motor-card');
    const isESP = motor.type === 'esp_http';

    card.dataset.motorId = motor.id;
    card.dataset.deviceType = motor.type || 'usb_serial';

    // Header
    card.querySelector('.motor-name').textContent = motor.id;
    card.querySelector('.connection-dot').classList.toggle('connected', motor.connected);

    // Footer: show port or host + experiment ref
    const portLabel = card.querySelector('.port-label');
    const loc = isESP ? motor.host : motor.port;
    const expRef = motor.experiment ? ` · ${motor.experiment}` : '';
    portLabel.textContent = `${loc}${expRef}`;

    // Description badge
    if (motor.description) {
        const desc = card.querySelector('.card-description');
        if (desc) desc.textContent = motor.description;
    }

    // Card accent for ESP devices
    if (isESP) {
        card.classList.add('esp-device');
    }

    // Move buttons
    card.querySelectorAll('.btn-move').forEach(btn => {
        btn.addEventListener('click', () => {
            sendMove(motor.id, parseInt(btn.dataset.steps));
        });
    });

    // Custom move
    card.querySelector('.btn-go').addEventListener('click', () => {
        const steps = parseInt(card.querySelector('.input-steps').value);
        if (!isNaN(steps)) sendMove(motor.id, steps);
    });

    card.querySelector('.input-steps').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const steps = parseInt(card.querySelector('.input-steps').value);
            if (!isNaN(steps)) sendMove(motor.id, steps);
        }
    });

    // Speed slider
    const speedSlider = card.querySelector('.speed-slider');
    const speedVal = card.querySelector('.speed-val');
    speedSlider.addEventListener('input', () => { speedVal.textContent = speedSlider.value; });
    speedSlider.addEventListener('change', () => {
        api('PUT', `/api/motors/${motor.id}/config`, { speed: parseInt(speedSlider.value) });
        log(`${motor.id} speed → ${speedSlider.value}`, 'cmd');
    });

    // Accel slider
    const accelSlider = card.querySelector('.accel-slider');
    const accelVal = card.querySelector('.accel-val');
    accelSlider.addEventListener('input', () => { accelVal.textContent = accelSlider.value; });
    accelSlider.addEventListener('change', () => {
        api('PUT', `/api/motors/${motor.id}/config`, { accel: parseInt(accelSlider.value) });
        log(`${motor.id} accel → ${accelSlider.value}`, 'cmd');
    });

    // Action buttons
    card.querySelector('.btn-home').addEventListener('click', () => {
        api('POST', `/api/motors/${motor.id}/home`);
        log(`${motor.id} ← HOME`, 'cmd');
    });

    card.querySelector('.btn-zero').addEventListener('click', () => {
        api('POST', `/api/motors/${motor.id}/zero`);
        log(`${motor.id} ← ZERO`, 'cmd');
    });

    card.querySelector('.btn-stop').addEventListener('click', () => {
        api('POST', `/api/motors/${motor.id}/stop`);
        log(`${motor.id} ← STOP`, 'cmd');
    });

    // ESP-specific: Calibrate and Half buttons
    const espActions = card.querySelector('.esp-actions');
    if (isESP && espActions) {
        espActions.style.display = 'flex';
        card.querySelector('.btn-calibrate')?.addEventListener('click', () => {
            api('POST', `/api/motors/${motor.id}/calibrate`);
            log(`${motor.id} ← CALIBRATE`, 'cmd');
        });
        card.querySelector('.btn-half')?.addEventListener('click', () => {
            api('POST', `/api/motors/${motor.id}/half`);
            log(`${motor.id} ← HALF`, 'cmd');
        });
    }

    // Level Controls (all motors)
    const levelControls = card.querySelector('.level-controls');
    if (levelControls) {
        levelControls.style.display = 'block';
        const maxInput = card.querySelector('.input-max-steps');
        const btnSetMax = card.querySelector('.btn-set-max');
        const levelSlider = card.querySelector('.level-slider');
        const levelVal = card.querySelector('.level-val');
        const btnLevelGo = card.querySelector('.btn-level-go');

        // Pre-fill if max_steps already set
        if (motor.max_steps) {
            maxInput.value = motor.max_steps;
            levelSlider.disabled = false;
            btnLevelGo.disabled = false;
        }

        btnSetMax.addEventListener('click', async () => {
            const val = parseInt(maxInput.value);
            if (!val || val === 0) return;
            await api('PUT', `/api/motors/${motor.id}/max_steps`, { value: val });
            motors[motor.id].max_steps = val;
            levelSlider.disabled = false;
            btnLevelGo.disabled = false;
            log(`${motor.id} max_steps = ${val}`, 'cmd');
        });

        levelSlider.addEventListener('input', () => {
            levelVal.textContent = levelSlider.value + '%';
        });

        btnLevelGo.addEventListener('click', async () => {
            const pct = parseInt(levelSlider.value);
            log(`${motor.id} ← LEVEL ${pct}%`, 'cmd');
            const res = await api('POST', `/api/motors/${motor.id}/level`, { percent: pct });
            if (res) log(`${motor.id} → target ${res.target_steps} steps`, 'resp');
        });
    }

    return card;
}

async function sendMove(motorId, steps) {
    log(`${motorId} ← MOVE ${steps}`, 'cmd');
    const res = await api('POST', `/api/motors/${motorId}/move`, { steps });
    if (res) log(`${motorId} → ${res.response}`, 'resp');
}

function updateMotorStatus(status) {
    const card = document.querySelector(`.motor-card[data-motor-id="${status.id}"]`);
    if (!card) return;

    const pos = card.querySelector('.motor-pos');
    const target = card.querySelector('.motor-target');
    const speed = card.querySelector('.motor-speed');
    const moving = card.querySelector('.motor-moving');
    const sensor = card.querySelector('.sensor-indicator');

    if (status.pos !== undefined) pos.textContent = status.pos;
    if (status.target !== undefined) target.textContent = status.target;
    if (status.speed !== undefined) speed.textContent = status.speed;

    // Show level % if max_steps is set
    const motorData = motors[status.id];
    if (motorData && motorData.max_steps && status.pos !== undefined) {
        const pct = Math.round((status.pos / motorData.max_steps) * 100);
        const clamped = Math.max(0, Math.min(100, pct));
        pos.textContent = `${status.pos} (${clamped}%)`;
    }
    if (status.moving !== undefined) {
        const isMoving = status.moving === 1 || status.moving === true;
        moving.textContent = isMoving ? '●' : '—';
        moving.style.color = isMoving ? 'var(--green)' : '';
        card.classList.toggle('moving', isMoving);
    }

    // Sensor: handle both "sensor" (DM556) and "hall" (ESP/ISD04)
    const sensorVal = status.sensor !== undefined ? status.sensor : status.hall;
    if (sensorVal !== undefined) {
        const triggered = sensorVal === 1 || sensorVal === true;
        sensor.classList.toggle('active', triggered);
        sensor.title = triggered ? 'Sensor: TRIGGERED' : 'Sensor: clear';
        // Beep on 0 → 1 transition
        const prev = sensorState[status.id];
        if (triggered && prev === false) {
            sensorBeep();
            log(`${status.id} sensor TRIGGERED`, 'info');
        }
        sensorState[status.id] = triggered;
    }

    // Calibrated indicator for ESP
    if (status.calibrated !== undefined) {
        const calBadge = card.querySelector('.calibrated-badge');
        if (calBadge) {
            calBadge.style.display = status.calibrated ? 'inline' : 'none';
        }
    }
}

// ── Device Loading ─────────────────────────────────────────────────────────

async function loadDevices() {
    const res = await api('GET', '/api/devices');
    if (!res) return;

    const motorGrid = document.getElementById('motorsGrid');
    const cameraGrid = document.getElementById('camerasGrid');
    const emptyMotor = document.getElementById('emptyState');
    const emptyCam = document.getElementById('emptyStateCam');

    motorGrid.innerHTML = '';
    cameraGrid.innerHTML = '';

    let motorCount = 0;
    let cameraCount = 0;

    for (const dev of res.motors) {
        motors[dev.id] = dev;

        if (dev.type === 'esp_camera') {
            const card = createCameraCard(dev);
            cameraGrid.appendChild(card);
            cameraCount++;
        } else {
            const card = createMotorCard(dev);
            motorGrid.appendChild(card);
            motorCount++;
        }
    }

    // Relays
    const relayGrid = document.getElementById('relaysGrid');
    const emptyRelay = document.getElementById('emptyStateRelay');
    relayGrid.innerHTML = '';
    let relayCount = 0;
    for (const r of (res.relays || [])) {
        relays[r.id] = r;
        const card = createRelayCard(r);
        relayGrid.appendChild(card);
        relayCount++;
    }

    emptyMotor.style.display = motorCount === 0 ? 'flex' : 'none';
    emptyCam.style.display = cameraCount === 0 ? 'flex' : 'none';
    if (emptyRelay) emptyRelay.style.display = relayCount === 0 ? 'flex' : 'none';

    lucide.createIcons();

    // Pull initial relay states (so toggles reflect reality even before first WS broadcast)
    for (const rid of Object.keys(relays)) {
        if (relays[rid].connected) {
            api('GET', `/api/relays/${rid}/status`).then(s => s && updateRelayStatus(s));
        }
    }

    log(`Found ${motorCount} motor(s), ${cameraCount} camera(s), ${relayCount} relay device(s)`, 'info');
}

// ── Relay Card ─────────────────────────────────────────────────────────────

function createRelayCard(relay) {
    const tpl = document.getElementById('relayCardTemplate');
    const card = tpl.content.cloneNode(true).querySelector('.relay-card');
    card.dataset.relayId = relay.id;
    card.querySelector('.relay-name').textContent = relay.id;
    card.querySelector('.connection-dot').classList.toggle('connected', relay.connected);

    const portLabel = card.querySelector('.port-label');
    const expRef = relay.experiment ? ` · ${relay.experiment}` : '';
    portLabel.textContent = `${relay.port}${expRef}`;

    if (relay.description) {
        const desc = card.querySelector('.card-description');
        if (desc) desc.textContent = relay.description;
    }

    const channelsEl = card.querySelector('.relay-channels');
    const numCh = relay.num_channels || 5;
    const chTpl = document.getElementById('relayChannelTemplate');
    const channelMeta = relay.channels || [];

    for (let i = 1; i <= numCh; i++) {
        const ch = chTpl.content.cloneNode(true).querySelector('.relay-channel');
        ch.dataset.channel = String(i);
        ch.querySelector('.relay-channel-id').textContent = `R${i}`;
        const meta = channelMeta.find(c => c.id === `R${i}`) || {};
        const cConn = ch.querySelector('.relay-c-connector');
        const fnEl = ch.querySelector('.relay-channel-function');
        // Tag line: prefer C-connector (front-panel mapping) if known, else fall back to MCU pin
        cConn.textContent = meta.c_connector || meta.pin || '';
        fnEl.textContent = meta.function || '';
        const input = ch.querySelector('.relay-toggle-input');
        input.disabled = !relay.connected;
        input.addEventListener('change', async () => {
            const action = input.checked ? 'on' : 'off';
            log(`${relay.id} R${i} ← ${action.toUpperCase()}`, 'cmd');
            const res = await api('POST', `/api/relays/${relay.id}/${i}/${action}`);
            if (res && res.response) log(`${relay.id} → ${res.response}`, 'resp');
        });
        channelsEl.appendChild(ch);
    }

    card.querySelector('.btn-all-on').addEventListener('click', async () => {
        log(`${relay.id} ← ALL ON`, 'cmd');
        const res = await api('POST', `/api/relays/${relay.id}/all/on`);
        if (res && res.response) log(`${relay.id} → ${res.response}`, 'resp');
    });
    card.querySelector('.btn-all-off').addEventListener('click', async () => {
        log(`${relay.id} ← ALL OFF`, 'cmd');
        const res = await api('POST', `/api/relays/${relay.id}/all/off`);
        if (res && res.response) log(`${relay.id} → ${res.response}`, 'resp');
    });

    return card;
}

function updateRelayStatus(state) {
    const card = document.querySelector(`.relay-card[data-relay-id="${state.id}"]`);
    if (!card) return;
    for (const [k, v] of Object.entries(state)) {
        const m = /^r(\d+)$/i.exec(k);
        if (!m) continue;
        const idx = parseInt(m[1], 10);
        const row = card.querySelector(`.relay-channel[data-channel="${idx}"] .relay-toggle-input`);
        if (!row) continue;
        const newChecked = !!parseInt(v, 10);
        if (row.checked !== newChecked) row.checked = newChecked;
    }
}

// ── Camera Card ────────────────────────────────────────────────────────────

function createCameraCard(cam) {
    const tpl = document.getElementById('cameraCardTemplate');
    const card = tpl.content.cloneNode(true).querySelector('.camera-card');
    card.dataset.cameraId = cam.id;
    card.querySelector('.camera-name').textContent = cam.id;
    card.querySelector('.connection-dot').classList.toggle('connected', cam.connected);

    const portLabel = card.querySelector('.port-label');
    const expRef = cam.experiment ? ` · ${cam.experiment}` : '';
    portLabel.textContent = `${cam.host}${expRef}`;

    if (cam.description) {
        const desc = card.querySelector('.card-description');
        if (desc) desc.textContent = cam.description;
    }

    const streamImg = card.querySelector('.camera-stream');
    const streamUrl = `http://${cam.host}:81/stream`;
    const captureUrl = `http://${cam.host}/capture`;

    // Stream button
    card.querySelector('.btn-stream').addEventListener('click', () => {
        streamImg.src = streamUrl + '?' + Date.now();
        streamImg.classList.add('live');
        log(`${cam.id} stream started`, 'info');
    });

    // Capture button
    card.querySelector('.btn-capture').addEventListener('click', () => {
        streamImg.src = captureUrl + '?' + Date.now();
        streamImg.classList.add('live');
        log(`${cam.id} snapshot captured`, 'cmd');
    });

    // Stop button
    card.querySelector('.btn-cam-stop').addEventListener('click', () => {
        streamImg.src = '';
        streamImg.classList.remove('live');
        log(`${cam.id} stream stopped`, 'info');
    });

    // Auto-start stream if connected
    if (cam.connected) {
        setTimeout(() => {
            streamImg.src = streamUrl + '?' + Date.now();
            streamImg.classList.add('live');
        }, 500);
    }

    return card;
}

// ── Tab Switching ──────────────────────────────────────────────────────────

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
}

// ── Logging ────────────────────────────────────────────────────────────────

function log(message, type = '') {
    const container = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const now = new Date().toLocaleTimeString('en-GB', { hour12: false });
    entry.innerHTML = `<span class="log-time">${now}</span><span class="log-msg ${type}">${message}</span>`;
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
    while (container.children.length > 200) {
        container.removeChild(container.firstChild);
    }
}

// ── Init ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    loadDevices();
    connectWebSocket();

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.getElementById('btnScan').addEventListener('click', async () => {
        log('Rescanning devices...', 'info');
        await api('POST', '/api/system/scan');
        await loadDevices();
    });

    document.getElementById('btnStopAll').addEventListener('click', async () => {
        log('EMERGENCY STOP ALL', 'err');
        await api('POST', '/api/stop-all');
    });

    document.getElementById('btnClearLog').addEventListener('click', () => {
        document.getElementById('logContent').innerHTML = '';
    });
});

