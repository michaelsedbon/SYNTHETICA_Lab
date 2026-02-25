import { prisma } from "./prisma";

/**
 * Build a human-readable project path by walking up the parent chain.
 * e.g. "Workspace / Prosthetics / Femur Guide"
 */
export async function buildProjectPath(projectId: string | null): Promise<string | null> {
    if (!projectId) return null;
    const segments: string[] = [];
    let currentId: string | null = projectId;
    while (currentId) {
        const proj: { name: string; parentId: string | null } | null = await prisma.project.findUnique({
            where: { id: currentId },
            select: { name: true, parentId: true },
        });
        if (!proj) break;
        segments.unshift(proj.name);
        currentId = proj.parentId;
    }
    return segments.length > 0 ? segments.join(" / ") : null;
}
