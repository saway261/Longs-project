-- CreateTable
CREATE TABLE "ai_generation_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "design_asset_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_tokens" INTEGER NOT NULL,
    "candidates_tokens" INTEGER NOT NULL,
    "total_tokens" INTEGER NOT NULL,
    "response_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_generation_log_design_asset_id_idx" ON "ai_generation_log"("design_asset_id");

-- AddForeignKey
ALTER TABLE "ai_generation_log" ADD CONSTRAINT "ai_generation_log_design_asset_id_fkey" FOREIGN KEY ("design_asset_id") REFERENCES "design_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
