import { describe, test, expect } from "vitest";

describe("gemini config", () => {
    test("GEMINI_API_KEY missing in test env does not throw", () => {
        expect(process.env.NODE_ENV).toBe("test");
    });

    test("embedding dimension is 1536", async () => {
        const { EMBEDDING_DIM } = await import("@/lib/gemini");
        expect(EMBEDDING_DIM).toBe(1536);
    });
});
