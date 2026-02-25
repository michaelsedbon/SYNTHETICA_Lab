import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/logs?category=app|user&limit=200
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || undefined;
        const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 1000);

        const logs = await prisma.logEntry.findMany({
            where: category ? { category } : undefined,
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return NextResponse.json(logs);
    } catch (error) {
        console.error("Failed to fetch logs:", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}

// DELETE /api/logs?category=app|user — clear logs
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category") || undefined;

        await prisma.logEntry.deleteMany({
            where: category ? { category } : undefined,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to clear logs:", error);
        return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 });
    }
}
