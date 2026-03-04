/**
 * face.js — Canvas face rendering engine
 * Draws a generative face with eyes, mouth, and responsive animations.
 */

class FaceRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.size = this.canvas.width;
        this.cx = this.size / 2;
        this.cy = this.size / 2;

        // State
        this.state = {
            active: false,
            llm: 'idle',        // 'gemini' | 'ollama' | 'idle'
            blinking: false,
            sleeping: false,
            eyeOffsetX: 0,
            eyeOffsetY: 0,
            targetEyeX: 0,
            targetEyeY: 0,
            mouthCurve: 0,       // -1 (frown) to 1 (smile)
            breathePhase: 0,
            pupilDilation: 1,
        };

        // Animation
        this._blinkTimer = null;
        this._saccadeTimer = null;
        this._animating = false;

        this._scheduleBlinking();
    }

    /** Start the render loop. */
    start() {
        if (this._animating) return;
        this._animating = true;
        this._loop();
    }

    /** Stop the render loop. */
    stop() {
        this._animating = false;
    }

    /** Activate: eyes open, start saccades. */
    setActive(active) {
        this.state.active = active;
        this.state.sleeping = false;
        if (active) {
            this._startSaccades();
        } else {
            this._stopSaccades();
            this.state.targetEyeX = 0;
            this.state.targetEyeY = 0;
        }
    }

    /** Set which LLM is running. */
    setLLM(llm) {
        this.state.llm = llm; // 'gemini' | 'ollama' | 'idle'
    }

    /** Go to sleep (eyes closed, dimmed). */
    setSleeping(sleeping) {
        this.state.sleeping = sleeping;
        if (sleeping) {
            this.state.active = false;
            this._stopSaccades();
        }
    }

    // ── Internal Animation ──

    _loop() {
        if (!this._animating) return;
        this._update();
        this._draw();
        requestAnimationFrame(() => this._loop());
    }

    _update() {
        const s = this.state;

        // Smooth eye movement (lerp toward target)
        s.eyeOffsetX += (s.targetEyeX - s.eyeOffsetX) * 0.08;
        s.eyeOffsetY += (s.targetEyeY - s.eyeOffsetY) * 0.08;

        // Breathing animation
        s.breathePhase += 0.015;
        if (s.breathePhase > Math.PI * 2) s.breathePhase -= Math.PI * 2;

        // Mouth: slight smile when active, neutral when idle
        const targetMouth = s.active ? 0.3 : (s.sleeping ? -0.1 : 0);
        s.mouthCurve += (targetMouth - s.mouthCurve) * 0.05;

        // Pupil dilation: larger when active
        const targetDilation = s.active ? 1.2 : (s.sleeping ? 0.6 : 1.0);
        s.pupilDilation += (targetDilation - s.pupilDilation) * 0.05;
    }

    _draw() {
        const ctx = this.ctx;
        const s = this.state;
        const cx = this.cx;
        const cy = this.cy;
        const r = this.size / 2;

        ctx.clearRect(0, 0, this.size, this.size);

        // Background circle
        const breatheScale = 1 + Math.sin(s.breathePhase) * 0.005;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(breatheScale, breatheScale);
        ctx.translate(-cx, -cy);

        // Face background gradient
        const faceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.9);
        faceGrad.addColorStop(0, '#1a1a1a');
        faceGrad.addColorStop(1, '#111111');
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
        ctx.fillStyle = faceGrad;
        ctx.fill();

        // Eye parameters
        const eyeSpacing = r * 0.32;
        const eyeY = cy - r * 0.08;
        const eyeWidth = r * 0.22;
        const eyeHeight = r * 0.14;

        // Blink: interpolate eyeHeight
        const blinkFactor = s.blinking ? 0.05 : (s.sleeping ? 0.08 : 1.0);
        const actualEyeH = eyeHeight * blinkFactor;

        // Left eye
        this._drawEye(ctx, cx - eyeSpacing, eyeY, eyeWidth, actualEyeH, s);
        // Right eye
        this._drawEye(ctx, cx + eyeSpacing, eyeY, eyeWidth, actualEyeH, s);

        // Mouth
        this._drawMouth(ctx, cx, cy + r * 0.25, r * 0.18, s);

        // Activity indicator: subtle ring
        if (s.active) {
            const ringAlpha = 0.1 + Math.sin(s.breathePhase * 2) * 0.05;
            const ringColor = s.llm === 'gemini' ? `rgba(66, 133, 244, ${ringAlpha})`
                : s.llm === 'ollama' ? `rgba(232, 113, 10, ${ringAlpha})`
                    : `rgba(86, 156, 214, ${ringAlpha})`;
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawEye(ctx, ex, ey, w, h, state) {
        const pupilR = w * 0.35 * state.pupilDilation;
        const irisR = w * 0.55;

        // Eye white (dark grey in dark theme)
        ctx.beginPath();
        ctx.ellipse(ex, ey, w, h, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#2a2a2a';
        ctx.fill();

        if (h > w * 0.1) { // Only draw iris/pupil if eye is open enough
            // Iris
            const irisX = ex + state.eyeOffsetX * w * 0.3;
            const irisY = ey + state.eyeOffsetY * h * 0.3;

            const irisColor = state.llm === 'gemini' ? '#4285f4'
                : state.llm === 'ollama' ? '#e8710a'
                    : '#569cd6';

            const irisGrad = ctx.createRadialGradient(irisX, irisY, 0, irisX, irisY, irisR);
            irisGrad.addColorStop(0, irisColor);
            irisGrad.addColorStop(1, this._darken(irisColor, 0.4));

            ctx.beginPath();
            ctx.arc(irisX, irisY, irisR, 0, Math.PI * 2);
            ctx.fillStyle = irisGrad;
            ctx.fill();

            // Pupil
            ctx.beginPath();
            ctx.arc(irisX, irisY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#0a0a0a';
            ctx.fill();

            // Highlight
            ctx.beginPath();
            ctx.arc(irisX - pupilR * 0.3, irisY - pupilR * 0.3, pupilR * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fill();
        }
    }

    _drawMouth(ctx, mx, my, width, state) {
        const curve = state.mouthCurve;

        ctx.beginPath();
        ctx.moveTo(mx - width, my);
        ctx.quadraticCurveTo(mx, my + width * curve * 1.5, mx + width, my);
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    _darken(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
    }

    // ── Blink scheduling ──

    _scheduleBlinking() {
        const blink = () => {
            if (this.state.sleeping) {
                this._blinkTimer = setTimeout(blink, 5000);
                return;
            }
            this.state.blinking = true;
            setTimeout(() => {
                this.state.blinking = false;
            }, 120 + Math.random() * 80);

            // Next blink in 2–6 seconds
            const delay = 2000 + Math.random() * 4000;
            this._blinkTimer = setTimeout(blink, delay);
        };
        this._blinkTimer = setTimeout(blink, 1000 + Math.random() * 2000);
    }

    // ── Eye saccades (small random movements when active) ──

    _startSaccades() {
        if (this._saccadeTimer) return;
        const saccade = () => {
            if (!this.state.active) return;
            this.state.targetEyeX = (Math.random() - 0.5) * 2;
            this.state.targetEyeY = (Math.random() - 0.5) * 1.5;
            const delay = 500 + Math.random() * 2000;
            this._saccadeTimer = setTimeout(saccade, delay);
        };
        saccade();
    }

    _stopSaccades() {
        if (this._saccadeTimer) {
            clearTimeout(this._saccadeTimer);
            this._saccadeTimer = null;
        }
        this.state.targetEyeX = 0;
        this.state.targetEyeY = 0;
    }
}
