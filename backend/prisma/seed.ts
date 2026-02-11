import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@corpdeals.io' },
    update: {},
    create: {
      email: 'admin@corpdeals.io',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create categories
  const categories = [
    { name: 'Banking & Finance', slug: 'banking', icon: 'Building2', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { name: 'Automotive', slug: 'automotive', icon: 'Car', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Telecom', slug: 'telecom', icon: 'Wifi', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Insurance', slug: 'insurance', icon: 'Shield', color: 'text-teal-600', bgColor: 'bg-teal-50' },
    { name: 'Travel', slug: 'travel', icon: 'Plane', color: 'text-sky-600', bgColor: 'bg-sky-50' },
    { name: 'Technology', slug: 'technology', icon: 'Laptop', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { name: 'Wellness', slug: 'wellness', icon: 'Heart', color: 'text-rose-600', bgColor: 'bg-rose-50' },
    { name: 'Retail', slug: 'retail', icon: 'ShoppingBag', color: 'text-amber-600', bgColor: 'bg-amber-50' },
    { name: 'Dining', slug: 'dining', icon: 'UtensilsCrossed', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { name: 'Entertainment', slug: 'entertainment', icon: 'Ticket', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }
  console.log('Created categories');

  // Create companies
  const companies = [
    { name: 'Amazon', slug: 'amazon', domain: 'amazon.com', employeeCount: '1.5M+', headquarters: 'Seattle, WA', brandColor: '#FF9900', verified: true },
    { name: 'Google', slug: 'google', domain: 'google.com', employeeCount: '190K+', headquarters: 'Mountain View, CA', brandColor: '#4285F4', verified: true },
    { name: 'Microsoft', slug: 'microsoft', domain: 'microsoft.com', employeeCount: '220K+', headquarters: 'Redmond, WA', brandColor: '#00A4EF', verified: true },
    { name: 'Apple', slug: 'apple', domain: 'apple.com', employeeCount: '160K+', headquarters: 'Cupertino, CA', brandColor: '#555555', verified: true },
    { name: 'Meta', slug: 'meta', domain: 'meta.com', employeeCount: '85K+', headquarters: 'Menlo Park, CA', brandColor: '#0668E1', verified: true },
    { name: 'Netflix', slug: 'netflix', domain: 'netflix.com', employeeCount: '12K+', headquarters: 'Los Gatos, CA', brandColor: '#E50914', verified: true },
  ];

  for (const company of companies) {
    const created = await prisma.company.upsert({
      where: { slug: company.slug },
      update: company,
      create: company,
    });

    // Add HR contact for each company
    await prisma.hRContact.upsert({
      where: {
        id: `hr-${company.slug}`,
      },
      update: {},
      create: {
        id: `hr-${company.slug}`,
        companyId: created.id,
        name: `HR Manager - ${company.name}`,
        email: `hr@${company.domain}`,
        title: 'HR Benefits Manager',
        isPrimary: true,
      },
    });
  }
  console.log('Created companies and HR contacts');

  // Create a sample vendor
  const vendorPassword = await bcrypt.hash('vendor123', 10);
  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@coastcapital.com' },
    update: {},
    create: {
      email: 'vendor@coastcapital.com',
      passwordHash: vendorPassword,
      name: 'Coast Capital Vendor',
      role: 'VENDOR',
    },
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      companyName: 'Coast Capital Savings',
      contactName: 'John Smith',
      email: 'vendor@coastcapital.com',
      phone: '604-555-0100',
      website: 'https://coastcapitalsavings.com',
      businessType: 'Banking & Finance',
      description: 'Coast Capital Savings is a member-owned credit union.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', vendor.companyName);

  // Get category and company IDs for offers
  const bankingCategory = await prisma.category.findUnique({ where: { slug: 'banking' } });
  const amazonCompany = await prisma.company.findUnique({ where: { slug: 'amazon' } });

  if (bankingCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'sample-offer-1' },
      update: {},
      create: {
        id: 'sample-offer-1',
        vendorId: vendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Exclusive Mortgage Rates for Amazon Employees',
        description: 'Amazon employees in British Columbia receive preferential mortgage rates and waived application fees.',
        discountValue: '0.5% off',
        discountType: 'PERCENTAGE',
        originalPrice: '5.24%',
        discountedPrice: '4.74%',
        terms: ['Valid for Amazon employees with BC address', 'Minimum mortgage amount: $200,000', 'Subject to credit approval'],
        howToClaim: ['Verify your Amazon employment status', 'Schedule a consultation', 'Complete mortgage application'],
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'British Columbia, Canada',
        rating: 4.8,
        reviewCount: 89,
      },
    });
    console.log('Created sample offer');
  }

  console.log('Seeding completed!');
  console.log('\nTest credentials:');
  console.log('Admin: admin@corpdeals.io / admin123');
  console.log('Vendor: vendor@coastcapital.com / vendor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
