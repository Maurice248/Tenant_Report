import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Trigger deployment build: Force route execution dynamic behavior
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    // Use service_role key to bypass RLS policies
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.error('[API video-metadata] Supabase URL or Key is missing.');
      return NextResponse.json(
        { error: 'Supabase configuration is missing on server.' },
        { status: 500 }
      );
    }

    // Initialize server-side admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    console.log('[API video-metadata] Fetching video row (id=1) from Supabase...');
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
  } catch (err: any) {
    console.error('[API video-metadata] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
