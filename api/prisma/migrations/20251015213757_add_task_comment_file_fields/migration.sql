-- AlterTable
ALTER TABLE "public"."TaskComment" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "filePath" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ALTER COLUMN "body" SET DEFAULT '';

-- CreateIndex
CREATE INDEX "TaskComment_authorId_idx" ON "public"."TaskComment"("authorId");
