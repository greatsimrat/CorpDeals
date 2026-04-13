import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, requireVendorOnly } from '../middleware/auth';
import { getVendorBillingState } from '../lib/vendor-billing';

const router = Router();

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

// Get all vendors (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = firstString(req.query.status);
    const search = firstString(req.query.search);

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { contactName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(vendors);
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Failed to get vendors' });
  }
});

// Get vendor by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
        offers: {
          include: {
            company: true,
            category: true,
          },
        },
      },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    // Only allow admin or the vendor themselves to view
    if (req.user?.role !== 'ADMIN' && vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(vendor);
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to get vendor' });
  }
});

// Update vendor
router.patch('/:id', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = firstString(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'Invalid vendor id' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    // Only allow admin or the vendor themselves to update
    if (req.user?.role !== 'ADMIN' && vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const data: Record<string, unknown> = {};
    const setString = (
      key: 'companyName' | 'contactName' | 'phone' | 'website' | 'logo' | 'description' | 'businessEmail' | 'notes' | 'city' | 'businessType',
      value: unknown,
      options?: { nullable?: boolean }
    ) => {
      if (value === undefined) return;
      const normalized = String(value || '').trim();
      if (!normalized && options?.nullable) {
        data[key] = null;
        return;
      }
      data[key] = normalized;
    };

    setString('companyName', req.body?.companyName);
    setString('contactName', req.body?.contactName);
    setString('phone', req.body?.phone, { nullable: true });
    setString('website', req.body?.website, { nullable: true });
    setString('logo', req.body?.logo, { nullable: true });
    setString('description', req.body?.description, { nullable: true });
    setString('businessEmail', req.body?.businessEmail, { nullable: true });
    setString('notes', req.body?.notes, { nullable: true });
    setString('city', req.body?.city, { nullable: true });
    setString('businessType', req.body?.businessType, { nullable: true });

    if (!Object.keys(data).length) {
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: data as any,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Get current vendor profile
router.get('/me/profile', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentVendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });

    if (!currentVendor) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    await getVendorBillingState(currentVendor.id);

    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
      include: {
        offers: {
          include: {
            company: true,
            category: true,
            _count: { select: { leads: true } },
          },
        },
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor profile not found' });
      return;
    }

    res.json(vendor);
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: 'Failed to get vendor profile' });
  }
});

export default router;
