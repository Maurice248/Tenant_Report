export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BRAND_CONFIG_ID = 'd33fb700-9a07-4478-9ff1-6f636f2f3625';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('brand_configs')
    .select('*')
    .eq('id', BRAND_CONFIG_ID)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();

  const { error } = await supabase
    .from('brand_configs')
    .update(body)
    .eq('id', BRAND_CONFIG_ID);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
