import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { ApiError } from '../../utils/ApiError';
import { prisma } from '../../config/prisma';

const router = Router();

const STAFF_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST'] as const;
router.use(authenticate, authorize(...STAFF_ROLES));

const createAppointmentSchema = z.object({
  type: z.enum(['PRIVATE_SESSION', 'GROUP_CLASS', 'CONSULTATION']),
  coachId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
  title: z.string().min(1).max(150),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  capacity: z.coerce.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().max(1000).optional(),
});

const listQuerySchema = z.object({
  coachId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const APPOINTMENT_INCLUDE = {
  coach: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  member: { select: { id: true, memberCode: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

router.get(
  '/',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { coachId, memberId, from, to } = req.query as unknown as {
      coachId?: string;
      memberId?: string;
      from?: Date;
      to?: Date;
    };
    const appointments = await prisma.appointment.findMany({
      where: {
        ...(coachId ? { coachId } : {}),
        ...(memberId ? { memberId } : {}),
        ...(from || to ? { startsAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startsAt: 'asc' },
    });
    res.status(200).json({ success: true, data: { appointments } });
  }),
);

router.post(
  '/',
  validate({ body: createAppointmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (req.body.endsAt <= req.body.startsAt) {
      throw ApiError.badRequest('End time must be after start time');
    }
    const appointment = await prisma.appointment.create({ data: req.body, include: APPOINTMENT_INCLUDE });
    res.status(201).json({ success: true, data: { appointment } });
  }),
);

router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateAppointmentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Appointment not found');
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: req.body,
      include: APPOINTMENT_INCLUDE,
    });
    res.status(200).json({ success: true, data: { appointment } });
  }),
);

router.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!existing) throw ApiError.notFound('Appointment not found');
    await prisma.appointment.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

export default router;
