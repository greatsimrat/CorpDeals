DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CoverageType'
  ) THEN
    CREATE TYPE "CoverageType" AS ENUM ('COMPANY_WIDE', 'PROVINCE_SPECIFIC', 'CITY_SPECIFIC');
  END IF;
END $$;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "province_code" TEXT,
ADD COLUMN IF NOT EXISTS "city_name" TEXT;

ALTER TABLE "offers"
ADD COLUMN IF NOT EXISTS "coverage_type" "CoverageType",
ADD COLUMN IF NOT EXISTS "province_code" TEXT,
ADD COLUMN IF NOT EXISTS "city_name" TEXT;

UPDATE "offers"
SET
  "coverage_type" = 'COMPANY_WIDE',
  "province_code" = NULL,
  "city_name" = NULL
WHERE "coverage_type" IS NULL;

ALTER TABLE "offers"
ALTER COLUMN "coverage_type" SET DEFAULT 'COMPANY_WIDE';

ALTER TABLE "offers"
ALTER COLUMN "coverage_type" SET NOT NULL;

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "terms_accepted" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "user_province_code_at_submission" TEXT,
ADD COLUMN IF NOT EXISTS "user_city_at_submission" TEXT;

UPDATE "leads"
SET
  "terms_accepted" = "consent",
  "terms_accepted_at" = COALESCE("terms_accepted_at", "consent_at")
WHERE "terms_accepted" = FALSE
  AND "consent" = TRUE;

CREATE INDEX IF NOT EXISTS "offers_company_id_coverage_type_province_code_city_name_idx"
  ON "offers"("company_id", "coverage_type", "province_code", "city_name");
