import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all companies (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, verified } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { domain: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (verified !== undefined) {
      where.verified = verified === 'true';
    }

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: { select: { offers: true, hrContacts: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(companies);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to get companies' });
  }
});

// Get company by ID or slug (public)
router.get('/:idOrSlug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idOrSlug } = req.params;

    const company = await prisma.company.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
      },
      include: {
        offers: {
          where: { active: true },
          include: {
            vendor: {
              select: { companyName: true, logo: true },
            },
            category: true,
          },
        },
        hrContacts: true,
        _count: { select: { offers: true } },
      },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to get company' });
  }
});

// Create company (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      domain,
      logo,
      employeeCount,
      headquarters,
      description,
      verified,
      bannerImage,
      brandColor,
    } = req.body;

    // Generate slug if not provided
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const company = await prisma.company.create({
      data: {
        name,
        slug: finalSlug,
        domain,
        logo,
        employeeCount,
        headquarters,
        description,
        verified: verified || false,
        bannerImage,
        brandColor,
      },
    });

    res.status(201).json(company);
  } catch (error: any) {
    console.error('Create company error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Company with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      slug,
      domain,
      logo,
      employeeCount,
      headquarters,
      description,
      verified,
      bannerImage,
      brandColor,
    } = req.body;

    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: {
        name,
        slug,
        domain,
        logo,
        employeeCount,
        headquarters,
        description,
        verified,
        bannerImage,
        brandColor,
      },
    });

    res.json(company);
  } catch (error: any) {
    console.error('Update company error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.company.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Company deleted' });
  } catch (error: any) {
    console.error('Delete company error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

export default router;
