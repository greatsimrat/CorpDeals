import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
const seedConfirmed = (process.env.CONFIRM_UAT_SEED || '').toLowerCase() === 'yes';

const categories = [
  { name: 'Banking & Finance', slug: 'banking' },
  { name: 'Automotive', slug: 'automotive' },
  { name: 'Technology', slug: 'technology' },
  { name: 'Travel', slug: 'travel' },
];

const companies = [
  {
    name: 'Amazon',
    slug: 'amazon',
    domain: 'amazon.com',
    allowedDomains: ['amazon.com'],
    headquarters: 'Seattle, WA',
    employeeCount: '1.5M+',
    verified: true,
    brandColor: '#FF9900',
  },
  {
    name: 'Apple',
    slug: 'apple',
    domain: 'apple.com',
    allowedDomains: ['apple.com'],
    headquarters: 'Cupertino, CA',
    employeeCount: '160K+',
    verified: true,
    brandColor: '#555555',
  },
  {
    name: 'Microsoft',
    slug: 'microsoft',
    domain: 'microsoft.com',
    allowedDomains: ['microsoft.com'],
    headquarters: 'Redmond, WA',
    employeeCount: '220K+',
    verified: true,
    brandColor: '#00A4EF',
  },
  {
    name: 'Google',
    slug: 'google',
    domain: 'google.com',
    allowedDomains: ['google.com', 'alphabet.com'],
    headquarters: 'Mountain View, CA',
    employeeCount: '190K+',
    verified: true,
    brandColor: '#4285F4',
  },
  {
    name: 'Lululemon',
    slug: 'lululemon',
    domain: 'lululemon.com',
    allowedDomains: ['lululemon.com'],
    headquarters: 'Vancouver, BC',
    employeeCount: '38K+',
    verified: true,
    brandColor: '#D31334',
  },
];

async function upsertVendor(input: {
  email: string;
  name: string;
  companyName: string;
  website: string;
  businessType: string;
  description: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      role: 'VENDOR',
      name: input.name,
    },
    create: {
      email: input.email,
      name: input.name,
      role: 'VENDOR',
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: user.id },
    update: {
      companyName: input.companyName,
      contactName: input.name,
      email: input.email,
      website: input.website,
      businessType: input.businessType,
      description: input.description,
      status: 'APPROVED',
    } as any,
    create: {
      userId: user.id,
      companyName: input.companyName,
      contactName: input.name,
      email: input.email,
      website: input.website,
      businessType: input.businessType,
      description: input.description,
      status: 'APPROVED',
    } as any,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { vendorId: vendor.id } as any,
  });

  return vendor;
}

