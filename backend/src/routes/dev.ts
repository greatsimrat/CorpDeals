import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

const router = Router();

const isDevMode = process.env.NODE_ENV !== 'production';
const testDomain = 'effectiverenovations.com';
const vendorNotificationEmail = 'vendor-test@effectiverenovations.com';

const uniq = (values: string[]) =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
    )
  );

const ensureLocalOnly = (_req: Request, res: Response, next: () => void) => {
  if (!isDevMode) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
};

router.use(ensureLocalOnly);

const upsertCompanyWithLocalDomain = async (input: {
  name: string;
  slug: string;
  domain: string;
}) => {
  const existing = await prisma.company.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      allowedDomains: true,
      domain: true,
    },
  });

  const allowedDomains = uniq([
    ...(existing?.allowedDomains || []),
    input.domain,
    testDomain,
  ]);

  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        domain: input.domain,
        allowedDomains,
        verified: true,
      },
      select: { id: true, slug: true, name: true, allowedDomains: true },
    });
  }

  return prisma.company.create({
    data: {
      name: input.name,
      slug: input.slug,
      domain: input.domain,
      allowedDomains,
      verified: true,
    },
    select: { id: true, slug: true, name: true, allowedDomains: true },
  });
};

const upsertCategory = async (name: string, slug: string) =>
  prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
    select: { id: true, slug: true, name: true },
  });

