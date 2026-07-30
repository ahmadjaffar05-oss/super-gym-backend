import { z } from 'zod';

export const createExerciseSchema = z.object({
  name: z.string().min(1).max(150),
  muscleGroup: z.string().min(1).max(80),
  equipment: z.string().max(150).optional(),
  videoUrl: z.string().url().optional(),
  instructions: z.string().max(2000).optional(),
});

export const programExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
  sets: z.coerce.number().int().positive(),
  reps: z.coerce.number().int().positive(),
  weight: z.coerce.number().nonnegative().optional(),
  restSeconds: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  order: z.coerce.number().int().nonnegative().default(0),
});

export const createProgramSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(1000).optional(),
  memberId: z.string().uuid().optional(),
  coachId: z.string().uuid().optional(),
  isTemplate: z.boolean().default(false),
  exercises: z.array(programExerciseSchema).min(1),
});

export const updateProgramSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional(),
  exercises: z.array(programExerciseSchema).optional(),
});

export const assignProgramSchema = z.object({
  memberId: z.string().uuid(),
});

export const listProgramsQuerySchema = z.object({
  memberId: z.string().uuid().optional(),
  templatesOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type ListProgramsQuery = z.infer<typeof listProgramsQuerySchema>;
