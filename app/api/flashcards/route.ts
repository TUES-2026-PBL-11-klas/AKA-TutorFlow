import { validateSession } from "@/lib/auth";
import { listFlashcardsForTheme } from "@/services/materials";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const themeId = new URL(request.url).searchParams.get("themeId")?.trim() ?? "";
    if (!themeId) {
        return NextResponse.json({ error: "themeId is required" }, { status: 400 });
    }

    const flashcardSets = await listFlashcardsForTheme(auth.id, themeId);
    return NextResponse.json({ flashcardSets });
}
