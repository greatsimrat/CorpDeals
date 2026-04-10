ALTER TABLE "vendor_billing_plans"
ADD COLUMN "offer_limit" INTEGER,
ADD COLUMN "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "ends_at" TIMESTAMP(3);

UPDATE "vendor_billing_plans"
SET "starts_at" = COALESCE("created_at", CURRENT_TIMESTAMP)
WHERE "starts_at" IS NULL;
