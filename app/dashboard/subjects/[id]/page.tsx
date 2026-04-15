"use client";

import type { SubjectDto } from "@/services/subjects";
import type { ThemeDto } from "@/services/themes";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";

type FileStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

type UploadedFileDto = {
    id: string;
    themeId: string | null;
    filename: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    status: FileStatus;
    statusError: string | null;
    createdAt: string;
};

type SubjectsResponse = { subjects: SubjectDto[] };
type ThemesResponse = { themes: ThemeDto[] };
type CreateThemeResponse = { theme: ThemeDto };
type UploadResponse = { file: UploadedFileDto };
type FilesResponse = { files: UploadedFileDto[] };

type LoadState =
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "error"; message: string };

export default function SubjectDetailPage() {
    const router = useRouter();
    const { id } = useParams<{ id: string }>();

    const [subjects, setSubjects] = useState<SubjectDto[]>([]);
    const [subjectName, setSubjectName] = useState<string>("");
    const [themes, setThemes] = useState<ThemeDto[]>([]);
    const [loadState, setLoadState] = useState<LoadState>({ kind: "idle" });
    const [themeFiles, setThemeFiles] = useState<Record<string, UploadedFileDto[]>>({});
    const [uploadingThemeId, setUploadingThemeId] = useState<string | null>(null);
    const [newThemeName, setNewThemeName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSubmit = useMemo(
        () => newThemeName.trim().length > 0 && !isSubmitting,
        [newThemeName, isSubmitting],
    );

    const loadData = useCallback(async () => {
        setLoadState({ kind: "loading" });
        try {
            const [subjectsRes, themesRes] = await Promise.all([
                fetch("/api/subjects", { cache: "no-store" }),
                fetch(`/api/themes?subjectId=${encodeURIComponent(id)}`, { cache: "no-store" }),
            ]);

            if (!subjectsRes.ok) throw new Error(`Failed to load subjects (${subjectsRes.status})`);
            if (!themesRes.ok) throw new Error(`Failed to load themes (${themesRes.status})`);

            const subjectsData = (await subjectsRes.json()) as SubjectsResponse;
            const themesData = (await themesRes.json()) as ThemesResponse;

            setSubjects(subjectsData.subjects);

            const subject = subjectsData.subjects.find((s) => s.id === id);
            if (!subject) throw new Error("Subject not found");

            setSubjectName(subject.name);
            setThemes(themesData.themes);

            // Load files for each theme
            const filesByTheme: Record<string, UploadedFileDto[]> = {};
            await Promise.all(
                themesData.themes.map(async (t) => {
                    const res = await fetch(`/api/uploads?themeId=${encodeURIComponent(t.id)}`, { cache: "no-store" });
                    if (res.ok) {
                        const data = (await res.json()) as FilesResponse;
                        filesByTheme[t.id] = data.files;
                    }
                }),
            );
            setThemeFiles(filesByTheme);
            setLoadState({ kind: "idle" });
        } catch (err) {
            setLoadState({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
        }
    }, [id]);

    useEffect(() => { void loadData(); }, [loadData]);

    async function handleLogout() {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
    }

    async function handleCreateTheme(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/themes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subjectId: id, name: newThemeName.trim() }),
            });
            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to create topic (${res.status})`);
            }
            const data = (await res.json()) as CreateThemeResponse;
            setNewThemeName("");
            setThemes((prev) => [data.theme, ...prev]);
        } catch (err) {
            setLoadState({ kind: "error", message: err instanceof Error ? err.message : "Unknown error" });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteTheme(themeId: string) {
        const res = await fetch(`/api/themes/${encodeURIComponent(themeId)}`, { method: "DELETE" });
        if (res.status === 204) { setThemes((prev) => prev.filter((t) => t.id !== themeId)); return; }
        const maybeJson = await res.json().catch(() => null);
        setLoadState({ kind: "error", message: typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to delete topic (${res.status})` });
    }

    function handleUploadClick(themeId: string) {
        setUploadingThemeId(themeId);
        fileInputRef.current?.click();
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !uploadingThemeId) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("themeId", uploadingThemeId);

        try {
            const res = await fetch("/api/uploads", { method: "POST", body: formData });
            if (!res.ok) {
                const maybeJson = await res.json().catch(() => null);
                throw new Error(typeof maybeJson?.error === "string" ? maybeJson.error : `Upload failed (${res.status})`);
            }
            const data = (await res.json()) as UploadResponse;
            const themeIdForFile = uploadingThemeId;
            setThemeFiles((prev) => ({
                ...prev,
                [themeIdForFile]: [data.file, ...(prev[themeIdForFile] ?? [])],
            }));
            // Fire-and-forget ingestion (runs in its own Lambda invocation on Amplify)
            void fetch(`/api/ingest/${encodeURIComponent(data.file.id)}`, { method: "POST" }).catch(() => {});
            // Poll for status until it reaches a terminal state
            void pollFileStatus(themeIdForFile, data.file.id);
        } catch (err) {
            setLoadState({ kind: "error", message: err instanceof Error ? err.message : "Upload failed" });
        } finally {
            setUploadingThemeId(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function pollFileStatus(themeId: string, fileId: string) {
        for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const res = await fetch(`/api/uploads?themeId=${encodeURIComponent(themeId)}`, { cache: "no-store" });
            if (!res.ok) continue;
            const data = (await res.json()) as FilesResponse;
            const current = data.files.find((f) => f.id === fileId);
            if (!current) return;
            setThemeFiles((prev) => ({
                ...prev,
                [themeId]: (prev[themeId] ?? []).map((f) => (f.id === fileId ? current : f)),
            }));
            if (current.status === "READY" || current.status === "FAILED") return;
        }
    }

    async function handleDeleteFile(themeId: string, fileId: string) {
        const res = await fetch(`/api/uploads/${encodeURIComponent(fileId)}`, { method: "DELETE" });
        if (res.status === 204) {
            setThemeFiles((prev) => ({
                ...prev,
                [themeId]: (prev[themeId] ?? []).filter((f) => f.id !== fileId),
            }));
            return;
        }
        const maybeJson = await res.json().catch(() => null);
        setLoadState({ kind: "error", message: typeof maybeJson?.error === "string" ? maybeJson.error : `Failed to delete file (${res.status})` });
    }

    const actionButtons = [
        { label: "Generate Summary" },
        { label: "Generate Flashcards" },
    ];

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
                                        color: subject.id === id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                                        textDecoration: "none",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        background: subject.id === id ? "var(--color-hover)" : "transparent",
                                        fontWeight: subject.id === id ? 500 : 400,
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

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                style={{ display: "none" }}
                onChange={handleFileSelected}
            />

            {/* Main content */}
            <main style={{ flex: 1, padding: "2.5rem 2rem" }}>
                <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
                    {/* Back link */}
                    <Link
                        href="/dashboard"
                        style={{
                            fontSize: "0.8125rem",
                            color: "var(--color-text-secondary)",
                            textDecoration: "none",
                            fontWeight: 300,
                        }}
                    >
                        ← Back to Dashboard
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
                        {subjectName || "Loading…"}
                    </h1>
                    <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                        Manage topics and study tools.
                    </p>

                    {/* Status messages */}
                    <div style={{ marginTop: "1.5rem" }}>
                        {loadState.kind === "loading" && (
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Loading…</p>
                        )}
                        {loadState.kind === "error" && (
                            <p style={{ fontSize: "0.875rem", color: "var(--color-error)" }}>{loadState.message}</p>
                        )}
                    </div>

                    {/* Topics section */}
                    <div style={{ marginTop: "2rem" }}>
                        <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.75rem" }}>
                            Topics
                        </p>

                        {/* Create theme form */}
                        <form onSubmit={handleCreateTheme} style={{ display: "flex", gap: "0.75rem" }}>
                            <input
                                value={newThemeName}
                                onChange={(e) => setNewThemeName(e.target.value)}
                                placeholder="New topic name"
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

                        {/* Theme list */}
                        <div style={{ marginTop: "1rem" }}>
                            {themes.length === 0 && loadState.kind !== "loading" ? (
                                <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>No topics yet. Create one to get started.</p>
                            ) : (
                                <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                                    {themes.map((theme) => (
                                        <li
                                            key={theme.id}
                                            style={{
                                                background: "var(--color-card)",
                                                border: "1px solid var(--color-border)",
                                                borderRadius: "3px",
                                                padding: "1rem",
                                            }}
                                        >
                                            {/* Theme header row */}
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ fontSize: "0.9375rem", fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {theme.name}
                                                    </p>
                                                    <p style={{ marginTop: "0.2rem", fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 300 }}>
                                                        {new Date(theme.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => { if (window.confirm(`Delete "${theme.name}"?`)) void handleDeleteTheme(theme.id); }}
                                                    style={{
                                                        marginLeft: "1rem",
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
                                            </div>

                                            {/* Action buttons */}
                                            <div style={{
                                                display: "flex",
                                                gap: "0.5rem",
                                                marginTop: "0.75rem",
                                                paddingTop: "0.75rem",
                                                borderTop: "1px solid var(--color-border)",
                                                flexWrap: "wrap",
                                            }}>
                                                {/* Upload File — functional */}
                                                <button
                                                    type="button"
                                                    disabled={uploadingThemeId === theme.id}
                                                    onClick={() => handleUploadClick(theme.id)}
                                                    style={{
                                                        padding: "0.4rem 0.875rem",
                                                        background: "transparent",
                                                        border: "1px solid var(--color-border-solid)",
                                                        borderRadius: "3px",
                                                        fontSize: "0.75rem",
                                                        color: "var(--color-text-primary)",
                                                        cursor: uploadingThemeId === theme.id ? "wait" : "pointer",
                                                        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                                    }}
                                                >
                                                    {uploadingThemeId === theme.id ? "Uploading…" : "Upload File"}
                                                </button>

                                                {/* Take Test — functional link */}
                                                <Link
                                                    href={`/dashboard/subjects/${id}/themes/${theme.id}/test`}
                                                    style={{
                                                        padding: "0.4rem 0.875rem",
                                                        background: "transparent",
                                                        border: "1px solid var(--color-border-solid)",
                                                        borderRadius: "3px",
                                                        fontSize: "0.75rem",
                                                        color: "var(--color-text-primary)",
                                                        textDecoration: "none",
                                                        fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                                        display: "inline-block",
                                                    }}
                                                >
                                                    Take Test
                                                </Link>

                                                {/* Remaining buttons — disabled placeholders */}
                                                {actionButtons.map((action) => (
                                                    <button
                                                        key={action.label}
                                                        type="button"
                                                        disabled
                                                        title="Coming soon"
                                                        style={{
                                                            padding: "0.4rem 0.875rem",
                                                            background: "transparent",
                                                            border: "1px solid var(--color-border-solid)",
                                                            borderRadius: "3px",
                                                            fontSize: "0.75rem",
                                                            color: "var(--color-text-secondary)",
                                                            cursor: "not-allowed",
                                                            opacity: 0.7,
                                                            fontFamily: "var(--font-dm-sans), 'DM Sans', sans-serif",
                                                        }}
                                                    >
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Uploaded files */}
                                            {(themeFiles[theme.id] ?? []).length > 0 && (
                                                <div style={{
                                                    marginTop: "0.75rem",
                                                    paddingTop: "0.75rem",
                                                    borderTop: "1px solid var(--color-border)",
                                                }}>
                                                    <p style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                                                        Files
                                                    </p>
                                                    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                                                        {(themeFiles[theme.id] ?? []).map((file) => (
                                                            <li
                                                                key={file.id}
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "space-between",
                                                                    padding: "0.4rem 0.625rem",
                                                                    background: "var(--color-sidebar-bg)",
                                                                    borderRadius: "3px",
                                                                    fontSize: "0.8125rem",
                                                                }}
                                                            >
                                                                <span style={{
                                                                    color: "var(--color-text-primary)",
                                                                    fontWeight: 400,
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    whiteSpace: "nowrap",
                                                                    minWidth: 0,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "0.5rem",
                                                                    flex: 1,
                                                                }}>
                                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{file.filename}</span>
                                                                    <StatusBadge status={file.status} error={file.statusError} />
                                                                </span>
                                                                <button
                                                                    onClick={() => { if (window.confirm(`Delete "${file.filename}"?`)) void handleDeleteFile(theme.id, file.id); }}
                                                                    style={{
                                                                        marginLeft: "0.5rem",
                                                                        padding: "0.2rem 0.5rem",
                                                                        background: "transparent",
                                                                        border: "none",
                                                                        fontSize: "0.75rem",
                                                                        color: "var(--color-text-muted)",
                                                                        cursor: "pointer",
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatusBadge({ status, error }: { status: FileStatus; error: string | null }) {
    const styles: Record<FileStatus, { bg: string; fg: string; label: string }> = {
        PENDING: { bg: "var(--color-border)", fg: "var(--color-text-muted)", label: "Pending" },
        PROCESSING: { bg: "var(--color-border)", fg: "var(--color-text-secondary)", label: "Processing…" },
        READY: { bg: "var(--color-accent)", fg: "var(--color-cream)", label: "Ready" },
        FAILED: { bg: "#fee", fg: "#c33", label: "Failed" },
    };
    const s = styles[status];
    return (
        <span
            title={status === "FAILED" && error ? error : undefined}
            style={{
                padding: "0.1rem 0.4rem",
                fontSize: "0.65rem",
                background: s.bg,
                color: s.fg,
                borderRadius: "10px",
                flexShrink: 0,
                fontWeight: 500,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
            }}
        >
            {s.label}
        </span>
    );
}
