import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, requireAdmin);

// Dashboard stats
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalVendors,
      pendingVendors,
      approvedVendors,
      totalCompanies,
      totalOffers,
      activeOffers,
      totalLeads,
      pendingRequests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: 'PENDING' } }),
      prisma.vendor.count({ where: { status: 'APPROVED' } }),
      prisma.company.count(),
      prisma.offer.count(),
      prisma.offer.count({ where: { active: true } }),
      prisma.lead.count(),
      prisma.vendorRequest.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      users: totalUsers,
      vendors: {
        total: totalVendors,
        pending: pendingVendors,
        approved: approvedVendors,
      },
      companies: totalCompanies,
      offers: {
        total: totalOffers,
        active: activeOffers,
      },
      leads: totalLeads,
      pendingRequests,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get all vendor requests
router.get('/vendor-requests', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.vendorRequest.findMany({
      where,
      include: {
        vendor: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        reviewedBy: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(requests);
  } catch (error) {
    console.error('Get vendor requests error:', error);
    res.status(500).json({ error: 'Failed to get vendor requests' });
  }
});

// Get single vendor request
router.get('/vendor-requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const request = await prisma.vendorRequest.findUnique({
      where: { id: req.params.id },
      include: {
        vendor: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        reviewedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!request) {
      res.status(404).json({ error: 'Vendor request not found' });
      return;
    }

    res.json(request);
  } catch (error) {
    console.error('Get vendor request error:', error);
    res.status(500).json({ error: 'Failed to get vendor request' });
  }
});

// Approve or reject vendor request
router.patch('/vendor-requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, reviewNotes } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const request = await prisma.vendorRequest.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Vendor request not found' });
      return;
    }

    // Update request and vendor status in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedRequest = await tx.vendorRequest.update({
        where: { id: req.params.id },
        data: {
          status,
          reviewNotes,
          reviewedById: req.user!.id,
          reviewedAt: new Date(),
        },
      });

      const updatedVendor = await tx.vendor.update({
        where: { id: request.vendorId },
        data: {
          status: status as 'APPROVED' | 'REJECTED',
        },
      });

      return { request: updatedRequest, vendor: updatedVendor };
    });

    res.json(result);
  } catch (error) {
    console.error('Update vendor request error:', error);
    res.status(500).json({ error: 'Failed to update vendor request' });
  }
});

// Get all users
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        vendor: {
          select: { id: true, companyName: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user role
router.patch('/users/:id/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;

    if (!['ADMIN', 'VENDOR', 'EMPLOYEE'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    res.json(user);
  } catch (error: any) {
    console.error('Update user role error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Create vendor directly (admin)
router.post('/vendors', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      password,
      companyName,
      contactName,
      phone,
      website,
      businessType,
      description,
    } = req.body;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: contactName,
          role: 'VENDOR',
        },
      });

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
          status: 'APPROVED', // Pre-approved when created by admin
        },
      });

      return { user, vendor };
    });

    res.status(201).json(result.vendor);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

export default router;
