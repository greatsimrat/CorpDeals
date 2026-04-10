import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getActiveVendorBillingRelationFilter, syncExpiredVendorPlans } from '../lib/vendor-billing';

const router = Router();

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

// Get all categories (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            _count: { select: { offers: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: { select: { offers: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get category by ID or slug (public)
router.get('/:idOrSlug', async (req: Request, res: Response): Promise<void> => {
  try {
    await syncExpiredVendorPlans();

    const idOrSlug = firstString(req.params.idOrSlug);
    if (!idOrSlug) {
      res.status(400).json({ error: 'Invalid category identifier' });
      return;
    }

    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            offers: {
              where: {
                active: true,
                offerState: 'APPROVED',
                vendor: getActiveVendorBillingRelationFilter() as any,
              } as any,
              include: {
                vendor: {
                  select: { companyName: true, logo: true },
                },
                company: true,
              },
            },
            _count: { select: { offers: true } },
          },
          orderBy: { name: 'asc' },
        },
        offers: {
          where: {
            active: true,
            offerState: 'APPROVED',
            vendor: getActiveVendorBillingRelationFilter() as any,
          } as any,
          include: {
            vendor: {
              select: { companyName: true, logo: true },
            },
            company: true,
          },
        },
        _count: { select: { offers: true } },
      },
    });

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to get category' });
  }
});

// Create category (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, slug, icon, description, color, bgColor, image, parentId } = req.body;

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        name,
        slug: finalSlug,
        icon,
        description,
        color,
        bgColor,
        image,
        parentId: parentId || null,
      },
    });

    res.status(201).json(category);
  } catch (error: any) {
    console.error('Create category error:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Category with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid category id' });
      return;
    }

    const { name, slug, icon, description, color, bgColor, image, parentId } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        icon,
        description,
        color,
        bgColor,
        image,
        parentId: parentId === undefined ? undefined : parentId || null,
      },
    });

    res.json(category);
  } catch (error: any) {
    console.error('Update category error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid category id' });
      return;
    }

    await prisma.category.delete({
      where: { id },
    });

    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    console.error('Delete category error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
