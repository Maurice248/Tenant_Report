export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const members = await prisma.user.findMany({
    where: { companyId: admin.companyId! },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(
    members.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }))
  );
}
