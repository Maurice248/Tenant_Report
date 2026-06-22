export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId();

    const [totalCampaigns, leadsAgg, deletedAgg, successCount, totalCount] = await Promise.all([
      prisma.campaign.count({ where: { execution: { userId } } }),
      prisma.scraperJob.aggregate({
        where: { execution: { userId } },
        _sum: { totalScraped: true, validEmails: true },
      }),
      prisma.cleanupLog.aggregate({
        where: { execution: { userId } },
        _sum: { deletedCount: true },
        _count: true,
      }),
      prisma.workflowExecution.count({ where: { userId, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      totalCampaigns,
      totalLeadsScraped: leadsAgg._sum.totalScraped ?? 0,
      validLeads: leadsAgg._sum.validEmails ?? 0,
      totalCleanups: deletedAgg._count ?? 0,
      totalDeleted: deletedAgg._sum.deletedCount ?? 0,
      successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    console.error('Analytics GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
