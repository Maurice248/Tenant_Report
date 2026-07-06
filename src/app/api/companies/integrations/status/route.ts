import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { companyHasIntegrationsConfigured } from '@/lib/company-integration-status';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const configured = await companyHasIntegrationsConfigured(session.user.companyId);
  return NextResponse.json({ configured });
}
