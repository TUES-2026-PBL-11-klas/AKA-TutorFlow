/**
 * lib/supabase.server.ts — server-only clients (API routes, middleware)
 * Never import this in client components.
 */
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** API routes / server components — reads & writes httpOnly cookies */
export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRServerClient(URL, ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

/** Service role — server-only, bypasses RLS (user creation / deletion) */
export function createAdminClient() {
  return createSupabaseClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/** Middleware — reads/writes cookies on the request/response pair */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse
) {
  return createSSRServerClient(URL, ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}
