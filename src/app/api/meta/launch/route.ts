import fs from "fs";
import path from "path";

export const maxDuration = 60; // Allow Vercel to run up to 60s for video polling

// ── Helper to parse JSON with fallback ──
async function fetchMetaJson(res) {
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Meta API returned non-JSON. Status: ${res.status}. Body: ${text.slice(0, 200)}...`);
  }
  if (!res.ok) {
    const msg = parsed.error?.message || "Unknown Meta API error";
    const subcode = parsed.error?.error_subcode ? ` (Subcode: ${parsed.error.error_subcode})` : "";
    const userTitle = parsed.error?.error_user_title ? ` - ${parsed.error.error_user_title}` : "";
    const userMsg = parsed.error?.error_user_msg ? `: ${parsed.error.error_user_msg}` : "";
    throw new Error(`Meta API Error: ${msg}${subcode}${userTitle}${userMsg} | Full: ${JSON.stringify(parsed.error)}`);
  }
  return parsed;
}

// ── STEP 1: Upload media to Meta ──
async function uploadMedia(link_data, isVideo, accessToken, adAccountId) {
  if (!link_data.startsWith("http://") && !link_data.startsWith("https://")) {
    throw new Error(`Invalid media URL: ${link_data}. Must be absolute HTTP/HTTPS URL.`);
  }

  if (isVideo) {
    const uploadForm = new FormData();
    uploadForm.append("file_url", link_data);
    uploadForm.append("access_token", accessToken);

    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/act_${adAccountId}/advideos`,
      { method: "POST", body: uploadForm }
    );
    const uploadData = await fetchMetaJson(uploadRes);
    const videoId = uploadData.id;

    if (!videoId) throw new Error("Failed to upload video to Meta: No ID returned.");

    // Poll until video is ready
    let isReady = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const statusRes = await fetch(
          `https://graph.facebook.com/v21.0/${videoId}?fields=status&access_token=${accessToken}`
        );
        const statusData = await fetchMetaJson(statusRes);
        if (statusData.status?.video_status === "ready") {
          isReady = true;
          break;
        }
      } catch (err) {
        console.log("Polling video status error:", err.message);
      }
    }

    if (!isReady) {
      console.warn(`Video ${videoId} is still processing after 45 seconds. Attempting to proceed, but it may fail with 1885252.`);
    }

    // Upload a fallback thumbnail (Toga logo) to get an image_hash
    let imageHash = null;
    try {
      const logoPath = path.join(process.cwd(), "public", "toga-health-logo.png");
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBlob = new Blob([logoBuffer]);
      const thumbForm = new FormData();
      thumbForm.append("source", logoBlob, "toga-health-logo.png");
      thumbForm.append("access_token", accessToken);

      const thumbRes = await fetch(`https://graph.facebook.com/v21.0/act_${adAccountId}/adimages`, {
        method: "POST",
        body: thumbForm,
      });
      const thumbData = await fetchMetaJson(thumbRes);
      imageHash = thumbData.images?.["toga-health-logo.png"]?.hash;
    } catch (err) {
      console.log("Failed to upload fallback thumbnail:", err.message);
    }

    return { video_id: videoId, image_hash: imageHash };
  } else {
    // Image upload
    const mediaRes = await fetch(link_data);
    if (!mediaRes.ok) throw new Error(`Failed to fetch image from URL: ${link_data}`);
    const imgBuffer = await mediaRes.arrayBuffer();
    const imgBlob = new Blob([imgBuffer]);

    const uploadForm = new FormData();
    uploadForm.append("source", imgBlob, "ad_image.jpg");
    uploadForm.append("access_token", accessToken);

    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/act_${adAccountId}/adimages`,
      { method: "POST", body: uploadForm }
    );
    const uploadData = await fetchMetaJson(uploadRes);
    const imageHash = uploadData.images?.["ad_image.jpg"]?.hash;

    if (!imageHash) {
      throw new Error("Failed to upload image to Meta: No hash returned.");
    }

    return { image_hash: imageHash };
  }
}

// ── STEP 1b: Fetch Page ID ──
async function fetchPageId(accessToken) {
  let pageId = process.env.META_PAGE_ID;
  if (!pageId || pageId === "me" || pageId === "YOUR_TOGAHH_PAGE_ID_HERE") {
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`);
    const pagesData = await fetchMetaJson(pagesRes);
    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error("No Facebook Pages found associated with this Meta Access Token. A Page is strictly required by Meta to create Ad Creatives. Please create a Page in your Facebook Business account.");
    }
    pageId = pagesData.data[0].id;
  }
  return pageId;
}

