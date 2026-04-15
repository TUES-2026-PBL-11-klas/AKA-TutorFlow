import { validateSession } from "@/lib/auth";
import { createTestMaterial } from "@/services/materials";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const themeId = typeof (body as { themeId?: unknown })?.themeId === "string" ? (body as { themeId: string }).themeId.trim() : "";
    const countRaw = (body as { count?: unknown })?.count;
    const count = typeof countRaw === "number" && Number.isInteger(countRaw) ? countRaw : 5;

    if (!themeId) return NextResponse.json({ error: "themeId is required" }, { status: 400 });
    if (count < 1 || count > 20) {
        return NextResponse.json({ error: "count must be between 1 and 20" }, { status: 400 });
    }

    try {
        const material = await createTestMaterial({ userId: auth.id, themeId, count });
        if (!material) return NextResponse.json({ error: "Theme not found" }, { status: 404 });
        return NextResponse.json({ material }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Test generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
