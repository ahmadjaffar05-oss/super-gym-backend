import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import type { ListAttendanceQuery } from './attendance.validation';

const ATTENDANCE_INCLUDE = {
  member: {
    select: {
      id: true,
      memberCode: true,
      photoUrl: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function endOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

async function findOpenAttendanceToday(memberId: string) {
  return prisma.attendance.findFirst({
    where: {
      memberId,
      checkOutAt: null,
      checkInAt: { gte: startOfDay(), lt: endOfDay() },
    },
  });
}

/**
 * QR check-in is a toggle: scanning at the door checks a member in;
 * scanning again later the same day (without having checked out yet)
 * checks them out. This mirrors how a single gate/reader is actually
 * used in practice — staff don't want two different flows for entering
 * vs leaving.
 */
export async function qrCheckIn(qrCode: string) {
  const member = await prisma.member.findUnique({
    where: { qrCode },
    select: { id: true, memberCode: true, user: { select: { firstName: true, lastName: true } } },
  });
  if (!member) throw ApiError.notFound('No member found for this QR code');

  const openAttendance = await findOpenAttendanceToday(member.id);

  if (openAttendance) {
    const updated = await prisma.attendance.update({
      where: { id: openAttendance.id },
      data: { checkOutAt: new Date() },
      include: ATTENDANCE_INCLUDE,
    });
    return { action: 'CHECK_OUT' as const, attendance: updated };
  }

  const created = await prisma.attendance.create({
    data: { memberId: member.id, method: 'QR' },
    include: ATTENDANCE_INCLUDE,
  });
  return { action: 'CHECK_IN' as const, attendance: created };
}

export async function manualCheckIn(memberId: string) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) throw ApiError.notFound('Member not found');

  const openAttendance = await findOpenAttendanceToday(memberId);
  if (openAttendance) {
    throw ApiError.conflict('This member is already checked in today');
  }

  return prisma.attendance.create({
    data: { memberId, method: 'MANUAL' },
    include: ATTENDANCE_INCLUDE,
  });
}

export async function checkOut(attendanceId: string) {
  const attendance = await prisma.attendance.findUnique({ where: { id: attendanceId } });
  if (!attendance) throw ApiError.notFound('Attendance record not found');
  if (attendance.checkOutAt) throw ApiError.badRequest('This member has already checked out');

  return prisma.attendance.update({
    where: { id: attendanceId },
    data: { checkOutAt: new Date() },
    include: ATTENDANCE_INCLUDE,
  });
}

export async function listAttendance(query: ListAttendanceQuery) {
  const { date, memberId, page, pageSize } = query;
  const day = date ?? new Date();

  const where = {
    checkInAt: { gte: startOfDay(day), lt: endOfDay(day) },
    ...(memberId ? { memberId } : {}),
  };

  const [records, total] = await prisma.$transaction([
    prisma.attendance.findMany({
      where,
      include: ATTENDANCE_INCLUDE,
      orderBy: { checkInAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    records,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}
