"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface DxfViewerProps {
    fileUrl: string | null;
}

interface DxfVertex {
    x: number;
    y: number;
    bulge?: number;
}

interface DxfEntity {
    type: string;
    vertices?: DxfVertex[];
    center?: { x: number; y: number };
    radius?: number;
    startAngle?: number;
    endAngle?: number;
    startPoint?: { x: number; y: number };
    endPoint?: { x: number; y: number };
    majorAxisEndPoint?: { x: number; y: number };
    axisRatio?: number;
    shape?: boolean;
    colorIndex?: number;
    layer?: string;
}

/**
 * Convert a bulge value between two points into arc parameters.
 * Bulge = tan(included_angle / 4). Positive = CCW, negative = CW.
 */
function bulgeToArc(p1: DxfVertex, p2: DxfVertex, bulge: number) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const chordLen = Math.sqrt(dx * dx + dy * dy);
    if (chordLen < 1e-10) return null;

    const sagitta = Math.abs(bulge) * chordLen / 2;
    const radius = (chordLen * chordLen / 4 + sagitta * sagitta) / (2 * sagitta);

    // Midpoint of chord
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;

    // Unit normal to chord (perpendicular)
    const nx = -dy / chordLen;
    const ny = dx / chordLen;

    // Distance from midpoint to center
    const d = radius - sagitta;
    // Center is on the opposite side of the bulge sign
    const sign = bulge > 0 ? 1 : -1;
    const cx = mx + sign * d * nx;
    const cy = my + sign * d * ny;

    // Start and end angles
    let startAngle = Math.atan2(p1.y - cy, p1.x - cx);
    let endAngle = Math.atan2(p2.y - cy, p2.x - cx);

    // bulge > 0 → CCW arc, bulge < 0 → CW arc
    const counterClockwise = bulge > 0;

    return { cx, cy, radius, startAngle, endAngle, counterClockwise };
}

interface DxfData {
    entities: DxfEntity[];
}

// Color index mapping (simplified AutoCAD ACI colors)
const ACI_COLORS: Record<number, string> = {
    0: "#ffffff", 1: "#ff0000", 2: "#ffff00", 3: "#00ff00",
    4: "#00ffff", 5: "#0000ff", 6: "#ff00ff", 7: "#ffffff",
    8: "#808080", 9: "#c0c0c0",
};

function getEntityColor(entity: DxfEntity): string {
    if (entity.colorIndex !== undefined && ACI_COLORS[entity.colorIndex]) {
        return ACI_COLORS[entity.colorIndex];
    }
    return "#00ccff"; // Default bright cyan for visibility on dark bg
}

