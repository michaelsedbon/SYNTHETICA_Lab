import { NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import { access } from "fs/promises";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// POST /api/parts/:id/reveal — open the part's upload folder in Finder (macOS)
export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: partId } = await params;
        const partDir = path.resolve(UPLOAD_DIR, partId);

        // Check if directory exists
        try {
            await access(partDir);
        } catch {
            return NextResponse.json(
                { error: "No files uploaded yet for this part" },
                { status: 404 }
            );
        }

        // Open in Finder (macOS)
        exec(`open "${partDir}"`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to reveal in Finder:", error);
        return NextResponse.json({ error: "Failed to open folder" }, { status: 500 });
    }
}
