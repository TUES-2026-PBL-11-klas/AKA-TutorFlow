import { validateSession } from "@/lib/auth";
import { deleteSubject } from "@/services/subjects";
import { NextResponse } from "next/server";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const deleted = await deleteSubject(auth.id, id);

    if (!deleted) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
}
