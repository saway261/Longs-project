-- AlterTable
ALTER TABLE "news_query" ADD COLUMN     "keyword_mode" TEXT DEFAULT 'AND',
ADD COLUMN     "not_keywords" TEXT;
