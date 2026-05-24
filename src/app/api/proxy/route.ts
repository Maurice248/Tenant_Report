import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url, body, method = 'POST' } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`[PROXY] ${method} → ${url}`);
    console.log(`[PROXY] Body:`, JSON.stringify(body, null, 2));

    const controller = new AbortController();
    // 5-minute timeout for long n8n workflows
    const timeout = setTimeout(() => controller.abort(), 300_000);

    const fetchOptions: any = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = body ? JSON.stringify(body) : JSON.stringify({});
    }

    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (fetchErr) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === 'AbortError';
      console.error(`[PROXY] Fetch ${isTimeout ? 'TIMED OUT' : 'FAILED'}:`, fetchErr.message);
      return NextResponse.json(
        { error: isTimeout ? 'Webhook timed out (5 min limit)' : fetchErr.message },
        { status: isTimeout ? 504 : 502 }
      );
    }

    clearTimeout(timeout);

    console.log(`[PROXY] Response status: ${response.status}`);

    const rawText = await response.text();
    console.log(`[PROXY] Raw response:`, rawText.slice(0, 500));

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      // n8n sometimes returns plain text or empty body
      data = rawText ? { message: rawText } : { status: 'ok' };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[PROXY] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
