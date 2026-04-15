-- pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "UploadedFile"
    ADD COLUMN "status" "FileStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "statusError" TEXT;

-- CreateTable
CREATE TABLE "FileChunk" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileChunk_themeId_idx" ON "FileChunk"("themeId");
CREATE INDEX "FileChunk_fileId_idx" ON "FileChunk"("fileId");

-- HNSW index for cosine similarity on embeddings (falls back to IVFFlat if HNSW unavailable)
CREATE INDEX "FileChunk_embedding_hnsw_idx" ON "FileChunk" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "FileChunk" ADD CONSTRAINT "FileChunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FileChunk" ADD CONSTRAINT "FileChunk_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
