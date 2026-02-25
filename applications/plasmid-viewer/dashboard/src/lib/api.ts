const API_BASE = "http://localhost:8003";

export interface Feature {
    id: number;
    seq_id: number;
    type: string;
    label: string;
    start: number;
    end: number;
    strand: number;
    color: string;
    qualifiers: Record<string, string | string[]>;
    source: string;
}

export interface SequenceSummary {
    id: number;
    name: string;
    description: string;
    topology: string;
    length: number;
    organism: string;
    created_at: string;
}

export interface SequenceDetail extends SequenceSummary {
    sequence: string;
    features: Feature[];
}

export interface Orf {
    start: number;
    end: number;
    strand: number;
    frame: number;
    length: number;
    protein: string;
    color: string;
    selected?: boolean;
}

export async function uploadFile(file: File): Promise<SequenceDetail> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/sequences/upload`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed");
    }
    return res.json();
}

export async function listSequences(): Promise<SequenceSummary[]> {
    const res = await fetch(`${API_BASE}/api/sequences`);
    return res.json();
}

export async function getSequence(id: number): Promise<SequenceDetail> {
    const res = await fetch(`${API_BASE}/api/sequences/${id}`);
    if (!res.ok) throw new Error("Sequence not found");
    return res.json();
}

export async function deleteSequence(id: number): Promise<void> {
    await fetch(`${API_BASE}/api/sequences/${id}`, { method: "DELETE" });
}

export async function updateFeature(
    seqId: number,
    featureId: number,
    data: Partial<Feature>
): Promise<void> {
    const res = await fetch(
        `${API_BASE}/api/sequences/${seqId}/features/${featureId}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        }
    );
    if (!res.ok) throw new Error("Update failed");
}

export async function deleteFeature(
    seqId: number,
    featureId: number
): Promise<void> {
    await fetch(`${API_BASE}/api/sequences/${seqId}/features/${featureId}`, {
        method: "DELETE",
    });
}

export async function detectOrfs(
    seqId: number,
    params: { min_length: number; start_codons: string[]; include_reverse: boolean }
): Promise<{ orfs: Orf[]; count: number }> {
    const res = await fetch(`${API_BASE}/api/sequences/${seqId}/detect-orfs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
    });
    return res.json();
}

export async function commitOrfs(
    seqId: number,
    orfs: Orf[]
): Promise<{ committed: number; feature_ids: number[] }> {
    const res = await fetch(`${API_BASE}/api/sequences/${seqId}/commit-orfs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orfs }),
    });
    return res.json();
}

export async function renameSequence(id: number, name: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Rename failed");
}

export async function duplicateSequence(id: number): Promise<SequenceDetail> {
    const res = await fetch(`${API_BASE}/api/sequences/${id}/duplicate`, {
        method: "POST",
    });
    if (!res.ok) throw new Error("Duplicate failed");
    return res.json();
}

