-- Ensure offer workflow columns exist
ALTER TABLE "offers"
ADD COLUMN IF NOT EXISTS "offer_type" TEXT,
ADD COLUMN IF NOT EXISTS "config_json" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'offers_offer_type_check'
  ) THEN
    ALTER TABLE "offers"
    ADD CONSTRAINT "offers_offer_type_check"
    CHECK ("offer_type" IS NULL OR "offer_type" IN ('lead', 'coupon', 'redirect'));
  END IF;
END $$;

-- Extend LeadStatus enum for delivery workflow while preserving existing values
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'FAILED';

-- Enrich leads table for payload + consent + routing
ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "user_id" TEXT,
ADD COLUMN IF NOT EXISTS "vendor_id" TEXT,
ADD COLUMN IF NOT EXISTS "payload_json" JSONB,
ADD COLUMN IF NOT EXISTS "consent_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "consent_ip" TEXT;

-- Backfill vendor_id from related offer rows
UPDATE "leads" l
SET "vendor_id" = o."vendor_id"
FROM "offers" o
WHERE l."offer_id" = o."id" AND l."vendor_id" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_user_id_fkey'
  ) THEN
    ALTER TABLE "leads"
    ADD CONSTRAINT "leads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_vendor_id_fkey'
  ) THEN
    ALTER TABLE "leads"
    ADD CONSTRAINT "leads_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "leads_user_id_idx" ON "leads"("user_id");
CREATE INDEX IF NOT EXISTS "leads_vendor_id_idx" ON "leads"("vendor_id");

-- One redemption record per user+offer
CREATE TABLE IF NOT EXISTS "redemptions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "redeemed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "redemptions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_user_id_fkey'
  ) THEN
    ALTER TABLE "redemptions"
    ADD CONSTRAINT "redemptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_offer_id_fkey'
  ) THEN
    ALTER TABLE "redemptions"
    ADD CONSTRAINT "redemptions_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'redemptions_company_id_fkey'
  ) THEN
    ALTER TABLE "redemptions"
    ADD CONSTRAINT "redemptions_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "redemptions_user_id_offer_id_key"
  ON "redemptions"("user_id", "offer_id");
CREATE INDEX IF NOT EXISTS "redemptions_offer_id_idx" ON "redemptions"("offer_id");
CREATE INDEX IF NOT EXISTS "redemptions_company_id_idx" ON "redemptions"("company_id");

-- Click tracking table (anonymous or authenticated)
CREATE TABLE IF NOT EXISTS "offer_clicks" (
  "id" TEXT NOT NULL,
  "user_id" TEXT,
  "offer_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "clicked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referrer" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_clicks_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offer_clicks_user_id_fkey'
  ) THEN
    ALTER TABLE "offer_clicks"
    ADD CONSTRAINT "offer_clicks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offer_clicks_offer_id_fkey'
  ) THEN
    ALTER TABLE "offer_clicks"
    ADD CONSTRAINT "offer_clicks_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offer_clicks_company_id_fkey'
  ) THEN
    ALTER TABLE "offer_clicks"
    ADD CONSTRAINT "offer_clicks_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "offer_clicks_offer_id_clicked_at_idx"
  ON "offer_clicks"("offer_id", "clicked_at");
CREATE INDEX IF NOT EXISTS "offer_clicks_company_id_clicked_at_idx"
  ON "offer_clicks"("company_id", "clicked_at");
CREATE INDEX IF NOT EXISTS "offer_clicks_user_id_clicked_at_idx"
  ON "offer_clicks"("user_id", "clicked_at");
