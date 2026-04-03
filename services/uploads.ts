import { prisma } from "@/lib/prisma";

export type UploadedFileDto = {
    id: string;
    themeId: string | null;
    filename: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
};

export async function createUploadedFile(
    userId: string,
    themeId: string,
    filename: string,
    url: string,
    mimeType: string,
    sizeBytes: number,
): Promise<UploadedFileDto> {
    // Verify the theme belongs to this user
    const theme = await prisma.theme.findFirst({
        where: { id: themeId, subject: { userId } },
    });
    if (!theme) throw new Error("Theme not found");

    const file = await prisma.uploadedFile.create({
        data: { userId, themeId, filename, url, mimeType, sizeBytes },
        select: { id: true, themeId: true, filename: true, url: true, mimeType: true, sizeBytes: true, createdAt: true },
    });

    return { ...file, createdAt: file.createdAt.toISOString() };
}

export async function listUploadedFiles(userId: string, themeId: string): Promise<UploadedFileDto[]> {
    const files = await prisma.uploadedFile.findMany({
        where: { themeId, user: { id: userId } },
        orderBy: { createdAt: "desc" },
        select: { id: true, themeId: true, filename: true, url: true, mimeType: true, sizeBytes: true, createdAt: true },
    });

    return files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }));
}

export async function deleteUploadedFile(userId: string, fileId: string): Promise<{ deleted: boolean; storagePath: string | null }> {
    const file = await prisma.uploadedFile.findFirst({
        where: { id: fileId, userId },
        select: { id: true, url: true },
    });
    if (!file) return { deleted: false, storagePath: null };

    await prisma.uploadedFile.delete({ where: { id: fileId } });

    // Extract storage path from the URL for cleanup
    const match = file.url.match(/\/uploads\/(.+)$/);
    return { deleted: true, storagePath: match ? match[1] : null };
}
