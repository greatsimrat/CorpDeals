DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'VendorBillingAssociationStatus'
  ) THEN
    CREATE TYPE "VendorBillingAssociationStatus" AS ENUM (
      'TRIALING',
      'ACTIVE',
      'FREE',
      'INACTIVE',
      'PAST_DUE',
      'CANCELED',
      'INCOMPLETE',
      'EXPIRED'
    );
  END IF;
END $$;

ALTER TABLE "vendor_billing"
ADD COLUMN IF NOT EXISTS "association_status" "VendorBillingAssociationStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN IF NOT EXISTS "status_reason" TEXT,
ADD COLUMN IF NOT EXISTS "last_validated_at" TIMESTAMP(3);

UPDATE "vendor_billing"
SET
  "association_status" = CASE
    WHEN "billing_mode" = 'FREE' THEN 'FREE'::"VendorBillingAssociationStatus"
    WHEN "billing_mode" = 'TRIAL'
      AND ("trial_ends_at" IS NULL OR "trial_ends_at" > CURRENT_TIMESTAMP)
      THEN 'TRIALING'::"VendorBillingAssociationStatus"
    WHEN "billing_mode" = 'TRIAL'
      AND "trial_ends_at" <= CURRENT_TIMESTAMP
      THEN 'EXPIRED'::"VendorBillingAssociationStatus"
    WHEN "billing_mode" IN ('PAY_PER_LEAD', 'MONTHLY', 'HYBRID')
      THEN 'ACTIVE'::"VendorBillingAssociationStatus"
    ELSE 'INACTIVE'::"VendorBillingAssociationStatus"
  END,
  "last_validated_at" = COALESCE("last_validated_at", CURRENT_TIMESTAMP)
WHERE
  "association_status" = 'INACTIVE'::"VendorBillingAssociationStatus"
  OR "last_validated_at" IS NULL;

CREATE INDEX IF NOT EXISTS "vendor_billing_association_status_idx"
ON "vendor_billing"("association_status");
