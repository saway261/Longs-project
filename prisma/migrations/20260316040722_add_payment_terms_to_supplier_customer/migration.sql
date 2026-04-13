-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "closing_day" INTEGER NOT NULL DEFAULT 31,
ADD COLUMN     "collection_day" INTEGER NOT NULL DEFAULT 31,
ADD COLUMN     "collection_month_offset" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "supplier" ADD COLUMN     "closing_day" INTEGER NOT NULL DEFAULT 31,
ADD COLUMN     "payment_day" INTEGER NOT NULL DEFAULT 31,
ADD COLUMN     "payment_month_offset" INTEGER NOT NULL DEFAULT 1;
