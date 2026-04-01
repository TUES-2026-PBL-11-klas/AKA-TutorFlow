import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase.server";

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Validates the session from the incoming request cookies (set by Supabase SSR).
 *
 * Usage in a protected API route:
 *
 *   const result = await validateSession();
 *   if (result instanceof NextResponse) return result;
 *   const { id, email } = result; // AuthenticatedUser
 */
export async function validateSession(): Promise<
  AuthenticatedUser | NextResponse
> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: "Invalid or expired session. Please log in again." },
      { status: 401 }
    );
  }

  return { id: user.id, email: user.email! };
}
