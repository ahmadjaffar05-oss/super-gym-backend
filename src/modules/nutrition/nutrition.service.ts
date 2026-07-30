import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreateMealPlanInput, LogWaterIntakeInput, ListMealPlansQuery } from './nutrition.validation';

const MEAL_PLAN_INCLUDE = { meals: true } as const;

export async function listMealPlans(query: ListMealPlansQuery) {
  return prisma.mealPlan.findMany({
    where: query.memberId ? { memberId: query.memberId } : {},
    include: MEAL_PLAN_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createMealPlan(input: CreateMealPlanInput) {
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw ApiError.badRequest('Member not found');

  return prisma.mealPlan.create({
    data: {
      memberId: input.memberId,
      name: input.name,
      dailyCalories: input.dailyCalories,
      proteinGrams: input.proteinGrams,
      carbsGrams: input.carbsGrams,
      fatGrams: input.fatGrams,
      isTemplate: input.isTemplate,
      meals: { create: input.meals },
    },
    include: MEAL_PLAN_INCLUDE,
  });
}

export async function deleteMealPlan(id: string): Promise<void> {
  const plan = await prisma.mealPlan.findUnique({ where: { id } });
  if (!plan) throw ApiError.notFound('Meal plan not found');
  await prisma.mealPlan.delete({ where: { id } });
}

export async function logWaterIntake(input: LogWaterIntakeInput) {
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw ApiError.badRequest('Member not found');

  return prisma.waterIntakeLog.create({
    data: { memberId: input.memberId, amountMl: input.amountMl },
  });
}

export async function getTodaysWaterIntake(memberId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const result = await prisma.waterIntakeLog.aggregate({
    where: { memberId, loggedAt: { gte: start } },
    _sum: { amountMl: true },
  });

  return { totalMl: result._sum.amountMl ?? 0 };
}
