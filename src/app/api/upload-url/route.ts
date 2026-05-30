export const dynamic = 'force-dynamic';

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
    const { fileName, contentType } = await req.json();
    if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 });

    const supabase = getServiceClient();

    // Generate a signed URL that the browser can use to upload directly
    const { data, error } = await supabase.storage
      .from('AD1')
      .createSignedUploadUrl(fileName);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get the public URL for the file (for after upload)
    const { data: urlData } = supabase.storage.from('AD1').getPublicUrl(fileName);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      publicUrl: urlData.publicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
