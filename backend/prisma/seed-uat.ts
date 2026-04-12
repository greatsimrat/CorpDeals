import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { WARM_COMPANY_CATALOG } from './company-warm-catalog';
import {
  ROOT_CATEGORY_TAXONOMY,
  SUBCATEGORY_TAXONOMY,
  upsertCategoryTaxonomy,
} from './category-taxonomy';
import { ensureBillingPlanConfig } from '../src/lib/billing-plan-config';
import { APP_ROLES, normalizeRole } from '../src/lib/roles';
import { upsertGlobalRoleAssignment } from '../src/lib/rbac';

const prisma = new PrismaClient();

const mergeUniqueCompanies = <T extends { slug: string }>(preferred: T[], additions: T[]) => {
  const seen = new Set(preferred.map((company) => company.slug));
  return preferred.concat(additions.filter((company) => !seen.has(company.slug)));
};

const RBAC_PERMISSION_SEED = [
  { id: 'perm-admin-full-access', code: 'admin.full_access', name: 'Admin Full Access' },
  { id: 'perm-users-role-manage', code: 'users.role.manage', name: 'Manage User Roles' },
  { id: 'perm-vendors-approval-manage', code: 'vendors.approval.manage', name: 'Manage Vendor Approval' },
  { id: 'perm-offers-approval-manage', code: 'offers.approval.manage', name: 'Manage Offer Approval' },
  { id: 'perm-companies-requests-manage', code: 'companies.requests.manage', name: 'Manage Company Requests' },
  { id: 'perm-finance-billing-manage', code: 'finance.billing.manage', name: 'Manage Billing' },
  { id: 'perm-finance-invoices-manage', code: 'finance.invoices.manage', name: 'Manage Invoices' },
  { id: 'perm-sales-pipeline-manage', code: 'sales.pipeline.manage', name: 'Manage Sales Pipeline' },
  { id: 'perm-vendor-portal-access', code: 'vendor.portal.access', name: 'Vendor Portal Access' },
  { id: 'perm-employee-portal-access', code: 'employee.portal.access', name: 'Employee Portal Access' },
] as const;

const RBAC_ROLE_PERMISSION_SEED: Record<(typeof APP_ROLES)[number], string[]> = {
  ADMIN: RBAC_PERMISSION_SEED.map((permission) => permission.code),
  FINANCE: ['finance.billing.manage', 'finance.invoices.manage'],
  SALES: ['sales.pipeline.manage', 'companies.requests.manage'],
  VENDOR: ['vendor.portal.access'],
  USER: ['employee.portal.access'],
};

async function seedRbacDefaults() {
  const permissionByCode = new Map<string, string>();
  for (const permission of RBAC_PERMISSION_SEED) {
    const saved = await (prisma as any).permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        isActive: true,
      },
      create: {
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.name,
        isActive: true,
      },
      select: { id: true, code: true },
    });
    permissionByCode.set(saved.code, saved.id);
  }

  for (const role of APP_ROLES) {
    const codes = RBAC_ROLE_PERMISSION_SEED[role] || [];
    for (const code of codes) {
      const permissionId = permissionByCode.get(code);
      if (!permissionId) continue;
      const updated = await (prisma as any).rolePermission.updateMany({
        where: { role, permissionId },
        data: { isActive: true },
      });
      if (updated.count === 0) {
        await (prisma as any).rolePermission.create({
          data: {
            id: `roleperm-${role.toLowerCase()}-${permissionId.slice(-12)}`,
            role,
            permissionId,
            isActive: true,
          },
        });
      }
    }
  }

  const users = await prisma.user.findMany({
    select: { id: true, role: true, createdAt: true },
  });
  for (const user of users) {
    await upsertGlobalRoleAssignment(prisma as any, {
      userId: user.id,
      role: normalizeRole(user.role),
      scopeType: 'GLOBAL',
      startsAt: user.createdAt,
      grantReason: 'seed-role-sync',
    });
  }
}

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const seedConfirmed = (process.env.CONFIRM_UAT_SEED || '').toLowerCase() === 'yes';

const APPLICATION_PRIVACY_NOTICE = `CorpDeals uses application details only to verify eligibility, route your request to the selected vendor, maintain consent and audit records, and comply with legal obligations.
We do not sell your data or use your application details for unrelated marketing.`;

const DEFAULT_OFFER_TERMS_TEMPLATE = `This offer is available to verified employees only.
Offer details, pricing, and availability may change without notice.
Proof of employment and identity may be required at redemption.
The offer may not be combined with other promotions unless stated otherwise.
Additional vendor-specific conditions may apply.
${APPLICATION_PRIVACY_NOTICE}`;

const DEFAULT_CANCELLATION_TEMPLATE = `Cancellation and refund eligibility is determined by the vendor.
Requests must be submitted through the vendor's published support channels.
Processing timelines may vary by payment method and product category.
Non-refundable fees or partially used services may be excluded where legally permitted.`;

type OfferHighlight = { label: string; value: string };
type OfferDetailItem = { label?: string; value: string };
type OfferDetailSectionSeed = {
  type: string;
  title: string;
  items: OfferDetailItem[];
};

type UatOfferSeed = {
  id: string;
  slug: string;
  vendorKey: string;
  companySlug: string;
  categorySlug: string;
  title: string;
  description: string;
  discountValue: string;
  discountType: 'FIXED' | 'PERCENTAGE' | 'SPECIAL';
  featured: boolean;
  location: string;
  coverageType: 'COMPANY_WIDE' | 'PROVINCE_SPECIFIC' | 'CITY_SPECIFIC';
  provinceCode: string | null;
  cityName: string | null;
  productName: string;
  productModel: string;
  originalPrice?: string | null;
  discountedPrice?: string | null;
  image?: string | null;
  termsUrl?: string | null;
  cancellationPolicyUrl?: string | null;
  termsText: string;
  cancellationPolicyText: string;
  restrictionsText?: string | null;
  redemptionInstructionsText?: string | null;
  howToClaim?: string[];
  highlights?: OfferHighlight[];
  detailSections?: OfferDetailSectionSeed[];
  rating?: number;
  reviewCount?: number;
};

const roleUsers = [
  { email: 'admin@corpdeals.io', name: 'Admin User', role: 'ADMIN', password: 'admin123' },
  { email: 'sales@corpdeals.io', name: 'Sales User', role: 'SALES', password: 'sales123' },
  { email: 'finance@corpdeals.io', name: 'Finance User', role: 'FINANCE', password: 'finance123' },
];

const rootCategories = ROOT_CATEGORY_TAXONOMY;
const subcategories = SUBCATEGORY_TAXONOMY;

const companies = mergeUniqueCompanies([
  {
    slug: 'amazon',
    name: 'Amazon',
    domain: 'amazon.com',
    allowedDomains: ['amazon.com'],
    headquarters: 'Seattle, WA',
    employeeCount: '1.5M+',
    verified: true,
    brandColor: '#FF9900',
    description: 'Global technology and operations employer with distributed teams across Canada.',
  },
  {
    slug: 'microsoft',
    name: 'Microsoft',
    domain: 'microsoft.com',
    allowedDomains: ['microsoft.com'],
    headquarters: 'Redmond, WA',
    employeeCount: '220K+',
    verified: true,
    brandColor: '#00A4EF',
    description: 'Enterprise software and cloud employer used for UAT travel and banking scenarios.',
  },
  {
    slug: 'google',
    name: 'Google',
    domain: 'google.com',
    allowedDomains: ['google.com', 'alphabet.com'],
    headquarters: 'Mountain View, CA',
    employeeCount: '190K+',
    verified: true,
    brandColor: '#4285F4',
    description: 'Technology employer used for automotive and wireless benefits testing.',
  },
  {
    slug: 'apple',
    name: 'Apple',
    domain: 'apple.com',
    allowedDomains: ['apple.com'],
    headquarters: 'Cupertino, CA',
    employeeCount: '160K+',
    verified: true,
    brandColor: '#555555',
    description: 'Consumer technology employer used for device and telecom benefit demos.',
  },
  {
    slug: 'lululemon',
    name: 'Lululemon',
    domain: 'lululemon.com',
    allowedDomains: ['lululemon.com'],
    headquarters: 'Vancouver, BC',
    employeeCount: '38K+',
    verified: true,
    brandColor: '#D31334',
    description: 'Retail and wellness employer used for Vancouver location-specific demos.',
  },
], WARM_COMPANY_CATALOG);

