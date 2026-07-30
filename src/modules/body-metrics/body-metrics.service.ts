import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import type { CreateBodyMetricInput, AddProgressPhotoInput } from './body-metrics.validation';

export async function listBodyMetrics(memberId: string, limit: number) {
  return prisma.bodyMetric.findMany({
    where: { memberId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
}

export async function createBodyMetric(input: CreateBodyMetricInput) {
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw ApiError.badRequest('Member not found');

  // Auto-compute BMI when both weight and the member's on-file height are
  // available, so staff don't have to do the arithmetic by hand at the
  // scale. BMI = weight(kg) / height(m)^2.
  let bmi: number | undefined;
  if (input.weightKg && member.heightCm) {
    const heightM = Number(member.heightCm) / 100;
    bmi = Number((input.weightKg / (heightM * heightM)).toFixed(1));
  }

  return prisma.bodyMetric.create({
    data: {
      memberId: input.memberId,
      weightKg: input.weightKg,
      bodyFatPct: input.bodyFatPct,
      chestCm: input.chestCm,
      waistCm: input.waistCm,
      hipCm: input.hipCm,
      armCm: input.armCm,
      legCm: input.legCm,
      bmi,
      recordedAt: input.recordedAt ?? new Date(),
    },
  });
}

export async function deleteBodyMetric(id: string): Promise<void> {
  const metric = await prisma.bodyMetric.findUnique({ where: { id } });
  if (!metric) throw ApiError.notFound('Body metric reading not found');
  await prisma.bodyMetric.delete({ where: { id } });
}

export async function listProgressPhotos(memberId: string) {
  return prisma.progressPhoto.findMany({ where: { memberId }, orderBy: { takenAt: 'desc' } });
}

export async function addProgressPhoto(input: AddProgressPhotoInput) {
  const member = await prisma.member.findUnique({ where: { id: input.memberId } });
  if (!member) throw ApiError.badRequest('Member not found');

  return prisma.progressPhoto.create({
    data: { memberId: input.memberId, photoUrl: input.photoUrl, label: input.label },
  });
}
