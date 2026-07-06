export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { normalizeMemberRole } from '@/lib/auth';
import { ensureCompanyBrandConfig } from '@/lib/company-brand-config';
import { hashInviteToken } from '@/lib/invite-tokens';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const tokenHash = hashInviteToken(token);

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

    if (!name) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const invite = await prisma.companyInvite.findUnique({
      where: { tokenHash },
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

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          email: invite.email,
          name,
          password: hashedPassword,
          role: normalizeMemberRole(invite.role),
          companyId: invite.companyId,
        },
      });

      await tx.companyInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
    });

    await ensureCompanyBrandConfig(invite.companyId);

    return NextResponse.json({ ok: true, email: invite.email });
  } catch (err) {
    console.error('[invites/accept POST]', err);
    return NextResponse.json({ error: 'Failed to accept invite.' }, { status: 500 });
  }
}
