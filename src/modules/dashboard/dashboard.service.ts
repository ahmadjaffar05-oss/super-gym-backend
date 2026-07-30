import { prisma } from '../../config/prisma';

function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function endOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export async function getOverviewStats() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const [
    monthlyRevenueAgg,
    totalMembers,
    activeMemberships,
    expiredMemberships,
    pendingPayments,
    todaysAttendance,
  ] = await prisma.$transaction([
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.member.count(),
    prisma.membership.count({ where: { status: 'ACTIVE' } }),
    prisma.membership.count({ where: { status: 'EXPIRED' } }),
    prisma.payment.count({ where: { status: { in: ['PENDING', 'OVERDUE'] } } }),
    prisma.attendance.count({ where: { checkInAt: { gte: dayStart, lt: dayEnd } } }),
  ]);

  return {
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
    totalMembers,
    activeMembers: activeMemberships,
    expiredMembers: expiredMemberships,
    pendingPayments,
    todaysAttendance,
  };
}

/** Last 6 months of paid revenue + new member signups, for the trend chart. */
export async function getMonthlyTrend() {
  const months: { label: string; start: Date; end: Date }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({ label: start.toLocaleString('en-US', { month: 'short' }), start, end });
  }

  const results = await Promise.all(
    months.map(async ({ label, start, end }) => {
      const [revenueAgg, newMembers] = await prisma.$transaction([
        prisma.payment.aggregate({
          where: { status: 'PAID', paidAt: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.member.count({ where: { joinedAt: { gte: start, lt: end } } }),
      ]);
      return {
        month: label,
        revenue: Number(revenueAgg._sum.amount ?? 0),
        newMembers,
      };
    }),
  );

  return results;
}

export async function getRecentActivity(limit = 10) {
  const [recentMembers, recentPayments, recentAttendance] = await prisma.$transaction([
    prisma.member.findMany({
      take: limit,
      orderBy: { joinedAt: 'desc' },
      select: { id: true, joinedAt: true, user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: { status: 'PAID' },
      select: {
        id: true,
        amount: true,
        paidAt: true,
        member: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.attendance.findMany({
      take: limit,
      orderBy: { checkInAt: 'desc' },
      select: {
        id: true,
        checkInAt: true,
        member: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
  ]);

  const events = [
    ...recentMembers.map((m) => ({
      id: `member-${m.id}`,
      type: 'NEW_MEMBER' as const,
      description: `${m.user.firstName} ${m.user.lastName} joined SUPER GYM`,
      timestamp: m.joinedAt,
    })),
    ...recentPayments.map((p) => ({
      id: `payment-${p.id}`,
      type: 'PAYMENT' as const,
      description: `${p.member.user.firstName} ${p.member.user.lastName} paid $${Number(p.amount).toFixed(2)}`,
      timestamp: p.paidAt ?? new Date(),
    })),
    ...recentAttendance.map((a) => ({
      id: `attendance-${a.id}`,
      type: 'CHECK_IN' as const,
      description: `${a.member.user.firstName} ${a.member.user.lastName} checked in`,
      timestamp: a.checkInAt,
    })),
  ];

  return events
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}
