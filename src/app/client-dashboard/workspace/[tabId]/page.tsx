import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { companyHasIntegrationsConfigured } from '@/lib/company-integration-status';
import {
  CLIENT_ALL_TAB_IDS,
  CLIENT_BRAND_CONTEXT_TAB_ID,
} from '@/lib/client-dashboard-nav';
import { ClientTabView } from '@/components/client-dashboard/client-tab-view';

export default async function ClientWorkspaceTabPage({
  params,
}: {
  params: Promise<{ tabId: string }>;
}) {
  const { tabId } = await params;

  if (!CLIENT_ALL_TAB_IDS.has(tabId)) {
    redirect(`/client-dashboard/workspace/${CLIENT_BRAND_CONTEXT_TAB_ID}`);
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    redirect('/client-login');
  }

  const integrationsConfigured = await companyHasIntegrationsConfigured(session.user.companyId);

  if (!integrationsConfigured && tabId !== CLIENT_BRAND_CONTEXT_TAB_ID) {
    redirect(`/client-dashboard/workspace/${CLIENT_BRAND_CONTEXT_TAB_ID}`);
  }

  return <ClientTabView tabId={tabId} />;
}
