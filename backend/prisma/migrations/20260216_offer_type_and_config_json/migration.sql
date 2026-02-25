DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'offers'
  ) THEN
    ALTER TABLE "offers"
    ADD COLUMN IF NOT EXISTS "offer_type" TEXT,
    ADD COLUMN IF NOT EXISTS "config_json" JSONB;
  END IF;
END $$;