// ── STEP 2: Campaign ──
async function createCampaign(existingCampaignId, adAccountId, accessToken, campaignName, objective, specialAdCats, isCbo, budgetType, dailyBudget, lifetimeBudget) {
  if (existingCampaignId) return existingCampaignId;

  const campaignRes = await fetch(
    `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: campaignName,
        objective,
        status: "PAUSED",
        special_ad_categories: specialAdCats,
        is_adset_budget_sharing_enabled: isCbo,
        ...(isCbo ? (budgetType === "DAILY" ? { daily_budget: dailyBudget } : { lifetime_budget: lifetimeBudget }) : {}),
        access_token: accessToken,
      }),
    }
  );
  const campaignData = await fetchMetaJson(campaignRes);
  if (!campaignData.id) throw new Error("Failed to create campaign: No ID returned.");
  return campaignData.id;
}

// ── STEP 3: Ad Set ──
async function createAdSet(adAccountId, accessToken, adSetName, campaignId, isCbo, budgetType, dailyBudget, lifetimeBudget, startTime, stopTime, targeting, dsaFields) {
  const adSetRes = await fetch(
    `https://graph.facebook.com/v21.0/act_${adAccountId}/adsets`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adSetName,
        campaign_id: campaignId,
        ...(!isCbo ? (budgetType === "DAILY" ? { daily_budget: dailyBudget } : { lifetime_budget: lifetimeBudget }) : {}),
        start_time: startTime,
        ...(stopTime ? { stop_time: stopTime } : {}),
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting,
        ...dsaFields,
        status: "PAUSED",
        access_token: accessToken,
      }),
    }
  );
  const adSetData = await fetchMetaJson(adSetRes);
  if (!adSetData.id) throw new Error("Failed to create ad set: No ID returned.");
  return adSetData.id;
}

// ── STEP 4: Ad Creative ──
async function createAdCreative(adAccountId, accessToken, isVideo, pageId, mediaPayload, headline, primaryText, websiteUrl, ctaType, adName) {
  let objectStorySpec;
  if (isVideo) {
    objectStorySpec = {
      page_id: pageId,
      video_data: {
        video_id: mediaPayload.video_id,
        ...(mediaPayload.image_hash ? { image_hash: mediaPayload.image_hash } : { image_url: "https://togahh.com/toga-health-logo.png" }),
        title: headline,
        message: primaryText,
        link_description: headline,
        call_to_action: {
          type: ctaType,
          value: { link: websiteUrl },
        },
      },
    };
  } else {
    objectStorySpec = {
      page_id: pageId,
      link_data: {
        image_hash: mediaPayload.image_hash,
        link: websiteUrl,
        message: primaryText,
        name: headline,
        call_to_action: {
          type: ctaType,
          value: { link: websiteUrl },
        },
      },
    };
  }

  const creativeRes = await fetch(
    `https://graph.facebook.com/v21.0/act_${adAccountId}/adcreatives`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Creative_${adName}`,
        object_story_spec: objectStorySpec,
        access_token: accessToken,
      }),
    }
  );
  const creativeData = await fetchMetaJson(creativeRes);
  if (!creativeData.id) throw new Error("Failed to create ad creative: No ID returned.");
  return creativeData.id;
}

// ── STEP 5: Ad ──
async function createAd(adAccountId, accessToken, adName, adSetId, creativeId) {
  const adRes = await fetch(
    `https://graph.facebook.com/v21.0/act_${adAccountId}/ads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adName,
        adset_id: adSetId,
        creative: { creative_id: creativeId },
        status: "PAUSED",
        access_token: accessToken,
      }),
    }
  );
  const adFinalData = await fetchMetaJson(adRes);
  if (!adFinalData.id) throw new Error("Failed to create ad: No ID returned.");
  return adFinalData.id;
}

