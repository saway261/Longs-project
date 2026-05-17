-- CreateEnum
CREATE TYPE "action_type" AS ENUM ('procurement', 'sales_promotion', 'inventory', 'finance', 'category');

-- CreateEnum
CREATE TYPE "action_priority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "action_status" AS ENUM ('pending', 'accepted', 'dismissed');

-- CreateEnum
CREATE TYPE "source_table" AS ENUM ('sales_fact', 'payables_fact', 'receivables_fact', 'gross_profit_fact', 'inventory_snapshot_fact', 'weekly_factor_analysis', 'weekly_news_summary', 'weekly_category_advice', 'inventory_plan_month', 'procurement_item');

-- CreateTable
CREATE TABLE "action_recommendation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "week_start" DATE NOT NULL,
    "action_type" "action_type" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "action_priority" NOT NULL,
    "sort_score" INTEGER NOT NULL DEFAULT 0,
    "boosted_count" INTEGER NOT NULL DEFAULT 0,
    "last_boosted_at" TIMESTAMPTZ,
    "status" "action_status" NOT NULL DEFAULT 'pending',
    "category_id" UUID,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acted_at" TIMESTAMPTZ,
    "acted_by" UUID,

    CONSTRAINT "action_recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_recommendation_source" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recommendation_id" UUID NOT NULL,
    "source_table" "source_table" NOT NULL,
    "period_from" DATE,
    "period_to" DATE,
    "evidence" TEXT,

    CONSTRAINT "action_recommendation_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_recommendation_boost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recommendation_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT,
    "source_ref" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_recommendation_boost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_recommendation_week_start_sort_score_idx" ON "action_recommendation"("week_start", "sort_score" DESC);

-- CreateIndex
CREATE INDEX "action_recommendation_week_start_status_idx" ON "action_recommendation"("week_start", "status");

-- CreateIndex
CREATE INDEX "action_recommendation_source_recommendation_id_idx" ON "action_recommendation_source"("recommendation_id");

-- CreateIndex
CREATE INDEX "action_recommendation_boost_recommendation_id_idx" ON "action_recommendation_boost"("recommendation_id");

-- AddForeignKey
ALTER TABLE "action_recommendation" ADD CONSTRAINT "action_recommendation_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_recommendation" ADD CONSTRAINT "action_recommendation_acted_by_fkey" FOREIGN KEY ("acted_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_recommendation_source" ADD CONSTRAINT "action_recommendation_source_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "action_recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_recommendation_boost" ADD CONSTRAINT "action_recommendation_boost_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "action_recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
