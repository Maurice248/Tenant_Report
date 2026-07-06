export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireApiCompanyId } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { listReportsForCompany } from '@/lib/reports-query';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const companyId = await requireApiCompanyId();
    if (companyId instanceof NextResponse) return companyId;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    });

    const supabase = getServiceClient();
    const { data, error } = await listReportsForCompany(supabase, companyId, company?.slug ?? null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rows: data ?? [],
      companySlug: company?.slug ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
