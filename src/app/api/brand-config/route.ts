export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestCompanyId } from '@/lib/auth';
import {
  getCompanyBrandConfig,
  updateCompanyBrandConfig,
} from '@/lib/company-brand-config';

export async function GET() {
  const companyId = await getRequestCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getCompanyBrandConfig(companyId);
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const companyId = await getRequestCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const data = await updateCompanyBrandConfig(companyId, body);
  return NextResponse.json({ success: true, ...data });
}
