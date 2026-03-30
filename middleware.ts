/**
 * middleware.ts  (project root — Next.js picks this up automatically)
 *
 * Redirects unauthenticated users away from protected routes.
 * Uses the HttpOnly cookie written by the login page as the presence signal.
 * The actual JWT is verified server-side in each API route via lib/auth.ts;
 * middleware only checks whether a session cookie exists so it can redirect
 * without making a network call on every request.
 */

import { NextRequest, NextResponse } from "next/server";

/** Routes that require a logged-in user. */
const PROTECTED_PREFIXES = ["/dashboard", "/study", "/profile", "/settings"];

/** Routes that logged-in users should not revisit. */
const AUTH_ROUTES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Read the lightweight presence cookie (set by the login page via a
  // Set-Cookie header on the /api/auth/login response or via the client).
  const hasSession = req.cookies.has("sb_access_token");

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  // Unauthenticated user hitting a protected page → send to /login
  if (isProtected && !hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname); // preserve intended destination
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user hitting /login or /register → send to /dashboard
  if (isAuthRoute && hasSession) {
    const dashboardUrl = req.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.searchParams.delete("redirectTo");
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except Next.js internals and static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
