"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  SectionTitle,
  Badge,
  Spinner,
  PrimaryButton,
} from "./components";

// ─── HELPERS ─────────────────────────────────────────────────
const normalizeSupabaseUrl = (url: string | null | undefined): string | null | undefined => {
  if (!url || typeof url !== "string") return url;
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!currentUrl) return url;
  if (url.includes("/storage/v1/object/")) {
    const parts = url.split("/object/");
    if (parts.length < 2) return url;
    const pathParts = parts[1].replace(/^(public\/|authenticated\/)/, "").split("/");
    const bucket = pathParts[0];
    const filename = pathParts.slice(1).join("/");
    if (!bucket || !filename) return url;
    return `${currentUrl}/storage/v1/object/public/${bucket}/${filename}`;
  }
  return url;
};

// ─── DEFAULT SCHEMA ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: any = {
  campaign: {
    name: "treatment_pathway_q2_2026",
    objective: "OUTCOME_TRAFFIC",
    buying_type: "AUCTION",
    special_ad_categories: ["NONE"],
    is_adset_budget_sharing_enabled: false,
  },
  ad_set: {
    name: "Regional_Health_30-65_All",
    daily_budget: 5000,
    lifetime_budget: 50000,
    budget_type: "DAILY",
    start_time: new Date().toISOString().slice(0, 16),
    stop_time: "",
    has_end_date: false,
    age_min: 30,
    age_max: 65,
    gender: 0,
    geo_locations: {
      countries: ["CA", "GB"],
      location_types: ["home", "recent"],
    },
    optimization_goal: "OFFSITE_CONVERSIONS",
    targeting_keywords: [
      "healthcare services",
      "medical specialists",
      "orthopedic care",
      "specialized clinic",
      "preventative health",
      "JCI accredited",
      "affordable surgery",
      "cardiology unit",
      "diagnostic imaging",
      "patient safety",
    ],
  },
  ad: {
    id: Date.now(),
    name: "Video_PatientJourney_H1",
    type: "video",
    media_type: "video",
    headline: "World-Class Surgical Care & Safety",
    description: "Experience our state-of-the-art medical facilities and patient-centered care.",
    primary_text:
      "From referral to recovery — experience JCI‑accredited excellence, state‑of‑the‑art facilities, and compassionate patient care. Watch our facility tour and book an initial consultation.",
    website_url: "https://togahh.com/",
    display_link: "togahh.com",
    call_to_action_type: "LEARN_MORE",
    facebook_page: "TogaHealth",
    instagram_account: "togahealth_official",
  },
  link_data: normalizeSupabaseUrl("https://nidoqmcxmlyiovdktzxg.supabase.co/storage/v1/object/AD1/08-04-2026_11-55AM.mp4"),
};

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const GENDER_LABELS: Record<number, string> = { 0: "All Patients", 1: "Male", 2: "Female" };
const BUYING_TYPES = ["AUCTION", "REACH"];
const AD_CATEGORIES = ["NONE", "EMPLOYMENT", "HOUSING", "CREDIT", "ISSUES_ELECTIONS_POLITICS"];
const CAMPAIGN_OBJECTIVES = [
  { value: "OUTCOME_AWARENESS", label: "Awareness", icon: "📢" },
  { value: "OUTCOME_TRAFFIC", label: "Traffic", icon: "🌐" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement", icon: "💬" },
  { value: "OUTCOME_LEADS", label: "Leads", icon: "📋" },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion", icon: "📱" },
  { value: "OUTCOME_SALES", label: "Sales", icon: "🛍️" },
];
const OPTIMIZATION_GOALS = [
  { value: "OFFSITE_CONVERSIONS", label: "Conversions" },
  { value: "LINK_CLICKS", label: "Link Clicks" },
  { value: "REACH", label: "Reach" },
  { value: "IMPRESSIONS", label: "Impressions" },
  { value: "POST_ENGAGEMENT", label: "Post Engagement" },
];
const BUDGET_TYPES = [
  { value: "DAILY", label: "Daily budget" },
  { value: "LIFETIME", label: "Lifetime budget" },
];

interface CampaignSetupProps {
  onSelect: (campaign: any) => void;
  selectedId: string | null | undefined;
  selectedAd: any;
}

export default function CampaignSetup({ onSelect, selectedId, selectedAd }: CampaignSetupProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [newCampaignName, setNewCampaignName] = useState<string>("");

  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [configJson, setConfigJson] = useState<string>(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [jsonError, setJsonError] = useState<string>("");
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  const [launching, setLaunching] = useState<boolean>(false);
  const [launchStep, setLaunchStep] = useState<number>(0);
  const [launchError, setLaunchError] = useState<string>("");
  const [launchSuccess, setLaunchSuccess] = useState<boolean>(false);
  const [hasLaunchedThisSegment, setHasLaunchedThisSegment] = useState<boolean>(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/meta/live-campaigns");
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data || []);
      } else {
        setError(data.error || "Failed to fetch campaigns");
      }
    } catch (e) {
      setError("Failed to connect to API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  useEffect(() => {
    if (selectedAd) {
      try {
        let parsed: any = {};
        if (typeof selectedAd["json data"] === "string") {
          parsed = JSON.parse(selectedAd["json data"]);
        } else if (selectedAd["json data"]) {
          parsed = selectedAd["json data"];
        }
        const isVideo = (selectedAd.format || "").toLowerCase() === "video";
        const newConfig = { ...DEFAULT_CONFIG };
        if (parsed.campaign) newConfig.campaign = { ...DEFAULT_CONFIG.campaign, ...parsed.campaign };
        if (parsed.ad_set) newConfig.ad_set = { ...DEFAULT_CONFIG.ad_set, ...parsed.ad_set };
        if (parsed.ad) {
          newConfig.ad = { ...DEFAULT_CONFIG.ad, ...parsed.ad };
        } else if (parsed.ads && parsed.ads[0]) {
          newConfig.ad = { ...DEFAULT_CONFIG.ad, ...parsed.ads[0] };
        }
        newConfig.ad.id = selectedAd.id || Date.now();
        if (selectedAd.text) newConfig.link_data = selectedAd.text;
        newConfig.ad.media_type = isVideo ? "video" : "image";
        newConfig.ad.type = isVideo ? "video" : "image";
        setConfig(newConfig);
        setConfigJson(JSON.stringify(newConfig, null, 2));
        setJsonError("");
      } catch (e) {
        console.error("Failed to parse selectedAd", e);
      }
    }
  }, [selectedAd]);

  useEffect(() => { setHasLaunchedThisSegment(false); }, [selectedId, selectedAd]);

  useEffect(() => {
    try {
      const parsed = typeof configJson === "string" ? JSON.parse(configJson) : { ...config };
      let changed = false;
      if (selectedId && parsed.campaign) { delete parsed.campaign; changed = true; }
      else if (!selectedId && !parsed.campaign) { parsed.campaign = DEFAULT_CONFIG.campaign; changed = true; }
      if (changed) { setConfig(parsed); setConfigJson(JSON.stringify(parsed, null, 2)); }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleJsonChange = (raw: string) => {
    setConfigJson(raw);
    try {
      const parsed = JSON.parse(raw);
      setConfig(parsed);
      setJsonError("");
      setHasLaunchedThisSegment(false);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const setField = (section: string, key: string, value: any) => {
    const next = { ...config, [section]: { ...config[section], [key]: value } };
    setConfig(next);
    setConfigJson(JSON.stringify(next, null, 2));
    setHasLaunchedThisSegment(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCampaignName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/meta/live-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName }),
      });
      const data = await res.json();
      if (res.ok) { setNewCampaignName(""); await fetchCampaigns(); }
      else { alert(data.error || "Failed to create campaign"); }
    } catch (e) { alert("Failed to create campaign"); }
    finally { setCreating(false); }
  };

  const handleCTAChange = (newCta: string) => {
    const suggestions: Record<string, string> = {
      WHATSAPP_MESSAGE: "+10000000000",
      CONTACT_US: "https://togahh.com/contact",
      MESSAGE_PAGE: "https://m.me/togahh",
    };
    const nextLink = suggestions[newCta] || "https://togahh.com/";
    const nextConfig = { ...config, ad: { ...config.ad, call_to_action_type: newCta, website_url: nextLink } };
    setConfig(nextConfig);
    setConfigJson(JSON.stringify(nextConfig, null, 2));
    setHasLaunchedThisSegment(false);
  };

  const handleFullLaunch = async () => {
    setLaunching(true);
    setLaunchError("");
    setLaunchSuccess(false);
    setLaunchStep(1);
    try {
      const sanitizedConfig = {
        ...config,
        ad_set: {
          ...config.ad_set,
          age_min: (config.ad_set?.age_min === "" || config.ad_set?.age_min === undefined) ? 18 : Number(config.ad_set.age_min),
          age_max: (config.ad_set?.age_max === "" || config.ad_set?.age_max === undefined) ? 65 : Number(config.ad_set.age_max),
          daily_budget: (config.ad_set?.daily_budget === "" || config.ad_set?.daily_budget === undefined) ? 5000 : Number(config.ad_set.daily_budget),
          lifetime_budget: (config.ad_set?.lifetime_budget === "" || config.ad_set?.lifetime_budget === undefined) ? 50000 : Number(config.ad_set.lifetime_budget),
        },
      };
      const res = await fetch("/api/meta/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: sanitizedConfig, campaignId: selectedId || null }),
      });
      let data;
      const text = await res.text();
      try { data = JSON.parse(text); } catch (err) { throw new Error(`Server error: ${text.slice(0, 100)}...`); }
      if (res.ok) {
        setLaunchStep(5);
        setLaunchSuccess(true);
        setHasLaunchedThisSegment(true);
        await fetchCampaigns();
      } else {
        let errMsg = data.error || "Launch failed";
        if (errMsg.includes("1885760")) errMsg = "Goal Mismatch: The selected campaign uses a different Optimization Goal. Tip: Click 'Reset Selection' to launch as a New Pathway, or match the existing campaign's goal.";
        setLaunchError(errMsg);
        setLaunchStep(0);
      }
    } catch (e: any) {
      let friendlyMsg = e.message;
      if (friendlyMsg.includes("1885760")) friendlyMsg = "Goal Mismatch: The selected campaign uses a different Optimization Goal. Tip: Click 'Reset Selection' to launch as a New Pathway, or match the existing campaign's goal.";
      else if (friendlyMsg.includes("100")) friendlyMsg = "Invalid Parameter: Please check your budget or targeting settings.";
      setLaunchError(friendlyMsg);
      setLaunchStep(0);
    } finally { setLaunching(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return { color: "var(--green)", bg: "var(--green-light)" };
      case "PAUSED": return { color: "var(--amber)", bg: "var(--amber-light)" };
      case "IN_PROCESS": return { color: "var(--primary)", bg: "var(--primary-light)" };
      default: return { color: "var(--text-muted)", bg: "var(--surface)" };
    }
  };

  const selectedCampaign = campaigns.find((c) => c.id === selectedId);
  const isVideo = config.ad?.media_type === "video" || config.ad?.type === "video";
  const mediaUrl = config.link_data || "";
  const websiteHostname = (() => {
    try { return new URL(config.ad?.website_url || "https://healpoint.ai").hostname.toUpperCase(); }
    catch { return "HEALPOINT.AI"; }
  })();

  const getGeographyDisplay = () => {
    const geo = config.ad_set?.geo_locations;
    if (!geo) return "—";
    const parts: string[] = [];
    if (geo.countries) geo.countries.forEach((c: any) => parts.push(c));
    if (geo.cities) geo.cities.forEach((c: any) => parts.push(c.name || c.key));
    if (geo.regions) geo.regions.forEach((c: any) => parts.push(c.name || c.key));
    if (geo.zips) geo.zips.forEach((c: any) => parts.push(c.name || c.key));
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 0 3px var(--primary-light)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Meta Ads Manager</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Campaign Assembly</h2>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0", lineHeight: 1.5 }}>Design and launch structured Meta Ads pipelines.</p>
        </div>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            style={{ padding: "9px 16px", borderRadius: 10, border: "1.5px solid #fca5a5", background: "#fff5f5", fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff5f5"; }}
          >
            <span style={{ fontSize: 11 }}>✕</span> Reset Selection
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── ROW 1: Ad Preview | Campaign List | Summary Card ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-start">

          {/* Phone preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>Ad Preview</p>
              <div style={{ border: "10px solid #1c1c1e", borderRadius: 36, overflow: "hidden", boxShadow: "0 20px 48px -12px rgba(0,0,0,0.25), 0 0 0 1px #2a2a2a", position: "relative", background: "#fff" }}>
                <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 90, height: 22, background: "#1c1c1e", borderBottomLeftRadius: 14, borderBottomRightRadius: 14, zIndex: 10 }} />
                <div style={{ paddingTop: 28, background: "#fff" }}>
                  <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2563EB, #0891B2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 800, flexShrink: 0 }}>H</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{config.ad_set?.dsa_beneficiary || "HealPoint Health"}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>Sponsored · Clinical Excellence</div>
                    </div>
                  </div>
                  <div style={{ padding: "0 14px 12px", fontSize: 12, lineHeight: 1.5, color: "#1e293b" }}>
                    {config.ad?.primary_text || "World-class care starts today."}
                  </div>
                  <div style={{ background: "#000", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {mediaUrl ? (
                      isVideo
                        ? <video src={mediaUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        : <img src={mediaUrl} alt="Ad Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ color: "#64748b", fontSize: 12, padding: 20, textAlign: "center" }}>Media pending...</div>
                    )}
                  </div>
                  <div style={{ padding: "12px 16px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>{websiteHostname}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{config.ad?.headline || "Learn More Today"}</div>
                    </div>
                    <button style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 7, border: "1.5px solid #cbd5e1", background: "#fff", fontWeight: 700, fontSize: 11, color: "#1e293b", cursor: "default" }}>
                      {(config.ad?.call_to_action_type || "LEARN_MORE").replace(/_/g, " ")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campaign list */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Existing Campaigns</p>
              </div>
              <button
                onClick={fetchCampaigns}
                disabled={loading}
                style={{ width: 32, height: 32, borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                title="Refresh"
              >
                <span style={{ display: "inline-block", transition: "transform 0.4s" }} className={loading ? "animate-spin" : ""}>↻</span>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: 48 }}><Spinner size={22} /></div>
              ) : campaigns.length === 0 ? (
                <div style={{ fontSize: 13, color: "#475569", textAlign: "center", padding: 48, background: "#f8fafc", borderRadius: 12 }}>No active campaigns found.</div>
              ) : (
                campaigns.map((c: any) => {
                  const isSelected = selectedId === c.id;
                  const { color, bg } = getStatusColor(c.effective_status);
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelect(c)}
                      style={{
                        padding: "12px 14px", borderRadius: 12,
                        border: isSelected ? "2px solid var(--primary)" : "1.5px solid #f1f5f9",
                        background: isSelected ? "#eff6ff" : "#fafafa",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.18s", boxShadow: isSelected ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f1f5f9"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "#fafafa"; }}
                    >
                      <div style={{ overflow: "hidden", flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#1d4ed8" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", marginTop: 2 }}>ID: {c.id}</div>
                      </div>
                      <Badge text={c.effective_status} color={color} bg={bg} />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary card */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Targeting Summary</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Patient Parameters</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <SummaryRow label="Geography" value={getGeographyDisplay()} />
              <SummaryRow label="Age Group" value={`${config.ad_set?.age_min || 18}–${config.ad_set?.age_max || 65}`} />
              <SummaryRow label="Gender" value={GENDER_LABELS[config.ad_set?.gender ?? 0]} />
              <SummaryRow label="Daily Budget" value={`$${(config.ad_set?.daily_budget || 0) / 100} USD`} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Deployment Mode</span>
                <Badge
                  text={selectedId ? "Existing Pathway" : "New Pathway"}
                  bg={selectedId ? "var(--amber-light)" : "var(--primary-light)"}
                  color={selectedId ? "var(--amber)" : "var(--primary)"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Step Navigator ── */}
        {!showRawJson && (
          <div style={{ display: "flex", alignItems: "center", gap: 0, background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>
            {[
              { step: 1, label: "Campaign", sub: "Pathway Strategy" },
              { step: 2, label: "Ad Set", sub: "Targeting & Budget" },
              { step: 3, label: "Ad", sub: "Creative Identity" },
            ].map((item, i) => (
              <React.Fragment key={item.step}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{item.step}</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "#475569", marginTop: 1 }}>{item.sub}</div>
                  </div>
                </div>
                {i < 2 && <div style={{ width: 1, height: 28, background: "#e2e8f0", margin: "0 20px", flexShrink: 0 }} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ── ROW 2: Form Columns ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-start">

          {/* ── COLUMN 1: Campaign ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "var(--primary)" }}>1</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Campaign</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>Pathway strategy</div>
                </div>
              </div>
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: 700, color: "#64748b", transition: "all 0.15s" }}
              >
                {showRawJson ? "Visual" : "JSON"}
              </button>
            </div>

            <div style={{ padding: "18px 20px" }}>
              {showRawJson ? (
                <div>
                  <textarea
                    value={configJson}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    style={{ width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 12, padding: 14, border: jsonError ? "2px solid var(--red)" : "1.5px solid #e2e8f0", borderRadius: 10, background: "#0f172a", color: "#38bdf8", resize: "vertical", boxSizing: "border-box" }}
                    spellCheck={false}
                  />
                  {jsonError && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8, fontWeight: 600 }}>⚠ Invalid schema: {jsonError}</div>}
                </div>
              ) : selectedId ? (() => {
                const selCamp = campaigns.find(c => c.id === selectedId);
                return (
                  <div style={{ padding: 16, background: "#eff6ff", borderRadius: 12, border: "1.5px solid #bfdbfe", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Appending to Campaign</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{selCamp?.name || "Selected Campaign"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>ID: {selectedId}</div>
                      {selCamp?.objective && <div style={{ fontSize: 11, padding: "2px 8px", background: "rgba(37,99,235,0.08)", color: "#1d4ed8", borderRadius: 4, fontWeight: 600 }}>{selCamp.objective}</div>}
                      {selCamp?.status && <div style={{ fontSize: 11, padding: "2px 8px", background: selCamp.status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)", color: selCamp.status === "ACTIVE" ? "var(--green)" : "var(--amber)", borderRadius: 4, fontWeight: 800 }}>{selCamp.status}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>Campaign-level settings are locked when appending a new Ad Set.</div>
                  </div>
                );
              })() : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <FieldGroup label="Campaign Name">
                    <input value={config.campaign?.name || ""} onChange={(e) => setField("campaign", "name", e.target.value)} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="Buying Type">
                    <select value={config.campaign?.buying_type || "AUCTION"} onChange={(e) => setField("campaign", "buying_type", e.target.value)} style={inputStyle}>
                      {BUYING_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Campaign Objective">
                    <select value={config.campaign?.objective || "OUTCOME_SALES"} onChange={(e) => setField("campaign", "objective", e.target.value)} style={inputStyle}>
                      {CAMPAIGN_OBJECTIVES.map(obj => <option key={obj.value} value={obj.value}>{obj.icon} {obj.label}</option>)}
                    </select>
                  </FieldGroup>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#f8fafc", borderRadius: 12, border: "1.5px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Advantage+ Budget</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>AI-optimized distribution</div>
                    </div>
                    <label style={{ position: "relative", display: "inline-block", width: 40, height: 22, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        id="cbo-toggle"
                        checked={config.campaign?.is_adset_budget_sharing_enabled || false}
                        onChange={(e) => setField("campaign", "is_adset_budget_sharing_enabled", e.target.checked)}
                        style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
                      />
                      <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11,
                        background: config.campaign?.is_adset_budget_sharing_enabled ? "var(--primary)" : "#cbd5e1",
                        transition: "background 0.2s"
                      }}>
                        <div style={{
                          position: "absolute", top: 3, left: config.campaign?.is_adset_budget_sharing_enabled ? 21 : 3,
                          width: 16, height: 16, borderRadius: "50%", background: "#fff",
                          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                        }} />
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── COLUMN 2: Ad Set ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", opacity: showRawJson ? 0.35 : 1, pointerEvents: showRawJson ? "none" : "auto", transition: "opacity 0.2s" }}>
            <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#d97706" }}>2</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Ad Set</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Targeting & budget</div>
              </div>
            </div>

            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
              <FieldGroup label="Ad Set Name">
                <input value={config.ad_set?.name || ""} onChange={(e) => setField("ad_set", "name", e.target.value)} style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="Target Locations">
                <LocationSearch geoLocations={config.ad_set?.geo_locations} onChange={(newGeo) => setField("ad_set", "geo_locations", newGeo)} />
              </FieldGroup>
              <FieldGroup label="Optimization Goal">
                <select value={config.ad_set?.optimization_goal || "OFFSITE_CONVERSIONS"} onChange={(e) => setField("ad_set", "optimization_goal", e.target.value)} style={inputStyle}>
                  {OPTIMIZATION_GOALS.map(goal => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
                </select>
              </FieldGroup>

              {/* Budget & Schedule sub-section */}
              <div style={{ borderRadius: 12, border: "1.5px solid #f1f5f9", background: "#fafafa", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Budget & Schedule</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 8px", borderRadius: 20 }}>Live Sync</span>
                </div>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Budget Type">
                      <select value={config.ad_set?.budget_type || "DAILY"} onChange={(e) => setField("ad_set", "budget_type", e.target.value)} style={inputStyle}>
                        {BUDGET_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                      </select>
                    </FieldGroup>
                    <FieldGroup label={`Amount (${config.ad_set?.budget_type === "DAILY" ? "Daily" : "Lifetime"}) $`}>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#475569", fontWeight: 600, fontSize: 13 }}>$</span>
                        <input
                          type="number"
                          value={config.ad_set?.budget_type === "DAILY"
                            ? (config.ad_set?.daily_budget === "" || config.ad_set?.daily_budget === undefined ? "" : config.ad_set?.daily_budget / 100)
                            : (config.ad_set?.lifetime_budget === "" || config.ad_set?.lifetime_budget === undefined ? "" : config.ad_set?.lifetime_budget / 100)}
                          onChange={(e) => {
                            const val = e.target.value;
                            const key = config.ad_set?.budget_type === "DAILY" ? "daily_budget" : "lifetime_budget";
                            setField("ad_set", key, val === "" ? "" : Math.round(Number(val) * 100));
                          }}
                          style={{ ...inputStyle, paddingLeft: 26 }}
                          placeholder="0.00"
                          step="0.01"
                        />
                      </div>
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldGroup label="Start Date">
                      <input type="datetime-local" value={config.ad_set?.start_time || ""} onChange={(e) => setField("ad_set", "start_time", e.target.value)} style={inputStyle} />
                    </FieldGroup>
                    <FieldGroup label="End Date">
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                          <input type="checkbox" id="end-date-toggle" checked={config.ad_set?.has_end_date || false} onChange={(e) => setField("ad_set", "has_end_date", e.target.checked)} style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Set end date</span>
                        </label>
                        {config.ad_set?.has_end_date && (
                          <input type="datetime-local" value={config.ad_set?.stop_time || ""} onChange={(e) => setField("ad_set", "stop_time", e.target.value)} style={inputStyle} />
                        )}
                      </div>
                    </FieldGroup>
                  </div>
                </div>
              </div>

              {/* Demographics sub-section */}
              <div style={{ borderRadius: 12, border: "1.5px solid #f1f5f9", background: "#fafafa", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Demographics</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#f5f3ff", padding: "2px 8px", borderRadius: 20 }}>Age & Gender</span>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="Gender">
                      <select value={config.ad_set?.gender ?? 0} onChange={(e) => setField("ad_set", "gender", Number(e.target.value))} style={inputStyle}>
                        <option value={0}>All</option>
                        <option value={1}>Male</option>
                        <option value={2}>Female</option>
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Min Age">
                      <input type="number" min={18} max={65} value={config.ad_set?.age_min === "" || config.ad_set?.age_min === undefined ? "" : config.ad_set?.age_min} onChange={(e) => { const val = e.target.value; setField("ad_set", "age_min", val === "" ? "" : Number(val)); }} style={inputStyle} />
                    </FieldGroup>
                    <FieldGroup label="Max Age">
                      <input type="number" min={18} max={65} value={config.ad_set?.age_max === "" || config.ad_set?.age_max === undefined ? "" : config.ad_set?.age_max} onChange={(e) => { const val = e.target.value; setField("ad_set", "age_max", val === "" ? "" : Number(val)); }} style={inputStyle} />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUMN 3: Ad Creative ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", opacity: showRawJson ? 0.35 : 1, pointerEvents: showRawJson ? "none" : "auto", transition: "opacity 0.2s" }}>
            <div style={{ padding: "18px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#16a34a" }}>3</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Ad Creative</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Identity & copy</div>
              </div>
            </div>

            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <FieldGroup label="Ad Name">
                <input value={config.ad?.name || ""} onChange={(e) => setField("ad", "name", e.target.value)} style={inputStyle} />
              </FieldGroup>

              <div style={{ borderRadius: 12, border: "1.5px solid #f1f5f9", background: "#fafafa", padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Account Identity</div>
                <FieldGroup label="Facebook Page">
                  <input value={config.ad?.facebook_page || ""} onChange={(e) => setField("ad", "facebook_page", e.target.value)} style={inputStyle} />
                </FieldGroup>
              </div>

              <FieldGroup label="Primary Ad Text">
                <textarea value={config.ad?.primary_text || ""} onChange={(e) => setField("ad", "primary_text", e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-3">
                <FieldGroup label="Headline">
                  <input value={config.ad?.headline || ""} onChange={(e) => setField("ad", "headline", e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="CTA Button">
                  <select value={config.ad?.call_to_action_type || "LEARN_MORE"} onChange={(e) => handleCTAChange(e.target.value)} style={inputStyle}>
                    <option value="LEARN_MORE">Learn More</option>
                    <option value="BOOK_NOW">Book Now</option>
                    <option value="CONTACT_US">Contact Us</option>
                    <option value="GET_QUOTE">Get Estimate</option>
                    <option value="WHATSAPP_MESSAGE">WhatsApp</option>
                    <option value="MESSAGE_PAGE">Message Page</option>
                  </select>
                </FieldGroup>
              </div>

              <FieldGroup label="Ad Description">
                <input value={config.ad?.description || ""} onChange={(e) => setField("ad", "description", e.target.value)} style={inputStyle} />
              </FieldGroup>

              <div style={{ borderRadius: 12, border: "1.5px solid #dbeafe", background: "#eff6ff", padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Destination URL</div>
                <FieldGroup label="Website / WhatsApp / Messenger Link">
                  <input
                    placeholder="https://togahh.com"
                    value={config.ad?.website_url || ""}
                    onChange={(e) => setField("ad", "website_url", e.target.value)}
                    style={{ ...inputStyle, background: "#fff", borderColor: "#93c5fd" }}
                  />
                </FieldGroup>
              </div>
            </div>
          </div>
        </div>

        {/* ── Launch Panel ── */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          border: launchSuccess ? "2px solid #86efac" : selectedId ? "2px solid #fcd34d" : "2px solid #bfdbfe",
          padding: "32px 36px",
          boxShadow: launchSuccess ? "0 12px 40px -8px rgba(16,185,129,0.15)" : selectedId ? "0 12px 40px -8px rgba(245,158,11,0.15)" : "0 12px 40px -8px rgba(37,99,235,0.12)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, flexShrink: 0,
              background: launchSuccess ? "#f0fdf4" : selectedId ? "#fffbeb" : "#eff6ff",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
            }}>
              {launchSuccess ? "✨" : selectedId ? "📥" : "🚀"}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 6, letterSpacing: "-0.02em" }}>
                {launchSuccess ? "Campaign Launched Successfully" : selectedId ? `Inject Ads to: ${selectedCampaign?.name}` : "Launch Campaign on Facebook"}
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                {launchSuccess
                  ? "Your ad campaign has been published. Review and manage it in Meta Ads Manager."
                  : selectedId
                    ? `Ad sets and creatives will be injected into the ${selectedCampaign?.name} campaign.`
                    : "Deploy this campaign, ad sets, and creative assets directly to Meta Ads Manager."}
              </div>

              {launching ? (
                <div style={{ padding: "20px 24px", background: "#f8fafc", borderRadius: 14, border: "1.5px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <Spinner size={16} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>
                      {launchStep === 1 ? "Uploading Media Assets & Ad Copy..." : launchStep === 2 ? "Compiling Campaign Schema..." : launchStep === 3 ? "Building Targeting Ad Sets..." : "Finalizing Meta Ad Delivery..."}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: "linear-gradient(90deg, var(--primary), var(--secondary))", width: `${(launchStep / 4) * 100}%`, transition: "width 0.4s ease-out", borderRadius: 6 }} />
                  </div>
                </div>
              ) : launchSuccess ? (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <PrimaryButton onClick={() => window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID}`, "_blank")} style={{ background: "var(--secondary)", padding: "14px 28px", fontSize: 14 }}>
                    View in Meta Ads Manager ↗
                  </PrimaryButton>
                  <button
                    onClick={() => { setLaunchSuccess(false); setHasLaunchedThisSegment(false); }}
                    style={{ padding: "14px 28px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#475569", transition: "all 0.2s" }}
                  >
                    Queue Another Campaign
                  </button>
                </div>
              ) : (
                <PrimaryButton
                  onClick={handleFullLaunch}
                  disabled={launching || hasLaunchedThisSegment}
                  style={{
                    background: hasLaunchedThisSegment ? "var(--green)" : selectedId ? "var(--amber)" : "var(--primary)",
                    padding: "14px 36px", fontSize: 15, fontWeight: 800, letterSpacing: "0.02em",
                    opacity: hasLaunchedThisSegment ? 0.8 : 1,
                  }}
                >
                  {hasLaunchedThisSegment ? "✓ Launched Successfully" : selectedId ? "Inject Ads to Campaign →" : "Launch Ads on Facebook →"}
                </PrimaryButton>
              )}

              {launchError && (
                <div style={{ marginTop: 16, padding: "14px 18px", borderRadius: 12, background: "#fef2f2", color: "#991b1b", fontSize: 14, border: "1.5px solid #fca5a5", lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 800 }}>Error: </span>{launchError}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", textAlign: "right", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function FieldGroup({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-1 sm:col-span-2 flex flex-col gap-1.5" : "flex flex-col gap-1.5"}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 9,
  border: "1.5px solid #e2e8f0",
  background: "#fff",
  fontSize: 13,
  fontWeight: 500,
  color: "#0f172a",
  width: "100%",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
  outline: "none",
};

// ─── LocationSearch ──────────────────────────────────────────────────────────

interface LocationSearchProps {
  geoLocations: any;
  onChange: (newGeo: any) => void;
}

function LocationSearch({ geoLocations, onChange }: LocationSearchProps) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const selectedPills: any[] = [];
  if (geoLocations) {
    if (geoLocations.countries) geoLocations.countries.forEach((c: any) => selectedPills.push({ type: "country", key: c, name: c }));
    if (geoLocations.cities) geoLocations.cities.forEach((c: any) => selectedPills.push({ type: "city", key: c.key, name: c.name || c.key }));
    if (geoLocations.regions) geoLocations.regions.forEach((c: any) => selectedPills.push({ type: "region", key: c.key, name: c.name || c.key }));
    if (geoLocations.zips) geoLocations.zips.forEach((c: any) => selectedPills.push({ type: "zip", key: c.key, name: c.name || c.key }));
  }

  useEffect(() => {
    if (!query.trim()) { setResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/meta/locations?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data || []);
        setShowDropdown(true);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: any) => {
    const newGeo = { ...geoLocations, location_types: geoLocations?.location_types || ["home", "recent"] };
    if (item.type === "country") {
      newGeo.countries = [...(newGeo.countries || []), item.country_code];
      if (newGeo.cities) newGeo.cities = newGeo.cities.filter((c: any) => c.country_code !== item.country_code);
      if (newGeo.regions) newGeo.regions = newGeo.regions.filter((c: any) => c.country_code !== item.country_code);
      if (newGeo.zips) newGeo.zips = newGeo.zips.filter((c: any) => c.country_code !== item.country_code);
    } else {
      const locObj = { key: item.key, name: item.name, country_code: item.country_code };
      if (item.type === "city") newGeo.cities = [...(newGeo.cities || []), locObj];
      if (item.type === "region") newGeo.regions = [...(newGeo.regions || []), locObj];
      if (item.type === "zip") newGeo.zips = [...(newGeo.zips || []), locObj];
      if (item.country_code && newGeo.countries && newGeo.countries.includes(item.country_code)) {
        newGeo.countries = newGeo.countries.filter((c: any) => c !== item.country_code);
      }
    }
    if (newGeo.countries && newGeo.countries.length === 0) delete newGeo.countries;
    if (newGeo.cities && newGeo.cities.length === 0) delete newGeo.cities;
    if (newGeo.regions && newGeo.regions.length === 0) delete newGeo.regions;
    if (newGeo.zips && newGeo.zips.length === 0) delete newGeo.zips;
    onChange(newGeo);
    setQuery("");
    setShowDropdown(false);
  };

  const handleRemove = (pill: any) => {
    const newGeo = { ...geoLocations };
    if (pill.type === "country") { newGeo.countries = newGeo.countries.filter((c: any) => c !== pill.key); if (newGeo.countries.length === 0) delete newGeo.countries; }
    if (pill.type === "city") { newGeo.cities = newGeo.cities.filter((c: any) => c.key !== pill.key); if (newGeo.cities.length === 0) delete newGeo.cities; }
    if (pill.type === "region") { newGeo.regions = newGeo.regions.filter((c: any) => c.key !== pill.key); if (newGeo.regions.length === 0) delete newGeo.regions; }
    if (pill.type === "zip") { newGeo.zips = newGeo.zips.filter((c: any) => c.key !== pill.key); if (newGeo.zips.length === 0) delete newGeo.zips; }
    onChange(newGeo);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder="Search countries, cities, regions..."
          style={{ ...inputStyle, paddingRight: 36 }}
        />
        {loading && <div style={{ position: "absolute", right: 12 }}><Spinner size={14} /></div>}
      </div>
      {showDropdown && results.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, maxHeight: 200, overflowY: "auto" }}>
          {results.map((r: any) => (
            <div
              key={r.key}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600, color: "#0f172a" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{r.type?.toUpperCase()} · {r.country_name || r.country_code || "Unknown"}</div>
            </div>
          ))}
        </div>
      )}
      {selectedPills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {selectedPills.map((p: any) => (
            <div key={`${p.type}-${p.key}`} style={{ display: "flex", alignItems: "center", gap: 5, background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid #bfdbfe" }}>
              {p.type === "country" ? "🌐" : p.type === "city" ? "🏙️" : "🗺️"} {p.name}
              <button onClick={(e) => { e.preventDefault(); handleRemove(p); }} style={{ border: "none", background: "transparent", color: "#3b82f6", cursor: "pointer", fontSize: 13, padding: 0, marginLeft: 2, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
