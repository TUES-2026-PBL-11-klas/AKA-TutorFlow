import { describe, test, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
    prisma: {
        subject: {
            findFirst: vi.fn().mockResolvedValue({ id: "sub-1", userId: "user-1" }),
        },
        theme: {
            findMany: vi.fn().mockResolvedValue([
                { id: "t-1", subjectId: "sub-1", name: "Fractions", createdAt: new Date("2026-01-01") },
                { id: "t-2", subjectId: "sub-1", name: "Algebra", createdAt: new Date("2026-01-02") },
            ]),
            create: vi.fn().mockResolvedValue({
                id: "t-3",
                subjectId: "sub-1",
                name: "Geometry",
                createdAt: new Date("2026-01-03"),
            }),
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
    },
}));

import { listThemes, createTheme, deleteTheme } from "@/services/themes";

describe("themes service", () => {
    test("listThemes returns DTOs with ISO dates", async () => {
        const result = await listThemes("user-1", "sub-1");
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe("Fractions");
        expect(result[0].createdAt).toContain("2026");
    });

    test("createTheme returns a DTO", async () => {
        const result = await createTheme("user-1", "sub-1", "Geometry");
        expect(result.id).toBe("t-3");
        expect(result.name).toBe("Geometry");
    });

    test("deleteTheme returns true when deleted", async () => {
        const result = await deleteTheme("user-1", "t-1");
        expect(result).toBe(true);
    });
});
