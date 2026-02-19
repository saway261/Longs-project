-- CreateEnum
CREATE TYPE "import_dataset" AS ENUM ('sales', 'payables', 'receivables', 'gross_profit');

-- CreateEnum
CREATE TYPE "import_status" AS ENUM ('processing', 'success', 'partial', 'failed');

-- CreateEnum
CREATE TYPE "issue_level" AS ENUM ('warning', 'error');

-- CreateEnum
CREATE TYPE "flow_type" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "procurement_status" AS ENUM ('high', 'overstock', 'normal');

-- CreateEnum
CREATE TYPE "design_type" AS ENUM ('pop', 'poster');

-- CreateTable
CREATE TABLE "user_account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "sell_through_days" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserve_policy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "percent" DECIMAL(5,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reserve_policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "product_brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "jan" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category_id" UUID,
    "brand_id" UUID,
    "season" TEXT,
    "manufacturer" TEXT,
    "status" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_pkey" PRIMARY KEY ("jan")
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_jan" TEXT NOT NULL,
    "variant_sku" TEXT,
    "color" TEXT,
    "size" TEXT,
    "jan_code" TEXT,
    "price_yen" BIGINT,

    CONSTRAINT "product_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_stock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "variant_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "on_hand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_list" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "list_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "suggested_qty" INTEGER,
    "order_qty" INTEGER,
    "price_yen" BIGINT,
    "status" "procurement_status" NOT NULL DEFAULT 'normal',
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_plan_year" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fiscal_year" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_plan_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_plan_month" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_year_id" UUID NOT NULL,
    "month_date" DATE NOT NULL,
    "purchase_budget_yen" BIGINT,
    "shipment_amount_yen" BIGINT,
    "shipment_gross_profit_rate" DECIMAL(5,2),
    "shipment_cost_yen" BIGINT,
    "waste_yen" BIGINT,
    "month_end_inventory_yen" BIGINT,
    "inventory_plan_yen" BIGINT,

    CONSTRAINT "inventory_plan_month_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',

    CONSTRAINT "counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_schedule" (
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
    "is_fixed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_schedule_tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,

    CONSTRAINT "finance_schedule_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_schedule_tag_map" (
    "schedule_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "finance_schedule_tag_map_pkey" PRIMARY KEY ("schedule_id","tag_id")
);

-- CreateTable
CREATE TABLE "finance_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "schedule_id" UUID,
    "due_date" DATE NOT NULL,
    "amount_yen" BIGINT NOT NULL,
    "flow" "flow_type" NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "actual_paid_at" DATE,
    "note" TEXT,

    CONSTRAINT "finance_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dataset" "import_dataset" NOT NULL,
    "file_name" TEXT,
    "status" "import_status" NOT NULL DEFAULT 'processing',
    "summary" TEXT,
    "note" TEXT,
    "imported_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rows_total" INTEGER,
    "rows_success" INTEGER,
    "rows_skipped" INTEGER,
    "warnings_count" INTEGER,
    "errors_count" INTEGER,

    CONSTRAINT "data_import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import_row" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "raw_data" JSONB NOT NULL,

    CONSTRAINT "data_import_row_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import_issue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID NOT NULL,
    "level" "issue_level" NOT NULL,
    "message" TEXT NOT NULL,
    "row_number" INTEGER,
    "column_name" TEXT,

    CONSTRAINT "data_import_issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID,
    "customer_category1_code" TEXT,
    "customer_category1_name" TEXT,
    "brand_code" TEXT,
    "brand_name" TEXT,
    "item_code" TEXT,
    "item_name" TEXT,
    "product_code" TEXT,
    "product_name1" TEXT,
    "product_name2" TEXT,
    "cs1_code" TEXT,
    "cs1_name" TEXT,
    "cs2_code" TEXT,
    "cs2_name" TEXT,
    "staff_code" TEXT,
    "staff_name" TEXT,
    "period_ym" DATE,
    "sales_date" DATE,
    "jan_code" TEXT,
    "net_qty" INTEGER,
    "list_price_yen" BIGINT,
    "net_sales_yen" BIGINT,
    "return_yen" BIGINT,
    "gross_profit_yen" BIGINT,
    "gross_profit_rate" DECIMAL(5,2),

    CONSTRAINT "sales_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID,
    "vendor_name" TEXT,
    "vendor_short" TEXT,
    "prev_balance_yen" BIGINT,
    "payment_yen" BIGINT,
    "carryover_yen" BIGINT,
    "net_purchase_yen" BIGINT,
    "purchase_yen" BIGINT,
    "return_yen" BIGINT,
    "discount_yen" BIGINT,
    "other_yen" BIGINT,
    "tax_yen" BIGINT,
    "purchase_tax_in_yen" BIGINT,
    "month_end_balance_yen" BIGINT,
    "cash_yen" BIGINT,
    "check_yen" BIGINT,
    "transfer_yen" BIGINT,
    "bill_yen" BIGINT,
    "offset_yen" BIGINT,
    "discount2_yen" BIGINT,
    "fee_yen" BIGINT,
    "other2_yen" BIGINT,

    CONSTRAINT "payables_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivables_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID,
    "staff_name" TEXT,
    "customer_name" TEXT,
    "customer_short" TEXT,
    "prev_balance_yen" BIGINT,
    "received_yen" BIGINT,
    "carryover_yen" BIGINT,
    "net_sales_yen" BIGINT,
    "sales_yen" BIGINT,
    "return_yen" BIGINT,
    "discount_yen" BIGINT,
    "other_yen" BIGINT,
    "tax_yen" BIGINT,
    "sales_tax_in_yen" BIGINT,
    "month_end_balance_yen" BIGINT,
    "cash_yen" BIGINT,
    "check_yen" BIGINT,
    "transfer_yen" BIGINT,
    "bill_yen" BIGINT,
    "offset_yen" BIGINT,
    "discount2_yen" BIGINT,
    "fee_yen" BIGINT,
    "other2_yen" BIGINT,
    "np_credit_yen" BIGINT,
    "np_payments_yen" BIGINT,
    "credit_limit_balance_yen" BIGINT,
    "notes" TEXT,

    CONSTRAINT "receivables_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gross_profit_fact" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "import_id" UUID,
    "staff_name" TEXT,
    "fiscal_year" INTEGER,
    "customer_category1_code" TEXT,
    "customer_category1_name" TEXT,
    "net_qty" INTEGER,
    "list_price_yen" BIGINT,
    "net_sales_yen" BIGINT,
    "return_yen" BIGINT,
    "gross_profit_yen" BIGINT,
    "gross_profit_rate" DECIMAL(5,2),

    CONSTRAINT "gross_profit_fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "design_asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "design_type" NOT NULL,
    "title" TEXT,
    "prompt" TEXT,
    "style" TEXT,
    "color" TEXT,
    "ratio" TEXT,
    "image_url" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_insight" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "severity" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_insight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "user_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_name_key" ON "product_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_brand_name_key" ON "product_brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_variant_sku_key" ON "product_variant"("variant_sku");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_stock_variant_id_warehouse_id_key" ON "inventory_stock"("variant_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_plan_year_fiscal_year_key" ON "inventory_plan_year"("fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_plan_month_plan_year_id_month_date_key" ON "inventory_plan_month"("plan_year_id", "month_date");

-- CreateIndex
CREATE INDEX "finance_schedule_counterparty_id_idx" ON "finance_schedule"("counterparty_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_schedule_tag_name_key" ON "finance_schedule_tag"("name");

-- CreateIndex
CREATE INDEX "finance_event_due_date_idx" ON "finance_event"("due_date");

-- CreateIndex
CREATE INDEX "data_import_dataset_imported_at_idx" ON "data_import"("dataset", "imported_at" DESC);

-- CreateIndex
CREATE INDEX "sales_fact_period_ym_idx" ON "sales_fact"("period_ym");

-- CreateIndex
CREATE INDEX "receivables_fact_customer_name_idx" ON "receivables_fact"("customer_name");

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "product_brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant" ADD CONSTRAINT "product_variant_product_jan_fkey" FOREIGN KEY ("product_jan") REFERENCES "product"("jan") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_list" ADD CONSTRAINT "procurement_list_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_item" ADD CONSTRAINT "procurement_item_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "procurement_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_item" ADD CONSTRAINT "procurement_item_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_plan_month" ADD CONSTRAINT "inventory_plan_month_plan_year_id_fkey" FOREIGN KEY ("plan_year_id") REFERENCES "inventory_plan_year"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_schedule" ADD CONSTRAINT "finance_schedule_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_schedule_tag_map" ADD CONSTRAINT "finance_schedule_tag_map_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "finance_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_schedule_tag_map" ADD CONSTRAINT "finance_schedule_tag_map_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "finance_schedule_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_event" ADD CONSTRAINT "finance_event_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "finance_schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_row" ADD CONSTRAINT "data_import_row_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_issue" ADD CONSTRAINT "data_import_issue_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_import"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_fact" ADD CONSTRAINT "sales_fact_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables_fact" ADD CONSTRAINT "payables_fact_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables_fact" ADD CONSTRAINT "receivables_fact_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gross_profit_fact" ADD CONSTRAINT "gross_profit_fact_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "data_import"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "design_asset" ADD CONSTRAINT "design_asset_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "user_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "reserve_policy" ADD CONSTRAINT "reserve_policy_percent_check"
  CHECK ("percent" >= 0 AND "percent" <= 100);

-- AddCheckConstraint
ALTER TABLE "finance_schedule" ADD CONSTRAINT "finance_schedule_due_day_check"
  CHECK ("due_day" >= 1 AND "due_day" <= 31);
