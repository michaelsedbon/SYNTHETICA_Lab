import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/export — export all parts as CSV (Excel-compatible)
export async function GET() {
    try {
        const parts = await prisma.part.findMany({
            orderBy: { priorityOrder: "asc" },
        });

        // CSV header
        const headers = [
            "Unique ID",
            "Part Name",
            "Status",
            "Order ID",
            "Material",
            "Project",
            "Client",
            "Hospital",
            "Due Date",
            "Notes",
            "Priority",
            "Created",
            "Updated",
        ];

        // Escape CSV values
        const esc = (val: string | null | undefined): string => {
            if (val == null) return "";
            const s = String(val);
            if (s.includes(",") || s.includes('"') || s.includes("\n")) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const formatDate = (d: Date | string | null): string => {
            if (!d) return "";
            try {
                return new Date(d).toISOString().split("T")[0];
            } catch {
                return "";
            }
        };

        const rows = parts.map((p) => [
            esc(p.uniqueId),
            esc(p.partName),
            esc(p.status),
            esc(p.orderId),
            esc(p.material),
            esc(p.project),
            esc(p.client),
            esc(p.hospital),
            esc(formatDate(p.dueDate)),
            esc(p.notes),
            String(p.priorityOrder),
            esc(formatDate(p.createdAt)),
            esc(formatDate(p.updatedAt)),
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        // Add BOM for Excel UTF-8 compatibility
        const bom = "\uFEFF";

        return new NextResponse(bom + csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="parts_export_${new Date().toISOString().split("T")[0]}.csv"`,
            },
        });
    } catch (error) {
        console.error("Failed to export:", error);
        return NextResponse.json({ error: "Failed to export" }, { status: 500 });
    }
}
