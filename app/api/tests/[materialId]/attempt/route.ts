import { validateSession } from "@/lib/auth";
import { submitAttempt } from "@/services/tests";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ materialId: string }> },
) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const { materialId } = await params;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const answers = (body as { answers?: unknown })?.answers;
    if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
        return NextResponse.json({ error: "answers must be an object mapping questionId to selected option" }, { status: 400 });
    }

    const result = await submitAttempt(auth.id, materialId, answers as Record<string, string>);
    if (!result) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json(result, { status: 201 });
}
