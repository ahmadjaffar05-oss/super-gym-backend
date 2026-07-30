import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../config/prisma';

const router = Router();
router.use(authenticate);

const THREAD_INCLUDE = {
  coach: { select: { id: true, user: { select: { id: true, firstName: true, lastName: true } } } },
  client: { select: { id: true, user: { select: { id: true, firstName: true, lastName: true } } } },
} as const;

/** Resolves the caller's own Coach or Member id, whichever applies — used to scope chat access to "your own" threads. */
async function resolveSelfScope(userId: string, role: string) {
  if (role === 'CLIENT') {
    const member = await prisma.member.findUnique({ where: { userId } });
    return { memberId: member?.id };
  }
  if (role === 'COACH' || role === 'HEAD_COACH') {
    const coach = await prisma.coach.findUnique({ where: { userId } });
    return { coachId: coach?.id };
  }
  return {}; // Owner/Receptionist/Accountant can see all threads
}

router.get(
  '/threads',
  asyncHandler(async (req: Request, res: Response) => {
    const scope = await resolveSelfScope(req.user!.id, req.user!.role);
    const threads = await prisma.chatThread.findMany({
      where: { ...(scope.memberId ? { clientId: scope.memberId } : {}), ...(scope.coachId ? { coachId: scope.coachId } : {}) },
      include: {
        ...THREAD_INCLUDE,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: { threads } });
  }),
);

const createThreadSchema = z.object({ coachId: z.string().uuid(), clientId: z.string().uuid() });

router.post(
  '/threads',
  validate({ body: createThreadSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const thread = await prisma.chatThread.upsert({
      where: { coachId_clientId: { coachId: req.body.coachId, clientId: req.body.clientId } },
      update: {},
      create: { coachId: req.body.coachId, clientId: req.body.clientId },
      include: THREAD_INCLUDE,
    });
    res.status(201).json({ success: true, data: { thread } });
  }),
);

router.get(
  '/threads/:id/messages',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    const messages = await prisma.message.findMany({
      where: { threadId: req.params.id },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json({ success: true, data: { messages } });
  }),
);

const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000).optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.enum(['IMAGE', 'FILE']).optional(),
});

router.post(
  '/threads/:id/messages',
  validate({ params: z.object({ id: z.string().uuid() }), body: sendMessageSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const thread = await prisma.chatThread.findUnique({ where: { id: req.params.id } });
    if (!thread) throw ApiError.notFound('Conversation not found');
    if (!req.body.body && !req.body.attachmentUrl) {
      throw ApiError.badRequest('Message must include text or an attachment');
    }

    const message = await prisma.message.create({
      data: { threadId: req.params.id, senderId: req.user!.id, ...req.body },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    res.status(201).json({ success: true, data: { message } });
  }),
);

router.post(
  '/threads/:id/read',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    await prisma.message.updateMany({
      where: { threadId: req.params.id, senderId: { not: req.user!.id }, readAt: null },
      data: { readAt: new Date() },
    });
    res.status(200).json({ success: true, data: null });
  }),
);

export default router;
