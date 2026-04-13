/*
  Warnings:

  - You are about to drop the column `variant_key` on the `product_variant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[product_code,color,size]` on the table `product_variant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropConstraint
ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_variant_key_key";

-- DropConstraint (already removed manually, so IF EXISTS)
ALTER TABLE "product_variant" DROP CONSTRAINT IF EXISTS "product_variant_variant_sku_key";

-- AlterTable
ALTER TABLE "product_variant" DROP COLUMN "variant_key";

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_product_code_color_size_key" ON "product_variant"("product_code", "color", "size");
