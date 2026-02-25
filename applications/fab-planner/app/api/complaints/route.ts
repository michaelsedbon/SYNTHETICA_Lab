import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// GET /api/complaints — list all complaints, newest first
export async function GET() {
    try {
        const complaints = await prisma.complaint.findMany({
            orderBy: { createdAt: "desc" },
            include: { attachments: true },
        });
        return NextResponse.json(complaints);
    } catch (error) {
        console.error("Failed to fetch complaints:", error);
        return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }
}

// POST /api/complaints — create a complaint with optional file attachments
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const text = formData.get("text") as string;
        const author = (formData.get("author") as string)?.trim() || "";

        if (!text?.trim()) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Create complaint first
        const complaint = await prisma.complaint.create({
            data: { text: text.trim(), author },
        });

        // Handle file attachments
        const files = formData.getAll("files") as File[];
        const attachments = [];

        if (files.length > 0) {
            const uploadDir = path.join(process.cwd(), "uploads", "complaints", complaint.id);
            await mkdir(uploadDir, { recursive: true });

            for (const file of files) {
                if (file.size === 0) continue;
                const buffer = Buffer.from(await file.arrayBuffer());
                const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
                const filePath = path.join(uploadDir, safeName);
                await writeFile(filePath, buffer);

                const attachment = await prisma.complaintAttachment.create({
                    data: {
                        complaintId: complaint.id,
                        fileName: safeName,
                        filePath: filePath,
                        fileType: file.type || "application/octet-stream",
                    },
                });
                attachments.push(attachment);
            }
        }

        const result = await prisma.complaint.findUnique({
            where: { id: complaint.id },
            include: { attachments: true },
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Failed to create complaint:", error);
        return NextResponse.json({ error: "Failed to create complaint" }, { status: 500 });
    }
}
