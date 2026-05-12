import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { url, body, method = 'POST' } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log(`Proxying ${method} request to: ${url}`);

    const fetchOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = body ? JSON.stringify(body) : JSON.stringify({});
    }

    const response = await fetch(url, fetchOptions);

    const data = await response.json().catch(() => ({ status: 'ok' }));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
