"use client";

import type { SubjectDto } from "@/services/subjects";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type SubjectsResponse = { subjects: SubjectDto[] };
type CreateSubjectResponse = { subject: SubjectDto };

type LoadState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string };

export default function DashboardPage() {
    const router = useRouter();
    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [loadState, setLoadState] = useState<LoadState>({ kind: "idle" });
    const [newSubjectName, setNewSubjectName] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(
        () => newSubjectName.trim().length > 0 && !isSubmitting,
        [newSubjectName, isSubmitting],
    );

    const loadSubjects = useCallback(async () => {
        setLoadState({ kind: "loading" });
        try {
            const res = await fetch("/api/subjects", { cache: "no-store" });
            if (!res.ok) throw new Error(`Failed to load subjects (${res.status})`);
            const data = (await res.json()) as SubjectsResponse;
            setSubjects(data.subjects);
            setLoadState({ kind: "idle" });
        } catch (err) {
            setLoadState({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
        }
    }, []);

    useEffect(() => { void loadSubjects(); }, [loadSubjects]);

    async function handleLogout() {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
    }

    async function handleCreateSubject(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSubjectName.trim() }),
            });
            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to create subject (${res.status})`);
            }
            const data = (await res.json()) as CreateSubjectResponse;
            setNewSubjectName("");
            setSubjects((prev) => [data.subject, ...prev]);
        } catch (err) {
            setLoadState({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteSubject(id: string) {
        const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: "DELETE" });
        if (res.status === 204) { setSubjects((prev) => prev.filter((s) => s.id !== id)); return; }
        const maybeJson = await res.json().catch(() => null);
        setLoadState({ kind: "error", message: typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to delete subject (${res.status})` });
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--color-cream)", color: "var(--color-text-primary)", display: "flex" }}>
            {/* Sidebar */}
            <aside style={{
                width: "17rem",
                flexShrink: 0,
                borderRight: "1px solid var(--color-border)",
                background: "var(--color-sidebar-bg)",
                padding: "1.5rem 1rem",
                display: "flex",
                flexDirection: "column",
            }}>
                {/* Brand */}
                <div style={{ marginBottom: "2rem" }}>
                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                        TutorFlow
                    </p>
                </div>

                {/* Nav */}
                <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                        Navigation
                    </p>
                    <nav>
                        <Link
                            href="/dashboard"
                            style={{
                                display: "block",
                                borderRadius: "3px",
                                padding: "0.5rem 0.75rem",
                                fontSize: "0.875rem",
                                color: "var(--color-text-primary)",
                                textDecoration: "none",
                                background: "var(--color-hover)",
                                fontWeight: 500,
                            }}
                        >
                            Dashboard
                        </Link>
                    </nav>
                </div>

                {/* Subjects */}
                {subjects.length > 0 && (
                    <div style={{ marginTop: "1.5rem" }}>
                        <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                            Subjects
                        </p>
                        <nav style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                            {subjects.map((subject) => (
                                <Link
                                    key={subject.id}
                                    href={`/dashboard/subjects/${subject.id}`}
                                    style={{
                                        display: "block",
                                        borderRadius: "3px",
                                        padding: "0.4rem 0.75rem",
                                        fontSize: "0.8125rem",
                                        color: "var(--color-text-secondary)",
                                        textDecoration: "none",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {subject.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}

                {/* Logout — bottom of sidebar */}
                <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid var(--color-border)" }}>
                    <button
                        type="button"
                        onClick={() => void handleLogout()}
                        style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            background: "transparent",
                            border: "1px solid var(--color-border-solid)",
                            borderRadius: "3px",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                            cursor: "pointer",
                            textAlign: "left",
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex: 1, padding: "2.5rem 2rem" }}>
                <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
                    <h1 style={{
                        fontFamily: "var(--font-lora), 'Lora', serif",
                        fontSize: "2rem",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.2,
                    }}>
                        Dashboard
                    </h1>
                    <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                        Manage your subjects.
                    </p>

                    {/* Create subject form */}
                    <form onSubmit={handleCreateSubject} style={{ marginTop: "2rem", display: "flex", gap: "0.75rem" }}>
                        <input
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            placeholder="New subject name"
                            className="field-input"
                            style={{ flex: 1, height: "2.75rem" }}
                        />
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="submit-btn"
                            style={{ width: "auto", padding: "0 1.5rem", marginTop: 0, height: "2.75rem" }}
                        >
                            Create
                        </button>
                    </form>

                    {/* Status messages */}
                    <div style={{ marginTop: "1.5rem" }}>
                        {loadState.kind === "loading" && (
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Loading…</p>
                        )}
                        {loadState.kind === "error" && (
                            <p style={{ fontSize: "0.875rem", color: "var(--color-error)" }}>{loadState.message}</p>
                        )}
                    </div>

                    {/* Subject list */}
                    <div style={{ marginTop: "1rem" }}>
                        {subjects.length === 0 && loadState.kind !== "loading" ? (
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>No subjects yet.</p>
                        ) : (
                            <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                {subjects.map((subject) => (
                                    <li
                                        key={subject.id}
                                        style={{ position: "relative" }}
                                    >
                                        <Link
                                            href={`/dashboard/subjects/${subject.id}`}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                background: "var(--color-card)",
                                                border: "1px solid var(--color-border)",
                                                borderRadius: "3px",
                                                padding: "0.875rem 1rem",
                                                textDecoration: "none",
                                                color: "inherit",
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {subject.name}
                                                </p>
                                                <p style={{ marginTop: "0.2rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                                    {new Date(subject.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={(e) => { e.preventDefault(); if (window.confirm(`Delete "${subject.name}"?`)) void handleDeleteSubject(subject.id); }}
                                            style={{
                                                position: "absolute",
                                                right: "1rem",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                padding: "0.4rem 0.75rem",
                                                background: "transparent",
                                                border: "1px solid var(--color-border-solid)",
                                                borderRadius: "3px",
                                                fontSize: "0.8125rem",
                                                color: "var(--color-text-secondary)",
                                                cursor: "pointer",
                                                flexShrink: 0,
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <button
                        onClick={() => void loadSubjects()}
                        style={{
                            marginTop: "1.5rem",
                            background: "none",
                            border: "none",
                            fontSize: "0.8125rem",
                            color: "var(--color-text-muted)",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    >
                        Refresh
                    </button>
                </div>
            </main>
        </div>
    );
}
