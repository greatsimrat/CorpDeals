ALTER TABLE "vendor_requests"
ADD COLUMN IF NOT EXISTS "category_other" TEXT,
ADD COLUMN IF NOT EXISTS "job_title" TEXT;
