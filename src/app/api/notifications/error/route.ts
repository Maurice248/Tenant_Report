export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdssxtquayzijmbnlqmt.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Use service role key if set (bypasses RLS), fall back to anon key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

// GET /api/notifications/error
// Returns the latest active global error from the Supabase "Error Alerts" table (id=1)
export async function GET() {
  try {
    // Query Supabase REST API directly — server-side, bypasses CORS + RLS if service key is set
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/Error%20Alerts?id=eq.1&select=Error%2Cupdated_at&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=representation',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      console.error('[API] Supabase Error Alerts fetch failed:', res.status, res.statusText);
      return NextResponse.json({ message: null, updated_at: null, status: res.status });
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: null, updated_at: null });
    }

    const row = rows[0];
    const message = row.Error || null;
    const updatedAt = row.updated_at || null;

    return NextResponse.json({ message, updated_at: updatedAt });
  } catch (err) {
    console.error('[API] GET global error error:', err);
    return NextResponse.json({ message: null, updated_at: null });
  }
}

// POST /api/notifications/error  (kept for legacy n8n webhook compatibility)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message || body?.Error || body?.error || null;
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}

// DELETE /api/notifications/error  (kept for legacy compatibility)
export async function DELETE() {
  return NextResponse.json({ success: true });
}
