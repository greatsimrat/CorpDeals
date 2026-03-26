ALTER TYPE "VendorStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

ALTER TABLE "users"
  ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "vendor_id" TEXT,
  ADD COLUMN IF NOT EXISTS "active_company_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_active_company_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_active_company_id_fkey"
      FOREIGN KEY ("active_company_id")
      REFERENCES "companies"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_vendor_id_idx" ON "users"("vendor_id");
CREATE INDEX IF NOT EXISTS "users_active_company_id_idx" ON "users"("active_company_id");

ALTER TABLE "vendors"
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "product_name" TEXT,
  ADD COLUMN IF NOT EXISTS "product_model" TEXT,
  ADD COLUMN IF NOT EXISTS "product_url" TEXT;

UPDATE "offers"
SET "offer_type" = 'lead'
WHERE "offer_type" IS NULL OR LOWER("offer_type") <> 'lead';

ALTER TABLE "offers"
  ALTER COLUMN "offer_type" SET DEFAULT 'lead',
  ALTER COLUMN "offer_type" SET NOT NULL;

ALTER TABLE "offers"
  DROP CONSTRAINT IF EXISTS "offers_offer_type_check";

ALTER TABLE "offers"
  ADD CONSTRAINT "offers_offer_type_check"
  CHECK (LOWER("offer_type") = 'lead');

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "consent" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "leads"
SET "consent" = TRUE
WHERE "consent" = FALSE AND "consent_at" IS NOT NULL;
