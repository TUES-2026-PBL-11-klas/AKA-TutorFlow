import { prisma } from "@/lib/prisma";

export type ThemeDto = {
    id: string;
    subjectId: string;
    name: string;
    createdAt: string;
};

export async function listThemes(userId: string, subjectId: string): Promise<ThemeDto[]> {
    const themes = await prisma.theme.findMany({
        where: { subjectId, subject: { userId } },
        orderBy: { createdAt: "desc" },
        select: { id: true, subjectId: true, name: true, createdAt: true },
    });

    return themes.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }));
}

export async function createTheme(userId: string, subjectId: string, name: string): Promise<ThemeDto> {
    // Verify the subject belongs to this user before creating
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, userId } });
    if (!subject) throw new Error("Subject not found");

    const theme = await prisma.theme.create({
        data: { subjectId, name },
        select: { id: true, subjectId: true, name: true, createdAt: true },
    });

    return { ...theme, createdAt: theme.createdAt.toISOString() };
}

export async function deleteTheme(userId: string, themeId: string): Promise<boolean> {
    const result = await prisma.theme.deleteMany({
        where: { id: themeId, subject: { userId } },
    });
    return result.count > 0;
}
