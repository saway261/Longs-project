-- CreateTable
CREATE TABLE "week_category_selection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "week_start" DATE NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "week_category_selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_category_advice" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "week_start" DATE NOT NULL,
    "category_id" UUID NOT NULL,
    "category_name" TEXT NOT NULL,
    "trend" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_category_advice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "week_category_selection_week_start_idx" ON "week_category_selection"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "week_category_selection_week_start_category_id_key" ON "week_category_selection"("week_start", "category_id");

-- CreateIndex
CREATE INDEX "weekly_category_advice_week_start_idx" ON "weekly_category_advice"("week_start");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_category_advice_week_start_category_id_key" ON "weekly_category_advice"("week_start", "category_id");

-- AddForeignKey
ALTER TABLE "week_category_selection" ADD CONSTRAINT "week_category_selection_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_category_advice" ADD CONSTRAINT "weekly_category_advice_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
