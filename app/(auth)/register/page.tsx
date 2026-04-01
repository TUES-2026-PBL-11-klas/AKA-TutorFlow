"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { AuthCard } from "@/components/auth/AuthCard";

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGradeLevel] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8)
      errors.password = "Password must be at least 8 characters.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      // Create auth user + Prisma profile in one server call
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, grade }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      // Supabase establishes the session in httpOnly cookies
      const { error: authError } = await createClient().auth.signInWithPassword(
        { email, password }
      );

      if (authError) {
        router.push("/login?registered=1");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <p className="auth-eyebrow">TutorFlow</p>
      <h1 className="auth-heading">Start learning.</h1>
      <p className="auth-subheading">
        Create your account to get personalised study help.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {error && <div className="global-error">{error}</div>}

        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`field-input${fieldErrors.email ? " has-error" : ""}`}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            autoComplete="email"
            autoFocus
          />
          {fieldErrors.email && (
            <p className="field-error">{fieldErrors.email}</p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className={`field-input${fieldErrors.password ? " has-error" : ""}`}
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            autoComplete="new-password"
          />
          {fieldErrors.password && (
            <p className="field-error">{fieldErrors.password}</p>
          )}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="grade">
            Grade level
          </label>
          <select
            id="grade"
            className="field-select"
            value={grade}
            onChange={(e) => setGradeLevel(Number(e.target.value))}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <div className="divider" />
      <p className="auth-footer">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}
