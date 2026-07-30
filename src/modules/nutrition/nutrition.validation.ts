import { z } from 'zod';

export const mealSchema = z.object({
  name: z.string().min(1).max(150),
  calories: z.coerce.number().int().nonnegative().optional(),
  protein: z.coerce.number().int().nonnegative().optional(),
  carbs: z.coerce.number().int().nonnegative().optional(),
  fat: z.coerce.number().int().nonnegative().optional(),
  timeOfDay: z.string().max(50).optional(),
});

export const createMealPlanSchema = z.object({
  memberId: z.string().uuid(),
  name: z.string().min(1).max(150),
  dailyCalories: z.coerce.number().int().nonnegative().optional(),
  proteinGrams: z.coerce.number().int().nonnegative().optional(),
  carbsGrams: z.coerce.number().int().nonnegative().optional(),
  fatGrams: z.coerce.number().int().nonnegative().optional(),
  isTemplate: z.boolean().default(false),
  meals: z.array(mealSchema).default([]),
});

export const logWaterIntakeSchema = z.object({
  memberId: z.string().uuid(),
  amountMl: z.coerce.number().int().positive().max(10_000),
});

export const listMealPlansQuerySchema = z.object({
  memberId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export type CreateMealPlanInput = z.infer<typeof createMealPlanSchema>;
export type LogWaterIntakeInput = z.infer<typeof logWaterIntakeSchema>;
export type ListMealPlansQuery = z.infer<typeof listMealPlansQuerySchema>;
