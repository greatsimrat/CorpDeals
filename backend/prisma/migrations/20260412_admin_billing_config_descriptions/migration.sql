ALTER TABLE "billing_plan_configs"
  ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "category_lead_pricing"
  ADD COLUMN IF NOT EXISTS "description" TEXT;
