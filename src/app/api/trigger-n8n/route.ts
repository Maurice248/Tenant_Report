import dns from 'node:dns';
import { request as httpsRequest } from 'node:https';
import { getRequestN8nConfig, getN8nWebhook } from '@/lib/company-integrations';
import { requireApiUserId } from '@/lib/api-auth';
import { NextResponse } from 'next/server';

// Max 300s on Vercel Hobby plan
export const maxDuration = 300;

function fetchIPv4(urlStr: string, body: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);

    dns.lookup(parsed.hostname, { family: 4 }, (err, address) => {
      if (err) {
        address = parsed.hostname;
      }

      const path = parsed.pathname + (parsed.search || '');
      const req = httpsRequest(
        {
          hostname: address,
          port: 443,
          path,
          method: 'POST',
          servername: parsed.hostname,
          headers: {
            'Content-Type': 'application/json',
            Host: parsed.hostname,
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 295_000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => resolve({ status: res.statusCode ?? 0, text: data }));
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.write(body);
      req.end();
    });
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUserId();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { action } = body;

    const n8n = await getRequestN8nConfig();
    const WEBHOOKS: Record<string, string | undefined> = {
      competitor_analysis: getN8nWebhook(n8n, 'N8N_COMPETITOR_ANALYSIS_URL') ?? undefined,
      generate_ad: getN8nWebhook(n8n, 'NEXT_PUBLIC_N8N_GENERATE_AD_URL') ?? undefined,
    };

    if (!action || !(action in WEBHOOKS)) {
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const url = WEBHOOKS[action];
    if (!url) {
      return Response.json(
        { error: `Webhook URL not configured for action: ${action}` },
        { status: 503 }
      );
    }

    console.log(`[trigger-n8n] ${action} → ${url}`);

    const bodyStr = JSON.stringify(body);
    let result: { status: number; text: string };

    try {
      result = await fetchIPv4(url, bodyStr);
    } catch (fetchErr: unknown) {
      const message = fetchErr instanceof Error ? fetchErr.message : 'Request failed';
      console.error('[trigger-n8n] fetch error:', message);
      return Response.json({ error: message, isTimeout: true, action }, { status: 200 });
    }

    console.log(`[trigger-n8n] response ${result.status}:`, result.text.slice(0, 300));

    let data: unknown;
    try {
      data = JSON.parse(result.text);
    } catch {
      data = { rawResponse: result.text, ok: result.status < 400 };
    }

    if (result.status >= 400) {
      const errBody = data as { error?: string; message?: string };
      return Response.json(
        {
          error: errBody?.error || errBody?.message || `n8n returned ${result.status}`,
          rawResponse: result.text,
        },
        { status: 200 }
      );
    }

    return Response.json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reach n8n';
    console.error('[trigger-n8n] unexpected error:', err);
    return Response.json({ error: message, isTimeout: true }, { status: 200 });
  }
}
