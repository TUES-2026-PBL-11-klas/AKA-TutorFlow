import { validateSession } from "@/lib/auth";
import { createTheme, listThemes } from "@/services/themes";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const subjectId = new URL(request.url).searchParams.get("subjectId")?.trim() ?? "";
    if (!subjectId) {
        return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
    }

    const themes = await listThemes(auth.id, subjectId);
    return NextResponse.json({ themes });
}

export async function POST(request: Request) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const subjectId = typeof (body as { subjectId?: unknown })?.subjectId === "string"
        ? (body as { subjectId: string }).subjectId.trim()
        : "";
    const name = typeof (body as { name?: unknown })?.name === "string"
        ? (body as { name: string }).name.trim()
        : "";

    if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    try {
        const theme = await createTheme(auth.id, subjectId, name);
        return NextResponse.json({ theme }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
}
