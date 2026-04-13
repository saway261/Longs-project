-- AlterTable
ALTER TABLE "payables_fact" ADD COLUMN     "business_partner_id" UUID,
ADD COLUMN     "period_ym" DATE;

-- AlterTable
ALTER TABLE "receivables_fact" ADD COLUMN     "business_partner_id" UUID,
ADD COLUMN     "period_ym" DATE;

-- AlterTable
ALTER TABLE "sales_fact" ADD COLUMN     "business_partner_id" UUID;

-- CreateIndex
CREATE INDEX "payables_fact_business_partner_id_period_ym_idx" ON "payables_fact"("business_partner_id", "period_ym");

-- CreateIndex
CREATE INDEX "receivables_fact_business_partner_id_period_ym_idx" ON "receivables_fact"("business_partner_id", "period_ym");

-- CreateIndex
CREATE INDEX "sales_fact_business_partner_id_idx" ON "sales_fact"("business_partner_id");

-- AddForeignKey
ALTER TABLE "sales_fact" ADD CONSTRAINT "sales_fact_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables_fact" ADD CONSTRAINT "payables_fact_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables_fact" ADD CONSTRAINT "receivables_fact_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
