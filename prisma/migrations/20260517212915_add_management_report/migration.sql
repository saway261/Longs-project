-- CreateEnum
CREATE TYPE "report_lens" AS ENUM ('balanced', 'cashflow', 'inventory', 'sales');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('generating', 'done', 'error');

-- CreateTable
CREATE TABLE "management_report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lens_id" "report_lens" NOT NULL,
    "source_ids" TEXT[],
    "custom_instruction" TEXT,
    "period_ranges" JSONB,
    "executive_summary" TEXT,
    "decisions" JSONB,
    "actions" JSONB,
    "risk_notes" JSONB,
    "source_snapshot" JSONB,
    "status" "report_status" NOT NULL DEFAULT 'generating',
    "ai_model" TEXT,
    "prompt_tokens" INTEGER,
    "total_tokens" INTEGER,
    "generated_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "management_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "management_report_created_by_created_at_idx" ON "management_report"("created_by", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "management_report" ADD CONSTRAINT "management_report_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
