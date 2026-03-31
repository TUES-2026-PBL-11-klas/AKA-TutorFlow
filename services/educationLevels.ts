import { prisma } from "@/lib/prisma";

export type EducationLevelType = "GRADE" | "SEMESTER";

export type EducationLevelDto = {
    id: string;
    type: EducationLevelType;
    level: number;
    createdAt: string;
};

function toDto(level: { id: string; type: EducationLevelType; level: number; createdAt: Date }): EducationLevelDto {
    return {
        id: level.id,
        type: level.type,
        level: level.level,
        createdAt: level.createdAt.toISOString(),
    };
}

export async function listEducationLevels(userId: string): Promise<EducationLevelDto[]> {
    const levels = await prisma.educationLevel.findMany({
        where: { userId },
        orderBy: [{ type: "asc" }, { level: "asc" }],
        select: { id: true, type: true, level: true, createdAt: true },
    });

    return levels.map(toDto);
}

export async function createEducationLevel(
    userId: string,
    input: { type: EducationLevelType; level: number },
): Promise<EducationLevelDto> {
    const created = await prisma.educationLevel.create({
        data: {
            userId,
            type: input.type,
            level: input.level,
        },
        select: { id: true, type: true, level: true, createdAt: true },
    });

    return toDto(created);
}

/**
 * Deletes an education level owned by userId.
 * Returns true if a row was deleted, false if not found.
 */
export async function deleteEducationLevel(userId: string, id: string): Promise<boolean> {
    const result = await prisma.educationLevel.deleteMany({
        where: { id, userId },
    });

    return result.count > 0;
}
