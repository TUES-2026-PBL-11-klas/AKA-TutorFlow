import { validateSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase.server";
import { deleteUploadedFile } from "@/services/uploads";
import { NextResponse } from "next/server";

const BUCKET = "uploads";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const { deleted, storagePath } = await deleteUploadedFile(auth.id, id);

    if (!deleted) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Clean up from Supabase Storage
    if (storagePath) {
        const supabase = await createServerClient();
        await supabase.storage.from(BUCKET).remove([storagePath]);
    }

    return new NextResponse(null, { status: 204 });
}
