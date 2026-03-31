import { ensureDevUser, requireUserId } from "@/lib/auth";
import { deleteEducationLevel } from "@/services/educationLevels";
import { NextResponse } from "next/server";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    const userId = requireUserId();
    await ensureDevUser(userId);

    const deleted = await deleteEducationLevel(userId, id);

    if (!deleted) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
}
