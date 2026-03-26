import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const leads = await prisma.lead.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        offer: {
          select: {
            id: true,
            title: true,
            vendor: {
              select: {
                companyName: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    res.json({
      leads: leads.map((lead) => ({
        id: lead.id,
        offer_id: lead.offer.id,
        offer_title: lead.offer.title,
        company: lead.company,
        vendor_name: lead.offer.vendor.companyName,
        status: lead.status.toLowerCase(),
        created_at: lead.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get my applications error:', {
      userId: req.user?.id,
      error,
    });
    res.status(500).json({ error: 'Failed to fetch my applications' });
  }
});

export default router;
