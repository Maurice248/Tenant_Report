export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestCompanyId, requireCompanyAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function uniqueSlug(base: string, excludeId: string): Promise<string> {
  let slug = slugify(base) || 'company';
  let candidate = slug;
  let suffix = 1;

  while (true) {
    const existing = await prisma.company.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) break;
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function GET() {
  const companyId = await getRequestCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, logoUrl: true, slug: true },
  });

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json(company);
}

export async function PATCH(req: NextRequest) {
  const admin = await requireCompanyAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const companyId = admin.companyId!;
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const logoUrl =
      body.logoUrl === null
        ? null
        : typeof body.logoUrl === 'string' && body.logoUrl.trim()
          ? body.logoUrl.trim()
          : undefined;

    if (name !== undefined && name.length < 2) {
      return NextResponse.json({ error: 'Company name must be at least 2 characters.' }, { status: 400 });
    }

    const data: { name?: string; slug?: string; logoUrl?: string | null } = {};

    if (name !== undefined) {
      data.name = name;
      data.slug = await uniqueSlug(name, companyId);
    }

    if (logoUrl !== undefined) {
      data.logoUrl = logoUrl;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data,
      select: { name: true, logoUrl: true, slug: true },
    });

    return NextResponse.json(company);
  } catch (err) {
    console.error('[companies/profile]', err);
    return NextResponse.json({ error: 'Failed to update company profile.' }, { status: 500 });
  }
}
