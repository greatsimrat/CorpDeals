DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfferState') THEN
    CREATE TYPE "OfferState" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED', 'REJECTED');
  END IF;
END
$$;

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "offer_state" "OfferState";

UPDATE "offers"
SET "offer_state" = CASE
  WHEN "offer_status"::text = 'CANCELLED' THEN 'CANCELLED'::"OfferState"
  WHEN "compliance_status" = 'rejected' THEN 'REJECTED'::"OfferState"
  WHEN "compliance_status" = 'submitted' THEN 'SUBMITTED'::"OfferState"
  WHEN "compliance_status" = 'approved' THEN 'APPROVED'::"OfferState"
  ELSE 'DRAFT'::"OfferState"
END
WHERE "offer_state" IS NULL;

ALTER TABLE "offers"
  ALTER COLUMN "offer_state" SET DEFAULT 'DRAFT'::"OfferState";

ALTER TABLE "offers"
  ALTER COLUMN "offer_state" SET NOT NULL;

UPDATE "offers"
SET "active" = FALSE
WHERE "offer_state" <> 'APPROVED'::"OfferState"
  AND "active" = TRUE;

ALTER TABLE "offers"
  DROP CONSTRAINT IF EXISTS "offers_active_requires_approved_state_chk";

ALTER TABLE "offers"
  ADD CONSTRAINT "offers_active_requires_approved_state_chk"
  CHECK (NOT "active" OR "offer_state" = 'APPROVED'::"OfferState");

CREATE INDEX IF NOT EXISTS "offers_offer_state_idx" ON "offers"("offer_state");
