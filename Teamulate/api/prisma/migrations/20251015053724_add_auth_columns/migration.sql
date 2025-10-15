/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.
  - Made the column `filename` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `originalname` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mimetype` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uploadedAt` on table `File` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."File" ALTER COLUMN "filename" SET NOT NULL,
ALTER COLUMN "originalname" SET NOT NULL,
ALTER COLUMN "mimetype" SET NOT NULL,
ALTER COLUMN "uploadedAt" SET NOT NULL,
ALTER COLUMN "uploadedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "passwordHash",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "provider" TEXT,
ALTER COLUMN "name" DROP NOT NULL;
