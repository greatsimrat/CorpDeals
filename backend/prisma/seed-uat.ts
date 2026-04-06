import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const seedConfirmed = (process.env.CONFIRM_UAT_SEED || '').toLowerCase() === 'yes';

const DEFAULT_OFFER_TERMS_TEMPLATE = `This offer is available to verified employees only.
Offer details, pricing, and availability may change without notice.
Proof of employment and identity may be required at redemption.
The offer may not be combined with other promotions unless stated otherwise.
Additional vendor-specific conditions may apply.`;

const DEFAULT_CANCELLATION_TEMPLATE = `Cancellation and refund eligibility is determined by the vendor.
Requests must be submitted through the vendor's published support channels.
Processing timelines may vary by payment method and product category.
Non-refundable fees or partially used services may be excluded where legally permitted.`;

const roleUsers = [
  { email: 'admin@corpdeals.io', name: 'Admin User', role: 'ADMIN', password: 'admin123' },
  { email: 'sales@corpdeals.io', name: 'Sales User', role: 'SALES', password: 'sales123' },
  { email: 'finance@corpdeals.io', name: 'Finance User', role: 'FINANCE', password: 'finance123' },
];

const rootCategories = [
  { name: 'Banking & Finance', slug: 'banking', icon: 'Building2', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Automotive', slug: 'automotive', icon: 'Car', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { name: 'Telecom', slug: 'telecom', icon: 'Wifi', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'Travel', slug: 'travel', icon: 'Plane', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { name: 'Technology', slug: 'technology', icon: 'Laptop', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { name: 'Wellness', slug: 'wellness', icon: 'Heart', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { name: 'Dining', slug: 'dining', icon: 'UtensilsCrossed', color: 'text-orange-600', bgColor: 'bg-orange-50' },
];

const subcategories = [
  { name: 'Personal Banking', slug: 'personal-banking', parentSlug: 'banking', icon: 'Wallet', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Credit Cards', slug: 'credit-cards', parentSlug: 'banking', icon: 'CreditCard', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { name: 'Mobile Plans', slug: 'mobile-plans', parentSlug: 'telecom', icon: 'Smartphone', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'Broadband & Internet', slug: 'broadband-internet', parentSlug: 'telecom', icon: 'Cable', color: 'text-violet-600', bgColor: 'bg-violet-50' },
  { name: 'Hotels & Stays', slug: 'hotels-stays', parentSlug: 'travel', icon: 'Hotel', color: 'text-sky-600', bgColor: 'bg-sky-50' },
  { name: 'Software & Productivity', slug: 'software-productivity', parentSlug: 'technology', icon: 'AppWindow', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  { name: 'Fitness Memberships', slug: 'fitness-memberships', parentSlug: 'wellness', icon: 'Dumbbell', color: 'text-rose-600', bgColor: 'bg-rose-50' },
  { name: 'Restaurants', slug: 'restaurants', parentSlug: 'dining', icon: 'UtensilsCrossed', color: 'text-orange-600', bgColor: 'bg-orange-50' },
];

const companies = [
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
];

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

const offers = [
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
  for (const category of rootCategories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        parentId: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        parentId: null,
      },
    });
  }

  const parentCategories = await prisma.category.findMany({
    where: { slug: { in: rootCategories.map((category) => category.slug) } },
    select: { id: true, slug: true },
  });
  const parentCategoryBySlug = new Map(parentCategories.map((category) => [category.slug, category.id]));

  for (const category of subcategories) {
    const parentId = parentCategoryBySlug.get(category.parentSlug);
    if (!parentId) continue;

    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        parentId,
      },
      create: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        color: category.color,
        bgColor: category.bgColor,
        parentId,
      },
    });
  }
}

async function upsertCompanies() {
  for (const company of companies) {
    const savedCompany = await prisma.company.upsert({
      where: { slug: company.slug },
      update: company,
      create: company,
    });

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

function buildOfferHighlights(offer: (typeof offers)[number], vendorName: string) {
  return [
    { label: 'Offer', value: offer.discountValue },
    { label: 'Company', value: offer.companySlug },
    { label: 'Vendor', value: vendorName },
    { label: 'Coverage', value: offer.coverageType },
  ];
}

function buildOfferSections(offer: (typeof offers)[number]) {
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
      ],
    },
  ];
}

async function upsertOffer(
  offer: (typeof offers)[number],
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
      originalPrice: null,
      discountedPrice: null,
      terms: [
        `Valid for verified ${offer.companySlug} employees.`,
        `Location applicability: ${offer.location}.`,
        'Subject to vendor availability.',
      ],
      howToClaim: [
        'Open the offer detail page in CorpDeals.',
        'Review the details and policy links.',
        'Submit the application form to send your lead to the vendor.',
      ],
      expiryDate: new Date('2027-12-31'),
      featured: offer.featured,
      verified: true,
      active: true,
      location: offer.location,
      image: '/default-offer-card.png',
      rating: 4.7,
      reviewCount: 42,
      termsText: DEFAULT_OFFER_TERMS_TEMPLATE,
      termsUrl: vendorWebsite,
      cancellationPolicyText: DEFAULT_CANCELLATION_TEMPLATE,
      cancellationPolicyUrl: vendorWebsite,
      usePlatformDefaultTerms: true,
      usePlatformDefaultCancellationPolicy: true,
      vendorAttestationAcceptedAt: new Date(),
      vendorAttestationAcceptedIp: 'uat-seed-script',
      complianceStatus: 'APPROVED',
      complianceNotes: null,
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
      terms: [
        `Valid for verified ${offer.companySlug} employees.`,
        `Location applicability: ${offer.location}.`,
        'Subject to vendor availability.',
      ],
      howToClaim: [
        'Open the offer detail page in CorpDeals.',
        'Review the details and policy links.',
        'Submit the application form to send your lead to the vendor.',
      ],
      expiryDate: new Date('2027-12-31'),
      featured: offer.featured,
      verified: true,
      active: true,
      location: offer.location,
      image: '/default-offer-card.png',
      rating: 4.7,
      reviewCount: 42,
      termsText: DEFAULT_OFFER_TERMS_TEMPLATE,
      termsUrl: vendorWebsite,
      cancellationPolicyText: DEFAULT_CANCELLATION_TEMPLATE,
      cancellationPolicyUrl: vendorWebsite,
      usePlatformDefaultTerms: true,
      usePlatformDefaultCancellationPolicy: true,
      vendorAttestationAcceptedAt: new Date(),
      vendorAttestationAcceptedIp: 'uat-seed-script',
      complianceStatus: 'APPROVED',
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
    vendorRecords.set(vendor.key, {
      id: savedVendor.id,
      website: vendor.website,
      companyName: vendor.companyName,
    });
  }
  console.log('Upserted approved demo vendors');

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

  const offerRecords = await prisma.offer.findMany({
    where: { id: { in: offers.map((offer) => offer.id) } },
    select: { id: true, companyId: true, vendorId: true },
  });
  const offerById = new Map(offerRecords.map((offer) => [offer.id, offer]));

  for (const lead of leads) {
    await upsertLead(lead, userRecords, offerById);
  }
  console.log('Upserted demo leads');

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
