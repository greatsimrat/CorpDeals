CREATE TABLE IF NOT EXISTS "billing_plan_configs" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "plan_type" "VendorBillingPlanType" NOT NULL,
  "price_per_lead" DECIMAL(10,2),
  "monthly_fee" DECIMAL(10,2),
  "included_leads_per_cycle" INTEGER,
  "overage_price_per_lead" DECIMAL(10,2),
  "max_active_offers" INTEGER,
  "overage_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "currency_code" TEXT NOT NULL DEFAULT 'CAD',
  "is_system_preset" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_plan_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "billing_plan_configs_code_key"
  ON "billing_plan_configs"("code");
CREATE INDEX IF NOT EXISTS "billing_plan_configs_is_active_plan_type_idx"
  ON "billing_plan_configs"("is_active", "plan_type");

ALTER TABLE "vendor_billing_plans"
  ADD COLUMN IF NOT EXISTS "plan_config_id" TEXT;

ALTER TABLE "vendor_billing"
  ADD COLUMN IF NOT EXISTS "plan_config_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendor_billing_plans_plan_config_id_fkey'
  ) THEN
    ALTER TABLE "vendor_billing_plans"
      ADD CONSTRAINT "vendor_billing_plans_plan_config_id_fkey"
      FOREIGN KEY ("plan_config_id") REFERENCES "billing_plan_configs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendor_billing_plan_config_id_fkey'
  ) THEN
    ALTER TABLE "vendor_billing"
      ADD CONSTRAINT "vendor_billing_plan_config_id_fkey"
      FOREIGN KEY ("plan_config_id") REFERENCES "billing_plan_configs"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "vendor_billing_plans_plan_config_id_is_active_idx"
  ON "vendor_billing_plans"("plan_config_id", "is_active");
CREATE INDEX IF NOT EXISTS "vendor_billing_plan_config_id_association_status_idx"
  ON "vendor_billing"("plan_config_id", "association_status");

INSERT INTO "billing_plan_configs" (
  "id",
  "code",
  "name",
  "plan_type",
  "price_per_lead",
  "monthly_fee",
  "included_leads_per_cycle",
  "overage_price_per_lead",
  "max_active_offers",
  "overage_enabled",
  "currency_code",
  "is_system_preset",
  "is_active"
)
VALUES
  ('plan-config-free', 'FREE', 'Free', 'subscription', NULL, 0, 10, 5, 50, TRUE, 'CAD', TRUE, TRUE),
  ('plan-config-gold', 'GOLD', 'Gold', 'subscription', NULL, 100, 100, 3, 100, TRUE, 'CAD', TRUE, TRUE),
  ('plan-config-premium', 'PREMIUM', 'Premium', 'subscription', NULL, 300, 300, 2, NULL, TRUE, 'CAD', TRUE, TRUE),
  ('plan-config-pay-per-lead', 'PAY_PER_LEAD', 'Pay Per Lead', 'pay_per_lead', 12.5, NULL, 0, NULL, 25, TRUE, 'CAD', TRUE, TRUE)
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "plan_type" = EXCLUDED."plan_type",
  "price_per_lead" = EXCLUDED."price_per_lead",
  "monthly_fee" = EXCLUDED."monthly_fee",
  "included_leads_per_cycle" = EXCLUDED."included_leads_per_cycle",
  "overage_price_per_lead" = EXCLUDED."overage_price_per_lead",
  "max_active_offers" = EXCLUDED."max_active_offers",
  "overage_enabled" = EXCLUDED."overage_enabled",
  "currency_code" = EXCLUDED."currency_code",
  "is_system_preset" = EXCLUDED."is_system_preset",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "vendor_billing_plans" vbp
SET "plan_config_id" = bpc."id"
FROM "billing_plan_configs" bpc
WHERE vbp."plan_config_id" IS NULL
  AND bpc."code" = UPPER(COALESCE(vbp."code", ''));

UPDATE "vendor_billing_plans" vbp
SET "plan_config_id" = bpc."id"
FROM "billing_plan_configs" bpc
WHERE vbp."plan_config_id" IS NULL
  AND bpc."code" = CASE
    WHEN vbp."plan_type" = 'pay_per_lead'::"VendorBillingPlanType" THEN 'PAY_PER_LEAD'
    WHEN vbp."plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE(vbp."monthly_fee", 0) <= 0 THEN 'FREE'
    WHEN vbp."plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE(vbp."monthly_fee", 0) >= 300 THEN 'PREMIUM'
    WHEN vbp."plan_type" = 'subscription'::"VendorBillingPlanType" AND COALESCE(vbp."monthly_fee", 0) >= 100 THEN 'GOLD'
    ELSE NULL
  END;

