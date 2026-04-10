DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'OfferStatus'
  ) THEN
    CREATE TYPE "OfferStatus" AS ENUM (
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'LIVE',
      'PAUSED',
      'CANCELLED',
      'REJECTED'
    );
  END IF;
END $$;

ALTER TABLE "offers"
ADD COLUMN IF NOT EXISTS "offer_status" "OfferStatus",
ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paused_by_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" TEXT,
ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;

UPDATE "offers"
SET "offer_status" = CASE
  WHEN "compliance_status" = 'submitted' THEN 'SUBMITTED'::"OfferStatus"
  WHEN "compliance_status" = 'rejected' THEN 'REJECTED'::"OfferStatus"
  WHEN "compliance_status" = 'approved' AND "active" = TRUE THEN 'LIVE'::"OfferStatus"
  WHEN "compliance_status" = 'approved' AND "active" = FALSE THEN 'APPROVED'::"OfferStatus"
  ELSE 'DRAFT'::"OfferStatus"
END
WHERE "offer_status" IS NULL;

ALTER TABLE "offers"
ALTER COLUMN "offer_status" SET DEFAULT 'DRAFT',
ALTER COLUMN "offer_status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "offers_offer_status_idx" ON "offers"("offer_status");
