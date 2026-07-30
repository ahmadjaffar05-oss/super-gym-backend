import { Router } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  let dbStatus: 'up' | 'down' = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'down';
  }

  const status = dbStatus === 'up' ? 200 : 503;
  res.status(status).json({
    success: dbStatus === 'up',
    data: {
      service: 'super-gym-api',
      status: dbStatus === 'up' ? 'healthy' : 'degraded',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
