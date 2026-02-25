import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { userLog, appLog } from "@/lib/logger";

// GET /api/projects — return the full project tree for a workspace
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get("workspaceId");

        const whereClause: Record<string, unknown> = { parentId: null };
        if (workspaceId) whereClause.workspaceId = workspaceId;

        const projects = await prisma.project.findMany({
            include: {
                children: {
                    include: {
                        children: true,
                        _count: { select: { parts: true } },
                    },
                    orderBy: { sortOrder: "asc" },
                },
                _count: { select: { parts: true } },
            },
            where: whereClause,
            orderBy: { sortOrder: "asc" },
        });
        return NextResponse.json(projects);
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
    }
}

// POST /api/projects — create a new project or subproject
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, parentId, workspaceId } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Resolve workspaceId — required, fallback to default
        let wsId = workspaceId;
        if (!wsId) {
            const defaultWs = await prisma.workspace.findUnique({ where: { slug: "default" } });
            if (defaultWs) wsId = defaultWs.id;
            else return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        // Get next sort order
        const maxSort = await prisma.project.aggregate({
            _max: { sortOrder: true },
            where: { parentId: parentId || null },
        });

        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                parentId: parentId || null,
                workspaceId: wsId,
                sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
            },
        });

        await userLog.info("project_created", `Created project "${project.name}"${parentId ? " (subproject)" : ""}`);
        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error("Failed to create project:", error);
        appLog.error("create_project_failed", String(error));
        return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
    }
}

// PATCH /api/projects — update a project (rename, toggle star, etc.)
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, name, starred } = body;

        if (!id) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        const data: Record<string, unknown> = {};
        if (name !== undefined) data.name = name.trim();
        if (starred !== undefined) data.starred = starred;

        const project = await prisma.project.update({
            where: { id },
            data,
        });

        if (name !== undefined) {
            await userLog.info("project_renamed", `Renamed project to "${project.name}"`);
        }
        if (starred !== undefined) {
            await userLog.info("project_starred", `${starred ? "Starred" : "Unstarred"} project "${project.name}"`);
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("Failed to update project:", error);
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }
}

// DELETE /api/projects — delete a project (cascades subprojects, unlinks parts)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        // Get project name for logging before deleting
        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Unlink all parts from this project and its subprojects
        await prisma.part.updateMany({
            where: { projectId: id },
            data: { projectId: null },
        });

        // Also unlink parts from child projects
        const children = await prisma.project.findMany({ where: { parentId: id } });
        for (const child of children) {
            await prisma.part.updateMany({
                where: { projectId: child.id },
                data: { projectId: null },
            });
        }

        await prisma.project.delete({ where: { id } });
        await userLog.info("project_deleted", `Deleted project "${project.name}"`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete project:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
