-- CreateTable
CREATE TABLE "weekly_news_summary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "week_start" DATE NOT NULL,
    "query_group_id" UUID NOT NULL,
    "query_id" UUID NOT NULL,
    "query_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "article_count" INTEGER NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_news_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_news_summary_week_start_idx" ON "weekly_news_summary"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_news_summary_week_start_query_group_id_key" ON "weekly_news_summary"("week_start", "query_group_id");

-- AddForeignKey
ALTER TABLE "weekly_news_summary" ADD CONSTRAINT "weekly_news_summary_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "news_query"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
