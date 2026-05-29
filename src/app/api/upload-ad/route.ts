export const dynamic = 'force-dynamic';
export const maxDuration = 60; // allow up to 60s for large file uploads

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const supabase = getServiceClient();

    // Build filename
    const ext = file.name.split('.').pop();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${timestamp}_${Math.floor(Math.random() * 10000)}.${ext}`;

    // Upload to storage using service role key
    const arrayBuffer = await file.arrayBuffer();
    const { error: storageError } = await supabase.storage
      .from('AD1')
      .upload(fileName, arrayBuffer, { contentType: file.type, upsert: false });

    if (storageError) return NextResponse.json({ error: storageError.message }, { status: 500 });

    // Get public URL
    const { data: urlData } = supabase.storage.from('AD1').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    const isVideo = file.type.startsWith('video/');
    const format = isVideo ? 'Video' : 'Image';

    // Insert into your_name_table using service role key (bypasses RLS)
    const { error: dbError } = await supabase
      .from('your_name_table')
      .insert([{
        text: publicUrl,
        time: new Date().toISOString(),
        format,
        Approved: 'true',
      }]);

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

    return NextResponse.json({ publicUrl, format, time: new Date().toISOString() });
  } catch (err: any) {
    console.error('[upload-ad] Error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}
