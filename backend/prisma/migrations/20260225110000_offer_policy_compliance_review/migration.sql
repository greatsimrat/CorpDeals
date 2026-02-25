-- CreateEnum
CREATE TYPE "compliance_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "platform_policy_type" AS ENUM ('terms_template', 'cancellation_template');

-- AlterTable
ALTER TABLE "offers"
ADD COLUMN "terms_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN "cancellation_policy_text" TEXT NOT NULL DEFAULT '',
ADD COLUMN "redemption_instructions_text" TEXT,
ADD COLUMN "restrictions_text" TEXT,
ADD COLUMN "use_platform_default_terms" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "use_platform_default_cancellation_policy" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "vendor_attestation_accepted_at" TIMESTAMP(3),
ADD COLUMN "vendor_attestation_accepted_ip" TEXT,
ADD COLUMN "compliance_status" "compliance_status" NOT NULL DEFAULT 'draft',
ADD COLUMN "compliance_notes" TEXT;

-- CreateTable
CREATE TABLE "platform_policies" (
    "id" TEXT NOT NULL,
    "policy_type" "platform_policy_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_policies_policy_type_is_default_idx" ON "platform_policies"("policy_type", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "platform_policies_default_per_type_key" ON "platform_policies"("policy_type") WHERE "is_default" = true;

-- Backfill existing active offers so current live offers remain visible
UPDATE "offers"
SET
  "compliance_status" = 'approved',
  "vendor_attestation_accepted_at" = COALESCE("vendor_attestation_accepted_at", "created_at"),
  "vendor_attestation_accepted_ip" = COALESCE("vendor_attestation_accepted_ip", 'legacy-migration'),
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
  END
WHERE "active" = true;

-- Seed default platform policies
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
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "platform_policies"
  WHERE "policy_type" = 'terms_template'
    AND "is_default" = true
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
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM "platform_policies"
  WHERE "policy_type" = 'cancellation_template'
    AND "is_default" = true
);
