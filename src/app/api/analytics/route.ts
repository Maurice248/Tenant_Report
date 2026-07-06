export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestUserId, getRequestCompanyId } from '@/lib/auth';
import { executionWhere, executionRelationWhere } from '@/lib/workflow-scope';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = await getRequestCompanyId();
    const scope = executionRelationWhere(companyId, userId);
    const execScope = executionWhere(companyId, userId);

    const [totalCampaigns, leadsAgg, deletedAgg, successCount, totalCount] = await Promise.all([
      prisma.campaign.count({ where: { execution: scope } }),
      prisma.scraperJob.aggregate({
        where: { execution: scope },
        _sum: { totalScraped: true, validEmails: true },
      }),
      prisma.cleanupLog.aggregate({
        where: { execution: scope },
        _sum: { deletedCount: true },
        _count: true,
      }),
      prisma.workflowExecution.count({ where: { ...execScope, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: execScope }),
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
