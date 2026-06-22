import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FULL_FIELDS =
  'id,name,status,effective_status,objective,adsets{id,name,status,effective_status,ads{id,name,status,effective_status,creative{thumbnail_url},insights.date_preset(maximum){spend,inline_link_click_ctr,clicks,impressions,actions}}}';

const FALLBACK_FIELDS =
  'id,name,status,effective_status,objective,adsets{id,name,status,effective_status,ads{id,name,status,effective_status,creative{thumbnail_url}}}';

function normalizeAdAccountId(raw: string) {
  return raw.replace(/^act_/i, '').trim();
}

function metaErrorMessage(data: { error?: { message?: string; code?: number; error_subcode?: number } }) {
  const err = data?.error;
  if (!err?.message) return 'Meta API Error';
  const parts = [err.message];
  if (err.code) parts.push(`(code ${err.code}${err.error_subcode ? ` / ${err.error_subcode}` : ''})`);
  if (/access token|session has expired|OAuthException/i.test(err.message)) {
    parts.push('— regenerate META_ACCESS_TOKEN in Meta Business settings and update .env');
  }
  return parts.join(' ');
}

async function fetchCampaigns(accessToken: string, adAccountId: string, fields: string) {
  const url =
    `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns` +
    `?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  return { response, data };
}

export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID || '');

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ error: 'Missing Meta credentials (META_ACCESS_TOKEN / META_AD_ACCOUNT_ID)' }, { status: 500 });
  }

  try {
    let { response, data } = await fetchCampaigns(accessToken, adAccountId, FULL_FIELDS);

    // Retry with a lighter field set if Meta rejects the nested insights query
    if (!response.ok) {
      const retry = await fetchCampaigns(accessToken, adAccountId, FALLBACK_FIELDS);
      if (retry.response.ok) {
        return NextResponse.json(retry.data.data ?? []);
      }
      response = retry.response;
      data = retry.data;
    }

    if (!response.ok) {
      console.error('[live-campaigns] Meta API error:', data?.error);
      return NextResponse.json(
        { error: metaErrorMessage(data), meta: data?.error ?? null },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
      );
    }

    return NextResponse.json(data.data ?? []);
  } catch (error: any) {
    console.error('[live-campaigns] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch campaigns' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = normalizeAdAccountId(process.env.META_AD_ACCOUNT_ID || '');

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ error: 'Missing Meta credentials' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, objective = 'OUTCOME_TRAFFIC', status = 'PAUSED' } = body;

    if (!name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          objective,
          status,
          special_ad_categories: ['NONE'],
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: metaErrorMessage(data) }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
