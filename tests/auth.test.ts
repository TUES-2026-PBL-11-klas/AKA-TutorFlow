import { describe, test, expect, vi } from "vitest";

vi.mock("@/lib/supabase.server", () => ({
    createServerClient: vi.fn().mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "user-1", email: "test@test.com" } },
                error: null,
            }),
        },
    }),
}));

import { validateSession } from "@/lib/auth";
import { NextResponse } from "next/server";

describe("auth", () => {
    test("validateSession returns user when session is valid", async () => {
        const result = await validateSession();
        expect(result).not.toBeInstanceOf(NextResponse);
        expect((result as { id: string }).id).toBe("user-1");
    });
});
