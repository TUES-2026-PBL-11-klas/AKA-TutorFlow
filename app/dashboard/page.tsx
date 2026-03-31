"use client";

import type { EducationLevelDto, EducationLevelType } from "@/services/educationLevels";
import type { SubjectDto } from "@/services/subjects";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SubjectsResponse = { subjects: SubjectDto[] };
type CreateSubjectResponse = { subject: SubjectDto };

type EducationLevelsResponse = { educationLevels: EducationLevelDto[] };
type CreateEducationLevelResponse = { educationLevel: EducationLevelDto };

type LoadState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string };

export default function DashboardPage() {
    const [educationLevels, setEducationLevels] = useState<EducationLevelDto[]>([]);
    const [selectedEducationLevelId, setSelectedEducationLevelId] = useState<string>(
        typeof window === "undefined" ? "" : (window.localStorage.getItem("selectedEducationLevelId") ?? ""),
    );
    const [newEducationType, setNewEducationType] = useState<EducationLevelType>("GRADE");
    const [newEducationLevel, setNewEducationLevel] = useState<number>(10);

    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [loadState, setLoadState] = useState<LoadState>({ kind: "idle" });
    const [newSubjectName, setNewSubjectName] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(() => newSubjectName.trim().length > 0 && !isSubmitting, [newSubjectName, isSubmitting]);

    const loadEducationLevels = useCallback(async () => {
        try {
            const res = await fetch("/api/education-levels", { cache: "no-store" });
            if (!res.ok) {
                throw new Error(`Failed to load education levels (${res.status})`);
            }
            const data = (await res.json()) as EducationLevelsResponse;
            setEducationLevels(data.educationLevels);

            // If selection is missing/invalid, pick the first available.
            setSelectedEducationLevelId((current) => {
                const stillExists = data.educationLevels.some((l) => l.id === current);
                if (stillExists) return current;
                const next = data.educationLevels[0]?.id ?? "";
                if (typeof window !== "undefined") window.localStorage.setItem("selectedEducationLevelId", next);
                return next;
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setLoadState({ kind: "error", message });
        }
    }, []);

    const loadSubjects = useCallback(async () => {
        if (!selectedEducationLevelId) {
            setSubjects([]);
            return;
        }
        setLoadState({ kind: "loading" });

        try {
            const res = await fetch(`/api/subjects?educationLevelId=${encodeURIComponent(selectedEducationLevelId)}`, {
                cache: "no-store",
            });
            if (!res.ok) {
                throw new Error(`Failed to load subjects (${res.status})`);
            }
            const data = (await res.json()) as SubjectsResponse;
            setSubjects(data.subjects);
            setLoadState({ kind: "idle" });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setLoadState({ kind: "error", message });
        }
    }, [selectedEducationLevelId]);

    useEffect(() => {
        void loadEducationLevels();
    }, [loadEducationLevels]);

    useEffect(() => {
        void loadSubjects();
    }, [loadSubjects]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.setItem("selectedEducationLevelId", selectedEducationLevelId);
        }
    }, [selectedEducationLevelId]);

    const selectedEducationLevel = useMemo(
        () => educationLevels.find((l) => l.id === selectedEducationLevelId) ?? null,
        [educationLevels, selectedEducationLevelId],
    );

    async function handleCreateEducationLevel(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/education-levels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: newEducationType, level: newEducationLevel }),
            });

            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                const message = typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to create level (${res.status})`;
                throw new Error(message);
            }

            const data = (await res.json()) as CreateEducationLevelResponse;
            setEducationLevels((prev) => [...prev, data.educationLevel].sort((a, b) => {
                if (a.type !== b.type) return a.type.localeCompare(b.type);
                return a.level - b.level;
            }));
            setSelectedEducationLevelId(data.educationLevel.id);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setLoadState({ kind: "error", message });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteSelectedEducationLevel() {
        if (!selectedEducationLevel) return;

        const ok = window.confirm(
            `Delete ${selectedEducationLevel.type.toLowerCase()} ${selectedEducationLevel.level}? This will also delete its subjects.`,
        );
        if (!ok) return;

        const res = await fetch(`/api/education-levels/${encodeURIComponent(selectedEducationLevel.id)}`, {
            method: "DELETE",
        });

        if (res.status === 204) {
            setEducationLevels((prev) => prev.filter((l) => l.id !== selectedEducationLevel.id));
            setSelectedEducationLevelId((prevSelected) => {
                if (prevSelected !== selectedEducationLevel.id) return prevSelected;
                return "";
            });
            setSubjects([]);
            return;
        }

        const maybeJson = await res.json().catch(() => null);
        const message = typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to delete level (${res.status})`;
        setLoadState({ kind: "error", message });
    }

    async function handleCreateSubject(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        if (!selectedEducationLevelId) {
            setLoadState({ kind: "error", message: "Select an education level first" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/subjects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSubjectName.trim(),
                    educationLevelId: selectedEducationLevelId,
                }),
            });

            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                const message = typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to create subject (${res.status})`;
                throw new Error(message);
            }

            const data = (await res.json()) as CreateSubjectResponse;
            setNewSubjectName("");
            setSubjects((prev) => [data.subject, ...prev]);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            setLoadState({ kind: "error", message });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteSubject(id: string) {
        const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, {
            method: "DELETE",
        });

        if (res.status === 204) {
            setSubjects((prev) => prev.filter((s) => s.id !== id));
            return;
        }

        const maybeJson = await res.json().catch(() => null);
        const message = typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to delete subject (${res.status})`;
        setLoadState({ kind: "error", message });
    }

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
            <div className="flex min-h-screen w-full">
                <aside className="w-72 shrink-0 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex h-full flex-col">
                        <div>
                            <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Navigation</p>
                            <nav className="mt-3">
                                <Link
                                    href="/dashboard"
                                    className="block rounded-lg px-3 py-2 text-sm text-zinc-950 hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                                >
                                    Dashboard
                                </Link>
                            </nav>
                        </div>

                        <div className="mt-auto pt-6">
                            <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" open={false}>
                                <summary className="cursor-pointer select-none text-sm font-medium text-zinc-950 dark:text-zinc-50">
                                    Education level
                                    <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                                        {selectedEducationLevel
                                            ? selectedEducationLevel.type === "GRADE"
                                                ? `Grade ${selectedEducationLevel.level}`
                                                : `Semester ${selectedEducationLevel.level}`
                                            : "(select)"}
                                    </span>
                                </summary>

                                <div className="mt-3 space-y-3">
                                    <label className="block text-sm text-zinc-600 dark:text-zinc-400">
                                        Select
                                        <select
                                            value={selectedEducationLevelId}
                                            onChange={(e) => setSelectedEducationLevelId(e.target.value)}
                                            className="mt-1 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                                        >
                                            <option value="">Select…</option>
                                            {educationLevels.map((l) => (
                                                <option key={l.id} value={l.id}>
                                                    {l.type === "GRADE" ? `Grade ${l.level}` : `Semester ${l.level}`}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteSelectedEducationLevel()}
                                        disabled={!selectedEducationLevelId}
                                        className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm text-zinc-950 disabled:opacity-50 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
                                    >
                                        Delete selected
                                    </button>

                                    <form onSubmit={handleCreateEducationLevel} className="flex items-center gap-2">
                                        <select
                                            value={newEducationType}
                                            onChange={(e) => setNewEducationType(e.target.value as EducationLevelType)}
                                            className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                                        >
                                            <option value="GRADE">Grade</option>
                                            <option value="SEMESTER">Semester</option>
                                        </select>

                                        <select
                                            value={newEducationLevel}
                                            onChange={(e) => setNewEducationLevel(Number(e.target.value))}
                                            className="h-10 w-20 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                                        >
                                            {(newEducationType === "SEMESTER"
                                                ? [1, 2]
                                                : Array.from({ length: 12 }, (_, i) => i + 1)
                                            ).map((n) => (
                                                <option key={n} value={n}>
                                                    {n}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="h-10 rounded-lg bg-zinc-950 px-3 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
                                        >
                                            Add
                                        </button>
                                    </form>

                                    {!selectedEducationLevelId ? (
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                            Select (or add) an education level to continue.
                                        </p>
                                    ) : null}
                                </div>
                            </details>
                        </div>
                    </div>
                </aside>

                <main className="w-full flex-1 px-6 py-10">
                    <div className="mx-auto w-full max-w-5xl">
                        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Manage your subjects.</p>

                    <form onSubmit={handleCreateSubject} className="mt-8 flex w-full gap-3">
                        <input
                            value={newSubjectName}
                            onChange={(e) => setNewSubjectName(e.target.value)}
                            placeholder="New subject name"
                            disabled={!selectedEducationLevelId}
                            className="h-12 flex-1 rounded-lg border border-zinc-200 bg-white px-4 text-base outline-none focus:border-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950"
                        />
                        <button
                            type="submit"
                            disabled={!canSubmit || !selectedEducationLevelId}
                            className="h-12 rounded-lg bg-zinc-950 px-5 text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
                        >
                            Create
                        </button>
                    </form>

                    <div className="mt-8">
                        {loadState.kind === "loading" ? (
                            <p className="text-zinc-600 dark:text-zinc-400">Loading…</p>
                        ) : loadState.kind === "error" ? (
                            <p className="text-red-600 dark:text-red-400">{loadState.message}</p>
                        ) : null}

                        {subjects.length === 0 && loadState.kind !== "loading" ? (
                            <p className="text-zinc-600 dark:text-zinc-400">No subjects yet.</p>
                        ) : (
                            <ul className="space-y-3">
                                {subjects.map((subject) => (
                                    <li
                                        key={subject.id}
                                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-base font-medium">{subject.name}</p>
                                            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                                {subject.educationType === "GRADE"
                                                    ? `Grade ${subject.educationLevel}`
                                                    : `Semester ${subject.educationLevel}`}{" "}
                                                • Created {new Date(subject.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => void handleDeleteSubject(subject.id)}
                                            className="ml-4 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-950 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-900"
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
                            className="mt-8 text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                        >
                            Refresh
                        </button>
                    </div>
                </main>
            </div>
        </div>
    );
}
