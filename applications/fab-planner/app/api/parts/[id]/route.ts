import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog } from "@/lib/logger";
import { buildProjectPath } from "@/lib/projects";
import path from "path";
import { rm } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// GET /api/parts/:id — single part with all revisions + sharing info
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const part = await prisma.part.findUnique({
            where: { id },
            include: {
                revisions: {
                    orderBy: { versionNumber: "desc" },
                },
                workspace: { select: { id: true, name: true, color: true } },
                customFields: true,
                sharedTo: {
                    include: {
                        workspace: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });

        if (!part) {
            return NextResponse.json({ error: "Part not found" }, { status: 404 });
        }



        // Check if this part is being viewed as a shared part (via workspaceId query param)
        const url = new URL(request.url);
        const viewerWorkspaceId = url.searchParams.get("workspaceId");

        const isSharedView = viewerWorkspaceId && viewerWorkspaceId !== part.workspaceId;

        // Build _sharedTo with project paths
        const sharedToData = await Promise.all(
            part.sharedTo.map(async (link: { workspace: { id: string; name: string; color: string }; sharedAt: Date; targetProjectId: string | null }) => {
                const projectPath = await buildProjectPath(link.targetProjectId);
                return {
                    workspaceId: link.workspace.id,
                    workspaceName: link.workspace.name,
                    workspaceColor: link.workspace.color,
                    sharedAt: link.sharedAt,
                    targetProjectId: link.targetProjectId,
                    targetProjectPath: projectPath,
                };
            })
        );

        // For shared view, resolve the target project path in the viewing workspace
        let targetProjectPath: string | null = null;
        if (isSharedView) {
            const shareLink = await prisma.workspacePart.findFirst({
                where: { partId: id, workspaceId: viewerWorkspaceId },
            });
            if (shareLink?.targetProjectId) {
                targetProjectPath = await buildProjectPath(shareLink.targetProjectId);
            }
        }

        return NextResponse.json({
            ...part,
            customFields: Object.fromEntries(part.customFields.map((cf: { fieldKey: string; value: string }) => {
                let val: string | string[] = cf.value;
                try { const parsed = JSON.parse(cf.value); if (Array.isArray(parsed)) val = parsed; } catch { /* not JSON */ }
                return [cf.fieldKey, val];
            })),
            _sharedTo: sharedToData,
            _isShared: isSharedView || false,
            _originWorkspace: isSharedView ? part.workspace : null,
            _targetProjectPath: isSharedView ? targetProjectPath : null,
            sharedTo: undefined,
        });
    } catch (error) {
        console.error("Failed to fetch part:", error);
        return NextResponse.json({ error: "Failed to fetch part" }, { status: 500 });
    }
}

// PATCH /api/parts/:id — update a single part's metadata
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Build update payload — only include fields that were sent
        const data: Record<string, unknown> = {};
        if (body.partName !== undefined) data.partName = body.partName;
        if (body.status !== undefined) {
            data.status = body.status;
            // Auto-track completion timestamp
            const isCompleted = ["completed", "complete", "done"].includes(body.status?.toLowerCase());
            if (isCompleted) {
                data.completedAt = new Date();
            } else {
                data.completedAt = null;
            }
        }
        if (body.material !== undefined) data.material = body.material;
        if (body.notes !== undefined) data.notes = body.notes;
        if (body.archivePath !== undefined) data.archivePath = body.archivePath;
        if (body.who !== undefined) data.who = body.who;
        if (body.type !== undefined) data.type = body.type;
        if (body.quantity !== undefined) data.quantity = parseInt(body.quantity) || 1;
        if (body.fabMechanism !== undefined) data.fabMechanism = body.fabMechanism;
        if (body.orderId !== undefined) data.orderId = body.orderId;
        if (body.project !== undefined) data.project = body.project;
        if (body.client !== undefined) data.client = body.client;
        if (body.hospital !== undefined) data.hospital = body.hospital;
        if (body.projectId !== undefined) data.projectId = body.projectId;
        if (body.dueDate !== undefined) {
            data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        }

        // Record status transition in history if status actually changed
        if (body.status !== undefined) {
            const current = await prisma.part.findUnique({ where: { id }, select: { status: true } });
            if (current && current.status !== body.status) {
                await prisma.statusHistory.create({
                    data: { partId: id, status: body.status },
                });
            }
        }

        const part = await prisma.part.update({
            where: { id },
            data,
            include: {
                revisions: {
                    orderBy: { versionNumber: "desc" },
                },
                customFields: true,
            },
        });

        // Handle custom fields upsert
        if (body.customFields && typeof body.customFields === "object") {
            for (const [fieldKey, value] of Object.entries(body.customFields)) {
                if (value === null || value === "") {
                    await prisma.partCustomField.deleteMany({ where: { partId: id, fieldKey } });
                } else {
                    await prisma.partCustomField.upsert({
                        where: { partId_fieldKey: { partId: id, fieldKey } },
                        create: { partId: id, fieldKey, value: Array.isArray(value) ? JSON.stringify(value) : String(value) },
                        update: { value: Array.isArray(value) ? JSON.stringify(value) : String(value) },
                    });
                }
            }
        }

        // Re-read custom fields to include any upserted changes
        const freshCustomFields = await prisma.partCustomField.findMany({ where: { partId: id } });

        // Log the user action
        const changedFields = Object.keys(data).join(", ");
        userLog.info("field_updated", `Updated ${changedFields} on ${part.partName}`, id);

        return NextResponse.json({
            ...part,
            customFields: Object.fromEntries(freshCustomFields.map(cf => [cf.fieldKey, cf.value])),
        });
    } catch (error) {
        console.error("Failed to update part:", error);
        return NextResponse.json({ error: "Failed to update part" }, { status: 500 });
    }
}

// DELETE /api/parts/:id — delete a part and its uploaded files
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.part.delete({ where: { id } });

        // Also remove uploaded files from disk
        const partDir = path.join(UPLOAD_DIR, id);
        await rm(partDir, { recursive: true, force: true }).catch(() => { });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete part:", error);
        return NextResponse.json({ error: "Failed to delete part" }, { status: 500 });
    }
}
