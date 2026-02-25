DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'leads'
  ) THEN
    ALTER TABLE "leads"
    ADD COLUMN IF NOT EXISTS "vendor_notification_email" TEXT;
  END IF;
END $$;
