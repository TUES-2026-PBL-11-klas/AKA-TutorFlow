-- CreateEnum
CREATE TYPE "EducationLevelType" AS ENUM ('GRADE', 'SEMESTER');

-- CreateTable
CREATE TABLE "EducationLevel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "EducationLevelType" NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN "educationLevelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EducationLevel_userId_type_level_key" ON "EducationLevel"("userId", "type", "level");

-- AddForeignKey
ALTER TABLE "EducationLevel" ADD CONSTRAINT "EducationLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_educationLevelId_fkey" FOREIGN KEY ("educationLevelId") REFERENCES "EducationLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
