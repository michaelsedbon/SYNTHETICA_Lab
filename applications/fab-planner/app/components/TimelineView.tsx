"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { type PartData } from "./PartsTable";
import { type AllBadgeColors, getBadgeStyle } from "@/app/lib/badgeColors";

/* ─── types ───────────────────────────────────────────── */

interface StatusHistoryEntry {
    id: string;
    partId: string;
    status: string;
    changedAt: string;
}

/* ─── helpers ─────────────────────────────────────────── */

function daysBetween(a: Date, b: Date) {
    return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/** Clamp a date to [rangeStart, rangeEnd] and return a fraction 0-1 */
function dateToFrac(date: Date, rangeStart: Date, rangeEnd: Date) {
    const total = rangeEnd.getTime() - rangeStart.getTime();
    if (total <= 0) return 0;
    const pos = date.getTime() - rangeStart.getTime();
    return Math.max(0, Math.min(1, pos / total));
}

function fmtDate(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtDateTime(d: Date) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function startOfDay(d: Date) {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
}

/* ─── column ticks ────────────────────────────────────── */

function generateTicks(rangeStart: Date, rangeEnd: Date): { date: Date; label: string }[] {
    const days = daysBetween(rangeStart, rangeEnd);
    const ticks: { date: Date; label: string }[] = [];
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    let stepDays: number;
    if (days <= 14) stepDays = 1;
    else if (days <= 60) stepDays = 7;
    else if (days <= 180) stepDays = 14;
    else stepDays = 30;

    const cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
        ticks.push({ date: new Date(cur), label: fmt(cur) });
        cur.setDate(cur.getDate() + stepDays);
    }
    return ticks;
}

/* ─── status color ────────────────────────────────────── */

function statusColor(status: string, badgeColors: AllBadgeColors): string {
    const color = badgeColors.status[status?.toLowerCase()];
    return color || "#569cd6";
}

/* ─── Component ───────────────────────────────────────── */

interface TimelineViewProps {
    parts: PartData[];
    badgeColors: AllBadgeColors;
    onSelectPart: (part: PartData) => void;
    selectedPartId: string | null;
}

export default function TimelineView({ parts, badgeColors, onSelectPart, selectedPartId }: TimelineViewProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; part: PartData } | null>(null);
    const [statusHistory, setStatusHistory] = useState<Record<string, StatusHistoryEntry[]>>({});

    const today = useMemo(() => startOfDay(new Date()), []);

    /* Fetch status history for all visible parts */
    useEffect(() => {
        if (parts.length === 0) return;
        const partIds = parts.map((p) => p.id).join(",");
        fetch(`/api/status-history?partIds=${partIds}`)
            .then((res) => res.json())
            .then((data) => setStatusHistory(data))
            .catch(() => setStatusHistory({}));
    }, [parts]);

    /* Compute date range from data */
    const { rangeStart, rangeEnd } = useMemo(() => {
        let min = today;
        let max = today;
        for (const p of parts) {
            const created = startOfDay(new Date(p.createdAt));
            const due = p.dueDate ? startOfDay(new Date(p.dueDate)) : null;
            const completed = p.completedAt ? startOfDay(new Date(p.completedAt)) : null;
            if (created < min) min = created;
            if (due && due > max) max = due;
            if (completed && completed > max) max = completed;
        }
        // Add 7-day padding each side
        const start = new Date(min);
        start.setDate(start.getDate() - 7);
        const end = new Date(max);
        end.setDate(end.getDate() + 14);
        return { rangeStart: startOfDay(start), rangeEnd: startOfDay(end) };
    }, [parts, today]);

    const ticks = useMemo(() => generateTicks(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
    const todayFrac = dateToFrac(today, rangeStart, rangeEnd);

    /* Scroll to today on mount */
    useEffect(() => {
        if (scrollRef.current) {
            const totalWidth = scrollRef.current.scrollWidth;
            const visibleWidth = scrollRef.current.clientWidth;
            const scrollTo = todayFrac * totalWidth - visibleWidth / 3;
            scrollRef.current.scrollLeft = Math.max(0, scrollTo);
        }
    }, [todayFrac]);

    const ROW_HEIGHT = 36;
    const LABEL_WIDTH = 260;

    /* Build segments for a part from its status history */
    function buildSegments(part: PartData) {
        const history = statusHistory[part.id];
        const created = startOfDay(new Date(part.createdAt));
        const barEnd = part.completedAt
            ? startOfDay(new Date(part.completedAt))
            : part.dueDate
                ? startOfDay(new Date(part.dueDate))
                : today;

        // If no history, fall back to a single bar with current status color
        if (!history || history.length === 0) {
            return [{
                status: part.status,
                start: created,
                end: barEnd,
                color: statusColor(part.status, badgeColors),
            }];
        }

        const segments: { status: string; start: Date; end: Date; color: string }[] = [];
        for (let i = 0; i < history.length; i++) {
            const entry = history[i];
            const segStart = startOfDay(new Date(entry.changedAt));
            const segEnd = i < history.length - 1
                ? startOfDay(new Date(history[i + 1].changedAt))
                : barEnd;
            // Only show segments that have visible duration
            if (segEnd > segStart || i === history.length - 1) {
                segments.push({
                    status: entry.status,
                    start: segStart < created ? created : segStart,
                    end: segEnd > barEnd ? barEnd : segEnd,
                    color: statusColor(entry.status, badgeColors),
                });
            }
        }
        return segments;
    }

    return (
        <div className="timeline-container">
            {/* Fixed label column */}
            <div className="timeline-labels" style={{ width: LABEL_WIDTH }}>
                <div className="timeline-header-label">Part</div>
                {parts.map((p) => {
                    const accent = statusColor(p.status, badgeColors);
                    return (
                        <div
                            key={p.id}
                            className={`timeline-label-row ${selectedPartId === p.id ? "selected" : ""}`}
                            style={{ height: ROW_HEIGHT }}
                            onClick={() => onSelectPart(p)}
                        >
                            <span className="timeline-label-id" style={{ color: accent }}>{p.uniqueId}</span>
                            <span className="timeline-label-name">{p.partName}</span>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable chart area */}
            <div className="timeline-scroll" ref={scrollRef}>
                <div className="timeline-chart" style={{ minWidth: Math.max(800, ticks.length * 100) }}>
                    {/* Tick header */}
                    <div className="timeline-header-ticks">
                        {ticks.map((t, i) => (
                            <div
                                key={i}
                                className="timeline-tick-label"
                                style={{ left: `${dateToFrac(t.date, rangeStart, rangeEnd) * 100}%` }}
                            >
                                {t.label}
                            </div>
                        ))}
                    </div>

                    {/* Rows with segmented bars */}
                    {parts.map((p) => {
                        const created = startOfDay(new Date(p.createdAt));
                        const due = p.dueDate ? startOfDay(new Date(p.dueDate)) : null;
                        const completed = p.completedAt ? startOfDay(new Date(p.completedAt)) : null;
                        const isCompleted = !!completed;
                        const isOverdue = due && !isCompleted && today > due;
                        const completedLate = due && completed && completed > due;
                        const segments = buildSegments(p);

                        // Overdue extension: due → today (not completed)
                        let overdueLeftPct = 0;
                        let overdueWidthPct = 0;
                        if (isOverdue && due) {
                            overdueLeftPct = dateToFrac(due, rangeStart, rangeEnd) * 100;
                            overdueWidthPct = dateToFrac(today, rangeStart, rangeEnd) * 100 - overdueLeftPct;
                        }

                        // Completed late extension: due → completedAt
                        let lateLeftPct = 0;
                        let lateWidthPct = 0;
                        if (completedLate && due) {
                            lateLeftPct = dateToFrac(due, rangeStart, rangeEnd) * 100;
                            lateWidthPct = dateToFrac(completed!, rangeStart, rangeEnd) * 100 - lateLeftPct;
                        }

                        return (
                            <div
                                key={p.id}
                                className={`timeline-row ${selectedPartId === p.id ? "selected" : ""}`}
                                style={{ height: ROW_HEIGHT }}
                                onClick={() => onSelectPart(p)}
                            >
                                {/* Tick grid lines */}
                                {ticks.map((t, i) => (
                                    <div
                                        key={i}
                                        className="timeline-grid-line"
                                        style={{ left: `${dateToFrac(t.date, rangeStart, rangeEnd) * 100}%` }}
                                    />
                                ))}

                                {/* Status-segmented bars */}
                                {segments.map((seg, i) => {
                                    const leftPct = dateToFrac(seg.start, rangeStart, rangeEnd) * 100;
                                    const rightPct = dateToFrac(seg.end, rangeStart, rangeEnd) * 100;
                                    const widthPct = Math.max(0.3, rightPct - leftPct);
                                    const isFirst = i === 0;
                                    const isLast = i === segments.length - 1;

                                    return (
                                        <div
                                            key={i}
                                            className={`timeline-bar-segment ${isCompleted ? "completed" : ""} ${!due ? "no-deadline" : ""}`}
                                            style={{
                                                left: `${leftPct}%`,
                                                width: `${widthPct}%`,
                                                background: isCompleted
                                                    ? `linear-gradient(90deg, ${seg.color}44, ${seg.color}88)`
                                                    : `linear-gradient(90deg, ${seg.color}66, ${seg.color}cc)`,
                                                borderColor: seg.color,
                                                borderRadius: `${isFirst ? "4px" : "0"} ${isLast ? "4px" : "0"} ${isLast ? "4px" : "0"} ${isFirst ? "4px" : "0"}`,
                                                borderRight: isLast ? `1px solid ${seg.color}` : "none",
                                            }}
                                            onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, part: p })}
                                            onMouseLeave={() => setTooltip(null)}
                                        >
                                            {isLast && isCompleted && <span className="timeline-bar-check">✓</span>}
                                        </div>
                                    );
                                })}

                                {/* Overdue extension (red stripes) */}
                                {isOverdue && overdueWidthPct > 0 && (
                                    <div
                                        className="timeline-bar overdue"
                                        style={{
                                            left: `${overdueLeftPct}%`,
                                            width: `${overdueWidthPct}%`,
                                        }}
                                    />
                                )}

                                {/* Completed late extension (orange) */}
                                {completedLate && lateWidthPct > 0 && (
                                    <div
                                        className="timeline-bar late"
                                        style={{
                                            left: `${lateLeftPct}%`,
                                            width: `${lateWidthPct}%`,
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {/* Today line */}
                    <div
                        className="timeline-today-line"
                        style={{ left: `${todayFrac * 100}%` }}
                    >
                        <span className="timeline-today-label">Today</span>
                    </div>
                </div>
            </div>

            {/* Tooltip with status progression */}
            {tooltip && (
                <div
                    className="timeline-tooltip"
                    style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
                >
                    <strong>{tooltip.part.uniqueId}</strong> — {tooltip.part.partName}
                    <br />
                    <span>Created: {fmtDate(new Date(tooltip.part.createdAt))}</span>
                    {tooltip.part.dueDate && <><br /><span>Due: {fmtDate(new Date(tooltip.part.dueDate))}</span></>}
                    {tooltip.part.completedAt && <><br /><span>Completed: {fmtDate(new Date(tooltip.part.completedAt))}</span></>}
                    {tooltip.part.dueDate && !tooltip.part.completedAt && new Date(tooltip.part.dueDate) < today && (
                        <><br /><span style={{ color: "#f44747" }}>⚠ Overdue by {Math.floor(daysBetween(new Date(tooltip.part.dueDate), today))} days</span></>
                    )}

                    {/* Status progression */}
                    {statusHistory[tooltip.part.id] && statusHistory[tooltip.part.id].length > 1 && (
                        <div className="timeline-tooltip-history">
                            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>Status history:</span>
                            {statusHistory[tooltip.part.id].map((entry, i) => (
                                <div key={i} className="timeline-tooltip-history-item">
                                    <span
                                        className="timeline-tooltip-dot"
                                        style={{ background: statusColor(entry.status, badgeColors) }}
                                    />
                                    <span style={{ textTransform: "capitalize" }}>{entry.status}</span>
                                    <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>
                                        {fmtDateTime(new Date(entry.changedAt))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
