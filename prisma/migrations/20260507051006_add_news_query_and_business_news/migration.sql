-- CreateEnum
CREATE TYPE "news_impact" AS ENUM ('high', 'medium', 'low');

-- vector有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "news_query" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_group_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT,
    "language" TEXT DEFAULT 'ja',
    "sources" TEXT,
    "domains" TEXT,
    "sortBy" TEXT DEFAULT 'publishedAt',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "extra_params" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivated_at" TIMESTAMPTZ,

    CONSTRAINT "news_query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_news" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_id" UUID NOT NULL,
    "external_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "source_name" TEXT,
    "source_url" TEXT,
    "impact" "news_impact",
    "published_at" TIMESTAMPTZ NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "week_start" DATE NOT NULL,
    "embedding" vector(768),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "business_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_query_query_group_id_idx" ON "news_query"("query_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_news_external_id_key" ON "business_news"("external_id");

-- CreateIndex
CREATE INDEX "business_news_query_id_published_at_idx" ON "business_news"("query_id", "published_at" DESC);

-- CreateIndex
CREATE INDEX "business_news_week_start_query_id_idx" ON "business_news"("week_start", "query_id");

-- AddForeignKey
ALTER TABLE "business_news" ADD CONSTRAINT "business_news_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "news_query"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
