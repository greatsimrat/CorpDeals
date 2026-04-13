import prisma from '../lib/prisma';
import { ensureBillingPlanConfig } from '../lib/billing-plan-config';
import { applyVendorSubscriptionPlan } from '../lib/vendor-subscription-plan';

type PlanTier = 'FREE' | 'GOLD' | 'PREMIUM';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const allowProduction = args.has('--allow-production');

const PLAN_PRESETS: Record<
  PlanTier,
  {
    monthlyFee: number;
    includedLeadsPerCycle: number;
    overagePricePerLead: number;
    maxActiveOffers: number;
    description: string;
  }
> = {
  FREE: {
    monthlyFee: 0,
    includedLeadsPerCycle: 10,
    overagePricePerLead: 5,
    maxActiveOffers: 50,
    description: 'Starter plan for vendors testing CorpDeals.',
  },
  GOLD: {
    monthlyFee: 100,
    includedLeadsPerCycle: 20,
    overagePricePerLead: 3,
    maxActiveOffers: 100,
    description: 'Growth plan for vendors actively scaling deal coverage.',
  },
  PREMIUM: {
    monthlyFee: 250,
    includedLeadsPerCycle: 50,
    overagePricePerLead: 2,
    maxActiveOffers: 250,
    description: 'High-volume plan for vendors with broad active catalogs.',
  },
};

const PENDING_REQUEST_DEMOS = [
  {
    companyName: 'Maple Mobile Solutions',
    contactName: 'Priya Nair',
    contactEmail: 'partners@maplemobile.ca',
    businessEmail: 'partnerships@maplemobile.ca',
    website: 'https://www.maplemobile.ca',
    phone: '+16045551011',
    city: 'Vancouver',
    category: 'Telecom',
    plan: 'FREE' as PlanTier,
    additionalInfo: 'Focused on employee telecom bundles and migration support.',
  },
  {
    companyName: 'Pacific Fitness Club',
    contactName: 'Daniel Wong',
    contactEmail: 'partnerships@pacificfitness.ca',
    businessEmail: 'growth@pacificfitness.ca',
    website: 'https://www.pacificfitness.ca',
    phone: '+16045551022',
    city: 'Burnaby',
    category: 'Fitness & Wellness',
    plan: 'GOLD' as PlanTier,
    additionalInfo: 'Corporate wellness memberships for hybrid teams.',
  },
  {
    companyName: 'NorthStar Travel Benefits',
    contactName: 'Amelia Chen',
    contactEmail: 'partnerships@northstartravel.ca',
    businessEmail: 'sales@northstartravel.ca',
    website: 'https://www.northstartravel.ca',
    phone: '+14165551033',
    city: 'Toronto',
    category: 'Travel',
    plan: 'PREMIUM' as PlanTier,
    additionalInfo: 'Flight, stay, and package discounts for verified employees.',
  },
];

const APPROVED_VENDOR_DEMOS = [
  {
    companyName: 'TELUS Partner Offers',
    contactName: 'Morgan Patel',
    contactEmail: 'vendor@telus.com',
    businessEmail: 'partner@telus.com',
    website: 'https://www.telus.com',
    phone: '+16045551111',
    city: 'Vancouver',
    category: 'Telecom',
    plan: 'GOLD' as PlanTier,
    offerTitles: ['TELUS 5G Employee Plan', 'TELUS Home Internet Bundle'],
  },
  {
    companyName: 'RBC Employee Perks',
    contactName: 'Sofia Grant',
    contactEmail: 'vendor@rbc.com',
    businessEmail: 'partnerships@rbc.com',
    website: 'https://www.rbcroyalbank.com',
    phone: '+14165552222',
    city: 'Toronto',
    category: 'Finance & Insurance',
    plan: 'FREE' as PlanTier,
    offerTitles: ['RBC Cashback Employee Card', 'RBC Employee Savings Bundle'],
  },
  {
    companyName: 'Anytime Fitness Corporate',
    contactName: 'Noah Singh',
    contactEmail: 'vendor@anytimefitness.com',
    businessEmail: 'corpdeals@anytimefitness.com',
    website: 'https://www.anytimefitness.com',
    phone: '+16045553333',
    city: 'Calgary',
    category: 'Fitness & Wellness',
    plan: 'PREMIUM' as PlanTier,
    offerTitles: ['Anytime Fitness Unlimited Access', 'Anytime Fitness Family Add-on'],
  },
];

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const now = new Date();
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isRegressionLike = (value: string | null | undefined) => {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) return false;
  return (
    normalized.startsWith('regression') ||
    normalized.includes(' regression ') ||
    normalized.includes('regression-') ||
    normalized.includes('@regression') ||
    normalized.includes('regression@') ||
    normalized.includes('regression.')
  );
};

