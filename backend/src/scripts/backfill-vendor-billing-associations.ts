import prisma from '../lib/prisma';
import {
  ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES,
  type AllowedVendorBillingAssociationStatus,
} from '../lib/vendor-billing';
import { ensureBillingPlanConfig } from '../lib/billing-plan-config';

type BillingPlanRecord = {
  id: string;
  vendorId: string;
  planType: 'PAY_PER_LEAD' | 'SUBSCRIPTION';
  monthlyFee: unknown;
  pricePerLead: unknown;
  offerLimit: number | null;
  billingCycleDay: number;
  currency: string;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
  updatedAt: Date;
};

type BillingRecord = {
  id: string;
  billingMode: 'TRIAL' | 'FREE' | 'PAY_PER_LEAD' | 'MONTHLY' | 'HYBRID';
  associationStatus:
    | 'TRIALING'
    | 'ACTIVE'
    | 'FREE'
    | 'INACTIVE'
    | 'PAST_DUE'
    | 'CANCELED'
    | 'INCOMPLETE'
    | 'EXPIRED';
  trialEndsAt: Date | null;
  paymentMethod: 'MANUAL' | 'STRIPE';
  currency: string;
  billingDay: number;
};

const FREE_PLAN_ID_PREFIX = 'backfill-plan-';
const DEFAULT_PLAN_OFFER_LIMIT = 50;
const DEFAULT_PLAN_CURRENCY = 'CAD';
const BACKFILL_REASON = 'backfill-vendor-billing-association';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const allowProduction = args.has('--allow-production');

const now = new Date();

