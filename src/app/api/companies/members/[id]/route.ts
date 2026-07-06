export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  COMPANY_ADMIN_ROLE,
  COMPANY_MEMBER_ROLE,
  isCompanyMemberRole,
  normalizeMemberRole,
  requireCompanyAdmin,
} from '@/lib/auth';
import { isLastCompanyAdmin } from '@/lib/company-members';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const companyId = admin.companyId!;

  try {
    const body = await req.json();
    const roleInput = typeof body.role === 'string' ? body.role : '';
    const role = normalizeMemberRole(roleInput);

    if (role !== COMPANY_ADMIN_ROLE && role !== COMPANY_MEMBER_ROLE) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    const member = await prisma.user.findFirst({
      where: { id, companyId },
      select: { id: true, role: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
    }

    if (member.role === COMPANY_ADMIN_ROLE && isCompanyMemberRole(role)) {
      if (id === admin.id || (await isLastCompanyAdmin(companyId, id))) {
        return NextResponse.json(
          { error: 'Cannot demote the last company admin.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('[companies/members PATCH]', err);
    return NextResponse.json({ error: 'Failed to update member.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const companyId = admin.companyId!;

  if (id === admin.id) {
    return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 });
  }

  const member = await prisma.user.findFirst({
    where: { id, companyId },
    select: { id: true, role: true },
  });

  if (!member) {
    return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  }

  if (member.role === COMPANY_ADMIN_ROLE && (await isLastCompanyAdmin(companyId, id))) {
    return NextResponse.json({ error: 'Cannot remove the last company admin.' }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
