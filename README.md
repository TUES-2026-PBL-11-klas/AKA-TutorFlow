# TutorFlow

An AI-powered study platform that helps students generate summaries, flashcards, and tests from their own learning materials.

---

## What it does

Students create subjects (e.g. Biology, Math, History) and topics within them, then use AI tools to generate structured study materials:

- **Summaries** — a structured Markdown explanation of a topic tailored to the student's grade level
- **Flashcards** — term/definition pairs that can be studied in both directions (term → definition or definition → term)
- **Tests** — multiple choice or open-ended practice exams with automatic grading and explanations

When a student uploads files (photos, PDFs, notes), the system processes them through a RAG pipeline. Generated content is then grounded in the student's own materials rather than general knowledge alone.

---

## RAG Pipeline

Uploaded files go through the following steps:

1. Text is extracted from images or PDFs using a vision model via OpenRouter
2. The extracted text is cleaned and split into chunks
3. Each chunk is converted into a vector embedding via OpenRouter
4. Embeddings and chunks are stored in pgvector (Supabase's built-in vector extension), linked to the subject
5. At generation time, the student's query is embedded and a similarity search retrieves the most relevant chunks
6. Retrieved chunks are injected into the AI prompt alongside the topic and grade level

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js (monolith, layered architecture) |
| Database | Supabase (PostgreSQL + pgvector) |
| ORM | Prisma |
| Auth | Supabase Auth |
| AI | OpenRouter (generation, OCR, embeddings) |
| Deployment | Docker → Docker Hub |
| CI/CD | GitHub Actions |

### Project structure

```
app/
  api/          # API routes
services/       # Business logic
lib/            # Shared utilities (Prisma client, auth helpers)
prisma/         # Schema and migrations
```

---

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project with pgvector enabled
- An OpenRouter API key

### Setup

```bash
npm install
cp .env.example .env
# Fill in your values in .env
npx prisma migrate dev
npm run dev
```

### Environment variables

```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
```

---

## Running with Docker

```bash
docker build -t tutorflow .
docker run -p 3000:3000 --env-file .env tutorflow
```

---

## Pre-commit hooks

The repo uses Husky to run checks before every commit:

- **Secret scanning** — blocks commits containing hardcoded passwords, API keys, Supabase JWTs, or OpenRouter keys
- **Build check** — blocks commits that break the Next.js build
