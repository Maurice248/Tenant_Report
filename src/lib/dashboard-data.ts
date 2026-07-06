import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface DashboardChartMonth {
  month: string;
  count: number;
  sent: number;
}

export interface DashboardLeadSheet {
  sheet: string;
  count: number;
}

export interface DashboardExecution {
  id: string;
  workflowType: string;
  workflowName: string | null;
  status: string;
  createdAt: Date;
  campaign: { id: string } | null;
}

export interface OutreachDashboardData {
  totalCampaigns: number;
  totalLeadsScraped: number;
  validLeads: number;
  successRate: number;
  recentExecutions: DashboardExecution[];
  campaignsByMonth: DashboardChartMonth[];
  leadsBySheet: DashboardLeadSheet[];
  dbUnavailable: boolean;
}

function executionScope(companyId: string | null, userId: string): Prisma.WorkflowExecutionWhereInput {
  if (companyId) return { companyId };
  return { userId };
}

function emptyMonths(): DashboardChartMonth[] {
  return Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { month: format(date, 'MMM'), count: 0, sent: 0 };
  });
}

export function emptyOutreachDashboardData(): OutreachDashboardData {
  return {
    totalCampaigns: 0,
    totalLeadsScraped: 0,
    validLeads: 0,
    successRate: 0,
    recentExecutions: [],
    campaignsByMonth: emptyMonths(),
    leadsBySheet: [],
    dbUnavailable: true,
  };
}

function isMissingTableError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === 'P2021' || err.code === 'P1001')
  );
}

export async function getOutreachDashboardData(
  companyId: string | null,
  userId: string
): Promise<OutreachDashboardData> {
  const scope = executionScope(companyId, userId);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, 'MMM') };
  });

  try {
    const [campaigns, scraperJobs, recentExecutions, campaignsByMonth, leadsBySheet] =
      await Promise.all([
        prisma.campaign.count({ where: { execution: scope } }),
        prisma.scraperJob.aggregate({
          where: { execution: scope },
          _sum: { totalScraped: true, validEmails: true },
        }),
        prisma.workflowExecution.findMany({
          where: scope,
          orderBy: { createdAt: 'desc' },
          take: 8,
          include: { campaign: { select: { id: true } } },
        }),
        Promise.all(
          months.map(async ({ start, end, label }) => {
            const [count, agg] = await Promise.all([
              prisma.campaign.count({
                where: { execution: scope, createdAt: { gte: start, lte: end } },
              }),
              prisma.campaign.aggregate({
                where: { execution: scope, createdAt: { gte: start, lte: end } },
                _sum: { totalLeadsSent: true },
              }),
            ]);
            return { month: label, count, sent: agg._sum.totalLeadsSent ?? 0 };
          })
        ),
        prisma.scraperJob.groupBy({
          by: ['targetSheet'],
          where: { execution: scope },
          _sum: { validEmails: true },
        }),
      ]);

    const [successCount, totalCount] = await Promise.all([
      prisma.workflowExecution.count({ where: { ...scope, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: scope }),
    ]);

    return {
      totalCampaigns: campaigns,
      totalLeadsScraped: scraperJobs._sum.totalScraped ?? 0,
      validLeads: scraperJobs._sum.validEmails ?? 0,
      successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
      recentExecutions,
      campaignsByMonth,
      leadsBySheet: leadsBySheet.map((r) => ({
        sheet: r.targetSheet,
        count: r._sum.validEmails ?? 0,
      })),
      dbUnavailable: false,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn('[outreach] Database tables not found — run `npx prisma db push` to create them.');
      return emptyOutreachDashboardData();
    }
    throw err;
  }
}
