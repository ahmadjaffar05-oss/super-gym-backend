import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCoachSchema,
  updateCoachSchema,
  listCoachesQuerySchema,
  coachIdParamSchema,
} from './coaches.validation';
import * as coachesService from './coaches.service';

const router = Router();

const MANAGE_ROLES = ['OWNER', 'HEAD_COACH'] as const;
const VIEW_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST', 'ACCOUNTANT'] as const;

router.use(authenticate);

router.get(
  '/',
  authorize(...VIEW_ROLES),
  validate({ query: listCoachesQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await coachesService.listCoaches(req.query as never);
    res.status(200).json({ success: true, data: result });
  }),
);

router.post(
  '/',
  authorize(...MANAGE_ROLES),
  validate({ body: createCoachSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const coach = await coachesService.createCoach(req.body);
    res.status(201).json({ success: true, data: { coach } });
  }),
);

router.get(
  '/:id',
  authorize(...VIEW_ROLES),
  validate({ params: coachIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const coach = await coachesService.getCoachById(req.params.id);
    res.status(200).json({ success: true, data: { coach } });
  }),
);

router.patch(
  '/:id',
  authorize(...MANAGE_ROLES),
  validate({ params: coachIdParamSchema, body: updateCoachSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const coach = await coachesService.updateCoach(req.params.id, req.body);
    res.status(200).json({ success: true, data: { coach } });
  }),
);

router.delete(
  '/:id',
  authorize('OWNER'),
  validate({ params: coachIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await coachesService.deleteCoach(req.params.id);
    res.status(204).send();
  }),
);

export default router;
