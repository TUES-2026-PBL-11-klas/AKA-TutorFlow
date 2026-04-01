import { validateSession } from "@/lib/auth";
import { createSubject, listSubjects } from "@/services/subjects";
import { NextResponse } from "next/server";

export async function GET() {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const subjects = await listSubjects(auth.id);
    return NextResponse.json({ subjects });
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

    const name = typeof (body as { name?: unknown })?.name === "string"
        ? (body as { name: string }).name.trim()
        : "";

    if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const subject = await createSubject(auth.id, name);
    return NextResponse.json({ subject }, { status: 201 });
}
