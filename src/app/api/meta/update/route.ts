import { NextResponse } from 'next/server';
import { getMetaAccessTokenForRequest } from '@/lib/meta-credentials';
import { requireMetaApiAuth } from '@/lib/meta-api-auth';

export async function POST(request: Request) {
  const auth = await requireMetaApiAuth();
  if (auth instanceof NextResponse) return auth;

  const accessToken = await getMetaAccessTokenForRequest();

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing Meta credentials. Configure them in Client Dashboard → API keys.' }, { status: 500 });
  }

  try {
    const { campaignId, campaignData, adSetId, adSetData } = await request.json();

    const results: any = {};

    // 1. Update Campaign
    if (campaignId && campaignData && Object.keys(campaignData).length > 0) {
      const campaignRes = await fetch(
        `https://graph.facebook.com/v21.0/${campaignId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...campaignData,
            access_token: accessToken,
          }),
        }
      );
      const campaignResData = await campaignRes.json();
      if (!campaignRes.ok) {
        throw new Error("Campaign Update Error: " + (campaignResData.error?.message || "Unknown error"));
      }
      results.campaign = campaignResData;
    }

    // 2. Update Ad Set
    if (adSetId && adSetData && Object.keys(adSetData).length > 0) {
      const adSetRes = await fetch(
        `https://graph.facebook.com/v21.0/${adSetId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...adSetData,
            access_token: accessToken,
          }),
        }
      );
      const adSetResData = await adSetRes.json();
      if (!adSetRes.ok) {
        throw new Error("Ad Set Update Error: " + (adSetResData.error?.message || "Unknown error"));
      }
      results.adSet = adSetResData;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
