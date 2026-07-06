export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUserId, getRequestCompanyId } from '@/lib/auth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const companyId = await getRequestCompanyId();

    const { publicUrl, format } = await req.json();
    if (!publicUrl) return NextResponse.json({ error: 'publicUrl required' }, { status: 400 });

    const supabase = getServiceClient();
    const time = new Date().toISOString();

    const { error } = await supabase
      .from('your_name_table')
      .insert([{ text: publicUrl, time, format, Approved: 'true', company_id: companyId }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ publicUrl, format, time });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
