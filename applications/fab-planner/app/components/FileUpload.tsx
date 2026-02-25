"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/app/components/ui/button";

interface FileUploadProps {
    partId: string;
    onUploadComplete: () => void;
    customStages?: string[];
    onAddCustomStage?: (name: string) => void;
}

const BUILT_IN_STAGES = [
    { key: "design", label: "🎨 Design", icon: "🎨" },
    { key: "solidworks", label: "🔩 SolidWorks", icon: "🔩" },
    { key: "cnc_program", label: "🔧 CNC Program", icon: "🔧" },
    { key: "2d_drawing", label: "📐 2D Drawing", icon: "📐" },
    { key: "laser_cutting", label: "✂️ Laser Cutting", icon: "✂️" },
    { key: "document", label: "📄 Document", icon: "📄" },
];

// Accepted file types per stage
const STAGE_ACCEPT: Record<string, string> = {
    design: ".stl,.step,.stp,.obj,.3mf,.fbx",
    solidworks: ".sldprt,.sldasm,.slddrw,.step,.stp,.x_t,.x_b,.igs,.iges",
    cnc_program: ".gcode,.nc,.ngc,.tap,.iso",
    "2d_drawing": ".pdf,.dxf,.dwg,.svg,.png,.jpg,.jpeg",
    laser_cutting: ".dxf,.svg,.ai,.pdf",
    document: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md",
};

const STAGE_FILE_HINT: Record<string, string> = {
    design: "STL, STEP, STP, OBJ, 3MF, FBX",
    solidworks: "SLDPRT, SLDASM, STEP, STP, X_T, IGS",
    cnc_program: "GCODE, NC, NGC, TAP, ISO",
    "2d_drawing": "PDF, DXF, DWG, SVG, PNG, JPG",
    laser_cutting: "DXF, SVG, AI, PDF",
    document: "PDF, DOC, DOCX, XLS, XLSX, CSV, TXT",
};

const DEFAULT_CUSTOM_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.stl,.step,.stp,.obj,.3mf,.fbx,.png,.jpg,.jpeg,.svg,.zip";

export default function FileUpload({ partId, onUploadComplete, customStages = [], onAddCustomStage }: FileUploadProps) {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState("design");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allStages = [
        ...BUILT_IN_STAGES,
        ...customStages.map((name) => ({ key: `custom_${name}`, label: `🏷️ ${name}`, icon: "🏷️" })),
    ];

    const isCustom = uploadStage.startsWith("custom_");
    const acceptedTypes = isCustom
        ? DEFAULT_CUSTOM_ACCEPT
        : STAGE_ACCEPT[uploadStage] || DEFAULT_CUSTOM_ACCEPT;
    const fileHint = isCustom
        ? "Any file type"
        : STAGE_FILE_HINT[uploadStage] || "Any file type";

    const uploadFile = useCallback(
        async (file: File) => {
            setUploading(true);
            setProgress(10);

            const formData = new FormData();
            formData.append("file", file);
            formData.append("uploadStage", uploadStage);
            formData.append("uploadedBy", "User");

            try {
                setProgress(40);
                const res = await fetch(`/api/parts/${partId}/upload`, {
                    method: "POST",
                    body: formData,
                });

                setProgress(80);

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Upload failed");
                }

                setProgress(100);
                setTimeout(() => {
                    setUploading(false);
                    setProgress(0);
                    onUploadComplete();
                }, 500);
            } catch (err) {
                console.error("Upload error:", err);
                setUploading(false);
                setProgress(0);
                alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
            }
        },
        [partId, uploadStage, onUploadComplete]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) uploadFile(file);
        },
        [uploadFile]
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
        },
        [uploadFile]
    );

    const handleAddCustom = () => {
        const name = prompt("Enter a name for the new upload category:");
        if (name && name.trim()) {
            onAddCustomStage?.(name.trim());
            setUploadStage(`custom_${name.trim()}`);
        }
    };

    return (
        <div>
            <div className="stage-selector" style={{ marginBottom: 8 }}>
                {allStages.map((stage) => (
                    <Button
                        key={stage.key}
                        variant={uploadStage === stage.key ? "secondary" : "ghost"}
                        size="xs"
                        onClick={() => setUploadStage(stage.key)}
                        title={stage.label}
                    >
                        {stage.label}
                    </Button>
                ))}
                <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleAddCustom}
                    title="Add a custom upload category"
                    style={{ opacity: 0.7 }}
                >
                    + Custom
                </Button>
            </div>

            <div
                className={`dropzone ${dragging ? "dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                <div className="drop-icon">📁</div>
                <p>
                    {uploading
                        ? "Uploading..."
                        : "Drop file here or click to browse"}
                </p>
                <p className="file-types">{fileHint}</p>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptedTypes}
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                />
            </div>

            {uploading && (
                <div className="progress-bar">
                    <div className="fill" style={{ width: `${progress}%` }} />
                </div>
            )}
        </div>
    );
}
