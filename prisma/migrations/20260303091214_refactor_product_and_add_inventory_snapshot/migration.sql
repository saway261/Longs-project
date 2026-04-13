-- AddValue to ImportDataset enum
ALTER TYPE "import_dataset" ADD VALUE 'inventory_snapshot';

-- Rename product PK column (jan → product_code) and drop sku/manufacturer
ALTER TABLE "product" RENAME COLUMN "jan" TO "product_code";
ALTER TABLE "product" DROP COLUMN IF EXISTS "sku";
ALTER TABLE "product" DROP COLUMN IF EXISTS "manufacturer";

-- Rename product_variant.product_jan → product_code and drop old unique on variant_sku
ALTER TABLE "product_variant" RENAME COLUMN "product_jan" TO "product_code";
ALTER TABLE "product_variant" DROP CONSTRAINT IF EXISTS "product_variant_variant_sku_key";
ALTER TABLE "product_variant" ADD COLUMN "variant_key" TEXT NOT NULL DEFAULT '';
ALTER TABLE "product_variant" ADD COLUMN "color_code" TEXT;
ALTER TABLE "product_variant" ADD COLUMN "size_code" TEXT;

-- Backfill variant_key for any existing rows (none expected, but safe)
UPDATE "product_variant" SET "variant_key" = "product_code" || '||' WHERE "variant_key" = '';

-- Add unique constraint on variant_key
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_variant_key_key" UNIQUE ("variant_key");

-- Remove the DEFAULT now that unique constraint is in place
ALTER TABLE "product_variant" ALTER COLUMN "variant_key" DROP DEFAULT;

-- Update FK reference: product_variant.product_code → product.product_code
ALTER TABLE "product_variant" DROP CONSTRAINT IF EXISTS "product_variant_product_jan_fkey";
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_code_fkey"
  FOREIGN KEY ("product_code") REFERENCES "product"("product_code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable inventory_snapshot_fact
CREATE TABLE "inventory_snapshot_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID,
    "period_ym" DATE,
    "product_code" TEXT,
    "product_name" TEXT,
    "brand_code" TEXT,
    "brand_name" TEXT,
    "cs1_code" TEXT,
    "cs1_name" TEXT,
    "cs2_code" TEXT,
    "cs2_name" TEXT,
    "jan_code" TEXT,
    "opening_qty" INTEGER,
    "opening_yen" BIGINT,
    "closing_qty" INTEGER,
    "closing_yen" BIGINT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "inventory_snapshot_fact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_snapshot_fact_period_ym_idx" ON "inventory_snapshot_fact"("period_ym");

-- AddForeignKey
ALTER TABLE "inventory_snapshot_fact" ADD CONSTRAINT "inventory_snapshot_fact_import_id_fkey"
  FOREIGN KEY ("import_id") REFERENCES "data_import"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
