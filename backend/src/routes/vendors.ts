import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, requireVendor } from '../middleware/auth';

const router = Router();

// Submit vendor application (public)
router.post('/apply', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      companyName,
      contactName,
      email,
      phone,
      website,
      businessType,
      description,
      additionalInfo,
      password,
    } = req.body;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Create user and vendor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with VENDOR role (pending approval)
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: contactName,
          role: 'VENDOR',
        },
      });

      // Create vendor profile
      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName,
          contactName,
          email,
          phone,
          website,
          businessType,
          description,
          status: 'PENDING',
        },
      });

      // Create vendor request
      const request = await tx.vendorRequest.create({
        data: {
          vendorId: vendor.id,
          businessType,
          description,
          additionalInfo,
          status: 'PENDING',
        },
      });

      return { user, vendor, request };
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      vendorId: result.vendor.id,
      requestId: result.request.id,
    });
  } catch (error) {
    console.error('Vendor apply error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get all vendors (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

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
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
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
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
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

    const { companyName, contactName, phone, website, logo, description } = req.body;

    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: {
        companyName,
        contactName,
        phone,
        website,
        logo,
        description,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

// Get current vendor profile
router.get('/me/profile', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
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
