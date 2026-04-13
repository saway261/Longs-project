-- CreateTable
CREATE TABLE "trading_partner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "trading_partner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("trading_partner_id")
);

-- CreateTable
CREATE TABLE "customer" (
    "trading_partner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("trading_partner_id")
);

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_trading_partner_id_fkey" FOREIGN KEY ("trading_partner_id") REFERENCES "trading_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_trading_partner_id_fkey" FOREIGN KEY ("trading_partner_id") REFERENCES "trading_partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
