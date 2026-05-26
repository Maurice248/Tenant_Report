export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/notifications/error
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('n8n')
      .select('status')
      .eq('id', 1);

    if (error) {
      console.error('[API] Supabase GET error:', error);
      return NextResponse.json({ message: null });
    }

    const status = data?.[0]?.status || '';
    if (status.startsWith('Error:')) {
      const message = status.replace(/^Error:\s*/i, '');
      return NextResponse.json({ message });
    }

    return NextResponse.json({ message: null });
  } catch (err) {
    console.error('[API] GET execution error:', err);
    return NextResponse.json({ message: null });
  }
}

// POST /api/notifications/error
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message || body?.Error || body?.error || null;
    
    if (message) {
      const { error } = await supabase
        .from('n8n')
        .update({ status: `Error: ${message}` })
        .eq('id', 1);

      if (error) {
        console.error('[API] Supabase POST update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('[API] POST execution error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to save notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/error
export async function DELETE() {
  try {
    const { error } = await supabase
      .from('n8n')
      .update({ status: 'Error Cleared' })
      .eq('id', 1);

    if (error) {
      console.error('[API] Supabase DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] DELETE execution error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to clear error' }, { status: 500 });
  }
}