const vendors = [
  {
    key: 'rbc',
    email: 'uat-rbc-vendor@corpdeals.ca',
    password: 'vendor123',
    userName: 'RBC Partnerships',
    companyName: 'RBC',
    contactName: 'RBC Partnerships',
    website: 'https://www.rbcroyalbank.com',
    businessType: 'Banking & Finance',
    description: 'Banking vendor for UAT employee benefits demos.',
    city: 'Toronto',
  },
  {
    key: 'telus',
    email: 'uat-telus-vendor@corpdeals.ca',
    password: 'vendor123',
    userName: 'TELUS Partnerships',
    companyName: 'TELUS',
    contactName: 'TELUS Partnerships',
    website: 'https://www.telus.com',
    businessType: 'Telecom',
    description: 'Telecom vendor for mobility and broadband demo offers.',
    city: 'Vancouver',
  },
  {
    key: 'marriott',
    email: 'uat-marriott-vendor@corpdeals.ca',
    password: 'vendor123',
    userName: 'Marriott Partnerships',
    companyName: 'Marriott Bonvoy',
    contactName: 'Marriott Partnerships',
    website: 'https://www.marriott.com',
    businessType: 'Travel',
    description: 'Travel vendor for hotel and corporate rate offers.',
    city: 'Seattle',
  },
  {
    key: 'ford',
    email: 'uat-ford-vendor@corpdeals.ca',
    password: 'vendor123',
    userName: 'Ford Partnerships',
    companyName: 'Ford Canada',
    contactName: 'Ford Partnerships',
    website: 'https://www.ford.ca',
    businessType: 'Automotive',
    description: 'Automotive vendor for employee pricing demos.',
    city: 'Oakville',
  },
  {
    key: 'adobe',
    email: 'uat-adobe-vendor@corpdeals.ca',
    password: 'vendor123',
    userName: 'Adobe Partnerships',
    companyName: 'Adobe',
    contactName: 'Adobe Partnerships',
    website: 'https://www.adobe.com',
    businessType: 'Technology',
    description: 'Software vendor for productivity and creative suite demos.',
    city: 'Toronto',
  },
  {
    key: 'equinox',
    email: 'uat-equinox-vendor@corpdeals.ca',
    password: 'vendor123',
    userName: 'Equinox Partnerships',
    companyName: 'Equinox',
    contactName: 'Equinox Partnerships',
    website: 'https://www.equinox.com',
    businessType: 'Wellness',
    description: 'Fitness vendor for membership benefit demos.',
    city: 'Vancouver',
  },
];

const UAT_BILLING_PRESETS = {
  FREE: {
    code: 'FREE',
    name: 'Free',
    planType: 'SUBSCRIPTION',
    monthlyFee: '0.00',
    pricePerLead: null,
    includedLeadsPerMonth: 10,
    overagePricePerLead: '5.00',
    offerLimit: 50,
    currency: 'CAD',
    durationDays: 365,
  },
  GOLD: {
    code: 'GOLD',
    name: 'Gold',
    planType: 'SUBSCRIPTION',
    monthlyFee: '100.00',
    pricePerLead: null,
    includedLeadsPerMonth: 20,
    overagePricePerLead: '3.00',
    offerLimit: 100,
    currency: 'CAD',
    durationDays: 365,
  },
  PREMIUM: {
    code: 'PREMIUM',
    name: 'Premium',
    planType: 'SUBSCRIPTION',
    monthlyFee: '250.00',
    pricePerLead: null,
    includedLeadsPerMonth: 50,
    overagePricePerLead: '2.00',
    offerLimit: 250,
    currency: 'CAD',
    durationDays: 365,
  },
  PAY_PER_LEAD: {
    code: 'PAY_PER_LEAD',
    name: 'Pay Per Lead',
    planType: 'PAY_PER_LEAD',
    monthlyFee: null,
    pricePerLead: '12.50',
    includedLeadsPerMonth: null,
    overagePricePerLead: null,
    offerLimit: 25,
    currency: 'CAD',
    durationDays: 365,
  },
} as const;

const UAT_VENDOR_PLAN_BY_KEY: Record<string, keyof typeof UAT_BILLING_PRESETS> = {
  rbc: 'GOLD',
  telus: 'PREMIUM',
  marriott: 'GOLD',
  ford: 'GOLD',
  adobe: 'PREMIUM',
  equinox: 'FREE',
};

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
};

const employeeUsers = [
  { email: 'qa.amazon.employee@amazon.com', name: 'Amazon Vancouver Employee', companySlug: 'amazon', provinceCode: 'BC', cityName: 'Vancouver' },
  { email: 'qa.amazon.toronto@amazon.com', name: 'Amazon Toronto Employee', companySlug: 'amazon', provinceCode: 'ON', cityName: 'Toronto' },
  { email: 'qa.microsoft.vancouver@microsoft.com', name: 'Microsoft Vancouver Employee', companySlug: 'microsoft', provinceCode: 'BC', cityName: 'Vancouver' },
  { email: 'qa.microsoft.toronto@microsoft.com', name: 'Microsoft Toronto Employee', companySlug: 'microsoft', provinceCode: 'ON', cityName: 'Toronto' },
  { email: 'qa.microsoft.nolocation@microsoft.com', name: 'Microsoft No Location Employee', companySlug: 'microsoft', provinceCode: null, cityName: null },
  { email: 'qa.google.employee@google.com', name: 'Google Toronto Employee', companySlug: 'google', provinceCode: 'ON', cityName: 'Toronto' },
  { email: 'qa.apple.employee@apple.com', name: 'Apple Vancouver Employee', companySlug: 'apple', provinceCode: 'BC', cityName: 'Vancouver' },
  { email: 'qa.lululemon.employee@lululemon.com', name: 'Lululemon Vancouver Employee', companySlug: 'lululemon', provinceCode: 'BC', cityName: 'Vancouver' },
];

