import { validateSession } from "@/lib/auth";
import { createSummaryMaterial } from "@/services/materials";
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
    const notesRaw = (body as { notes?: unknown })?.notes;
    const notes = typeof notesRaw === "string" && notesRaw.trim().length > 0 ? notesRaw.trim() : undefined;

    if (!themeId) return NextResponse.json({ error: "themeId is required" }, { status: 400 });

    const material = await createSummaryMaterial({ userId: auth.id, themeId, notes });
    if (!material) return NextResponse.json({ error: "Theme not found" }, { status: 404 });

    return NextResponse.json({ material }, { status: 201 });
}
