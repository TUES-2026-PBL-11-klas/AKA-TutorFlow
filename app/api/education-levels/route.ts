import { ensureDevUser, requireUserId } from "@/lib/auth";
import { createEducationLevel, listEducationLevels } from "@/services/educationLevels";
import { NextResponse } from "next/server";

export async function GET() {
    const userId = requireUserId();
    await ensureDevUser(userId);

    const educationLevels = await listEducationLevels(userId);
    return NextResponse.json({ educationLevels });
}

export async function POST(request: Request) {
    const userId = requireUserId();
    await ensureDevUser(userId);

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const typeRaw = (body as { type?: unknown })?.type;
    const type = typeRaw === "GRADE" || typeRaw === "SEMESTER" ? typeRaw : null;

    const levelRaw = (body as { level?: unknown })?.level;
    const level = typeof levelRaw === "number" ? levelRaw : Number(levelRaw);

    if (!type) {
        return NextResponse.json({ error: "type must be GRADE or SEMESTER" }, { status: 400 });
    }

    if (!Number.isFinite(level) || level < 1 || level > 12) {
        return NextResponse.json({ error: "level must be a number from 1 to 12" }, { status: 400 });
    }

    if (type === "SEMESTER" && level > 2) {
        return NextResponse.json({ error: "semester level must be 1 or 2" }, { status: 400 });
    }

    try {
        const educationLevel = await createEducationLevel(userId, { type, level });
        return NextResponse.json({ educationLevel }, { status: 201 });
    } catch (err: unknown) {
        // Unique constraint violation (userId+type+level)
        if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code?: unknown }).code === "P2002"
        ) {
            return NextResponse.json({ error: "That level already exists" }, { status: 409 });
        }
        throw err;
    }
}
