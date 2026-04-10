DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoryLeadPricingBillingType') THEN
    CREATE TYPE "CategoryLeadPricingBillingType" AS ENUM ('PER_LEAD', 'PER_SALE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorLeadType') THEN
    CREATE TYPE "VendorLeadType" AS ENUM ('FORM_SUBMISSION', 'PURCHASE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorLeadPricingSource') THEN
    CREATE TYPE "VendorLeadPricingSource" AS ENUM ('INCLUDED', 'CATEGORY', 'SUBCATEGORY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorLeadVisibilityStatus') THEN
    CREATE TYPE "VendorLeadVisibilityStatus" AS ENUM ('VISIBLE', 'LOCKED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorLeadLockedReason') THEN
    CREATE TYPE "VendorLeadLockedReason" AS ENUM ('PLAN_LIMIT', 'NO_BALANCE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorLeadEventStatus') THEN
    CREATE TYPE "VendorLeadEventStatus" AS ENUM ('DELIVERED', 'BLOCKED', 'REFUNDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorWalletTransactionType') THEN
    CREATE TYPE "VendorWalletTransactionType" AS ENUM ('TOP_UP', 'LEAD_CHARGE', 'REFUND');
  END IF;
END
$$;

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "admin_approved_at" TIMESTAMP(3);

