-- STEP 1: product_brand に brand_code を追加（NULL は重複扱いしない部分ユニーク）
ALTER TABLE "product_brand" ADD COLUMN "brand_code" TEXT;
CREATE UNIQUE INDEX "product_brand_brand_code_key"
  ON "product_brand"("brand_code") WHERE "brand_code" IS NOT NULL;

-- STEP 2: product に UUID id を追加（まだ PK にしない）
ALTER TABLE "product" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();

-- STEP 3: product_variant に product_id を追加（NULL 許容で追加）
ALTER TABLE "product_variant" ADD COLUMN "product_id" UUID;

-- STEP 4: product_variant.product_id を既存データから backfill
UPDATE "product_variant" pv
SET "product_id" = p."id"
FROM "product" p
WHERE pv."product_code" = p."product_code";

-- STEP 5: 既存 FK（product_variant.product_code → product.product_code）を削除
ALTER TABLE "product_variant" DROP CONSTRAINT "product_variant_product_code_fkey";

-- STEP 6: 既存の複合ユニーク制約を削除
DROP INDEX "product_variant_product_code_color_size_key";

-- STEP 7: product の PK を product_code から id に差し替え
ALTER TABLE "product" DROP CONSTRAINT "product_pkey";
ALTER TABLE "product" ADD CONSTRAINT "product_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "product_product_code_key" ON "product"("product_code");

-- STEP 8: product_variant.product_code 列を削除
ALTER TABLE "product_variant" DROP COLUMN "product_code";

-- STEP 9: product_variant.product_id を NOT NULL 化・FK・新複合ユニーク追加
ALTER TABLE "product_variant" ALTER COLUMN "product_id" SET NOT NULL;
ALTER TABLE "product_variant"
  ADD CONSTRAINT "product_variant_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "product"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "product_variant_product_id_color_size_key"
  ON "product_variant"("product_id", "color", "size");
