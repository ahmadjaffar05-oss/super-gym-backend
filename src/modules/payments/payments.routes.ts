import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  listPaymentsQuerySchema,
  createPaymentSchema,
  markPaidSchema,
  paymentIdParamSchema,
} from './payments.validation';
import * as paymentsService from './payments.service';

const router = Router();

const MANAGE_ROLES = ['OWNER', 'HEAD_COACH', 'RECEPTIONIST', 'ACCOUNTANT'] as const;

router.use(authenticate, authorize(...MANAGE_ROLES));

router.get(
  '/',
  validate({ query: listPaymentsQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await paymentsService.listPayments(req.query as never);
    res.status(200).json({ success: true, data: result });
  }),
);

router.post(
  '/',
  validate({ body: createPaymentSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.createPayment(req.body);
    res.status(201).json({ success: true, data: { payment } });
  }),
);

router.post(
  '/:id/mark-paid',
  validate({ params: paymentIdParamSchema, body: markPaidSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.markPaymentPaid(req.params.id, req.body);
    res.status(200).json({ success: true, data: { payment } });
  }),
);

router.post(
  '/:id/cancel',
  validate({ params: paymentIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await paymentsService.cancelPayment(req.params.id);
    res.status(200).json({ success: true, data: { payment } });
  }),
);

export default router;
