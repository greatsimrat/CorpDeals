CREATE TABLE "company_requests" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "work_email" TEXT NOT NULL,
    "city" TEXT,
    "note" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_requests_status_created_at_idx" ON "company_requests"("status", "created_at");
CREATE INDEX "company_requests_work_email_idx" ON "company_requests"("work_email");
