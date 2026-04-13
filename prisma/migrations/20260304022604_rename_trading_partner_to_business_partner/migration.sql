-- Rename table
ALTER TABLE "trading_partner" RENAME TO "business_partner";

-- Rename columns in supplier and customer
ALTER TABLE "supplier" RENAME COLUMN "trading_partner_id" TO "business_partner_id";
ALTER TABLE "customer" RENAME COLUMN "trading_partner_id" TO "business_partner_id";

-- Rename FK constraints on supplier
ALTER TABLE "supplier" RENAME CONSTRAINT "supplier_trading_partner_id_fkey" TO "supplier_business_partner_id_fkey";

-- Rename FK constraints on customer
ALTER TABLE "customer" RENAME CONSTRAINT "customer_trading_partner_id_fkey" TO "customer_business_partner_id_fkey";
