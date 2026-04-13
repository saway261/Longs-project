/*
  Warnings:

  - You are about to drop the column `counterparty_id` on the `recurring_entry` table. All the data in the column will be lost.
  - You are about to drop the `counterparty` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "recurring_entry" DROP CONSTRAINT "recurring_entry_counterparty_id_fkey";

-- DropIndex
DROP INDEX "recurring_entry_counterparty_id_idx";

-- AlterTable
ALTER TABLE "recurring_entry" DROP COLUMN "counterparty_id",
ADD COLUMN     "business_partner_id" UUID;

-- DropTable
DROP TABLE "counterparty";

-- CreateIndex
CREATE INDEX "recurring_entry_business_partner_id_idx" ON "recurring_entry"("business_partner_id");

-- AddForeignKey
ALTER TABLE "recurring_entry" ADD CONSTRAINT "recurring_entry_business_partner_id_fkey" FOREIGN KEY ("business_partner_id") REFERENCES "business_partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
