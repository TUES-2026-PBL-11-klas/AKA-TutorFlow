import { validateSession } from "@/lib/auth";
import { createFlashcardsMaterial } from "@/services/materials";
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
    const termsRaw = (body as { terms?: unknown })?.terms;

    if (!themeId) return NextResponse.json({ error: "themeId is required" }, { status: 400 });
    if (!Array.isArray(termsRaw) || termsRaw.length === 0 || !termsRaw.every((t) => typeof t === "string" && t.trim().length > 0)) {
        return NextResponse.json({ error: "terms must be a non-empty array of strings" }, { status: 400 });
    }
    const terms = (termsRaw as string[]).map((t) => t.trim());

    try {
        const material = await createFlashcardsMaterial({ userId: auth.id, themeId, terms });
        if (!material) return NextResponse.json({ error: "Theme not found" }, { status: 404 });
        return NextResponse.json({ material }, { status: 201 });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Flashcard generation failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
