export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId();

    const [logs, aggregate] = await Promise.all([
      prisma.cleanupLog.findMany({
        where: { execution: { userId } },
        include: { execution: { select: { status: true, createdAt: true } } },
        orderBy: { cleanupDate: 'desc' },
        take: 20,
      }),
      prisma.cleanupLog.aggregate({
        where: { execution: { userId } },
        _sum: { deletedCount: true },
        _count: true,
      }),
    ]);

    const lastCleanup = logs[0]?.cleanupDate ?? null;
    const nextScheduled = lastCleanup ? addDays(new Date(lastCleanup), 10).toISOString() : null;

    return NextResponse.json({
      lastCleanup: lastCleanup?.toISOString() ?? null,
      nextScheduled,
      totalDeleted: aggregate._sum.deletedCount ?? 0,
      totalRuns: aggregate._count ?? 0,
      logs,
    });
  } catch (error) {
    console.error('Cleanup status GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
