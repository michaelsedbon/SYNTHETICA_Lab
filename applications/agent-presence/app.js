/**
 * app.js — Agent Presence Dashboard
 * Connects to the lab-agent WebSocket, drives the face animation,
 * populates the terminal feed and timeline.
 */

(function () {
    'use strict';

    // ── Config ──
    const AGENT_HOST = window.location.hostname || 'localhost';
    const AGENT_PORT = 8003;
    const WS_URL = `ws://${AGENT_HOST}:${AGENT_PORT}/ws/agent`;
    const API_BASE = `http://${AGENT_HOST}:${AGENT_PORT}`;
    const IDLE_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
    const MAX_TERMINAL_LINES = 150;
    const MAX_TIMELINE_CARDS = 25;
    const STATUS_POLL_INTERVAL = 10000;  // 10s
    const SCREEN_CONTROL_URL = `http://localhost:3005`;

    // ── DOM refs ──
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const clockEl = document.getElementById('clock');
    const termBody = document.getElementById('terminal-body');
    const tlBody = document.getElementById('timeline-body');
    const eventCountEl = document.getElementById('event-count');
    const facePanelEl = document.getElementById('face-panel');

    // ── State ──
    let ws = null;
    let reconnectDelay = 1000;
    let eventCount = 0;
    let lastEventTime = Date.now();
    let isIdle = false;
    let face = null;
    let screenOn = false;

    // ── Event type icons ──
    const EVENT_ICONS = {
        reasoning: '🧠',
        tool_call: '🔧',
        decision: '💡',
        error: '⚠️',
        info: 'ℹ️',
        plan: '📋',
        reflect: '🔄',
        observation: '👁',
    };

    // ── Initialize ──
    function init() {
        // Create face renderer
        face = new FaceRenderer('face-canvas-0');
        face.start();

        // Start clock
        updateClock();
        setInterval(updateClock, 1000);

        // Start idle checker
        setInterval(checkIdle, 5000);

        // Connect WebSocket
        connectWS();

        // Poll agent status for multi-agent detection
        setInterval(pollAgentStatus, STATUS_POLL_INTERVAL);

        // Load recent timeline on start
        loadRecentTimeline();
    }

    // ── Clock ──
    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    // ── WebSocket ──
    function connectWS() {
        setConnectionStatus('connecting');

        try {
            ws = new WebSocket(WS_URL);
        } catch (e) {
            setConnectionStatus('disconnected');
            scheduleReconnect();
            return;
        }

        ws.onopen = () => {
            setConnectionStatus('connected');
            reconnectDelay = 1000;
        };

        ws.onmessage = (e) => {
            try {
                const event = JSON.parse(e.data);
                handleEvent(event);
            } catch (err) {
                console.error('Parse error:', err);
            }
        };

        ws.onclose = () => {
            setConnectionStatus('disconnected');
            scheduleReconnect();
        };

        ws.onerror = () => {
            setConnectionStatus('disconnected');
        };
    }

    function scheduleReconnect() {
        setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
            connectWS();
        }, reconnectDelay);
    }

    function setConnectionStatus(status) {
        statusDot.className = status;
        const labels = {
            connected: 'Connected to Agent',
            connecting: 'Connecting…',
            disconnected: 'Disconnected — retrying…',
        };
        statusText.textContent = labels[status] || status;
    }

    // ── Event handling ──
    function handleEvent(event) {
        lastEventTime = Date.now();
        eventCount++;
        eventCountEl.textContent = `${eventCount} events`;

        // Wake up from idle
        if (isIdle) {
            isIdle = false;
            document.body.classList.remove('idle');
            turnScreenOn();
        }

        // Detect LLM from event content
        const eventType = event.event_type || 'info';
        detectLLM(event);

        // Activate face
        face.setActive(true);
        face.setSleeping(false);

        // Add to terminal
        addTerminalLine(event);

        // Add to timeline
        addTimelineCard(event);

        // Auto-deactivate face after 3s of no events
        clearTimeout(window._faceDeactivateTimer);
        window._faceDeactivateTimer = setTimeout(() => {
            face.setActive(false);
            face.setLLM('idle');
            updateBadge('idle');
        }, 3000);
    }

    function detectLLM(event) {
        const title = (event.title || '').toLowerCase();
        const content = (event.content || '').toLowerCase();
        const eventType = event.event_type || '';

        // Plan and reflect events come from Gemini
        if (eventType === 'plan' || eventType === 'reflect' ||
            title.includes('planning') || title.includes('reflecting') ||
            title.includes('gemini')) {
            face.setLLM('gemini');
            updateBadge('gemini');
        }
        // Tool calls and reasoning come from Ollama
        else if (eventType === 'tool_call' || eventType === 'reasoning' ||
            title.includes('ollama') || title.includes('executing') ||
            title.includes('qwen')) {
            face.setLLM('ollama');
            updateBadge('ollama');
        }
        // Decision could be either, keep current
        else if (eventType === 'decision') {
            // Keep current LLM
        }
    }

    function updateBadge(llm) {
        const badge = document.getElementById('llm-badge-0');
        const label = badge.querySelector('.badge-label');
        badge.className = 'llm-badge ' + llm;

        const labels = {
            gemini: 'Gemini',
            ollama: 'Qwen 2.5',
            idle: 'Idle',
        };
        label.textContent = labels[llm] || llm;
    }

    // ── Terminal Feed ──
    function addTerminalLine(event) {
        const line = document.createElement('div');
        line.className = 'term-line';

        const eventType = event.event_type || 'info';
        const time = formatTime(event.timestamp);
        const title = event.title || '';
        let content = '';

        if (eventType === 'tool_call' && event.tool_name) {
            content = `<span class="term-tool-name">${escHtml(event.tool_name)}</span>`;
            if (event.duration_ms) content += ` <span style="color:var(--text-muted)">(${event.duration_ms}ms)</span>`;
        } else {
            content = escHtml(truncate(title || event.content || '', 200));
        }

        line.innerHTML = `
      <span class="term-time">${time}</span>
      <span class="term-type ${eventType}">${eventType}</span>
      <span class="term-content ${eventType}">${content}</span>
    `;

        termBody.appendChild(line);

        // Prune excess
        while (termBody.children.length > MAX_TERMINAL_LINES) {
            termBody.removeChild(termBody.firstChild);
        }

        // Auto-scroll
        termBody.scrollTop = termBody.scrollHeight;
    }

    // ── Timeline Cards ──
    function addTimelineCard(event) {
        const card = document.createElement('div');
        card.className = 'tl-card';

        const eventType = event.event_type || 'info';
        const icon = EVENT_ICONS[eventType] || '•';
        const title = event.title || event.event_type || 'Event';
        const time = formatTime(event.timestamp);

        card.innerHTML = `
      <span class="tl-icon">${icon}</span>
      <span class="tl-title">${escHtml(truncate(title, 80))}</span>
      <span class="tl-time">${time}</span>
    `;

        // Prepend (newest first)
        tlBody.insertBefore(card, tlBody.firstChild);

        // Prune
        while (tlBody.children.length > MAX_TIMELINE_CARDS) {
            tlBody.removeChild(tlBody.lastChild);
        }
    }

    // ── Idle Detection ──
    function checkIdle() {
        const elapsed = Date.now() - lastEventTime;
        if (elapsed > IDLE_TIMEOUT_MS && !isIdle) {
            isIdle = true;
            document.body.classList.add('idle');
            face.setSleeping(true);
            face.setLLM('idle');
            updateBadge('idle');
            turnScreenOff();
        }
    }

    // ── Screen Control ──
    function turnScreenOn() {
        if (screenOn) return;
        screenOn = true;
        fetch(`${SCREEN_CONTROL_URL}/screen/on`, { method: 'POST' }).catch(() => { });
    }

    function turnScreenOff() {
        screenOn = false;
        fetch(`${SCREEN_CONTROL_URL}/screen/off`, { method: 'POST' }).catch(() => { });
    }

    // ── Agent Status Polling (multi-agent) ──
    async function pollAgentStatus() {
        try {
            const res = await fetch(`${API_BASE}/api/agent/status`);
            if (!res.ok) return;
            const data = await res.json();

            const agents = data.agents || {};
            const agentIds = Object.keys(agents);

            // Update agent label
            if (agentIds.length > 0) {
                const label = document.getElementById('agent-label-0');
                label.textContent = agentIds[0] || 'Agent';
            }

            // Multi-agent: add more face canvases if needed
            if (agentIds.length > 1) {
                facePanelEl.classList.add('multi');
                // For now, we show info about multiple agents in the status
                // Full multi-face rendering would require dynamic canvas creation
            } else {
                facePanelEl.classList.remove('multi');
            }
        } catch {
            // Silently fail — agent might be down
        }
    }

    // ── Load Recent Timeline ──
    async function loadRecentTimeline() {
        try {
            const sessionsRes = await fetch(`${API_BASE}/api/agent/sessions`);
            if (!sessionsRes.ok) return;
            const sessions = await sessionsRes.json();

            if (sessions.length === 0) return;

            // Get most recent session
            const latest = sessions[sessions.length - 1];
            const tlRes = await fetch(`${API_BASE}/api/agent/timeline/${latest.session_id}?limit=30`);
            if (!tlRes.ok) return;
            const events = await tlRes.json();

            // Populate timeline and terminal with recent events (no animation)
            events.forEach(event => {
                addTerminalLine(event);
                addTimelineCard(event);
                eventCount++;
            });
            eventCountEl.textContent = `${eventCount} events`;
        } catch {
            // Agent not running yet — that's fine
        }
    }

    // ── Utilities ──
    function formatTime(timestamp) {
        if (!timestamp) return '--:--';
        try {
            const d = new Date(timestamp);
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {
            return '--:--';
        }
    }

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function truncate(str, maxLen) {
        if (str.length <= maxLen) return str;
        return str.substring(0, maxLen) + '…';
    }

    // ── Boot ──
    document.addEventListener('DOMContentLoaded', init);

})();