export default function DxfViewer({ fileUrl }: DxfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dxfData, setDxfData] = useState<DxfData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0 });
    const offsetStart = useRef({ x: 0, y: 0 });

    // Bounds for auto-fit
    const boundsRef = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

    // Parse DXF file
    useEffect(() => {
        if (!fileUrl) return;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await fetch(fileUrl);
                if (!res.ok) throw new Error("Failed to fetch DXF file");
                const text = await res.text();
                // Dynamic import to avoid SSR issues
                const DxfParser = (await import("dxf-parser")).default;
                const parser = new DxfParser();
                const parsed = parser.parseSync(text);
                if (!parsed) throw new Error("Failed to parse DXF file");
                setDxfData(parsed as unknown as DxfData);
            } catch (err) {
                console.error("DXF parse error:", err);
                setError(err instanceof Error ? err.message : "Failed to parse DXF");
            } finally {
                setLoading(false);
            }
        })();
    }, [fileUrl]);

    // Compute bounds from entities
    const computeBounds = useCallback((entities: DxfEntity[]) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const expandPoint = (x: number, y: number) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        };

        for (const entity of entities) {
            switch (entity.type) {
                case "LINE":
                    if (entity.vertices && entity.vertices.length >= 2) {
                        expandPoint(entity.vertices[0].x, entity.vertices[0].y);
                        expandPoint(entity.vertices[1].x, entity.vertices[1].y);
                    }
                    break;
                case "CIRCLE":
                    if (entity.center && entity.radius) {
                        expandPoint(entity.center.x - entity.radius, entity.center.y - entity.radius);
                        expandPoint(entity.center.x + entity.radius, entity.center.y + entity.radius);
                    }
                    break;
                case "ARC":
                    if (entity.center && entity.radius) {
                        expandPoint(entity.center.x - entity.radius, entity.center.y - entity.radius);
                        expandPoint(entity.center.x + entity.radius, entity.center.y + entity.radius);
                    }
                    break;
                case "LWPOLYLINE":
                case "POLYLINE":
                    if (entity.vertices) {
                        const verts = entity.vertices;
                        const len = verts.length;
                        for (let i = 0; i < len; i++) {
                            expandPoint(verts[i].x, verts[i].y);
                            // If this vertex has a bulge, expand for the arc
                            if (verts[i].bulge && Math.abs(verts[i].bulge!) > 1e-6) {
                                const next = verts[(i + 1) % len];
                                const arc = bulgeToArc(verts[i], next, verts[i].bulge!);
                                if (arc) {
                                    expandPoint(arc.cx - arc.radius, arc.cy - arc.radius);
                                    expandPoint(arc.cx + arc.radius, arc.cy + arc.radius);
                                }
                            }
                        }
                    }
                    break;
                case "ELLIPSE":
                    if (entity.center && entity.majorAxisEndPoint) {
                        const r = Math.max(
                            Math.sqrt(entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2),
                            (entity.axisRatio || 1) * Math.sqrt(entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2)
                        );
                        expandPoint(entity.center.x - r, entity.center.y - r);
                        expandPoint(entity.center.x + r, entity.center.y + r);
                    }
                    break;
                case "POINT":
                    if (entity.vertices && entity.vertices.length > 0) {
                        expandPoint(entity.vertices[0].x, entity.vertices[0].y);
                    }
                    break;
                case "SPLINE":
                    if (entity.vertices) {
                        for (const v of entity.vertices) {
                            expandPoint(v.x, v.y);
                        }
                    }
                    break;
            }
        }

        if (minX === Infinity) {
            minX = minY = 0;
            maxX = maxY = 100;
        }

        boundsRef.current = { minX, maxX, minY, maxY };
        return { minX, maxX, minY, maxY };
    }, []);

    // Fit to view
    const fitToView = useCallback(() => {
        if (!dxfData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const { minX, maxX, minY, maxY } = boundsRef.current;
        const dxfWidth = maxX - minX || 1;
        const dxfHeight = maxY - minY || 1;
        const padding = 40;
        const scaleX = (canvas.width - padding * 2) / dxfWidth;
        const scaleY = (canvas.height - padding * 2) / dxfHeight;
        const newScale = Math.min(scaleX, scaleY);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        setScale(newScale);
        setOffset({
            x: canvas.width / 2 - centerX * newScale,
            y: canvas.height / 2 + centerY * newScale, // flip Y
        });
    }, [dxfData]);

    // Draw entities
    const draw = useCallback(() => {
        if (!canvasRef.current || !dxfData) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size to container
        const container = containerRef.current;
        if (container) {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(offset.x, offset.y);
        ctx.scale(scale, -scale); // Flip Y axis for DXF coordinate system

        for (const entity of dxfData.entities) {
            ctx.strokeStyle = getEntityColor(entity);
            ctx.lineWidth = 1 / scale; // Keep line width consistent regardless of zoom
            ctx.beginPath();

            switch (entity.type) {
                case "LINE":
                    if (entity.vertices && entity.vertices.length >= 2) {
                        ctx.moveTo(entity.vertices[0].x, entity.vertices[0].y);
                        ctx.lineTo(entity.vertices[1].x, entity.vertices[1].y);
                    }
                    break;

                case "CIRCLE":
                    if (entity.center && entity.radius) {
                        ctx.arc(entity.center.x, entity.center.y, entity.radius, 0, Math.PI * 2);
                    }
                    break;

                case "ARC":
                    if (entity.center && entity.radius) {
                        const startAngle = ((entity.startAngle || 0) * Math.PI) / 180;
                        const endAngle = ((entity.endAngle || 360) * Math.PI) / 180;
                        // DXF arcs go counter-clockwise, but Y is flipped so we go clockwise
                        ctx.arc(entity.center.x, entity.center.y, entity.radius, startAngle, endAngle);
                    }
                    break;

                case "LWPOLYLINE":
                case "POLYLINE":
                    if (entity.vertices && entity.vertices.length > 0) {
                        const verts = entity.vertices;
                        const len = verts.length;
                        ctx.moveTo(verts[0].x, verts[0].y);
                        for (let i = 0; i < len; i++) {
                            const curr = verts[i];
                            const nextIdx = (i + 1) % len;
                            // Skip the closing segment if not a closed shape
                            if (nextIdx === 0 && !entity.shape) break;
                            const next = verts[nextIdx];

                            if (curr.bulge && Math.abs(curr.bulge) > 1e-6) {
                                // Draw arc segment
                                const arc = bulgeToArc(curr, next, curr.bulge);
                                if (arc) {
                                    ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle, !arc.counterClockwise);
                                } else {
                                    ctx.lineTo(next.x, next.y);
                                }
                            } else {
                                // Straight line segment
                                ctx.lineTo(next.x, next.y);
                            }
                        }
                    }
                    break;

                case "ELLIPSE":
                    if (entity.center && entity.majorAxisEndPoint) {
                        const majorLength = Math.sqrt(
                            entity.majorAxisEndPoint.x ** 2 + entity.majorAxisEndPoint.y ** 2
                        );
                        const minorLength = majorLength * (entity.axisRatio || 1);
                        const rotation = Math.atan2(entity.majorAxisEndPoint.y, entity.majorAxisEndPoint.x);
                        const startAngle = entity.startAngle || 0;
                        const endAngle = entity.endAngle || Math.PI * 2;
                        ctx.ellipse(
                            entity.center.x, entity.center.y,
                            majorLength, minorLength,
                            rotation, startAngle, endAngle
                        );
                    }
                    break;

                case "SPLINE":
                    if (entity.vertices && entity.vertices.length > 0) {
                        ctx.moveTo(entity.vertices[0].x, entity.vertices[0].y);
                        if (entity.vertices.length === 2) {
                            ctx.lineTo(entity.vertices[1].x, entity.vertices[1].y);
                        } else {
                            for (let i = 1; i < entity.vertices.length - 1; i++) {
                                const xc = (entity.vertices[i].x + entity.vertices[i + 1].x) / 2;
                                const yc = (entity.vertices[i].y + entity.vertices[i + 1].y) / 2;
                                ctx.quadraticCurveTo(entity.vertices[i].x, entity.vertices[i].y, xc, yc);
                            }
                            const last = entity.vertices[entity.vertices.length - 1];
                            ctx.lineTo(last.x, last.y);
                        }
                    }
                    break;

                case "POINT":
                    if (entity.vertices && entity.vertices.length > 0) {
                        const r = 2 / scale;
                        ctx.arc(entity.vertices[0].x, entity.vertices[0].y, r, 0, Math.PI * 2);
                        ctx.fillStyle = getEntityColor(entity);
                        ctx.fill();
                    }
                    break;
            }
            ctx.stroke();
        }

        ctx.restore();
    }, [dxfData, scale, offset]);

    // Initial fit when data loads
    useEffect(() => {
        if (dxfData) {
            computeBounds(dxfData.entities);
            fitToView();
        }
    }, [dxfData, computeBounds, fitToView]);

    // Redraw on scale/offset change
    useEffect(() => {
        draw();
    }, [draw]);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        setScale(prev => {
            const newScale = prev * factor;
            setOffset(prevOffset => ({
                x: mouseX - (mouseX - prevOffset.x) * factor,
                y: mouseY - (mouseY - prevOffset.y) * factor,
            }));
            return newScale;
        });
    }, []);

    // Pan handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        offsetStart.current = { ...offset };
    }, [offset]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        setOffset({
            x: offsetStart.current.x + (e.clientX - panStart.current.x),
            y: offsetStart.current.y + (e.clientY - panStart.current.y),
        });
    }, [isPanning]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const zoomIn = () => {
        setScale(prev => prev * 1.3);
    };

    const zoomOut = () => {
        setScale(prev => prev / 1.3);
    };

    if (!fileUrl) {
        return (
            <div className="viewer-container">
                <div className="viewer-placeholder">
                    <div className="icon">✂️</div>
                    <p>No laser cutting file uploaded yet</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="viewer-container">
                <div className="viewer-placeholder">
                    <div className="icon">⏳</div>
                    <p>Loading DXF file...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="viewer-container">
                <div className="viewer-placeholder">
                    <div className="icon">⚠️</div>
                    <p>Error: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="viewer-container dxf-viewer-container">
            <div className="drawing-viewer-controls">
                <button onClick={zoomIn} title="Zoom In">🔍+</button>
                <button onClick={zoomOut} title="Zoom Out">🔍−</button>
                <button onClick={fitToView} title="Fit to View">⊞ Fit</button>
                {dxfData && (
                    <span className="viewer-entity-count">
                        {dxfData.entities.length} entities
                    </span>
                )}
            </div>
            <div
                ref={containerRef}
                className="dxf-canvas-wrapper"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isPanning ? "grabbing" : "grab" }}
            >
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}
