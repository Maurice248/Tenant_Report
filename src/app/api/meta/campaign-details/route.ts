import { NextResponse } from 'next/server';
import { getMetaAccessTokenForRequest } from '@/lib/meta-credentials';
import { requireMetaApiAuth } from '@/lib/meta-api-auth';

export async function GET(request: Request) {
  const auth = await requireMetaApiAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');
  const accessToken = await getMetaAccessTokenForRequest();

  if (!accessToken || !campaignId) {
    return NextResponse.json({ error: 'Missing Meta credentials or campaignId' }, { status: 400 });
  }

  try {
    // Fetch Campaign details
    const campaignFields = "id,name,objective,status,special_ad_categories,budget_rebalance_flag,daily_budget,lifetime_budget";
    const campaignRes = await fetch(
      `https://graph.facebook.com/v21.0/${campaignId}?fields=${campaignFields}&access_token=${accessToken}`
    );
    const campaignData = await campaignRes.json();

    if (!campaignRes.ok) {
      return NextResponse.json({ error: campaignData.error?.message || "Meta API Error fetching campaign" }, { status: campaignRes.status });
    }

    // Fetch AdSets for this campaign
    const adSetFields = "id,name,status,daily_budget,lifetime_budget,budget_type,start_time,end_time,targeting,optimization_goal";
    const adSetsRes = await fetch(
      `https://graph.facebook.com/v21.0/${campaignId}/adsets?fields=${adSetFields}&access_token=${accessToken}`
    );
    const adSetsData = await adSetsRes.json();

    return NextResponse.json({
      campaign: campaignData,
      adSets: adSetsData.data || []
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
