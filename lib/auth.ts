import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Supabase client (anon key — session verification is done via JWT, not admin)
// ---------------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Validates the Supabase session from an incoming request.
 *
 * Expects the request to carry a Bearer token in the Authorization header:
 *   Authorization: Bearer <access_token>
 *
 * Returns the authenticated user on success, or a NextResponse 401 that the
 * calling route should return immediately.
 *
 * Usage in a protected route:
 *
 *   const result = await validateSession(req);
 *   if (result instanceof NextResponse) return result;
 *   const { id, email } = result; // AuthenticatedUser
 */
export async function validateSession(
  req: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header. Expected: Bearer <token>" },
      { status: 401 }
    );
  }

  const accessToken = authHeader.slice(7); // Strip "Bearer "

  // Verify the JWT with Supabase — this also checks expiry
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Invalid or expired session. Please log in again." },
      { status: 401 }
    );
  }

  return {
    id: data.user.id,
    email: data.user.email!,
  };
}

// ---------------------------------------------------------------------------
// Dev-mode helpers (preserved from original implementation)
// ---------------------------------------------------------------------------

export const DEV_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Temporary user-id provider.
 *
 * Today: returns a constant dev id.
 * Later: replace with `validateSession` to read the authenticated user's id.
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
