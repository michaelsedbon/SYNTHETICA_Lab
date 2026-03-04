/**
 * app.js — Agent Presence Dashboard
 * Connects to the lab-agent WebSocket, drives the face animation,
 * populates the terminal feed, timeline, and LLM I/O panel.
 */

(function () {
    'use strict';

    // Config
    const AGENT_HOST = window.location.hostname || 'localhost';
    const AGENT_PORT = 8003;
    const WS_URL = `ws://${AGENT_HOST}:${AGENT_PORT}/ws/agent`;
    const API_BASE = `http://${AGENT_HOST}:${AGENT_PORT}`;
    const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
    const MAX_TERMINAL_LINES = 150;
    const MAX_TIMELINE_CARDS = 25;
    const MAX_LLMIO_CARDS = 30;
    const STATUS_POLL_INTERVAL = 10000;
    const SCREEN_CONTROL_URL = `http://localhost:3005`;

    // DOM refs
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const clockEl = document.getElementById('clock');
    const termBody = document.getElementById('terminal-body');
    const tlBody = document.getElementById('timeline-body');
    const llmioBody = document.getElementById('llmio-body');
    const eventCountEl = document.getElementById('event-count');
    const facePanelEl = document.getElementById('face-panel');

    // State
    let ws = null;
    let reconnectDelay = 1000;
    let eventCount = 0;
    let lastEventTime = Date.now();
    let isIdle = false;
    let face = null;
    let screenOn = false;

    const EVENT_ICONS = {
        reasoning: '🧠', tool_call: '🔧', decision: '💡',
        error: '⚠️', info: 'ℹ️', plan: '📋',
        reflect: '🔄', observation: '👁',
    };

    const LLMIO_TYPES = new Set(['plan', 'reasoning', 'tool_call', 'decision', 'reflect']);

    // ==================== Init ====================
    function init() {
        face = new FaceRenderer('face-canvas-0');
        face.start();
        updateClock();
        setInterval(updateClock, 1000);
        setInterval(checkIdle, 5000);
        connectWS();
        setInterval(pollAgentStatus, STATUS_POLL_INTERVAL);
        loadRecentTimeline();
    }

    function updateClock() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    // ==================== WebSocket ====================
    function connectWS() {
        setConnectionStatus('connecting');
        try { ws = new WebSocket(WS_URL); }
        catch (e) { setConnectionStatus('disconnected'); scheduleReconnect(); return; }

        ws.onopen = () => { setConnectionStatus('connected'); reconnectDelay = 1000; };
        ws.onmessage = (e) => {
            try { handleEvent(JSON.parse(e.data)); }
            catch (err) { console.error('Parse error:', err); }
        };
        ws.onclose = () => { setConnectionStatus('disconnected'); scheduleReconnect(); };
        ws.onerror = () => { setConnectionStatus('disconnected'); };
    }

    function scheduleReconnect() {
        setTimeout(() => { reconnectDelay = Math.min(reconnectDelay * 1.5, 30000); connectWS(); }, reconnectDelay);
    }

    function setConnectionStatus(status) {
        statusDot.className = status;
        const labels = { connected: 'Connected to Agent', connecting: 'Connecting…', disconnected: 'Disconnected — retrying…' };
        statusText.textContent = labels[status] || status;
    }

    // ==================== Event Handling ====================
    function handleEvent(event) {
        lastEventTime = Date.now();
        eventCount++;
        eventCountEl.textContent = `${eventCount} events`;

        if (isIdle) { isIdle = false; document.body.classList.remove('idle'); turnScreenOn(); }

        detectLLM(event);
        face.setActive(true);
        face.setSleeping(false);

        addTerminalLine(event);
        addTimelineCard(event);
        addLLMIOCard(event);

        clearTimeout(window._faceDeactivateTimer);
        window._faceDeactivateTimer = setTimeout(() => {
            face.setActive(false); face.setLLM('idle'); updateBadge('idle');
        }, 3000);
    }

    function detectLLM(event) {
        const title = (event.title || '').toLowerCase();
        const eventType = event.event_type || '';

        if (eventType === 'plan' || eventType === 'reflect' ||
            title.includes('planning') || title.includes('reflecting') || title.includes('gemini')) {
            face.setLLM('gemini'); updateBadge('gemini');
        } else if (eventType === 'tool_call' || eventType === 'reasoning' ||
            title.includes('ollama') || title.includes('executing') || title.includes('qwen')) {
            face.setLLM('ollama'); updateBadge('ollama');
        }
    }

    function updateBadge(llm) {
        const badge = document.getElementById('llm-badge-0');
        const label = badge.querySelector('.badge-label');
        badge.className = 'llm-badge ' + llm;
        const labels = { gemini: 'Gemini', ollama: 'Qwen 2.5', idle: 'Idle' };
        label.textContent = labels[llm] || llm;
    }

    // ==================== Terminal Feed ====================
    function addTerminalLine(event) {
        const line = document.createElement('div');
        line.className = 'term-line';
        const eventType = event.event_type || 'info';
        const time = formatTime(event.timestamp);
        let content = '';

        if (eventType === 'tool_call' && event.tool_name) {
            content = `<span class="term-tool-name">${escHtml(event.tool_name)}</span>`;
            if (event.duration_ms) content += ` <span style="color:var(--text-muted)">(${event.duration_ms}ms)</span>`;
        } else {
            content = escHtml(truncate(event.title || event.content || '', 200));
        }

        line.innerHTML = `
            <span class="term-time">${time}</span>
            <span class="term-type ${eventType}">${eventType}</span>
            <span class="term-content ${eventType}">${content}</span>
        `;
        termBody.appendChild(line);
        while (termBody.children.length > MAX_TERMINAL_LINES) termBody.removeChild(termBody.firstChild);
        termBody.scrollTop = termBody.scrollHeight;
    }

    // ==================== Timeline Cards ====================
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
        tlBody.insertBefore(card, tlBody.firstChild);
        while (tlBody.children.length > MAX_TIMELINE_CARDS) tlBody.removeChild(tlBody.lastChild);
    }

    // ==================== LLM I/O Panel ====================
    function addLLMIOCard(event) {
        const eventType = event.event_type || '';
        if (!LLMIO_TYPES.has(eventType)) return;

        const card = document.createElement('div');
        card.className = 'llmio-card';
        const time = formatTime(event.timestamp);
        let direction, label, bodyContent;

        if (eventType === 'plan') {
            direction = 'input';
            label = 'Plan \u2192 Gemini';
            bodyContent = formatSmartContent(event.content || event.title || '');
        } else if (eventType === 'reflect') {
            direction = 'output';
            label = 'Reflection \u2190 Gemini';
            bodyContent = formatSmartContent(event.content || event.title || '');
        } else if (eventType === 'reasoning') {
            direction = 'output';
            label = 'Reasoning \u2190 Ollama';
            bodyContent = formatSmartContent(event.content || event.title || '');
        } else if (eventType === 'decision') {
            direction = 'output';
            label = 'Decision';
            bodyContent = formatSmartContent(event.content || event.title || '');
        } else if (eventType === 'tool_call') {
            direction = 'tool-in';
            label = 'Tool: ' + (event.tool_name || 'unknown');
            if (event.duration_ms) label += ' (' + event.duration_ms + 'ms)';

            let parts = [];
            if (event.tool_input) {
                parts.push('<span style="color:#70b0ff;font-weight:600">\u25b8 Input:</span>\n' + formatSmartContent(event.tool_input));
            }
            if (event.tool_output) {
                parts.push('<span style="color:#5eedb8;font-weight:600">\u25c2 Output:</span>\n' + formatSmartContent(event.tool_output));
            }
            bodyContent = parts.join('\n\n') || formatSmartContent(event.content || event.title || '');
        }

        card.innerHTML = `
            <div class="llmio-header" onclick="this.parentElement.classList.toggle('llmio-collapsed')">
                <span class="llmio-direction ${direction}">${(direction || '').replace('-', ' ')}</span>
                <span class="llmio-label">${escHtml(label || '')}</span>
                <span class="llmio-time">${time}</span>
            </div>
            <div class="llmio-body">${bodyContent || ''}</div>
        `;

        llmioBody.insertBefore(card, llmioBody.firstChild);
        while (llmioBody.children.length > MAX_LLMIO_CARDS) llmioBody.removeChild(llmioBody.lastChild);
    }

    // ==================== Smart JSON Formatting ====================
    function formatSmartContent(content) {
        if (!content) return '';
        const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

        // Try to parse entire string as JSON
        try {
            const parsed = JSON.parse(str);
            return syntaxHighlightJSON(JSON.stringify(parsed, null, 2));
        } catch { /* not JSON */ }

        // Look for JSON blocks embedded in text
        const jsonBlockRegex = /(\{[\s\S]*?\}|\[[\s\S]*?\])/g;
        let result = escHtml(str);
        const matches = str.match(jsonBlockRegex);
        if (matches) {
            for (const match of matches) {
                try {
                    const parsed = JSON.parse(match);
                    const highlighted = syntaxHighlightJSON(JSON.stringify(parsed, null, 2));
                    result = result.replace(escHtml(match), '\n' + highlighted + '\n');
                } catch { /* not valid JSON */ }
            }
        }
        return result;
    }

    function syntaxHighlightJSON(json) {
        const escaped = escHtml(json);
        return escaped
            .replace(/(&quot;[^&]*?&quot;)\s*:/g, '<span class="json-key">$1</span>:')
            .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="json-string">$1</span>')
            .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
            .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
            .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
            .replace(/([{}\[\]])/g, '<span class="json-bracket">$1</span>');
    }

    // ==================== Idle / Screen ====================
    function checkIdle() {
        const elapsed = Date.now() - lastEventTime;
        if (elapsed > IDLE_TIMEOUT_MS && !isIdle) {
            isIdle = true;
            document.body.classList.add('idle');
            face.setSleeping(true); face.setLLM('idle'); updateBadge('idle');
            turnScreenOff();
        }
    }

    function turnScreenOn() {
        if (screenOn) return;
        screenOn = true;
        fetch(`${SCREEN_CONTROL_URL}/screen/on`, { method: 'POST' }).catch(() => { });
    }

    function turnScreenOff() {
        screenOn = false;
        fetch(`${SCREEN_CONTROL_URL}/screen/off`, { method: 'POST' }).catch(() => { });
    }

    // ==================== Agent Status ====================
    async function pollAgentStatus() {
        try {
            const res = await fetch(`${API_BASE}/api/agent/status`);
            if (!res.ok) return;
            const data = await res.json();
            const agents = data.agents || {};
            const agentIds = Object.keys(agents);

            if (agentIds.length > 0) {
                document.getElementById('agent-label-0').textContent = agentIds[0] || 'Agent';
            }
            if (agentIds.length > 1) { facePanelEl.classList.add('multi'); }
            else { facePanelEl.classList.remove('multi'); }
        } catch { /* agent down */ }
    }

    // ==================== Load Recent ====================
    async function loadRecentTimeline() {
        try {
            const sessionsRes = await fetch(`${API_BASE}/api/agent/sessions`);
            if (!sessionsRes.ok) return;
            const sessions = await sessionsRes.json();
            if (sessions.length === 0) return;

            const latest = sessions[sessions.length - 1];
            const tlRes = await fetch(`${API_BASE}/api/agent/timeline/${latest.session_id}?limit=30`);
            if (!tlRes.ok) return;
            const events = await tlRes.json();

            events.forEach(event => {
                addTerminalLine(event);
                addTimelineCard(event);
                addLLMIOCard(event);
                eventCount++;
            });
            eventCountEl.textContent = `${eventCount} events`;
        } catch { /* agent not running */ }
    }

    // ==================== Utilities ====================
    function formatTime(timestamp) {
        if (!timestamp) return '--:--';
        try {
            const d = new Date(timestamp);
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch { return '--:--'; }
    }

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str);
        return div.innerHTML;
    }

    function truncate(str, maxLen) {
        if (str.length <= maxLen) return str;
        return str.substring(0, maxLen) + '…';
    }

    // ==================== Tab Switching (global) ====================
    window.switchTab = function (tabId) {
        document.querySelectorAll('#bottom-tabs .tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-pane').forEach(p => {
            p.classList.toggle('active', p.id === tabId);
        });
    };

    // Boot
    document.addEventListener('DOMContentLoaded', init);
})();
