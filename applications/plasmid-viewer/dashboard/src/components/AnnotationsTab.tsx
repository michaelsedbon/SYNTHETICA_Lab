"use client";

import React, { useState, useMemo } from "react";
import { Feature } from "@/lib/api";
import { Search, ArrowUpDown } from "lucide-react";

interface Props {
    features: Feature[];
    selectedFeatureId: number | null;
    onSelectFeature: (id: number | null) => void;
}

type SortKey = "label" | "type" | "start" | "length";
type SortDir = "asc" | "desc";

export default function AnnotationsTab({
    features,
    selectedFeatureId,
    onSelectFeature,
}: Props) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("start");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        let list = features.filter(
            (f) =>
                !q ||
                f.label.toLowerCase().includes(q) ||
                f.type.toLowerCase().includes(q)
        );

        list.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case "label":
                    cmp = (a.label || "").localeCompare(b.label || "");
                    break;
                case "type":
                    cmp = a.type.localeCompare(b.type);
                    break;
                case "start":
                    cmp = a.start - b.start;
                    break;
                case "length": {
                    const lenA = a.end > a.start ? a.end - a.start : a.end + 1;
                    const lenB = b.end > b.start ? b.end - b.start : b.end + 1;
                    cmp = lenA - lenB;
                    break;
                }
            }
            return sortDir === "asc" ? cmp : -cmp;
        });

        return list;
    }, [features, search, sortKey, sortDir]);

    if (features.length === 0) {
        return (
            <div className="empty-state">
                <span className="empty-text">No annotations</span>
            </div>
        );
    }

    return (
        <div className="annotations-tab">
            {/* Search bar */}
            <div className="ann-search">
                <Search size={14} className="ann-search-icon" />
                <input
                    type="text"
                    placeholder="Search annotations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ann-search-input"
                />
                <span className="ann-count">{filtered.length}</span>
            </div>

            {/* Table */}
            <div className="ann-table-wrap">
                <table className="ann-table">
                    <thead>
                        <tr>
                            <th style={{ width: 8 }}></th>
                            <th onClick={() => toggleSort("label")} className="ann-th-sortable">
                                Name <SortIcon active={sortKey === "label"} dir={sortDir} />
                            </th>
                            <th onClick={() => toggleSort("type")} className="ann-th-sortable">
                                Type <SortIcon active={sortKey === "type"} dir={sortDir} />
                            </th>
                            <th onClick={() => toggleSort("start")} className="ann-th-sortable">
                                Range <SortIcon active={sortKey === "start"} dir={sortDir} />
                            </th>
                            <th>Strand</th>
                            <th onClick={() => toggleSort("length")} className="ann-th-sortable">
                                Length <SortIcon active={sortKey === "length"} dir={sortDir} />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((f) => {
                            const isSelected = f.id === selectedFeatureId;
                            const len = f.end > f.start ? f.end - f.start : f.end + 1;
                            return (
                                <tr
                                    key={f.id}
                                    className={`ann-row ${isSelected ? "selected" : ""}`}
                                    onClick={() => onSelectFeature(f.id)}
                                >
                                    <td>
                                        <span
                                            className="ann-swatch"
                                            style={{ background: f.color }}
                                        />
                                    </td>
                                    <td className="ann-name">{f.label || "—"}</td>
                                    <td className="ann-type">{f.type}</td>
                                    <td className="ann-range">
                                        {f.start.toLocaleString()}–{f.end.toLocaleString()}
                                    </td>
                                    <td className="ann-strand">
                                        {f.strand === 1 ? "→" : "←"}
                                    </td>
                                    <td className="ann-len">{len.toLocaleString()} bp</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
    if (!active) return <ArrowUpDown size={10} style={{ opacity: 0.3, marginLeft: 4 }} />;
    return (
        <span style={{ marginLeft: 4, fontSize: 10 }}>
            {dir === "asc" ? "↑" : "↓"}
        </span>
    );
}
