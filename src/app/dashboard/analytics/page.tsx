import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { CampaignChart } from '@/components/analytics/campaign-chart';
import { LeadChart } from '@/components/analytics/lead-chart';
import { Mail, Search, Trash2, TrendingUp } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { requireServerSession } from '@/lib/server-auth';
import { executionWhere, executionRelationWhere } from '@/lib/workflow-scope';

async function getAnalytics(companyId: string | null, userId: string) {
  const scope = executionRelationWhere(companyId, userId);
  const execScope = executionWhere(companyId, userId);

  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, 'MMM') };
  });

  const campaignsByMonth = await Promise.all(
    months.map(async ({ start, end, label }) => {
      const [count, agg] = await Promise.all([
        prisma.campaign.count({
          where: {
            execution: scope,
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.campaign.aggregate({
          where: {
            execution: scope,
            createdAt: { gte: start, lte: end },
          },
          _sum: { totalLeadsSent: true },
        }),
      ]);
      return { month: label, count, sent: agg._sum.totalLeadsSent ?? 0 };
    })
  );

  const leadsBySheet = await prisma.scraperJob.groupBy({
    by: ['targetSheet'],
    where: { execution: scope },
    _sum: { validEmails: true },
  });

  const [totalCampaigns, totalLeads, totalDeleted, successRate] = await Promise.all([
    prisma.campaign.count({ where: { execution: scope } }),
    prisma.scraperJob.aggregate({
      where: { execution: scope },
      _sum: { validEmails: true },
    }),
    prisma.cleanupLog.aggregate({
      where: { execution: scope },
      _sum: { deletedCount: true },
    }),
    Promise.all([
      prisma.workflowExecution.count({ where: { ...execScope, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: execScope }),
    ]).then(([s, t]) => (t > 0 ? Math.round((s / t) * 100) : 0)),
  ]);

  return {
    totalCampaigns,
    totalLeads: totalLeads._sum.validEmails ?? 0,
    totalDeleted: totalDeleted._sum.deletedCount ?? 0,
    successRate,
    campaignsByMonth,
    leadsBySheet: leadsBySheet.map((r: { targetSheet: string; _sum: { validEmails: number | null } }) => ({
      sheet: r.targetSheet,
      count: r._sum.validEmails ?? 0,
    })),
  };
}

export default async function AnalyticsPage() {
  const session = await requireServerSession();
  const userId = session.user.id;
  const companyId = session.user.companyId ?? null;

  const data = await getAnalytics(companyId, userId);

  return (
    <div>
      <Header title="Analytics" description="Performance metrics for all workflows" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Total Campaigns"
            value={data.totalCampaigns}
            subtitle="Created"
            icon={Mail}
          />
          <StatsCard
            title="Valid Leads"
            value={data.totalLeads.toLocaleString()}
            subtitle="From scraper jobs"
            icon={Search}
          />
          <StatsCard
            title="Deleted Contacts"
            value={data.totalDeleted.toLocaleString()}
            subtitle="Cleanup total"
            icon={Trash2}
          />
          <StatsCard
            title="Success Rate"
            value={`${data.successRate}%`}
            subtitle="Workflow success"
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CampaignChart data={data.campaignsByMonth} />
          {data.leadsBySheet.length > 0 ? (
            <LeadChart data={data.leadsBySheet} />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white p-12 text-gray-400 shadow-sm">
              <p className="text-sm">No lead data yet. Run a scraper to see charts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
