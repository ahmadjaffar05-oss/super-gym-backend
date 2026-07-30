import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  qrCheckInSchema,
  manualCheckInSchema,
  checkOutSchema,
  listAttendanceQuerySchema,
} from './attendance.validation';
import * as attendanceService from './attendance.service';

const router = Router();

const FRONT_DESK_ROLES = ['OWNER', 'HEAD_COACH', 'COACH', 'RECEPTIONIST'] as const;

router.use(authenticate, authorize(...FRONT_DESK_ROLES));

router.get(
  '/',
  validate({ query: listAttendanceQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.listAttendance(req.query as never);
    res.status(200).json({ success: true, data: result });
  }),
);

router.post(
  '/qr-check-in',
  validate({ body: qrCheckInSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.qrCheckIn(req.body.qrCode);
    res.status(200).json({ success: true, data: result });
  }),
);

router.post(
  '/manual-check-in',
  validate({ body: manualCheckInSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.manualCheckIn(req.body.memberId);
    res.status(201).json({ success: true, data: { attendance } });
  }),
);

router.post(
  '/check-out',
  validate({ body: checkOutSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const attendance = await attendanceService.checkOut(req.body.attendanceId);
    res.status(200).json({ success: true, data: { attendance } });
  }),
);

export default router;
