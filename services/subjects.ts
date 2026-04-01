import { prisma } from "@/lib/prisma";

export type SubjectDto = {
    id: string;
    name: string;
    createdAt: string;
};

export async function listSubjects(userId: string): Promise<SubjectDto[]> {
    const subjects = await prisma.subject.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, createdAt: true },
    });

    return subjects.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
}

export async function createSubject(userId: string, name: string): Promise<SubjectDto> {
    const subject = await prisma.subject.create({
        data: { userId, name },
        select: { id: true, name: true, createdAt: true },
    });

    return { ...subject, createdAt: subject.createdAt.toISOString() };
}

export async function deleteSubject(userId: string, subjectId: string): Promise<boolean> {
    const result = await prisma.subject.deleteMany({ where: { id: subjectId, userId } });
    return result.count > 0;
}
