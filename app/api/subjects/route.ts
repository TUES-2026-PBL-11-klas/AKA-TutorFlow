import { ensureDevUser, requireUserId } from "@/lib/auth";
import { createSubject, listSubjects } from "@/services/subjects";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const userId = requireUserId();
    await ensureDevUser(userId);

    const url = new URL(request.url);
    const educationLevelId = url.searchParams.get("educationLevelId")?.trim() ?? "";
    if (!educationLevelId) {
        return NextResponse.json({ error: "educationLevelId is required" }, { status: 400 });
    }

    const subjects = await listSubjects(userId, educationLevelId);
    return NextResponse.json({ subjects });
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

    const name = typeof (body as { name?: unknown })?.name === "string" ? (body as { name: string }).name : "";
    const trimmedName = name.trim();

    const educationLevelId = typeof (body as { educationLevelId?: unknown })?.educationLevelId === "string"
        ? ((body as { educationLevelId: string }).educationLevelId ?? "")
        : "";
    const trimmedEducationLevelId = educationLevelId.trim();

    if (!trimmedName) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!trimmedEducationLevelId) {
        return NextResponse.json({ error: "educationLevelId is required" }, { status: 400 });
    }

    const subject = await createSubject(userId, {
        name: trimmedName,
        educationLevelId: trimmedEducationLevelId,
    });
    return NextResponse.json({ subject }, { status: 201 });
}