router.get('/seed', async (_req: Request, res: Response): Promise<void> => {
  try {
    const passwordHash = await bcrypt.hash('DevVendor@123', 10);

    const [amazon, microsoft, banking, automotive, travel] = await Promise.all([
      upsertCompanyWithLocalDomain({
        name: 'Amazon',
        slug: 'amazon',
        domain: 'amazon.com',
      }),
      upsertCompanyWithLocalDomain({
        name: 'Microsoft',
        slug: 'microsoft',
        domain: 'microsoft.com',
      }),
      upsertCategory('Banking & Finance', 'banking'),
      upsertCategory('Automotive', 'automotive'),
      upsertCategory('Travel', 'travel'),
    ]);

    const bmoUser = await prisma.user.upsert({
      where: { email: 'dev.bmo.vendor@effectiverenovations.com' },
      update: {
        role: 'VENDOR',
        name: 'BMO Test Vendor',
        passwordHash,
      },
      create: {
        email: 'dev.bmo.vendor@effectiverenovations.com',
        role: 'VENDOR',
        name: 'BMO Test Vendor',
        passwordHash,
      },
      select: { id: true, email: true },
    });

    const kiaUser = await prisma.user.upsert({
      where: { email: 'dev.kia.vendor@effectiverenovations.com' },
      update: {
        role: 'VENDOR',
        name: 'Kia Surrey Test Vendor',
        passwordHash,
      },
      create: {
        email: 'dev.kia.vendor@effectiverenovations.com',
        role: 'VENDOR',
        name: 'Kia Surrey Test Vendor',
        passwordHash,
      },
      select: { id: true, email: true },
    });

    const expediaUser = await prisma.user.upsert({
      where: { email: 'dev.expedia.vendor@effectiverenovations.com' },
      update: {
        role: 'VENDOR',
        name: 'Expedia Test Vendor',
        passwordHash,
      },
      create: {
        email: 'dev.expedia.vendor@effectiverenovations.com',
        role: 'VENDOR',
        name: 'Expedia Test Vendor',
        passwordHash,
      },
      select: { id: true, email: true },
    });

    const bmoVendor = await prisma.vendor.upsert({
      where: { userId: bmoUser.id },
      update: {
        companyName: 'BMO',
        contactName: 'BMO Test Contact',
        email: vendorNotificationEmail,
        status: 'APPROVED',
      },
      create: {
        userId: bmoUser.id,
        companyName: 'BMO',
        contactName: 'BMO Test Contact',
        email: vendorNotificationEmail,
        status: 'APPROVED',
      },
      select: { id: true, companyName: true, email: true },
    });

    const kiaVendor = await prisma.vendor.upsert({
      where: { userId: kiaUser.id },
      update: {
        companyName: 'Kia Surrey',
        contactName: 'Kia Surrey Test Contact',
        email: vendorNotificationEmail,
        status: 'APPROVED',
      },
      create: {
        userId: kiaUser.id,
        companyName: 'Kia Surrey',
        contactName: 'Kia Surrey Test Contact',
        email: vendorNotificationEmail,
        status: 'APPROVED',
      },
      select: { id: true, companyName: true, email: true },
    });

    const expediaVendor = await prisma.vendor.upsert({
      where: { userId: expediaUser.id },
      update: {
        companyName: 'Expedia',
        contactName: 'Expedia Test Contact',
        email: vendorNotificationEmail,
        status: 'APPROVED',
      },
      create: {
        userId: expediaUser.id,
        companyName: 'Expedia',
        contactName: 'Expedia Test Contact',
        email: vendorNotificationEmail,
        status: 'APPROVED',
      },
      select: { id: true, companyName: true, email: true },
    });

    await prisma.user.update({
      where: { id: bmoUser.id },
      data: { vendorId: bmoVendor.id } as any,
    });
    await prisma.user.update({
      where: { id: kiaUser.id },
      data: { vendorId: kiaVendor.id } as any,
    });
    await prisma.user.update({
      where: { id: expediaUser.id },
      data: { vendorId: expediaVendor.id } as any,
    });

    const leadOffer = await prisma.offer.upsert({
      where: { id: 'dev-amazon-lead-offer' },
      update: {
        vendorId: bmoVendor.id,
        companyId: amazon.id,
        categoryId: banking.id,
        title: 'BMO Credit Card - Amazon Employee Offer (TEST)',
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        discountValue: 'Exclusive offer',
        discountType: 'SPECIAL',
        active: true,
        verified: true,
      },
      create: {
        id: 'dev-amazon-lead-offer',
        vendorId: bmoVendor.id,
        companyId: amazon.id,
        categoryId: banking.id,
        title: 'BMO Credit Card - Amazon Employee Offer (TEST)',
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        description: 'Local test lead offer for Amazon employees.',
        discountValue: 'Exclusive offer',
        discountType: 'SPECIAL',
        active: true,
        verified: true,
      },
      select: { id: true, title: true, offerType: true },
    });

    const kiaLeadOffer = await prisma.offer.upsert({
      where: { id: 'dev-amazon-kia-lead-offer' },
      update: {
        vendorId: kiaVendor.id,
        companyId: amazon.id,
        categoryId: automotive.id,
        title: '10% Off - Kia Service Discount (TEST)',
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        discountValue: '10% off',
        discountType: 'PERCENTAGE',
        active: true,
        verified: true,
      },
      create: {
        id: 'dev-amazon-kia-lead-offer',
        vendorId: kiaVendor.id,
        companyId: amazon.id,
        categoryId: automotive.id,
        title: '10% Off - Kia Service Discount (TEST)',
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        description: 'Local test lead offer for Amazon employees (Kia).',
        discountValue: '10% off',
        discountType: 'PERCENTAGE',
        active: true,
        verified: true,
      },
      select: { id: true, title: true, offerType: true },
    });

    const expediaLeadOffer = await prisma.offer.upsert({
      where: { id: 'dev-amazon-expedia-lead-offer' },
      update: {
        vendorId: expediaVendor.id,
        companyId: amazon.id,
        categoryId: travel.id,
        title: 'Travel Deal - Expedia (TEST)',
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        discountValue: 'Special travel deal',
        discountType: 'SPECIAL',
        active: true,
        verified: true,
      },
      create: {
        id: 'dev-amazon-expedia-lead-offer',
        vendorId: expediaVendor.id,
        companyId: amazon.id,
        categoryId: travel.id,
        title: 'Travel Deal - Expedia (TEST)',
        offerType: 'lead',
        configJson: {
          lead_fields: ['name', 'email', 'phone', 'consent'],
          consent_required: true,
        },
        description: 'Local test lead offer for Amazon employees (Expedia).',
        discountValue: 'Special travel deal',
        discountType: 'SPECIAL',
        active: true,
        verified: true,
      },
      select: { id: true, title: true, offerType: true },
    });

    res.json({
      status: 'ok',
      companies: {
        amazonId: amazon.id,
        microsoftId: microsoft.id,
      },
      vendors: {
        bmoVendorId: bmoVendor.id,
        kiaSurreyVendorId: kiaVendor.id,
        expediaVendorId: expediaVendor.id,
      },
      offers: {
        leadOfferId: leadOffer.id,
        kiaLeadOfferId: kiaLeadOffer.id,
        expediaLeadOfferId: expediaLeadOffer.id,
      },
      localTesting: {
        allowedDomainInjected: testDomain,
        vendorNotificationEmail,
      },
      credentials: {
        vendorEmail: bmoUser.email,
        vendorPassword: 'DevVendor@123',
      },
    });
  } catch (error) {
    console.error('Dev seed error:', error);
    res.status(500).json({ error: 'Failed to seed dev data' });
  }
});

export default router;
