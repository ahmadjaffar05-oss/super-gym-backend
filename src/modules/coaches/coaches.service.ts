import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { hashPassword } from '../../utils/password';
import type { CreateCoachInput, UpdateCoachInput, ListCoachesQuery } from './coaches.validation';

const COACH_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
    },
  },
  _count: { select: { assignedMembers: true } },
} as const;

export async function createCoach(input: CreateCoachInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists');

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.isHeadCoach ? 'HEAD_COACH' : 'COACH',
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
    });

    const coach = await tx.coach.create({
      data: {
        userId: user.id,
        bio: input.bio,
        specialties: input.specialties,
        experienceYears: input.experienceYears,
        certificates: input.certificates,
        workingHours: input.workingHours,
        salary: input.salary,
        isHeadCoach: input.isHeadCoach,
      },
    });

    return tx.coach.findUniqueOrThrow({ where: { id: coach.id }, include: COACH_INCLUDE });
  });
}

export async function listCoaches(query: ListCoachesQuery) {
  const { search, page, pageSize } = query;

  const where = search
    ? {
        OR: [
          { user: { firstName: { contains: search, mode: 'insensitive' as const } } },
          { user: { lastName: { contains: search, mode: 'insensitive' as const } } },
          { user: { email: { contains: search, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  const [coaches, total] = await prisma.$transaction([
    prisma.coach.findMany({
      where,
      include: COACH_INCLUDE,
      orderBy: { hireDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.coach.count({ where }),
  ]);

  return {
    coaches,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getCoachById(id: string) {
  const coach = await prisma.coach.findUnique({
    where: { id },
    include: {
      ...COACH_INCLUDE,
      assignedMembers: {
        select: { id: true, memberCode: true, user: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!coach) throw ApiError.notFound('Coach not found');
  return coach;
}

export async function updateCoach(id: string, input: UpdateCoachInput) {
  const coach = await prisma.coach.findUnique({ where: { id } });
  if (!coach) throw ApiError.notFound('Coach not found');

  const { firstName, lastName, phone, isHeadCoach, ...coachFields } = input;

  return prisma.$transaction(async (tx) => {
    if (firstName || lastName || phone) {
      await tx.user.update({ where: { id: coach.userId }, data: { firstName, lastName, phone } });
    }
    if (isHeadCoach !== undefined) {
      await tx.user.update({
        where: { id: coach.userId },
        data: { role: isHeadCoach ? 'HEAD_COACH' : 'COACH' },
      });
    }
    return tx.coach.update({
      where: { id },
      data: { ...coachFields, ...(isHeadCoach !== undefined ? { isHeadCoach } : {}) },
      include: COACH_INCLUDE,
    });
  });
}

export async function deleteCoach(id: string): Promise<void> {
  const coach = await prisma.coach.findUnique({ where: { id } });
  if (!coach) throw ApiError.notFound('Coach not found');
  await prisma.user.delete({ where: { id: coach.userId } });
}
