export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireCompanyAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureCompanyBrandConfig } from '@/lib/company-brand-config';

export async function POST(req: NextRequest) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
    const skipForNow = body.skipForNow === true;

    if (!skipForNow && !companyName) {
      return NextResponse.json({ error: 'Company name is required.' }, { status: 400 });
    }

    if (companyName) {
      await prisma.company.update({
        where: { id: admin.companyId! },
        data: { name: companyName },
      });
    }

    await ensureCompanyBrandConfig(admin.companyId!);

    await prisma.company.update({
      where: { id: admin.companyId! },
      data: { onboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[companies/onboarding]', err);
    return NextResponse.json({ error: 'Failed to save onboarding.' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true, onboardingCompletedAt: true },
  });

  return NextResponse.json({
    companyName: company?.name ?? '',
    onboardingCompleted: Boolean(company?.onboardingCompletedAt),
  });
}
