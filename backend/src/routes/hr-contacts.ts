import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all HR contacts (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, search } = req.query;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.hRContact.findMany({
      where,
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json(contacts);
  } catch (error) {
    console.error('Get HR contacts error:', error);
    res.status(500).json({ error: 'Failed to get HR contacts' });
  }
});

// Get HR contacts for a company (admin only)
router.get('/company/:companyId', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const contacts = await prisma.hRContact.findMany({
      where: { companyId: req.params.companyId },
      orderBy: [
        { isPrimary: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json(contacts);
  } catch (error) {
    console.error('Get company HR contacts error:', error);
    res.status(500).json({ error: 'Failed to get HR contacts' });
  }
});

// Get HR contact by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await prisma.hRContact.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
      },
    });

    if (!contact) {
      res.status(404).json({ error: 'HR contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    console.error('Get HR contact error:', error);
    res.status(500).json({ error: 'Failed to get HR contact' });
  }
});

// Create HR contact (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyId, name, email, phone, title, isPrimary } = req.body;

    // If setting as primary, unset other primaries for this company
    if (isPrimary) {
      await prisma.hRContact.updateMany({
        where: { companyId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.hRContact.create({
      data: {
        companyId,
        name,
        email,
        phone,
        title,
        isPrimary: isPrimary || false,
      },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Create HR contact error:', error);
    res.status(500).json({ error: 'Failed to create HR contact' });
  }
});

// Update HR contact (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, title, isPrimary } = req.body;

    const existingContact = await prisma.hRContact.findUnique({
      where: { id: req.params.id },
    });

    if (!existingContact) {
      res.status(404).json({ error: 'HR contact not found' });
      return;
    }

    // If setting as primary, unset other primaries for this company
    if (isPrimary && !existingContact.isPrimary) {
      await prisma.hRContact.updateMany({
        where: { companyId: existingContact.companyId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.hRContact.update({
      where: { id: req.params.id },
      data: { name, email, phone, title, isPrimary },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(contact);
  } catch (error) {
    console.error('Update HR contact error:', error);
    res.status(500).json({ error: 'Failed to update HR contact' });
  }
});

// Delete HR contact (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.hRContact.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'HR contact deleted' });
  } catch (error: any) {
    console.error('Delete HR contact error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'HR contact not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete HR contact' });
  }
});

export default router;