const offers: UatOfferSeed[] = [
  {
    id: 'uat-amazon-rbc-banking-company-wide',
    slug: 'uat-amazon-rbc-banking-company-wide',
    vendorKey: 'rbc',
    companySlug: 'amazon',
    categorySlug: 'personal-banking',
    title: 'RBC Preferred Banking for Amazon Employees',
    description: 'Preferred chequing account bundle with employee-only onboarding support and a welcome bonus.',
    discountValue: '$300 bonus',
    discountType: 'FIXED',
    featured: true,
    location: 'Canada',
    coverageType: 'COMPANY_WIDE',
    provinceCode: null,
    cityName: null,
    productName: 'Preferred Banking Bundle',
    productModel: 'Everyday Banking',
    originalPrice: '$29.95/mo',
    discountedPrice: '$0 for 12 months',
    termsUrl: 'https://www.rbcroyalbank.com/accounts/index.html',
    cancellationPolicyUrl: 'https://www.rbcroyalbank.com/customer-service/',
    termsText: `Available to verified Amazon employees in good standing.
Offer includes one eligible RBC chequing package opened through the employee program.
Payroll deposit and two qualifying bill payments must be completed within 90 days to receive the welcome bonus.
Standard account fees apply after the promotional waiver period unless minimum balance requirements are met.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Applications may be withdrawn any time before account opening.
If the account is opened, normal RBC account closure rules and any product-specific fee disclosures apply.
Welcome bonuses may be reversed if the account is closed or becomes ineligible during the promotional review window.
Questions about account closure, fee reversals, or bonus eligibility must be handled through RBC support channels.`,
    restrictionsText:
      'Not available to existing RBC primary chequing clients opened within the vendor-defined lookback period. Limited to one employee package per verified user.',
    redemptionInstructionsText:
      'Submit your request through CorpDeals, complete the vendor callback, and finalize onboarding using the employee program instructions provided by RBC.',
    howToClaim: [
      'Confirm your Amazon employee status inside CorpDeals.',
      'Submit the application form and wait for an RBC advisor to contact you.',
      'Complete account opening and payroll setup using the employee offer instructions.',
    ],
    highlights: [
      { label: 'Bonus', value: '$300 after qualifying activity' },
      { label: 'Advisor', value: 'Dedicated employee banking support' },
      { label: 'Fee waiver', value: 'Monthly fee waived for the first year' },
      { label: 'Data use', value: 'Shared only for vendor follow-up and compliance' },
    ],
    detailSections: [
      {
        type: 'pricing',
        title: 'Pricing overview',
        items: [
          { label: 'Regular price', value: '$29.95/mo' },
          { label: 'Employee price', value: '$0 for 12 months' },
          { label: 'Welcome bonus', value: '$300 after payroll and qualifying bill payments' },
        ],
      },
      {
        type: 'included_items',
        title: 'What is included',
        items: [
          { value: 'Unlimited everyday transactions on the eligible bundle' },
          { value: 'Employee onboarding support from an RBC advisor' },
          { value: 'Access to add-on savings and credit review options' },
        ],
      },
    ],
    rating: 4.8,
    reviewCount: 146,
  },
  {
    id: 'uat-amazon-telus-mobile-bc',
    slug: 'uat-amazon-telus-mobile-bc',
    vendorKey: 'telus',
    companySlug: 'amazon',
    categorySlug: 'mobile-plans',
    title: 'TELUS Mobile Savings for Amazon BC Employees',
    description: 'Wireless savings for Amazon employees based in British Columbia.',
    discountValue: '25% off',
    discountType: 'PERCENTAGE',
    featured: true,
    location: 'BC',
    coverageType: 'PROVINCE_SPECIFIC',
    provinceCode: 'BC',
    cityName: null,
    productName: 'Employee Mobility Plan',
    productModel: '5G Premium',
    originalPrice: '$85/mo',
    discountedPrice: '$63.75/mo',
    termsUrl: 'https://www.telus.com/en/about/terms-and-conditions',
    cancellationPolicyUrl: 'https://www.telus.com/en/support/article/returns-and-exchanges-policy',
    termsText: `Available to verified Amazon employees whose active profile location is British Columbia.
Discount applies to select premium mobility plans and cannot be combined with consumer flash-sale pricing.
Device financing, taxes, roaming, and add-on services are billed separately.
Proof of ongoing employment may be requested when activating or renewing the plan.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Plan cancellations are handled by TELUS under the applicable wireless service agreement.
Device financing balances, early cancellation charges, and non-refundable setup fees may still apply.
Any approved device return must follow the TELUS return window and product condition requirements.`,
    restrictionsText:
      'Coverage is limited to BC-based employee profiles in CorpDeals. Family line eligibility and device inventory vary by account type and service location.',
    redemptionInstructionsText:
      'After submission, a TELUS specialist will confirm your BC eligibility and present the qualifying mobility plan options.',
    howToClaim: [
      'Verify that your CorpDeals profile location is set to BC.',
      'Submit your contact details through the deal page.',
      'Complete plan selection with the TELUS employee mobility team.',
    ],
    highlights: [
      { label: 'Savings', value: '25% off select premium plans' },
      { label: 'Region', value: 'British Columbia employee profiles only' },
      { label: 'Bundle options', value: 'Mobile plus device financing available' },
      { label: 'Privacy', value: 'No unrelated marketing use by CorpDeals' },
    ],
    rating: 4.6,
    reviewCount: 89,
  },
  {
    id: 'uat-microsoft-marriott-toronto',
    slug: 'uat-microsoft-marriott-toronto',
    vendorKey: 'marriott',
    companySlug: 'microsoft',
    categorySlug: 'hotels-stays',
    title: 'Marriott Toronto Travel Rate for Microsoft',
    description: 'Corporate hotel savings for Microsoft employees working in Toronto.',
    discountValue: '20% off',
    discountType: 'PERCENTAGE',
    featured: true,
    location: 'Toronto, ON',
    coverageType: 'CITY_SPECIFIC',
    provinceCode: 'ON',
    cityName: 'Toronto',
    productName: 'Corporate Travel Rate',
    productModel: 'Toronto Stays',
    originalPrice: '$329/night',
    discountedPrice: 'From $263/night',
    termsUrl: 'https://www.marriott.com/about/terms-of-use.mi',
    cancellationPolicyUrl: 'https://www.marriott.com/help/cancellation.mi',
    termsText: `Available to verified Microsoft employees whose active CorpDeals profile location is Toronto, Ontario.
Rates are subject to hotel inventory, blackout dates, and participating property rules.
Employee identification may be requested at check-in and the booking must remain in the verified employee's name.
Incidental charges, parking, taxes, and destination fees are excluded unless stated otherwise.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Most rates can be cancelled up to 48 hours before check-in, but individual properties may enforce stricter deadlines.
Advance purchase, event, or negotiated inventory may be non-refundable once booked.
Refund timing is controlled by Marriott and the original payment provider.`,
    restrictionsText:
      'Valid only for eligible Toronto-area stays booked through the corporate travel path shared after vendor follow-up. Not for group blocks or third-party travel agents.',
    redemptionInstructionsText:
      'Use the Marriott link or code provided after vendor confirmation to complete the final reservation in your own name.',
    howToClaim: [
      'Submit the request through CorpDeals using your verified Microsoft account.',
      'Wait for the Marriott team to send the approved booking path.',
      'Complete the reservation and bring company ID if requested at check-in.',
    ],
    highlights: [
      { label: 'Rate', value: 'From $263/night in Toronto' },
      { label: 'Best for', value: 'Business travel and short stays' },
      { label: 'Area', value: 'Toronto employee profiles only' },
      { label: 'Policy', value: 'Separate cancellation terms shown on-page' },
    ],
    detailSections: [
      {
        type: 'pricing',
        title: 'Typical rate structure',
        items: [
          { label: 'Public rate', value: 'Approx. $329/night' },
          { label: 'Employee rate', value: 'From $263/night before taxes' },
        ],
      },
      {
        type: 'booking_rules',
        title: 'Booking rules',
        items: [
          { value: 'Rates vary by property, dates, and inventory.' },
          { value: 'Employee name must match the reservation and any check-in verification.' },
          { value: 'Blackout dates and convention periods may be excluded.' },
        ],
      },
    ],
    rating: 4.7,
    reviewCount: 63,
  },
  {
    id: 'uat-microsoft-adobe-company-wide',
    slug: 'uat-microsoft-adobe-company-wide',
    vendorKey: 'adobe',
    companySlug: 'microsoft',
    categorySlug: 'software-productivity',
    title: 'Adobe Creative Cloud for Microsoft Employees',
    description: 'Creative Cloud savings for verified Microsoft employees across all locations.',
    discountValue: '35% off',
    discountType: 'PERCENTAGE',
    featured: false,
    location: 'All locations',
    coverageType: 'COMPANY_WIDE',
    provinceCode: null,
    cityName: null,
    productName: 'Creative Cloud',
    productModel: 'All Apps',
    originalPrice: '$89.99/mo',
    discountedPrice: '$58.49/mo',
    termsUrl: 'https://www.adobe.com/legal/terms.html',
    cancellationPolicyUrl: 'https://helpx.adobe.com/manage-account/using/cancel-subscription.html',
    termsText: `Available to verified Microsoft employees across eligible geographies supported by the vendor program.
Discount applies to the qualifying Creative Cloud All Apps plan and is subject to Adobe account eligibility.
Feature availability, AI credits, and cloud storage entitlements may change under Adobe service terms.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Subscription cancellations follow the Adobe subscription agreement in effect at the time of purchase.
Monthly plans typically remain active through the current billing period, while annual commitments may include an early termination fee.
Refunds, if available, are processed by Adobe according to the original payment method.`,
    restrictionsText:
      'Not stackable with education, enterprise site license, or reseller-exclusive pricing. Offer availability may vary by country billing profile.',
    redemptionInstructionsText:
      'Complete the employee verification form, then activate the qualifying plan using the Adobe link provided by the partner team.',
    howToClaim: [
      'Verify eligibility through CorpDeals.',
      'Receive the Adobe employee enrollment link.',
      'Sign in or create your Adobe account and activate the discounted subscription.',
    ],
    highlights: [
      { label: 'Savings', value: '35% off Creative Cloud All Apps' },
      { label: 'Plan', value: 'Individual employee subscription' },
      { label: 'Access', value: 'Available across qualifying Microsoft locations' },
      { label: 'Privacy', value: 'Used only for application routing and legal compliance' },
    ],
    rating: 4.7,
    reviewCount: 118,
  },
  {
    id: 'uat-google-ford-ontario',
    slug: 'uat-google-ford-ontario',
    vendorKey: 'ford',
    companySlug: 'google',
    categorySlug: 'automotive',
    title: 'Ford Employee Pricing for Google Ontario Teams',
    description: 'Preferred vehicle pricing for Google employees based in Ontario.',
    discountValue: '$1,500 off',
    discountType: 'FIXED',
    featured: true,
    location: 'ON',
    coverageType: 'PROVINCE_SPECIFIC',
    provinceCode: 'ON',
    cityName: null,
    productName: 'Employee Pricing',
    productModel: 'Purchase and Lease',
    originalPrice: 'MSRP pricing',
    discountedPrice: 'Up to $1,500 off',
    termsUrl: 'https://www.ford.ca/help/terms/',
    cancellationPolicyUrl: 'https://www.ford.ca/help/',
    termsText: `Available to verified Google employees whose active profile location is Ontario.
Employee pricing applies to participating Ford vehicles and may vary by model year, trim, dealer inventory, and financing approval.
Trade-in values, registration, freight, taxes, and dealer-installed options are excluded from the stated savings.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Vehicle orders or dealer holds may require a refundable or partially refundable deposit depending on the dealership.
Once a final purchase or lease contract is executed, cancellation rights are determined by the dealer agreement and applicable law.
Any refund timelines are handled by the dealer or financing provider.`,
    restrictionsText:
      'Ontario employee profiles only. Commercial fleet sales, auction inventory, and certain limited-production vehicles are excluded.',
    redemptionInstructionsText:
      'After submitting the application, a Ford partner representative will connect you with a participating Ontario dealer and pricing certificate.',
    howToClaim: [
      'Submit the CorpDeals application with your verified Google profile.',
      'Review eligible inventory and pricing with the Ford partner desk.',
      'Complete the purchase or lease through a participating Ontario dealer.',
    ],
    rating: 4.5,
    reviewCount: 54,
  },
  {
    id: 'uat-apple-telus-broadband',
    slug: 'uat-apple-telus-broadband',
    vendorKey: 'telus',
    companySlug: 'apple',
    categorySlug: 'broadband-internet',
    title: 'TELUS Home Internet for Apple Employees',
    description: 'Home internet savings with employee pricing and simplified installation support.',
    discountValue: '$25/mo off',
    discountType: 'FIXED',
    featured: false,
    location: 'Canada',
    coverageType: 'COMPANY_WIDE',
    provinceCode: null,
    cityName: null,
    productName: 'Fibre Internet',
    productModel: 'Gigabit Plan',
    originalPrice: '$110/mo',
    discountedPrice: '$85/mo',
    termsUrl: 'https://www.telus.com/en/about/terms-and-conditions',
    cancellationPolicyUrl: 'https://www.telus.com/en/support/article/returns-and-exchanges-policy',
    termsText: `Available to verified Apple employees where qualifying TELUS home internet service is available.
Installation dates, modem inventory, and service speed depend on the service address.
The advertised rate excludes taxes, equipment damage charges, and optional add-ons not included in the employee plan.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Order changes or cancellations before installation are generally handled without penalty.
If service is activated, cancellation rights, return windows for supplied hardware, and any fixed-term charges follow TELUS residential service terms.
Refunds for prepaid charges, where available, are processed by TELUS.`,
    restrictionsText:
      'Offer depends on address eligibility and participating plan availability. Some rural or third-party network locations may not qualify.',
    redemptionInstructionsText:
      'After you apply, TELUS will confirm serviceability for your address and complete plan setup directly.',
    rating: 4.4,
    reviewCount: 72,
  },
  {
    id: 'uat-lululemon-equinox-vancouver',
    slug: 'uat-lululemon-equinox-vancouver',
    vendorKey: 'equinox',
    companySlug: 'lululemon',
    categorySlug: 'fitness-memberships',
    title: 'Equinox Membership for Lululemon Vancouver',
    description: 'Premium fitness membership savings for Lululemon employees based in Vancouver.',
    discountValue: '18% off',
    discountType: 'PERCENTAGE',
    featured: true,
    location: 'Vancouver, BC',
    coverageType: 'CITY_SPECIFIC',
    provinceCode: 'BC',
    cityName: 'Vancouver',
    productName: 'Fitness Membership',
    productModel: 'All Access',
    originalPrice: '$285/mo',
    discountedPrice: '$233.70/mo',
    termsUrl: 'https://www.equinox.com/legal/terms',
    cancellationPolicyUrl: 'https://www.equinox.com/terms',
    termsText: `Available to verified Lululemon employees whose active CorpDeals profile location is Vancouver, BC.
The discounted membership is valid for participating clubs and eligible membership tiers defined by the vendor program.
Guest privileges, premium classes, spa services, retail, and taxes may be billed separately.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Membership cancellation rules are governed by the membership agreement presented during final enrollment.
Any notice periods, joining fees, or minimum commitment terms apply according to the club contract and local law.
Refunds for prepaid services are handled by Equinox under the signed agreement.`,
    restrictionsText:
      'City-specific coverage applies. Membership availability may be capped by club capacity and certain premium club access tiers may be excluded.',
    redemptionInstructionsText:
      'Complete the CorpDeals application, confirm eligibility with the Equinox team, and finalize membership at the participating Vancouver club.',
    rating: 4.8,
    reviewCount: 37,
  },
  {
    id: 'uat-amazon-rbc-credit-card',
    slug: 'uat-amazon-rbc-credit-card',
    vendorKey: 'rbc',
    companySlug: 'amazon',
    categorySlug: 'credit-cards',
    title: 'RBC Cashback Card for Amazon Employees',
    description: 'Employee cashback credit card with enhanced grocery and transit earn rates.',
    discountValue: '$200 bonus',
    discountType: 'FIXED',
    featured: false,
    location: 'Canada',
    coverageType: 'COMPANY_WIDE',
    provinceCode: null,
    cityName: null,
    productName: 'Cashback Credit Card',
    productModel: 'Employee Rewards',
    originalPrice: '$120 annual fee',
    discountedPrice: '$0 annual fee in year one',
    termsUrl: 'https://www.rbcroyalbank.com/credit-cards/index.html',
    cancellationPolicyUrl: 'https://www.rbcroyalbank.com/customer-service/',
    termsText: `Available to verified Amazon employees who meet the issuer's credit and identity requirements.
The welcome bonus and fee waiver apply only to the qualifying employee card offer and are subject to minimum spend criteria.
Cashback rates, APR, and insurance benefits are governed by the final cardholder agreement.
${APPLICATION_PRIVACY_NOTICE}`,
    cancellationPolicyText: `Card applications may be withdrawn before approval.
If the card is issued, closure, annual fee reversals, disputed charges, and refund handling are governed by the RBC cardholder agreement and card network rules.
Any rewards reversals follow issuer policy.`,
    restrictionsText:
      'Subject to credit approval. Existing cardholders or recent prior cardholders may not qualify for the welcome bonus.',
    redemptionInstructionsText:
      'Submit your request, wait for the RBC card team to contact you, and complete the final credit application directly with the issuer.',
    rating: 4.6,
    reviewCount: 101,
  },
];

