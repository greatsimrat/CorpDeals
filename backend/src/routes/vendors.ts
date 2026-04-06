import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin, requireVendorOnly } from '../middleware/auth';

const router = Router();

const firstString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

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
    const normalizedCompanyName = String(companyName || '').trim();
    const normalizedContactName = String(contactName || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');

    if (!normalizedCompanyName || !normalizedContactName || !normalizedEmail || !normalizedPassword) {
      res.status(400).json({
        error: 'companyName, contactName, email, and password are required',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ error: 'A valid email is required' });
      return;
    }

    if (normalizedPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    // Create user and vendor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with VENDOR role (pending approval)
      const passwordHash = await bcrypt.hash(normalizedPassword, 10);
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: normalizedContactName,
          role: 'VENDOR',
        },
      });

      // Create vendor profile
      const vendor = await tx.vendor.create({
        data: {
          userId: user.id,
          companyName: normalizedCompanyName,
          contactName: normalizedContactName,
          email: normalizedEmail,
          phone,
          website,
          businessType,
          description,
          status: 'PENDING',
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { vendorId: vendor.id } as any,
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

    const { companyName, contactName, phone, website, logo, description } = req.body;

    const updated = await prisma.vendor.update({
      where: { id },
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
router.get('/me/profile', authenticateToken, requireVendorOnly, async (req: Request, res: Response): Promise<void> => {
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
