export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireApiCompanyId } from '@/lib/api-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  try {
    const companyId = await requireApiCompanyId();
    if (companyId instanceof NextResponse) return companyId;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Error%20Alerts?company_id=eq.${encodeURIComponent(companyId)}&select=Error%2Cupdated_at&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Prefer: 'return=representation',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return NextResponse.json({ message: null, updated_at: null, status: res.status });
    }

    const rows = await res.json();
    if (!rows?.length) {
      return NextResponse.json({ message: null, updated_at: null });
    }

    const row = rows[0];
    return NextResponse.json({
      message: row.Error || null,
      updated_at: row.updated_at || null,
    });
  } catch (err) {
    console.error('[API] GET tenant error alert:', err);
    return NextResponse.json({ message: null, updated_at: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await requireApiCompanyId();
    if (companyId instanceof NextResponse) return companyId;

    const body = await req.json();
    const message = body?.message || body?.Error || body?.error || null;
    return NextResponse.json({ success: true, message, companyId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const companyId = await requireApiCompanyId();
  if (companyId instanceof NextResponse) return companyId;
  return NextResponse.json({ success: true });
}
