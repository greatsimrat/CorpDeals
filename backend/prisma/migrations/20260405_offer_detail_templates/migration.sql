DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'OfferDetailTemplateType'
  ) THEN
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

ALTER TABLE "offers"
ADD COLUMN IF NOT EXISTS "slug" TEXT,
ADD COLUMN IF NOT EXISTS "detail_template_type" "OfferDetailTemplateType" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN IF NOT EXISTS "highlights_json" JSONB,
ADD COLUMN IF NOT EXISTS "detail_sections_json" JSONB,
ADD COLUMN IF NOT EXISTS "terms_url" TEXT,
ADD COLUMN IF NOT EXISTS "cancellation_policy_url" TEXT;

UPDATE "offers"
SET "slug" = COALESCE(NULLIF("slug", ''), "id")
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "offers"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "offers_slug_key" ON "offers"("slug");
