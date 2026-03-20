import { ensureDevUser, requireUserId } from "@/lib/auth";
import { deleteSubject } from "@/services/subjects";
import { NextResponse } from "next/server";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const userId = requireUserId();
    await ensureDevUser(userId);

    const deleted = await deleteSubject(userId, id);

    if (!deleted) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
}
