import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog, appLog } from "@/lib/logger";
import { buildProjectPath } from "@/lib/projects";

// GET /api/parts — list parts for a workspace (own + shared), ordered by priority
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            // Fallback: return all parts (backward compat)
            const parts = await prisma.part.findMany({
                orderBy: { priorityOrder: "asc" },
                include: {
                    revisions: { orderBy: { versionNumber: "desc" }, take: 1 },
                    workspace: { select: { id: true, name: true, color: true } },
                    customFields: true,
                },
            });
            return NextResponse.json(parts.map(p => ({
                ...p,
                customFields: Object.fromEntries(p.customFields.map(cf => [cf.fieldKey, cf.value])),
            })));
        }

        // 1. Own parts (belong to this workspace)
        const ownParts = await prisma.part.findMany({
            where: { workspaceId },
            orderBy: { priorityOrder: "asc" },
            include: {
                revisions: { orderBy: { versionNumber: "desc" }, take: 1 },
                workspace: { select: { id: true, name: true, color: true } },
                customFields: true,
                sharedTo: {
                    include: {
                        workspace: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });

        // 2. Shared parts (linked via workspace_parts)
        const sharedLinks = await prisma.workspacePart.findMany({
            where: { workspaceId },
            orderBy: { localPriority: "asc" },
            include: {
                part: {
                    include: {
                        revisions: { orderBy: { versionNumber: "desc" }, take: 1 },
                        workspace: { select: { id: true, name: true, color: true } },
                        customFields: true,
                    },
                },
            },
        });

        // Annotate shared parts with sharing metadata
        const sharedParts = await Promise.all(sharedLinks.map(async (link) => {
            const projectPath = await buildProjectPath(link.targetProjectId);
            return {
                ...link.part,
                customFields: Object.fromEntries(link.part.customFields.map((cf: { fieldKey: string; value: string }) => {
                    let val: string | string[] = cf.value;
                    try { const parsed = JSON.parse(cf.value); if (Array.isArray(parsed)) val = parsed; } catch { /* not JSON */ }
                    return [cf.fieldKey, val];
                })),
                _isShared: true,
                _originWorkspace: link.part.workspace,
                _localPriority: link.localPriority,
                _sharedAt: link.sharedAt,
                _shareId: link.id,
                _targetProjectId: link.targetProjectId,
                _targetProjectPath: projectPath,
                _sharedTo: [],
            };
        }));

        // Merge: own parts first, then shared parts (by their local priority)
        const ownAnnotated = await Promise.all(ownParts.map(async (p) => {
            const sharedToData = await Promise.all(
                p.sharedTo.map(async (link: { workspace: { id: string; name: string; color: string }; sharedAt: Date; targetProjectId: string | null }) => {
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
            return {
                ...p,
                customFields: Object.fromEntries(p.customFields.map((cf: { fieldKey: string; value: string }) => {
                    let val: string | string[] = cf.value;
                    try { const parsed = JSON.parse(cf.value); if (Array.isArray(parsed)) val = parsed; } catch { /* not JSON */ }
                    return [cf.fieldKey, val];
                })),
                _isShared: false,
                _originWorkspace: null,
                _localPriority: p.priorityOrder,
                _sharedAt: null,
                _shareId: null,
                _sharedTo: sharedToData,
                sharedIn: undefined,
            };
        }));

        const allParts = [...ownAnnotated, ...sharedParts];

        return NextResponse.json(allParts);
    } catch (error) {
        console.error("Failed to fetch parts:", error);
        return NextResponse.json({ error: "Failed to fetch parts" }, { status: 500 });
    }
}

// PATCH /api/parts — batch update priority order after drag-and-drop
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const updates: { id: string; priorityOrder: number; isShared?: boolean }[] = body.updates;
        const workspaceId: string | undefined = body.workspaceId;

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: "Invalid body: expected { updates: [...] }" }, { status: 400 });
        }

        // Separate own parts from shared parts
        const ownUpdates = updates.filter((u) => !u.isShared);
        const sharedUpdates = updates.filter((u) => u.isShared);

        const txns = [];

        // Update own parts' priorityOrder
        for (const u of ownUpdates) {
            txns.push(
                prisma.part.update({
                    where: { id: u.id },
                    data: { priorityOrder: u.priorityOrder },
                })
            );
        }

        // Update shared parts' localPriority in workspace_parts
        if (workspaceId) {
            for (const u of sharedUpdates) {
                txns.push(
                    prisma.workspacePart.updateMany({
                        where: { partId: u.id, workspaceId },
                        data: { localPriority: u.priorityOrder },
                    })
                );
            }
        }

        if (txns.length > 0) {
            await prisma.$transaction(txns);
        }

        userLog.info("reorder", `Reordered ${updates.length} parts`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update priority order:", error);
        appLog.error("reorder_failed", String(error));
        return NextResponse.json({ error: "Failed to update priority order" }, { status: 500 });
    }
}

// POST /api/parts — create a new part manually
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // workspaceId is required for new parts
        if (!body.workspaceId) {
            // Fallback to default workspace
            const defaultWs = await prisma.workspace.findUnique({ where: { slug: "default" } });
            if (defaultWs) body.workspaceId = defaultWs.id;
            else {
                return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
            }
        }

        const maxPriority = await prisma.part.aggregate({
            _max: { priorityOrder: true },
        });

        // Generate unique ID (FAB-XXXX)
        const counter = await prisma.counter.upsert({
            where: { id: "part_seq" },
            update: { value: { increment: 1 } },
            create: { id: "part_seq", value: 1 },
        });
        const uniqueId = `FAB-${String(counter.value).padStart(4, "0")}`;

        const part = await prisma.part.create({
            data: {
                uniqueId,
                partName: body.partName || "Untitled Part",
                orderId: body.orderId || uniqueId,
                status: body.status || "new",
                material: body.material || null,
                notes: body.notes || null,
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                projectId: body.projectId || null,
                workspaceId: body.workspaceId,
                priorityOrder: (maxPriority._max.priorityOrder ?? 0) + 1,
            },
        });

        // Seed initial status history entry
        await prisma.statusHistory.create({
            data: { partId: part.id, status: part.status, changedAt: part.createdAt },
        });

        userLog.info("part_created", `Created part ${part.partName} (${uniqueId})`);

        return NextResponse.json(part, { status: 201 });
    } catch (error) {
        console.error("Failed to create part:", error);
        appLog.error("create_part_failed", String(error));
        return NextResponse.json({ error: "Failed to create part" }, { status: 500 });
    }
}
