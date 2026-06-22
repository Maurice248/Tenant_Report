import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Trigger deployment build: Force route execution dynamic behavior
export const dynamic = 'force-dynamic';

function normalizeSupabaseProjectUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
}

export async function GET() {
  try {
    const supabaseUrl = normalizeSupabaseProjectUrl(
      process.env.NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_URL || ''
    );
    const supabaseKey =
      process.env.SUPABASE_SOCIAL_DASH_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SOCIAL_DASH_SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('[API video-metadata] Social Dash Supabase URL or Key is missing.');
      return NextResponse.json(
        { error: 'Social Dash Supabase configuration is missing on server.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('[API video-metadata] Fetching video row (id=1) from Social Dash Supabase...');
    const { data, error } = await supabaseAdmin
      .from('videos')
      .select('video_link, metadata')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('[API video-metadata] Supabase error:', error.message);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn('[API video-metadata] No video row found with id=1.');
      return NextResponse.json(
        { error: 'Video row not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      video_link: data.video_link || null,
      metadata: data.metadata || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    console.error('[API video-metadata] Unexpected error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
