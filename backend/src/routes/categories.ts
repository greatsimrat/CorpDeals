import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { getActiveVendorBillingRelationFilter, syncExpiredVendorPlans } from '../lib/vendor-billing';
import { getCategoryDeleteSafety, slugifyCategoryName } from '../lib/category-management';

const router = Router();

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

const isTruthy = (value: unknown) =>
  value === true || value === 'true' || value === '1' || value === 1;

// Get all categories (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true } as any,
      include: {
        parent: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        children: {
          where: { active: true } as any,
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            active: true,
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

// Admin categories management tree (admin only)
router.get(
  '/manage/tree',
  authenticateToken,
  requireAdmin,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = await prisma.category.findMany({
        where: { parentId: null } as any,
        include: {
          _count: { select: { children: true, offers: true } },
          children: {
            include: {
              _count: { select: { offers: true } },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.json(categories);
    } catch (error) {
      console.error('Get admin categories tree error:', error);
      res.status(500).json({ error: 'Failed to get admin categories tree' });
    }
  }
);

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
        active: true,
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
          where: { active: true } as any,
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
    const active = req.body?.active === undefined ? true : isTruthy(req.body?.active);

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }

    const finalSlug = slugifyCategoryName(String(slug || '').trim() || trimmedName);
    if (!finalSlug) {
      res.status(400).json({ error: 'Category slug is required' });
      return;
    }

    let normalizedParentId: string | null = null;
    let parentCategoryActive = true;
    if (parentId !== undefined && parentId !== null && String(parentId).trim() !== '') {
      normalizedParentId = String(parentId).trim();
      const parent = await prisma.category.findUnique({
        where: { id: normalizedParentId },
        select: { id: true, active: true },
      });
      if (!parent) {
        res.status(400).json({ error: 'Parent category not found' });
        return;
      }
      parentCategoryActive = Boolean(parent.active);
    }

    if (active && normalizedParentId && !parentCategoryActive) {
      res.status(400).json({ error: 'Cannot activate subcategory under an inactive parent category' });
      return;
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        slug: finalSlug,
        icon,
        description,
        color,
        bgColor,
        image,
        parentId: normalizedParentId,
        active,
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
    const activeRaw = req.body?.active;

    let parentCategoryActive = true;
    if (parentId !== undefined && parentId !== null && String(parentId).trim() !== '') {
      const normalizedParentId = String(parentId).trim();
      if (normalizedParentId === id) {
        res.status(400).json({ error: 'Category cannot be its own parent' });
        return;
      }
      const parent = await prisma.category.findUnique({
        where: { id: normalizedParentId },
        select: { id: true, active: true },
      });
      if (!parent) {
        res.status(400).json({ error: 'Parent category not found' });
        return;
      }
      parentCategoryActive = Boolean(parent.active);
    }

    const nextActive =
      activeRaw === undefined
        ? undefined
        : isTruthy(activeRaw);
    const requestedParentId =
      parentId === undefined || parentId === null || String(parentId).trim() === ''
        ? null
        : String(parentId).trim();

    if (nextActive === true && requestedParentId && !parentCategoryActive) {
      res.status(400).json({ error: 'Cannot activate subcategory under an inactive parent category' });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug: slug ? slugifyCategoryName(String(slug)) : slug,
        icon,
        description,
        color,
        bgColor,
        image,
        ...(activeRaw === undefined ? {} : { active: nextActive }),
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

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            children: true,
            offers: true,
            vendorLeadEventsAsCategory: true,
            vendorLeadEventsAsSubcategory: true,
          },
        },
      },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const isSubcategory = Boolean(category.parentId);
    const leadEventCount = isSubcategory
      ? Number((category as any)._count?.vendorLeadEventsAsSubcategory || 0)
      : Number((category as any)._count?.vendorLeadEventsAsCategory || 0);
    const safety = getCategoryDeleteSafety({
      isSubcategory,
      childCount: Number((category as any)._count?.children || 0),
      offerCount: Number((category as any)._count?.offers || 0),
      leadEventCount,
    });

    if (!safety.canDelete) {
      res.status(409).json({
        error: safety.message,
        code: safety.code,
        recommendation: 'Deactivate this category instead of deleting it.',
      });
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
