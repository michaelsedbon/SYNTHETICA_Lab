import type { ProjectNode } from "@/app/components/ProjectTree";

/**
 * Flatten a project tree into a flat list with depth info.
 * Used by ContextMenu, DetailPanel, and any component needing a flat project list.
 */
export function flattenProjects(
    nodes: ProjectNode[] | undefined,
    depth = 0
): { id: string; name: string; depth: number }[] {
    const result: { id: string; name: string; depth: number }[] = [];
    if (!nodes) return result;
    for (const n of nodes) {
        result.push({ id: n.id, name: n.name, depth });
        if (n.children) result.push(...flattenProjects(n.children, depth + 1));
    }
    return result;
}
