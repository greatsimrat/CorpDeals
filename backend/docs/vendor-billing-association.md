# Vendor Billing Association Prep (Phase 1)

## Reused existing schema
- `vendors` (`Vendor`)
- `vendor_billing` (`VendorBilling`) as the canonical vendor billing association row
- `vendor_billing_plans` (`VendorBillingPlan`) for plan limits and active date windows
- `offers` (`Offer`) lifecycle fields (`offer_status`, `active`, `paused_at`) for non-destructive visibility control

## Minimal additions
- Added enum `VendorBillingAssociationStatus`:
  - `TRIALING`, `ACTIVE`, `FREE` (allowed)
  - `INACTIVE`, `PAST_DUE`, `CANCELED`, `INCOMPLETE`, `EXPIRED` (blocked)
- Added fields on `vendor_billing`:
  - `association_status`
  - `status_reason`
  - `last_validated_at`

## Migration
1. Run:
   - `npx prisma migrate deploy`
2. Migration added:
   - `prisma/migrations/20260410_vendor_billing_association_status/migration.sql`

## Backfill script
- Command:
  - `npm run db:billing:backfill`
- Options:
  - `--dry-run` (report only)
  - `--allow-production` (required if running in production)
- Behavior:
  - Reuses an existing vendor plan if possible.
  - Creates a default non-production free plan only when no usable plan exists.
  - Upserts `vendor_billing` association status metadata.

## Offer audit script
- Command:
  - `npm run db:billing:audit-offers`
- Options:
  - `--apply-status` (pauses non-compliant LIVE offers)
- Behavior:
  - Reports offers in compliant lifecycle statuses whose vendors lack a valid billing association.
  - Non-destructive by default (report only).

## Live-offer revalidation script
- Command:
  - `npm run db:billing:revalidate-live-offers`
- Options:
  - `--apply` (apply pause updates)
- Behavior:
  - Scans live offers.
  - Pauses offers whose vendors are no longer billing-eligible.

## Seed alignment
- `prisma/seed.ts` and `prisma/seed-uat.ts` now create billing-compliant vendor associations and active plans for seeded vendors.
