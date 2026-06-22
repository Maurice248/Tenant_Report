import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { CampaignChart } from '@/components/analytics/campaign-chart';
import { LeadChart } from '@/components/analytics/lead-chart';
import { SECTION_CONFIG } from '@/lib/app-section-config';
import { PageBody } from '@/components/outreach/page-body';
import { Mail, Search, Trash2, TrendingUp } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const labels = SECTION_CONFIG.outreach.labels;

async function getAnalytics(userId: string) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    return { start: startOfMonth(date), end: endOfMonth(date), label: format(date, 'MMM') };
  });

  const campaignsByMonth = await Promise.all(
    months.map(async ({ start, end, label }) => {
      const [count, agg] = await Promise.all([
        prisma.campaign.count({
          where: {
            execution: { userId },
            createdAt: { gte: start, lte: end },
          },
        }),
        prisma.campaign.aggregate({
          where: {
            execution: { userId },
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
    where: { execution: { userId } },
    _sum: { validEmails: true },
  });

  const [totalCampaigns, totalLeads, totalDeleted, successRate] = await Promise.all([
    prisma.campaign.count({ where: { execution: { userId } } }),
    prisma.scraperJob.aggregate({
      where: { execution: { userId } },
      _sum: { validEmails: true },
    }),
    prisma.cleanupLog.aggregate({
      where: { execution: { userId } },
      _sum: { deletedCount: true },
    }),
    Promise.all([
      prisma.workflowExecution.count({ where: { userId, status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: { userId } }),
    ]).then(([s, t]) => (t > 0 ? Math.round((s / t) * 100) : 0)),
  ]);

  return {
    totalCampaigns,
    totalLeads: totalLeads._sum.validEmails ?? 0,
    totalDeleted: totalDeleted._sum.deletedCount ?? 0,
    successRate,
    campaignsByMonth,
    leadsBySheet: leadsBySheet.map((r) => ({
      sheet: r.targetSheet,
      count: r._sum.validEmails ?? 0,
    })),
  };
}

export default async function OutreachAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? 'cmo8ubhgi0000difwp4jsua3t';

  const data = await getAnalytics(userId);

  return (
    <div>
      <Header title={labels.analyticsTitle} description={labels.analyticsDescription} />
      <PageBody>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title={labels.totalCampaignsTitle}
            value={data.totalCampaigns}
            subtitle="All time"
            icon={Mail}
            variant="outreach"
          />
          <StatsCard
            title="Valid Leads"
            value={data.totalLeads.toLocaleString()}
            subtitle="Scraped & validated"
            icon={Search}
            variant="outreach"
          />
          <StatsCard
            title="Contacts Deleted"
            value={data.totalDeleted.toLocaleString()}
            subtitle="Via cleanup workflows"
            icon={Trash2}
            variant="outreach"
          />
          <StatsCard
            title={labels.successRateTitle}
            value={`${data.successRate}%`}
            subtitle="Across all workflows"
            icon={TrendingUp}
            variant="outreach"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CampaignChart data={data.campaignsByMonth} />
          {data.leadsBySheet.length > 0 ? (
            <LeadChart data={data.leadsBySheet} title={labels.leadsByChartTitle} />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-white p-12 text-gray-400 shadow-sm">
              <p className="text-sm">No lead data yet. Run a scraper to see charts.</p>
            </div>
          )}
        </div>
      </PageBody>
    </div>
  );
}
