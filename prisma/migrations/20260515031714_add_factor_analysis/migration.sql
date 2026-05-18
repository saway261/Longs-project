-- CreateEnum
CREATE TYPE "factor_type" AS ENUM ('weather', 'global', 'trend');

-- CreateTable
CREATE TABLE "factor_query_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "factor_type" "factor_type" NOT NULL,
    "query_group_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factor_query_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_factor_analysis" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "week_start" DATE NOT NULL,
    "factor_type" "factor_type" NOT NULL,
    "query_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "impact" "news_impact" NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_factor_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "factor_query_config_factor_type_idx" ON "factor_query_config"("factor_type");

-- CreateIndex
CREATE UNIQUE INDEX "factor_query_config_factor_type_query_group_id_key" ON "factor_query_config"("factor_type", "query_group_id");

-- CreateIndex
CREATE INDEX "weekly_factor_analysis_week_start_idx" ON "weekly_factor_analysis"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_factor_analysis_week_start_factor_type_key" ON "weekly_factor_analysis"("week_start", "factor_type");

-- AddForeignKey
ALTER TABLE "weekly_factor_analysis" ADD CONSTRAINT "weekly_factor_analysis_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "news_query"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
