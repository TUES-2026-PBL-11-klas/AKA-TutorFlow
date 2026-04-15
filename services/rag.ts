import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase.server";
import { embedText } from "@/lib/gemini";

const BUCKET = "uploads";

export type RetrievedChunk = {
    id: string;
    fileId: string;
    content: string;
    similarity: number;
};

export type RetrievedFile = {
    fileId: string;
    filename: string;
    mimeType: string;
    data: Buffer;
};

/**
 * Retrieve top-k FileChunk rows for a theme by cosine similarity to `query`.
 * Ownership is doubly enforced (themeId + userId), both derived server-side.
 */
export async function retrieveChunks(args: {
    userId: string;
    themeId: string;
    query: string;
    k?: number;
}): Promise<RetrievedChunk[]> {
    const { userId, themeId, query } = args;
    const k = args.k ?? 8;

    const queryEmbedding = await embedText(query);
    const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

    const rows = await prisma.$queryRaw<
        Array<{ id: string; fileId: string; content: string; similarity: number }>
    >`
        SELECT id, "fileId", content, (1 - (embedding <=> ${embeddingLiteral}::vector))::float8 AS similarity
        FROM "FileChunk"
        WHERE "themeId" = ${themeId} AND "userId" = ${userId}
        ORDER BY embedding <=> ${embeddingLiteral}::vector
        LIMIT ${k}
    `;

    return rows;
}

/**
 * Load the raw bytes of the top unique files referenced by the retrieved chunks,
 * so they can be passed as inlineData parts into a generation prompt.
 * Limits to `limit` distinct files (default 3) to keep the prompt size sane.
 */
export async function loadFilesForChunks(args: {
    userId: string;
    chunks: RetrievedChunk[];
    limit?: number;
}): Promise<RetrievedFile[]> {
    const { userId, chunks } = args;
    const limit = args.limit ?? 3;

    const seen = new Set<string>();
    const fileIds: string[] = [];
    for (const c of chunks) {
        if (seen.has(c.fileId)) continue;
        seen.add(c.fileId);
        fileIds.push(c.fileId);
        if (fileIds.length >= limit) break;
    }
    if (fileIds.length === 0) return [];

    const files = await prisma.uploadedFile.findMany({
        where: { id: { in: fileIds }, userId },
        select: { id: true, filename: true, mimeType: true, url: true },
    });

    const admin = createAdminClient();
    const results: RetrievedFile[] = [];
    for (const f of files) {
        const path = extractStoragePath(f.url);
        if (!path) continue;
        const { data: blob, error } = await admin.storage.from(BUCKET).download(path);
        if (error || !blob) continue;
        const data = Buffer.from(await blob.arrayBuffer());
        results.push({ fileId: f.id, filename: f.filename, mimeType: f.mimeType, data });
    }

    // Preserve the retrieval ranking
    results.sort((a, b) => fileIds.indexOf(a.fileId) - fileIds.indexOf(b.fileId));
    return results;
}

function extractStoragePath(publicUrl: string): string | null {
    const m = publicUrl.match(/\/storage\/v1\/object\/public\/uploads\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : null;
}
