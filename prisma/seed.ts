import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? 'owner@supergym.com';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!';

  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });

  if (!existingOwner) {
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        role: 'OWNER',
        firstName: 'Mohammed',
        lastName: 'Abu Husam',
        isActive: true,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✅ Owner account created: ${ownerEmail}`);
    // eslint-disable-next-line no-console
    console.log('⚠️  Change the seed password immediately after first login.');
  } else {
    // eslint-disable-next-line no-console
    console.log('ℹ️  Owner account already exists, skipping.');
  }

  await prisma.gymSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      gymName: 'SUPER GYM',
      managerName: 'Captain Mohammed Abu Husam',
      currency: 'USD',
    },
  });

  const planCount = await prisma.membershipPlan.count();
  if (planCount === 0) {
    await prisma.membershipPlan.createMany({
      data: [
        { name: 'Monthly', durationDays: 30, price: 49.99, description: 'Full gym access, billed monthly' },
        { name: 'Quarterly', durationDays: 90, price: 129.99, description: 'Full gym access, billed every 3 months' },
        { name: 'Annual', durationDays: 365, price: 449.99, description: 'Full gym access, billed yearly — best value' },
      ],
    });
    // eslint-disable-next-line no-console
    console.log('✅ Default membership plans created');
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
