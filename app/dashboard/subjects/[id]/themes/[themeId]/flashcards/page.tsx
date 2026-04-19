"use client";

import type { MaterialFlashcardsDto } from "@/services/materials";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { SubjectDto } from "@/services/subjects";

type SubjectsResponse = { subjects: SubjectDto[] };
type FlashcardSetsResponse = { flashcardSets: MaterialFlashcardsDto[] };

type PageState =
    | { kind: "loading" }
    | { kind: "generating" }
    | { kind: "flashcard-list"; sets: MaterialFlashcardsDto[] }
    | { kind: "input-terms"; sets: MaterialFlashcardsDto[] }
    | { kind: "studying"; set: MaterialFlashcardsDto; sets: MaterialFlashcardsDto[]; currentCard: number; flipped: boolean }
    | { kind: "error"; message: string };

export default function FlashcardsPage() {
    const router = useRouter();
    const { id: subjectId, themeId } = useParams<{ id: string; themeId: string }>();

    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [themeName, setThemeName] = useState<string>("");
    const [state, setState] = useState<PageState>({ kind: "loading" });
    const [termsInput, setTermsInput] = useState("");

    const loadData = useCallback(async () => {
        setState({ kind: "loading" });
        try {
            const [subjectsRes, flashcardsRes] = await Promise.all([
                fetch("/api/subjects", { cache: "no-store" }),
                fetch(`/api/flashcards?themeId=${encodeURIComponent(themeId)}`, { cache: "no-store" }),
            ]);

            if (!subjectsRes.ok) throw new Error(`Failed to load subjects (${subjectsRes.status})`);
            if (!flashcardsRes.ok) throw new Error(`Failed to load flashcards (${flashcardsRes.status})`);

            const subjectsData = (await subjectsRes.json()) as SubjectsResponse;
            const flashcardsData = (await flashcardsRes.json()) as FlashcardSetsResponse;

            setSubjects(subjectsData.subjects);

            const subject = subjectsData.subjects.find((s) => s.id === subjectId);
            if (!subject) throw new Error("Subject not found");

            const themesRes = await fetch(`/api/themes?subjectId=${encodeURIComponent(subjectId)}`, { cache: "no-store" });
            if (themesRes.ok) {
                const themesData = (await themesRes.json()) as { themes: { id: string; name: string }[] };
                const theme = themesData.themes.find((t) => t.id === themeId);
                if (theme) setThemeName(theme.name);
            }

            setState({ kind: "flashcard-list", sets: flashcardsData.flashcardSets });
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

    function parseTerms(): string[] {
        return termsInput
            .split(/[,\n]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
    }

    async function handleGenerate() {
        const terms = parseTerms();
        if (terms.length === 0) return;

        setState({ kind: "generating" });
        try {
            const res = await fetch("/api/ai/flashcards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ themeId, terms }),
            });
            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Generation failed (${res.status})`);
            }
            setTermsInput("");
            await loadData();
        } catch (err) {
            setState({ kind: "error", message: err instanceof Error ? err.message : "Generation failed" });
        }
    }

    function startStudying(set: MaterialFlashcardsDto, sets: MaterialFlashcardsDto[]) {
        setState({ kind: "studying", set, sets, currentCard: 0, flipped: false });
    }

    function flipCard() {
        setState((prev) => {
            if (prev.kind !== "studying") return prev;
            return { ...prev, flipped: !prev.flipped };
        });
    }

    function nextCard() {
        setState((prev) => {
            if (prev.kind !== "studying") return prev;
            return { ...prev, currentCard: prev.currentCard + 1, flipped: false };
        });
    }

    function prevCard() {
        setState((prev) => {
            if (prev.kind !== "studying") return prev;
            return { ...prev, currentCard: prev.currentCard - 1, flipped: false };
        });
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
                        {themeName ? `${themeName} — Flashcards` : "Flashcards"}
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
                                    Generating flashcards… this may take 10–30 seconds.
                                </p>
                            </div>
                        )}

                        {/* Flashcard list */}
                        {state.kind === "flashcard-list" && (
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem" }}>
                                    <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                        {state.sets.length === 0
                                            ? "No flashcard sets for this topic yet."
                                            : `${state.sets.length} flashcard set${state.sets.length !== 1 ? "s" : ""} available.`}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setState({ kind: "input-terms", sets: state.sets })}
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
                                        + New Flashcards
                                    </button>
                                </div>
                                {state.sets.length > 0 && (
                                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                        {state.sets.map((set, i) => (
                                            <li key={set.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => startStudying(set, state.sets)}
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
                                                            Set {i + 1}
                                                        </p>
                                                        <p style={{ marginTop: "0.2rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                                            {set.flashcards.length} card{set.flashcards.length !== 1 ? "s" : ""} · {new Date(set.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span style={{ fontSize: "0.8125rem", color: "var(--color-accent)", fontWeight: 500 }}>Study →</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* Input terms */}
                        {state.kind === "input-terms" && (
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setState({ kind: "flashcard-list", sets: state.sets })}
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
                                    ← Back
                                </button>

                                <div style={{
                                    background: "var(--color-card)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "4px",
                                    padding: "1.5rem 1.75rem",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(100,80,40,0.06)",
                                }}>
                                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                                        Enter Terms
                                    </p>
                                    <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 300, marginBottom: "1rem" }}>
                                        Enter the terms you want flashcards for — one per line or separated by commas.
                                    </p>
                                    <textarea
                                        value={termsInput}
                                        onChange={(e) => setTermsInput(e.target.value)}
                                        placeholder={"photosynthesis\ncellular respiration\nmitosis\nmeiosis"}
                                        className="field-input"
                                        rows={6}
                                        style={{ width: "100%", resize: "vertical", marginBottom: "1rem" }}
                                    />
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                                            {parseTerms().length} term{parseTerms().length !== 1 ? "s" : ""}
                                        </p>
                                        <button
                                            type="button"
                                            disabled={parseTerms().length === 0}
                                            onClick={() => void handleGenerate()}
                                            className="submit-btn"
                                            style={{ width: "auto", padding: "0.6rem 1.5rem", marginTop: 0, opacity: parseTerms().length === 0 ? 0.5 : 1 }}
                                        >
                                            Generate Flashcards
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Studying flashcards */}
                        {state.kind === "studying" && (() => {
                            const { set, sets, currentCard, flipped } = state;
                            const card = set.flashcards[currentCard];
                            const total = set.flashcards.length;
                            const isFirst = currentCard === 0;
                            const isLast = currentCard === total - 1;

                            return (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setState({ kind: "flashcard-list", sets })}
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
                                        ← Back to Sets
                                    </button>

                                    {/* Progress */}
                                    <div style={{ marginBottom: "1.75rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                                            <p style={{ fontSize: "0.75rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                                                Card {currentCard + 1} of {total}
                                            </p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                                {flipped ? "Definition" : "Term"}
                                            </p>
                                        </div>
                                        <div style={{ height: "3px", background: "var(--color-border)", borderRadius: "2px", overflow: "hidden" }}>
                                            <div style={{
                                                height: "100%",
                                                width: `${((currentCard + 1) / total) * 100}%`,
                                                background: "var(--color-accent)",
                                                borderRadius: "2px",
                                                transition: "width 0.3s ease",
                                            }} />
                                        </div>
                                    </div>

                                    {/* Flashcard */}
                                    <button
                                        type="button"
                                        onClick={flipCard}
                                        style={{
                                            width: "100%",
                                            minHeight: "14rem",
                                            background: "var(--color-card)",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: "4px",
                                            padding: "2.5rem 2rem",
                                            cursor: "pointer",
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            textAlign: "center",
                                            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(100,80,40,0.06)",
                                            transition: "box-shadow 0.2s",
                                        }}
                                    >
                                        <p style={{
                                            fontSize: "0.65rem",
                                            fontWeight: 500,
                                            letterSpacing: "0.1em",
                                            textTransform: "uppercase",
                                            color: "var(--color-accent)",
                                            marginBottom: "1rem",
                                        }}>
                                            {flipped ? "Definition" : "Term"}
                                        </p>
                                        <p style={{
                                            fontFamily: "var(--font-lora), 'Lora', serif",
                                            fontSize: flipped ? "1.0625rem" : "1.375rem",
                                            fontWeight: flipped ? 400 : 600,
                                            color: "var(--color-text-primary)",
                                            lineHeight: 1.6,
                                        }}>
                                            {flipped ? card.back : card.front}
                                        </p>
                                        <p style={{
                                            marginTop: "1.5rem",
                                            fontSize: "0.75rem",
                                            color: "var(--color-text-muted)",
                                            fontWeight: 300,
                                        }}>
                                            Click to {flipped ? "see term" : "reveal definition"}
                                        </p>
                                    </button>

                                    {/* Navigation */}
                                    <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                                        <button
                                            type="button"
                                            disabled={isFirst}
                                            onClick={prevCard}
                                            style={{
                                                padding: "0.6rem 1.25rem",
                                                background: "transparent",
                                                border: "1px solid var(--color-border-solid)",
                                                borderRadius: "3px",
                                                fontSize: "0.875rem",
                                                color: isFirst ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                                                cursor: isFirst ? "not-allowed" : "pointer",
                                                opacity: isFirst ? 0.5 : 1,
                                                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                            }}
                                        >
                                            ← Previous
                                        </button>
                                        <button
                                            type="button"
                                            disabled={isLast}
                                            onClick={nextCard}
                                            style={{
                                                padding: "0.6rem 1.25rem",
                                                background: isLast ? "transparent" : "var(--color-accent)",
                                                border: isLast ? "1px solid var(--color-border-solid)" : "none",
                                                borderRadius: "3px",
                                                fontSize: "0.875rem",
                                                color: isLast ? "var(--color-text-muted)" : "var(--color-cream)",
                                                cursor: isLast ? "not-allowed" : "pointer",
                                                opacity: isLast ? 0.5 : 1,
                                                fontWeight: 500,
                                                fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                            }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </main>
        </div>
    );
}
