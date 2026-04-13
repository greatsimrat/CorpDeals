INSERT INTO "billing_plan_configs" (
  "id",
  "code",
  "name",
  "description",
  "plan_type",
  "monthly_fee",
  "included_leads_per_cycle",
  "overage_price_per_lead",
  "max_active_offers",
  "currency_code",
  "is_system_preset",
  "is_active"
)
VALUES
  (
    'plan-config-free',
    'FREE',
    'Free',
    'Starter plan for vendors testing CorpDeals.',
    'subscription',
    0.00,
    10,
    5.00,
    50,
    'CAD',
    true,
    true
  ),
  (
    'plan-config-gold',
    'GOLD',
    'Gold',
    'Growth plan for vendors actively scaling deal coverage.',
    'subscription',
    100.00,
    20,
    3.00,
    100,
    'CAD',
    true,
    true
  ),
  (
    'plan-config-premium',
    'PREMIUM',
    'Premium',
    'High-volume plan for vendors with broad active catalogs.',
    'subscription',
    250.00,
    50,
    2.00,
    250,
    'CAD',
    true,
    true
  )
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "vendor_requests"
  ADD COLUMN IF NOT EXISTS "selected_plan_code" TEXT NOT NULL DEFAULT 'FREE';

ALTER TABLE "vendor_requests"
  ADD COLUMN IF NOT EXISTS "selected_plan_config_id" TEXT;

UPDATE "vendor_requests"
SET "selected_plan_code" = CASE UPPER(COALESCE("selected_plan_code", 'FREE'))
  WHEN 'GROWTH' THEN 'GOLD'
  WHEN 'PRO' THEN 'PREMIUM'
  WHEN 'FREE' THEN 'FREE'
  WHEN 'GOLD' THEN 'GOLD'
  WHEN 'PREMIUM' THEN 'PREMIUM'
  ELSE 'FREE'
END;

UPDATE "vendor_requests" vr
SET "selected_plan_config_id" = bpc."id"
FROM "billing_plan_configs" bpc
WHERE bpc."code" = vr."selected_plan_code"
  AND vr."selected_plan_config_id" IS NULL;

UPDATE "vendor_requests" vr
SET "selected_plan_config_id" = bpc."id"
FROM "billing_plan_configs" bpc
WHERE bpc."code" = 'FREE'
  AND vr."selected_plan_config_id" IS NULL;

ALTER TABLE "vendor_requests"
  ALTER COLUMN "selected_plan_config_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendor_requests_selected_plan_config_id_fkey'
  ) THEN
    ALTER TABLE "vendor_requests"
      ADD CONSTRAINT "vendor_requests_selected_plan_config_id_fkey"
      FOREIGN KEY ("selected_plan_config_id")
      REFERENCES "billing_plan_configs"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "vendor_requests_selected_plan_code_idx"
  ON "vendor_requests"("selected_plan_code");

CREATE INDEX IF NOT EXISTS "vendor_requests_selected_plan_config_id_idx"
  ON "vendor_requests"("selected_plan_config_id");