const leads = [
  { id: 'uat-lead-amazon-rbc-banking', userEmail: 'qa.amazon.employee@amazon.com', offerId: 'uat-amazon-rbc-banking-company-wide', status: 'NEW' },
  { id: 'uat-lead-microsoft-marriott-toronto', userEmail: 'qa.microsoft.toronto@microsoft.com', offerId: 'uat-microsoft-marriott-toronto', status: 'QUALIFIED' },
];

async function upsertRoleUser(input: (typeof roleUsers)[number]) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      name: input.name,
      role: input.role as any,
    } as any,
    create: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role as any,
    } as any,
  });
}

async function upsertPlatformPolicies() {
  await (prisma as any).platformPolicy.upsert({
    where: { id: 'policy-default-terms-template' },
    update: {
      policyType: 'TERMS_TEMPLATE',
      title: 'Default Offer Terms template',
      bodyText: DEFAULT_OFFER_TERMS_TEMPLATE,
      isDefault: true,
    },
    create: {
      id: 'policy-default-terms-template',
      policyType: 'TERMS_TEMPLATE',
      title: 'Default Offer Terms template',
      bodyText: DEFAULT_OFFER_TERMS_TEMPLATE,
      isDefault: true,
    },
  });

  await (prisma as any).platformPolicy.upsert({
    where: { id: 'policy-default-cancellation-template' },
    update: {
      policyType: 'CANCELLATION_TEMPLATE',
      title: 'Default Cancellation/Refund template',
      bodyText: DEFAULT_CANCELLATION_TEMPLATE,
      isDefault: true,
    },
    create: {
      id: 'policy-default-cancellation-template',
      policyType: 'CANCELLATION_TEMPLATE',
      title: 'Default Cancellation/Refund template',
      bodyText: DEFAULT_CANCELLATION_TEMPLATE,
      isDefault: true,
    },
  });
}

