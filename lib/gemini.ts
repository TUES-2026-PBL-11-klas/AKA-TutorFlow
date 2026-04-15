/**
 * lib/gemini.ts — thin wrapper around @google/genai.
 * Uses Gemini Embedding 2 (multimodal: text + images + PDFs in one vector space)
 * for RAG, and Gemini 2.5 Flash for generation.
 */
import { GoogleGenAI, Type, type Schema } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY && process.env.NODE_ENV !== "test") {
    throw new Error("GEMINI_API_KEY is not set. Add it to your environment before starting the app.");
}

const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const GENERATION_MODEL = "gemini-2.5-flash";
const EMBEDDING_DIM = 1536;

const client = new GoogleGenAI({ apiKey: API_KEY ?? "missing" });

export type EmbedPart =
    | { kind: "text"; text: string }
    | { kind: "inline"; mimeType: string; data: Buffer };

export async function embedText(text: string): Promise<number[]> {
    return embedParts([{ kind: "text", text }]);
}

export async function embedParts(parts: EmbedPart[]): Promise<number[]> {
    const contents = [
        {
            parts: parts.map((p) =>
                p.kind === "text"
                    ? { text: p.text }
                    : { inlineData: { mimeType: p.mimeType, data: p.data.toString("base64") } },
            ),
        },
    ];

    const res = await client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents,
        config: { outputDimensionality: EMBEDDING_DIM },
    });
    const values = res.embeddings?.[0]?.values;
    if (!values) throw new Error("Gemini returned no embedding");
    return values;
}

type GenerationFile = { mimeType: string; data: Buffer };

function buildGenerationParts(prompt: string, files?: GenerationFile[]) {
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
    if (files) {
        for (const f of files) {
            parts.push({ inlineData: { mimeType: f.mimeType, data: f.data.toString("base64") } });
        }
    }
    return parts;
}

export async function generateText(
    prompt: string,
    options?: { temperature?: number; files?: GenerationFile[] },
): Promise<string> {
    const res = await client.models.generateContent({
        model: GENERATION_MODEL,
        contents: [{ parts: buildGenerationParts(prompt, options?.files) }],
        config: { temperature: options?.temperature ?? 0.7 },
    });
    const text = res.text;
    if (!text) throw new Error("Gemini returned no text");
    return text;
}

export async function generateJson<T>(
    prompt: string,
    schema: Schema,
    options?: { temperature?: number; files?: GenerationFile[] },
): Promise<T> {
    const res = await client.models.generateContent({
        model: GENERATION_MODEL,
        contents: [{ parts: buildGenerationParts(prompt, options?.files) }],
        config: {
            temperature: options?.temperature ?? 0.3,
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });
    const text = res.text;
    if (!text) throw new Error("Gemini returned no JSON");
    return JSON.parse(text) as T;
}

export { EMBEDDING_DIM, Type };
export type { Schema };
