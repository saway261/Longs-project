/*
  Warnings:

  - A unique constraint covering the columns `[category_code]` on the table `product_category` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "product_category" ADD COLUMN     "category_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "product_category_category_code_key" ON "product_category"("category_code");
