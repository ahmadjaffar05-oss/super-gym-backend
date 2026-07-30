import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createMealPlanSchema,
  logWaterIntakeSchema,
  listMealPlansQuerySchema,
  idParamSchema,
} from './nutrition.validation';
import * as nutritionService from './nutrition.service';

const router = Router();

const COACHING_ROLES = ['OWNER', 'HEAD_COACH', 'COACH'] as const;
const VIEW_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST'] as const;

router.use(authenticate);

router.get(
  '/meal-plans',
  authorize(...VIEW_ROLES),
  validate({ query: listMealPlansQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const mealPlans = await nutritionService.listMealPlans(req.query as never);
    res.status(200).json({ success: true, data: { mealPlans } });
  }),
);

router.post(
  '/meal-plans',
  authorize(...COACHING_ROLES),
  validate({ body: createMealPlanSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const mealPlan = await nutritionService.createMealPlan(req.body);
    res.status(201).json({ success: true, data: { mealPlan } });
  }),
);

router.delete(
  '/meal-plans/:id',
  authorize(...COACHING_ROLES),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await nutritionService.deleteMealPlan(req.params.id);
    res.status(204).send();
  }),
);

router.post(
  '/water-intake',
  authorize(...VIEW_ROLES),
  validate({ body: logWaterIntakeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const log = await nutritionService.logWaterIntake(req.body);
    res.status(201).json({ success: true, data: { log } });
  }),
);

router.get(
  '/water-intake/:memberId/today',
  authorize(...VIEW_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await nutritionService.getTodaysWaterIntake(req.params.memberId);
    res.status(200).json({ success: true, data: result });
  }),
);

export default router;
