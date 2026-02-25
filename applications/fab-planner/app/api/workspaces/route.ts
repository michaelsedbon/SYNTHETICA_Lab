import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/auth";

// GET /api/workspaces — list all workspaces (non-owners only see "open" ones)
export async function GET(request: Request) {
    try {
        const owner = isOwner(request);
        const workspaces = await prisma.workspace.findMany({
            where: owner ? undefined : { visibility: "open" },
            orderBy: { createdAt: "asc" },
            include: {
                _count: { select: { parts: true, projects: true, sharedParts: true } },
            },
        });
        return NextResponse.json(workspaces);
    } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        return NextResponse.json({ error: "Failed to fetch workspaces" }, { status: 500 });
    }
}

// POST /api/workspaces — create a new workspace
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, color } = body;

        if (!name || typeof name !== "string" || !name.trim()) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        // Generate slug from name
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // Check slug uniqueness
        const existing = await prisma.workspace.findUnique({ where: { slug } });
        if (existing) {
            return NextResponse.json({ error: `Workspace "${name}" already exists` }, { status: 409 });
        }

        const workspace = await prisma.workspace.create({
            data: {
                name: name.trim(),
                slug,
                color: color || "#569cd6",
                fields: {
                    create: [
                        { key: "status", label: "Status", icon: "🔄", fieldType: "select", builtIn: true, sortOrder: 0 },
                        { key: "material", label: "Material", icon: "🧱", fieldType: "select", builtIn: true, sortOrder: 1 },
                        { key: "client", label: "Client", icon: "👤", fieldType: "select", builtIn: true, sortOrder: 2 },
                        { key: "hospital", label: "Hospital", icon: "🏥", fieldType: "select", builtIn: true, sortOrder: 3 },
                        { key: "who", label: "Who", icon: "🙋", fieldType: "select", builtIn: true, sortOrder: 4 },
                        { key: "type", label: "Type", icon: "📋", fieldType: "select", builtIn: true, sortOrder: 5 },
                        { key: "fabMechanism", label: "Fab Mechanism", icon: "⚙️", fieldType: "select", builtIn: true, sortOrder: 6 },
                    ]
                }
            },
        });

        return NextResponse.json(workspace, { status: 201 });
    } catch (error) {
        console.error("Failed to create workspace:", error);
        return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
    }
}
