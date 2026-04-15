import { prisma } from "@/lib/prisma";
import { generateText, generateJson, Type } from "@/lib/gemini";
import { retrieveChunks, loadFilesForChunks, type RetrievedFile } from "@/services/rag";

export type MaterialSummaryDto = {
    id: string;
    themeId: string;
    type: "SUMMARY";
    markdown: string;
    createdAt: string;
};

export type MaterialFlashcardsDto = {
    id: string;
    themeId: string;
    type: "FLASHCARD";
    flashcards: Array<{ id: string; front: string; back: string }>;
    createdAt: string;
};

export type MaterialTestDto = {
    id: string;
    themeId: string;
    type: "TEST";
    questions: Array<{
        id: string;
        question: string;
        options: string[];
        correctAnswer: string;
        explanation: string | null;
    }>;
    createdAt: string;
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function loadThemeContext(userId: string, themeId: string) {
    const theme = await prisma.theme.findFirst({
        where: { id: themeId, subject: { userId } },
        select: {
            id: true,
            name: true,
            subject: { select: { name: true, user: { select: { grade: true } } } },
        },
    });
    if (!theme) return null;
    return {
        themeName: theme.name,
        subjectName: theme.subject.name,
        grade: theme.subject.user.grade,
    };
}

function buildHeader(args: {
    grade: number;
    subjectName: string;
    themeName: string;
    files: RetrievedFile[];
}): string {
    const { grade, subjectName, themeName, files } = args;
    let header = `You are tutoring a Grade ${grade} student.\nSubject: ${subjectName}. Topic: ${themeName}.\n\n`;
    if (files.length > 0) {
        header +=
            `The student has uploaded the following file${files.length > 1 ? "s" : ""} to this topic, attached below: ${files.map((f) => f.filename).join(", ")}.\n` +
            "Base your output strictly on the actual content of these files. Do not ask meta-questions about 'reviewing' or 'studying' them — engage with their concrete content.\n\n";
    }
    return header;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function createSummaryMaterial(args: {
    userId: string;
    themeId: string;
    notes?: string;
}): Promise<MaterialSummaryDto | null> {
    const ctx = await loadThemeContext(args.userId, args.themeId);
    if (!ctx) return null;

    const query = `${ctx.themeName}${args.notes ? " " + args.notes : ""}`;
    const chunks = await retrieveChunks({ userId: args.userId, themeId: args.themeId, query });
    const files = await loadFilesForChunks({ userId: args.userId, chunks });

    const prompt =
        buildHeader({ ...ctx, files }) +
        (args.notes ? `The student added these notes: ${args.notes}\n\n` : "") +
        "Produce a clear Markdown summary with headings, bullet lists, definitions, and examples appropriate for the student's grade level. Output only the Markdown, no preamble.";

    const markdown = await generateText(prompt, { temperature: 0.7, files });

    const material = await prisma.material.create({
        data: {
            themeId: args.themeId,
            type: "SUMMARY",
            content: { markdown },
        },
        select: { id: true, themeId: true, createdAt: true },
    });

    return {
        id: material.id,
        themeId: material.themeId,
        type: "SUMMARY",
        markdown,
        createdAt: material.createdAt.toISOString(),
    };
}

// ─── Flashcards ───────────────────────────────────────────────────────────────

const FLASHCARDS_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
        },
        required: ["front", "back"],
    },
};

export async function createFlashcardsMaterial(args: {
    userId: string;
    themeId: string;
    terms: string[];
}): Promise<MaterialFlashcardsDto | null> {
    const ctx = await loadThemeContext(args.userId, args.themeId);
    if (!ctx) return null;
    if (args.terms.length === 0) throw new Error("terms must be a non-empty array");

    const query = `${ctx.themeName} ${args.terms.join(" ")}`;
    const chunks = await retrieveChunks({ userId: args.userId, themeId: args.themeId, query });
    const files = await loadFilesForChunks({ userId: args.userId, chunks });

    const prompt =
        buildHeader({ ...ctx, files }) +
        `Produce a flashcard for each of the following terms. Front should be the term, back should be a concise definition or explanation appropriate for the student's grade. Terms:\n${args.terms.map((t) => `- ${t}`).join("\n")}`;

    const generated = await generateJson<Array<{ front: string; back: string }>>(prompt, FLASHCARDS_SCHEMA, { temperature: 0.6, files });
    if (!Array.isArray(generated) || generated.length === 0) throw new Error("Gemini returned no flashcards");

    const material = await prisma.$transaction(async (tx) => {
        const m = await tx.material.create({
            data: {
                themeId: args.themeId,
                type: "FLASHCARD",
                content: { terms: args.terms },
                flashcards: {
                    create: generated.map((f) => ({ front: f.front, back: f.back })),
                },
            },
            select: {
                id: true,
                themeId: true,
                createdAt: true,
                flashcards: { select: { id: true, front: true, back: true } },
            },
        });
        return m;
    });

    return {
        id: material.id,
        themeId: material.themeId,
        type: "FLASHCARD",
        flashcards: material.flashcards,
        createdAt: material.createdAt.toISOString(),
    };
}

// ─── Test (MCQ) ───────────────────────────────────────────────────────────────

const TEST_SCHEMA = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
        },
        required: ["question", "options", "correctAnswer", "explanation"],
    },
};

export async function createTestMaterial(args: {
    userId: string;
    themeId: string;
    count: number;
}): Promise<MaterialTestDto | null> {
    const ctx = await loadThemeContext(args.userId, args.themeId);
    if (!ctx) return null;

    const query = ctx.themeName;
    const chunks = await retrieveChunks({ userId: args.userId, themeId: args.themeId, query });
    const files = await loadFilesForChunks({ userId: args.userId, chunks });

    const prompt =
        buildHeader({ ...ctx, files }) +
        `Produce exactly ${args.count} multiple-choice questions that test the student's understanding of the actual concepts in the attached files. Each question must have 4 distinct options. The correctAnswer string must equal one of the options exactly. Include a brief explanation for each.`;

    const generated = await generateJson<
        Array<{ question: string; options: string[]; correctAnswer: string; explanation: string }>
    >(prompt, TEST_SCHEMA, { temperature: 0.3, files });

    if (!Array.isArray(generated) || generated.length === 0) throw new Error("Gemini returned no questions");

    // Defensive: ensure correctAnswer appears in options
    for (const q of generated) {
        if (!q.options.includes(q.correctAnswer)) {
            throw new Error("Generated question has a correctAnswer that is not among its options");
        }
    }

    const material = await prisma.material.create({
        data: {
            themeId: args.themeId,
            type: "TEST",
            content: { count: args.count },
            testQuestions: {
                create: generated.map((q) => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                })),
            },
        },
        select: {
            id: true,
            themeId: true,
            createdAt: true,
            testQuestions: {
                select: {
                    id: true,
                    question: true,
                    options: true,
                    correctAnswer: true,
                    explanation: true,
                },
            },
        },
    });

    return {
        id: material.id,
        themeId: material.themeId,
        type: "TEST",
        questions: material.testQuestions.map((q) => ({ ...q, explanation: q.explanation ?? null })),
        createdAt: material.createdAt.toISOString(),
    };
}
