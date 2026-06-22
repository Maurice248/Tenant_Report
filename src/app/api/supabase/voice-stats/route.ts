export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getVoiceStats } from '@/lib/voice-stats';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const data = await getVoiceStats(supabase);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load voice stats';
    console.error('[API voice-stats]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
