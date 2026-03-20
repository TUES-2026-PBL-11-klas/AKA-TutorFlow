import { prisma } from "@/lib/prisma";

export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Temporary user-id provider.
 *
 * Today: returns a constant dev id.
 * Later: replace implementation to read the authenticated user's id.
 */
export function requireUserId(): string {
    return DEV_USER_ID;
}

/**
 * Prisma schema requires `User.email` and `User.gradeLevel`, so in dev-mode we
 * upsert a single placeholder user row to satisfy foreign keys.
 */
export async function ensureDevUser(userId: string): Promise<void> {
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            email: "dev@tutorflow.local",
            gradeLevel: 10,
        },
    });
}