async function upsertCategories() {
  const categorySync = await upsertCategoryTaxonomy(prisma);
  console.log(
    `Normalized category taxonomy (${categorySync.rootsUpserted} roots, ${categorySync.subcategoriesUpserted} subcategories)`
  );
}

async function upsertCompanies() {
  for (const company of companies) {
    const savedCompany = await prisma.company.upsert({
      where: { slug: company.slug },
      update: company,
      create: company,
    });

    if (company.domain) {
      await prisma.hRContact.upsert({
        where: { id: `uat-hr-${company.slug}` },
        update: {
          companyId: savedCompany.id,
          name: `${company.name} HR Benefits`,
          email: `hr@${company.domain}`,
          title: 'HR Benefits Manager',
          isPrimary: true,
        },
        create: {
          id: `uat-hr-${company.slug}`,
          companyId: savedCompany.id,
          name: `${company.name} HR Benefits`,
          email: `hr@${company.domain}`,
          title: 'HR Benefits Manager',
          isPrimary: true,
        },
      });
    }
  }
}

async function upsertApprovedVendor(input: (typeof vendors)[number]) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      name: input.userName,
      role: 'VENDOR',
    } as any,
    create: {
      email: input.email,
      passwordHash,
      name: input.userName,
      role: 'VENDOR',
    } as any,
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: user.id },
    update: {
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      website: input.website,
      businessType: input.businessType,
      description: input.description,
      city: input.city,
      status: 'APPROVED',
    } as any,
    create: {
      userId: user.id,
      companyName: input.companyName,
      contactName: input.contactName,
      email: input.email,
      website: input.website,
      businessType: input.businessType,
      description: input.description,
      city: input.city,
      status: 'APPROVED',
    } as any,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { vendorId: vendor.id } as any,
  });

  return vendor;
}