export async function POST(request) {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!accessToken || !adAccountId) {
    return Response.json({ error: "Missing Meta credentials" }, { status: 500 });
  }

  try {
    const { schema, campaignId: existingCampaignId } = await request.json();

    if (!schema) {
      return Response.json({ error: "Missing schema payload" }, { status: 400 });
    }

    const { campaign, ad_set, ad, link_data } = schema;

    if (!link_data) {
      return Response.json({ error: "Missing link_data (media URL)" }, { status: 400 });
    }

    const isVideo =
      (ad?.media_type || "").toLowerCase() === "video" ||
      (ad?.type || "").toLowerCase() === "video";

    // ── Resolve config values ──
    const objective       = campaign?.objective        || "OUTCOME_TRAFFIC";
    const campaignName    = campaign?.name             || `[DRAFT] ${objective}_${Date.now()}`;
    const specialAdCats   = (campaign?.special_ad_categories || []).filter((c: string) => c && c !== "NONE");
    const isCbo           = campaign?.is_adset_budget_sharing_enabled || false;
    
    // Budget & Schedule
    const budgetType      = ad_set?.budget_type       || "DAILY";
    const dailyBudget     = ad_set?.daily_budget       || 5000;
    const lifetimeBudget  = ad_set?.lifetime_budget    || 50000;
    const startTime       = ad_set?.start_time         || null;
    const stopTime        = ad_set?.has_end_date ? ad_set?.stop_time : null;

    const adSetName       = ad_set?.name              || "Ad Set";
    const ageMin          = ad_set?.age_min            || 18;
    const ageMax          = ad_set?.age_max            || 65;
    const gender          = ad_set?.gender             ?? 0; // 0=all,1=male,2=female
    const dsaBeneficiary  = ad_set?.dsa_beneficiary   || "Advertiser";
    const dsaPayor        = ad_set?.dsa_payor          || "Advertiser";
    const adName          = ad?.name                  || "Ad";
    const headline        = ad?.headline              || "";
    const primaryText     = ad?.primary_text          || "";
    const websiteUrl      = ad?.website_url           || "https://togahh.com";
    const ctaType         = ad?.call_to_action_type   || "LEARN_MORE";

    // Clean geo_locations for Meta API
    let rawGeo = ad_set?.geo_locations || {
      countries: ad_set?.geo_targeting || ["US"],
      location_types: ["home", "recent"],
    };
    
    const cleanGeo: any = { location_types: rawGeo.location_types || ["home", "recent"] };
    let hasLocation = false;
    
    if (rawGeo.countries && rawGeo.countries.length > 0) { 
      cleanGeo.countries = rawGeo.countries; 
      hasLocation = true; 
    }
    if (rawGeo.cities && rawGeo.cities.length > 0) { 
      cleanGeo.cities = rawGeo.cities.map(c => ({ key: String(c.key), radius: 25, distance_unit: "mile" })); 
      hasLocation = true; 
    }
    if (rawGeo.regions && rawGeo.regions.length > 0) { 
      cleanGeo.regions = rawGeo.regions.map(c => ({ key: String(c.key) })); 
      hasLocation = true; 
    }
    if (rawGeo.zips && rawGeo.zips.length > 0) { 
      cleanGeo.zips = rawGeo.zips.map(c => ({ key: String(c.key) })); 
      hasLocation = true; 
    }

    // Meta API requires at least one valid location targeting
    if (!hasLocation) {
      cleanGeo.countries = ["US"];
    }

    // EU countries require DSA fields — only include them when targeting EU
    const EU_COUNTRIES = new Set(["AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK"]);
    const targetedCountries: string[] = cleanGeo.countries || [];
    const isEuTargeted = targetedCountries.some((c: string) => EU_COUNTRIES.has(c));

    const targeting: any = {
      geo_locations: cleanGeo,
      age_min: ageMin,
      age_max: ageMax,
      ...(gender !== 0 ? { genders: [gender] } : {}),
      targeting_automation: {
        advantage_audience: 0,
      },
    };

    const dsaFields = isEuTargeted ? {
      dsa_beneficiary: dsaBeneficiary,
      dsa_payor: dsaPayor,
    } : {};

    // ── Execute Concurrent Tasks: Media Upload & Page ID Fetch ──
    const [mediaPayload, pageId] = await Promise.all([
      uploadMedia(link_data, isVideo, accessToken, adAccountId),
      fetchPageId(accessToken)
    ]);

    // ── Sequential Tasks: Campaign -> Ad Set -> Creative -> Ad ──
    const campaignId = await createCampaign(
      existingCampaignId, adAccountId, accessToken, campaignName, objective, 
      specialAdCats, isCbo, budgetType, dailyBudget, lifetimeBudget
    );

    const adSetId = await createAdSet(
      adAccountId, accessToken, adSetName, campaignId, isCbo, 
      budgetType, dailyBudget, lifetimeBudget, startTime, stopTime, 
      targeting, dsaFields
    );

    const creativeId = await createAdCreative(
      adAccountId, accessToken, isVideo, pageId, mediaPayload, 
      headline, primaryText, websiteUrl, ctaType, adName
    );

    const adId = await createAd(
      adAccountId, accessToken, adName, adSetId, creativeId
    );

    return Response.json({
      success: true,
      campaignId,
      adSetId,
      adId,
    });
  } catch (error) {
    console.error("Launch Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
