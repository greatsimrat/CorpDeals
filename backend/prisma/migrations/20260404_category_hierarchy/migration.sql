ALTER TABLE "categories"
ADD COLUMN IF NOT EXISTS "parent_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories"("parent_id");
