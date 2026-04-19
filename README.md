# TutorFlow

AI-powered study platform that helps students generate summaries, flashcards, and tests grounded in their own uploaded materials via a RAG (Retrieval-Augmented Generation) pipeline.

---

## What It Does

Students create **subjects** and **themes** (topics), upload their learning materials (images, PDFs), and use AI to generate study content tailored to their grade level:

- **Summaries** — structured Markdown explanations adapted to the student's class
- **Flashcards** — term/definition pairs for active recall study
- **Tests** — multiple-choice quizzes with automatic grading and answer explanations

Uploaded files are processed through a multimodal RAG pipeline — the AI generates content based on the student's own materials, not just general knowledge.

---

## Architecture

![TutorFlow Architecture](./docs/architecture.png)

The system follows a **monolithic layered architecture** built on Next.js:

```
Client (Browser)
    ↓ HTTPS
Next.js API Routes (REST)
    ↓
Services (Business Logic)
    ↓
Prisma ORM → PostgreSQL + pgvector (Supabase)
    ↓
Google Gemini API (Embeddings + Generation)
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React + Tailwind CSS | 19.2.3 / 4.x |
| Database | PostgreSQL + pgvector | Supabase managed |
| ORM | Prisma | 7.4.2 |
| Auth | Supabase Auth (SSR) | 0.10.0 |
| File Storage | Supabase Storage | — |
| AI Embeddings | Gemini Embedding 2 | Preview |
| AI Generation | Gemini 2.5 Flash | — |
| Hosting | AWS Amplify (WEB_COMPUTE) | — |
| Secrets | AWS Secrets Manager | — |
| Monitoring | AWS CloudWatch + SNS | — |
| IaC | Terraform | ≥ 1.5 |
| CI | GitHub Actions | — |
| Testing | Vitest | 4.1.4 |
| Language | TypeScript | 5.x |

---

## RAG Pipeline

```
1. Upload       2. Embed         3. Store         4. Retrieve      5. Load Files    6. Generate
(Supabase    → (Gemini        → (pgvector     → (Cosine        → (Supabase     → (Gemini
 Storage)       Embedding 2)     FileChunk)      Similarity)      Storage)        2.5 Flash)
                                                                         ↓
                                                              Summary / Flashcards / Test
```

1. Student uploads a file (JPG, PNG, PDF) to Supabase Storage
2. File is embedded directly via Gemini Embedding 2 (multimodal — no OCR needed)
3. 1536-dimensional vector stored in `FileChunk` table with HNSW index
4. At generation time, query is embedded and top-k similar chunks retrieved
5. Original file bytes loaded and passed as inline data to Gemini
6. AI generates content grounded in the student's actual materials

---

## Project Structure

```
app/
├── (auth)/                  # Login / Register pages
├── api/                     # REST API routes
│   ├── auth/register/       # User registration
│   ├── subjects/[id]/       # Subject CRUD
│   ├── themes/[id]/         # Theme CRUD
│   ├── uploads/[id]/        # File upload/delete
│   ├── ingest/[fileId]/     # RAG ingestion trigger
│   ├── ai/summary/          # Summary generation
│   ├── ai/flashcards/       # Flashcard generation
│   ├── ai/test/             # Test generation
│   └── tests/[materialId]/  # Test taking + attempts
├── dashboard/               # Student dashboard pages
└── diagram/                 # Architecture diagram page

services/                    # Business logic layer
├── materials.ts             # AI content generation (summary, flashcards, test)
├── rag.ts                   # Vector similarity search + file loading
├── ingestion.ts             # File → embedding pipeline
├── subjects.ts              # Subject CRUD
├── themes.ts                # Theme CRUD
├── uploads.ts               # File metadata CRUD
└── tests.ts                 # Test grading + attempts

lib/                         # Shared utilities
├── gemini.ts                # Gemini API wrapper (embed + generate)
├── prisma.ts                # Prisma client singleton (PgBouncer)
├── auth.ts                  # Session validation
├── supabase.ts              # Client-side Supabase
└── supabase.server.ts       # Server-side Supabase (admin + middleware)

prisma/
└── schema.prisma            # Data model + migrations

terraform/                   # AWS infrastructure as code
├── main.tf                  # Amplify, Secrets Manager, CloudWatch, SNS
├── variables.tf             # Input variables
└── outputs.tf               # Deployment outputs

tests/                       # Unit tests (Vitest)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user (email, password, grade) |

### Subjects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/subjects` | List user's subjects |
| POST | `/api/subjects` | Create subject |
| DELETE | `/api/subjects/[id]` | Delete subject |

### Themes
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/themes?subjectId=` | List themes for subject |
| POST | `/api/themes` | Create theme |
| DELETE | `/api/themes/[id]` | Delete theme |

### File Uploads
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/uploads?themeId=` | List files for theme |
| POST | `/api/uploads` | Upload file (multipart, max 10MB) |
| DELETE | `/api/uploads/[id]` | Delete file |

### RAG & AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ingest/[fileId]` | Trigger embedding pipeline |
| POST | `/api/ai/summary` | Generate summary `{ themeId, notes? }` |
| POST | `/api/ai/flashcards` | Generate flashcards `{ themeId, terms[] }` |
| POST | `/api/ai/test` | Generate test `{ themeId, count }` |

### Tests
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tests?themeId=` | List tests for theme |
| GET | `/api/tests/[materialId]` | Get test with questions |
| POST | `/api/tests/[materialId]/attempt` | Submit answers, get score |

---

## Getting Started

### Prerequisites

- Node.js 22+
- A Supabase project with pgvector extension enabled
- A Google Gemini API key

### Setup

```bash
git clone https://github.com/TUES-2026-PBL-11-klas/AKA-TutorFlow.git
cd AKA-TutorFlow
npm install
cp .env.example .env
# Fill in your values in .env
npx prisma migrate dev
npm run dev
```

### Environment Variables

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

---

## Infrastructure

All AWS infrastructure is managed via Terraform:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in values
terraform init
terraform apply
```

**Managed resources:**
- AWS Amplify (Next.js SSR hosting with auto-deploy from GitHub)
- AWS Secrets Manager (5 secrets: Supabase keys, DB creds, Gemini key)
- CloudWatch (log group + 3 alarms: 5xx errors, 4xx errors, latency)
- SNS (email alert notifications)

---

## CI/CD

- **GitHub Actions** — runs on every push/PR to `main`: lint → test → build
- **AWS Amplify** — auto-deploys on push to `main`, pulls secrets at build time

---

## Pre-commit Hooks

Husky runs checks before every commit:
- **Secret scanning** — blocks commits containing API keys, JWTs, or passwords
- **Build check** — blocks commits that break the Next.js build

---

## Testing

```bash
npm test
```

Runs 8 unit tests via Vitest covering auth, Gemini config, themes, and uploads.
