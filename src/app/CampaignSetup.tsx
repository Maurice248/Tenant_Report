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
/**
 * Ensures Supabase storage URLs use the current project's hostname.
 */
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
  { value: "POST_ENGAGEMENT", label: "Post Engagement" }
];
const BUDGET_TYPES = [
  { value: "DAILY", label: "Daily budget" },
  { value: "LIFETIME", label: "Lifetime budget" }
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
  const [keywordInput, setKeywordInput] = useState<string>("");

  // ── Editable JSON config ──────────────────────────────────────────────────
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);
  const [configJson, setConfigJson] = useState<string>(
    JSON.stringify(DEFAULT_CONFIG, null, 2)
  );
  const [jsonError, setJsonError] = useState<string>("");
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // ── Launch state ──────────────────────────────────────────────────────────
  const [launching, setLaunching] = useState<boolean>(false);
  const [launchStep, setLaunchStep] = useState<number>(0);
  const [launchError, setLaunchError] = useState<string>("");
  const [launchSuccess, setLaunchSuccess] = useState<boolean>(false);

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

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

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
        if (selectedAd.text) {
          newConfig.link_data = selectedAd.text;
        }
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

  useEffect(() => {
    try {
      const parsed = typeof configJson === "string" ? JSON.parse(configJson) : { ...config };
      let changed = false;

      if (selectedId && parsed.campaign) {
        delete parsed.campaign;
        changed = true;
      } else if (!selectedId && !parsed.campaign) {
        parsed.campaign = DEFAULT_CONFIG.campaign;
        changed = true;
      }

      if (changed) {
        setConfig(parsed);
        setConfigJson(JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      // Ignore parse errors during transition
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleJsonChange = (raw: string) => {
    setConfigJson(raw);
    try {
      const parsed = JSON.parse(raw);
      setConfig(parsed);
      setJsonError("");
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const setField = (section: string, key: string, value: any) => {
    const next = { ...config, [section]: { ...config[section], [key]: value } };
    setConfig(next);
    setConfigJson(JSON.stringify(next, null, 2));
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
      if (res.ok) {
        setNewCampaignName("");
        await fetchCampaigns();
      } else {
        alert(data.error || "Failed to create campaign");
      }
    } catch (e) {
      alert("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleCTAChange = (newCta: string) => {
    const suggestions: Record<string, string> = {
      WHATSAPP_MESSAGE: "+10000000000",
      CONTACT_US: "https://togahh.com/contact",
      MESSAGE_PAGE: "https://m.me/togahh",
    };

    const nextLink = suggestions[newCta] || "https://togahh.com/";
    
    // Update both CTA and the Link in one go
    const nextConfig = { 
      ...config, 
      ad: { 
        ...config.ad, 
        call_to_action_type: newCta,
        website_url: nextLink 
      } 
    };
    setConfig(nextConfig);
    setConfigJson(JSON.stringify(nextConfig, null, 2));
  };

  const handleFullLaunch = async () => {
    setLaunching(true);
    setLaunchError("");
    setLaunchSuccess(false);
    setLaunchStep(1);

    try {
      const res = await fetch("/api/meta/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: config,
          campaignId: selectedId || null,
        }),
      });

      let data;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server error: ${text.slice(0, 100)}...`);
      }

      if (res.ok) {
        setLaunchStep(5);
        setLaunchSuccess(true);
        await fetchCampaigns();
      } else {
        let errMsg = data.error || "Launch failed";
        if (errMsg.includes("1885760")) {
          errMsg = "Goal Mismatch: The selected campaign uses a different Optimization Goal. Tip: Click 'Reset Selection' to launch as a New Pathway, or match the existing campaign's goal.";
        }
        setLaunchError(errMsg);
        setLaunchStep(0);
      }

    } catch (e: any) {
      let friendlyMsg = e.message;
      if (friendlyMsg.includes("1885760")) {
        friendlyMsg = "Goal Mismatch: The selected campaign uses a different Optimization Goal. Tip: Click 'Reset Selection' to launch as a New Pathway, or match the existing campaign's goal.";
      } else if (friendlyMsg.includes("100")) {
        friendlyMsg = "Invalid Parameter: Please check your budget or targeting settings.";
      }
      setLaunchError(friendlyMsg);
      setLaunchStep(0);
    } finally {
      setLaunching(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { color: "var(--green)", bg: "var(--green-light)" };
      case "PAUSED":
        return { color: "var(--amber)", bg: "var(--amber-light)" };
      case "IN_PROCESS":
        return { color: "var(--primary)", bg: "var(--primary-light)" };
      default:
        return { color: "var(--text-muted)", bg: "var(--surface)" };
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ marginBottom: 32, padding: "0 8px" }}>
        <div>
          <SectionTitle style={{ marginBottom: 6, fontSize: 24, color: "var(--text)" }}>
            Clinical Campaign Assembly
          </SectionTitle>
          <div style={{ fontSize: 14, color: "var(--text-muted)", letterSpacing: "0.01em" }}>
            Design precision treatment pathways and launch structured clinical recruitment draft pipelines.
          </div>
        </div>
        {selectedId && (
          <button
            onClick={() => onSelect(null)}
            style={{ padding: "10px 16px", borderRadius: "10px", border: "1.5px solid var(--border)", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
          >
            ✕ Reset Selection
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7 items-start">

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{
              border: "14px solid #1c1c1e", borderRadius: 48, overflow: "hidden",
              boxShadow: "0 25px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px #333",
              position: "relative", background: "#fff",
              width: "100%", maxWidth: 320, margin: "0 auto"
            }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 30, background: "#1c1c1e", borderBottomLeftRadius: 18, borderBottomRightRadius: 18, zIndex: 10 }} />
              <div style={{ paddingTop: 38, background: "#fff" }}>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", fontWeight: 800 }}>H</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{config.ad_set?.dsa_beneficiary || "HealPoint Health"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Sponsored • Clinical Excellence</div>
                  </div>
                </div>
                <div style={{ padding: "0 16px 14px", fontSize: 13, lineHeight: 1.5, color: "#111" }}>
                  {config.ad?.primary_text || "World-class care starts today."}
                </div>
                <div style={{ background: "#000", aspectRatio: "1/1", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {mediaUrl ? (
                    isVideo ? <video src={mediaUrl} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <img src={mediaUrl} alt="Ad Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ color: "#666", fontSize: 13, padding: 24, textAlign: "center" }}>Clinical media pending...</div>
                  )}
                </div>
                <div style={{ padding: "16px 20px", borderTop: "1px solid #ebedf0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 32 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>{websiteHostname}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{config.ad?.headline || "Learn More Today"}</div>
                  </div>
                  <button style={{ flexShrink: 0, padding: "8px 20px", borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#f1f5f9", fontWeight: 700, fontSize: 13, color: "#1e293b" }}>
                    {(config.ad?.call_to_action_type || "LEARN_MORE").replace(/_/g, " ")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <SectionTitle style={{ marginBottom: 4 }}>Health Operations</SectionTitle>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Historical campaigns & protocols</div>
              </div>
              <button
                onClick={fetchCampaigns}
                disabled={loading}
                style={{
                  background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)",
                  padding: "8px 14px", borderRadius: 24, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                }}
              >
                <span className={loading ? "animate-spin" : ""}>↻</span> REFRESH
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto", paddingRight: 8 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: 60 }}><Spinner size={24} /></div>
              ) : campaigns.length === 0 ? (
                <div style={{ fontSize: 14, color: "var(--text-dim)", textAlign: "center", padding: 60, background: "var(--surface)", borderRadius: "var(--radius-lg)" }}>
                  No active operations found.
                </div>
              ) : (
                campaigns.map((c: any) => {
                  const isSelected = selectedId === c.id;
                  const { color, bg } = getStatusColor(c.effective_status);
                  return (
                     <div
                      key={c.id}
                      onClick={() => onSelect(c)}
                      style={{
                        padding: "16px", borderRadius: "var(--radius-lg)", border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: isSelected ? "var(--primary-light)" : "var(--card-bg)", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", transform: isSelected ? "scale(1.02)" : "scale(1)",
                        boxShadow: isSelected ? "var(--shadow-md)" : "none"
                      }}
                    >
                      <div style={{ overflow: "hidden", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? "var(--primary-dark)" : "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "monospace", opacity: 0.8 }}>ID: {c.id}</div>
                      </div>
                      <Badge text={c.effective_status} color={color} bg={bg} />
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle>Patient Targeting Parameters</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Row label="Geography" value={getGeographyDisplay()} />
              <Row label="Age Group" value={`${config.ad_set?.age_min || 18}–${config.ad_set?.age_max || 65}`} />
              <Row label="Gender Demographic" value={GENDER_LABELS[config.ad_set?.gender ?? 0]} />
              <Row label="Clinical Budget" value={`$${(config.ad_set?.daily_budget || 0) / 100} USD/day`} />
              <Row label="DSA Payor Entities" value={config.ad_set?.dsa_payor || "—"} />
              <Row label="Deployment Mode" value={null}>
                <Badge
                  text={selectedId ? "Existing Pathway" : "New Pathway"}
                  bg={selectedId ? "var(--amber-light)" : "var(--primary-light)"}
                  color={selectedId ? "var(--amber)" : "var(--primary)"}
                />
              </Row>
              {config.ad_set?.targeting_keywords?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>Clinical Focus</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {config.ad_set.targeting_keywords.map((kw: any) => (
                      <span key={kw} style={{ fontSize: 11, padding: "5px 12px", borderRadius: "var(--radius-pill)", background: "var(--primary-light)", color: "var(--primary-dark)", fontWeight: 700, border: "1px solid var(--primary)15" }}>{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Facebook-Style Hierarchy Header ── */}
        {!showRawJson && (
          <div className="hidden lg:grid lg:grid-cols-3 gap-7" style={{ marginBottom: -12, padding: "0 4px" }}>
            <div style={navSegmentStyle}>
              <div style={navBadgeStyle}>1</div>
              <div>
                <div style={navLabelStyle}>CAMPAIGN</div>
                <div style={navSubLabelStyle}>Pathway Strategy</div>
              </div>
              <div style={navConnectorStyle} />
            </div>
            <div style={navSegmentStyle}>
              <div style={navBadgeStyle}>2</div>
              <div>
                <div style={navLabelStyle}>AD SET</div>
                <div style={navSubLabelStyle}>Targeting & Budget</div>
              </div>
              <div style={navConnectorStyle} />
            </div>
            <div style={navSegmentStyle}>
              <div style={navBadgeStyle}>3</div>
              <div>
                <div style={navLabelStyle}>AD</div>
                <div style={navSubLabelStyle}>Creative Identity</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7 items-start">
          {/* Column 1: Campaign settings + Clinical Focus stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card style={{ border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 20, justifyContent: "space-between" }}>
                <SectionTitle style={{ marginBottom: 0 }}>CAMPAIGN | Pathway</SectionTitle>
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  style={{ fontSize: 12, padding: "6px 14px", borderRadius: "10px", border: "1.5px solid var(--border)", background: "var(--surface)", cursor: "pointer", fontWeight: 700, transition: "all 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#fff"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface)"}
                >
                  {showRawJson ? "Visual Mode" : "Developer JSON"}
                </button>
              </div>
            {showRawJson ? (
              <div>
                <textarea
                  value={configJson}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  style={{ width: "100%", minHeight: 240, fontFamily: "monospace", fontSize: 13, padding: 16, border: jsonError ? "2px solid var(--red)" : "1.5px solid var(--border)", borderRadius: "var(--radius-md)", background: "#0f172a", color: "#38bdf8", resize: "vertical" }}
                  spellCheck={false}
                />
                {jsonError && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 8, fontWeight: 600 }}>Invalid clinical schema: {jsonError}</div>}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {selectedId ? (() => {
                  const selCamp = campaigns.find(c => c.id === selectedId);
                  return (
                    <div style={{ padding: "20px", background: "var(--primary-light)", borderRadius: "var(--radius-lg)", border: "1px solid var(--primary)", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-dark)" }}>Appending to Existing Campaign</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{selCamp?.name || "Selected Campaign"}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>ID: {selectedId}</div>
                        {selCamp?.objective && (
                          <div style={{ fontSize: 11, padding: "2px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 4, fontWeight: 600 }}>{selCamp.objective}</div>
                        )}
                        {selCamp?.status && (
                          <div style={{ fontSize: 11, padding: "2px 8px", background: selCamp.status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)", color: selCamp.status === "ACTIVE" ? "var(--green)" : "var(--amber)", borderRadius: 4, fontWeight: 800 }}>{selCamp.status}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>Campaign-level settings cannot be edited when appending a new Ad Set.</div>
                    </div>
                  );
                })() : (
                  <>
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#f8fafc", borderRadius: "14px", border: "1.5px solid var(--border-light)", marginTop: 4 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", letterSpacing: "0.01em" }}>Advantage+ Campaign Budget</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>AI-optimized budget distribution</span>
                      </div>
                      <input 
                        type="checkbox" 
                        id="cbo-toggle"
                        checked={config.campaign?.is_adset_budget_sharing_enabled || false}
                        onChange={(e) => setField("campaign", "is_adset_budget_sharing_enabled", e.target.checked)}
                        style={{ width: 20, height: 20, accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
            </Card>

            {/* ── Clinical Focus — left column ── */}
            <Card style={{ border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)", opacity: showRawJson ? 0.3 : 1, pointerEvents: showRawJson ? "none" : "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <SectionTitle style={{ marginBottom: 0 }}>Clinical Focus</SectionTitle>
                <Badge text="Keywords" color="var(--primary)" bg="var(--primary-light)" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 14px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--surface)", minHeight: 54 }}>
                  {(config.ad_set?.targeting_keywords || []).map((kw: any) => (
                    <span key={kw} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "5px 11px", borderRadius: "var(--radius-pill)", background: "var(--primary-light)", color: "var(--primary-dark)", fontWeight: 700, border: "1px solid rgba(2,132,199,0.15)" }}>
                      {kw}
                      <button
                        type="button"
                        onClick={() => setField("ad_set", "targeting_keywords", (config.ad_set?.targeting_keywords || []).filter((k: any) => k !== kw))}
                        style={{ border: "none", background: "transparent", color: "var(--primary)", cursor: "pointer", fontSize: 14, padding: 0, display: "flex", alignItems: "center", fontWeight: "bold", lineHeight: 1 }}
                      >&times;</button>
                    </span>
                  ))}
                  {(config.ad_set?.targeting_keywords || []).length === 0 && (
                    <span style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>No focus keywords yet.</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = keywordInput.trim();
                        if (t && !(config.ad_set?.targeting_keywords || []).includes(t)) {
                          setField("ad_set", "targeting_keywords", [...(config.ad_set?.targeting_keywords || []), t]);
                          setKeywordInput("");
                        }
                      }
                    }}
                    placeholder="Add keyword, press Enter..."
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const t = keywordInput.trim();
                      if (t && !(config.ad_set?.targeting_keywords || []).includes(t)) {
                        setField("ad_set", "targeting_keywords", [...(config.ad_set?.targeting_keywords || []), t]);
                        setKeywordInput("");
                      }
                    }}
                    style={{ flexShrink: 0, padding: "12px 18px", borderRadius: "var(--radius-md)", background: "var(--primary)", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                  >+ Add</button>
                </div>
              </div>
            </Card>
          </div>
          {/* Column 2: AD SET */}
          <Card style={{ border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)", opacity: showRawJson ? 0.3 : 1, pointerEvents: showRawJson ? "none" : "auto" }}>
            <SectionTitle>AD SET | Routing & Target</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              <FieldGroup label="Ad Set Name" span={2}>
                <input value={config.ad_set?.name || ""} onChange={(e) => setField("ad_set", "name", e.target.value)} style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="Target Locations" span={2}>
                <LocationSearch 
                  geoLocations={config.ad_set?.geo_locations} 
                  onChange={(newGeo) => setField("ad_set", "geo_locations", newGeo)} 
                />
              </FieldGroup>
              <FieldGroup label="Optimization Goal" span={2}>
                <select value={config.ad_set?.optimization_goal || "OFFSITE_CONVERSIONS"} onChange={(e) => setField("ad_set", "optimization_goal", e.target.value)} style={inputStyle}>
                  {OPTIMIZATION_GOALS.map(goal => <option key={goal.value} value={goal.value}>{goal.label}</option>)}
                </select>
              </FieldGroup>
              
              <div className="col-span-1 sm:col-span-2 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 mt-2">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <SectionTitle style={{ fontSize: 13, marginBottom: 0, color: "var(--primary-dark)", letterSpacing: "0.05em" }}>BUDGET & SCHEDULE</SectionTitle>
                  <Badge text="Live Sync" color="var(--blue-600)" bg="var(--blue-50)" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Budget Type">
                    <select value={config.ad_set?.budget_type || "DAILY"} onChange={(e) => setField("ad_set", "budget_type", e.target.value)} style={inputStyle}>
                      {BUDGET_TYPES.map(bt => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                    </select>
                  </FieldGroup>
                  <FieldGroup label={`Amount (${config.ad_set?.budget_type === "DAILY" ? "Daily" : "Lifetime"}) ($ - enter in dollars)`}>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 600, fontSize: 14 }}>$</span>
                      <input 
                        type="number" 
                        value={config.ad_set?.budget_type === "DAILY" ? (config.ad_set?.daily_budget || 0) / 100 : (config.ad_set?.lifetime_budget || 0) / 100} 
                        onChange={(e) => setField("ad_set", config.ad_set?.budget_type === "DAILY" ? "daily_budget" : "lifetime_budget", Math.round(Number(e.target.value) * 100))} 
                        style={{ ...inputStyle, paddingLeft: 28 }} 
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Start Date">
                    <input 
                      type="datetime-local" 
                      value={config.ad_set?.start_time || ""} 
                      onChange={(e) => setField("ad_set", "start_time", e.target.value)} 
                      style={inputStyle} 
                    />
                  </FieldGroup>
                  <FieldGroup label="End Date">
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input 
                          type="checkbox" 
                          id="end-date-toggle"
                          checked={config.ad_set?.has_end_date || false}
                          onChange={(e) => setField("ad_set", "has_end_date", e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: "pointer" }}
                        />
                        <label htmlFor="end-date-toggle" style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", cursor: "pointer" }}>Set an end date</label>
                      </div>
                      {config.ad_set?.has_end_date && (
                        <input 
                          type="datetime-local" 
                          value={config.ad_set?.stop_time || ""} 
                          onChange={(e) => setField("ad_set", "stop_time", e.target.value)} 
                          style={inputStyle} 
                        />
                      )}
                    </div>
                  </FieldGroup>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 mt-2">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <SectionTitle style={{ fontSize: 13, marginBottom: 0, color: "var(--primary-dark)", letterSpacing: "0.05em" }}>DEMOGRAPHICS</SectionTitle>
                  <Badge text="Age & Gender" color="var(--primary)" bg="var(--primary-light)" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FieldGroup label="Gender Demographic">
                    <select value={config.ad_set?.gender ?? 0} onChange={(e) => setField("ad_set", "gender", Number(e.target.value))} style={inputStyle}>
                      <option value={0}>All Patients</option>
                      <option value={1}>Male Focus</option>
                      <option value={2}>Female Focus</option>
                    </select>
                  </FieldGroup>
                  <FieldGroup label="Min Age">
                    <input 
                      type="number" 
                      min={13} 
                      max={65} 
                      value={config.ad_set?.age_min ?? 18} 
                      onChange={(e) => setField("ad_set", "age_min", Number(e.target.value))} 
                      style={inputStyle} 
                    />
                  </FieldGroup>
                  <FieldGroup label="Max Age">
                    <input 
                      type="number" 
                      min={13} 
                      max={65} 
                      value={config.ad_set?.age_max ?? 65} 
                      onChange={(e) => setField("ad_set", "age_max", Number(e.target.value))} 
                      style={inputStyle} 
                    />
                  </FieldGroup>
                </div>
              </div>

              <div className="col-span-1 sm:col-span-2 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 mt-2">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <SectionTitle style={{ fontSize: 13, marginBottom: 0, color: "var(--primary-dark)", letterSpacing: "0.05em" }}>DSA TRANSPARENCY</SectionTitle>
                  <Badge text="Meta Compliance" color="var(--primary)" bg="var(--primary-light)" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="DSA Beneficiary">
                    <input 
                      type="text" 
                      value={config.ad_set?.dsa_beneficiary || ""} 
                      onChange={(e) => setField("ad_set", "dsa_beneficiary", e.target.value)} 
                      placeholder="e.g. HealPoint Health"
                      style={inputStyle} 
                    />
                  </FieldGroup>
                  <FieldGroup label="DSA Payor">
                    <input 
                      type="text" 
                      value={config.ad_set?.dsa_payor || ""} 
                      onChange={(e) => setField("ad_set", "dsa_payor", e.target.value)} 
                      placeholder="e.g. HealPoint Health"
                      style={inputStyle} 
                    />
                  </FieldGroup>
                </div>
              </div>

            </div>
          </Card>

          <Card style={{ border: "1.5px solid var(--border)", boxShadow: "var(--shadow-md)", opacity: showRawJson ? 0.3 : 1, pointerEvents: showRawJson ? "none" : "auto" }}>
            <SectionTitle>AD | Creative Identity</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
              <FieldGroup label="Ad Name">
                <input value={config.ad?.name || ""} onChange={(e) => setField("ad", "name", e.target.value)} style={inputStyle} />
              </FieldGroup>
              <div className="col-span-1 sm:col-span-2 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 mt-1">
                <SectionTitle style={{ fontSize: 13, marginBottom: 16, color: "var(--primary-dark)", letterSpacing: "0.05em" }}>ACCOUNT IDENTITIES</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldGroup label="Facebook Page">
                    <input value={config.ad?.facebook_page || ""} onChange={(e) => setField("ad", "facebook_page", e.target.value)} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="Instagram Profile">
                    <input value={config.ad?.instagram_account || ""} onChange={(e) => setField("ad", "instagram_account", e.target.value)} style={inputStyle} />
                  </FieldGroup>
                </div>
              </div>

              <FieldGroup label="Primary Ad Text">
                <textarea value={config.ad?.primary_text || ""} onChange={(e) => setField("ad", "primary_text", e.target.value)} style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} />
              </FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldGroup label="Headline">
                  <input value={config.ad?.headline || ""} onChange={(e) => setField("ad", "headline", e.target.value)} style={inputStyle} />
                </FieldGroup>
                <FieldGroup label="CTA Button">
                  <select 
                    value={config.ad?.call_to_action_type || "LEARN_MORE"} 
                    onChange={(e) => handleCTAChange(e.target.value)} 
                    style={inputStyle}
                  >
                    <option value="LEARN_MORE">LEARN_MORE</option>
                    <option value="BOOK_NOW">BOOK_NOW</option>
                    <option value="CONTACT_US">CONTACT_US</option>
                    <option value="GET_QUOTE">GET_ESTIMATE</option>
                    <option value="WHATSAPP_MESSAGE">WHATSAPP_MESSAGE</option>
                    <option value="MESSAGE_PAGE">MESSAGE_PAGE</option>
                  </select>
                </FieldGroup>
              </div>
              <FieldGroup label="Ad Description (Small Text)">
                <input value={config.ad?.description || ""} onChange={(e) => setField("ad", "description", e.target.value)} style={inputStyle} />
              </FieldGroup>

              <div style={{ padding: "16px", background: "rgba(37, 99, 235, 0.05)", borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.1)", display: "flex", flexDirection: "column", gap: 12 }}>
                <FieldGroup label="Media Link / Destination Data (ACTUAL LINK)">
                  <input
                    placeholder="e.g. https://website.com or +123456789"
                    value={config.ad?.website_url || ""}
                    onChange={(e) => setField("ad", "website_url", e.target.value)}
                    style={{ ...inputStyle, background: "#fff", borderColor: "var(--primary)" }}
                  />
                </FieldGroup>
                <FieldGroup label="Display Link Mask (Visual Only)">
                  <input
                    placeholder="e.g. yourclinic.ai/booking"
                    value={config.ad?.display_link || ""}
                    onChange={(e) => setField("ad", "display_link", e.target.value)}
                    style={inputStyle}
                  />
                </FieldGroup>
              </div>
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <Card style={{
            border: launchSuccess ? "3px solid var(--green)" : (selectedId ? "3px solid var(--amber)" : "3px solid var(--primary)"),
            boxShadow: launchSuccess ? "0 20px 40px -10px rgba(16, 185, 129, 0.2)" : (selectedId ? "0 20px 40px -10px rgba(245, 158, 11, 0.2)" : "0 20px 40px -10px rgba(2, 132, 199, 0.2)"),
            background: "#fff",
            padding: "var(--card-padding, 40px)",
            borderRadius: "var(--radius-lg)"
          }}>
            <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
              <div style={{
                width: 80, height: 80, borderRadius: "20px",
                background: launchSuccess ? "var(--green-light)" : (selectedId ? "var(--amber-light)" : "var(--primary-light)"),
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, flexShrink: 0,
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.05)"
              }}>
                {launchSuccess ? "⚕️" : (selectedId ? "💉" : "💠")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 10, color: "var(--text)", letterSpacing: "-0.02em" }}>
                  {launchSuccess ? "Clinical Deployment Verified" : (selectedId ? `Append Protocol to: ${selectedCampaign?.name}` : "Launch New Clinical Operations")}
                </div>
                <div style={{ fontSize: 16, color: "var(--text-muted)", marginBottom: 32, lineHeight: 1.6 }}>
                  {launchSuccess
                    ? "The treatment pathway has been synchronized with the advertising network. Draft logs available in Meta Ads Manager."
                    : selectedId
                      ? `Targeting protocols and clinical creatives will be injected into the existing ${selectedCampaign?.name} hierarchy.`
                      : "Initialize a top-level hospital campaign and set up the automated patient recruitment funnel."}
                </div>

                {launching ? (
                  <div style={{ padding: "32px", background: "var(--bg)", borderRadius: "var(--radius-lg)", border: "1.5px solid var(--primary)30" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                      <Spinner size={18} />
                      <span style={{ fontSize: 15, fontWeight: 800, color: "var(--primary-dark)", letterSpacing: "0.02em" }}>
                        {launchStep === 1 ? "Syncing Patient Data & Media Assets..." :
                          launchStep === 2 ? "Compiling Medical Schema..." :
                            launchStep === 3 ? "Building Treatment Path AdSets..." :
                              "Finalizing Patient Outreach Logic..."}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--border-light)", borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "var(--primary)", width: `${(launchStep / 4) * 100}%`, transition: "width 0.4s ease-out" }} />
                    </div>
                  </div>
                ) : launchSuccess ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <PrimaryButton onClick={() => window.open(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID}`, "_blank")} style={{ background: "var(--secondary)", padding: "18px 36px", fontSize: 16 }}>
                      Review Protocol ↗
                    </PrimaryButton>
                    <button onClick={() => setLaunchSuccess(false)} style={{ padding: "18px 36px", borderRadius: "var(--radius-md)", border: "2px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, transition: "all 0.2s" }}>
                      Queue Another Segment
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <PrimaryButton
                      onClick={handleFullLaunch}
                      disabled={launching}
                      style={{ background: selectedId ? "var(--amber)" : "var(--primary)", padding: "18px 48px", fontSize: 16, fontWeight: 800, letterSpacing: "0.03em" }}
                    >
                      {selectedId ? "Execute Protocol Injection →" : "Authorize Clinical Deployment →"}
                    </PrimaryButton>
                  </div>
                )}

                {launchError && (
                  <div style={{ marginTop: 24, padding: "18px 24px", borderRadius: "var(--radius-lg)", background: "var(--red-light)", color: "var(--red-dark)", fontSize: 15, border: "2px solid var(--red)30", fontWeight: 500 }}>
                    <span style={{ fontWeight: 800, textTransform: "uppercase", marginRight: 10 }}>Deployment Error:</span> {launchError}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>
      <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 500 }}>{label}</span>
      {children || <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{value}</span>}
    </div>
  );
}

function FieldGroup({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-1 sm:col-span-2 flex flex-col gap-2" : "flex flex-col gap-2"}>
      <label style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--border)",
  background: "#f8fafc",
  fontSize: 14,
  fontWeight: 500,
  width: "100%",
  boxSizing: "border-box",
  transition: "all 0.2s ease",
  outline: "none",
};

const navSegmentStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  background: "#fff",
  borderRadius: "12px",
  border: "1.5px solid var(--border)",
  boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
  position: "relative"
};

const navBadgeStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  background: "var(--primary)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800
};

const navLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "var(--primary)",
  letterSpacing: "0.05em"
};

const navSubLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text)",
  marginTop: -1
};

const navConnectorStyle: React.CSSProperties = {
  position: "absolute",
  right: -20,
  top: "50%",
  transform: "translateY(-50%)",
  width: 12,
  height: 2,
  background: "var(--border)",
  zIndex: 1
};

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
    if (geoLocations.countries) geoLocations.countries.forEach((c: any) => selectedPills.push({ type: 'country', key: c, name: c }));
    if (geoLocations.cities) geoLocations.cities.forEach((c: any) => selectedPills.push({ type: 'city', key: c.key, name: c.name || c.key }));
    if (geoLocations.regions) geoLocations.regions.forEach((c: any) => selectedPills.push({ type: 'region', key: c.key, name: c.name || c.key }));
    if (geoLocations.zips) geoLocations.zips.forEach((c: any) => selectedPills.push({ type: 'zip', key: c.key, name: c.name || c.key }));
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/meta/locations?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: any) => {
    const newGeo = { ...geoLocations, location_types: geoLocations?.location_types || ["home", "recent"] };
    
    if (item.type === "country") {
      newGeo.countries = [...(newGeo.countries || []), item.country_code];
      // Prevent overlap: Remove any cities/regions/zips that belong to this newly selected country
      if (newGeo.cities) newGeo.cities = newGeo.cities.filter((c: any) => c.country_code !== item.country_code);
      if (newGeo.regions) newGeo.regions = newGeo.regions.filter((c: any) => c.country_code !== item.country_code);
      if (newGeo.zips) newGeo.zips = newGeo.zips.filter((c: any) => c.country_code !== item.country_code);
    } else {
      const locObj = { key: item.key, name: item.name, country_code: item.country_code };
      if (item.type === "city") newGeo.cities = [...(newGeo.cities || []), locObj];
      if (item.type === "region") newGeo.regions = [...(newGeo.regions || []), locObj];
      if (item.type === "zip") newGeo.zips = [...(newGeo.zips || []), locObj];
      
      // Prevent overlap: Remove the parent country if it is already targeted broadly
      if (item.country_code && newGeo.countries && newGeo.countries.includes(item.country_code)) {
         newGeo.countries = newGeo.countries.filter((c: any) => c !== item.country_code);
      }
    }
    
    // Cleanup empty arrays to satisfy Meta API schema
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
    if (pill.type === "country") {
      newGeo.countries = newGeo.countries.filter((c: any) => c !== pill.key);
      if (newGeo.countries.length === 0) delete newGeo.countries;
    }
    if (pill.type === "city") {
      newGeo.cities = newGeo.cities.filter((c: any) => c.key !== pill.key);
      if (newGeo.cities.length === 0) delete newGeo.cities;
    }
    if (pill.type === "region") {
      newGeo.regions = newGeo.regions.filter((c: any) => c.key !== pill.key);
      if (newGeo.regions.length === 0) delete newGeo.regions;
    }
    if (pill.type === "zip") {
      newGeo.zips = newGeo.zips.filter((c: any) => c.key !== pill.key);
      if (newGeo.zips.length === 0) delete newGeo.zips;
    }
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
          placeholder="Search for countries, cities, or regions..."
          style={{ ...inputStyle, paddingRight: 36 }}
        />
        {loading && <div style={{ position: "absolute", right: 12 }}><Spinner size={16} /></div>}
      </div>
      
      {showDropdown && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
          {results.map((r: any) => (
            <div 
              key={r.key} 
              onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
              style={{ padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border-light)", fontSize: 13, display: "flex", flexDirection: "column" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {r.type?.toUpperCase()} • {r.country_name || r.country_code || "Unknown"}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedPills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {selectedPills.map((p: any) => (
            <div key={`${p.type}-${p.key}`} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--primary-light)", color: "var(--primary-dark)", padding: "4px 10px", borderRadius: "var(--radius-pill)", fontSize: 12, fontWeight: 600 }}>
              {p.type === 'country' ? '🌐' : p.type === 'city' ? '🏙️' : '🗺️'} {p.name}
              <button onClick={(e) => { e.preventDefault(); handleRemove(p); }} style={{ border: "none", background: "transparent", color: "var(--primary)", cursor: "pointer", fontSize: 14, padding: 0 }}>&times;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
