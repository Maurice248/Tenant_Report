import { prisma } from '@/lib/prisma';
import { requireApiCompanyId } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const companyId = await requireApiCompanyId();
    if (companyId instanceof NextResponse) return companyId;

    const { text, approved, id, time, format } = await req.json();

    if (!text && !id) {
      return NextResponse.json({ success: false, error: 'Text URL or id is required' }, { status: 400 });
    }

    const approvedValue = approved ? 'true' : 'false';

    let result = 0;

    if (text) {
      result = await prisma.$executeRawUnsafe(
        `UPDATE "your_name_table" SET "Approved" = $1 WHERE "text" = $2 AND "company_id" = $3`,
        approvedValue,
        text,
        companyId
      );
    }

    if (result === 0 && id) {
      result = await prisma.$executeRawUnsafe(
        `UPDATE "your_name_table" SET "Approved" = $1 WHERE "id"::text = $2 AND "company_id" = $3`,
        approvedValue,
        String(id),
        companyId
      );
    }

    if (result === 0 && id && text) {
      result = await prisma.$executeRawUnsafe(
        `INSERT INTO "your_name_table" ("id", "text", "time", "format", "Approved", "company_id") VALUES ($1::text, $2, $3, $4, $5, $6)`,
        String(id),
        text,
        time || new Date().toISOString(),
        format || 'Image',
        approvedValue,
        companyId
      );
    }

    return NextResponse.json({
      success: true,
      rowsAffected: result,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[API Ads] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
