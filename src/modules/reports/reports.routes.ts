import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/prisma';

const router = Router();

const REPORT_ROLES = ['OWNER', 'HEAD_COACH', 'ACCOUNTANT'] as const;
router.use(authenticate, authorize(...REPORT_ROLES));

const rangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

router.get(
  '/financial',
  validate({ query: rangeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as unknown as { from: Date; to: Date };

    const [revenue, expenses, payments] = await prisma.$transaction([
      prisma.payment.aggregate({ where: { status: 'PAID', paidAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { incurredAt: { gte: from, lte: to } }, _sum: { amount: true } }),
      prisma.payment.findMany({
        where: { status: 'PAID', paidAt: { gte: from, lte: to } },
        include: { member: { select: { memberCode: true, user: { select: { firstName: true, lastName: true } } } } },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    const totalRevenue = Number(revenue._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        payments,
      },
    });
  }),
);

router.get(
  '/attendance',
  validate({ query: rangeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as unknown as { from: Date; to: Date };
    const records = await prisma.attendance.findMany({
      where: { checkInAt: { gte: from, lte: to } },
      include: { member: { select: { memberCode: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { checkInAt: 'desc' },
    });
    res.status(200).json({ success: true, data: { count: records.length, records } });
  }),
);

router.get(
  '/membership',
  asyncHandler(async (_req: Request, res: Response) => {
    const [active, expired, frozen, cancelled, pending] = await prisma.$transaction([
      prisma.membership.count({ where: { status: 'ACTIVE' } }),
      prisma.membership.count({ where: { status: 'EXPIRED' } }),
      prisma.membership.count({ where: { status: 'FROZEN' } }),
      prisma.membership.count({ where: { status: 'CANCELLED' } }),
      prisma.membership.count({ where: { status: 'PENDING' } }),
    ]);
    res.status(200).json({ success: true, data: { active, expired, frozen, cancelled, pending } });
  }),
);

/** Simple CSV export for the financial report — Excel opens .csv natively. */
router.get(
  '/financial/export',
  validate({ query: rangeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as unknown as { from: Date; to: Date };
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID', paidAt: { gte: from, lte: to } },
      include: { member: { select: { memberCode: true, user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { paidAt: 'desc' },
    });

    const header = 'Invoice,Member,Code,Amount,Method,Paid At\n';
    const rows = payments
      .map((p) =>
        [
          p.invoiceNumber,
          `${p.member.user.firstName} ${p.member.user.lastName}`,
          p.member.memberCode,
          Number(p.amount).toFixed(2),
          p.method,
          p.paidAt?.toISOString() ?? '',
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
    res.status(200).send(header + rows);
  }),
);

export default router;
