import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/workspace-fields?workspaceId=xxx
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
        }

        const fields = await prisma.workspaceField.findMany({
            where: { workspaceId },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json(fields);
    } catch (error) {
        console.error("Failed to fetch workspace fields:", error);
        return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
    }
}

// POST /api/workspace-fields — create a new field
// Body: { workspaceId, key, label, icon?, fieldType?, sortOrder? }
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { workspaceId, key, label, icon, fieldType, sortOrder } = body;

        if (!workspaceId || !key || !label) {
            return NextResponse.json({ error: "workspaceId, key, and label required" }, { status: 400 });
        }

        // Sanitize key: lowercase, no spaces, alphanumeric + underscore
        const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

        const field = await prisma.workspaceField.create({
            data: {
                workspaceId,
                key: sanitizedKey,
                label,
                icon: icon || "📋",
                fieldType: fieldType || "select",
                builtIn: false,
                sortOrder: sortOrder ?? 99,
            },
        });

        return NextResponse.json(field);
    } catch (error) {
        console.error("Failed to create workspace field:", error);
        return NextResponse.json({ error: "Failed to create field" }, { status: 500 });
    }
}

// PATCH /api/workspace-fields — update a field
// Body: { id, label?, icon?, fieldType?, sortOrder? }
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, label, icon, fieldType, sortOrder } = body;

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        const data: Record<string, unknown> = {};
        if (label !== undefined) data.label = label;
        if (icon !== undefined) data.icon = icon;
        if (fieldType !== undefined) data.fieldType = fieldType;
        if (sortOrder !== undefined) data.sortOrder = sortOrder;

        const field = await prisma.workspaceField.update({
            where: { id },
            data,
        });

        return NextResponse.json(field);
    } catch (error) {
        console.error("Failed to update workspace field:", error);
        return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
    }
}

// DELETE /api/workspace-fields?id=xxx
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        const field = await prisma.workspaceField.findUnique({ where: { id } });
        if (!field) {
            return NextResponse.json({ error: "Field not found" }, { status: 404 });
        }

        // System fields cannot be deleted
        const SYSTEM_KEYS = ["status"];
        if (SYSTEM_KEYS.includes(field.key)) {
            return NextResponse.json({ error: "System fields cannot be deleted" }, { status: 400 });
        }

        // Delete all part custom field values for this field key across workspace parts
        const workspaceParts = await prisma.part.findMany({
            where: { workspaceId: field.workspaceId },
            select: { id: true },
        });
        const partIds = workspaceParts.map(p => p.id);
        if (partIds.length > 0) {
            await prisma.partCustomField.deleteMany({
                where: { partId: { in: partIds }, fieldKey: field.key },
            });
        }

        // Delete all field values for this key
        await prisma.fieldValue.deleteMany({
            where: { field: field.key },
        });

        // Delete the workspace field definition
        await prisma.workspaceField.delete({ where: { id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Failed to delete workspace field:", error);
        return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
    }
}
