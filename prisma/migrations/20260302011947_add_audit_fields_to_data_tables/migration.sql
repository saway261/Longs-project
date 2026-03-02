-- AlterTable
ALTER TABLE "data_import" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "imported_by" UUID,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "gross_profit_fact" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "payables_fact" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "receivables_fact" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sales_fact" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "data_import_imported_by_idx" ON "data_import"("imported_by");

-- AddForeignKey
ALTER TABLE "data_import" ADD CONSTRAINT "data_import_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
