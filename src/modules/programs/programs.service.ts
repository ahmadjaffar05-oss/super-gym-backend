import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import type {
  CreateExerciseInput,
  CreateProgramInput,
  UpdateProgramInput,
  ListProgramsQuery,
} from './programs.validation';

const PROGRAM_INCLUDE = {
  exercises: { include: { exercise: true }, orderBy: { order: 'asc' as const } },
  createdByCoach: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
  member: { select: { id: true, memberCode: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

// --- Exercise library ---------------------------------------------------

export async function listExercises() {
  return prisma.exerciseLibraryItem.findMany({ orderBy: { name: 'asc' } });
}

export async function createExercise(input: CreateExerciseInput) {
  return prisma.exerciseLibraryItem.create({ data: input });
}

export async function deleteExercise(id: string): Promise<void> {
  const exercise = await prisma.exerciseLibraryItem.findUnique({ where: { id } });
  if (!exercise) throw ApiError.notFound('Exercise not found');
  await prisma.exerciseLibraryItem.delete({ where: { id } });
}

// --- Training programs ---------------------------------------------------

export async function listPrograms(query: ListProgramsQuery) {
  const { memberId, templatesOnly, page, pageSize } = query;

  const where = {
    ...(memberId ? { memberId } : {}),
    ...(templatesOnly ? { isTemplate: true } : {}),
  };

  const [programs, total] = await prisma.$transaction([
    prisma.trainingProgram.findMany({
      where,
      include: PROGRAM_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trainingProgram.count({ where }),
  ]);

  return {
    programs,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function getProgramById(id: string) {
  const program = await prisma.trainingProgram.findUnique({ where: { id }, include: PROGRAM_INCLUDE });
  if (!program) throw ApiError.notFound('Program not found');
  return program;
}

export async function createProgram(input: CreateProgramInput, requestingUserId: string) {
  if (input.memberId) {
    const member = await prisma.member.findUnique({ where: { id: input.memberId } });
    if (!member) throw ApiError.badRequest('Member not found');
  }

  const coachId = input.coachId ?? (await resolveCoachIdForUser(requestingUserId));

  const program = await prisma.trainingProgram.create({
    data: {
      name: input.name,
      description: input.description,
      memberId: input.memberId,
      isTemplate: input.isTemplate,
      createdByCoachId: coachId,
      exercises: {
        create: input.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          order: ex.order,
        })),
      },
    },
    include: PROGRAM_INCLUDE,
  });

  return program;
}

async function resolveCoachIdForUser(userId: string): Promise<string> {
  const coach = await prisma.coach.findUnique({ where: { userId } });
  if (!coach) {
    throw ApiError.badRequest(
      'Your account has no coach profile. Specify a coachId to attribute this program to a specific coach.',
    );
  }
  return coach.id;
}

export async function updateProgram(id: string, input: UpdateProgramInput) {
  const existing = await prisma.trainingProgram.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Program not found');

  return prisma.$transaction(async (tx) => {
    if (input.exercises) {
      await tx.programExercise.deleteMany({ where: { programId: id } });
      await tx.programExercise.createMany({
        data: input.exercises.map((ex) => ({
          programId: id,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          order: ex.order,
        })),
      });
    }

    return tx.trainingProgram.update({
      where: { id },
      data: { name: input.name, description: input.description },
      include: PROGRAM_INCLUDE,
    });
  });
}

export async function deleteProgram(id: string): Promise<void> {
  const program = await prisma.trainingProgram.findUnique({ where: { id } });
  if (!program) throw ApiError.notFound('Program not found');
  await prisma.trainingProgram.delete({ where: { id } });
}

/** Duplicates a template (or any program) as a fresh, unassigned template — or directly assigns the copy to a member. */
export async function duplicateProgram(id: string, targetMemberId?: string) {
  const source = await prisma.trainingProgram.findUnique({ where: { id }, include: { exercises: true } });
  if (!source) throw ApiError.notFound('Program not found');

  return prisma.trainingProgram.create({
    data: {
      name: targetMemberId ? source.name : `${source.name} (Copy)`,
      description: source.description,
      isTemplate: !targetMemberId,
      memberId: targetMemberId,
      createdByCoachId: source.createdByCoachId,
      exercises: {
        create: source.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          order: ex.order,
        })),
      },
    },
    include: PROGRAM_INCLUDE,
  });
}
