import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/dashboard/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RecentExecutions, type ExecutionItem } from '@/components/dashboard/recent-executions';
import { Mail, Search, Trash2, TrendingUp } from 'lucide-react';
import { requireServerSession } from '@/lib/server-auth';
import { executionWhere } from '@/lib/workflow-scope';

async function getDashboardStats(companyId: string | null, userId: string) {
  const scope = executionWhere(companyId, userId);

  const [campaigns, scraperJobs, cleanupLogs, recentExecutions] = await Promise.all([
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
    prisma.workflowExecution.findMany({
      where: scope,
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        campaign: { select: { id: true } },
      },
    }),
  ]);

  const successCount = await prisma.workflowExecution.count({
    where: { ...scope, status: 'SUCCESS' },
  });
  const totalCount = await prisma.workflowExecution.count({ where: scope });

  return {
    totalCampaigns: campaigns,
    totalLeadsScraped: scraperJobs._sum.totalScraped ?? 0,
    validLeads: scraperJobs._sum.validEmails ?? 0,
    totalCleanups: cleanupLogs._count ?? 0,
    totalDeleted: cleanupLogs._sum.deletedCount ?? 0,
    successRate: totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0,
    recentExecutions,
  };
}

export default async function DashboardPage() {
  const session = await requireServerSession();
  const userId = session.user.id;
  const companyId = session.user.companyId ?? null;

  const stats = await getDashboardStats(companyId, userId);

  const executions: ExecutionItem[] = stats.recentExecutions.map((exec) => ({
    id: exec.id,
    workflowType: exec.workflowType,
    workflowName: exec.workflowName,
    status: exec.status,
    createdAt: exec.createdAt,
    campaignId: exec.campaign?.id ?? null,
  }));

  return (
    <div>
      <Header title="Dashboard" description="Overview of your automation workflows" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="Total Campaigns"
            value={stats.totalCampaigns}
            subtitle="AI-generated email campaigns"
            icon={Mail}
          />
          <StatsCard
            title="Leads Scraped"
            value={stats.totalLeadsScraped.toLocaleString()}
            subtitle={`${stats.validLeads.toLocaleString()} valid emails`}
            icon={Search}
          />
          <StatsCard
            title="Contacts Cleaned"
            value={stats.totalDeleted.toLocaleString()}
            subtitle={`${stats.totalCleanups} cleanup runs`}
            icon={Trash2}
          />
          <StatsCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            subtitle="Across all workflows"
            icon={TrendingUp}
          />
        </div>

        <RecentExecutions initialExecutions={executions} />
      </div>
    </div>
  );
}