async function ensurePlanConfig(tx: any, plan: PlanTier) {
  const preset = PLAN_PRESETS[plan];
  return ensureBillingPlanConfig(tx, {
    code: plan,
    name: plan === 'FREE' ? 'Free' : plan === 'GOLD' ? 'Gold' : 'Premium',
    description: preset.description,
    planType: 'SUBSCRIPTION',
    monthlyFee: preset.monthlyFee,
    includedLeadsPerCycle: preset.includedLeadsPerCycle,
    overagePricePerLead: preset.overagePricePerLead,
    maxActiveOffers: preset.maxActiveOffers,
    overageEnabled: true,
    currencyCode: 'CAD',
    isSystemPreset: true,
  });
}

async function ensureDemoUserAndVendor(
  tx: any,
  input: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    businessEmail: string;
    phone: string;
    website: string;
    city: string;
    category: string;
    status: 'PENDING' | 'APPROVED';
  }
) {
  const email = input.contactEmail.trim().toLowerCase();
  let user = await tx.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    user = await tx.user.create({
      data: {
        email,
        name: input.contactName,
        role: 'VENDOR',
        passwordHash: null as any,
      } as any,
      select: { id: true, email: true },
    });
  }

  let vendor = await tx.vendor.findFirst({
    where: {
      OR: [{ userId: user.id }, { email }],
    },
    select: {
      id: true,
      userId: true,
      companyName: true,
      email: true,
      status: true,
    },
  });

  if (!vendor) {
    vendor = await tx.vendor.create({
      data: {
        userId: user.id,
        companyName: input.companyName,
        contactName: input.contactName,
        email,
        businessEmail: input.businessEmail,
        phone: input.phone,
        website: input.website,
        city: input.city,
        businessType: input.category,
        status: input.status,
      },
      select: {
        id: true,
        userId: true,
        companyName: true,
        email: true,
        status: true,
      },
    });
  } else {
    vendor = await tx.vendor.update({
      where: { id: vendor.id },
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        email,
        businessEmail: input.businessEmail,
        phone: input.phone,
        website: input.website,
        city: input.city,
        businessType: input.category,
        status: input.status,
      },
      select: {
        id: true,
        userId: true,
        companyName: true,
        email: true,
        status: true,
      },
    });
  }

  await tx.user.update({
    where: { id: user.id },
    data: { vendorId: vendor.id } as any,
  });

  return { user, vendor };
}

