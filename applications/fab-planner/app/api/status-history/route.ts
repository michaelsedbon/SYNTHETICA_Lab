import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/status-history?partIds=id1,id2,...
// Returns status history entries grouped by partId
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const partIdsParam = searchParams.get("partIds");

        if (!partIdsParam) {
            return NextResponse.json({ error: "partIds query param is required" }, { status: 400 });
        }

        const partIds = partIdsParam.split(",").filter(Boolean);

        const entries = await prisma.statusHistory.findMany({
            where: { partId: { in: partIds } },
            orderBy: { changedAt: "asc" },
        });

        // Group by partId for easy client-side consumption
        const grouped: Record<string, typeof entries> = {};
        for (const entry of entries) {
            if (!grouped[entry.partId]) grouped[entry.partId] = [];
            grouped[entry.partId].push(entry);
        }

        return NextResponse.json(grouped);
    } catch (error) {
        console.error("Failed to fetch status history:", error);
        return NextResponse.json({ error: "Failed to fetch status history" }, { status: 500 });
    }
}
