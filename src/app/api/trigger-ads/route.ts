import { supabase } from '@/lib/supabase';
import dns from 'node:dns';
import { getRequestN8nConfig, getN8nWebhook } from '@/lib/company-integrations';
import { requireApiCompanyId } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

export async function POST(request: Request) {
  try {
    const companyId = await requireApiCompanyId();
    if (companyId instanceof NextResponse) return companyId;

    const { report_id, report_data, ads_config } = await request.json();

    if (!report_id || !report_data) {
      return Response.json(
        { success: false, error: 'Missing report_id or report_data' },
        { status: 400 }
      );
    }

    try {
      const { data: existing } = await supabase
        .from('status_table')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('status_table')
          .update({
            status: 'Triggering...',
            time: new Date().toISOString(),
          })
          .eq('company_id', companyId);
      } else {
        await supabase.from('status_table').insert({
          status: 'Triggering...',
          time: new Date().toISOString(),
          company_id: companyId,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Status reset failed';
      console.warn('Status reset failed:', message);
    }

    const n8n = await getRequestN8nConfig();
    const webhookUrl = getN8nWebhook(n8n, 'NEXT_PUBLIC_N8N_GENERATE_AD_URL');
    if (!webhookUrl) {
      return Response.json(
        { success: false, error: 'Generate ad webhook is not configured in API key management' },
        { status: 500 }
      );
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          report_id,
          report_data,
          ads_config: ads_config || {},
          action: 'generate_ad',
          company_id: companyId,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return Response.json(
          {
            success: false,
            error: `Webhook failed with status ${res.status}: ${errorText.slice(0, 100)}`,
          },
          { status: 502 }
        );
      }
    } catch (webhookError) {
      const message = webhookError instanceof Error ? webhookError.message : 'Connection failed';
      return Response.json({ success: false, error: `Connection failed: ${message}` }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Workflow triggered', report_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
