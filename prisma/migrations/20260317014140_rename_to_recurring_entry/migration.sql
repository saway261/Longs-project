/*
  Warnings:

  - You are about to drop the `finance_event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_schedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_schedule_tag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `finance_schedule_tag_map` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fixed_cost` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "finance_event" DROP CONSTRAINT "finance_event_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_schedule" DROP CONSTRAINT "finance_schedule_counterparty_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_schedule_tag_map" DROP CONSTRAINT "finance_schedule_tag_map_schedule_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_schedule_tag_map" DROP CONSTRAINT "finance_schedule_tag_map_tag_id_fkey";

-- DropTable
DROP TABLE "finance_event";

-- DropTable
DROP TABLE "finance_schedule";

-- DropTable
DROP TABLE "finance_schedule_tag";

-- DropTable
DROP TABLE "finance_schedule_tag_map";

-- DropTable
DROP TABLE "fixed_cost";

-- CreateTable
CREATE TABLE "recurring_entry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "counterparty_id" UUID,
    "description" TEXT,
    "amount_yen" BIGINT NOT NULL,
    "flow" "flow_type" NOT NULL,
    "category" TEXT NOT NULL,
    "cycle" TEXT,
    "offset_months" INTEGER NOT NULL DEFAULT 0,
    "due_day" INTEGER NOT NULL,
    "seasonality" DECIMAL[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "recurring_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_entry_tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "recurring_entry_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_entry_tag_map" (
    "entry_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "recurring_entry_tag_map_pkey" PRIMARY KEY ("entry_id","tag_id")
);

-- CreateIndex
CREATE INDEX "recurring_entry_counterparty_id_idx" ON "recurring_entry"("counterparty_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_entry_tag_name_key" ON "recurring_entry_tag"("name");

-- AddForeignKey
ALTER TABLE "recurring_entry" ADD CONSTRAINT "recurring_entry_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_entry_tag_map" ADD CONSTRAINT "recurring_entry_tag_map_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "recurring_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_entry_tag_map" ADD CONSTRAINT "recurring_entry_tag_map_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "recurring_entry_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
