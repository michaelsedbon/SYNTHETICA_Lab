"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Feature } from "@/lib/api";

interface Props {
    sequence: string;
    features: Feature[];
    topology: string;
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
}

/* ── Constants ─────────────────────────────────────────────────────── */

const BACKBONE_COLOR = "#444458";
const BACKBONE_WIDTH = 2;
const TICK_COLOR = "#3a3a4a";
const LABEL_COLOR = "#b0b0c8";
const SEQ_COLORS: Record<string, string> = {
    A: "#5CB85C", T: "#D9534F", G: "#F0AD4E", C: "#4A90D9",
};

// Track thickness by feature type (Geneious-style: CDS thick, misc thin)
const TRACK_THICK: Record<string, number> = {
    CDS: 16, gene: 16, mRNA: 14,
    promoter: 10, terminator: 10, RBS: 8,
    rep_origin: 12, primer_bind: 6,
};
const TRACK_DEFAULT = 10;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 50;
const ROTATE_SPEED = 0.0015; // radians per px of scroll

/* ── Component ─────────────────────────────────────────────────────── */

export default function PlasmidMap({
    sequence,
    features,
    topology,
    selectedFeatureId,
    onSelectFeature,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // View state — stored in refs for smooth animation, mirrored to state for re-renders
    const zoomRef = useRef(1);
    const rotationRef = useRef(0);
    const panRef = useRef({ x: 0, y: 0 }); // offset from natural center

    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [size, setSize] = useState({ w: 800, h: 600 });
    const [hoverFeature, setHoverFeature] = useState<number | null>(null);
    const [hoverBp, setHoverBp] = useState<number | null>(null);

    const seqLen = sequence.length;

    /* ── Resize observer ── */
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

    /* ── Compute layout params ── */
    const getLayout = useCallback(() => {
        const cx = size.w / 2 + panRef.current.x;
        const cy = size.h / 2 + panRef.current.y;
        const naturalR = Math.min(size.w, size.h) * 0.38;
        const r = naturalR * zoomRef.current;
        return { cx, cy, r };
    }, [size]);

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

        /* ── Feature arcs (Geneious-style filled shapes) ── */
        const tracks = assignTracks(features, seqLen);

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

            // Determine if this feature type gets a directional arrow
            const isDirectional = ["CDS", "gene", "mRNA", "promoter", "primer_bind"].includes(feature.type);

            if (isDirectional) {
                // Draw filled arc with arrowhead
                const arrowAngle = Math.min(0.08, (endAngle - startAngle) * 0.25);
                const tipAngle = feature.strand === 1 ? endAngle : startAngle;
                const bodyEnd = feature.strand === 1 ? endAngle - arrowAngle : startAngle + arrowAngle;

                ctx.beginPath();
                if (feature.strand === 1) {
                    ctx.arc(cx, cy, outerR, startAngle, bodyEnd);
                    // Arrow tip
                    ctx.lineTo(
                        cx + Math.cos(tipAngle) * featureR,
                        cy + Math.sin(tipAngle) * featureR
                    );
                    ctx.arc(cx, cy, innerR, bodyEnd, startAngle, true);
                } else {
                    ctx.arc(cx, cy, outerR, bodyEnd, endAngle);
                    ctx.arc(cx, cy, innerR, endAngle, bodyEnd, true);
                    // Arrow tip
                    ctx.lineTo(
                        cx + Math.cos(tipAngle) * featureR,
                        cy + Math.sin(tipAngle) * featureR
                    );
                }
                ctx.closePath();
                ctx.fillStyle = feature.color;
                ctx.fill();
            } else {
                // Non-directional: filled arc band (terminator, rep_origin, misc, etc.)
                ctx.beginPath();
                ctx.arc(cx, cy, outerR, startAngle, endAngle);
                ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
                ctx.closePath();
                ctx.fillStyle = feature.color;
                ctx.fill();
            }

            // Selection border
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

            // ── Label (positioned OUTSIDE the backbone ring) ──
            if (feature.label) {
                const midAngle = (startAngle + endAngle) / 2;
                const labelR = r + 28;
                const lx = cx + Math.cos(midAngle) * labelR;
                const ly = cy + Math.sin(midAngle) * labelR;

                // Leader line from outer arc to label
                const lineStartR = outerR + 2;
                const lineEndR = labelR - 6;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(midAngle) * lineStartR, cy + Math.sin(midAngle) * lineStartR);
                ctx.lineTo(cx + Math.cos(midAngle) * lineEndR, cy + Math.sin(midAngle) * lineEndR);
                ctx.strokeStyle = feature.color;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.globalAlpha = 1;

                ctx.save();
                ctx.translate(lx, ly);
                const textAngle = midAngle + Math.PI / 2;
                // Flip text if upside-down
                const normMid = ((midAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                const flip = normMid > Math.PI / 2 && normMid < (3 * Math.PI) / 2;
                ctx.rotate(flip ? textAngle + Math.PI : textAngle);
                ctx.font = `${isSelected ? "600" : "400"} 11px Inter, sans-serif`;
                ctx.fillStyle = isSelected ? "#fff" : LABEL_COLOR;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(feature.label, 0, 0);
                ctx.restore();
            }
        });

        /* ── Sequence letters (high zoom) ── */
        if (z > 6 && r > 100) {
            const arcPerBp = (Math.PI * 2) / seqLen;
            const fontSize = Math.min(14, r * arcPerBp * 0.7);
            if (fontSize > 3) {
                // Only render visible arc
                for (let i = 0; i < seqLen; i++) {
                    const angle = bpToAngle(i);
                    const px = cx + Math.cos(angle) * r;
                    const py = cy + Math.sin(angle) * r;
                    // Cull off-screen
                    if (px < -20 || px > size.w + 20 || py < -20 || py > size.h + 20) continue;

                    const char = sequence[i];
                    ctx.save();
                    ctx.translate(px, py);
                    ctx.rotate(angle + Math.PI / 2);
                    ctx.font = `${fontSize}px JetBrains Mono, Menlo, monospace`;
                    ctx.fillStyle = SEQ_COLORS[char] || "#888";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(char, 0, 0);
                    ctx.restore();
                }
            }
        }

        /* ── Center text ── */
        // Only show when center is visible
        if (cx > -100 && cx < size.w + 100 && cy > -100 && cy < size.h + 100) {
            ctx.font = "600 14px Inter, sans-serif";
            ctx.fillStyle = "#e0e0e8";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${seqLen.toLocaleString()} bp`, cx, cy - 8);
            ctx.font = "400 11px Inter, sans-serif";
            ctx.fillStyle = "#6a6a7a";
            ctx.fillText(topology, cx, cy + 10);
        }

        /* ── Selection tooltip (bp length) ── */
        if (selectedFeatureId !== null) {
            const selFeat = features.find((f) => f.id === selectedFeatureId);
            if (selFeat) {
                const midAngle = (bpToAngle(selFeat.start) + bpToAngle(selFeat.end)) / 2;
                const tipR = r - 8 - 18 * 0 - 28; // just inside
                const tipX = cx + Math.cos(midAngle) * tipR;
                const tipY = cy + Math.sin(midAngle) * tipR;
                if (tipR > 20) {
                    const spanBp = selFeat.end > selFeat.start
                        ? selFeat.end - selFeat.start
                        : seqLen - selFeat.start + selFeat.end;
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
    }, [sequence, features, zoom, rotation, pan, size, selectedFeatureId, hoverFeature, bpToAngle, seqLen, topology, getLayout]);

    /* ── MOUSE: scroll=rotate, ctrl+scroll=zoom toward cursor ── */
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
            // ── Zoom toward cursor ──
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const factor = e.deltaY > 0 ? 1 / 1.08 : 1.08;
            const oldZ = zoomRef.current;
            const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor));
            const scale = newZ / oldZ;

            // Zoom toward mouse: shift pan so the point under cursor stays fixed
            const oldCx = size.w / 2 + panRef.current.x;
            const oldCy = size.h / 2 + panRef.current.y;
            const newPanX = mx - scale * (mx - oldCx) - size.w / 2;
            const newPanY = my - scale * (my - oldCy) - size.h / 2;

            zoomRef.current = newZ;
            panRef.current = { x: newPanX, y: newPanY };
            setZoom(newZ);
            setPan({ x: newPanX, y: newPanY });
        } else {
            // ── Rotate ──
            const delta = e.deltaY * ROTATE_SPEED;
            rotationRef.current += delta;
            setRotation(rotationRef.current);
        }
    }, [size]);

    /* ── MOUSE: hover for hit-testing (no drag) ── */
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

            // Compute hover bp
            let angleDelta = mouseAngle - (-Math.PI / 2 + rotationRef.current);
            angleDelta = ((angleDelta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const bp = Math.round((angleDelta / (Math.PI * 2)) * seqLen) % seqLen;
            setHoverBp(Math.abs(dist - r) < r * 0.3 ? bp : null);

            // Hit test features
            const tracks = assignTracks(features, seqLen);
            let found: number | null = null;
            for (const { feature, track } of tracks) {
                const thickness = TRACK_THICK[feature.type] || TRACK_DEFAULT;
                const featureR = r - 8 - track * 21;
                const halfT = thickness / 2 + 3; // generous hit zone
                if (Math.abs(dist - featureR) < halfT) {
                    const startAngle = bpToAngle(feature.start);
                    const endAngle = bpToAngle(feature.end);
                    let normM = ((mouseAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    let normS = ((startAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    let normE = ((endAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                    const hit = normS <= normE
                        ? normM >= normS && normM <= normE
                        : normM >= normS || normM <= normE;
                    if (hit) { found = feature.id; break; }
                }
            }
            setHoverFeature(found);
            canvas.style.cursor = found ? "pointer" : "default";
        },
        [features, seqLen, bpToAngle, getLayout]
    );

    const handleClick = useCallback(() => {
        onSelectFeature(hoverFeature);
    }, [hoverFeature, onSelectFeature]);

    /* ── Zoom buttons ── */
    const zoomTo = (factor: number) => {
        const oldZ = zoomRef.current;
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldZ * factor));
        // Zoom toward center of viewport
        const scale = newZ / oldZ;
        const cx = size.w / 2 + panRef.current.x;
        const cy = size.h / 2 + panRef.current.y;
        const mx = size.w / 2;
        const my = size.h / 2;
        const newPanX = mx - scale * (mx - cx) - size.w / 2;
        const newPanY = my - scale * (my - cy) - size.h / 2;
        zoomRef.current = newZ;
        panRef.current = { x: newPanX, y: newPanY };
        setZoom(newZ);
        setPan({ x: newPanX, y: newPanY });
    };

    const resetView = () => {
        zoomRef.current = 1;
        rotationRef.current = 0;
        panRef.current = { x: 0, y: 0 };
        setZoom(1);
        setRotation(0);
        setPan({ x: 0, y: 0 });
    };

    /* ── Status bar info ── */
    const hoverChar = hoverBp !== null ? sequence[hoverBp] : null;
    const hoverFeatName = hoverFeature !== null
        ? features.find((f) => f.id === hoverFeature)?.label || null
        : null;

    return (
        <div ref={containerRef} className="view-canvas-container">
            <canvas
                ref={canvasRef}
                onWheel={handleWheel}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                style={{ cursor: "default" }}
            />

            {/* Zoom controls */}
            <div className="zoom-controls">
                <button onClick={() => zoomTo(1.4)}>+</button>
                <span className="zoom-label">{Math.round(zoom * 100)}%</span>
                <button onClick={() => zoomTo(1 / 1.4)}>−</button>
                <button onClick={resetView} title="Reset">⟲</button>
            </div>

            {/* Status bar */}
            <div className="status-bar">
                {hoverBp !== null ? (
                    <>
                        <span>Base {hoverBp.toLocaleString()}</span>
                        {hoverChar && (
                            <span className={`status-nt nt-${hoverChar}`}>{hoverChar}</span>
                        )}
                        {hoverFeatName && (
                            <span className="status-feat">· {hoverFeatName}</span>
                        )}
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
