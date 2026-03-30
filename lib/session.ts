/**
 * lib/session.ts
 * Client-side session helpers — store, read, and clear the Supabase session
 * from localStorage. Import these in pages/components only (not in middleware).
 */

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (seconds)
  userId: string;
  email: string;
}

const SESSION_KEY = "sb_session";

export function saveSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: StoredSession = JSON.parse(raw);
    // Treat as expired if within 30 s of expiry
    if (session.expiresAt - 30 < Date.now() / 1000) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
