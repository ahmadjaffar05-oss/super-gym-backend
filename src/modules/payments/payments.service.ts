import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreatePaymentInput, ListPaymentsQuery, MarkPaidInput } from './payments.validation';

const PAYMENT_INCLUDE = {
  member: {
    select: {
      id: true,
      memberCode: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
} as const;

export async function listPayments(query: ListPaymentsQuery) {
  const { search, status, page, pageSize } = query;

  const where = {
    ...(status !== 'ALL' ? { status } : {}),
    ...(search
      ? {
          OR: [
            { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
            { member: { memberCode: { contains: search, mode: 'insensitive' as const } } },
            { member: { user: { firstName: { contains: search, mode: 'insensitive' as const } } } },
            { member: { user: { lastName: { contains: search, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  };

  const [payments, total, summary] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    payments,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
    outstanding: { count: summary._count, amount: Number(summary._sum.amount ?? 0) },
  };
}

export async function createPayment(input: CreatePaymentInput) {
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw ApiError.badRequest('Member not found');

  return prisma.payment.create({
    data: {
      memberId: input.memberId,
      invoiceNumber: `INV-${Date.now()}`,
      amount: input.amount,
      method: input.method,
      status: input.status,
      dueDate: input.dueDate,
      notes: input.notes,
      paidAt: input.status === 'PAID' ? new Date() : null,
    },
    include: PAYMENT_INCLUDE,
  });
}

export async function markPaymentPaid(id: string, input: MarkPaidInput) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status === 'PAID') throw ApiError.badRequest('This payment is already marked as paid');

  return prisma.payment.update({
    where: { id },
    data: { status: 'PAID', method: input.method, paidAt: new Date() },
    include: PAYMENT_INCLUDE,
  });
}

export async function cancelPayment(id: string) {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status === 'PAID') throw ApiError.badRequest('Cannot cancel a payment that has already been paid');

  return prisma.payment.update({ where: { id }, data: { status: 'CANCELLED' }, include: PAYMENT_INCLUDE });
}

/** Marks any still-PENDING payment whose due date has passed as OVERDUE. Safe to call repeatedly (e.g. from a scheduled job). */
export async function sweepOverduePayments(): Promise<number> {
  const result = await prisma.payment.updateMany({
    where: { status: 'PENDING', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
  return result.count;
}
