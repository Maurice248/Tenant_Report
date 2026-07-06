import { NextRequest, NextResponse } from 'next/server';
import { getMetaCredentialsForRequest } from '@/lib/meta-credentials';
import { requireMetaApiAuth } from '@/lib/meta-api-auth';

export const dynamic = 'force-dynamic';

const INSIGHT_FIELDS =
  'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,spend,impressions,reach,clicks,inline_link_click_ctr,cpc,cpm,actions';

const STRUCTURE_FIELDS =
  'id,name,status,effective_status,objective,adsets{id,name,status,effective_status,ads{id,name,status,effective_status,creative{thumbnail_url}}}';

function normalizeAdAccountId(raw: string) {
  return raw.replace(/^act_/i, '').trim();
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildTimeRange(days: number) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  return { since: formatDate(since), until: formatDate(until) };
}

function processInsights(insight: Record<string, unknown> | null | undefined) {
  if (!insight) {
    return {
      spend: '0',
      impressions: '0',
      reach: '0',
      clicks: '0',
      inline_link_click_ctr: '0',
      cpc: '0',
      cpm: '0',
      leads: '0',
      linkClicks: '0',
    };
  }

  const actions = (insight.actions as { action_type: string; value: string }[]) || [];
  const leads = actions.find((a) => a.action_type === 'lead')?.value || '0';
  const linkClicks = actions.find((a) => a.action_type === 'link_click')?.value || '0';

  return { ...insight, leads, linkClicks };
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

type AdMeta = {
  id: string;
  name: string;
  effective_status: string;
  thumbnail?: string;
};

export async function GET(request: NextRequest) {
  const auth = await requireMetaApiAuth();
  if (auth instanceof NextResponse) return auth;

  const meta = await getMetaCredentialsForRequest();
  if (!meta) {
    return NextResponse.json(
      { error: 'Missing Meta credentials. Configure them in Client Dashboard → API keys.' },
      { status: 500 }
    );
  }
  const { accessToken, adAccountId } = meta;

  const daysParam = parseInt(request.nextUrl.searchParams.get('days') || '7', 10);
  const days = Math.min(7, Math.max(1, Number.isNaN(daysParam) ? 7 : daysParam));
  const { since, until } = buildTimeRange(days);
  const timeRangeEncoded = encodeURIComponent(JSON.stringify({ since, until }));

  try {
    const insightsUrl =
      `https://graph.facebook.com/v21.0/act_${adAccountId}/insights` +
      `?level=ad&fields=${encodeURIComponent(INSIGHT_FIELDS)}` +
      `&time_range=${timeRangeEncoded}&limit=500` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const structureUrl =
      `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns` +
      `?fields=${encodeURIComponent(STRUCTURE_FIELDS)}&limit=50` +
      `&access_token=${encodeURIComponent(accessToken)}`;

    const [insightsRes, structureRes] = await Promise.all([
      fetch(insightsUrl, { cache: 'no-store' }),
      fetch(structureUrl, { cache: 'no-store' }),
    ]);

    const insightsData = await insightsRes.json();
    const structureData = await structureRes.json();

    if (!insightsRes.ok) {
      console.error('[ad-performance] Meta insights error:', insightsData?.error);
      return NextResponse.json(
        { error: metaErrorMessage(insightsData), meta: insightsData?.error ?? null },
        { status: insightsRes.status >= 400 && insightsRes.status < 600 ? insightsRes.status : 502 }
      );
    }

    if (!structureRes.ok) {
      console.error('[ad-performance] Meta structure error:', structureData?.error);
      return NextResponse.json(
        { error: metaErrorMessage(structureData), meta: structureData?.error ?? null },
        { status: structureRes.status >= 400 && structureRes.status < 600 ? structureRes.status : 502 }
      );
    }

    const adMetaById = new Map<string, AdMeta>();
    const campaignsRaw = structureData.data || [];

    for (const campaign of campaignsRaw) {
      const adsetsRaw = campaign.adsets?.data || [];
      for (const adset of adsetsRaw) {
        const adsRaw = adset.ads?.data || [];
        for (const ad of adsRaw) {
          adMetaById.set(ad.id, {
            id: ad.id,
            name: ad.name,
            effective_status: ad.effective_status,
            thumbnail: ad.creative?.thumbnail_url,
          });
        }
      }
    }

    const insightsByAdId = new Map<string, ReturnType<typeof processInsights>>();
    for (const row of insightsData.data || []) {
      if (row.ad_id) {
        insightsByAdId.set(row.ad_id, processInsights(row));
      }
    }

    const campaignMap = new Map<
      string,
      {
        id: string;
        name: string;
        status: string;
        effective_status: string;
        objective: string;
        adsets: Map<
          string,
          {
            id: string;
            name: string;
            status: string;
            effective_status: string;
            ads: Array<{
              id: string;
              name: string;
              status: string;
              effective_status: string;
              creative?: { thumbnail_url?: string };
              insights: ReturnType<typeof processInsights>;
            }>;
          }
        >;
      }
    >();

    for (const campaign of campaignsRaw) {
      const adsetMap = new Map<string, {
        id: string;
        name: string;
        status: string;
        effective_status: string;
        ads: Array<{
          id: string;
          name: string;
          status: string;
          effective_status: string;
          creative?: { thumbnail_url?: string };
          insights: ReturnType<typeof processInsights>;
        }>;
      }>();

      for (const adset of campaign.adsets?.data || []) {
        const ads = (adset.ads?.data || []).map((ad: Record<string, unknown>) => ({
          id: ad.id as string,
          name: ad.name as string,
          status: ad.status as string,
          effective_status: ad.effective_status as string,
          creative: ad.creative as { thumbnail_url?: string } | undefined,
          insights: insightsByAdId.get(ad.id as string) || processInsights(null),
        }));

        adsetMap.set(adset.id, {
          id: adset.id,
          name: adset.name,
          status: adset.status,
          effective_status: adset.effective_status,
          ads,
        });
      }

      campaignMap.set(campaign.id, {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        effective_status: campaign.effective_status,
        objective: campaign.objective,
        adsets: adsetMap,
      });
    }

    // Include insight rows for ads not found in structure (e.g. deleted ads still with spend)
    for (const row of insightsData.data || []) {
      if (!row.ad_id || adMetaById.has(row.ad_id)) continue;

      const campaignId = row.campaign_id || 'unknown';
      const adsetId = row.adset_id || 'unknown';

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          id: campaignId,
          name: row.campaign_name || campaignId,
          status: '',
          effective_status: '',
          objective: '',
          adsets: new Map(),
        });
      }

      const campaign = campaignMap.get(campaignId)!;
      if (!campaign.adsets.has(adsetId)) {
        campaign.adsets.set(adsetId, {
          id: adsetId,
          name: row.adset_name || adsetId,
          status: '',
          effective_status: '',
          ads: [],
        });
      }

      campaign.adsets.get(adsetId)!.ads.push({
        id: row.ad_id,
        name: row.ad_name || row.ad_id,
        status: '',
        effective_status: '',
        insights: processInsights(row),
      });
    }

    const campaigns = Array.from(campaignMap.values()).map((campaign) => ({
      ...campaign,
      adsets: Array.from(campaign.adsets.values()),
    }));

    return NextResponse.json({ days, since, until, campaigns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch ad performance';
    console.error('[ad-performance] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
