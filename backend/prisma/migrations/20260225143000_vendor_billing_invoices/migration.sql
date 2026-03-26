-- CreateEnum
CREATE TYPE "VendorBillingPlanType" AS ENUM ('pay_per_lead', 'subscription');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'void');

-- CreateEnum
CREATE TYPE "InvoiceLineItemType" AS ENUM ('leads', 'subscription', 'adjustment');

-- CreateEnum
CREATE TYPE "LeadBillingEventStatus" AS ENUM ('pending', 'invoiced', 'void');

-- CreateTable
CREATE TABLE "vendor_billing_plans" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "plan_type" "VendorBillingPlanType" NOT NULL,
    "price_per_lead" DECIMAL(10,2),
    "monthly_fee" DECIMAL(10,2),
    "included_leads_per_month" INTEGER,
    "overage_price_per_lead" DECIMAL(10,2),
    "billing_cycle_day" INTEGER NOT NULL DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "item_type" "InvoiceLineItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_billing_events" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "billed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_id" TEXT,
    "billing_status" "LeadBillingEventStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_billing_plans_vendor_id_is_active_idx" ON "vendor_billing_plans"("vendor_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_vendor_period_key" ON "invoices"("vendor_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "invoices_vendor_id_status_idx" ON "invoices"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "lead_billing_events_lead_id_key" ON "lead_billing_events"("lead_id");

-- CreateIndex
CREATE INDEX "lead_billing_events_vendor_id_billing_status_idx" ON "lead_billing_events"("vendor_id", "billing_status");

-- CreateIndex
CREATE INDEX "lead_billing_events_invoice_id_idx" ON "lead_billing_events"("invoice_id");

-- AddForeignKey
ALTER TABLE "vendor_billing_plans" ADD CONSTRAINT "vendor_billing_plans_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_billing_events" ADD CONSTRAINT "lead_billing_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_billing_events" ADD CONSTRAINT "lead_billing_events_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_billing_events" ADD CONSTRAINT "lead_billing_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enforce duplicate lead protection for authenticated users when no duplicates currently exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "leads"
    WHERE "user_id" IS NOT NULL
    GROUP BY "user_id", "offer_id"
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX "leads_user_offer_unique_when_user_present"
      ON "leads"("user_id", "offer_id")
      WHERE "user_id" IS NOT NULL;
  END IF;
END $$;
