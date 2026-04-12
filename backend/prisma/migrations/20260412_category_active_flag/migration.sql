ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "categories"
SET "active" = true
WHERE "active" IS NULL;
