import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import * as dashboardService from './dashboard.service';

const router = Router();

const DASHBOARD_ROLES = ['OWNER', 'HEAD_COACH', 'ACCOUNTANT'] as const;

router.use(authenticate, authorize(...DASHBOARD_ROLES));

router.get(
  '/overview',
  asyncHandler(async (_req: Request, res: Response) => {
    const stats = await dashboardService.getOverviewStats();
    res.status(200).json({ success: true, data: stats });
  }),
);

router.get(
  '/trend',
  asyncHandler(async (_req: Request, res: Response) => {
    const trend = await dashboardService.getMonthlyTrend();
    res.status(200).json({ success: true, data: { trend } });
  }),
);

router.get(
  '/activity',
  asyncHandler(async (_req: Request, res: Response) => {
    const activity = await dashboardService.getRecentActivity();
    res.status(200).json({ success: true, data: { activity } });
  }),
);

export default router;
