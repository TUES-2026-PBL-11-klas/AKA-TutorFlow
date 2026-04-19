# TutorFlow – Документация

## Съдържание

1. [Анализ и проучване](#глава-1-анализ-и-проучване)
   - 1.1 Предметна област и целева аудитория
   - 1.2 Преглед на съществуващи решения
   - 1.3 Аргументация на избор на технологии
2. [Проектиране](#глава-2-проектиране)
   - 2.1 Функционални изисквания
   - 2.2 Архитектура на системата
   - 2.3 Инфраструктурна диаграма
   - 2.4 Схема на базата данни
   - 2.5 UML диаграми
   - 2.6 UI дизайн
3. [Реализация](#глава-3-реализация)
   - 3.1 Файлова структура
   - 3.2 Сървърна част (API endpoints)
   - 3.3 Клиентска част (основни компоненти)
   - 3.4 База данни (модели и заявки)
   - 3.5 Тестване
4. [Инфраструктура](#глава-4-инфраструктура)
   - 4.1 Инфраструктурна диаграма
   - 4.2 CI/CD pipeline
   - 4.3 AWS конфигурация
   - 4.4 Инструкции за стартиране на проекта
5. [AI Инструменти](#глава-5-ai-инструменти)
6. [Заключение](#заключение)
7. [Източници](#източници)
8. [Приложения](#приложения)

---

## Глава 1: Анализ и проучване

### 1.1 Предметна област и целева аудитория

TutorFlow е образователна платформа, която помага на ученици да генерират учебни материали с помощта на изкуствен интелект. Системата позволява на учениците да организират обучението си по предмети и теми, да качват собствени материали (снимки, PDF документи) и да генерират резюмета, флашкарти и тестове, базирани на тези материали чрез RAG (Retrieval-Augmented Generation) pipeline.

**Предметна област:** EdTech – AI-подпомогнато самостоятелно учене

**Целева аудитория:**

- Ученици от прогимназиален и гимназиален етап (5–12 клас)
- Студенти, подготвящи се за изпити
- Всеки, който иска да учи по собствени материали с AI помощ

Системата е проектирана да бъде гъвкава – не налага фиксирана учебна програма. Учениците сами създават предмети и теми, което я прави приложима в различни образователни системи и среди. Съдържанието се адаптира автоматично спрямо класа на ученика — генерираните материали за 6-ти клас се различават по сложност от тези за 11-ти клас.

---

### 1.2 Преглед на съществуващи решения

#### Studley AI

Studley AI е платформа за AI-генерирани учебни материали, насочена предимно към студенти. Предлага създаване на флашкарти и резюмета от качени документи.

| | |
|---|---|
| **Предимства** | Лесен интерфейс; поддържа качване на PDF; бърза генерация |
| **Недостатъци** | Ограничена персонализация по ниво на обучение; липсва тест-генератор с автоматично оценяване; не поддържа RAG pipeline — генерираното съдържание не е базирано на собствените материали на ученика |

#### Turbo AI (Study Tool)

Turbo AI предлага бързо генериране на учебни помагала от текст или документи.

| | |
|---|---|
| **Предимства** | Бързо генериране; поддържа няколко формата на изход |
| **Недостатъци** | Генерираното съдържание не е адаптирано към класа/нивото на ученика; липсва организация по предмети и теми; липсва история на генерираните материали; RAG функционалността е ограничена |

#### Сравнение с TutorFlow

| Функция | Studley AI | Turbo AI | TutorFlow |
|---|---|---|---|
| Адаптация по клас | ✗ | ✗ | ✓ |
| RAG pipeline | ✗ | Частично | ✓ (пълен) |
| Мултимодални embeddings | ✗ | ✗ | ✓ (изображения + PDF) |
| Тест генератор | ✗ | Частично | ✓ (MCQ + оценяване) |
| Организация по предмети/теми | ✗ | ✗ | ✓ |
| История на материалите | ✗ | ✗ | ✓ |
| Качване на файлове | PDF | Текст | JPG, PNG, PDF |

За разлика от горните решения, TutorFlow предлага пълен RAG pipeline с мултимодални embeddings — изображенията и PDF файловете се ембедват директно без нужда от OCR. Генерираното съдържание се основава на конкретните качени материали и се адаптира спрямо класа на ученика.

---

### 1.3 Аргументация на избор на технологии

| Технология | Избор | Обосновка |
|---|---|---|
| **Frontend + Backend** | Next.js 16 (App Router) | SSR, API routes в един проект, React екосистема, монолитна архитектура за V1 |
| **UI** | React 19 + Tailwind CSS 4 | Компонентен подход + utility-first стилизиране за бърза разработка |
| **Database** | Supabase (PostgreSQL + pgvector) | Управлявана БД с вградена поддръжка на вектори за RAG, Auth и Storage |
| **ORM** | Prisma 7 | Type-safe заявки, TypeScript интеграция, автоматични миграции, поддръжка на pgvector чрез raw SQL |
| **AI** | Google Gemini (Embedding 2 + Flash 2.5) | Мултимодални embeddings (текст + изображения + PDF в едно векторно пространство), структурирани JSON изходи |
| **Deployment** | AWS Amplify (WEB_COMPUTE) | Нативна поддръжка на Next.js SSR, автоматичен SSL, CDN, auto-deploy от GitHub |
| **IaC** | Terraform | Декларативно управление на цялата AWS инфраструктура |
| **Secrets** | AWS Secrets Manager | Централизирано и сигурно съхранение на API ключове, извличани при build |
| **CI** | GitHub Actions | Автоматизирано lint, test и build при всеки push/PR |
| **Monitoring** | AWS CloudWatch + SNS | Логове, метрики и аларми с email нотификации |
| **Testing** | Vitest | Бърз test runner, съвместим с ES modules и TypeScript |

**Next.js 16** е избран като основен framework, тъй като обединява frontend и backend в един проект, намалявайки сложността. App Router предоставя file-based routing, server components и вградена поддръжка на API routes.

**Google Gemini** е избран пред OpenRouter поради уникалната му способност за мултимодални embeddings — моделът Gemini Embedding 2 може да ембедва текст, изображения и PDF файлове в едно 1536-измерно векторно пространство, без нужда от OCR или text extraction. Gemini 2.5 Flash поддържа structured JSON output, което гарантира надеждно парсване на флашкарти и тестове.

**Supabase** елиминира нуждата от отделна инфраструктура — предлага PostgreSQL с pgvector (за векторно търсене), Auth (сесии с httpOnly cookies за SSR) и Storage (файлове до 10MB) в единна платформа.

**AWS Amplify** е избран за deployment защото предоставя нативна SSR поддръжка на Next.js с вградено CDN, автоматичен SSL и auto-deploy от GitHub — без нужда от управление на сървъри. Цялата инфраструктура се управлява чрез Terraform.

---

## Глава 2: Проектиране

### 2.1 Функционални изисквания

#### Управление на потребители
- Регистрация с email, парола (мин. 8 символа) и клас (1–12)
- Вход с email и парола чрез Supabase Auth
- Автоматичен redirect към dashboard при наличие на сесия

#### Управление на предмети и теми
- Създаване и изтриване на предмети (Subject)
- Създаване и изтриване на теми (Theme) в рамките на предмет
- Йерархична организация: User → Subject → Theme → Materials

#### Качване на файлове
- Поддържани формати: JPG, PNG, WebP, GIF, PDF
- Максимален размер: 10 MB на файл
- Файловете се качват в Supabase Storage с път `{userId}/{themeId}/{timestamp}-{filename}`
- Статус на обработка: PENDING → PROCESSING → READY / FAILED
- Файловете се свързват с конкретна тема

#### RAG Pipeline (Retrieval-Augmented Generation)
- При качване файлът се ембедва директно чрез Gemini Embedding 2 (мултимодален модел)
- Вектор с 1536 измерения се съхранява в `FileChunk` таблица с HNSW индекс
- При генерация на материал — similarity search по тема, top-k чънкове се извличат
- Оригиналните файлови байтове се зареждат и подават като inline data към генеративния модел

#### Генериране на учебни материали
- **Резюмета** — Markdown документ, адаптиран към класа на ученика, базиран на качени материали
- **Флашкарти** — набор от карти (front: термин, back: дефиниция), генерирани от подадени термини
- **Тестове** — multiple-choice въпроси с 4 опции, верен отговор и обяснение; избираем брой въпроси (1–20)

#### Решаване на тестове
- Списък с наличните тестове за тема
- Бутон за генериране на нов тест
- Автоматично оценяване при подаване на отговори
- Резултат с точки, верни/грешни отговори и обяснения

#### Сигурност
- Всички endpoints изискват валидна сесия чрез `validateSession()`
- Ownership проверка — потребителят вижда само собствените си данни
- Raw SQL заявки използват parameter binding ($queryRaw), никога string interpolation
- Pre-commit hook блокира commit на API ключове и пароли

---

### 2.2 Архитектура на системата

TutorFlow следва **монолитна layered архитектура**, изградена върху Next.js:

```
┌─────────────────────────────────────────┐
│           Client (Browser)              │
│         Next.js React Pages             │
└──────────────────┬──────────────────────┘
                   │ HTTPS
┌──────────────────▼──────────────────────┐
│         Next.js API Routes              │
│       (app/api/* – REST endpoints)      │
└──────────┬───────────────────┬──────────┘
           │                   │
┌──────────▼──────┐   ┌───────▼──────────┐
│    Services     │   │   AI Services    │
│ (Business Logic)│   │  (Gemini API)    │
└──────────┬──────┘   └──────────────────┘
           │
┌──────────▼──────────────────────────────┐
│              Prisma ORM                 │
│         + $queryRaw (pgvector)          │
└──────────┬──────────────────────────────┘
           │
┌──────────▼──────────────────────────────┐
│   Supabase (PostgreSQL + pgvector)      │
│   + Supabase Auth + Supabase Storage    │
└─────────────────────────────────────────┘
```

Архитектурата се състои от четири слоя:

1. **Client** — React компоненти, рендерирани чрез Next.js App Router. Използва server components и client components (`"use client"`) според нуждите.

2. **API Routes** — REST endpoints в `app/api/`. Всеки route handler валидира сесията, парсва входните данни и делегира към service слоя.

3. **Services** — бизнес логика, изолирана от HTTP слоя. Включва CRUD операции (subjects, themes, uploads), RAG pipeline (ingestion, retrieval) и AI генерация (materials).

4. **Data** — Prisma ORM за стандартни CRUD заявки и `$queryRaw` за pgvector similarity search. Supabase предоставя PostgreSQL база, Auth за сесии и Storage за файлове.

**RAG Pipeline:**

```
Качен файл (JPG/PNG/PDF)
        │
        ▼
  Multimodal Embedding (Gemini Embedding 2)
        │
        ▼
  FileChunk + vector(1536) в pgvector
        │
        ▼
  При генерация → cosine similarity search
        │
        ▼
  Top-k chunks + оригинални файлови байтове
        │
        ▼
  Inline data → Gemini 2.5 Flash → Material
```

---

### 2.3 Инфраструктурна диаграма

<!-- Screenshot 1: Архитектурна диаграма (от /diagram страницата или Screenshot 2026-04-19 at 23.16.03.png) -->
*Фигура 1: Инфраструктурна диаграма на TutorFlow*

Системата използва следните инфраструктурни компоненти:

| Компонент | Роля |
|---|---|
| **AWS Amplify** | Хостване на Next.js SSR приложението, auto-deploy от GitHub |
| **AWS Secrets Manager** | Съхранение на 5 тайни (Supabase ключове, DB credentials, Gemini API key) |
| **AWS CloudWatch** | Логове (14-дневно задържане) + 3 аларми (5xx грешки, 4xx грешки, латентност) |
| **AWS SNS** | Email нотификации при задействане на аларми |
| **Supabase** | PostgreSQL + pgvector + Auth + Storage |
| **Google Gemini** | Embedding 2 (мултимодални embeddings) + Flash 2.5 (генерация) |
| **GitHub** | Source control + GitHub Actions CI |
| **Terraform** | Управлява всички AWS ресурси декларативно |

---

### 2.4 Схема на базата данни

<!-- Screenshot 2: Supabase DB Schema (supabase-schema-njmsymannfkhbrggllcw-2.png) -->
*Фигура 2: Схема на базата данни в Supabase*

Базата данни съдържа следните таблици:

| Таблица | Описание |
|---|---|
| **User** | Потребителски профил (email, grade) |
| **Subject** | Учебен предмет, принадлежащ на потребител |
| **Theme** | Тема в рамките на предмет |
| **Material** | Генериран учебен материал (SUMMARY / FLASHCARD / TEST) |
| **Flashcard** | Флашкарта (front + back), свързана с Material |
| **TestQuestion** | Тестов въпрос (MCQ) с опции и верен отговор |
| **TestAttempt** | Опит за решаване на тест с резултат |
| **UploadedFile** | Качен файл със статус на обработка |
| **FileChunk** | RAG chunk с vector(1536) embedding |

**Допълнителни компоненти:**
- pgvector extension за PostgreSQL
- HNSW индекс върху `FileChunk.embedding` за бърз similarity search
- Cascade delete по всички релации

---

### 2.5 UML диаграми

#### Entity Relationship Diagram

<!-- Screenshot 3: ERD диаграма (Screenshot 2026-03-11 at 16.12.14.png) -->
*Фигура 3: Entity Relationship Diagram*

**Релации:**

```
User (1) ──→ (N) Subject
User (1) ──→ (N) UploadedFile
User (1) ──→ (N) TestAttempt

Subject (1) ──→ (N) Theme

Theme (1) ──→ (N) Material
Theme (1) ──→ (N) UploadedFile
Theme (1) ──→ (N) FileChunk

Material (1) ──→ (N) Flashcard
Material (1) ──→ (N) TestQuestion
Material (1) ──→ (N) TestAttempt

UploadedFile (1) ──→ (N) FileChunk
```

**Enums:**
- `MaterialType`: SUMMARY | FLASHCARD | TEST
- `FileStatus`: PENDING | PROCESSING | READY | FAILED

---

### 2.6 UI Дизайн

<!-- Screenshot 4: Dashboard – управление на предмети (Screenshot 2026-03-20 at 11.47.54.png) -->
*Фигура 4: Dashboard — преглед на предмети*

<!-- Screenshot 5: Тема — файлове и материали -->
*Фигура 5: Страница на тема с качени файлове и статус*

---

## Глава 3: Реализация

### 3.1 Файлова структура

```
TutorFlow/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth layout group (login, register)
│   ├── api/                      # REST API routes
│   │   ├── auth/register/        # POST — регистрация
│   │   ├── subjects/[id]/        # GET, POST, DELETE — предмети
│   │   ├── themes/[id]/          # GET, POST, DELETE — теми
│   │   ├── uploads/[id]/         # GET, POST, DELETE — файлове
│   │   ├── ingest/[fileId]/      # POST — RAG ingestion
│   │   ├── ai/summary/           # POST — генерация на резюме
│   │   ├── ai/flashcards/        # POST — генерация на флашкарти
│   │   ├── ai/test/              # POST — генерация на тест
│   │   └── tests/[materialId]/   # GET, POST — тестове и опити
│   ├── dashboard/                # Ученически dashboard
│   │   └── subjects/[id]/        # Страница на предмет с теми
│   ├── diagram/                  # Архитектурна диаграма
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Начална страница
│   └── globals.css               # Глобални стилове
├── services/                     # Бизнес логика
│   ├── materials.ts              # Генерация на summary, flashcards, test
│   ├── rag.ts                    # Similarity search + зареждане на файлове
│   ├── ingestion.ts              # File → embedding pipeline
│   ├── subjects.ts               # CRUD за предмети
│   ├── themes.ts                 # CRUD за теми
│   ├── uploads.ts                # CRUD за файлови метаданни
│   └── tests.ts                  # Оценяване на тестове
├── lib/                          # Споделени утилити
│   ├── gemini.ts                 # Gemini API wrapper
│   ├── prisma.ts                 # Prisma client singleton
│   ├── auth.ts                   # Валидация на сесия
│   ├── supabase.ts               # Client-side Supabase
│   └── supabase.server.ts        # Server-side Supabase клиенти
├── prisma/
│   ├── schema.prisma             # Data model
│   └── migrations/               # SQL миграции
├── tests/                        # Unit тестове (Vitest)
├── terraform/                    # AWS IaC
├── .github/workflows/ci.yml      # GitHub Actions CI
├── amplify.yml                   # AWS Amplify build spec
├── middleware.ts                 # Auth middleware
└── package.json                  # Dependencies
```

---

### 3.2 Сървърна част (API endpoints)

Всички API routes са реализирани като Next.js Route Handlers в `app/api/`. Всеки endpoint следва еднаква структура:

1. Валидация на сесията чрез `validateSession()`
2. Парсване и валидация на входните данни
3. Делегиране към service слоя
4. Връщане на JSON отговор с подходящ HTTP статус код

#### Регистрация (`POST /api/auth/register`)

Създава потребител в Supabase Auth с автоматично потвърден email, след което създава User запис в базата данни с посочения клас (1–12). При грешка в създаването на DB записа, Supabase Auth потребителят се изтрива (rollback).

#### AI генерация (`POST /api/ai/summary`, `/flashcards`, `/test`)

Тези endpoints следват общ pattern:

1. Валидация на сесия и ownership на темата
2. Извличане на контекст (клас, предмет, тема)
3. `retrieveChunks()` — cosine similarity search в pgvector
4. `loadFilesForChunks()` — зареждане на оригиналните файлови байтове (до 3 файла)
5. Изграждане на prompt с контекст + файлове като inline data
6. `generateText()` / `generateJson()` — извикване на Gemini 2.5 Flash
7. Създаване на Material + дъщерни записи (Flashcard / TestQuestion)

Примерен prompt за генерация на тест:

```
You are tutoring a Grade 8 student.
Subject: Biology. Topic: Photosynthesis.

[Inline: uploaded images and PDFs as base64 data]

Generate {count} multiple-choice questions based on the student's materials.
Each question must have exactly 4 options.
Return JSON array of { question, options, correctAnswer, explanation }.
```

#### Ingestion (`POST /api/ingest/[fileId]`)

Fire-and-forget endpoint — клиентът го извиква веднага след успешен upload. Процесът е идемпотентен: изтрива съществуващи chunks преди създаване на нови. Статусът на файла се обновява на PROCESSING → READY или FAILED.

---

### 3.3 Клиентска част (основни компоненти)

Клиентската част е реализирана с React 19 и Tailwind CSS 4, използвайки Next.js App Router за routing.

#### Middleware (`middleware.ts`)

Защитава маршрутите чрез проверка на Supabase Auth сесията:
- Защитени маршрути (`/`, `/dashboard`, `/study`, `/profile`) → redirect към `/login` ако няма сесия
- Auth маршрути (`/login`, `/register`) → redirect към `/dashboard` ако има сесия
- Автоматично обновяване на изтекли сесии

#### Dashboard (`app/dashboard/subjects/[id]/page.tsx`)

Основната страница на предмет показва:
- Списък с теми (създаване и изтриване)
- За всяка тема: качени файлове с `StatusBadge` (PENDING / PROCESSING / READY / FAILED)
- Бутон за качване на файл с polling за статус (2s интервал, до 30 опита)
- Fire-and-forget извикване на `/api/ingest/` след успешен upload

#### Test Page (`app/dashboard/subjects/[id]/themes/[themeId]/test/page.tsx`)

Страницата за тестове показва:
- Списък с всички генерирани тестове за темата
- Бутон "+ Generate New Test" за генериране на нов тест
- При избиране на тест — MCQ въпроси с radio бутони
- При подаване — резултат с точки и обяснения за всеки въпрос

---

### 3.4 База данни (модели и заявки)

#### Prisma Schema

Основните модели са дефинирани в `prisma/schema.prisma`. Данните се свързват чрез foreign key релации с cascade delete — изтриването на Subject изтрива всички Theme, Material и FileChunk записи.

```prisma
enum FileStatus {
  PENDING
  PROCESSING
  READY
  FAILED
}

model FileChunk {
  id         String                    @id @default(cuid())
  fileId     String
  themeId    String
  userId     String
  chunkIndex Int
  content    String
  embedding  Unsupported("vector(1536)")
  createdAt  DateTime                  @default(now())

  file  UploadedFile @relation(fields: [fileId], references: [id], onDelete: Cascade)
  theme Theme        @relation(fields: [themeId], references: [id], onDelete: Cascade)

  @@index([themeId])
  @@index([fileId])
}
```

#### Pgvector заявки

Similarity search се извършва чрез raw SQL с parameter binding:

```sql
SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
FROM "FileChunk"
WHERE "themeId" = $2 AND "userId" = $3
ORDER BY embedding <=> $1::vector
LIMIT $4
```

Операторът `<=>` изчислява cosine distance, а HNSW индексът осигурява бързо приблизително търсене.

#### Връзка с базата

Prisma клиентът е конфигуриран с PgBouncer connection pooling и SSL:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

---

### 3.5 Тестване

Проектът използва Vitest за unit тестване. Тестовете покриват основните service и library функции:

| Тест файл | Какво проверява |
|---|---|
| `tests/auth.test.ts` | `validateSession()` връща потребител при валидна сесия |
| `tests/gemini.test.ts` | Embedding размерност е 1536; без грешка в test среда |
| `tests/themes.test.ts` | `listThemes` връща масив; `createTheme` и `deleteTheme` работят |
| `tests/uploads.test.ts` | `createUploadedFile` DTO shape; `listUploadedFiles` връща масив |

**Общо: 8 теста, всички преминаващи.**

Стартиране:

```bash
npm test
```

Конфигурацията е в `vitest.config.ts` с path alias `@/` за импорти и `node` test среда.

---

## Глава 4: Инфраструктура

### 4.1 Инфраструктурна диаграма

<!-- Screenshot 1: Архитектурна диаграма (повторение от 2.3 или друг ъгъл) -->
*Фигура 6: Инфраструктурна диаграма*

Инфраструктурата се управлява изцяло чрез Terraform (`terraform/main.tf`). Това гарантира, че всичко е декларативно, повторяемо и версионирано в Git.

**Управлявани ресурси:**

| Ресурс | Terraform resource | Описание |
|---|---|---|
| Amplify App | `aws_amplify_app` | Next.js SSR хостване, свързано с GitHub repo |
| Amplify Branch | `aws_amplify_branch` | `main` клон, auto-build, PRODUCTION stage |
| Secrets Manager | `aws_secretsmanager_secret` × 5 | Supabase URL/ключове, DB credentials, Gemini API key |
| CloudWatch Logs | `aws_cloudwatch_log_group` | `/aws/amplify/tutorflow`, 14-дневно задържане |
| CloudWatch Alarm (5xx) | `aws_cloudwatch_metric_alarm` | Задейства при > 5 грешки за 5 мин |
| CloudWatch Alarm (4xx) | `aws_cloudwatch_metric_alarm` | Задейства при > 50 грешки за 5 мин |
| CloudWatch Alarm (Latency) | `aws_cloudwatch_metric_alarm` | Задейства при средна латентност > 3s |
| SNS Topic | `aws_sns_topic` | `tutorflow-alerts` — канал за нотификации |
| SNS Subscription | `aws_sns_topic_subscription` | Email абонамент за аларми |

---

### 4.2 CI/CD Pipeline

Проектът използва двустепенен CI/CD pipeline:

#### GitHub Actions (CI) — `.github/workflows/ci.yml`

Задейства се при push или pull request към `main`:

```
Checkout → Setup Node 22 → npm ci → Lint → Test → Build
                                                    ↓
                                          Webhook нотификация при failure
```

Secrets (Supabase ключове, Gemini API key) се подават като GitHub Secrets environment variables.

#### AWS Amplify (CD) — `amplify.yml`

Задейства се автоматично при push към `main`:

```
preBuild:
  1. npm ci
  2. npx prisma generate
  3. Извличане на 6 тайни от AWS Secrets Manager
     (Supabase URL, Anon Key, Service Role Key, Gemini Key, DB User, DB Password)

build:
  1. npm run build

artifacts: .next/**
cache: node_modules + .next/cache
```

Тайните се извличат при build чрез AWS CLI:

```bash
export GEMINI_API_KEY=$(aws secretsmanager get-secret-value \
  --secret-id tutorflow/gemini-api-key \
  --query SecretString --output text --region eu-west-1)
```

---

### 4.3 AWS конфигурация

#### Secrets Manager

Всички чувствителни стойности се съхраняват в AWS Secrets Manager вместо environment variables:

| Secret ID | Съдържание |
|---|---|
| `tutorflow/supabase-url` | Supabase project URL |
| `tutorflow/supabase-anon-key` | Supabase anonymous key |
| `tutorflow/supabase-service-role-key` | Supabase service role key |
| `tutorflow/gemini-api-key` | Google Gemini API key |
| `tutorflow/db-credentials` | JSON с DB_USER и DB_PASSWORD |

#### CloudWatch Аларми

Три аларми следят здравето на приложението:

| Аларма | Метрика | Праг | Действие |
|---|---|---|---|
| 5xx Errors | `5xxErrors` | > 5 за 5 мин | SNS email |
| 4xx Errors | `4xxErrors` | > 50 за 5 мин | SNS email |
| High Latency | `Latency` (avg) | > 3000ms за 2 периода | SNS email |

---

### 4.4 Инструкции за стартиране на проекта

#### Локално стартиране

```bash
# 1. Клониране на репото
git clone https://github.com/TUES-2026-PBL-11-klas/AKA-TutorFlow.git
cd AKA-TutorFlow

# 2. Инсталиране на зависимости
npm install

# 3. Конфигуриране на environment variables
cp .env.example .env
# Попълнете стойностите в .env:
#   DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#   SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY

# 4. Стартиране на миграции
npx prisma migrate dev

# 5. Стартиране на development server
npm run dev
# Приложението е достъпно на http://localhost:3000
```

#### Предпоставки

- Node.js 22+
- Supabase проект с pgvector extension активиран
- Google Gemini API key
- (За deploy) AWS акаунт с Terraform ≥ 1.5

#### Deploy в AWS

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Попълнете стойностите
terraform init
terraform apply
```

---

## Глава 5: AI Инструменти

При разработката на TutorFlow бяха използвани следните AI инструменти:

### Claude Code (Anthropic)

**Claude Code** е CLI инструмент за AI-подпомогнато програмиране, използван интензивно в целия процес на разработка.

**Примери за използване:**

1. **Архитектурно планиране** — Claude Code помогна при проектирането на RAG pipeline архитектурата, включително избора на embedding модел (Gemini Embedding 2 Preview) и стратегията за мултимодални embeddings без OCR.

2. **Имплементация на services** — Целият service слой (ingestion.ts, rag.ts, materials.ts) беше разработен с помощта на Claude Code, който генерира първоначалния код и помогна с интеграцията на Gemini API.

3. **Terraform конфигурация** — Инфраструктурните файлове (main.tf, variables.tf, outputs.tf) бяха генерирани с помощта на Claude Code, включително CloudWatch аларми и SNS нотификации.

4. **Debugging** — Claude Code помогна при отстраняване на проблеми като:
   - Gemini embedContent API ограничения (text-only vs multimodal)
   - Prisma migration baseline за съществуващи бази данни
   - Качество на генерираните тест въпроси (преминаване от captions към inline file data)

5. **Документация и диаграми** — Архитектурната диаграма (SVG/React компонент), README.md и тази документация бяха създадени с Claude Code.

### Google Gemini (в продукта)

Gemini се използва като AI backend на самата платформа:
- **Gemini Embedding 2 Preview** — мултимодални embeddings за RAG pipeline
- **Gemini 2.5 Flash** — генерация на учебни материали (резюмета, флашкарти, тестове)

---

## Заключение

### Резултат

TutorFlow е функционална AI-powered образователна платформа, която позволява на ученици да:
- Организират обучението си по предмети и теми
- Качват собствени учебни материали (изображения и PDF)
- Генерират резюмета, флашкарти и тестове, базирани на тези материали чрез RAG
- Решават тестове с автоматично оценяване

Платформата е deployed на AWS Amplify с пълна Infrastructure as Code конфигурация чрез Terraform, CI pipeline чрез GitHub Actions и мониторинг чрез CloudWatch.

### Научено

- Мултимодалните embeddings (Gemini Embedding 2) елиминират нуждата от OCR и text extraction, опростявайки значително RAG pipeline-а
- Подаването на оригиналните файлови байтове като inline data към генеративния модел драматично подобрява качеството на изхода спрямо подаване само на text captions
- AWS Amplify предоставя удобен SSR хостинг за Next.js, но deploy key ограниченията за организационни GitHub repos изискват ръчна конфигурация
- pgvector с HNSW индекс в Supabase PostgreSQL е достатъчно performant за тази скала без нужда от специализирана vector database

### Бъдещо развитие

- Open-ended тестови въпроси (свободен текст с AI оценяване)
- UI за преглед на флашкарти (study mode с flip анимация)
- UI за визуализация на резюмета
- Rate limiting и cost metering за AI заявки
- Чункване на PDF файлове по параграфи за по-прецизен retrieval
- Поддръжка на повече файлови формати (DOCX, PPTX)
- Multi-language поддръжка на интерфейса

---

## Източници

1. Next.js Documentation. Vercel. https://nextjs.org/docs
2. Supabase Documentation. Supabase Inc. https://supabase.com/docs
3. Prisma Documentation. Prisma Data Inc. https://www.prisma.io/docs
4. Google Gemini API Documentation. Google. https://ai.google.dev/docs
5. pgvector: Open-source vector similarity search for Postgres. https://github.com/pgvector/pgvector
6. Terraform AWS Provider Documentation. HashiCorp. https://registry.terraform.io/providers/hashicorp/aws/latest/docs
7. AWS Amplify Documentation. Amazon Web Services. https://docs.aws.amazon.com/amplify/
8. Vitest Documentation. https://vitest.dev/
9. Tailwind CSS Documentation. https://tailwindcss.com/docs

---

## Приложения

- **GitHub хранилище:** https://github.com/TUES-2026-PBL-11-klas/AKA-TutorFlow
- **Архитектурна диаграма (интерактивна):** `/diagram` route в приложението
- **Deployment:** AWS Amplify (auto-deploy от `main` branch)