async function upsertVendorBillingSetup(
  vendorId: string,
  planId: string,
  presetKey: keyof typeof UAT_BILLING_PRESETS
) {
  const preset = UAT_BILLING_PRESETS[presetKey];
  const startsAt = daysFromNow(-30);
  const endsAt = daysFromNow(preset.durationDays);
  const billingCycleDay = 1;
  const billingMode =
    preset.planType === 'PAY_PER_LEAD' ? 'PAY_PER_LEAD' : presetKey === 'FREE' ? 'FREE' : 'MONTHLY';
  const associationStatus = presetKey === 'FREE' ? 'FREE' : 'ACTIVE';
  const cycleStart = startsAt;
  const cycleEnd = endsAt;
  const planConfig = await ensureBillingPlanConfig(prisma as any, {
    code: preset.code,
    name: preset.name,
    description:
      preset.code === 'FREE'
        ? 'Starter plan for vendors testing CorpDeals.'
        : preset.code === 'GOLD'
        ? 'Growth plan for vendors actively scaling deal coverage.'
        : preset.code === 'PREMIUM'
        ? 'High-volume plan for vendors with broad active catalogs.'
        : null,
    planType: preset.planType,
    pricePerLead: preset.pricePerLead ?? null,
    monthlyFee: preset.monthlyFee ?? null,
    includedLeadsPerCycle: preset.includedLeadsPerMonth ?? null,
    overagePricePerLead: preset.overagePricePerLead ?? null,
    maxActiveOffers: preset.offerLimit,
    overageEnabled: true,
    currencyCode: preset.currency,
    isSystemPreset: ['FREE', 'GOLD', 'PREMIUM', 'PAY_PER_LEAD'].includes(preset.code),
  });

  await prisma.vendorBilling.upsert({
    where: { vendorId },
    update: {
      planConfigId: planConfig.id,
      billingMode,
      associationStatus: associationStatus as any,
      statusReason: 'uat-seed-billing-plan',
      lastValidatedAt: new Date(),
      postTrialMode: billingMode,
      trialEndsAt: null,
      leadPriceCents: preset.pricePerLead ? Math.round(Number(preset.pricePerLead) * 100) : 0,
      monthlyFeeCents: preset.monthlyFee ? Math.round(Number(preset.monthlyFee) * 100) : 0,
      paymentMethod: 'MANUAL',
      currency: preset.currency,
      currencyCode: preset.currency,
      billingCycleStartAt: cycleStart,
      billingCycleEndAt: cycleEnd,
      includedLeadsTotal: preset.includedLeadsPerMonth ?? 0,
      includedLeadsUsed: 0,
      walletBalance: '0.00',
      billingDay: billingCycleDay,
    } as any,
    create: {
      vendorId,
      planConfigId: planConfig.id,
      billingMode,
      associationStatus: associationStatus as any,
      statusReason: 'uat-seed-billing-plan',
      lastValidatedAt: new Date(),
      postTrialMode: billingMode,
      trialEndsAt: null,
      leadPriceCents: preset.pricePerLead ? Math.round(Number(preset.pricePerLead) * 100) : 0,
      monthlyFeeCents: preset.monthlyFee ? Math.round(Number(preset.monthlyFee) * 100) : 0,
      paymentMethod: 'MANUAL',
      currency: preset.currency,
      currencyCode: preset.currency,
      billingCycleStartAt: cycleStart,
      billingCycleEndAt: cycleEnd,
      includedLeadsTotal: preset.includedLeadsPerMonth ?? 0,
      includedLeadsUsed: 0,
      walletBalance: '0.00',
      billingDay: billingCycleDay,
    } as any,
  });

  await (prisma as any).vendorBillingPlan.updateMany({
    where: {
      vendorId,
      isActive: true,
      id: { not: planId },
    },
    data: { isActive: false },
  });

  await (prisma as any).vendorBillingPlan.upsert({
    where: { id: planId },
    update: {
      vendorId,
      planConfigId: planConfig.id,
      code: preset.code,
      name: preset.name,
      planType: preset.planType,
      pricePerLead: preset.pricePerLead,
      monthlyFee: preset.monthlyFee,
      includedLeadsPerMonth: preset.includedLeadsPerMonth,
      includedLeadsPerCycle: preset.includedLeadsPerMonth,
      overagePricePerLead: preset.overagePricePerLead,
      offerLimit: preset.offerLimit,
      maxActiveOffers: preset.offerLimit,
      overageEnabled: true,
      billingCycleDay,
      currency: preset.currency,
      startsAt,
      endsAt,
      isActive: true,
    },
    create: {
      id: planId,
      vendorId,
      planConfigId: planConfig.id,
      code: preset.code,
      name: preset.name,
      planType: preset.planType,
      pricePerLead: preset.pricePerLead,
      monthlyFee: preset.monthlyFee,
      includedLeadsPerMonth: preset.includedLeadsPerMonth,
      includedLeadsPerCycle: preset.includedLeadsPerMonth,
      overagePricePerLead: preset.overagePricePerLead,
      offerLimit: preset.offerLimit,
      maxActiveOffers: preset.offerLimit,
      overageEnabled: true,
      billingCycleDay,
      currency: preset.currency,
      startsAt,
      endsAt,
      isActive: true,
    },
  });
}

async function upsertVerifiedEmployeeUser(input: (typeof employeeUsers)[number], companyId: string) {
  const passwordHash = await bcrypt.hash('Test@12345', 10);
  const verifiedAt = new Date();
  const expiresAt = new Date(verifiedAt);
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  const codeHash = await bcrypt.hash(`uat-seed-${input.email}`, 10);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash,
      name: input.name,
      role: 'USER',
      activeCompanyId: companyId,
      employeeCompanyId: companyId,
      employmentVerifiedAt: verifiedAt,
      provinceCode: input.provinceCode,
      cityName: input.cityName,
    } as any,
    create: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'USER',
      activeCompanyId: companyId,
      employeeCompanyId: companyId,
      employmentVerifiedAt: verifiedAt,
      provinceCode: input.provinceCode,
      cityName: input.cityName,
    } as any,
  });

  await prisma.userCompanyVerification.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId,
      },
    },
    update: {
      verificationMethod: 'work_email',
      verifiedAt,
      expiresAt,
      status: 'verified',
    },
    create: {
      userId: user.id,
      companyId,
      verificationMethod: 'work_email',
      verifiedAt,
      expiresAt,
      status: 'verified',
    },
  });

  const existingVerification = await prisma.employeeVerification.findFirst({
    where: {
      userId: user.id,
      companyId,
      email: input.email,
    },
    select: { id: true },
  });

  if (existingVerification) {
    await prisma.employeeVerification.update({
      where: { id: existingVerification.id },
      data: {
        status: 'VERIFIED',
        method: 'EMAIL',
        codeHash,
        codeExpiresAt: expiresAt,
        verifiedAt,
      },
    });
  } else {
    await prisma.employeeVerification.create({
      data: {
        userId: user.id,
        companyId,
        email: input.email,
        status: 'VERIFIED',
        method: 'EMAIL',
        codeHash,
        codeExpiresAt: expiresAt,
        verifiedAt,
      },
    });
  }

  return user;
}

function buildOfferHighlights(offer: UatOfferSeed, vendorName: string) {
  return (
    offer.highlights || [
      { label: 'Offer', value: offer.discountValue },
      { label: 'Company', value: offer.companySlug },
      { label: 'Vendor', value: vendorName },
      { label: 'Coverage', value: offer.coverageType },
    ]
  );
}

function buildOfferSections(offer: UatOfferSeed) {
  if (offer.detailSections?.length) {
    return offer.detailSections;
  }

  const coverageLabel =
    offer.coverageType === 'CITY_SPECIFIC'
      ? `${offer.cityName}, ${offer.provinceCode} only`
      : offer.coverageType === 'PROVINCE_SPECIFIC'
      ? `${offer.provinceCode} only`
      : 'All company locations';

  return [
    {
      type: 'pricing',
      title: 'Pricing overview',
      items: [
        { label: 'Offer value', value: offer.discountValue },
        { label: 'Coverage', value: coverageLabel },
      ],
    },
    {
      type: 'how_it_works',
      title: 'How it works',
      items: [
        { value: 'Log in with your verified employee account.' },
        { value: 'Open the deal detail page and review the offer information.' },
        { value: 'Accept terms, cancellation policy, and consent to submit your application.' },
      ],
    },
    {
      type: 'fine_print',
      title: 'Fine print',
      items: [
        { value: 'Employee verification is required before submission.' },
        { value: 'Availability and pricing may vary by vendor inventory and timing.' },
        { value: APPLICATION_PRIVACY_NOTICE },
      ],
    },
  ];
}

