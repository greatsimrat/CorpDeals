-- Add company allowed domains
ALTER TABLE "companies"
ADD COLUMN IF NOT EXISTS "allowed_domains" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "companies"
SET "allowed_domains" = ARRAY["domain"]
WHERE "domain" IS NOT NULL
  AND "domain" <> ''
  AND CARDINALITY("allowed_domains") = 0;

-- Persistent user/company verification state
CREATE TABLE IF NOT EXISTS "user_company_verifications" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "verification_method" TEXT NOT NULL DEFAULT 'work_email',
  "verified_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'verified',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_company_verifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_company_verifications_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_company_verifications_user_id_company_id_key"
  ON "user_company_verifications"("user_id", "company_id");
CREATE INDEX IF NOT EXISTS "user_company_verifications_user_id_status_expires_at_idx"
  ON "user_company_verifications"("user_id", "status", "expires_at");
CREATE INDEX IF NOT EXISTS "user_company_verifications_company_id_status_idx"
  ON "user_company_verifications"("company_id", "status");

-- Offer claims (single-claim MVP rule)
CREATE TABLE IF NOT EXISTS "offer_claims" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "offer_id" TEXT NOT NULL,
  "claimed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offer_claims_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "offer_claims_offer_id_fkey"
    FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "offer_claims_user_id_offer_id_key"
  ON "offer_claims"("user_id", "offer_id");
CREATE INDEX IF NOT EXISTS "offer_claims_offer_id_idx"
  ON "offer_claims"("offer_id");
