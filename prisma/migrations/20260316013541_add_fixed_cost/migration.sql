/*
  Warnings:

  - A unique constraint covering the columns `[brand_code]` on the table `product_brand` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "fixed_cost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "amount_yen" INTEGER NOT NULL,
    "due_day" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fixed_cost_pkey" PRIMARY KEY ("id")
);

-- DropIndex (partial index created outside Prisma)
DROP INDEX IF EXISTS "product_brand_brand_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "product_brand_brand_code_key" ON "product_brand"("brand_code");
