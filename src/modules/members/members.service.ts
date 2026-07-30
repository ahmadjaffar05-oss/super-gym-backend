import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { hashPassword } from '../../utils/password';
import type {
  CreateMemberInput,
  UpdateMemberInput,
  ListMembersQuery,
  FreezeMembershipInput,
  RenewMembershipInput,
} from './members.validation';

const MEMBER_LIST_INCLUDE = {
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
  assignedCoach: {
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  },
  memberships: {
    orderBy: { startDate: 'desc' as const },
    take: 1,
    include: { plan: true },
  },
} as const;

const MEMBER_DETAIL_INCLUDE = {
  ...MEMBER_LIST_INCLUDE,
  memberships: {
    orderBy: { startDate: 'desc' as const },
    include: { plan: true },
  },
  payments: { orderBy: { createdAt: 'desc' as const }, take: 20 },
  attendances: { orderBy: { checkInAt: 'desc' as const }, take: 30 },
  bodyMetrics: { orderBy: { recordedAt: 'desc' as const }, take: 12 },
} as const;

async function generateMemberCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.member.count();
  return `SG-${year}-${String(count + 1).padStart(5, '0')}`;
}

export async function createMember(input: CreateMemberInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('A user with this email already exists');
  }

  if (input.assignedCoachId) {
    const coach = await prisma.coach.findUnique({ where: { id: input.assignedCoachId } });
    if (!coach) throw ApiError.badRequest('Assigned coach not found');
  }

  const passwordHash = await hashPassword(input.password);
  const memberCode = await generateMemberCode();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: 'CLIENT',
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
    });

    const member = await tx.member.create({
      data: {
        userId: user.id,
        memberCode,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        address: input.address,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        medicalConditions: input.medicalConditions,
        injuries: input.injuries,
        assignedCoachId: input.assignedCoachId,
      },
    });

    if (input.planId) {
      const plan = await tx.membershipPlan.findUnique({ where: { id: input.planId } });
      if (!plan) throw ApiError.badRequest('Selected membership plan not found');

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + plan.durationDays * 86_400_000);

      const membership = await tx.membership.create({
        data: { memberId: member.id, planId: plan.id, startDate, endDate, status: 'ACTIVE' },
      });

      await tx.payment.create({
        data: {
          memberId: member.id,
          membershipId: membership.id,
          invoiceNumber: `INV-${Date.now()}`,
          amount: plan.price,
          status: 'PENDING',
          dueDate: startDate,
        },
      });
    }

    return tx.member.findUniqueOrThrow({ where: { id: member.id }, include: MEMBER_LIST_INCLUDE });
  });
}

export async function listMembers(query: ListMembersQuery) {
  const { search, status, coachId, page, pageSize, sortBy, sortDir } = query;

  const where = {
    ...(coachId ? { assignedCoachId: coachId } : {}),
    ...(status !== 'ALL' ? { memberships: { some: { status } } } : {}),
    ...(search
      ? {
          OR: [
            { memberCode: { contains: search, mode: 'insensitive' as const } },
            { user: { firstName: { contains: search, mode: 'insensitive' as const } } },
            { user: { lastName: { contains: search, mode: 'insensitive' as const } } },
            { user: { email: { contains: search, mode: 'insensitive' as const } } },
            { user: { phone: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const orderBy =
    sortBy === 'joinedAt' ? { joinedAt: sortDir } : { user: { [sortBy]: sortDir } };

  const [members, total] = await prisma.$transaction([
    prisma.member.findMany({
      where,
      include: MEMBER_LIST_INCLUDE,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.member.count({ where }),
  ]);

  return {
    members,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getMemberById(id: string) {
  const member = await prisma.member.findUnique({ where: { id }, include: MEMBER_DETAIL_INCLUDE });
  if (!member) throw ApiError.notFound('Member not found');
  return member;
}

export async function updateMember(id: string, input: UpdateMemberInput) {
  await ensureMemberExists(id);

  if (input.assignedCoachId) {
    const coach = await prisma.coach.findUnique({ where: { id: input.assignedCoachId } });
    if (!coach) throw ApiError.badRequest('Assigned coach not found');
  }

  const { firstName, lastName, phone, ...memberFields } = input;

  return prisma.$transaction(async (tx) => {
    if (firstName || lastName || phone) {
      const member = await tx.member.findUniqueOrThrow({ where: { id } });
      await tx.user.update({
        where: { id: member.userId },
        data: { firstName, lastName, phone },
      });
    }

    return tx.member.update({
      where: { id },
      data: memberFields,
      include: MEMBER_LIST_INCLUDE,
    });
  });
}

export async function deleteMember(id: string): Promise<void> {
  const member = await ensureMemberExists(id);
  // Cascading deletes (memberships, payments, attendance, etc.) are
  // enforced at the schema level via onDelete: Cascade on the Member
  // relation, and Member itself cascades from User.
  await prisma.user.delete({ where: { id: member.userId } });
}

export async function freezeMembership(memberId: string, input: FreezeMembershipInput) {
  const membership = await getActiveMembership(memberId);

  return prisma.membership.update({
    where: { id: membership.id },
    data: {
      status: 'FROZEN',
      frozenAt: new Date(),
      freezeDays: input.freezeDays,
      endDate: new Date(membership.endDate.getTime() + input.freezeDays * 86_400_000),
    },
  });
}

export async function unfreezeMembership(memberId: string) {
  const membership = await prisma.membership.findFirst({
    where: { memberId, status: 'FROZEN' },
    orderBy: { startDate: 'desc' },
  });
  if (!membership) throw ApiError.badRequest('This member has no frozen membership');

  return prisma.membership.update({
    where: { id: membership.id },
    data: { status: 'ACTIVE', frozenAt: null },
  });
}

export async function renewMembership(memberId: string, input: RenewMembershipInput) {
  await ensureMemberExists(memberId);

  const plan = await prisma.membershipPlan.findUnique({ where: { id: input.planId } });
  if (!plan) throw ApiError.badRequest('Membership plan not found');

  const startDate = input.startDate ?? new Date();
  const endDate = new Date(startDate.getTime() + plan.durationDays * 86_400_000);

  return prisma.$transaction(async (tx) => {
    // Any currently-active membership is superseded by the new one.
    await tx.membership.updateMany({
      where: { memberId, status: { in: ['ACTIVE', 'FROZEN'] } },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    const membership = await tx.membership.create({
      data: {
        memberId,
        planId: plan.id,
        startDate,
        endDate,
        status: 'ACTIVE',
        autoRenew: input.autoRenew,
      },
    });

    await tx.payment.create({
      data: {
        memberId,
        membershipId: membership.id,
        invoiceNumber: `INV-${Date.now()}`,
        amount: plan.price,
        status: 'PENDING',
        dueDate: startDate,
      },
    });

    return tx.membership.findUniqueOrThrow({ where: { id: membership.id }, include: { plan: true } });
  });
}

async function ensureMemberExists(id: string) {
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) throw ApiError.notFound('Member not found');
  return member;
}

async function getActiveMembership(memberId: string) {
  const membership = await prisma.membership.findFirst({
    where: { memberId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });
  if (!membership) throw ApiError.badRequest('This member has no active membership to freeze');
  return membership;
}
