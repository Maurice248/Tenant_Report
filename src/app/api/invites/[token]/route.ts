export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { hashInviteToken } from '@/lib/invite-tokens';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  const tokenHash = hashInviteToken(token);

  const invite = await prisma.companyInvite.findUnique({
    where: { tokenHash },
    include: {
      company: { select: { name: true } },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found.' }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return NextResponse.json({ error: 'This invite has already been used.' }, { status: 410 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This invite has expired.' }, { status: 410 });
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    companyName: invite.company.name,
    expiresAt: invite.expiresAt.toISOString(),
  });
}