const addDays = (value: Date, days: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isPlanActiveNow = (plan: BillingPlanRecord | null | undefined, at = now) => {
  if (!plan || !plan.isActive) return false;
  if (plan.startsAt > at) return false;
  if (plan.endsAt && plan.endsAt < at) return false;
  return true;
};

const deriveAssociationStatus = (
  plan: BillingPlanRecord,
  existingBilling: BillingRecord | null
):
  | 'TRIALING'
  | 'ACTIVE'
  | 'FREE'
  | 'INACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'INCOMPLETE'
  | 'EXPIRED' => {
  if (existingBilling?.billingMode === 'TRIAL') {
    return existingBilling.trialEndsAt && existingBilling.trialEndsAt <= now ? 'EXPIRED' : 'TRIALING';
  }

  if (plan.planType === 'SUBSCRIPTION' && toNumber(plan.monthlyFee, 0) <= 0) {
    return 'FREE';
  }

  return 'ACTIVE';
};

const deriveBillingMode = (plan: BillingPlanRecord) => {
  if (plan.planType === 'PAY_PER_LEAD') return 'PAY_PER_LEAD' as const;
  if (toNumber(plan.monthlyFee, 0) <= 0) return 'FREE' as const;
  return 'MONTHLY' as const;
};

async function main() {
  const runtimeEnv = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const isProduction = runtimeEnv === 'production' || runtimeEnv === 'prod';
  if (isProduction && !allowProduction) {
    throw new Error(
      'Refusing to run billing backfill in production without --allow-production. Use --dry-run first.'
    );
  }

  const vendors = await (prisma as any).vendor.findMany({
    select: {
      id: true,
      companyName: true,
      billing: {
        select: {
          id: true,
          billingMode: true,
          associationStatus: true,
          trialEndsAt: true,
          paymentMethod: true,
          currency: true,
          billingDay: true,
        },
      },
      billingPlans: {
        select: {
          id: true,
          vendorId: true,
          planType: true,
          monthlyFee: true,
          pricePerLead: true,
          offerLimit: true,
          billingCycleDay: true,
          currency: true,
          startsAt: true,
          endsAt: true,
          isActive: true,
          updatedAt: true,
        },
        orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { updatedAt: 'desc' }],
      },
    },
    orderBy: { companyName: 'asc' },
  });

  const summary = {
    vendorsScanned: vendors.length,
    alreadyCompliant: 0,
    vendorsUpdated: 0,
    billingRowsCreated: 0,
    billingRowsUpdated: 0,
    plansActivated: 0,
    plansCreated: 0,
  };

  const updatedVendorNames: string[] = [];

  for (const vendor of vendors as Array<{
    id: string;
    companyName: string;
    billing: BillingRecord | null;
    billingPlans: BillingPlanRecord[];
  }>) {
    const activePlan = vendor.billingPlans.find((plan) => isPlanActiveNow(plan)) || null;
    const associationStatus = String(vendor.billing?.associationStatus || '').toUpperCase();
    const hasAllowedAssociation =
      !!activePlan &&
      ALLOWED_VENDOR_BILLING_ASSOCIATION_STATUSES.includes(
        associationStatus as AllowedVendorBillingAssociationStatus
      );

    if (hasAllowedAssociation) {
      summary.alreadyCompliant += 1;
      continue;
    }

    summary.vendorsUpdated += 1;
    updatedVendorNames.push(vendor.companyName);

    if (dryRun) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      let effectivePlan = activePlan;

      if (!effectivePlan) {
        const reusablePlan =
          vendor.billingPlans.find((plan) => !plan.endsAt || plan.endsAt >= now) ||
          vendor.billingPlans[0] ||
          null;

        await (tx as any).vendorBillingPlan.updateMany({
          where: { vendorId: vendor.id, isActive: true },
          data: { isActive: false },
        });

        if (reusablePlan) {
          effectivePlan = await (tx as any).vendorBillingPlan.update({
            where: { id: reusablePlan.id },
            data: {
              isActive: true,
              startsAt: reusablePlan.startsAt > now ? now : reusablePlan.startsAt,
              endsAt:
                reusablePlan.endsAt && reusablePlan.endsAt > now
                  ? reusablePlan.endsAt
                  : addDays(now, 365),
            },
          });
          summary.plansActivated += 1;
        } else {
          effectivePlan = await (tx as any).vendorBillingPlan.upsert({
            where: { id: `${FREE_PLAN_ID_PREFIX}${vendor.id}` },
            update: {
              vendorId: vendor.id,
              planType: 'SUBSCRIPTION',
              monthlyFee: '0.00',
              pricePerLead: null,
              includedLeadsPerMonth: 10,
              overagePricePerLead: '5.00',
              offerLimit: DEFAULT_PLAN_OFFER_LIMIT,
              billingCycleDay: 1,
              currency: DEFAULT_PLAN_CURRENCY,
              startsAt: now,
              endsAt: addDays(now, 365),
              isActive: true,
            },
            create: {
              id: `${FREE_PLAN_ID_PREFIX}${vendor.id}`,
              vendorId: vendor.id,
              planType: 'SUBSCRIPTION',
              monthlyFee: '0.00',
              pricePerLead: null,
              includedLeadsPerMonth: 10,
              overagePricePerLead: '5.00',
              offerLimit: DEFAULT_PLAN_OFFER_LIMIT,
              billingCycleDay: 1,
              currency: DEFAULT_PLAN_CURRENCY,
              startsAt: now,
              endsAt: addDays(now, 365),
              isActive: true,
            },
          });
          summary.plansCreated += 1;
        }
      }

      if (!effectivePlan) return;

      const derivedCode =
        String((effectivePlan as any).code || '').trim().toUpperCase() ||
        (effectivePlan.planType === 'PAY_PER_LEAD'
          ? 'PAY_PER_LEAD'
          : toNumber(effectivePlan.monthlyFee, 0) <= 0
          ? 'FREE'
          : toNumber(effectivePlan.monthlyFee, 0) >= 250
          ? 'PREMIUM'
          : toNumber(effectivePlan.monthlyFee, 0) >= 100
          ? 'GOLD'
          : '');
      const planConfig = await ensureBillingPlanConfig(tx, {
        code: derivedCode || null,
        name: String((effectivePlan as any).name || '').trim() || null,
        description:
          derivedCode === 'FREE'
            ? 'Starter plan for vendors testing CorpDeals.'
            : derivedCode === 'GOLD'
            ? 'Growth plan for vendors actively scaling deal coverage.'
            : derivedCode === 'PREMIUM'
            ? 'High-volume plan for vendors with broad active catalogs.'
            : null,
        planType: effectivePlan.planType,
        pricePerLead: (effectivePlan as any).pricePerLead ?? null,
        monthlyFee: (effectivePlan as any).monthlyFee ?? null,
        includedLeadsPerCycle:
          (effectivePlan as any).includedLeadsPerCycle ??
          (effectivePlan as any).includedLeadsPerMonth ??
          null,
        overagePricePerLead: (effectivePlan as any).overagePricePerLead ?? null,
        maxActiveOffers: (effectivePlan as any).maxActiveOffers ?? effectivePlan.offerLimit,
        overageEnabled: (effectivePlan as any).overageEnabled ?? true,
        currencyCode: effectivePlan.currency || DEFAULT_PLAN_CURRENCY,
        isSystemPreset: ['FREE', 'GOLD', 'PREMIUM', 'PAY_PER_LEAD'].includes(derivedCode),
      });

      if ((effectivePlan as any).planConfigId !== planConfig.id) {
        await (tx as any).vendorBillingPlan.update({
          where: { id: effectivePlan.id },
          data: { planConfigId: planConfig.id },
        });
      }

      const billingMode = deriveBillingMode(effectivePlan);
      const associationStatusToStore = deriveAssociationStatus(effectivePlan, vendor.billing);
      const leadPriceCents =
        effectivePlan.planType === 'PAY_PER_LEAD'
          ? Math.max(0, Math.round(toNumber(effectivePlan.pricePerLead, 0) * 100))
          : 0;
      const monthlyFeeCents =
        effectivePlan.planType === 'SUBSCRIPTION'
          ? Math.max(0, Math.round(toNumber(effectivePlan.monthlyFee, 0) * 100))
          : 0;

      if (vendor.billing) {
        await tx.vendorBilling.update({
          where: { vendorId: vendor.id },
          data: {
            billingMode,
            postTrialMode: billingMode === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
            trialEndsAt: billingMode === 'FREE' ? null : vendor.billing.trialEndsAt,
            leadPriceCents,
            monthlyFeeCents,
            paymentMethod: vendor.billing.paymentMethod || 'MANUAL',
            currency: effectivePlan.currency || vendor.billing.currency || DEFAULT_PLAN_CURRENCY,
            planConfigId: planConfig.id,
            billingDay: effectivePlan.billingCycleDay || vendor.billing.billingDay || 1,
            associationStatus: associationStatusToStore,
            statusReason: BACKFILL_REASON,
            lastValidatedAt: now,
          },
        } as any);
        summary.billingRowsUpdated += 1;
      } else {
        await tx.vendorBilling.create({
          data: {
            vendorId: vendor.id,
            billingMode,
            postTrialMode: billingMode === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : 'MONTHLY',
            trialEndsAt: null,
            leadPriceCents,
            monthlyFeeCents,
            paymentMethod: 'MANUAL',
            currency: effectivePlan.currency || DEFAULT_PLAN_CURRENCY,
            planConfigId: planConfig.id,
            billingDay: effectivePlan.billingCycleDay || 1,
            associationStatus: associationStatusToStore,
            statusReason: BACKFILL_REASON,
            lastValidatedAt: now,
          },
        } as any);
        summary.billingRowsCreated += 1;
      }
    });
  }

  console.log('Vendor billing backfill summary');
  console.table(summary);

  if (updatedVendorNames.length) {
    console.log(
      `${dryRun ? '[dry-run] ' : ''}vendors requiring updates (${updatedVendorNames.length}): ${updatedVendorNames.join(
        ', '
      )}`
    );
  } else {
    console.log('All vendors already had valid billing associations.');
  }
}

main()
  .catch((error) => {
    if ((error as any)?.code === 'P2022') {
      console.error(
        'Backfill failed because billing-association columns are missing. Run `npx prisma migrate deploy` first.'
      );
    }
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
