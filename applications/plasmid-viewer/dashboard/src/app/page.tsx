"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SequenceSummary,
  SequenceDetail,
  listSequences,
  getSequence,
  deleteSequence,
} from "@/lib/api";
import ProjectTree from "@/components/ProjectTree";
import PlasmidMap from "@/components/PlasmidMap";
import LinearViewer from "@/components/LinearViewer";
import OperationsPanel from "@/components/OperationsPanel";
import { Circle, AlignHorizontalSpaceAround, Dna } from "lucide-react";

type ViewTab = "circular" | "linear";

export default function Home() {
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeSeq, setActiveSeq] = useState<SequenceDetail | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("circular");
  const [loadGen, setLoadGen] = useState(0); // bump to reload

  // ── Load sequence list ──
  useEffect(() => {
    listSequences()
      .then(setSequences)
      .catch(console.error);
  }, [loadGen]);

  // ── Load active sequence ──
  useEffect(() => {
    if (activeId !== null) {
      getSequence(activeId)
        .then(setActiveSeq)
        .catch(console.error);
    } else {
      setActiveSeq(null);
    }
  }, [activeId, loadGen]);

  const handleDataChange = useCallback(() => {
    setLoadGen((g) => g + 1);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setActiveId(id);
    setSelectedFeatureId(null);
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteSequence(id);
      if (activeId === id) {
        setActiveId(null);
        setActiveSeq(null);
      }
      handleDataChange();
    },
    [activeId, handleDataChange]
  );

  const handleUploadComplete = useCallback(
    (id: number) => {
      setActiveId(id);
      handleDataChange();
    },
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
        onUploadComplete={handleUploadComplete}
        features={activeSeq?.features || []}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={setSelectedFeatureId}
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
          {activeSeq && (
            <div style={{
              marginLeft: "auto",
              padding: "10px 16px",
              fontSize: 11,
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
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
            />
          ) : (
            <LinearViewer
              sequence={activeSeq.sequence}
              features={activeSeq.features}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={setSelectedFeatureId}
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
