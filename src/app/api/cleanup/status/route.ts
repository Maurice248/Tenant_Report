export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId, getRequestCompanyId } from '@/lib/auth';
import { executionRelationWhere } from '@/lib/workflow-scope';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = await getRequestCompanyId();
    const scope = executionRelationWhere(companyId, userId);

    const [logs, aggregate] = await Promise.all([
      prisma.cleanupLog.findMany({
        where: { execution: scope },
        include: { execution: { select: { status: true, createdAt: true } } },
        orderBy: { cleanupDate: 'desc' },
        take: 20,
      }),
      prisma.cleanupLog.aggregate({
        where: { execution: scope },
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
