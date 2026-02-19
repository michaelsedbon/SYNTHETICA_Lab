import { NextResponse } from "next/server";
import { apps } from "@/lib/apps";

export const dynamic = "force-dynamic";

interface PortHealth {
    port: number;
    label: string;
    up: boolean;
}

interface AppHealth {
    slug: string;
    ports: PortHealth[];
    allUp: boolean;
    anyUp: boolean;
}

async function checkPort(port: number, timeoutMs = 2000): Promise<boolean> {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(`http://localhost:${port}`, {
            signal: controller.signal,
            redirect: "follow",
        });
        clearTimeout(id);
        return res.status < 500;
    } catch {
        return false;
    }
}

export async function GET() {
    const results: AppHealth[] = await Promise.all(
        apps.map(async (app) => {
            const ports: PortHealth[] = await Promise.all(
                app.startCommands.map(async (sc) => ({
                    port: sc.port,
                    label: sc.label,
                    up: await checkPort(sc.port),
                }))
            );
            return {
                slug: app.slug,
                ports,
                allUp: ports.every((p) => p.up),
                anyUp: ports.some((p) => p.up),
            };
        })
    );

    return NextResponse.json({ apps: results });
}
