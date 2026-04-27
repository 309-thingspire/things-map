-- AlterEnum
ALTER TYPE "StagingStatus" ADD VALUE 'UNREGISTERED';

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "last_crawled_at" TIMESTAMP(3);
