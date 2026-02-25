"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SequenceSummary,
  SequenceDetail,
  listSequences,
  getSequence,
  deleteSequence,
  renameSequence,
  duplicateSequence,
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
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("circular");
  const [loadGen, setLoadGen] = useState(0);

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

  return (
    <div className="app-layout">
      {/* ── Left: Project Tree ── */}
      <ProjectTree
        sequences={sequences}
        activeId={activeId}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onRename={handleRename}
        onDuplicate={handleDuplicate}
        onUploadComplete={handleUploadComplete}
      />

      {/* ── Center: DNA View ── */}
      <div className="panel-center">
        <div className="view-tabs">
          <button
            className={`view-tab ${viewTab === "circular" ? "active" : ""}`}
            onClick={() => setViewTab("circular")}
          >
            <Circle size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            Circular
          </button>
          <button
            className={`view-tab ${viewTab === "linear" ? "active" : ""}`}
            onClick={() => setViewTab("linear")}
          >
            <AlignHorizontalSpaceAround size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            Linear
          </button>
          <button
            className={`view-tab ${viewTab === "annotations" ? "active" : ""}`}
            onClick={() => setViewTab("annotations")}
          >
            <List size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
            Annotations
            {activeSeq && (
              <span className="tab-badge">{activeSeq.features.length}</span>
            )}
          </button>
          {activeSeq && (
            <div style={{
              marginLeft: "auto", padding: "10px 16px", fontSize: 11,
              color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 6,
            }}>
              <Dna size={12} />
              {activeSeq.name} · {activeSeq.length.toLocaleString()} bp
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
              onSelectFeature={setSelectedFeatureId}
              selectionRange={selectionRange}
              onSelectionRange={setSelectionRange}
            />
          ) : viewTab === "linear" ? (
            <LinearViewer
              sequence={activeSeq.sequence}
              features={activeSeq.features}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={setSelectedFeatureId}
            />
          ) : (
            <AnnotationsTab
              features={activeSeq.features}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={(id) => {
                setSelectedFeatureId(id);
                if (id !== null) setViewTab("circular"); // switch to map to see highlight
              }}
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

      {/* ── Right: Operations ── */}
      <OperationsPanel
        sequence={activeSeq}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={setSelectedFeatureId}
        onDataChange={handleDataChange}
      />
    </div>
  );
}
