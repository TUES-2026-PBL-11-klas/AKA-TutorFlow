# AI Study Helper – Technical Requirements & Tech Stack (V1)

## 1. Overview

This document describes the technical architecture and technology stack used to build the first version of the AI Study Helper platform.

The system will consist of three primary components:

- Frontend application
- Backend API
- Database and storage layer

The platform will be deployed on Google Cloud Platform (GCP) with continuous deployment through GitHub Actions.

The architecture is designed to be simple enough for a first release while still allowing future expansion, including AI improvements, RAG pipelines, and scaling infrastructure.

---

# 2. System Architecture

The application will follow a standard modern web architecture:
Client (Next.js Frontend)
↓
Backend API (NestJS)
↓
Database & Storage (Supabase)
↓
AI APIs (OpenAI / OpenRouter)

The frontend communicates with the backend via HTTP API requests.  
The backend handles authentication, business logic, AI interaction, and database operations.

Supabase is used as the primary database and storage provider.

---

# 3. Frontend

## Framework

The frontend will be built using **Next.js**.

Next.js provides:

- React-based UI development
- Server-side rendering (SSR)
- API routes if needed
- Fast performance
- Easy deployment

It also integrates well with modern authentication flows and API-based backends.

## Responsibilities

The frontend is responsible for:

- User interface
- Authentication flow
- Subject and topic management
- Displaying generated study materials
- Flashcard interaction
- Test taking interface
- Displaying study history

## Core UI Features

The frontend will include the following major pages:

- Authentication (login/register)
- Dashboard
- Subject management
- Topic input and study material generation
- Flashcard study view
- Test-taking interface
- Study history

## State Management

State can be managed using one of the following:

- React Context
- Zustand
- TanStack Query (recommended for server state)

TanStack Query can be used for:

- API requests
- caching generated materials
- background refresh
- error handling

---

# 4. Backend

## Framework

The backend will be implemented using **NestJS**.

NestJS is chosen because it provides:

- Strong architecture patterns
- Dependency injection
- Modular design
- Built-in support for TypeScript
- Clean controller/service separation

This makes it easier to maintain and scale the codebase.

## API Design

The backend will expose a REST API used by the frontend.

Typical API routes may include:
POST /auth/login
POST /auth/register
GET /subjects
POST /subjects
DELETE /subjects/:id
POST /ai/summary
POST /ai/flashcards
POST /ai/test
GET /materials
GET /materials/:id

Each route will validate input and call the appropriate service logic.

---

# 5. Database

## Provider

The database will be hosted using **Supabase**.

Supabase provides:

- Managed PostgreSQL database
- Authentication system
- Storage
- Row-level security
- Simple API access

Using Supabase reduces infrastructure complexity while maintaining flexibility.

## Database Type
PostgreSQL

PostgreSQL was selected because it:

- is reliable and widely used
- supports relational data well
- integrates easily with ORMs
- works natively with Supabase

## Core Data Models

The database will store:

- Users
- Subjects
- Generated materials
- Flashcards
- Tests
- Test attempts
- Uploaded files

Relationships will be structured around the user and their subjects.

---

# 6. ORM

An ORM will be used to manage database access from the backend.

Recommended ORM:

**Prisma**

Prisma provides:

- Type-safe queries
- automatic schema generation
- excellent TypeScript integration
- simple migration system

Prisma will connect to the Supabase PostgreSQL database.

Example structure:
Backend
├─ controllers
├─ services
├─ prisma
│ └─ schema.prisma
└─ modules

Prisma will be responsible for:

- data queries
- migrations
- model definitions
- relationships between entities

---

# 7. AI Integration

The backend will communicate with external AI APIs to generate study materials.

Provider: **OpenRouter**

OpenRouter is used as the single API gateway for all AI calls, including study material generation, OCR, embeddings, and RAG.

The backend will construct structured prompts based on user inputs such as:

- grade level
- subject
- topic
- generation type (summary, flashcards, test)

The AI response will then be processed and stored in the database.

---

# 8. File Storage

File uploads (such as textbook photos or notes) will be stored using **Supabase Storage**.

Supported file types may include:

- JPG
- PNG
- PDF

Uploaded files will be linked to user accounts and subjects.

In Version 1 these files will primarily be stored for reference.  
Advanced analysis of uploaded materials will be introduced later.

---

# 9. Deployment

The application is packaged as a **Docker image** and published to **Docker Hub**.

A `Dockerfile` at the root of the project builds the Next.js app and produces a production-ready image. The image can be pulled and run on any host that supports Docker.

---

# 10. CI/CD

Continuous Integration and Deployment will be handled through **GitHub Actions**.

The CI/CD pipeline will perform the following tasks:

1. Install dependencies
2. Run linting
3. Run tests (optional in early version)
4. Build the Docker image
5. Push the image to Docker Hub

Example deployment flow:
GitHub Push
↓
GitHub Actions Workflow
↓
Docker Build
↓
Push Image to Docker Hub

---

# 11. Environment Configuration

Sensitive configuration values will be stored using environment variables.

Examples include:
DATABASE_URL
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY

Environment variables will be managed through GitHub Secrets and injected at build/run time.

---

# 12. Security Considerations

Basic security measures will include:

- authenticated API requests
- validation of user input
- protection of API keys
- rate limiting AI requests
- proper database access permissions

Supabase Row Level Security can also be used to ensure users can only access their own data.

---

# 13. RAG Pipeline (Future Version)

The RAG pipeline will be built entirely on top of existing infrastructure with no new services.

## Components

**OCR**
Uploaded images and PDFs will be processed using a vision-capable model via OpenRouter to extract raw text.

**Embeddings**
Extracted text will be chunked and converted into vector embeddings using an embedding model via OpenRouter.

**Vector Storage**
Embeddings will be stored in **pgvector**, the vector extension built into Supabase PostgreSQL. No separate vector database service is needed.

**Retrieval & Generation**
At query time, the user's input is embedded and a similarity search is run against pgvector. The top matching chunks are injected into the generation prompt, which is then sent to a language model via OpenRouter.

## Summary

All AI calls (OCR, embedding, generation) go through **OpenRouter**.
All data (vectors, chunks, metadata) lives in **Supabase pgvector**.

---

# 14. Future Infrastructure Improvements

Future versions of the platform may introduce additional infrastructure components, including:

- Background workers for AI tasks
- Caching layers
- Analytics systems

These components are not required for Version 1 but should be considered in long-term system design.

---

# 15. Summary

The Version 1 system will use a modern but relatively simple architecture.

Frontend + Backend:
Next.js (monolith, layered architecture)

Database:
Supabase PostgreSQL + pgvector

ORM:
Prisma

AI:
OpenRouter (study material generation, OCR, embeddings, RAG)

Deployment:
Docker → Docker Hub

CI/CD:
GitHub Actions

This stack provides a balance between development speed, scalability, and maintainability, making it well suited for an early-stage AI-powered application.
