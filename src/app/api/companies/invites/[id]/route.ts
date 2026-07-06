export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  const invite = await prisma.companyInvite.findFirst({
    where: { id, companyId: admin.companyId! },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  }

  await prisma.companyInvite.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
