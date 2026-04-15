import { prisma } from "@/lib/prisma";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export type TestQuestionDto = {
    id: string;
    question: string;
    options: string[];
};

export type TestMaterialDto = {
    id: string;
    themeId: string;
    createdAt: string;
    questions: TestQuestionDto[];
};

export type AttemptResultDto = {
    score: number;
    total: number;
    results: {
        questionId: string;
        question: string;
        selectedAnswer: string;
        correctAnswer: string;
        correct: boolean;
        explanation: string | null;
    }[];
};

// ─── Service functions ────────────────────────────────────────────────────────

export async function listTestsForTheme(
    userId: string,
    themeId: string,
): Promise<TestMaterialDto[]> {
    const materials = await prisma.material.findMany({
        where: {
            themeId,
            type: "TEST",
            theme: { subject: { userId } },
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            themeId: true,
            createdAt: true,
            testQuestions: {
                select: { id: true, question: true, options: true },
            },
        },
    });

    return materials.map((m) => ({
        id: m.id,
        themeId: m.themeId,
        createdAt: m.createdAt.toISOString(),
        questions: m.testQuestions,
    }));
}

export async function getTestWithQuestions(
    userId: string,
    materialId: string,
): Promise<TestMaterialDto | null> {
    const material = await prisma.material.findFirst({
        where: {
            id: materialId,
            type: "TEST",
            theme: { subject: { userId } },
        },
        select: {
            id: true,
            themeId: true,
            createdAt: true,
            testQuestions: {
                select: { id: true, question: true, options: true },
            },
        },
    });

    if (!material) return null;

    return {
        id: material.id,
        themeId: material.themeId,
        createdAt: material.createdAt.toISOString(),
        questions: material.testQuestions,
    };
}

export async function submitAttempt(
    userId: string,
    materialId: string,
    answers: Record<string, string>,
): Promise<AttemptResultDto | null> {
    // Load questions with correct answers for grading
    const material = await prisma.material.findFirst({
        where: {
            id: materialId,
            type: "TEST",
            theme: { subject: { userId } },
        },
        select: {
            testQuestions: {
                select: {
                    id: true,
                    question: true,
                    correctAnswer: true,
                    options: true,
                    explanation: true,
                },
            },
        },
    });

    if (!material) return null;

    const results = material.testQuestions.map((q) => {
        const selected = answers[q.id] ?? "";
        return {
            questionId: q.id,
            question: q.question,
            selectedAnswer: selected,
            correctAnswer: q.correctAnswer,
            correct: selected === q.correctAnswer,
            explanation: q.explanation ?? null,
        };
    });

    const score = results.filter((r) => r.correct).length;
    const total = results.length;

    await prisma.testAttempt.create({
        data: {
            materialId,
            userId,
            score,
            answers: answers as object,
        },
    });

    return { score, total, results };
}
