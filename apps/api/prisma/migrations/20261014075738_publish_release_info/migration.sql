-- AlterTable
ALTER TABLE "PublishJob" ADD COLUMN     "momentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "releaseId" TEXT;
