import { NextRequest, NextResponse } from 'next/server';
import { getRequestCompanyId, requireCompanyAdmin } from '@/lib/auth';
import {
  getCompanyIntegrations,
  toSettingsView,
  upsertCompanyIntegrations,
  type IntegrationUpdateInput,
} from '@/lib/company-integrations';

export async function GET() {
  const companyId = await getRequestCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creds = await getCompanyIntegrations(companyId);
  return NextResponse.json(toSettingsView(creds));
}

export async function PUT(request: NextRequest) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const companyId = admin.companyId!;
  const body = (await request.json()) as IntegrationUpdateInput;
  const settings = await upsertCompanyIntegrations(companyId, body);
  return NextResponse.json(settings);
}
