import { NextRequest, NextResponse } from "next/server";
import { apps } from "@/lib/apps";
import { stopApp } from "@/lib/process-manager";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const slug = body.slug as string;

    if (!slug) {
        return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const app = apps.find((a) => a.slug === slug);
    if (!app) {
        return NextResponse.json({ error: `App '${slug}' not found` }, { status: 404 });
    }

    if (!app.managed) {
        return NextResponse.json(
            { error: `'${app.name}' is externally managed and cannot be stopped from the launcher` },
            { status: 400 }
        );
    }

    const result = stopApp(slug);

    return NextResponse.json(result);
}
