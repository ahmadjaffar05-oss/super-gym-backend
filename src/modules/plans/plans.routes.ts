import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { prisma } from '../../config/prisma';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: Request, res: Response) => {
    const plans = await prisma.membershipPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    res.status(200).json({ success: true, data: { plans } });
  }),
);

export default router;
