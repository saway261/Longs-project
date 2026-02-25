-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'general');

-- AlterTable: drop default first, then cast column type, then set new default
ALTER TABLE "user_account" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "user_account" ALTER COLUMN "role" TYPE "user_role" USING "role"::"user_role";
ALTER TABLE "user_account" ALTER COLUMN "role" SET DEFAULT 'general'::"user_role";
