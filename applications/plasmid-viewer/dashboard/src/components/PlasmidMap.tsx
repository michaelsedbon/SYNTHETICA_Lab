"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Feature } from "@/lib/api";

interface Props {
    sequence: string;
    features: Feature[];
    topology: string;
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
    selectionRange: { start: number; end: number } | null;
    onSelectionRange: (range: { start: number; end: number } | null) => void;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const BACKBONE_COLOR = "#444458";
const BACKBONE_WIDTH = 2;
const TICK_COLOR = "#3a3a4a";
const LABEL_COLOR = "#b0b0c8";
const SEQ_COLORS: Record<string, string> = {
    A: "#5CB85C", T: "#D9534F", G: "#F0AD4E", C: "#4A90D9",
};
const COMPLEMENT: Record<string, string> = { A: "T", T: "A", G: "C", C: "G" };

const TRACK_THICK: Record<string, number> = {
    CDS: 16, gene: 16, mRNA: 14,
    promoter: 10, terminator: 10, RBS: 8,
    rep_origin: 12, primer_bind: 6,
};
const TRACK_DEFAULT = 10;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 80;
const TRANSITION_START = 2.5; // zoom level where 12-o'clock centering begins
const TRANSITION_END = 5;     // zoom level where it's fully anchored at 12
const ROTATE_SPEED = 0.0015;

/* ── Component ─────────────────────────────────────────────────────── */

export default function PlasmidMap({
    sequence, features, topology,
    selectedFeatureId, onSelectFeature,
    selectionRange, onSelectionRange,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const zoomRef = useRef(1);
    const rotationRef = useRef(0);
    const panRef = useRef({ x: 0, y: 0 });

    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [hoverFeature, setHoverFeature] = useState<number | null>(null);
    const [hoverBp, setHoverBp] = useState<number | null>(null);

    // Drag-select state
    const dragSelecting = useRef(false);
    const dragStart = useRef<number | null>(null);

    const seqLen = sequence.length;

    /* ── Resize ── */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setSize({ w: Math.floor(width), h: Math.floor(height) });
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    /* ── bp ↔ angle ── */
    const bpToAngle = useCallback(
        (bp: number) => (bp / seqLen) * Math.PI * 2 - Math.PI / 2 + rotationRef.current,
        [seqLen]
    );

    const angleToBp = useCallback(
        (angle: number) => {
            let delta = angle - (-Math.PI / 2 + rotationRef.current);
            delta = ((delta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            return Math.round((delta / (Math.PI * 2)) * seqLen) % seqLen;
        },
        [seqLen]
    );

    /* ── Layout helpers ── */
    const getNaturalR = useCallback(() => Math.min(size.w, size.h) * 0.38, [size]);

    const getLayout = useCallback(() => {
        const z = zoomRef.current;
        const naturalR = getNaturalR();
        const r = naturalR * z;

        // At low zoom: circle center = viewport center
        // At high zoom: 12-o'clock point = viewport center
        const t = Math.min(1, Math.max(0, (z - TRANSITION_START) / (TRANSITION_END - TRANSITION_START)));
        // Smooth ease
        const ease = t * t * (3 - 2 * t);

        // Circle center position
        const baseCx = size.w / 2 + panRef.current.x;
        const baseCy = size.h / 2 + panRef.current.y;

        // 12-o'clock anchor: the top of the backbone (angle = -π/2 + rotation)
        const topAngle = -Math.PI / 2 + rotationRef.current;
        // If we want the 12-o'clock point at viewport center, the circle center must be:
        const anchoredCx = size.w / 2 - Math.cos(topAngle) * r;
        const anchoredCy = size.h / 2 - Math.sin(topAngle) * r;

        const cx = baseCx * (1 - ease) + anchoredCx * ease;
        const cy = baseCy * (1 - ease) + anchoredCy * ease;

        return { cx, cy, r };
    }, [size, getNaturalR]);

    /* ── DRAW ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || seqLen === 0) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size.w * dpr;
        canvas.height = size.h * dpr;
        canvas.style.width = size.w + "px";
        canvas.style.height = size.h + "px";

        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size.w, size.h);

        const { cx, cy, r } = getLayout();
        const z = zoomRef.current;

        /* ── Backbone ── */
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = BACKBONE_COLOR;
        ctx.lineWidth = BACKBONE_WIDTH;
        ctx.stroke();

        /* ── Selection arc overlay ── */
        if (selectionRange) {
            const sAngle = bpToAngle(selectionRange.start);
            const eAngle = bpToAngle(selectionRange.end);
            ctx.beginPath();
            ctx.arc(cx, cy, r, sAngle, eAngle);
            ctx.strokeStyle = "rgba(74, 124, 255, 0.6)";
            ctx.lineWidth = 6;
            ctx.stroke();
            ctx.lineWidth = 1;
        }

        /* ── Ruler ticks ── */
        const bpPerTick = getTickInterval(seqLen, z);
        const majorEvery = 5;
        for (let bp = 0; bp < seqLen; bp += bpPerTick) {
            const angle = bpToAngle(bp);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const isMajor = bp % (bpPerTick * majorEvery) === 0;
            const tickLen = isMajor ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(cx + cos * r, cy + sin * r);
            ctx.lineTo(cx + cos * (r + tickLen), cy + sin * (r + tickLen));
            ctx.strokeStyle = TICK_COLOR;
            ctx.lineWidth = 1;
            ctx.stroke();

            if (isMajor) {
                ctx.save();
                ctx.translate(cx + cos * (r + tickLen + 12), cy + sin * (r + tickLen + 12));
                ctx.font = "10px Inter, sans-serif";
                ctx.fillStyle = LABEL_COLOR;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(formatBp(bp), 0, 0);
                ctx.restore();
            }
        }

        /* ── Feature arcs ── */
        const tracks = assignTracks(features, seqLen);

        // Collect label info for collision avoidance
        const labelInfos: { angle: number; r: number; text: string; color: string; selected: boolean; feature: Feature }[] = [];

        tracks.forEach(({ feature, track }) => {
            const startAngle = bpToAngle(feature.start);
            const endAngle = bpToAngle(feature.end);
            const thickness = TRACK_THICK[feature.type] || TRACK_DEFAULT;
            const gap = 3;
            const featureR = r - 8 - track * (18 + gap);
            if (featureR < 20) return;

            const isSelected = feature.id === selectedFeatureId;
            const isHovered = feature.id === hoverFeature;
            const halfT = thickness / 2;
            const outerR = featureR + halfT;
            const innerR = featureR - halfT;

            ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.9 : 0.75;

            const isDirectional = ["CDS", "gene", "mRNA", "promoter", "primer_bind"].includes(feature.type);

            if (isDirectional) {
                const arrowAngle = Math.min(0.08, (endAngle - startAngle) * 0.25);
                const tipAngle = feature.strand === 1 ? endAngle : startAngle;
                const bodyEnd = feature.strand === 1 ? endAngle - arrowAngle : startAngle + arrowAngle;

                ctx.beginPath();
                if (feature.strand === 1) {
                    ctx.arc(cx, cy, outerR, startAngle, bodyEnd);
                    ctx.lineTo(cx + Math.cos(tipAngle) * featureR, cy + Math.sin(tipAngle) * featureR);
                    ctx.arc(cx, cy, innerR, bodyEnd, startAngle, true);
                } else {
                    ctx.arc(cx, cy, outerR, bodyEnd, endAngle);
                    ctx.arc(cx, cy, innerR, endAngle, bodyEnd, true);
                    ctx.lineTo(cx + Math.cos(tipAngle) * featureR, cy + Math.sin(tipAngle) * featureR);
                }
                ctx.closePath();
                ctx.fillStyle = feature.color;
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, outerR, startAngle, endAngle);
                ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
                ctx.closePath();
                ctx.fillStyle = feature.color;
                ctx.fill();
            }

            if (isSelected) {
                ctx.beginPath();
                ctx.arc(cx, cy, outerR + 1, startAngle, endAngle);
                ctx.arc(cx, cy, innerR - 1, endAngle, startAngle, true);
                ctx.closePath();
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            ctx.globalAlpha = 1;

            // Collect label for later collision-aware rendering
            if (feature.label) {
                const midAngle = (startAngle + endAngle) / 2;
                labelInfos.push({ angle: midAngle, r: outerR, text: feature.label, color: feature.color, selected: isSelected, feature });
            }
        });

        /* ── Label collision avoidance and rendering ── */
        if (labelInfos.length > 0) {
            // Sort by angle for overlap detection
            labelInfos.sort((a, b) => {
                const na = ((a.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const nb = ((b.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                return na - nb;
            });

            // Assign staggered offset to avoid overlaps
            const labelPositions: { lx: number; ly: number; info: typeof labelInfos[0]; offsetR: number }[] = [];
            const minGap = 14; // min vertical gap between labels

            for (const info of labelInfos) {
                let offsetR = r + 28;
                let lx = cx + Math.cos(info.angle) * offsetR;
                let ly = cy + Math.sin(info.angle) * offsetR;

                // Check against already placed labels
                for (let attempt = 0; attempt < 5; attempt++) {
                    let collision = false;
                    for (const placed of labelPositions) {
                        const dist = Math.sqrt((lx - placed.lx) ** 2 + (ly - placed.ly) ** 2);
                        if (dist < minGap) {
                            collision = true;
                            break;
                        }
                    }
                    if (!collision) break;
                    offsetR += 14;
                    lx = cx + Math.cos(info.angle) * offsetR;
                    ly = cy + Math.sin(info.angle) * offsetR;
                }
                labelPositions.push({ lx, ly, info, offsetR });
            }

            // Render labels with leader lines
            for (const { lx, ly, info, offsetR } of labelPositions) {
                // Leader line
                const lineStartR = info.r + 2;
                const lineEndR = offsetR - 6;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(info.angle) * lineStartR, cy + Math.sin(info.angle) * lineStartR);
                ctx.lineTo(cx + Math.cos(info.angle) * lineEndR, cy + Math.sin(info.angle) * lineEndR);
                ctx.strokeStyle = info.color;
                ctx.globalAlpha = 0.35;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;

                // Label text
                ctx.save();
                ctx.translate(lx, ly);
                const textAngle = info.angle + Math.PI / 2;
                const normMid = ((info.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const flip = normMid > Math.PI / 2 && normMid < (3 * Math.PI) / 2;
                ctx.rotate(flip ? textAngle + Math.PI : textAngle);
                ctx.font = `${info.selected ? "600" : "400"} 11px Inter, sans-serif`;
                ctx.fillStyle = info.selected ? "#fff" : LABEL_COLOR;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(info.text, 0, 0);
                ctx.restore();
            }
        }

        /* ── Sequence letters + complementary strand (high zoom) ── */
        if (z > 6 && r > 100) {
            const arcPerBp = (Math.PI * 2) / seqLen;
            const fontSize = Math.min(14, r * arcPerBp * 0.65);
            if (fontSize > 3) {
                const outerOffset = 10;  // forward strand: outside backbone
                const innerOffset = -10; // complement: inside backbone
                for (let i = 0; i < seqLen; i++) {
                    const angle = bpToAngle(i);
                    // Forward strand
                    const fwdX = cx + Math.cos(angle) * (r + outerOffset);
                    const fwdY = cy + Math.sin(angle) * (r + outerOffset);
                    if (fwdX < -20 || fwdX > size.w + 20 || fwdY < -20 || fwdY > size.h + 20) continue;

                    const char = sequence[i];
                    const comp = COMPLEMENT[char] || "N";

                    // Forward strand letter
                    ctx.save();
                    ctx.translate(fwdX, fwdY);
                    ctx.rotate(angle + Math.PI / 2);
                    ctx.font = `${fontSize}px JetBrains Mono, Menlo, monospace`;
                    ctx.fillStyle = SEQ_COLORS[char] || "#888";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(char, 0, 0);
                    ctx.restore();

                    // Complement strand letter (inside)
                    const compX = cx + Math.cos(angle) * (r + innerOffset);
                    const compY = cy + Math.sin(angle) * (r + innerOffset);
                    ctx.save();
                    ctx.translate(compX, compY);
                    ctx.rotate(angle + Math.PI / 2);
                    ctx.font = `${fontSize}px JetBrains Mono, Menlo, monospace`;
                    ctx.fillStyle = SEQ_COLORS[comp] || "#888";
                    ctx.globalAlpha = 0.6;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(comp, 0, 0);
                    ctx.restore();
                    ctx.globalAlpha = 1;
                }
            }
        }

        /* ── Center text ── */
        if (z < 5 && cx > -100 && cx < size.w + 100 && cy > -100 && cy < size.h + 100) {
            ctx.font = "600 14px Inter, sans-serif";
            ctx.fillStyle = "#e0e0e8";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${seqLen.toLocaleString()} bp`, cx, cy - 8);
            ctx.font = "400 11px Inter, sans-serif";
            ctx.fillStyle = "#6a6a7a";
            ctx.fillText(topology, cx, cy + 10);
        }

        /* ── Selection tooltip ── */
        if (selectedFeatureId !== null) {
            const selFeat = features.find((f) => f.id === selectedFeatureId);
            if (selFeat) {
                const midAngle = (bpToAngle(selFeat.start) + bpToAngle(selFeat.end)) / 2;
                const tipR = r - 32;
                const tipX = cx + Math.cos(midAngle) * tipR;
                const tipY = cy + Math.sin(midAngle) * tipR;
                if (tipR > 20) {
                    const spanBp = selFeat.end > selFeat.start ? selFeat.end - selFeat.start : seqLen - selFeat.start + selFeat.end;
                    const text = `${spanBp.toLocaleString()} bp`;
                    ctx.font = "600 11px Inter, sans-serif";
                    const tw = ctx.measureText(text).width;
                    const pad = 6;
                    ctx.fillStyle = "rgba(0,0,0,0.75)";
                    roundRect(ctx, tipX - tw / 2 - pad, tipY - 8 - pad / 2, tw + pad * 2, 16 + pad, 4);
                    ctx.fill();
                    ctx.fillStyle = "#fff";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(text, tipX, tipY);
                }
            }
        }
    }, [sequence, features, zoom, rotation, pan, size, selectedFeatureId, hoverFeature, selectionRange, bpToAngle, seqLen, topology, getLayout]);

    /* ── MOUSE: scroll=rotate, ctrl+scroll=zoom with 12-o'clock centering ── */
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            // ── Zoom ──
            const factor = e.deltaY > 0 ? 1 / 1.08 : 1.08;
            const oldZ = zoomRef.current;
            const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor));

            // At low zoom, keep circle centered in viewport (pan stays at 0,0)
            // The getLayout() function handles the 12-o'clock transition automatically
            // We just need to keep pan near (0,0) at low zoom and let the layout fn do the rest
            if (newZ < TRANSITION_START) {
                // Below transition: keep center of circle at viewport center
                panRef.current = { x: 0, y: 0 };
            }
            // During/above transition: pan stays as-is, getLayout blends to 12-o'clock

            zoomRef.current = newZ;
            setZoom(newZ);
            setPan({ ...panRef.current });
        } else {
            // ── Rotate ──
            const delta = e.deltaY * ROTATE_SPEED;
            rotationRef.current += delta;
            setRotation(rotationRef.current);
        }
    }, []);

    /* ── Drag-select on backbone ── */
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const { cx, cy, r } = getLayout();
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);

        // Start drag-select only if clicking near the backbone (within 20px)
        if (Math.abs(dist - r) < 20) {
            const mouseAngle = Math.atan2(my - cy, mx - cx);
            const bp = angleToBp(mouseAngle);
            dragSelecting.current = true;
            dragStart.current = bp;
            onSelectionRange({ start: bp, end: bp });
        }
    }, [getLayout, angleToBp, onSelectionRange]);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const { cx, cy, r } = getLayout();
            const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
            const mouseAngle = Math.atan2(my - cy, mx - cx);

            // Update drag-select
            if (dragSelecting.current && dragStart.current !== null) {
                const bp = angleToBp(mouseAngle);
                onSelectionRange({ start: dragStart.current, end: bp });
                canvas.style.cursor = "crosshair";
                return;
            }

            // Hover bp
            const bp = angleToBp(mouseAngle);
            setHoverBp(Math.abs(dist - r) < r * 0.3 ? bp : null);

            // Hit test features
            const tracks2 = assignTracks(features, seqLen);
            let found: number | null = null;
            for (const { feature, track } of tracks2) {
                const thickness = TRACK_THICK[feature.type] || TRACK_DEFAULT;
                const featureR = r - 8 - track * 21;
                const halfT = thickness / 2 + 3;
                if (Math.abs(dist - featureR) < halfT) {
                    const startAngle = bpToAngle(feature.start);
                    const endAngle = bpToAngle(feature.end);
                    let normM = ((mouseAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    let normS = ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    let normE = ((endAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    const hit = normS <= normE ? normM >= normS && normM <= normE : normM >= normS || normM <= normE;
                    if (hit) { found = feature.id; break; }
                }
            }
            setHoverFeature(found);
            canvas.style.cursor = found ? "pointer" : Math.abs(dist - r) < 20 ? "crosshair" : "default";
        },
        [features, seqLen, bpToAngle, getLayout, angleToBp, onSelectionRange]
    );

    const handleMouseUp = useCallback(() => {
        if (dragSelecting.current) {
            dragSelecting.current = false;
            // If start === end, clear selection
            if (selectionRange && selectionRange.start === selectionRange.end) {
                onSelectionRange(null);
            }
        }
    }, [selectionRange, onSelectionRange]);

    const handleClick = useCallback(() => {
        if (!dragSelecting.current) {
            onSelectFeature(hoverFeature);
        }
    }, [hoverFeature, onSelectFeature]);

    /* ── Zoom-to-selection: rotate midpoint to 12-o'clock, then zoom ── */
    const zoomToRange = useCallback((startBp: number, endBp: number) => {
        const midBp = startBp < endBp ? (startBp + endBp) / 2 : ((startBp + endBp + seqLen) / 2) % seqLen;
        const spanBp = startBp < endBp ? endBp - startBp : seqLen - startBp + endBp;

        // Target zoom so the span fills ~60% of the viewport
        const naturalR = getNaturalR();
        const targetArc = size.w * 0.6;
        const arcFraction = spanBp / seqLen;
        const targetR = targetArc / (arcFraction * Math.PI * 2);
        const targetZ = Math.min(MAX_ZOOM, Math.max(2, targetR / naturalR));

        // Rotate so the midpoint of the selection ends up at 12 o'clock (angle = -π/2)
        // bpToAngle(midBp) = (midBp/seqLen) * 2π - π/2 + rotation
        // We want this to equal -π/2, so: rotation = -(midBp/seqLen) * 2π
        const targetRotation = -(midBp / seqLen) * Math.PI * 2;

        // Pan stays at 0 — the getLayout() transition handles centering at 12 o'clock
        zoomRef.current = targetZ;
        rotationRef.current = targetRotation;
        panRef.current = { x: 0, y: 0 };
        setZoom(targetZ);
        setRotation(targetRotation);
        setPan({ x: 0, y: 0 });
    }, [seqLen, size, getNaturalR]);

    // Auto-zoom when a feature is selected
    useEffect(() => {
        if (selectedFeatureId !== null) {
            const feat = features.find((f) => f.id === selectedFeatureId);
            if (feat) zoomToRange(feat.start, feat.end);
        }
    }, [selectedFeatureId, features, zoomToRange]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Zoom buttons ── */
    const zoomBtn = (factor: number) => {
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor));
        if (newZ < TRANSITION_START) panRef.current = { x: 0, y: 0 };
        zoomRef.current = newZ;
        setZoom(newZ);
        setPan({ ...panRef.current });
    };

    const resetView = () => {
        zoomRef.current = 1; rotationRef.current = 0; panRef.current = { x: 0, y: 0 };
        setZoom(1); setRotation(0); setPan({ x: 0, y: 0 });
        onSelectionRange(null);
    };

    /* ── Status bar info ── */
    const hoverChar = hoverBp !== null ? sequence[hoverBp] : null;
    const hoverFeatName = hoverFeature !== null ? features.find((f) => f.id === hoverFeature)?.label || null : null;
    const selSpan = selectionRange ? (selectionRange.end >= selectionRange.start
        ? selectionRange.end - selectionRange.start
        : seqLen - selectionRange.start + selectionRange.end) : 0;

    return (
        <div ref={containerRef} className="view-canvas-container">
            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleClick}
                style={{ cursor: "default" }}
            />
            <div className="zoom-controls">
                <button onClick={() => zoomBtn(1.4)}>+</button>
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <button onClick={() => zoomBtn(1 / 1.4)}>−</button>
                <button onClick={resetView} title="Reset">⟲</button>
            </div>
            <div className="status-bar">
                {selectionRange && selSpan > 0 ? (
                    <span>Selected: {selectionRange.start.toLocaleString()}–{selectionRange.end.toLocaleString()} ({selSpan.toLocaleString()} bp)</span>
                ) : hoverBp !== null ? (
                    <>
                        <span>Base {hoverBp.toLocaleString()}</span>
                        {hoverChar && <span className={`status-nt nt-${hoverChar}`}>{hoverChar}</span>}
                        {hoverFeatName && <span className="status-feat">· {hoverFeatName}</span>}
                    </>
                ) : (
                    <span>Scroll to rotate · Ctrl+scroll to zoom</span>
                )}
            </div>
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function getTickInterval(seqLen: number, zoom: number): number {
    const visibleBp = seqLen / zoom;
    if (visibleBp < 200) return 10;
    if (visibleBp < 500) return 25;
    if (visibleBp < 2000) return 100;
    if (visibleBp < 5000) return 250;
    if (visibleBp < 15000) return 500;
    if (visibleBp < 50000) return 1000;
    return 5000;
}

function formatBp(bp: number): string {
    if (bp >= 1000) return (bp / 1000).toFixed(bp % 1000 === 0 ? 0 : 1) + "k";
    return bp.toString();
}

function assignTracks(features: Feature[], seqLen: number) {
    const sorted = [...features].sort((a, b) => a.start - b.start);
    const result: { feature: Feature; track: number }[] = [];
    const trackEnds: number[] = [];
    for (const feat of sorted) {
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            if (feat.start >= trackEnds[t]) {
                result.push({ feature: feat, track: t });
                trackEnds[t] = feat.end;
                placed = true;
                break;
            }
        }
        if (!placed) {
            result.push({ feature: feat, track: trackEnds.length });
            trackEnds.push(feat.end);
        }
    }
    return result;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
}
