const NEWSLETTER_API_BASE =
  process.env.NEWSLETTER_API_BASE_URL || 'https://newsletter-weld-rho.vercel.app';

export async function proxyNewsletterApi(path: string, search = '') {
  const url = `${NEWSLETTER_API_BASE}${path}${search}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  const data = await res.json().catch(() => ({ error: 'Invalid response from upstream API' }));

  if (!res.ok) {
    return Response.json(
      { error: data?.error || `Upstream request failed (${res.status})` },
      { status: res.status }
    );
  }

  return Response.json(data);
}
