import { NextResponse } from 'next/server';

export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return NextResponse.json({ error: "Missing Meta credentials" }, { status: 500 });
  }

  try {
    // 1. Fetch Account-Level Insights (Aggregated)
    // Using date_preset=maximum to get all-time performance
    const accountInsightsUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?fields=spend,impressions,reach,clicks,inline_link_click_ctr,cpc,cpm,actions&date_preset=maximum&access_token=${accessToken}`;
    const accountRes = await fetch(accountInsightsUrl);
    const accountData = await accountRes.json();

    // 2. Fetch Campaign-Level Breakdown with nested insights and ad structures
    const fields = "id,name,status,effective_status,objective,insights.date_preset(maximum){spend,impressions,reach,clicks,inline_link_click_ctr,actions},adsets{id,name,ads{id,name,status,effective_status,creative{thumbnail_url,image_url},insights.date_preset(maximum){spend,impressions,clicks,inline_link_click_ctr,actions}}}";
    const campaignInsightsUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns?fields=${fields}&limit=50&access_token=${accessToken}`;
    const campaignRes = await fetch(campaignInsightsUrl);
    const campaignData = await campaignRes.json();

    if (!accountRes.ok || !campaignRes.ok) {
      return NextResponse.json({
        error: accountData.error?.message || campaignData.error?.message || "Meta API Error"
      }, { status: 400 });
    }

    // Process actions to find leads if possible
    const processInsights = (insight) => {
      if (!insight) return insight;
      const leads = insight.actions?.find(a => a.action_type === 'lead')?.value || 0;
      const linkClicks = insight.actions?.find(a => a.action_type === 'link_click')?.value || 0;
      return { ...insight, leads, linkClicks };
    };

    const processedAccount = processInsights(accountData.data?.[0]);
    const processedCampaigns = (campaignData.data || []).map(c => {
      let adsets = [];
      if (c.adsets && c.adsets.data) {
        adsets = c.adsets.data.map(adset => {
          let ads = [];
          if (adset.ads && adset.ads.data) {
            ads = adset.ads.data.map(ad => ({
              ...ad,
              insights: processInsights(ad.insights?.data?.[0])
            }));
          }
          return { ...adset, ads };
        });
      }
      return {
        ...c,
        insights: processInsights(c.insights?.data?.[0]),
        adsets
      };
    });

    return NextResponse.json({
      account: processedAccount || null,
      campaigns: processedCampaigns
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
