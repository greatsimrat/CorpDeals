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

  // Create a Kia vendor
  const kiaPassword = await bcrypt.hash('vendor123', 10);
  const kiaUser = await prisma.user.upsert({
    where: { email: 'vendor@kia.com' },
    update: {},
    create: {
      email: 'vendor@kia.com',
      passwordHash: kiaPassword,
      name: 'Kia Vendor',
      role: 'VENDOR',
    },
  });

  const kiaVendor = await prisma.vendor.upsert({
    where: { userId: kiaUser.id },
    update: {},
    create: {
      userId: kiaUser.id,
      companyName: 'Kia Canada - BC Dealers',
      contactName: 'Kia Partner Team',
      email: 'vendor@kia.com',
      phone: '604-555-0200',
      website: 'https://www.kia.ca',
      businessType: 'Automotive',
      description: 'Kia Canada dealer network for corporate employee programs.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', kiaVendor.companyName);

  // Create a Telus vendor
  const telusPassword = await bcrypt.hash('vendor123', 10);
  const telusUser = await prisma.user.upsert({
    where: { email: 'vendor@telus.com' },
    update: {},
    create: {
      email: 'vendor@telus.com',
      passwordHash: telusPassword,
      name: 'Telus Vendor',
      role: 'VENDOR',
    },
  });

  const telusVendor = await prisma.vendor.upsert({
    where: { userId: telusUser.id },
    update: {},
    create: {
      userId: telusUser.id,
      companyName: 'Telus',
      contactName: 'Telus Partner Team',
      email: 'vendor@telus.com',
      phone: '604-555-0300',
      website: 'https://www.telus.com',
      businessType: 'Telecom',
      description: 'Telus corporate employee plans and services.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', telusVendor.companyName);

  // Create a Chase vendor
  const chasePassword = await bcrypt.hash('vendor123', 10);
  const chaseUser = await prisma.user.upsert({
    where: { email: 'vendor@chase.com' },
    update: {},
    create: {
      email: 'vendor@chase.com',
      passwordHash: chasePassword,
      name: 'Chase Vendor',
      role: 'VENDOR',
    },
  });

  const chaseVendor = await prisma.vendor.upsert({
    where: { userId: chaseUser.id },
    update: {},
    create: {
      userId: chaseUser.id,
      companyName: 'Chase Bank',
      contactName: 'Chase Partner Team',
      email: 'vendor@chase.com',
      phone: '604-555-0400',
      website: 'https://www.chase.com',
      businessType: 'Banking & Finance',
      description: 'Chase employee banking partnerships.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', chaseVendor.companyName);

  // Create additional vendors for Google/Microsoft sample offers
  const applePassword = await bcrypt.hash('vendor123', 10);
  const appleUser = await prisma.user.upsert({
    where: { email: 'vendor@apple.com' },
    update: {},
    create: {
      email: 'vendor@apple.com',
      passwordHash: applePassword,
      name: 'Apple Vendor',
      role: 'VENDOR',
    },
  });

  const appleVendor = await prisma.vendor.upsert({
    where: { userId: appleUser.id },
    update: {},
    create: {
      userId: appleUser.id,
      companyName: 'Apple',
      contactName: 'Apple Partner Team',
      email: 'vendor@apple.com',
      phone: '604-555-0500',
      website: 'https://www.apple.com',
      businessType: 'Technology',
      description: 'Apple employee purchase program partnerships.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', appleVendor.companyName);

  const equinoxPassword = await bcrypt.hash('vendor123', 10);
  const equinoxUser = await prisma.user.upsert({
    where: { email: 'vendor@equinox.com' },
    update: {},
    create: {
      email: 'vendor@equinox.com',
      passwordHash: equinoxPassword,
      name: 'Equinox Vendor',
      role: 'VENDOR',
    },
  });

  const equinoxVendor = await prisma.vendor.upsert({
    where: { userId: equinoxUser.id },
    update: {},
    create: {
      userId: equinoxUser.id,
      companyName: 'Equinox',
      contactName: 'Equinox Corporate Team',
      email: 'vendor@equinox.com',
      phone: '604-555-0600',
      website: 'https://www.equinox.com',
      businessType: 'Wellness',
      description: 'Equinox corporate membership programs.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', equinoxVendor.companyName);

  const bmwPassword = await bcrypt.hash('vendor123', 10);
  const bmwUser = await prisma.user.upsert({
    where: { email: 'vendor@bmw.com' },
    update: {},
    create: {
      email: 'vendor@bmw.com',
      passwordHash: bmwPassword,
      name: 'BMW Vendor',
      role: 'VENDOR',
    },
  });

  const bmwVendor = await prisma.vendor.upsert({
    where: { userId: bmwUser.id },
    update: {},
    create: {
      userId: bmwUser.id,
      companyName: 'BMW USA',
      contactName: 'BMW Corporate Team',
      email: 'vendor@bmw.com',
      phone: '604-555-0700',
      website: 'https://www.bmwusa.com',
      businessType: 'Automotive',
      description: 'BMW employee pricing programs.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', bmwVendor.companyName);

  const adobePassword = await bcrypt.hash('vendor123', 10);
  const adobeUser = await prisma.user.upsert({
    where: { email: 'vendor@adobe.com' },
    update: {},
    create: {
      email: 'vendor@adobe.com',
      passwordHash: adobePassword,
      name: 'Adobe Vendor',
      role: 'VENDOR',
    },
  });

  const adobeVendor = await prisma.vendor.upsert({
    where: { userId: adobeUser.id },
    update: {},
    create: {
      userId: adobeUser.id,
      companyName: 'Adobe',
      contactName: 'Adobe Partner Team',
      email: 'vendor@adobe.com',
      phone: '604-555-0800',
      website: 'https://www.adobe.com',
      businessType: 'Technology',
      description: 'Adobe Creative Cloud corporate discounts.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', adobeVendor.companyName);

  const marriottPassword = await bcrypt.hash('vendor123', 10);
  const marriottUser = await prisma.user.upsert({
    where: { email: 'vendor@marriott.com' },
    update: {},
    create: {
      email: 'vendor@marriott.com',
      passwordHash: marriottPassword,
      name: 'Marriott Vendor',
      role: 'VENDOR',
    },
  });

  const marriottVendor = await prisma.vendor.upsert({
    where: { userId: marriottUser.id },
    update: {},
    create: {
      userId: marriottUser.id,
      companyName: 'Marriott Bonvoy',
      contactName: 'Marriott Corporate Team',
      email: 'vendor@marriott.com',
      phone: '604-555-0900',
      website: 'https://www.marriott.com',
      businessType: 'Travel',
      description: 'Marriott corporate rate partnerships.',
      status: 'APPROVED',
    },
  });
  console.log('Created sample vendor:', marriottVendor.companyName);

  // Get category and company IDs for offers
  const bankingCategory = await prisma.category.findUnique({ where: { slug: 'banking' } });
  const automotiveCategory = await prisma.category.findUnique({ where: { slug: 'automotive' } });
  const telecomCategory = await prisma.category.findUnique({ where: { slug: 'telecom' } });
  const technologyCategory = await prisma.category.findUnique({ where: { slug: 'technology' } });
  const wellnessCategory = await prisma.category.findUnique({ where: { slug: 'wellness' } });
  const travelCategory = await prisma.category.findUnique({ where: { slug: 'travel' } });
  const amazonCompany = await prisma.company.findUnique({ where: { slug: 'amazon' } });
  const googleCompany = await prisma.company.findUnique({ where: { slug: 'google' } });
  const microsoftCompany = await prisma.company.findUnique({ where: { slug: 'microsoft' } });

  if (bankingCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'coast-capital-mortgage' },
      update: {},
      create: {
        id: 'coast-capital-mortgage',
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

    // Seed a few sample leads for Coast Capital offer so admin/vendor can test reports
    await prisma.lead.createMany({
      data: [
        {
          id: 'seed-lead-1',
          offerId: 'coast-capital-mortgage',
          companyId: amazonCompany.id,
          firstName: 'Alice',
          lastName: 'Nguyen',
          email: 'alice.nguyen@amazon.com',
          phone: '604-555-1001',
          employeeId: 'AMZ-1001',
          status: 'NEW',
        },
        {
          id: 'seed-lead-2',
          offerId: 'coast-capital-mortgage',
          companyId: amazonCompany.id,
          firstName: 'Brian',
          lastName: 'Lee',
          email: 'brian.lee@amazon.com',
          phone: '604-555-1002',
          employeeId: 'AMZ-1002',
          status: 'CONTACTED',
        },
        {
          id: 'seed-lead-3',
          offerId: 'coast-capital-mortgage',
          companyId: amazonCompany.id,
          firstName: 'Carla',
          lastName: 'Singh',
          email: 'carla.singh@amazon.com',
          phone: '604-555-1003',
          employeeId: 'AMZ-1003',
          status: 'CONVERTED',
        },
      ],
      skipDuplicates: true,
    });
    console.log('Created sample leads for Coast Capital / Amazon');
  }

  if (automotiveCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'kia-bc-discount' },
      update: {},
      create: {
        id: 'kia-bc-discount',
        vendorId: kiaVendor.id,
        companyId: amazonCompany.id,
        categoryId: automotiveCategory.id,
        title: '$500 CAD Off Any New Kia Vehicle',
        description: 'Amazon BC employees receive $500 CAD discount on any new Kia vehicle purchase or lease. Valid at participating BC dealerships.',
        discountValue: '$500 CAD',
        discountType: 'FIXED',
        terms: [
          'Valid for Amazon employees in British Columbia',
          'Applies to new vehicle purchases and leases',
          'Cannot be combined with other offers',
          'Valid ID and proof of employment required',
        ],
        howToClaim: [
          'Visit any participating Kia dealership in BC',
          'Present your Amazon employee badge or pay stub',
          'Mention CorpDeals Amazon employee discount',
          'Discount applied at purchase',
        ],
        expiryDate: new Date('2026-06-30'),
        featured: true,
        verified: true,
        active: true,
        location: 'British Columbia, Canada',
        image: '/offer_kia.jpg',
        rating: 4.6,
        reviewCount: 156,
      },
    });
    console.log('Created Kia offer for Amazon');
  }

  if (telecomCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'telus-employee-plan' },
      update: {},
      create: {
        id: 'telus-employee-plan',
        vendorId: telusVendor.id,
        companyId: amazonCompany.id,
        categoryId: telecomCategory.id,
        title: 'Telus Employee Advantage Plan - 25% Off',
        description: 'Amazon employees save 25% on unlimited data plans, home internet, and TV bundles. Family plans included.',
        discountValue: '25% off',
        discountType: 'PERCENTAGE',
        originalPrice: '$85/mo',
        discountedPrice: '$63.75/mo',
        terms: [
          'Valid for active Amazon employees',
          'Up to 5 lines per employee account',
          '2-year term agreement required',
          'Employee verification required annually',
        ],
        howToClaim: [
          'Visit Telus.com/corpdeals or any Telus store',
          'Verify with your Amazon work email',
          'Select your preferred plan',
          'Discount applied automatically',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'Canada',
        image: '/offer_telus.jpg',
        rating: 4.5,
        reviewCount: 423,
      },
    });
    console.log('Created Telus offer for Amazon');
  }

  if (bankingCategory && amazonCompany) {
    await prisma.offer.upsert({
      where: { id: 'amazon-chase-card' },
      update: {},
      create: {
        id: 'amazon-chase-card',
        vendorId: chaseVendor.id,
        companyId: amazonCompany.id,
        categoryId: bankingCategory.id,
        title: 'Chase Amazon Employee Credit Card - $200 Bonus',
        description: 'Exclusive Chase credit card for Amazon employees with $200 signup bonus, 5% back on Amazon purchases, and no annual fee.',
        discountValue: '$200 bonus',
        discountType: 'FIXED',
        terms: [
          'Valid for active Amazon employees',
          'Spend $500 in first 3 months for bonus',
          'Subject to credit approval',
          'Must verify employment status',
        ],
        howToClaim: [
          'Apply online at Chase.com/amazon-employee',
          'Verify with Amazon employee ID',
          'Receive decision within minutes',
          'Card shipped within 7-10 business days',
        ],
        expiryDate: new Date('2026-03-31'),
        featured: false,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_creditcard.jpg',
        rating: 4.7,
        reviewCount: 634,
      },
    });
    console.log('Created Chase offer for Amazon');
  }

  if (bankingCategory && googleCompany) {
    await prisma.offer.upsert({
      where: { id: 'chase-sapphire' },
      update: {},
      create: {
        id: 'chase-sapphire',
        vendorId: chaseVendor.id,
        companyId: googleCompany.id,
        categoryId: bankingCategory.id,
        title: 'Chase Sapphire Preferred - 80,000 Points Bonus',
        description: 'Google employees receive enhanced 80,000 points signup bonus (worth $1,000 in travel) plus premium travel benefits.',
        discountValue: '80K points',
        discountType: 'SPECIAL',
        terms: [
          'Valid for Google employees only',
          'Spend $4,000 in first 3 months',
          'Subject to credit approval',
          'Annual fee: $95',
        ],
        howToClaim: [
          'Apply via Google perks portal',
          'Verify Google employment',
          'Complete application',
          'Bonus posts after qualifying spend',
        ],
        expiryDate: new Date('2026-06-30'),
        featured: true,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_chase.jpg',
        rating: 4.9,
        reviewCount: 312,
      },
    });
    console.log('Created Chase Sapphire offer for Google');
  }

  if (technologyCategory && googleCompany) {
    await prisma.offer.upsert({
      where: { id: 'apple-employee-discount' },
      update: {},
      create: {
        id: 'apple-employee-discount',
        vendorId: appleVendor.id,
        companyId: googleCompany.id,
        categoryId: technologyCategory.id,
        title: 'Apple Employee Purchase Program - 10% Off',
        description: 'Google employees save 10% on Mac, iPad, Apple Watch, and accessories through Apple EPP.',
        discountValue: '10% off',
        discountType: 'PERCENTAGE',
        terms: [
          'Valid for active Google employees',
          'Up to 3 units per product per year',
          'Cannot be combined with education pricing',
          'Employee verification required',
        ],
        howToClaim: [
          'Visit Apple.com/google-epp',
          'Sign in with Google SSO',
          'Shop with employee pricing',
          'Discount applied at checkout',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'Global',
        image: '/offer_apple.jpg',
        rating: 4.8,
        reviewCount: 892,
      },
    });
    console.log('Created Apple EPP offer for Google');
  }

  if (wellnessCategory && googleCompany) {
    await prisma.offer.upsert({
      where: { id: 'equinox-membership' },
      update: {},
      create: {
        id: 'equinox-membership',
        vendorId: equinoxVendor.id,
        companyId: googleCompany.id,
        categoryId: wellnessCategory.id,
        title: 'Equinox Corporate Membership - 20% Off',
        description: 'Google employees receive 20% off Equinox memberships plus waived initiation fee. Access to all locations.',
        discountValue: '20% off',
        discountType: 'PERCENTAGE',
        originalPrice: '$220/mo',
        discountedPrice: '$176/mo',
        terms: [
          'Valid for Google employees',
          '12-month commitment required',
          'Valid at all Equinox locations',
          'Must verify employment quarterly',
        ],
        howToClaim: [
          'Visit Equinox.com/google',
          'Verify with Google email',
          'Select membership type',
          'Start your fitness journey',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_equinox.jpg',
        rating: 4.6,
        reviewCount: 445,
      },
    });
    console.log('Created Equinox offer for Google');
  }

  if (automotiveCategory && microsoftCompany) {
    await prisma.offer.upsert({
      where: { id: 'bmw-employee' },
      update: {},
      create: {
        id: 'bmw-employee',
        vendorId: bmwVendor.id,
        companyId: microsoftCompany.id,
        categoryId: automotiveCategory.id,
        title: 'BMW Employee Pricing - $2,000 Off',
        description: 'Microsoft employees receive exclusive BMW employee pricing, equivalent to $2,000+ off MSRP on new vehicles.',
        discountValue: '$2,000+ off',
        discountType: 'FIXED',
        terms: [
          'Valid for Microsoft employees',
          'New BMW vehicles only',
          'Cannot be combined with other offers',
          'Proof of employment required',
        ],
        howToClaim: [
          'Visit participating BMW dealer',
          'Present Microsoft employee badge',
          'Mention Microsoft Employee Program',
          'Pricing applied to purchase',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'United States',
        image: '/offer_bmw.jpg',
        rating: 4.7,
        reviewCount: 234,
      },
    });
    console.log('Created BMW offer for Microsoft');
  }

  if (technologyCategory && microsoftCompany) {
    await prisma.offer.upsert({
      where: { id: 'adobe-creative-cloud' },
      update: {},
      create: {
        id: 'adobe-creative-cloud',
        vendorId: adobeVendor.id,
        companyId: microsoftCompany.id,
        categoryId: technologyCategory.id,
        title: 'Adobe Creative Cloud - 40% Off Annual Plan',
        description: 'Microsoft employees save 40% on Adobe Creative Cloud All Apps plan. Full suite of creative tools.',
        discountValue: '40% off',
        discountType: 'PERCENTAGE',
        originalPrice: '$54.99/mo',
        discountedPrice: '$32.99/mo',
        terms: [
          'Valid for active Microsoft employees',
          'Annual subscription required',
          'Must verify employment annually',
          'Full Creative Cloud access',
        ],
        howToClaim: [
          'Visit Adobe.com/microsoft',
          'Verify with Microsoft SSO',
          'Select Creative Cloud plan',
          'Discount applied automatically',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: true,
        verified: true,
        active: true,
        location: 'Global',
        image: '/offer_adobe.jpg',
        rating: 4.9,
        reviewCount: 1123,
      },
    });
    console.log('Created Adobe offer for Microsoft');
  }

  if (travelCategory && microsoftCompany) {
    await prisma.offer.upsert({
      where: { id: 'marriott-corporate' },
      update: {},
      create: {
        id: 'marriott-corporate',
        vendorId: marriottVendor.id,
        companyId: microsoftCompany.id,
        categoryId: travelCategory.id,
        title: 'Marriott Corporate Rates - Up to 25% Off',
        description: 'Microsoft employees receive up to 25% off at 7,000+ Marriott properties worldwide plus elite status fast-track.',
        discountValue: '25% off',
        discountType: 'PERCENTAGE',
        terms: [
          'Valid for Microsoft employees',
          'Subject to availability',
          'Must book through corporate portal',
          'Employee verification required',
        ],
        howToClaim: [
          'Book via Microsoft travel portal',
          'Verify employment status',
          'Search Marriott properties',
          'Corporate rates displayed automatically',
        ],
        expiryDate: new Date('2026-12-31'),
        featured: false,
        verified: true,
        active: true,
        location: 'Global',
        image: '/offer_marriott.jpg',
        rating: 4.6,
        reviewCount: 567,
      },
    });
    console.log('Created Marriott offer for Microsoft');
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
