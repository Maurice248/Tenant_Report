export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { CLIENT_ROLE, COMPANY_ADMIN_ROLE, requireCompanyAdmin } from '@/lib/auth';
import { generateInviteToken, hashInviteToken, inviteExpiresAt } from '@/lib/invite-tokens';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();

  const invites = await prisma.companyInvite.findMany({
    where: {
      companyId: admin.companyId!,
      acceptedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(
    invites.map((inv) => ({
      ...inv,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }))
  );
}

export async function POST(req: NextRequest) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const roleInput = typeof body.role === 'string' ? body.role : CLIENT_ROLE;
    const role = roleInput === COMPANY_ADMIN_ROLE ? COMPANY_ADMIN_ROLE : CLIENT_ROLE;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const companyId = admin.companyId!;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser?.companyId === companyId) {
      return NextResponse.json({ error: 'This user is already a member of your company.' }, { status: 409 });
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered with another account.' },
        { status: 409 }
      );
    }

    const now = new Date();

    const pendingInvite = await prisma.companyInvite.findFirst({
      where: {
        companyId,
        email,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    });

    if (pendingInvite) {
      return NextResponse.json(
        { error: 'A pending invite already exists for this email.' },
        { status: 409 }
      );
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);

    const invite = await prisma.companyInvite.create({
      data: {
        companyId,
        email,
        tokenHash,
        role,
        invitedById: admin.id,
        expiresAt: inviteExpiresAt(now),
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${origin.replace(/\/$/, '')}/invite/${token}`;

    return NextResponse.json({
      invite: {
        ...invite,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      },
      inviteUrl,
    });
  } catch (err) {
    console.error('[companies/invites POST]', err);
    return NextResponse.json({ error: 'Failed to create invite.' }, { status: 500 });
  }
}
