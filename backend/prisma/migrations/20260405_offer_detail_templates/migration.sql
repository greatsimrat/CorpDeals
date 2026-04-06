CREATE TYPE "OfferDetailTemplateType" AS ENUM (
  'GENERIC',
  'TELECOM',
  'RESTAURANT',
  'FUN_PARK',
  'TRAVEL',
  'BANKING'
);

ALTER TABLE "offers"
ADD COLUMN "slug" TEXT,
ADD COLUMN "detail_template_type" "OfferDetailTemplateType" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN "highlights_json" JSONB,
ADD COLUMN "detail_sections_json" JSONB,
ADD COLUMN "terms_url" TEXT,
ADD COLUMN "cancellation_policy_url" TEXT;

UPDATE "offers"
SET "slug" = COALESCE(NULLIF("slug", ''), "id");

ALTER TABLE "offers"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "offers_slug_key" ON "offers"("slug");
