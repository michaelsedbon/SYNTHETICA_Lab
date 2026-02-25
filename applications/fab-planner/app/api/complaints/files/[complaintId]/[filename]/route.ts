import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/complaints/files/[complaintId]/[filename] — serve attachment
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ complaintId: string; filename: string }> }
) {
    try {
        const { complaintId, filename } = await params;
        const filePath = path.join(process.cwd(), "uploads", "complaints", complaintId, filename);

        const buffer = await readFile(filePath);

        // Determine content type from extension
        const ext = path.extname(filename).toLowerCase();
        const contentTypes: Record<string, string> = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp4": "video/mp4",
            ".webm": "video/webm",
            ".mov": "video/quicktime",
            ".pdf": "application/pdf",
        };
        const contentType = contentTypes[ext] || "application/octet-stream";

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error) {
        console.error("Failed to serve complaint file:", error);
        return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
}
