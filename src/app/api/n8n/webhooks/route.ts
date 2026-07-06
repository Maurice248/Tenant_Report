import { NextResponse } from 'next/server';
import { getRequestCompanyId } from '@/lib/auth';
import { getRequestN8nConfig } from '@/lib/company-integrations';

export async function GET() {
  const companyId = await getRequestCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getRequestN8nConfig();
  return NextResponse.json({
    webhooks: config.webhooks,
    apiBaseUrl: config.apiBaseUrl,
    blogWorkflowId: config.blogWorkflowId,
    blogWorkflowName: config.blogWorkflowName,
    apiKeyConfigured: Boolean(config.apiKey),
  });
}