ALTER TABLE "vendor_billing_plans"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "included_leads_per_cycle" INTEGER,
  ADD COLUMN IF NOT EXISTS "max_active_offers" INTEGER,
  ADD COLUMN IF NOT EXISTS "overage_enabled" BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE "vendor_billing"
  ADD COLUMN IF NOT EXISTS "currency_code" TEXT NOT NULL DEFAULT 'CAD',
  ADD COLUMN IF NOT EXISTS "billing_cycle_start_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "billing_cycle_end_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "included_leads_total" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "included_leads_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "wallet_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "category_lead_pricing" (
  "id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "subcategory_id" TEXT,
  "lead_price" DECIMAL(10,2) NOT NULL,
  "billing_type" "CategoryLeadPricingBillingType" NOT NULL DEFAULT 'PER_LEAD',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "category_lead_pricing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vendor_lead_events" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "user_id" TEXT,
  "company_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "subcategory_id" TEXT,
  "lead_type" "VendorLeadType" NOT NULL DEFAULT 'FORM_SUBMISSION',
  "price_applied" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "pricing_source" "VendorLeadPricingSource" NOT NULL DEFAULT 'INCLUDED',
  "visibility_status" "VendorLeadVisibilityStatus" NOT NULL DEFAULT 'VISIBLE',
  "locked_reason" "VendorLeadLockedReason",
  "deducted_from_included_leads" INTEGER NOT NULL DEFAULT 0,
  "deducted_from_wallet" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unlocked_at" TIMESTAMP(3),
  "status" "VendorLeadEventStatus" NOT NULL DEFAULT 'DELIVERED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendor_lead_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "vendor_wallet_transactions" (
  "id" TEXT NOT NULL,
  "vendor_id" TEXT NOT NULL,
  "subscription_id" TEXT,
  "type" "VendorWalletTransactionType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balance_before" DECIMAL(12,2) NOT NULL,
  "balance_after" DECIMAL(12,2) NOT NULL,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendor_wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_lead_pricing_category_subcategory_key"
  ON "category_lead_pricing"("category_id", "subcategory_id");
CREATE UNIQUE INDEX IF NOT EXISTS "category_lead_pricing_category_null_subcategory_key"
  ON "category_lead_pricing"("category_id")
  WHERE "subcategory_id" IS NULL;
CREATE INDEX IF NOT EXISTS "category_lead_pricing_category_id_is_active_idx"
  ON "category_lead_pricing"("category_id", "is_active");
CREATE INDEX IF NOT EXISTS "category_lead_pricing_subcategory_id_is_active_idx"
  ON "category_lead_pricing"("subcategory_id", "is_active");

CREATE UNIQUE INDEX IF NOT EXISTS "vendor_lead_events_lead_id_key"
  ON "vendor_lead_events"("lead_id");
CREATE INDEX IF NOT EXISTS "vendor_lead_events_vendor_id_created_at_idx"
  ON "vendor_lead_events"("vendor_id", "created_at");
CREATE INDEX IF NOT EXISTS "vendor_lead_events_visibility_status_created_at_idx"
  ON "vendor_lead_events"("visibility_status", "created_at");
CREATE INDEX IF NOT EXISTS "vendor_lead_events_status_created_at_idx"
  ON "vendor_lead_events"("status", "created_at");

CREATE INDEX IF NOT EXISTS "vendor_wallet_transactions_vendor_id_created_at_idx"
  ON "vendor_wallet_transactions"("vendor_id", "created_at");
CREATE INDEX IF NOT EXISTS "vendor_wallet_transactions_subscription_id_created_at_idx"
  ON "vendor_wallet_transactions"("subscription_id", "created_at");

ALTER TABLE "category_lead_pricing"
  DROP CONSTRAINT IF EXISTS "category_lead_pricing_category_id_fkey",
  ADD CONSTRAINT "category_lead_pricing_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_lead_pricing"
  DROP CONSTRAINT IF EXISTS "category_lead_pricing_subcategory_id_fkey",
  ADD CONSTRAINT "category_lead_pricing_subcategory_id_fkey"
    FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_lead_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_vendor_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_offer_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_user_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_company_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_category_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_lead_events"
  DROP CONSTRAINT IF EXISTS "vendor_lead_events_subcategory_id_fkey",
  ADD CONSTRAINT "vendor_lead_events_subcategory_id_fkey"
    FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vendor_wallet_transactions"
  DROP CONSTRAINT IF EXISTS "vendor_wallet_transactions_vendor_id_fkey",
  ADD CONSTRAINT "vendor_wallet_transactions_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_wallet_transactions"
  DROP CONSTRAINT IF EXISTS "vendor_wallet_transactions_subscription_id_fkey",
  ADD CONSTRAINT "vendor_wallet_transactions_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "vendor_billing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "vendor_billing_plans"
SET "included_leads_per_cycle" = COALESCE("included_leads_per_cycle", "included_leads_per_month")
WHERE "included_leads_per_cycle" IS NULL;

UPDATE "vendor_billing_plans"
SET "max_active_offers" = COALESCE("max_active_offers", "offer_limit")
WHERE "max_active_offers" IS NULL;

UPDATE "vendor_billing_plans"
SET
  "code" = COALESCE(
    "code",
    CASE
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE("monthly_fee", 0) >= 300 THEN 'PREMIUM'
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE("monthly_fee", 0) >= 100 THEN 'GROWTH'
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE("monthly_fee", 0) > 0 THEN 'STARTER'
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" THEN 'FREE'
      ELSE 'STARTER'
    END
  ),
  "name" = COALESCE(
    "name",
    CASE
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE("monthly_fee", 0) >= 300 THEN 'Premium'
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE("monthly_fee", 0) >= 100 THEN 'Growth'
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE("monthly_fee", 0) > 0 THEN 'Starter'
      WHEN "plan_type" = 'subscription'::"VendorBillingPlanType" THEN 'Free'
      ELSE 'Starter'
    END
  );

UPDATE "vendor_billing"
SET "currency_code" = COALESCE(NULLIF("currency", ''), 'CAD')
WHERE "currency_code" IS NULL OR "currency_code" = '';

UPDATE "vendor_billing" vb
SET
  "included_leads_total" = COALESCE(vbp."included_leads_per_cycle", vbp."included_leads_per_month", 0),
  "billing_cycle_start_at" = COALESCE(vb."billing_cycle_start_at", CURRENT_TIMESTAMP),
  "billing_cycle_end_at" = COALESCE(vb."billing_cycle_end_at", CURRENT_TIMESTAMP + INTERVAL '30 days')
FROM "vendor_billing_plans" vbp
WHERE vbp."vendor_id" = vb."vendor_id"
  AND vbp."is_active" = TRUE
  AND (vb."included_leads_total" = 0 OR vb."billing_cycle_start_at" IS NULL OR vb."billing_cycle_end_at" IS NULL);
