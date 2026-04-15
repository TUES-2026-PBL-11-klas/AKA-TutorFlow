import { validateSession } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase.server";
import { createUploadedFile, listUploadedFiles } from "@/services/uploads";
import { NextResponse } from "next/server";

const BUCKET = "uploads";
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

export async function GET(request: Request) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const themeId = new URL(request.url).searchParams.get("themeId")?.trim() ?? "";
    if (!themeId) {
        return NextResponse.json({ error: "themeId is required" }, { status: 400 });
    }

    const files = await listUploadedFiles(auth.id, themeId);
    return NextResponse.json({ files });
}

export async function POST(request: Request) {
    const auth = await validateSession();
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const themeId = formData.get("themeId") as string | null;

    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (!themeId?.trim()) {
        return NextResponse.json({ error: "themeId is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "File type not allowed. Use JPEG, PNG, WebP, GIF, or PDF." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: "File too large. Maximum size is 10 MB." }, { status: 400 });
    }

    // Upload to Supabase Storage
    const storagePath = `${auth.id}/${themeId}/${Date.now()}-${file.name}`;
    const supabase = await createServerClient();
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    try {
        const uploaded = await createUploadedFile(
            auth.id,
            themeId.trim(),
            file.name,
            urlData.publicUrl,
            file.type,
            file.size,
        );
        return NextResponse.json({ file: uploaded }, { status: 201 });
    } catch {
        // Clean up the uploaded file if DB insert fails
        await supabase.storage.from(BUCKET).remove([storagePath]);
        return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
}