async function main() {
  const runtimeEnv = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  const isProduction = runtimeEnv === 'production' || runtimeEnv === 'prod';
  if (isProduction && !allowProduction) {
    throw new Error(
      'Refusing to run vendor admin demo refresh in production without --allow-production. Use --dry-run first.'
    );
  }

  const regressionCandidates = await prisma.vendor.findMany({
    where: {
      OR: [
        { companyName: { startsWith: 'Regression', mode: 'insensitive' } },
        { companyName: { contains: 'Regression', mode: 'insensitive' } },
        { email: { contains: 'regression', mode: 'insensitive' } },
        { businessEmail: { contains: 'regression', mode: 'insensitive' } },
        { website: { contains: 'regression', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      userId: true,
      companyName: true,
      email: true,
      businessEmail: true,
      website: true,
    },
  });

  console.log(`Found ${regressionCandidates.length} regression-like vendors to clean.`);
  if (regressionCandidates.length > 0) {
    for (const candidate of regressionCandidates) {
      console.log(` - ${candidate.companyName} (${candidate.email})`);
    }
  }

  if (!dryRun && regressionCandidates.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const candidate of regressionCandidates) {
        await tx.vendor.delete({ where: { id: candidate.id } });
        const shouldDemoteUser =
          isRegressionLike(candidate.email) || isRegressionLike(candidate.businessEmail) || isRegressionLike(candidate.website);
        if (shouldDemoteUser) {
          await tx.user.updateMany({
            where: { id: candidate.userId },
            data: { vendorId: null, role: 'USER' } as any,
          });
        } else {
          await tx.user.updateMany({
            where: { id: candidate.userId },
            data: { vendorId: null } as any,
          });
        }
      }
    });
  }

  if (dryRun) {
    console.log('Dry run enabled. No data mutations were applied.');
    return;
  }

  const parentCategories = await prisma.category.findMany({
    where: { parentId: null },
    select: { id: true, name: true, active: true },
    orderBy: { name: 'asc' },
  });
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 20,
  });
  if (!parentCategories.length || !companies.length) {
    throw new Error('Cannot seed vendor admin demo data without categories and companies.');
  }

  const categoryByName = new Map(parentCategories.map((item) => [item.name.toLowerCase(), item]));
  const pickCategoryId = (hint: string) => {
    const normalizedHint = hint.toLowerCase();
    const direct =
      categoryByName.get(normalizedHint) ||
      parentCategories.find((category) => normalizedHint.includes(category.name.toLowerCase()));
    return (direct || parentCategories[0]).id;
  };

  await prisma.$transaction(async (tx) => {
    const planConfigByTier = new Map<PlanTier, { id: string; code: string; name: string }>();
    for (const tier of ['FREE', 'GOLD', 'PREMIUM'] as PlanTier[]) {
      const config = await ensurePlanConfig(tx, tier);
      planConfigByTier.set(tier, config);
    }

    for (const requestDemo of PENDING_REQUEST_DEMOS) {
      const { vendor } = await ensureDemoUserAndVendor(tx, {
        ...requestDemo,
        status: 'PENDING',
      });
      const planConfig = planConfigByTier.get(requestDemo.plan)!;

      const existingPending = await tx.vendorRequest.findFirst({
        where: { vendorId: vendor.id, status: 'PENDING' },
        select: { id: true },
      });
      if (existingPending) {
        await tx.vendorRequest.update({
          where: { id: existingPending.id },
          data: {
            selectedPlanConfigId: planConfig.id,
            selectedPlanCode: requestDemo.plan,
            businessType: requestDemo.category,
            additionalInfo: requestDemo.additionalInfo,
            status: 'PENDING',
            reviewedById: null,
            reviewedAt: null,
            reviewNotes: null,
          },
        });
      } else {
        await tx.vendorRequest.create({
          data: {
            vendorId: vendor.id,
            selectedPlanConfigId: planConfig.id,
            selectedPlanCode: requestDemo.plan,
            businessType: requestDemo.category,
            additionalInfo: requestDemo.additionalInfo,
            status: 'PENDING',
          },
        });
      }
    }

    for (const approvedDemo of APPROVED_VENDOR_DEMOS) {
      const { vendor } = await ensureDemoUserAndVendor(tx, {
        ...approvedDemo,
        status: 'APPROVED',
      });
      const planConfig = planConfigByTier.get(approvedDemo.plan)!;

      const existingApprovedRequest = await tx.vendorRequest.findFirst({
        where: { vendorId: vendor.id, status: 'APPROVED' },
        select: { id: true },
      });
      if (existingApprovedRequest) {
        await tx.vendorRequest.update({
          where: { id: existingApprovedRequest.id },
          data: {
            selectedPlanConfigId: planConfig.id,
            selectedPlanCode: approvedDemo.plan,
            businessType: approvedDemo.category,
            status: 'APPROVED',
            reviewedAt: now,
            reviewNotes: 'Approved demo vendor for admin workflow validation.',
          },
        });
      } else {
        await tx.vendorRequest.create({
          data: {
            vendorId: vendor.id,
            selectedPlanConfigId: planConfig.id,
            selectedPlanCode: approvedDemo.plan,
            businessType: approvedDemo.category,
            additionalInfo: 'Created by demo refresh script.',
            status: 'APPROVED',
            reviewedAt: now,
            reviewNotes: 'Approved demo vendor for admin workflow validation.',
          },
        });
      }

      await applyVendorSubscriptionPlan(tx, {
        vendorId: vendor.id,
        planTier: approvedDemo.plan,
        associationStatus: approvedDemo.plan === 'FREE' ? 'FREE' : 'ACTIVE',
        statusReason: 'vendor-admin-demo-seed',
      });

      const categoryId = pickCategoryId(approvedDemo.category);
      const assignedCompanies = companies.slice(0, 2);

      for (let index = 0; index < approvedDemo.offerTitles.length; index += 1) {
        const title = approvedDemo.offerTitles[index];
        const company = assignedCompanies[index % assignedCompanies.length];
        const slug = `${toSlug(approvedDemo.companyName)}-${toSlug(title)}-${index + 1}`;

        const offer = await tx.offer.upsert({
          where: { slug },
          update: {
            vendorId: vendor.id,
            companyId: company.id,
            categoryId,
            title,
            description: `${approvedDemo.companyName} exclusive employee offer for ${company.name}.`,
            discountType: 'PERCENTAGE',
            discountValue: index === 0 ? '20' : '15',
            offerState: 'APPROVED',
            offerStatus: 'LIVE',
            complianceStatus: 'APPROVED',
            active: true,
            termsUrl: 'https://corpdeals.ca/terms-of-service',
            cancellationPolicyUrl: 'https://corpdeals.ca/cookie-policy',
            image: '/images/corpdeals-default-offer.png',
            expiryDate: addDays(now, 365),
          },
          create: {
            slug,
            vendorId: vendor.id,
            companyId: company.id,
            categoryId,
            offerType: 'lead',
            offerState: 'APPROVED',
            offerStatus: 'LIVE',
            coverageType: 'COMPANY_WIDE',
            detailTemplateType: 'GENERIC',
            title,
            description: `${approvedDemo.companyName} exclusive employee offer for ${company.name}.`,
            discountType: 'PERCENTAGE',
            discountValue: index === 0 ? '20' : '15',
            active: true,
            complianceStatus: 'APPROVED',
            termsUrl: 'https://corpdeals.ca/terms-of-service',
            cancellationPolicyUrl: 'https://corpdeals.ca/cookie-policy',
            image: '/images/corpdeals-default-offer.png',
            expiryDate: addDays(now, 365),
          } as any,
          select: { id: true, companyId: true },
        });

        await tx.lead.deleteMany({
          where: {
            offerId: offer.id,
            email: { contains: '@corpdeals-demo.local' },
          },
        });

        const leadRows = [1, 2, 3].map((offset) => ({
          offerId: offer.id,
          companyId: offer.companyId,
          vendorId: vendor.id,
          consent: true,
          consentAt: now,
          termsAccepted: true,
          termsAcceptedAt: now,
          firstName: `Demo${offset}`,
          lastName: 'Employee',
          email: `${toSlug(approvedDemo.companyName)}.${index + 1}.${offset}@corpdeals-demo.local`,
          phone: `+1604555${String(index + 1).padStart(2, '0')}${String(offset).padStart(2, '0')}`,
          status: 'NEW',
          message: 'Demo lead generated for admin vendor workflow verification.',
        }));
        await tx.lead.createMany({ data: leadRows as any });
      }
    }
  });

  const [pendingCount, approvedCount] = await Promise.all([
    prisma.vendorRequest.count({ where: { status: 'PENDING' } }),
    prisma.vendor.count({ where: { status: 'APPROVED' } }),
  ]);

  console.log('Vendor admin demo refresh completed.');
  console.log(`Pending requests: ${pendingCount}`);
  console.log(`Approved vendors: ${approvedCount}`);
}

main()
  .catch((error) => {
    console.error('Vendor admin demo refresh failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
