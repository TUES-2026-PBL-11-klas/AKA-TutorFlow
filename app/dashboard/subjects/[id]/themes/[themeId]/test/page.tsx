"use client";

import type { TestMaterialDto, AttemptResultDto } from "@/services/tests";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { SubjectDto } from "@/services/subjects";

type SubjectsResponse = { subjects: SubjectDto[] };
type TestsResponse = { tests: TestMaterialDto[] };

type PageState =
    | { kind: "loading" }
    | { kind: "generating" }
    | { kind: "test-list"; tests: TestMaterialDto[] }
    | { kind: "taking"; test: TestMaterialDto; currentQ: number; answers: Record<string, string> }
    | { kind: "submitting"; test: TestMaterialDto; currentQ: number; answers: Record<string, string> }
    | { kind: "results"; test: TestMaterialDto; result: AttemptResultDto }
    | { kind: "error"; message: string };

export default function TestPage() {
    const router = useRouter();
    const { id: subjectId, themeId } = useParams<{ id: string; themeId: string }>();

    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [themeName, setThemeName] = useState<string>("");
    const [state, setState] = useState<PageState>({ kind: "loading" });

    const loadData = useCallback(async () => {
        setState({ kind: "loading" });
        try {
            const [subjectsRes, testsRes] = await Promise.all([
                fetch("/api/subjects", { cache: "no-store" }),
                fetch(`/api/tests?themeId=${encodeURIComponent(themeId)}`, { cache: "no-store" }),
            ]);

            if (!subjectsRes.ok) throw new Error(`Failed to load subjects (${subjectsRes.status})`);
            if (!testsRes.ok) throw new Error(`Failed to load tests (${testsRes.status})`);

            const subjectsData = (await subjectsRes.json()) as SubjectsResponse;
            const testsData = (await testsRes.json()) as TestsResponse;

            setSubjects(subjectsData.subjects);

            // Try to find theme name from subjects (themes endpoint not needed for display)
            const subject = subjectsData.subjects.find((s) => s.id === subjectId);
            if (!subject) throw new Error("Subject not found");

            // Load theme name
            const themesRes = await fetch(`/api/themes?subjectId=${encodeURIComponent(subjectId)}`, { cache: "no-store" });
            if (themesRes.ok) {
                const themesData = (await themesRes.json()) as { themes: { id: string; name: string }[] };
                const theme = themesData.themes.find((t) => t.id === themeId);
                if (theme) setThemeName(theme.name);
            }

            const { tests } = testsData;

            setState({ kind: "test-list", tests });
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

    function startTest(test: TestMaterialDto) {
        setState({ kind: "taking", test, currentQ: 0, answers: {} });
    }

    async function handleGenerate() {
        setState({ kind: "generating" });
        try {
            const res = await fetch("/api/ai/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ themeId, count: 5 }),
            });
            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Generation failed (${res.status})`);
            }
            await loadData();
        } catch (err) {
            setState({ kind: "error", message: err instanceof Error ? err.message : "Generation failed" });
        }
    }

    function selectAnswer(questionId: string, option: string) {
        setState((prev) => {
            if (prev.kind !== "taking") return prev;
            return { ...prev, answers: { ...prev.answers, [questionId]: option } };
        });
    }

    function nextQuestion() {
        setState((prev) => {
            if (prev.kind !== "taking") return prev;
            return { ...prev, currentQ: prev.currentQ + 1 };
        });
    }

    async function handleSubmit() {
        if (state.kind !== "taking") return;
        const { test, currentQ, answers } = state;
        setState({ kind: "submitting", test, currentQ, answers });

        try {
            const res = await fetch(`/api/tests/${encodeURIComponent(test.id)}/attempt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            });

            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Submission failed (${res.status})`);
            }

            const result = (await res.json()) as AttemptResultDto;
            setState({ kind: "results", test, result });
        } catch (err) {
            setState({ kind: "error", message: err instanceof Error ? err.message : "Submission failed" });
        }
    }

    function retakeTest() {
        if (state.kind !== "results") return;
        setState({ kind: "taking", test: state.test, currentQ: 0, answers: {} });
    }

    const scorePercent = state.kind === "results"
        ? Math.round((state.result.score / state.result.total) * 100)
        : 0;

    const scoreColor = scorePercent >= 80
        ? "#2d6a4f"
        : scorePercent >= 60
            ? "#a08050"
            : "#c0392b";

    const scoreBg = scorePercent >= 80
        ? "rgba(45,106,79,0.08)"
        : scorePercent >= 60
            ? "rgba(160,128,80,0.08)"
            : "rgba(192,57,43,0.08)";

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
                    {/* Back link */}
                    <Link
                        href={`/dashboard/subjects/${subjectId}`}
                        style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", textDecoration: "none", fontWeight: 300 }}
                    >
                        ← Back to Subject
                    </Link>

                    {/* Heading */}
                    <h1 style={{
                        fontFamily: "var(--font-lora), 'Lora', serif",
                        fontSize: "2rem",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        letterSpacing: "-0.01em",
                        lineHeight: 1.2,
                        marginTop: "0.75rem",
                    }}>
                        {themeName ? `${themeName} — Test` : "Test"}
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
                                    Generating test… this may take 10–30 seconds.
                                </p>
                            </div>
                        )}

                        {/* Test list (multiple tests) */}
                        {state.kind === "test-list" && (
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem" }}>
                                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                        {state.tests.length === 0
                                            ? "No tests for this topic yet."
                                            : `${state.tests.length} test${state.tests.length !== 1 ? "s" : ""} available for this topic.`}
                                    </p>
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
                                        + Generate New Test
                                    </button>
                                </div>
                                {state.tests.length > 0 && (
                                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                        {state.tests.map((test, i) => (
                                            <li key={test.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => startTest(test)}
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
                                                            Test {i + 1}
                                                        </p>
                                                        <p style={{ marginTop: "0.2rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                                            {test.questions.length} question{test.questions.length !== 1 ? "s" : ""} · {new Date(test.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span style={{ fontSize: "0.8125rem", color: "var(--color-accent)", fontWeight: 500 }}>Start →</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Taking test */}
                        {(state.kind === "taking" || state.kind === "submitting") && (() => {
                            const { test, currentQ, answers } = state.kind === "taking" ? state : state;
                            const question = test.questions[currentQ];
                            const total = test.questions.length;
                            const isLast = currentQ === total - 1;
                            const selectedOption = answers[question.id];
                            const isSubmitting = state.kind === "submitting";

                            return (
                                <div>
                                    {/* Progress bar */}
                                    <div style={{ marginBottom: "1.75rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                            <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                                                Question {currentQ + 1} of {total}
                                            </p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                {Object.keys(answers).length} answered
                                            </p>
                                        </div>
                                        <div style={{ height: "3px", background: "var(--color-border)", borderRadius: "2px", overflow: "hidden" }}>
                                            <div style={{
                                                height: "100%",
                                                width: `${((currentQ + 1) / total) * 100}%`,
                                                background: "var(--color-accent)",
                                                borderRadius: "2px",
                                                transition: "width 0.3s ease",
                                            }} />
                                        </div>
                                    </div>

                                    {/* Question card */}
                                    <div style={{
                                        background: "var(--color-card)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "4px",
                                        padding: "2rem 1.75rem",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(100,80,40,0.06)",
                                    }}>
                                        <p style={{
                                            fontFamily: "var(--font-lora), 'Lora', serif",
                                            fontSize: "1.1875rem",
                                            fontWeight: 500,
                                            color: "var(--color-text-primary)",
                                            lineHeight: 1.5,
                                            marginBottom: "1.75rem",
                                        }}>
                                            {question.question}
                                        </p>

                                        {/* Options */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                            {question.options.map((opt, i) => {
                                                const isSelected = selectedOption === opt;
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => selectAnswer(question.id, opt)}
                                                        style={{
                                                            width: "100%",
                                                            padding: "0.875rem 1.125rem",
                                                            textAlign: "left",
                                                            background: isSelected ? "rgba(160,128,80,0.1)" : "transparent",
                                                            border: `1.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border-solid)"}`,
                                                            borderRadius: "3px",
                                                            fontSize: "0.9375rem",
                                                            color: isSelected ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                                            fontWeight: isSelected ? 500 : 400,
                                                            cursor: isSubmitting ? "default" : "pointer",
                                                            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                                            transition: "border-color 0.15s, background 0.15s, color 0.15s",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "0.75rem",
                                                        }}
                                                    >
                                                        <span style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            width: "1.5rem",
                                                            height: "1.5rem",
                                                            borderRadius: "50%",
                                                            border: `1.5px solid ${isSelected ? "var(--color-accent)" : "var(--color-border-solid)"}`,
                                                            background: isSelected ? "var(--color-accent)" : "transparent",
                                                            flexShrink: 0,
                                                            fontSize: "0.6875rem",
                                                            fontWeight: 600,
                                                            color: isSelected ? "var(--color-btn-text)" : "var(--color-text-muted)",
                                                            transition: "background 0.15s, border-color 0.15s, color 0.15s",
                                                        }}>
                                                            {String.fromCharCode(65 + i)}
                                                        </span>
                                                        {opt}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Navigation */}
                                        <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                                            {currentQ > 0 && (
                                                <button
                                                    type="button"
                                                    disabled={isSubmitting}
                                                    onClick={() => setState((prev) => prev.kind === "taking" ? { ...prev, currentQ: prev.currentQ - 1 } : prev)}
                                                    style={{
                                                        padding: "0.6rem 1.25rem",
                                                        background: "transparent",
                                                        border: "1px solid var(--color-border-solid)",
                                                        borderRadius: "3px",
                                                        fontSize: "0.875rem",
                                                        color: "var(--color-text-secondary)",
                                                        cursor: isSubmitting ? "default" : "pointer",
                                                        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                                    }}
                                                >
                                                    Back
                                                </button>
                                            )}
                                            {!isLast ? (
                                                <button
                                                    type="button"
                                                    disabled={!selectedOption || isSubmitting}
                                                    onClick={nextQuestion}
                                                    className="submit-btn"
                                                    style={{ width: "auto", padding: "0.6rem 1.5rem", marginTop: 0 }}
                                                >
                                                    Next
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={!selectedOption || isSubmitting}
                                                    onClick={() => void handleSubmit()}
                                                    className="submit-btn"
                                                    style={{ width: "auto", padding: "0.6rem 1.5rem", marginTop: 0 }}
                                                >
                                                    {isSubmitting ? (
                                                        <><span className="spinner" />Submitting…</>
                                                    ) : "Submit Test"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Results */}
                        {state.kind === "results" && (
                            <div>
                                {/* Score badge */}
                                <div style={{
                                    background: "var(--color-card)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "4px",
                                    padding: "2rem 1.75rem",
                                    marginBottom: "1.5rem",
                                    textAlign: "center",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(100,80,40,0.06)",
                                }}>
                                    <div style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: "5rem",
                                        height: "5rem",
                                        borderRadius: "50%",
                                        background: scoreBg,
                                        border: `2px solid ${scoreColor}`,
                                        marginBottom: "1rem",
                                    }}>
                                        <span style={{
                                            fontFamily: "var(--font-lora), 'Lora', serif",
                                            fontSize: "1.375rem",
                                            fontWeight: 600,
                                            color: scoreColor,
                                        }}>
                                            {scorePercent}%
                                        </span>
                                    </div>
                                    <p style={{
                                        fontFamily: "var(--font-lora), 'Lora', serif",
                                        fontSize: "1.25rem",
                                        fontWeight: 600,
                                        color: "var(--color-text-primary)",
                                        marginBottom: "0.35rem",
                                    }}>
                                        {scorePercent >= 80 ? "Excellent work!" : scorePercent >= 60 ? "Good effort!" : "Keep practicing!"}
                                    </p>
                                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                        You got {state.result.score} out of {state.result.total} questions correct.
                                    </p>

                                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem" }}>
                                        <button
                                            type="button"
                                            onClick={retakeTest}
                                            style={{
                                                padding: "0.55rem 1.25rem",
                                                background: "transparent",
                                                border: "1px solid var(--color-border-solid)",
                                                borderRadius: "3px",
                                                fontSize: "0.8125rem",
                                                color: "var(--color-text-secondary)",
                                                cursor: "pointer",
                                                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                            }}
                                        >
                                            Retake Test
                                        </button>
                                        <Link
                                            href={`/dashboard/subjects/${subjectId}`}
                                            style={{
                                                padding: "0.55rem 1.25rem",
                                                background: "var(--color-btn-primary)",
                                                border: "none",
                                                borderRadius: "3px",
                                                fontSize: "0.8125rem",
                                                color: "var(--color-btn-text)",
                                                textDecoration: "none",
                                                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                                fontWeight: 500,
                                                display: "inline-block",
                                            }}
                                        >
                                            Back to Subject
                                        </Link>
                                    </div>
                                </div>

                                {/* Per-question review */}
                                <div>
                                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.75rem" }}>
                                        Review
                                    </p>
                                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        {state.result.results.map((r, i) => (
                                            <li
                                                key={r.questionId}
                                                style={{
                                                    background: "var(--color-card)",
                                                    border: `1px solid ${r.correct ? "rgba(45,106,79,0.25)" : "rgba(192,57,43,0.2)"}`,
                                                    borderRadius: "4px",
                                                    padding: "1.125rem 1.25rem",
                                                    borderLeft: `3px solid ${r.correct ? "#2d6a4f" : "#c0392b"}`,
                                                }}
                                            >
                                                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                                                    <span style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        width: "1.375rem",
                                                        height: "1.375rem",
                                                        borderRadius: "50%",
                                                        background: r.correct ? "rgba(45,106,79,0.12)" : "rgba(192,57,43,0.1)",
                                                        color: r.correct ? "#2d6a4f" : "#c0392b",
                                                        fontSize: "0.75rem",
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                        marginTop: "0.1rem",
                                                    }}>
                                                        {r.correct ? "✓" : "✗"}
                                                    </span>
                                                    <div style={{ minWidth: 0 }}>
                                                        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.4, marginBottom: "0.5rem" }}>
                                                            <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>Q{i + 1}. </span>
                                                            {r.question}
                                                        </p>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                            {!r.correct && (
                                                                <p style={{ fontSize: "0.8125rem", color: "#c0392b" }}>
                                                                    Your answer: <span style={{ fontWeight: 500 }}>{r.selectedAnswer || "—"}</span>
                                                                </p>
                                                            )}
                                                            <p style={{ fontSize: "0.8125rem", color: "#2d6a4f" }}>
                                                                Correct answer: <span style={{ fontWeight: 500 }}>{r.correctAnswer}</span>
                                                            </p>
                                                        </div>
                                                        {r.explanation && (
                                                            <p style={{
                                                                marginTop: "0.5rem",
                                                                fontSize: "0.8125rem",
                                                                color: "var(--color-text-secondary)",
                                                                fontWeight: 300,
                                                                lineHeight: 1.5,
                                                                paddingTop: "0.5rem",
                                                                borderTop: "1px solid var(--color-border)",
                                                            }}>
                                                                {r.explanation}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
