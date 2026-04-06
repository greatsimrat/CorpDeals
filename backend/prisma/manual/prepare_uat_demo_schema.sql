DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_status') THEN
    CREATE TYPE "compliance_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'platform_policy_type') THEN
    CREATE TYPE "platform_policy_type" AS ENUM ('terms_template', 'cancellation_template');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoverageType') THEN
    CREATE TYPE "CoverageType" AS ENUM ('COMPANY_WIDE', 'PROVINCE_SPECIFIC', 'CITY_SPECIFIC');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferDetailTemplateType') THEN
    CREATE TYPE "OfferDetailTemplateType" AS ENUM (
      'GENERIC',
      'TELECOM',
      'RESTAURANT',
      'FUN_PARK',
      'TRAVEL',
      'BANKING'
    );
  END IF;
END $$;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "province_code" TEXT,
ADD COLUMN IF NOT EXISTS "city_name" TEXT;

ALTER TABLE "leads"
ADD COLUMN IF NOT EXISTS "terms_accepted" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "user_province_code_at_submission" TEXT,
ADD COLUMN IF NOT EXISTS "user_city_at_submission" TEXT;

UPDATE "leads"
SET
  "terms_accepted" = "consent",
  "terms_accepted_at" = COALESCE("terms_accepted_at", "consent_at")
WHERE "consent" = TRUE
  AND "terms_accepted" = FALSE;

ALTER TABLE "offers"
ADD COLUMN IF NOT EXISTS "terms_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "cancellation_policy_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "redemption_instructions_text" TEXT,
ADD COLUMN IF NOT EXISTS "restrictions_text" TEXT,
ADD COLUMN IF NOT EXISTS "use_platform_default_terms" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "use_platform_default_cancellation_policy" BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS "vendor_attestation_accepted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "vendor_attestation_accepted_ip" TEXT,
ADD COLUMN IF NOT EXISTS "compliance_status" "compliance_status" NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS "compliance_notes" TEXT,
ADD COLUMN IF NOT EXISTS "coverage_type" "CoverageType" DEFAULT 'COMPANY_WIDE',
ADD COLUMN IF NOT EXISTS "province_code" TEXT,
ADD COLUMN IF NOT EXISTS "city_name" TEXT,
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "detail_template_type" "OfferDetailTemplateType" DEFAULT 'GENERIC',
ADD COLUMN IF NOT EXISTS "highlights_json" JSONB,
ADD COLUMN IF NOT EXISTS "detail_sections_json" JSONB,
ADD COLUMN IF NOT EXISTS "terms_url" TEXT,
ADD COLUMN IF NOT EXISTS "cancellation_policy_url" TEXT;

UPDATE "offers"
SET
  "compliance_status" = 'approved',
  "vendor_attestation_accepted_at" = COALESCE("vendor_attestation_accepted_at", "created_at"),
  "vendor_attestation_accepted_ip" = COALESCE("vendor_attestation_accepted_ip", 'manual-uat-schema'),
  "terms_text" = CASE
    WHEN NULLIF(BTRIM("terms_text"), '') IS NULL THEN
      'This offer is provided by the participating vendor for verified employees only.
Offer details, pricing, and availability are subject to change without notice.
The offer may not be combined with other promotions unless explicitly stated.
Proof of employment and identity may be required at redemption.
Misuse, fraud, or unauthorized sharing may result in cancellation.
Additional product- or service-specific conditions may apply.'
    ELSE "terms_text"
  END,
  "cancellation_policy_text" = CASE
    WHEN NULLIF(BTRIM("cancellation_policy_text"), '') IS NULL THEN
      'Cancellation and refund eligibility is determined by the vendor and may vary by product or service.
Requests must be submitted through the vendor''s published support channels.
If approved, refunds are issued to the original payment method unless otherwise required by law.
Processing times may vary based on payment provider timelines.
Non-refundable fees or partially used services may be excluded where legally permitted.
Questions should be directed to the vendor first; CorpDeals does not process refunds on the vendor''s behalf.'
    ELSE "cancellation_policy_text"
  END,
  "coverage_type" = COALESCE("coverage_type", 'COMPANY_WIDE'),
  "slug" = COALESCE(NULLIF("slug", ''), "id"),
  "detail_template_type" = COALESCE("detail_template_type", 'GENERIC')
WHERE "active" = TRUE
   OR "coverage_type" IS NULL
   OR NULLIF("slug", '') IS NULL
   OR "detail_template_type" IS NULL;

ALTER TABLE "offers"
ALTER COLUMN "coverage_type" SET DEFAULT 'COMPANY_WIDE',
ALTER COLUMN "coverage_type" SET NOT NULL,
ALTER COLUMN "detail_template_type" SET DEFAULT 'GENERIC',
ALTER COLUMN "detail_template_type" SET NOT NULL,
ALTER COLUMN "slug" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "platform_policies" (
  "id" TEXT NOT NULL,
  "policy_type" "platform_policy_type" NOT NULL,
  "title" TEXT NOT NULL,
  "body_text" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_policies_policy_type_is_default_idx"
  ON "platform_policies"("policy_type", "is_default");

CREATE UNIQUE INDEX IF NOT EXISTS "platform_policies_default_per_type_key"
  ON "platform_policies"("policy_type") WHERE "is_default" = TRUE;

INSERT INTO "platform_policies" ("id", "policy_type", "title", "body_text", "is_default", "created_at", "updated_at")
SELECT
  'policy-default-terms-template',
  'terms_template',
  'Default Offer Terms template',
  'This offer is provided by the participating vendor for verified employees only.
Offer details, pricing, and availability are subject to change without notice.
The offer may not be combined with other promotions unless explicitly stated.
Proof of employment and identity may be required at redemption.
Misuse, fraud, or unauthorized sharing may result in cancellation.
Additional product- or service-specific conditions may apply.',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "platform_policies"
  WHERE "policy_type" = 'terms_template'
    AND "is_default" = TRUE
);

INSERT INTO "platform_policies" ("id", "policy_type", "title", "body_text", "is_default", "created_at", "updated_at")
SELECT
  'policy-default-cancellation-template',
  'cancellation_template',
  'Default Cancellation/Refund template',
  'Cancellation and refund eligibility is determined by the vendor and may vary by product or service.
Requests must be submitted through the vendor''s published support channels.
If approved, refunds are issued to the original payment method unless otherwise required by law.
Processing times may vary based on payment provider timelines.
Non-refundable fees or partially used services may be excluded where legally permitted.
Questions should be directed to the vendor first; CorpDeals does not process refunds on the vendor''s behalf.',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "platform_policies"
  WHERE "policy_type" = 'cancellation_template'
    AND "is_default" = TRUE
);

ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories"("parent_id");
CREATE INDEX IF NOT EXISTS "offers_company_id_coverage_type_province_code_city_name_idx"
  ON "offers"("company_id", "coverage_type", "province_code", "city_name");
CREATE UNIQUE INDEX IF NOT EXISTS "offers_slug_key" ON "offers"("slug");
