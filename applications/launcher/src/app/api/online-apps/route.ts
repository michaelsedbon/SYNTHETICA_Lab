import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { OnlineAppInfo } from "@/lib/apps";

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), "online-apps.json");
        const raw = await fs.readFile(filePath, "utf-8");
        const apps: OnlineAppInfo[] = JSON.parse(raw);
        return NextResponse.json({ apps });
    } catch {
        return NextResponse.json({ apps: [] });
    }
}
