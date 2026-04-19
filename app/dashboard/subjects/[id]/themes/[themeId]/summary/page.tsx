"use client";

import type { MaterialSummaryDto } from "@/services/materials";
import Link from "next/link";
import Markdown from "react-markdown";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { SubjectDto } from "@/services/subjects";

type SubjectsResponse = { subjects: SubjectDto[] };
type SummariesResponse = { summaries: MaterialSummaryDto[] };
type GenerateResponse = { material: MaterialSummaryDto };

type PageState =
    | { kind: "loading" }
    | { kind: "generating" }
    | { kind: "summary-list"; summaries: MaterialSummaryDto[] }
    | { kind: "viewing"; summary: MaterialSummaryDto; summaries: MaterialSummaryDto[] }
    | { kind: "error"; message: string };

export default function SummaryPage() {
    const router = useRouter();
    const { id: subjectId, themeId } = useParams<{ id: string; themeId: string }>();

    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [themeName, setThemeName] = useState<string>("");
    const [state, setState] = useState<PageState>({ kind: "loading" });
    const [notes, setNotes] = useState("");

    const loadData = useCallback(async () => {
        setState({ kind: "loading" });
        try {
            const [subjectsRes, summariesRes] = await Promise.all([
                fetch("/api/subjects", { cache: "no-store" }),
                fetch(`/api/summaries?themeId=${encodeURIComponent(themeId)}`, { cache: "no-store" }),
            ]);

            if (!subjectsRes.ok) throw new Error(`Failed to load subjects (${subjectsRes.status})`);
            if (!summariesRes.ok) throw new Error(`Failed to load summaries (${summariesRes.status})`);

            const subjectsData = (await subjectsRes.json()) as SubjectsResponse;
            const summariesData = (await summariesRes.json()) as SummariesResponse;

            setSubjects(subjectsData.subjects);

            const subject = subjectsData.subjects.find((s) => s.id === subjectId);
            if (!subject) throw new Error("Subject not found");

            const themesRes = await fetch(`/api/themes?subjectId=${encodeURIComponent(subjectId)}`, { cache: "no-store" });
            if (themesRes.ok) {
                const themesData = (await themesRes.json()) as { themes: { id: string; name: string }[] };
                const theme = themesData.themes.find((t) => t.id === themeId);
                if (theme) setThemeName(theme.name);
            }

            setState({ kind: "summary-list", summaries: summariesData.summaries });
        } catch (err) {
            setState({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
        }
    }, [subjectId, themeId]);

    useEffect(() => { void loadData(); }, [loadData]);

    async function handleLogout() {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
    }

    async function handleGenerate() {
        setState({ kind: "generating" });
        try {
            const res = await fetch("/api/ai/summary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ themeId, notes: notes.trim() || undefined }),
            });
            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Generation failed (${res.status})`);
            }
            setNotes("");
            await loadData();
        } catch (err) {
            setState({ kind: "error", message: err instanceof Error ? err.message : "Generation failed" });
        }
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
                <div style={{ marginBottom: "2rem" }}>
                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                        TutorFlow
                    </p>
                </div>

                <div>
                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                        Navigation
                    </p>
                    <nav style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                        <Link href="/dashboard" style={{ display: "block", borderRadius: "3px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "var(--color-text-primary)", textDecoration: "none" }}>
                            Dashboard
                        </Link>
                        <Link href={`/dashboard/subjects/${subjectId}`} style={{ display: "block", borderRadius: "3px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", color: "var(--color-text-primary)", textDecoration: "none" }}>
                            ← Back to Subject
                        </Link>
                    </nav>
                </div>

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
                                        color: subject.id === subjectId ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                        textDecoration: "none",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        background: subject.id === subjectId ? "var(--color-hover)" : "transparent",
                                        fontWeight: subject.id === subjectId ? 500 : 400,
                                    }}
                                >
                                    {subject.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}

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
                <div style={{ maxWidth: "42rem", margin: "0 auto" }}>
                    <Link
                        href={`/dashboard/subjects/${subjectId}`}
                        style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", textDecoration: "none", fontWeight: 300 }}
                    >
                        ← Back to Subject
                    </Link>

                    <h1 style={{
                        fontFamily: "var(--font-lora), 'Lora', serif",
                        fontSize: "2rem",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.2,
                        marginTop: "0.75rem",
                    }}>
                        {themeName ? `${themeName} — Summary` : "Summary"}
                    </h1>

                    <div style={{ marginTop: "2rem" }}>
                        {/* Loading */}
                        {state.kind === "loading" && (
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Loading…</p>
                        )}

                        {/* Error */}
                        {state.kind === "error" && (
                            <div className="global-error">{state.message}</div>
                        )}

                        {/* Generating */}
                        {state.kind === "generating" && (
                            <div style={{
                                background: "var(--color-card)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "4px",
                                padding: "2.5rem 2rem",
                                textAlign: "center",
                            }}>
                                <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                    Generating summary… this may take 10–30 seconds.
                                </p>
                            </div>
                        )}

                        {/* Summary list */}
                        {state.kind === "summary-list" && (
                            <div>
                                {/* Generate controls */}
                                <div style={{
                                    background: "var(--color-card)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "4px",
                                    padding: "1.25rem 1.5rem",
                                    marginBottom: "1.5rem",
                                }}>
                                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.75rem" }}>
                                        Generate New Summary
                                    </p>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optional notes — e.g. focus on chapter 3, include examples…"
                                        className="field-input"
                                        rows={2}
                                        style={{ width: "100%", resize: "vertical", marginBottom: "0.75rem" }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => void handleGenerate()}
                                        style={{
                                            padding: "0.5rem 1rem",
                                            background: "var(--color-accent)",
                                            color: "var(--color-cream)",
                                            border: "none",
                                            borderRadius: "3px",
                                            fontSize: "0.8125rem",
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                        }}
                                    >
                                        + Generate Summary
                                    </button>
                                </div>

                                {/* Existing summaries */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                        {state.summaries.length === 0
                                            ? "No summaries for this topic yet."
                                            : `${state.summaries.length} summary${state.summaries.length !== 1 ? "ies" : ""} available.`}
                                    </p>
                                </div>
                                {state.summaries.length > 0 && (
                                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                        {state.summaries.map((summary, i) => (
                                            <li key={summary.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => setState({ kind: "viewing", summary, summaries: state.summaries })}
                                                    style={{
                                                        width: "100%",
                                                        background: "var(--color-card)",
                                                        border: "1px solid var(--color-border)",
                                                        borderRadius: "4px",
                                                        padding: "1rem 1.25rem",
                                                        textAlign: "left",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        transition: "border-color 0.15s",
                                                    }}
                                                >
                                                    <div>
                                                        <p style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--color-text-primary)" }}>
                                                            Summary {i + 1}
                                                        </p>
                                                        <p style={{ marginTop: "0.2rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                                            {new Date(summary.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span style={{ fontSize: "0.8125rem", color: "var(--color-accent)", fontWeight: 500 }}>View →</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Viewing a summary */}
                        {state.kind === "viewing" && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setState({ kind: "summary-list", summaries: state.summaries })}
                                    style={{
                                        padding: "0.4rem 0.875rem",
                                        background: "transparent",
                                        border: "1px solid var(--color-border-solid)",
                                        borderRadius: "3px",
                                        fontSize: "0.75rem",
                                        color: "var(--color-text-secondary)",
                                        cursor: "pointer",
                                        marginBottom: "1.25rem",
                                        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                    }}
                                >
                                    ← Back to Summaries
                                </button>

                                <div style={{
                                    background: "var(--color-card)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "4px",
                                    padding: "2rem 1.75rem",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(100,80,40,0.06)",
                                }}>
                                    <style>{`
                                        .markdown-content h1,
                                        .markdown-content h2,
                                        .markdown-content h3,
                                        .markdown-content h4 {
                                            font-family: var(--font-lora), 'Lora', serif;
                                            color: var(--color-text-primary);
                                            margin-top: 1.5em;
                                            margin-bottom: 0.5em;
                                            line-height: 1.3;
                                        }
                                        .markdown-content h1 { font-size: 1.5rem; font-weight: 600; }
                                        .markdown-content h2 { font-size: 1.25rem; font-weight: 600; }
                                        .markdown-content h3 { font-size: 1.0625rem; font-weight: 600; }
                                        .markdown-content h4 { font-size: 0.9375rem; font-weight: 600; }
                                        .markdown-content h1:first-child,
                                        .markdown-content h2:first-child,
                                        .markdown-content h3:first-child { margin-top: 0; }
                                        .markdown-content p {
                                            margin: 0.75em 0;
                                            font-size: 0.9375rem;
                                            line-height: 1.7;
                                            color: var(--color-text-primary);
                                        }
                                        .markdown-content ul,
                                        .markdown-content ol {
                                            margin: 0.75em 0;
                                            padding-left: 1.5em;
                                        }
                                        .markdown-content li {
                                            margin: 0.35em 0;
                                            font-size: 0.9375rem;
                                            line-height: 1.7;
                                            color: var(--color-text-primary);
                                        }
                                        .markdown-content strong {
                                            font-weight: 600;
                                            color: var(--color-text-primary);
                                        }
                                        .markdown-content em {
                                            font-style: italic;
                                        }
                                        .markdown-content code {
                                            background: var(--color-border);
                                            padding: 0.15em 0.4em;
                                            border-radius: 3px;
                                            font-size: 0.85em;
                                        }
                                        .markdown-content pre {
                                            background: var(--color-sidebar-bg);
                                            border: 1px solid var(--color-border);
                                            border-radius: 4px;
                                            padding: 1em;
                                            overflow-x: auto;
                                            margin: 1em 0;
                                        }
                                        .markdown-content pre code {
                                            background: none;
                                            padding: 0;
                                        }
                                        .markdown-content blockquote {
                                            border-left: 3px solid var(--color-accent);
                                            margin: 1em 0;
                                            padding: 0.5em 1em;
                                            color: var(--color-text-secondary);
                                        }
                                        .markdown-content hr {
                                            border: none;
                                            border-top: 1px solid var(--color-border);
                                            margin: 1.5em 0;
                                        }
                                        .markdown-content table {
                                            border-collapse: collapse;
                                            width: 100%;
                                            margin: 1em 0;
                                        }
                                        .markdown-content th,
                                        .markdown-content td {
                                            border: 1px solid var(--color-border);
                                            padding: 0.5em 0.75em;
                                            font-size: 0.875rem;
                                            text-align: left;
                                        }
                                        .markdown-content th {
                                            background: var(--color-sidebar-bg);
                                            font-weight: 600;
                                        }
                                    `}</style>
                                    <div className="markdown-content">
                                        <Markdown>{state.summary.markdown}</Markdown>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
