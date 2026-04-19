import { describe, test, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        theme: {
            findFirst: vi.fn().mockResolvedValue({ id: "theme-1", subjectId: "sub-1" }),
        },
        uploadedFile: {
            create: vi.fn().mockResolvedValue({
                id: "file-1",
                themeId: "theme-1",
                filename: "notes.pdf",
                url: "https://example.com/notes.pdf",
                mimeType: "application/pdf",
                sizeBytes: 1024,
                status: "PENDING",
                statusError: null,
                createdAt: new Date("2026-01-01"),
            }),
            findMany: vi.fn().mockResolvedValue([]),
        },
    },
}));

import { createUploadedFile, listUploadedFiles } from "@/services/uploads";

describe("uploads service", () => {
    test("createUploadedFile returns a DTO with string createdAt", async () => {
        const result = await createUploadedFile("user-1", "theme-1", "notes.pdf", "https://example.com/notes.pdf", "application/pdf", 1024);
        expect(result.id).toBe("file-1");
        expect(result.filename).toBe("notes.pdf");
        expect(result.status).toBe("PENDING");
        expect(typeof result.createdAt).toBe("string");
    });

    test("listUploadedFiles returns an array", async () => {
        const result = await listUploadedFiles("user-1", "theme-1");
        expect(Array.isArray(result)).toBe(true);
    });
});
