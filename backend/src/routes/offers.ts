import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, requireVendor } from '../middleware/auth';

const router = Router();

// Get all offers (public)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, categoryId, vendorId, featured, active, search } = req.query;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (categoryId) where.categoryId = categoryId;
    if (vendorId) where.vendorId = vendorId;
    if (featured !== undefined) where.featured = featured === 'true';
    if (active !== undefined) where.active = active === 'true';
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const offers = await prisma.offer.findMany({
      where,
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true },
        },
        company: {
          select: { id: true, name: true, slug: true, logo: true },
        },
        category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(offers);
  } catch (error) {
    console.error('Get offers error:', error);
    res.status(500).json({ error: 'Failed to get offers' });
  }
});

// Get offer by ID (public)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true, website: true },
        },
        company: true,
        category: true,
      },
    });

    if (!offer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    res.json(offer);
  } catch (error) {
    console.error('Get offer error:', error);
    res.status(500).json({ error: 'Failed to get offer' });
  }
});

// Create offer (vendor or admin)
router.post('/', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyId,
      categoryId,
      title,
      description,
      discountValue,
      discountType,
      originalPrice,
      discountedPrice,
      terms,
      howToClaim,
      expiryDate,
      featured,
      location,
      image,
    } = req.body;

    // Get vendor ID for the current user
    let vendorId: string;

    if (req.user?.role === 'ADMIN') {
      // Admin can specify vendor ID
      vendorId = req.body.vendorId;
      if (!vendorId) {
        res.status(400).json({ error: 'Vendor ID required for admin' });
        return;
      }
    } else {
      // Get vendor for current user
      const vendor = await prisma.vendor.findUnique({
        where: { userId: req.user!.id },
      });

      if (!vendor) {
        res.status(403).json({ error: 'Vendor profile not found' });
        return;
      }

      if (vendor.status !== 'APPROVED') {
        res.status(403).json({ error: 'Vendor must be approved to create offers' });
        return;
      }

      vendorId = vendor.id;
    }

    const offer = await prisma.offer.create({
      data: {
        vendorId,
        companyId,
        categoryId,
        title,
        description,
        discountValue,
        discountType: discountType || 'PERCENTAGE',
        originalPrice,
        discountedPrice,
        terms: terms || [],
        howToClaim: howToClaim || [],
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        featured: featured || false,
        verified: req.user?.role === 'ADMIN',
        active: true,
        location,
        image,
      },
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true },
        },
        company: true,
        category: true,
      },
    });

    res.status(201).json(offer);
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// Update offer
router.patch('/:id', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const existingOffer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!existingOffer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Check permission
    if (req.user?.role !== 'ADMIN' && existingOffer.vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const {
      companyId,
      categoryId,
      title,
      description,
      discountValue,
      discountType,
      originalPrice,
      discountedPrice,
      terms,
      howToClaim,
      expiryDate,
      featured,
      verified,
      active,
      location,
      image,
    } = req.body;

    const offer = await prisma.offer.update({
      where: { id: req.params.id },
      data: {
        companyId,
        categoryId,
        title,
        description,
        discountValue,
        discountType,
        originalPrice,
        discountedPrice,
        terms,
        howToClaim,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        featured: req.user?.role === 'ADMIN' ? featured : undefined,
        verified: req.user?.role === 'ADMIN' ? verified : undefined,
        active,
        location,
        image,
      },
      include: {
        vendor: {
          select: { id: true, companyName: true, logo: true },
        },
        company: true,
        category: true,
      },
    });

    res.json(offer);
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// Delete offer
router.delete('/:id', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const existingOffer = await prisma.offer.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!existingOffer) {
      res.status(404).json({ error: 'Offer not found' });
      return;
    }

    // Check permission
    if (req.user?.role !== 'ADMIN' && existingOffer.vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.offer.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Offer deleted' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

export default router;