INSERT INTO "billing_plan_configs" (
  "id",
  "code",
  "name",
  "plan_type",
  "price_per_lead",
  "monthly_fee",
  "included_leads_per_cycle",
  "overage_price_per_lead",
  "max_active_offers",
  "overage_enabled",
  "currency_code",
  "is_system_preset",
  "is_active"
)
SELECT
  'plan-config-custom-' || substr(md5(vbp."id"), 1, 12) AS "id",
  COALESCE(
    NULLIF(UPPER(regexp_replace(COALESCE(vbp."code", ''), '[^A-Za-z0-9]+', '_', 'g')), ''),
    'CUSTOM_' || UPPER(substr(md5(vbp."id"), 1, 12))
  ) AS "code",
  COALESCE(NULLIF(vbp."name", ''), 'Custom Plan') AS "name",
  vbp."plan_type",
  vbp."price_per_lead",
  vbp."monthly_fee",
  COALESCE(vbp."included_leads_per_cycle", vbp."included_leads_per_month"),
  vbp."overage_price_per_lead",
  COALESCE(vbp."max_active_offers", vbp."offer_limit"),
  COALESCE(vbp."overage_enabled", TRUE),
  COALESCE(NULLIF(vbp."currency", ''), 'CAD'),
  FALSE,
  TRUE
FROM "vendor_billing_plans" vbp
WHERE vbp."plan_config_id" IS NULL
ON CONFLICT ("code") DO NOTHING;

UPDATE "vendor_billing_plans" vbp
SET "plan_config_id" = bpc."id"
FROM "billing_plan_configs" bpc
WHERE vbp."plan_config_id" IS NULL
  AND bpc."code" = COALESCE(
    NULLIF(UPPER(regexp_replace(COALESCE(vbp."code", ''), '[^A-Za-z0-9]+', '_', 'g')), ''),
    'CUSTOM_' || UPPER(substr(md5(vbp."id"), 1, 12))
  );

WITH ranked_plan AS (
  SELECT
    vbp."vendor_id",
    vbp."plan_config_id",
    ROW_NUMBER() OVER (
      PARTITION BY vbp."vendor_id"
      ORDER BY vbp."is_active" DESC, vbp."starts_at" DESC, vbp."updated_at" DESC
    ) AS rn
  FROM "vendor_billing_plans" vbp
  WHERE vbp."plan_config_id" IS NOT NULL
)
UPDATE "vendor_billing" vb
SET "plan_config_id" = rp."plan_config_id"
FROM ranked_plan rp
WHERE vb."vendor_id" = rp."vendor_id"
  AND rp.rn = 1
  AND vb."plan_config_id" IS NULL;

UPDATE "vendor_billing"
SET "currency_code" = COALESCE(NULLIF("currency_code", ''), NULLIF("currency", ''), 'CAD')
WHERE "currency_code" IS NULL OR "currency_code" = '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'offers'
      AND column_name = 'coverage_type'
  ) THEN
    UPDATE "offers"
    SET "province_code" = NULL,
        "city_name" = NULL
    WHERE "coverage_type" = 'COMPANY_WIDE'::"CoverageType";

    UPDATE "offers"
    SET "city_name" = NULL
    WHERE "coverage_type" = 'PROVINCE_SPECIFIC'::"CoverageType";

    UPDATE "offers"
    SET "coverage_type" = CASE
        WHEN "province_code" IS NULL THEN 'COMPANY_WIDE'::"CoverageType"
        WHEN "city_name" IS NULL THEN 'PROVINCE_SPECIFIC'::"CoverageType"
        ELSE 'CITY_SPECIFIC'::"CoverageType"
      END
    WHERE "coverage_type" = 'CITY_SPECIFIC'::"CoverageType"
      AND ("province_code" IS NULL OR "city_name" IS NULL);

    ALTER TABLE "offers"
      DROP CONSTRAINT IF EXISTS "offers_coverage_location_valid_chk";

    ALTER TABLE "offers"
      ADD CONSTRAINT "offers_coverage_location_valid_chk"
      CHECK (
        ("coverage_type" = 'COMPANY_WIDE'::"CoverageType" AND "province_code" IS NULL AND "city_name" IS NULL)
        OR ("coverage_type" = 'PROVINCE_SPECIFIC'::"CoverageType" AND "province_code" IS NOT NULL AND "city_name" IS NULL)
        OR ("coverage_type" = 'CITY_SPECIFIC'::"CoverageType" AND "province_code" IS NOT NULL AND "city_name" IS NOT NULL)
      );
  END IF;
END $$;
