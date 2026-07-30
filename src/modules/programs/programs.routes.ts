import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createExerciseSchema,
  createProgramSchema,
  updateProgramSchema,
  listProgramsQuerySchema,
  idParamSchema,
} from './programs.validation';
import * as programsService from './programs.service';

const router = Router();

const COACHING_ROLES = ['OWNER', 'HEAD_COACH', 'COACH'] as const;
const VIEW_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST'] as const;

router.use(authenticate);

// --- Exercise library ---------------------------------------------------

router.get(
  '/exercises',
  authorize(...VIEW_ROLES),
  asyncHandler(async (_req: Request, res: Response) => {
    const exercises = await programsService.listExercises();
    res.status(200).json({ success: true, data: { exercises } });
  }),
);

router.post(
  '/exercises',
  authorize(...COACHING_ROLES),
  validate({ body: createExerciseSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const exercise = await programsService.createExercise(req.body);
    res.status(201).json({ success: true, data: { exercise } });
  }),
);

router.delete(
  '/exercises/:id',
  authorize(...COACHING_ROLES),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await programsService.deleteExercise(req.params.id);
    res.status(204).send();
  }),
);

// --- Training programs ---------------------------------------------------

router.get(
  '/',
  authorize(...VIEW_ROLES),
  validate({ query: listProgramsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await programsService.listPrograms(req.query as never);
    res.status(200).json({ success: true, data: result });
  }),
);

router.get(
  '/:id',
  authorize(...VIEW_ROLES),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const program = await programsService.getProgramById(req.params.id);
    res.status(200).json({ success: true, data: { program } });
  }),
);

router.post(
  '/',
  authorize(...COACHING_ROLES),
  validate({ body: createProgramSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const program = await programsService.createProgram(req.body, req.user!.id);
    res.status(201).json({ success: true, data: { program } });
  }),
);

router.patch(
  '/:id',
  authorize(...COACHING_ROLES),
  validate({ params: idParamSchema, body: updateProgramSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const program = await programsService.updateProgram(req.params.id, req.body);
    res.status(200).json({ success: true, data: { program } });
  }),
);

router.delete(
  '/:id',
  authorize(...COACHING_ROLES),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await programsService.deleteProgram(req.params.id);
    res.status(204).send();
  }),
);

router.post(
  '/:id/duplicate',
  authorize(...COACHING_ROLES),
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const program = await programsService.duplicateProgram(req.params.id, req.body?.memberId);
    res.status(201).json({ success: true, data: { program } });
  }),
);

export default router;
