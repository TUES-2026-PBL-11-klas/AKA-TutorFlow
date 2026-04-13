import { validateSession } from "@/lib/auth";
import { getTestWithQuestions } from "@/services/tests";
import { NextResponse } from "next/server";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ materialId: string }> },
) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const { materialId } = await params;

    const test = await getTestWithQuestions(auth.id, materialId);
    if (!test) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ test });
}
