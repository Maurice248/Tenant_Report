import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAllowedProxyUrl } from '@/lib/proxy-allowlist';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, body, method = 'POST' } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!(await isAllowedProxyUrl(url))) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);

    const fetchOptions: RequestInit = {
      method: String(method).toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
    };

    const httpMethod = fetchOptions.method ?? 'POST';
    if (httpMethod !== 'GET' && httpMethod !== 'HEAD') {
      fetchOptions.body = body ? JSON.stringify(body) : JSON.stringify({});
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (fetchErr) {
      clearTimeout(timeout);
      const err = fetchErr as Error;
      const isTimeout = err.name === 'AbortError';
      console.error(`[PROXY] Fetch ${isTimeout ? 'TIMED OUT' : 'FAILED'}:`, err.message);
      return NextResponse.json(
        { error: isTimeout ? 'Webhook timed out (5 min limit)' : err.message },
        { status: isTimeout ? 504 : 502 }
      );
    }

    clearTimeout(timeout);

    const rawText = await response.text();

    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText ? { message: rawText } : { status: 'ok' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const err = error as Error;
    console.error('[PROXY] Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
