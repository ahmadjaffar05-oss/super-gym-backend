import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createBodyMetricSchema,
  listBodyMetricsQuerySchema,
  addProgressPhotoSchema,
} from './body-metrics.validation';
import { idParamSchema } from '../programs/programs.validation';
import * as bodyMetricsService from './body-metrics.service';

const router = Router();

const COACHING_ROLES = ['OWNER', 'HEAD_COACH', 'COACH'] as const;
const VIEW_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST'] as const;

router.use(authenticate);

router.get(
  '/',
  authorize(...VIEW_ROLES),
  validate({ query: listBodyMetricsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { memberId, limit } = req.query as unknown as { memberId: string; limit: number };
    const metrics = await bodyMetricsService.listBodyMetrics(memberId, limit);
    res.status(200).json({ success: true, data: { metrics } });
  }),
);

router.post(
  '/',
  authorize(...COACHING_ROLES),
  validate({ body: createBodyMetricSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const metric = await bodyMetricsService.createBodyMetric(req.body);
    res.status(201).json({ success: true, data: { metric } });
  }),
);

router.delete(
  '/:id',
  authorize(...COACHING_ROLES),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await bodyMetricsService.deleteBodyMetric(req.params.id);
    res.status(204).send();
  }),
);

router.get(
  '/photos/:memberId',
  authorize(...VIEW_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const photos = await bodyMetricsService.listProgressPhotos(req.params.memberId);
    res.status(200).json({ success: true, data: { photos } });
  }),
);

router.post(
  '/photos',
  authorize(...COACHING_ROLES),
  validate({ body: addProgressPhotoSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const photo = await bodyMetricsService.addProgressPhoto(req.body);
    res.status(201).json({ success: true, data: { photo } });
  }),
);

export default router;
