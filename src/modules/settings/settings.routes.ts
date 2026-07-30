import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../config/prisma';

const router = Router();
router.use(authenticate);

router.get(
  '/gym',
  asyncHandler(async (_req: Request, res: Response) => {
    const settings = await prisma.gymSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
    });
    res.status(200).json({ success: true, data: { settings } });
  }),
);

const updateGymSettingsSchema = z.object({
  gymName: z.string().min(1).max(150).optional(),
  managerName: z.string().min(1).max(150).optional(),
  logoUrl: z.string().url().optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
  workingHours: z.record(z.string(), z.object({ start: z.string(), end: z.string() }).nullable()).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(60).optional(),
});

router.patch(
  '/gym',
  authorize('OWNER'),
  validate({ body: updateGymSettingsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await prisma.gymSettings.upsert({
      where: { id: 'default' },
      update: req.body,
      create: { id: 'default', ...req.body },
    });
    res.status(200).json({ success: true, data: { settings } });
  }),
);

// --- User / permissions administration ------------------------------------

router.get(
  '/users',
  authorize('OWNER', 'HEAD_COACH'),
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: { users } });
  }),
);

const setActiveSchema = z.object({ isActive: z.boolean() });

router.patch(
  '/users/:id/active',
  authorize('OWNER'),
  validate({ params: z.object({ id: z.string().uuid() }), body: setActiveSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.params.id === req.user!.id) {
      throw ApiError.badRequest('You cannot deactivate your own account');
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
      select: { id: true, isActive: true },
    });
    res.status(200).json({ success: true, data: { user } });
  }),
);

export default router;