async function upsertOffer(
  offer: UatOfferSeed,
  vendorId: string,
  vendorWebsite: string,
  vendorCompanyName: string,
  companyId: string,
  categoryId: string
) {
  await prisma.offer.upsert({
    where: { id: offer.id },
    update: {
      slug: offer.slug,
      vendorId,
      companyId,
      categoryId,
      offerType: 'lead',
      coverageType: offer.coverageType as any,
      provinceCode: offer.provinceCode,
      cityName: offer.cityName,
      detailTemplateType: 'GENERIC',
      highlightsJson: buildOfferHighlights(offer, vendorCompanyName),
      detailSectionsJson: buildOfferSections(offer),
      configJson: {
        source: 'uat-seed',
        lead_fields: ['name', 'email', 'phone', 'consent'],
        consent_required: true,
      },
      productName: offer.productName,
      productModel: offer.productModel,
      productUrl: vendorWebsite,
      title: offer.title,
      description: offer.description,
      discountValue: offer.discountValue,
      discountType: offer.discountType as any,
      originalPrice: offer.originalPrice || null,
      discountedPrice: offer.discountedPrice || null,
      terms: [
        `Valid for verified ${offer.companySlug} employees.`,
        `Location applicability: ${offer.location}.`,
        'Subject to vendor availability.',
        'Application data is used only for verification, vendor routing, consent records, and legal compliance.',
      ],
      howToClaim: offer.howToClaim || [
        'Open the offer detail page in CorpDeals.',
        'Review the details and policy links.',
        'Submit the application form to send your lead to the vendor.',
      ],
      expiryDate: new Date('2027-12-31'),
      featured: offer.featured,
      verified: true,
      active: true,
      location: offer.location,
      image: offer.image || '/default-offer-card.png',
      rating: offer.rating ?? 4.7,
      reviewCount: offer.reviewCount ?? 42,
      termsText: offer.termsText || DEFAULT_OFFER_TERMS_TEMPLATE,
      termsUrl: offer.termsUrl || vendorWebsite,
      cancellationPolicyText: offer.cancellationPolicyText || DEFAULT_CANCELLATION_TEMPLATE,
      cancellationPolicyUrl: offer.cancellationPolicyUrl || vendorWebsite,
      redemptionInstructionsText: offer.redemptionInstructionsText || null,
      restrictionsText: offer.restrictionsText || null,
      usePlatformDefaultTerms: false,
      usePlatformDefaultCancellationPolicy: false,
      vendorAttestationAcceptedAt: new Date(),
      vendorAttestationAcceptedIp: 'uat-seed-script',
      offerState: 'APPROVED',
      offerStatus: 'LIVE',
      complianceStatus: 'APPROVED',
      complianceNotes: null,
      adminApprovedAt: new Date(),
    } as any,
    create: {
      id: offer.id,
      slug: offer.slug,
      vendorId,
      companyId,
      categoryId,
      offerType: 'lead',
      coverageType: offer.coverageType as any,
      provinceCode: offer.provinceCode,
      cityName: offer.cityName,
      detailTemplateType: 'GENERIC',
      highlightsJson: buildOfferHighlights(offer, vendorCompanyName),
      detailSectionsJson: buildOfferSections(offer),
      configJson: {
        source: 'uat-seed',
        lead_fields: ['name', 'email', 'phone', 'consent'],
        consent_required: true,
      },
      productName: offer.productName,
      productModel: offer.productModel,
      productUrl: vendorWebsite,
      title: offer.title,
      description: offer.description,
      discountValue: offer.discountValue,
      discountType: offer.discountType as any,
      originalPrice: offer.originalPrice || null,
      discountedPrice: offer.discountedPrice || null,
      terms: [
        `Valid for verified ${offer.companySlug} employees.`,
        `Location applicability: ${offer.location}.`,
        'Subject to vendor availability.',
        'Application data is used only for verification, vendor routing, consent records, and legal compliance.',
      ],
      howToClaim: offer.howToClaim || [
        'Open the offer detail page in CorpDeals.',
        'Review the details and policy links.',
        'Submit the application form to send your lead to the vendor.',
      ],
      expiryDate: new Date('2027-12-31'),
      featured: offer.featured,
      verified: true,
      active: true,
      location: offer.location,
      image: offer.image || '/default-offer-card.png',
      rating: offer.rating ?? 4.7,
      reviewCount: offer.reviewCount ?? 42,
      termsText: offer.termsText || DEFAULT_OFFER_TERMS_TEMPLATE,
      termsUrl: offer.termsUrl || vendorWebsite,
      cancellationPolicyText: offer.cancellationPolicyText || DEFAULT_CANCELLATION_TEMPLATE,
      cancellationPolicyUrl: offer.cancellationPolicyUrl || vendorWebsite,
      redemptionInstructionsText: offer.redemptionInstructionsText || null,
      restrictionsText: offer.restrictionsText || null,
      usePlatformDefaultTerms: false,
      usePlatformDefaultCancellationPolicy: false,
      vendorAttestationAcceptedAt: new Date(),
      vendorAttestationAcceptedIp: 'uat-seed-script',
      offerState: 'APPROVED',
      offerStatus: 'LIVE',
      complianceStatus: 'APPROVED',
      adminApprovedAt: new Date(),
    } as any,
  });
}

async function upsertLead(
  lead: (typeof leads)[number],
  userByEmail: Map<string, { id: string; email: string; provinceCode: string | null; cityName: string | null }>,
  offerById: Map<string, { id: string; companyId: string; vendorId: string | null }>
) {
  const user = userByEmail.get(lead.userEmail);
  const offer = offerById.get(lead.offerId);
  if (!user || !offer) return;

  const [firstName, ...rest] = (user.email.split('@')[0] || 'Demo User').split('.');
  const lastName = rest.join(' ') || 'Employee';
  const now = new Date();

  await prisma.lead.upsert({
    where: { id: lead.id },
    update: {
      userId: user.id,
      offerId: offer.id,
      companyId: offer.companyId,
      vendorId: offer.vendorId,
      payloadJson: {
        source: 'uat-seed',
        consent: true,
        termsAccepted: true,
        userProvinceCode: user.provinceCode,
        userCity: user.cityName,
      },
      consent: true,
      consentAt: now,
      consentIp: 'uat-seed-script',
      termsAccepted: true,
      termsAcceptedAt: now,
      userProvinceCodeAtSubmission: user.provinceCode,
      userCityAtSubmission: user.cityName,
      firstName,
      lastName,
      email: user.email,
      phone: '555-0100',
      employeeId: `UAT-${user.id.slice(0, 8).toUpperCase()}`,
      vendorNotificationEmail: null,
      status: lead.status as any,
    } as any,
    create: {
      id: lead.id,
      userId: user.id,
      offerId: offer.id,
      companyId: offer.companyId,
      vendorId: offer.vendorId,
      payloadJson: {
        source: 'uat-seed',
        consent: true,
        termsAccepted: true,
        userProvinceCode: user.provinceCode,
        userCity: user.cityName,
      },
      consent: true,
      consentAt: now,
      consentIp: 'uat-seed-script',
      termsAccepted: true,
      termsAcceptedAt: now,
      userProvinceCodeAtSubmission: user.provinceCode,
      userCityAtSubmission: user.cityName,
      firstName,
      lastName,
      email: user.email,
      phone: '555-0100',
      employeeId: `UAT-${user.id.slice(0, 8).toUpperCase()}`,
      vendorNotificationEmail: null,
      status: lead.status as any,
    } as any,
  });
}

const UAT_CATEGORY_LEAD_PRICING_ROWS: Array<{
  categorySlug: string;
  subcategorySlug?: string;
  leadPrice: number;
}> = [
  { categorySlug: 'telecom', subcategorySlug: 'mobile-plans', leadPrice: 15 },
  { categorySlug: 'telecom', subcategorySlug: 'broadband-internet', leadPrice: 10 },
  { categorySlug: 'banking-finance', subcategorySlug: 'credit-cards', leadPrice: 20 },
  { categorySlug: 'banking-finance', subcategorySlug: 'mortgages', leadPrice: 100 },
  { categorySlug: 'dining', subcategorySlug: 'restaurants', leadPrice: 3 },
  { categorySlug: 'wellness', subcategorySlug: 'fitness-memberships', leadPrice: 5 },
  { categorySlug: 'healthcare-clinics', subcategorySlug: 'doctor-clinics', leadPrice: 20 },
  { categorySlug: 'training-education', subcategorySlug: 'coding-bootcamps', leadPrice: 50 },
];

