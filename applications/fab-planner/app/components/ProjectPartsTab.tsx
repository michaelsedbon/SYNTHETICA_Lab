"use client";

import { useState, useMemo } from "react";
import type { PartData } from "./PartsTable";
import { Badge } from "@/app/components/ui/badge";

interface ProjectPartsTabProps {
    projectName: string;
    projectId: string;
    parts: PartData[];
    onSelectPart: (partId: string) => void;
    selectedPartId: string | null;
}

const DONE_STATUSES = ["complete", "done"];

export default function ProjectPartsTab({
    projectName,
    projectId,
    parts,
    onSelectPart,
    selectedPartId,
}: ProjectPartsTabProps) {
    const [hideCompleted, setHideCompleted] = useState(false);

    const projectParts = useMemo(() => {
        let filtered = parts.filter((p) => p.projectId === projectId);
        if (hideCompleted) {
            filtered = filtered.filter((p) => !DONE_STATUSES.includes(p.status.toLowerCase()));
        }
        return filtered;
    }, [parts, projectId, hideCompleted]);

    function getStatusBadgeClass(status: string): string {
        const s = status.toLowerCase();
        if (s.includes("new") || s.includes("pending")) return "badge badge-new";
        if (s.includes("design")) return "badge badge-design";
        if (s.includes("manufactur") || s.includes("cnc")) return "badge badge-manufacturing";
        if (s.includes("review") || s.includes("qa")) return "badge badge-review";
        if (s.includes("complete") || s.includes("done")) return "badge badge-complete";
        if (s.includes("urgent")) return "badge badge-urgent";
        return "badge badge-new";
    }

    return (
        <div className="project-parts-tab">
            <div className="project-tab-header">
                <h3>★ {projectName}</h3>
                <label className="toggle-completed">
                    <input
                        type="checkbox"
                        checked={hideCompleted}
                        onChange={(e) => setHideCompleted(e.target.checked)}
                    />
                    Hide completed
                </label>
            </div>

            <div className="project-tab-body">
                {projectParts.length === 0 ? (
                    <div className="tree-empty" style={{ padding: 20 }}>
                        <p>{hideCompleted ? "No pending parts in this project" : "No parts assigned to this project"}</p>
                    </div>
                ) : (
                    <div className="project-parts-list">
                        {projectParts.map((part) => (
                            <div
                                key={part.id}
                                className={`project-part-row ${part.id === selectedPartId ? "selected" : ""}`}
                                onClick={() => onSelectPart(part.id)}
                            >
                                <span className="part-uid">{part.uniqueId}</span>
                                <span className="part-name-cell">{part.partName}</span>
                                <Badge className={getStatusBadgeClass(part.status)}>{part.status}</Badge>
                                <span className="part-material">{part.material || "—"}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
