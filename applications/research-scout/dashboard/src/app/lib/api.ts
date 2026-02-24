const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options?.headers,
        },
    });
    if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}

// ── Types ────────────────────────────────────────────────────────

export interface Topic {
    name: string;
    queries: string[];
    sources: string[];
    max_results: number;
    paper_count: number;
}

export interface Paper {
    id: string;
    title: string;
    abstract: string | null;
    doi: string | null;
    url: string | null;
    source: string;
    published: string | null;
    year: number | null;
    citation_count: number;
    venue: string | null;
    concepts: string;
}

export interface Author {
    id: string;
    name: string;
    affiliation: string | null;
    country: string | null;
    source: string;
    h_index: number | null;
    topic_count: number;
    paper_count_local: number;
    total_citations: number;
    misfit_score: number | null;
}

export interface Stats {
    paper_count: number;
    author_count: number;
    topic_counts: { topic: string; count: number }[];
    last_scrape: {
        topic_name: string;
        status: string;
        papers_found: number;
        started_at: string;
    } | null;
}

export interface ScrapeStatus {
    running: boolean;
    progress: string | null;
    results: Array<{
        topic: string;
        papers: number;
        authors: number;
        errors: string[];
    }> | null;
}

export interface CooccurrenceEntry {
    topic_a: string;
    topic_b: string;
    shared_authors: number;
}

// ── API calls ────────────────────────────────────────────────────

export const api = {
    getStats: () => fetchApi<Stats>("/api/stats"),
    getTopics: () => fetchApi<Topic[]>("/api/topics"),
    getPapers: (params?: {
        topic?: string;
        source?: string;
        year_min?: number;
        limit?: number;
        offset?: number;
    }) => {
        const qs = new URLSearchParams();
        if (params?.topic) qs.set("topic", params.topic);
        if (params?.source) qs.set("source", params.source);
        if (params?.year_min) qs.set("year_min", String(params.year_min));
        if (params?.limit) qs.set("limit", String(params.limit));
        if (params?.offset) qs.set("offset", String(params.offset));
        return fetchApi<{ papers: Paper[]; total: number }>(`/api/papers?${qs}`);
    },
    getAuthors: (params?: {
        limit?: number;
        offset?: number;
        country?: string;
        sort_by?: string;
    }) => {
        const qs = new URLSearchParams();
        if (params?.limit) qs.set("limit", String(params.limit));
        if (params?.offset) qs.set("offset", String(params.offset));
        if (params?.country) qs.set("country", params.country);
        if (params?.sort_by) qs.set("sort_by", params.sort_by);
        return fetchApi<{ authors: Author[]; total: number }>(`/api/authors?${qs}`);
    },
    getCountries: () => fetchApi<string[]>("/api/countries"),
    triggerScrape: (topic?: string) =>
        fetchApi<{ status: string; topic: string }>("/api/scrape", {
            method: "POST",
            body: JSON.stringify({ topic: topic || null }),
        }),
    getScrapeStatus: () => fetchApi<ScrapeStatus>("/api/scrape/status"),
    triggerAnalysis: () =>
        fetchApi<{ status: string; misfit: object; cooccurrence_pairs: number }>(
            "/api/analyze",
            { method: "POST" }
        ),
    getCooccurrence: () => fetchApi<CooccurrenceEntry[]>("/api/cooccurrence"),
    getExportUrl: (params?: { country?: string; sort_by?: string }) => {
        const qs = new URLSearchParams();
        if (params?.country) qs.set("country", params.country);
        if (params?.sort_by) qs.set("sort_by", params.sort_by);
        return `${API_BASE}/api/export/authors?${qs}`;
    },
};
