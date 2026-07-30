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
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, readAt: null } });
    res.status(200).json({ success: true, data: { notifications, unreadCount } });
  }),
);

router.post(
  '/:id/read',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notification || notification.userId !== req.user!.id) throw ApiError.notFound('Notification not found');
    await prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
    res.status(200).json({ success: true, data: null });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.notification.updateMany({ where: { userId: req.user!.id, readAt: null }, data: { readAt: new Date() } });
    res.status(200).json({ success: true, data: null });
  }),
);

// Owner/staff can broadcast an announcement to every active user (or a single user).
const broadcastSchema = z.object({
  title: z.string().min(1).max(150),
  body: z.string().max(1000).optional(),
  userId: z.string().uuid().optional(),
});

router.post(
  '/announce',
  authorize('OWNER', 'HEAD_COACH', 'RECEPTIONIST'),
  validate({ body: broadcastSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const targets = req.body.userId
      ? [{ id: req.body.userId }]
      : await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });

    await prisma.notification.createMany({
      data: targets.map((u) => ({
        userId: u.id,
        type: 'ANNOUNCEMENT' as const,
        title: req.body.title,
        body: req.body.body,
      })),
    });
    res.status(201).json({ success: true, data: { count: targets.length } });
  }),
);

export default router;
