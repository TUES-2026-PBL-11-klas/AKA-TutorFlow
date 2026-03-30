"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveSession } from "@/lib/session";

const GRADE_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gradeLevel, setGradeLevel] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    gradeLevel?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!email) errors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8)
      errors.password = "Password must be at least 8 characters.";
    if (!gradeLevel) errors.gradeLevel = "Please select your grade level.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, gradeLevel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      // Auto-login after successful registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.session) {
        saveSession({
          accessToken: loginData.session.accessToken,
          refreshToken: loginData.session.refreshToken,
          expiresAt: loginData.session.expiresAt,
          userId: loginData.user.id,
          email: loginData.user.email,
        });
        document.cookie = `sb_access_token=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        router.push("/dashboard");
      } else {
        router.push("/login?registered=1");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .auth-root {
          min-height: 100vh;
          background-color: #f5f0e8;
          background-image:
            radial-gradient(ellipse 80% 60% at 20% 10%, rgba(210,190,150,0.35) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 85% 80%, rgba(180,210,190,0.25) 0%, transparent 55%);
          display: flex; align-items: center; justify-content: center;
          padding: 2rem; font-family: 'DM Sans', sans-serif;
        }
        .auth-card {
          width: 100%; max-width: 440px;
          background: rgba(255,252,245,0.85);
          border: 1px solid rgba(180,160,120,0.25); border-radius: 4px;
          padding: 3rem 2.75rem 2.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(100,80,40,0.08), inset 0 1px 0 rgba(255,255,255,0.8);
          opacity: 0; transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .auth-card.visible { opacity: 1; transform: translateY(0); }
        .auth-eyebrow { font-size: 0.7rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #a08050; margin-bottom: 0.6rem; }
        .auth-heading { font-family: 'Lora', serif; font-size: 2rem; font-weight: 600; color: #2c2418; line-height: 1.2; margin-bottom: 0.4rem; }
        .auth-subheading { font-size: 0.875rem; color: #7a6a54; font-weight: 300; margin-bottom: 2.25rem; line-height: 1.5; }
        .field { margin-bottom: 1.25rem; }
        .field-label { display: block; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #6b5c45; margin-bottom: 0.45rem; }
        .field-input, .field-select {
          width: 100%; padding: 0.7rem 0.875rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.9375rem; font-weight: 300; color: #2c2418;
          background: rgba(255,252,246,0.9); border: 1px solid rgba(160,130,80,0.3);
          border-radius: 3px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; appearance: none;
        }
        .field-input::placeholder { color: #b8a88a; }
        .field-input:focus, .field-select:focus { border-color: #8b6f3e; box-shadow: 0 0 0 3px rgba(139,111,62,0.1); }
        .field-input.has-error, .field-select.has-error { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,0.08); }
        .field-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238b6f3e' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.875rem center; padding-right: 2.25rem; cursor: pointer;
        }
        .field-error { margin-top: 0.35rem; font-size: 0.78rem; color: #c0392b; }
        .global-error {
          background: rgba(192,57,43,0.07); border: 1px solid rgba(192,57,43,0.2);
          border-radius: 3px; padding: 0.65rem 0.875rem; font-size: 0.85rem; color: #b03020;
          margin-bottom: 1.25rem; line-height: 1.4;
        }
        .submit-btn {
          width: 100%; padding: 0.8rem; margin-top: 0.5rem;
          background: #3d2e14; color: #f5edd8;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
          letter-spacing: 0.04em; border: none; border-radius: 3px; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .submit-btn:hover:not(:disabled) { background: #2a1f0d; }
        .submit-btn:active:not(:disabled) { transform: scale(0.99); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          display: inline-block; width: 14px; height: 14px;
          border: 2px solid rgba(245,237,216,0.4); border-top-color: #f5edd8;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 0.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .divider { height: 1px; background: linear-gradient(to right, transparent, rgba(160,130,80,0.2), transparent); margin: 1.75rem 0; }
        .auth-footer { text-align: center; font-size: 0.82rem; color: #8a7560; }
        .auth-footer a { color: #7a5c28; font-weight: 500; text-decoration: none; border-bottom: 1px solid rgba(122,92,40,0.3); transition: border-color 0.2s; }
        .auth-footer a:hover { border-color: #7a5c28; }
      `}</style>

      <div className="auth-root">
        <div className={`auth-card${mounted ? " visible" : ""}`}>
          <p className="auth-eyebrow">TutorFlow</p>
          <h1 className="auth-heading">Start learning.</h1>
          <p className="auth-subheading">Create your account to get personalised study help.</p>

          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="global-error">{error}</div>}

            <div className="field">
              <label className="field-label" htmlFor="email">Email</label>
              <input
                id="email" type="email"
                className={`field-input${fieldErrors.email ? " has-error" : ""}`}
                placeholder="you@example.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: undefined })); }}
                autoComplete="email" autoFocus
              />
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password" type="password"
                className={`field-input${fieldErrors.password ? " has-error" : ""}`}
                placeholder="At least 8 characters" value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: undefined })); }}
                autoComplete="new-password"
              />
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="gradeLevel">Grade level</label>
              <select
                id="gradeLevel"
                className={`field-select${fieldErrors.gradeLevel ? " has-error" : ""}`}
                value={gradeLevel}
                onChange={(e) => { setGradeLevel(Number(e.target.value)); setFieldErrors((f) => ({ ...f, gradeLevel: undefined })); }}
              >
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
              {fieldErrors.gradeLevel && <p className="field-error">{fieldErrors.gradeLevel}</p>}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading && <span className="spinner" />}
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="divider" />
          <p className="auth-footer">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
