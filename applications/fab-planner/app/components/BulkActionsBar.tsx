"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/button";

interface BulkActionsBarProps {
    selectedCount: number;
    statuses: string[];
    projects: { id: string; name: string }[];
    onStatusChange: (status: string) => void;
    onProjectChange: (projectId: string | null) => void;
    onDelete: () => void;
    onDeselect: () => void;
}

export default function BulkActionsBar({
    selectedCount,
    statuses,
    projects,
    onStatusChange,
    onProjectChange,
    onDelete,
    onDeselect,
}: BulkActionsBarProps) {
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);

    if (selectedCount < 2) return null;

    return (
        <div className="bulk-actions-bar">
            <div className="bulk-actions-left">
                <span className="bulk-count">{selectedCount} selected</span>
                <Button variant="ghost" size="icon-xs" onClick={onDeselect} title="Deselect all" className="btn-bulk-deselect">
                    ✕
                </Button>
            </div>
            <div className="bulk-actions-right">
                {/* Status dropdown */}
                <div className="bulk-dropdown-wrapper">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setShowStatusDropdown(!showStatusDropdown); setShowProjectDropdown(false); }}
                    >
                        Status ▾
                    </Button>
                    {showStatusDropdown && (
                        <div className="bulk-dropdown">
                            {statuses.map((s) => (
                                <button
                                    key={s}
                                    className="bulk-dropdown-item"
                                    onClick={() => {
                                        onStatusChange(s);
                                        setShowStatusDropdown(false);
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Project dropdown */}
                <div className="bulk-dropdown-wrapper">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setShowProjectDropdown(!showProjectDropdown); setShowStatusDropdown(false); }}
                    >
                        Project ▾
                    </Button>
                    {showProjectDropdown && (
                        <div className="bulk-dropdown">
                            <button
                                className="bulk-dropdown-item"
                                onClick={() => {
                                    onProjectChange(null);
                                    setShowProjectDropdown(false);
                                }}
                            >
                                — None —
                            </button>
                            {projects.map((p) => (
                                <button
                                    key={p.id}
                                    className="bulk-dropdown-item"
                                    onClick={() => {
                                        onProjectChange(p.id);
                                        setShowProjectDropdown(false);
                                    }}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete */}
                <Button variant="destructive" size="sm" onClick={onDelete}>
                    🗑 Delete
                </Button>
            </div>
        </div>
    );
}
