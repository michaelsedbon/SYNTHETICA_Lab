import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/workspaces/[id] — update workspace name/color
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const data: Record<string, string> = {};

        if (body.name) data.name = body.name.trim();
        if (body.color) data.color = body.color;
        if (body.visibility && (body.visibility === "open" || body.visibility === "protected")) {
            data.visibility = body.visibility;
        }
        if (body.name) {
            data.slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }

        const workspace = await prisma.workspace.update({
            where: { id },
            data,
        });

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Failed to update workspace:", error);
        return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
    }
}

// DELETE /api/workspaces/[id] — delete workspace (not the default one)
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const workspace = await prisma.workspace.findUnique({ where: { id } });
        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Prevent deleting the last workspace — find the oldest as fallback
        const allWorkspaces = await prisma.workspace.findMany({ orderBy: { createdAt: "asc" } });
        if (allWorkspaces.length <= 1) {
            return NextResponse.json({ error: "Cannot delete the only workspace" }, { status: 400 });
        }

        // Find fallback workspace (oldest that isn't the one being deleted)
        const fallbackWs = allWorkspaces.find((w) => w.id !== id);
        if (!fallbackWs) {
            return NextResponse.json({ error: "No fallback workspace found" }, { status: 500 });
        }

        // Reassign all parts and projects to fallback workspace, then delete
        await prisma.$transaction([
            prisma.part.updateMany({
                where: { workspaceId: id },
                data: { workspaceId: fallbackWs.id },
            }),
            prisma.project.updateMany({
                where: { workspaceId: id },
                data: { workspaceId: fallbackWs.id },
            }),
            prisma.workspacePart.deleteMany({
                where: { workspaceId: id },
            }),
            prisma.workspace.delete({ where: { id } }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete workspace:", error);
        return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
    }
}
