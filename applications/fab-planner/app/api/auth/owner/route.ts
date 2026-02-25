import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { isOwner, ownerCookie, clearOwnerCookie } from "@/lib/auth";

// GET /api/auth/owner — check current owner status
export async function GET(request: Request) {
    return NextResponse.json({ isOwner: isOwner(request) });
}

// POST /api/auth/owner — login as owner
export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!config.ownerToken) {
            return NextResponse.json(
                { error: "Owner token not configured on server" },
                { status: 500 }
            );
        }

        if (token !== config.ownerToken) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const res = NextResponse.json({ success: true, isOwner: true });
        res.headers.set("Set-Cookie", ownerCookie());
        return res;
    } catch {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
}

// DELETE /api/auth/owner — logout
export async function DELETE() {
    const res = NextResponse.json({ success: true, isOwner: false });
    res.headers.set("Set-Cookie", clearOwnerCookie());
    return res;
}