async function upsertCategoryLeadPricingUat() {
  const slugs = [
    ...new Set(
      UAT_CATEGORY_LEAD_PRICING_ROWS.flatMap((row) =>
        [row.categorySlug, row.subcategorySlug].filter(Boolean) as string[]
      )
    ),
  ];
  const categories = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, parentId: true },
  });
  const bySlug = new Map(categories.map((row) => [row.slug, row]));

  let seeded = 0;
  for (const row of UAT_CATEGORY_LEAD_PRICING_ROWS) {
    const category = bySlug.get(row.categorySlug);
    const subcategory = row.subcategorySlug ? bySlug.get(row.subcategorySlug) : null;
    if (!category || (row.subcategorySlug && !subcategory)) continue;
    if (subcategory && String(subcategory.parentId || '') !== category.id) continue;

    const existing = await (prisma as any).categoryLeadPricing.findFirst({
      where: {
        categoryId: category.id,
        subcategoryId: subcategory?.id || null,
      },
      select: { id: true },
    });

    if (existing) {
      await (prisma as any).categoryLeadPricing.update({
        where: { id: existing.id },
        data: {
          leadPrice: row.leadPrice.toFixed(2),
          billingType: 'PER_LEAD',
          isActive: true,
        },
      });
    } else {
      await (prisma as any).categoryLeadPricing.create({
        data: {
          categoryId: category.id,
          subcategoryId: subcategory?.id || null,
          leadPrice: row.leadPrice.toFixed(2),
          billingType: 'PER_LEAD',
          isActive: true,
        },
      });
    }
    seeded += 1;
  }

  console.log('Upserted UAT category lead pricing rows:', seeded);
}

async function main() {
  if (isProduction && !seedConfirmed) {
    throw new Error(
      'Refusing to seed production without CONFIRM_UAT_SEED=yes. Re-run with CONFIRM_UAT_SEED=yes npm run db:seed:uat'
    );
  }

  console.log('Seeding UAT demo data...');

  for (const roleUser of roleUsers) {
    await upsertRoleUser(roleUser);
  }
  console.log('Upserted role users');

  await upsertPlatformPolicies();
  console.log('Upserted default platform policies');

  await upsertCategories();
  console.log('Upserted demo categories');

  await upsertCompanies();
  console.log('Upserted demo companies and HR contacts');

  const companyRecords = await prisma.company.findMany({
    where: { slug: { in: companies.map((company) => company.slug) } },
    select: { id: true, slug: true },
  });
  const companyBySlug = new Map(companyRecords.map((company) => [company.slug, company.id]));

  const vendorRecords = new Map<string, { id: string; website: string; companyName: string }>();
  for (const vendor of vendors) {
    const savedVendor = await upsertApprovedVendor(vendor);
    const planPreset = UAT_VENDOR_PLAN_BY_KEY[vendor.key] || 'GOLD';
    await upsertVendorBillingSetup(savedVendor.id, `uat-plan-${vendor.key}`, planPreset);
    vendorRecords.set(vendor.key, {
      id: savedVendor.id,
      website: vendor.website,
      companyName: vendor.companyName,
    });
  }
  console.log('Upserted approved demo vendors and billing plans');

  const userRecords = new Map<string, { id: string; email: string; provinceCode: string | null; cityName: string | null }>();
  for (const employeeUser of employeeUsers) {
    const companyId = companyBySlug.get(employeeUser.companySlug);
    if (!companyId) continue;
    const user = await upsertVerifiedEmployeeUser(employeeUser, companyId);
    userRecords.set(employeeUser.email, {
      id: user.id,
      email: user.email,
      provinceCode: employeeUser.provinceCode,
      cityName: employeeUser.cityName,
    });
  }
  console.log('Upserted verified employee demo users');

  const categoryRecords = await prisma.category.findMany({
    where: { slug: { in: [...rootCategories.map((category) => category.slug), ...subcategories.map((category) => category.slug)] } },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categoryRecords.map((category) => [category.slug, category.id]));

  for (const offer of offers) {
    const companyId = companyBySlug.get(offer.companySlug);
    const categoryId = categoryBySlug.get(offer.categorySlug);
    const vendor = vendorRecords.get(offer.vendorKey);
    if (!companyId || !categoryId || !vendor) continue;
    await upsertOffer(offer, vendor.id, vendor.website, vendor.companyName, companyId, categoryId);
  }
  console.log('Upserted approved demo offers');
  await upsertCategoryLeadPricingUat();

  const offerRecords = await prisma.offer.findMany({
    where: { id: { in: offers.map((offer) => offer.id) } },
    select: { id: true, companyId: true, vendorId: true },
  });
  const offerById = new Map(offerRecords.map((offer) => [offer.id, offer]));

  for (const lead of leads) {
    await upsertLead(lead, userRecords, offerById);
  }
  console.log('Upserted demo leads');

  await prisma.$executeRawUnsafe(`
    UPDATE "offers"
    SET "offer_state" = CASE
      WHEN "offer_status" = 'CANCELLED'::"OfferStatus" THEN 'CANCELLED'::"OfferState"
      WHEN "compliance_status" = 'submitted' THEN 'SUBMITTED'::"OfferState"
      WHEN "compliance_status" = 'rejected' THEN 'REJECTED'::"OfferState"
      WHEN "compliance_status" = 'approved' THEN 'APPROVED'::"OfferState"
      ELSE 'DRAFT'::"OfferState"
    END
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "offers"
    SET "active" = FALSE
    WHERE "offer_state" <> 'APPROVED'::"OfferState"
      AND "active" = TRUE
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE "offers"
    SET "offer_status" = CASE
      WHEN "offer_state" = 'CANCELLED'::"OfferState" THEN 'CANCELLED'::"OfferStatus"
      WHEN "offer_state" = 'SUBMITTED'::"OfferState" THEN 'SUBMITTED'::"OfferStatus"
      WHEN "offer_state" = 'REJECTED'::"OfferState" THEN 'REJECTED'::"OfferStatus"
      WHEN "offer_state" = 'APPROVED'::"OfferState" AND "active" = TRUE THEN 'LIVE'::"OfferStatus"
      WHEN "offer_state" = 'APPROVED'::"OfferState" AND "active" = FALSE THEN 'APPROVED'::"OfferStatus"
      WHEN "compliance_status" = 'submitted' THEN 'SUBMITTED'::"OfferStatus"
      WHEN "compliance_status" = 'rejected' THEN 'REJECTED'::"OfferStatus"
      WHEN "compliance_status" = 'approved' AND "active" = TRUE THEN 'LIVE'::"OfferStatus"
      WHEN "compliance_status" = 'approved' AND "active" = FALSE THEN 'APPROVED'::"OfferStatus"
      ELSE 'DRAFT'::"OfferStatus"
    END
  `);

  await seedRbacDefaults();
  console.log('Seeded RBAC permissions, role mappings, and role assignments');

  console.log('Seeded UAT demo data successfully.');
  console.log('Role accounts:');
  console.log('  Admin: admin@corpdeals.io / admin123');
  console.log('  Sales: sales@corpdeals.io / sales123');
  console.log('  Finance: finance@corpdeals.io / finance123');
  console.log('Vendor accounts (all password vendor123):');
  for (const vendor of vendors) {
    console.log(`  ${vendor.email}`);
  }
  console.log('Employee accounts (all password Test@12345):');
  for (const employeeUser of employeeUsers) {
    console.log(`  ${employeeUser.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