async function main() {
  if (isProduction && !seedConfirmed) {
    throw new Error(
      'Refusing to seed production without CONFIRM_UAT_SEED=yes. Re-run with CONFIRM_UAT_SEED=yes npm run db:seed:uat'
    );
  }

  console.log('Seeding UAT demo data...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  for (const company of companies) {
    await prisma.company.upsert({
      where: { slug: company.slug },
      update: company,
      create: company,
    });
  }

  const [banking, automotive, technology, travel, amazon, apple, microsoft, google, lululemon] =
    await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { slug: 'banking' } }),
      prisma.category.findUniqueOrThrow({ where: { slug: 'automotive' } }),
      prisma.category.findUniqueOrThrow({ where: { slug: 'technology' } }),
      prisma.category.findUniqueOrThrow({ where: { slug: 'travel' } }),
      prisma.company.findUniqueOrThrow({ where: { slug: 'amazon' } }),
      prisma.company.findUniqueOrThrow({ where: { slug: 'apple' } }),
      prisma.company.findUniqueOrThrow({ where: { slug: 'microsoft' } }),
      prisma.company.findUniqueOrThrow({ where: { slug: 'google' } }),
      prisma.company.findUniqueOrThrow({ where: { slug: 'lululemon' } }),
    ]);

  const [rbcVendor, telusVendor, marriottVendor, fordVendor] = await Promise.all([
    upsertVendor({
      email: 'uat-rbc-vendor@corpdeals.ca',
      name: 'RBC Partnerships',
      companyName: 'RBC',
      website: 'https://www.rbcroyalbank.com',
      businessType: 'Banking & Finance',
      description: 'RBC UAT partner for employee banking offers.',
    }),
    upsertVendor({
      email: 'uat-telus-vendor@corpdeals.ca',
      name: 'TELUS Partnerships',
      companyName: 'TELUS',
      website: 'https://www.telus.com',
      businessType: 'Technology',
      description: 'TELUS UAT partner for mobility and internet offers.',
    }),
    upsertVendor({
      email: 'uat-marriott-vendor@corpdeals.ca',
      name: 'Marriott Partnerships',
      companyName: 'Marriott Bonvoy',
      website: 'https://www.marriott.com',
      businessType: 'Travel',
      description: 'Marriott UAT partner for travel offers.',
    }),
    upsertVendor({
      email: 'uat-ford-vendor@corpdeals.ca',
      name: 'Ford Partnerships',
      companyName: 'Ford Canada',
      website: 'https://www.ford.ca',
      businessType: 'Automotive',
      description: 'Ford UAT partner for employee pricing offers.',
    }),
  ]);

  const offers = [
    {
      id: 'uat-amazon-rbc-banking',
      vendorId: rbcVendor.id,
      companyId: amazon.id,
      categoryId: banking.id,
      title: 'RBC Preferred Banking for Amazon Employees',
      description: 'Preferred chequing account package and advisor support for Amazon employees.',
      discountValue: 'Preferred pricing',
      discountType: 'SPECIAL',
      featured: true,
      location: 'Canada',
    },
    {
      id: 'uat-apple-telus-mobility',
      vendorId: telusVendor.id,
      companyId: apple.id,
      categoryId: technology.id,
      title: 'TELUS Employee Mobility Plan for Apple',
      description: 'Discounted mobility and home internet bundle for Apple employees.',
      discountValue: '25% off',
      discountType: 'PERCENTAGE',
      featured: true,
      location: 'Canada',
    },
    {
      id: 'uat-microsoft-marriott-travel',
      vendorId: marriottVendor.id,
      companyId: microsoft.id,
      categoryId: travel.id,
      title: 'Marriott Corporate Travel Rate for Microsoft',
      description: 'Discounted room rates and bonus points for Microsoft employees.',
      discountValue: '20% off',
      discountType: 'PERCENTAGE',
      featured: true,
      location: 'Global',
    },
    {
      id: 'uat-google-ford-pricing',
      vendorId: fordVendor.id,
      companyId: google.id,
      categoryId: automotive.id,
      title: 'Ford Employee Pricing for Google',
      description: 'Preferred pricing on select new Ford vehicles for Google employees.',
      discountValue: '$1,500 off',
      discountType: 'FIXED',
      featured: false,
      location: 'North America',
    },
    {
      id: 'uat-lululemon-telus-mobility',
      vendorId: telusVendor.id,
      companyId: lululemon.id,
      categoryId: technology.id,
      title: 'TELUS Corporate Mobility Plan for Lululemon Employees',
      description: 'Exclusive TELUS mobility and internet savings for verified Lululemon employees.',
      discountValue: '25% off',
      discountType: 'PERCENTAGE',
      featured: true,
      location: 'Canada',
    },
  ];

  for (const offer of offers) {
    await prisma.offer.upsert({
      where: { id: offer.id },
      update: {
        ...offer,
        active: true,
        verified: true,
        complianceStatus: 'APPROVED',
        termsText: 'UAT demo offer terms.',
        cancellationPolicyText: 'UAT demo cancellation policy.',
        usePlatformDefaultTerms: true,
        usePlatformDefaultCancellationPolicy: true,
        vendorAttestationAcceptedAt: new Date(),
        vendorAttestationAcceptedIp: 'uat-seed-script',
      } as any,
      create: {
        ...offer,
        active: true,
        verified: true,
        complianceStatus: 'APPROVED',
        termsText: 'UAT demo offer terms.',
        cancellationPolicyText: 'UAT demo cancellation policy.',
        usePlatformDefaultTerms: true,
        usePlatformDefaultCancellationPolicy: true,
        vendorAttestationAcceptedAt: new Date(),
        vendorAttestationAcceptedIp: 'uat-seed-script',
      } as any,
    });
  }

  console.log('Seeded UAT demo data successfully.');
  console.log('Companies:', companies.map((company) => company.name).join(', '));
  console.log('Offers:', offers.map((offer) => offer.title).join(' | '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
