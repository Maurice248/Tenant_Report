export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getNewsletterCampaigns } from '@/lib/newsletter-campaigns';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const data = await getNewsletterCampaigns(supabase);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load campaigns';
    console.error('[API supabase/campaigns]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
