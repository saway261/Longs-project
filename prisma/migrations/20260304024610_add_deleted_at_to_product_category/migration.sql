-- DropIndex
DROP INDEX "product_variant_variant_sku_key";

-- AlterTable
ALTER TABLE "business_partner" RENAME CONSTRAINT "trading_partner_pkey" TO "business_partner_pkey";

-- AlterTable
ALTER TABLE "product_category" ADD COLUMN     "deleted_at" TIMESTAMPTZ;
