import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase.server";
import { embedParts } from "@/lib/gemini";

const BUCKET = "uploads";

/**
 * Ingest an uploaded file into the RAG pipeline:
 *   1. Mark PROCESSING
 *   2. Download bytes from Supabase Storage
 *   3. Embed the file directly via Gemini Embedding 2 (multimodal: images + PDFs)
 *   4. Replace any existing FileChunk rows for this file (idempotent)
 *   5. Mark READY (or FAILED on error)
 */
export async function ingestFile(fileId: string): Promise<void> {
    const file = await prisma.uploadedFile.findUnique({
        where: { id: fileId },
        select: {
            id: true,
            userId: true,
            themeId: true,
            filename: true,
            url: true,
            mimeType: true,
        },
    });
    if (!file) throw new Error("File not found");
    if (!file.themeId) throw new Error("File is not attached to a theme");

    await prisma.uploadedFile.update({
        where: { id: fileId },
        data: { status: "PROCESSING", statusError: null },
    });

    try {
        const storagePath = extractStoragePath(file.url);
        if (!storagePath) throw new Error("Could not derive storage path from file URL");
        if (!storagePath.startsWith(`${file.userId}/${file.themeId}/`)) {
            throw new Error("Storage path does not match file ownership");
        }

        const admin = createAdminClient();
        const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(storagePath);
        if (downloadError || !blob) throw new Error(`Download failed: ${downloadError?.message ?? "no data"}`);

        const bytes = Buffer.from(await blob.arrayBuffer());

        const embedding = await embedParts([
            { kind: "inline", mimeType: file.mimeType, data: bytes },
        ]);
        const embeddingLiteral = `[${embedding.join(",")}]`;
        const kind = file.mimeType.startsWith("image/") ? "image" : "pdf";
        const content = `[${kind}: ${file.filename}]`;

        await prisma.$transaction([
            prisma.fileChunk.deleteMany({ where: { fileId } }),
            prisma.$executeRaw`
                INSERT INTO "FileChunk" ("id", "fileId", "themeId", "userId", "chunkIndex", "content", "embedding", "createdAt")
                VALUES (gen_random_uuid()::text, ${fileId}, ${file.themeId}, ${file.userId}, 0, ${content}, ${embeddingLiteral}::vector, NOW())
            `,
        ]);

        await prisma.uploadedFile.update({
            where: { id: fileId },
            data: { status: "READY", statusError: null },
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown ingestion error";
        await prisma.uploadedFile.update({
            where: { id: fileId },
            data: { status: "FAILED", statusError: message },
        }).catch(() => {});
        throw err;
    }
}

function extractStoragePath(publicUrl: string): string | null {
    // Supabase public URLs look like: https://xyz.supabase.co/storage/v1/object/public/uploads/<path>
    const m = publicUrl.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
}
