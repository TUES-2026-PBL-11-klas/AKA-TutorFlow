# AI Study Helper – Product Requirements & Business Logic

## 1. Product Overview

The AI Study Helper is an educational platform that helps students generate study materials using artificial intelligence. The system allows students to organize their learning by grade level and custom subjects, upload learning materials, and generate structured study resources such as summaries, flashcards, and tests.

The goal of the system is to reduce the effort required for students to prepare for exams by automatically transforming topics or learning materials into useful study formats.

Unlike many rigid educational systems, the platform allows students to create their own subjects and topics. This makes the system flexible enough to support different school curricula, personal study topics, or exam preparation materials.

The AI generates study content based on user-provided input (topics, terms, grade level) and uploaded materials. When a student uploads files, the system processes them through a RAG pipeline so that generated content is grounded in their own textbooks and notes.

---

# 2. User Model

The system focuses on a single primary user type: the **student**.

Each student account stores basic information used to guide the AI's responses and difficulty level. During registration, the student selects their **grade level**, which acts as a baseline indicator of complexity for generated content.

The system does not enforce a fixed curriculum. Instead, students are free to create subjects that match their own courses or interests.

Example subjects might include:

- Math
- Algebra
- English Literature
- Biology
- Programming
- History of the Cold War

This approach ensures the system works across different school systems and learning environments.

---

# 3. Subjects and Topics

Subjects serve as organizational containers for study materials and AI-generated content.

Students can:

- Create subjects
- Rename subjects
- Delete subjects

Each subject acts as a category under which study resources are generated and stored.

Within a subject, students interact with **topics**. A topic represents a specific concept or area of study that the AI should generate materials for.

Example topics:

- Fractions
- Linear equations
- Shakespeare's tragedies
- Cell division
- Photosynthesis

Topics are flexible text inputs rather than rigid database entities.

The system uses the **topic name together with the student's grade level** to estimate the appropriate difficulty level.

---

# 4. Study Material Generation

The core functionality of the platform revolves around three types of AI-generated study materials:

1. **Summaries**
2. **Flashcards**
3. **Tests**

These tools convert user inputs and uploaded materials into structured learning resources.

All generated materials are stored in the system so the student can revisit them later.

---

# 5. Summary Generation

The summary generator allows students to input a topic and receive a structured explanation designed for their grade level.

### User Input

- Subject
- Topic
- Optional additional context or notes

### Output

The system returns a **Markdown formatted summary** containing structured educational explanations.

Typical summary structure:

- Headings
- Bullet lists
- Definitions
- Examples

Example input:
Topic: Fractions

Example summary content might include:

- What fractions are
- How fractions represent parts of a whole
- Basic operations with fractions
- Simple examples

If the student has uploaded files under the subject, relevant chunks from those files are retrieved and injected into the prompt so the summary reflects their actual study materials.

The summary feature functions as a **quick mini-study guide generator**.

---

# 6. Flashcard Generation

Flashcards help students memorize concepts, vocabulary, formulas, and definitions.

To generate flashcards, the student provides a set of **terms** related to a topic.

Example input:
Terms:
Photosynthesis
Chlorophyll
Carbon dioxide

The system generates a **definition or explanation** for each term. If uploaded materials are available under the subject, the definitions are grounded in those materials via RAG.

### Study Modes

Flashcards support two study modes:

1. **Definition → Guess the Term**
2. **Term → Guess the Definition**

Each flashcard consists of:

- Front side (question)
- Back side (answer)

Students can flip flashcards interactively while studying.

---

# 7. Test Generation

The test generator allows students to create practice exams.

### User Input

- Subject
- Topic
- Number of questions
- Question type

### Question Types

1. **Multiple Choice**
2. **Open-ended**

### Generated Test Structure

Each generated test contains:

- Question text
- Answer options (for multiple choice)
- Correct answer
- Optional explanation

If uploaded materials are available under the subject, questions are generated based on the content of those materials via RAG.

After completing a test, the system automatically grades the answers and displays the score.

---

# 8. Difficulty Estimation

Because the system allows custom subjects and topics, it cannot rely on a fixed curriculum.

Instead, difficulty is estimated using:

- Student grade level
- Topic

The AI is instructed to generate explanations and questions appropriate for the selected grade.

Example:

Topic: Fractions

For a **3rd grade student**, the system may generate simple conceptual problems.

For a **9th grade student**, the system may include fraction algebra or more complex operations.

This ensures that generated materials remain age-appropriate.

---

# 9. Generated Content Storage

All generated materials are stored under the relevant subject.

Students can revisit:

- Previously generated summaries
- Flashcards
- Tests

Each stored item may include metadata such as:

- Creation date
- Topic
- Material type
- Number of questions or flashcards

This allows the system to function as a **long-term study repository**.

---

# 10. File Uploads

Students may upload learning materials such as:

- Textbook photos
- Notes
- Worksheets
- PDFs

When a file is uploaded, it is processed through the RAG pipeline:

1. Text is extracted from the file using a vision model via **OpenRouter**
2. The extracted text is cleaned and split into chunks
3. Each chunk is converted into a vector embedding via **OpenRouter**
4. The embeddings and chunks are stored in **pgvector** (Supabase's built-in vector extension), linked to the subject

When the student generates study materials under that subject, the system performs a similarity search against the stored chunks and injects the most relevant ones into the AI prompt. This ensures generated content is based directly on the student's own materials.

---

# 11. AI Interaction Model

Each AI request is built from structured inputs.

The prompt includes:

- Student grade level
- Subject
- Topic
- Requested material type
- Optional user notes
- Relevant chunks retrieved from uploaded materials (if available)

Example prompt structure:
```
You are a tutor helping a Grade 7 student study mathematics.
Topic: Fractions

Relevant material from the student's notes:
[retrieved chunks inserted here]

Generate a clear summary explaining the concept using simple language and examples.
```

The AI is instructed to behave like an **educational tutor** and provide explanations appropriate for the student's level. When uploaded material is available, responses are grounded in that material rather than general knowledge alone.

All AI calls go through **OpenRouter**.

---

# 12. Summary

The AI Study Helper allows students to create custom subjects and topics, upload their own study materials, and use AI tools to generate summaries, flashcards, and tests.

Uploaded materials are processed through a RAG pipeline so that all generated content can be grounded in the student's own textbooks and notes.

The platform acts as a personalised AI tutor that helps students understand topics and prepare for exams more efficiently.
