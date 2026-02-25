"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SequenceSummary,
  SequenceDetail,
  Orf,
  listSequences,
  getSequence,
  deleteSequence,
  renameSequence,
  duplicateSequence,
  deleteFeature,
} from "@/lib/api";
import ProjectTree from "@/components/ProjectTree";
import PlasmidMap from "@/components/PlasmidMap";
import LinearViewer from "@/components/LinearViewer";
import AnnotationsTab from "@/components/AnnotationsTab";
import OperationsPanel from "@/components/OperationsPanel";
import { Circle, AlignHorizontalSpaceAround, Dna, List } from "lucide-react";

type ViewTab = "circular" | "linear" | "annotations";

export default function Home() {
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeSeq, setActiveSeq] = useState<SequenceDetail | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<number>>(new Set());
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("circular");
  const [loadGen, setLoadGen] = useState(0);
  const [ghostOrfs, setGhostOrfs] = useState<Orf[]>([]);

  useEffect(() => {
    listSequences().then(setSequences).catch(console.error);
  }, [loadGen]);

  useEffect(() => {
    if (activeId !== null) {
      getSequence(activeId).then(setActiveSeq).catch(console.error);
    } else {
      setActiveSeq(null);
    }
  }, [activeId, loadGen]);

  const handleDataChange = useCallback(() => setLoadGen((g) => g + 1), []);

  const handleSelect = useCallback((id: number) => {
    setActiveId(id);
    setSelectedFeatureId(null);
    setMultiSelectedIds(new Set());
    setSelectionRange(null);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteSequence(id);
      if (activeId === id) { setActiveId(null); setActiveSeq(null); }
      handleDataChange();
    },
    [activeId, handleDataChange]
  );

  const handleRename = useCallback(
    async (id: number, name: string) => {
      await renameSequence(id, name);
      handleDataChange();
    },
    [handleDataChange]
  );

  const handleDuplicate = useCallback(
    async (id: number) => {
      const result = await duplicateSequence(id);
      setActiveId(result.id);
      handleDataChange();
    },
    [handleDataChange]
  );

  const handleUploadComplete = useCallback(
    (id: number) => { setActiveId(id); handleDataChange(); },
    [handleDataChange]
  );

  // Feature selection: supports multi-select with Ctrl/Cmd
  const handleFeatureSelect = useCallback((id: number | null, multiToggle?: boolean) => {
    if (id === null) {
      setSelectedFeatureId(null);
      setMultiSelectedIds(new Set());
      return;
    }
    if (multiToggle) {
      setMultiSelectedIds((prev) => {
        const next = new Set(prev);
        // Include current primary selection in multi set
        if (selectedFeatureId !== null && !next.has(selectedFeatureId)) {
          next.add(selectedFeatureId);
        }
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setSelectedFeatureId(id);
    } else {
      setSelectedFeatureId(id);
      setMultiSelectedIds(new Set());
    }
  }, [selectedFeatureId]);

  // Bulk delete all selected features
  const handleBulkDelete = useCallback(async () => {
    if (!activeId) return;
    const ids = multiSelectedIds.size > 0
      ? Array.from(multiSelectedIds)
      : selectedFeatureId !== null ? [selectedFeatureId] : [];
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} feature${ids.length > 1 ? "s" : ""}?`)) return;
    for (const fid of ids) {
      await deleteFeature(activeId, fid);
    }
    setSelectedFeatureId(null);
    setMultiSelectedIds(new Set());
    handleDataChange();
  }, [activeId, multiSelectedIds, selectedFeatureId, handleDataChange]);

  return (
    <div className="app-layout">
      <ProjectTree
        sequences={sequences}
        activeId={activeId}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onUploadComplete={handleUploadComplete}
      />

      <div className="panel-center">
        <div className="view-tabs">
          <button className={`view-tab ${viewTab === "circular" ? "active" : ""}`} onClick={() => setViewTab("circular")}>
            <Circle size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Circular
          </button>
          <button className={`view-tab ${viewTab === "linear" ? "active" : ""}`} onClick={() => setViewTab("linear")}>
            <AlignHorizontalSpaceAround size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Linear
          </button>
          <button className={`view-tab ${viewTab === "annotations" ? "active" : ""}`} onClick={() => setViewTab("annotations")}>
            <List size={13} style={{ marginRight: 6, verticalAlign: -2 }} /> Annotations
            {activeSeq && <span className="tab-badge">{activeSeq.features.length}</span>}
          </button>
          {activeSeq && (
            <div style={{ marginLeft: "auto", padding: "10px 16px", fontSize: 11, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6 }}>
              <Dna size={12} /> {activeSeq.name} · {activeSeq.length.toLocaleString()} bp
            </div>
          )}
        </div>

        {activeSeq ? (
          viewTab === "circular" ? (
            <PlasmidMap
              sequence={activeSeq.sequence}
              features={activeSeq.features}
              topology={activeSeq.topology}
              selectedFeatureId={selectedFeatureId}
              multiSelectedIds={multiSelectedIds}
              onSelectFeature={handleFeatureSelect}
              selectionRange={selectionRange}
              onSelectionRange={setSelectionRange}
              onDeleteFeature={handleBulkDelete}
              ghostOrfs={ghostOrfs}
            />
          ) : viewTab === "linear" ? (
            <LinearViewer
              sequence={activeSeq.sequence}
              features={activeSeq.features}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={(id) => handleFeatureSelect(id)}
            />
          ) : (
            <AnnotationsTab
              features={activeSeq.features}
              selectedFeatureId={selectedFeatureId}
              multiSelectedIds={multiSelectedIds}
              onSelectFeature={handleFeatureSelect}
              onBulkDelete={handleBulkDelete}
            />
          )
        ) : (
          <div className="empty-state">
            <Dna className="empty-icon" size={48} />
            <span className="empty-text">Import a GenBank file to get started</span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
              Drag & drop a .gb file onto the left panel
            </span>
          </div>
        )}
      </div>

      <OperationsPanel
        sequence={activeSeq}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={(id) => handleFeatureSelect(id)}
        onDataChange={handleDataChange}
        onOrfPreview={setGhostOrfs}
      />
    </div>
  );
}
