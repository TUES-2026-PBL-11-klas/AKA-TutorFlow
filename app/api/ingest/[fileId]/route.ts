import { validateSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ingestFile } from "@/services/ingestion";
import { NextResponse } from "next/server";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ fileId: string }> },
) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const { fileId } = await params;

    const file = await prisma.uploadedFile.findFirst({
        where: { id: fileId, userId: auth.id },
        select: { id: true },
    });
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    try {
        await ingestFile(fileId);
        return NextResponse.json({ ok: true });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Ingestion failed";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
