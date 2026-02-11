import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireVendor, requireAdmin } from '../middleware/auth';

const router = Router();

// Submit a lead (public)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      offerId,
      companyId,
      firstName,
      lastName,
      email,
      phone,
      employeeId,
      message,
    } = req.body;

    if (!offerId || !companyId || !firstName || !lastName || !email) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const [offer, company] = await Promise.all([
      prisma.offer.findUnique({ where: { id: offerId }, select: { id: true, companyId: true } }),
      prisma.company.findFirst({
        where: {
          OR: [{ id: companyId }, { slug: companyId }],
        },
        select: { id: true },
      }),
    ]);

    if (!offer) {
      res.status(400).json({ error: 'Offer not found' });
      return;
    }

    if (!company) {
      res.status(400).json({ error: 'Company not found' });
      return;
    }

    if (offer.companyId !== company.id) {
      res.status(400).json({ error: 'Company does not match offer' });
      return;
    }

    const lead = await prisma.lead.create({
      data: {
        offerId: offer.id,
        companyId: company.id,
        firstName,
        lastName,
        email,
        phone,
        employeeId,
        message,
        status: 'NEW',
      },
    });

    // Increment lead count on offer
    await prisma.offer.update({
      where: { id: offerId },
      data: { leadCount: { increment: 1 } },
    });

    res.status(201).json(lead);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to submit lead' });
  }
});

// Get leads for vendor (vendor access)
router.get('/vendor', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, offerId } = req.query;

    // Get vendor for current user
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
    });

    if (!vendor && req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Vendor profile not found' });
      return;
    }

    const where: any = {};
    
    if (req.user?.role !== 'ADMIN') {
      // Get all offers for this vendor
      const vendorOffers = await prisma.offer.findMany({
        where: { vendorId: vendor!.id },
        select: { id: true },
      });
      where.offerId = { in: vendorOffers.map(o => o.id) };
    }

    if (status) where.status = status;
    if (offerId) where.offerId = offerId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        offer: {
          select: { id: true, title: true },
        },
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leads);
  } catch (error) {
    console.error('Get vendor leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Get all leads (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, companyId, offerId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (offerId) where.offerId = offerId;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        offer: {
          include: {
            vendor: {
              select: { id: true, companyName: true },
            },
          },
        },
        company: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(leads);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// Update lead status (vendor or admin)
router.patch('/:id', authenticateToken, requireVendor, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, vendorNotes } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        offer: {
          include: { vendor: true },
        },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Check permission
    if (req.user?.role !== 'ADMIN' && lead.offer.vendor.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: { status, vendorNotes },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

export default router;
