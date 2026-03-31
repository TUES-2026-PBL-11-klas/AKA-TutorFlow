import { prisma } from "@/lib/prisma";

export type SubjectDto = {
    id: string;
    name: string;
    educationLevelId: string | null;
    educationType: "GRADE" | "SEMESTER" | null;
    educationLevel: number | null;
    createdAt: string;
};

function toSubjectDto(subject: {
    id: string;
    name: string;
    educationLevelId: string | null;
    educationLevel: { type: "GRADE" | "SEMESTER"; level: number } | null;
    createdAt: Date;
}): SubjectDto {
    return {
        id: subject.id,
        name: subject.name,
        educationLevelId: subject.educationLevelId,
        educationType: subject.educationLevel?.type ?? null,
        educationLevel: subject.educationLevel?.level ?? null,
        createdAt: subject.createdAt.toISOString(),
    };
}

export async function listSubjects(userId: string, educationLevelId: string): Promise<SubjectDto[]> {
    const subjects = await prisma.subject.findMany({
        where: { userId, educationLevelId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            educationLevelId: true,
            createdAt: true,
            educationLevel: {
                select: { type: true, level: true },
            },
        },
    });

    return subjects.map(toSubjectDto);
}

export async function createSubject(
    userId: string,
    input: { name: string; educationLevelId: string },
): Promise<SubjectDto> {
    const subject = await prisma.subject.create({
        data: {
            userId,
            name: input.name,
            educationLevelId: input.educationLevelId,
        },
        select: {
            id: true,
            name: true,
            educationLevelId: true,
            createdAt: true,
            educationLevel: {
                select: { type: true, level: true },
            },
        },
    });

    return toSubjectDto(subject);
}

/**
 * Deletes a subject owned by userId.
 * Returns true if a row was deleted, false if not found.
 */
export async function deleteSubject(userId: string, subjectId: string): Promise<boolean> {
    const result = await prisma.subject.deleteMany({
        where: { id: subjectId, userId },
    });

    return result.count > 0;
}
