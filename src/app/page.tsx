"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Badge,
  Card,
  MetricCard,
  SectionTitle,
  WorkflowStep,
  EmptyState,
  Spinner,
  SecondaryButton
} from "./components";
import {
  User,
  LogOut,
  LogIn,
  ShieldCheck,
  ClipboardList,
  Megaphone,
  Tag,
  Gem,
  MessageSquare,
  Target,
  Users,
  AlertTriangle,
  LayoutGrid,
  Mail,
  Send,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import CampaignSetup from "./CampaignSetup";
import SocialDash from "./SocialDash";
import CustomSelect from "./CustomSelect";
import VoiceExplorerModal from "./VoiceExplorerModal";
import "./globals.css";

// ─── CONSTANTS ───────────────────────────────────────────────
const API_URL = "/api/trigger-n8n";

const TABS = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "analysis", label: "Ads Analysis", icon: "◎" },
  { id: "create", label: "Create Ad", icon: "◈" },
  { id: "approval", label: "Approval", icon: "◉" },
  { id: "campaigns", label: "Campaign Setup", icon: "◷" },
  { id: "live_campaigns", label: "Running Campaign", icon: "🚀" },

  { id: "reports", label: "Reports", icon: "◧" },
  { id: "social-dash", label: "Social-Dash", icon: "🎨" },
  { id: "newsletter", label: "Newsletter", icon: "📰", externalLink: "https://newsletter-weld-rho.vercel.app/newsletter/generate" },
  { id: "outreach", label: "Outreach", icon: "✉️", externalLink: "https://togaah-outreach-kc5r.vercel.app" },
  { id: "profile", label: "Profile", icon: "👤" },
];

const TOPICS = [
  "Advanced Orthopedics",
  "Cosmetic Dentistry",
  "Ophthalmic Surgery",
  "Preventative Cardiology",
  "Pediatric Wellness",
  "Clinical Excellence",
  "Patient Care Protocols",
];

const LOCATION_SUGGESTIONS = [
  { name: "United States", shortcut: "US", details: "Country in North America" },
  { name: "Canada", shortcut: "CA", details: "Country in North America" },
  { name: "Turkey", shortcut: "TR", details: "Country in Europe/Asia" },
  { name: "United Kingdom", shortcut: "GB", details: "Country in Europe" },
  { name: "Germany", shortcut: "DE", details: "Country in Europe" },
  { name: "France", shortcut: "FR", details: "Country in Europe" },
  { name: "Australia", shortcut: "AU", details: "Country in Oceania" },
  { name: "United Arab Emirates", shortcut: "AE", details: "Country in Middle East" },
  { name: "India", shortcut: "IN", details: "Country in South Asia" },
  { name: "Spain", shortcut: "ES", details: "Country in Europe" },
  { name: "Italy", shortcut: "IT", details: "Country in Europe" },
];

// ─── HELPERS ─────────────────────────────────────────────────
/**
 * Ensures Supabase storage URLs use the current project's hostname.
 * This fixes issues where n8n or old data might use a different Supabase instance.
 */
const normalizeSupabaseUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!currentUrl) return url;

  // If it's a Supabase storage URL
  if (url.includes("/storage/v1/object/")) {
    // Extract filename and bucket
    const parts = url.split("/object/");
    if (parts.length < 2) return url;

    const pathParts = parts[1].replace(/^(public\/|authenticated\/)/, "").split("/");
    const bucket = pathParts[0];
    const filename = pathParts.slice(1).join("/");

    if (!bucket || !filename) return url;

    // Reconstruct strictly using current credentials
    const newUrl = `${currentUrl}/storage/v1/object/public/${bucket}/${filename}`;

    if (url !== newUrl) {
      console.log(`[Strict URL Fix] ${url} -> ${newUrl}`);
    }
    return newUrl;
  }
  return url;
};



// ─── PERSISTENT LOCAL STORAGE HOOK ──────────────────────────
/**
 * Works like useState but automatically persists to/from localStorage.
 * Highly robust and SSR/Hydration safe for Next.js.
 */
function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on client-side mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      try {
        const stored = window.localStorage.getItem(key);
        if (stored !== null) {
          setValue(JSON.parse(stored));
        }
      } catch (e) {
        console.warn(`LocalStorage read error for key "${key}":`, e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);

  // Persist updates to localStorage
  useEffect(() => {
    if (!isMounted) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`LocalStorage write error for key "${key}":`, e);
    }
  }, [key, value, isMounted]);

  return [value, setValue];
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useLocalStorage("toga_active_tab", "overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[1]);
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Analysis
  useEffect(() => {
    console.log("[Diagnostics] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  }, []);

  // Analysis state — status persists across refresh so progress bar survives reload
  const [analysisStatus, setAnalysisStatus] = useLocalStorage("toga_analysis_status", "idle");
  // idle | generating | done | error
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const [analysisError, setAnalysisError] = useState("");
  const [pendingAnalysisTopic, setPendingAnalysisTopic] = useLocalStorage("toga_pending_analysis_topic", null);

  // Custom keywords research form states
  const [researchKeywords, setResearchKeywords] = useLocalStorage("toga_research_keywords", [
    "dental implants turkey",
    "dental tourism turkey",
    "hair transplant turkey",
    "medical tourism turkey",
    "hollywood smile turkey",
    "zirconium crowns turkey",
    "fue hair transplant",
    "affordable dental treatment abroad"
  ]);
  const [keywordInput, setKeywordInput] = useState("");
  const [researchCountries, setResearchCountries] = useLocalStorage("toga_research_countries", ["CA", "US"]);
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [researchMaxAds, setResearchMaxAds] = useLocalStorage("toga_research_max_ads", 100);
  const [researchOnlyActive, setResearchOnlyActive] = useLocalStorage("toga_research_only_active", true);
  const [researchSort, setResearchSort] = useLocalStorage("toga_research_sort", "Impressions High → Low");

  // Sync first keyword to selectedTopic for compatibility with other tabs
  useEffect(() => {
    const firstKeyword = researchKeywords[0];
    if (firstKeyword && firstKeyword !== selectedTopic) {
      setSelectedTopic(firstKeyword);
    }
  }, [researchKeywords, selectedTopic]);

  // Ad creation
  const [adStatus, setAdStatus] = useLocalStorage("toga_ad_status", "idle");
  // idle | generating | waiting | done | error
  const [adData, setAdData] = useLocalStorage("toga_ad_data", null);

  // Approval & launch
  const [approved, setApproved] = useState(false);
  const [budget, setBudget] = useLocalStorage("toga_budget", 50);
  const [duration, setDuration] = useLocalStorage("toga_duration", 7);
  const [launchStatus, setLaunchStatus] = useState("idle");
  // idle | launching | live | error

  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  const [stoppedIds, setStoppedIds] = useState([]);
  const [stopStatus, setStopStatus] = useState("idle");
  // idle | stopping | stopped | error

  // Report
  const [reportStatus, setReportStatus] = useState("idle");
  // idle | generating | done | error



  // Shared error
  const [webhookError, setWebhookError] = useState("");

  // Ad scenes (generated prompts per ad item)
  const [adScenesMap, setAdScenesMap] = useState({});       // { [itemId]: scenesArray }
  const [adAudioKeysMap, setAdAudioKeysMap] = useState<any>({}); // { [itemId]: audioKey }
  const [adScenesGenerating, setAdScenesGenerating] = useState({}); // { [itemId]: boolean }
  const [scenesModal, setScenesModal] = useState({ open: false, scenes: [], adLabel: "", itemId: null });
  const [editedScenes, setEditedScenes] = useState([]);     // editable copy of scenes in modal
  const [failedPrompts, setFailedPrompts] = useState<Array<{ taskId: string; prompt: string; failMsg: string }>>([]);
  const [voiceModalOpenForId, setVoiceModalOpenForId] = useState<number | null>(null);
  const [voiceLabels, setVoiceLabels] = useState<Record<number, string>>({});
  const [failedImagePrompts, setFailedImagePrompts] = useState<Array<{ prompt: string; reason: string; index: number }>>([]);
  const [editingImagePrompt, setEditingImagePrompt] = useState<{ open: boolean; index: number; prompt: string; reason: string } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Approval queue
  const [scheduledAds, setScheduledAds] = useState([]);
  const [approvedAds, setApprovedAds] = useState([]);
  const [rejectedAds, setRejectedAds] = useState([]);
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [adCardStatuses, setAdCardStatuses] = useState({});
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(null);
  const [scheduleDates, setScheduleDates] = useState({});

  // ── Ad Videos state ──
  const [adVideosRefreshKey, setAdVideosRefreshKey] = useState(Date.now());
  const [adVideosLoading, setAdVideosLoading] = useState(false);

  // ── Supabase reports state ──
  const [sbRows, setSbRows] = useState([]);
  const [showPreviousRuns, setShowPreviousRuns] = useState(false);
  const [hoveredInputs, setHoveredInputs] = useState<any>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [errorNotificationTime, setErrorNotificationTime] = useState<string | null>(null);

  // ── Profile Form Data (Supabase Integration) ──
  const [profileData, setProfileData] = useState<any>({
    productsAndServices: "",
    valueProposition: "",
    brandVoice: "",
    positioning: "",
    competitors: "",
    painPoints: "",
    icpMetaAds: "",
    icpNewsletter: "",
    icpOutreach: ""
  });
  const [profileId, setProfileId] = useState<string>("d33fb700-9a07-4478-9ff1-6f636f2f3625");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/brand-config");
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setProfileId(data.id);
        setProfileData({
          productsAndServices: data.products_services || "",
          valueProposition: data.value_proposition || "",
          brandVoice: data.brand_voice || "",
          positioning: data.positioning || "",
          competitors: data.competitors || "",
          painPoints: data.pain_points || "",
          icpMetaAds: data.icp_meta_ads || "",
          icpNewsletter: data.icp_newsletter || "",
          icpOutreach: data.icp_outreach || ""
        });
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    const payload = {
      products_services: profileData.productsAndServices,
      value_proposition: profileData.valueProposition,
      brand_voice: profileData.brandVoice,
      positioning: profileData.positioning,
      competitors: profileData.competitors,
      pain_points: profileData.painPoints,
      icp_meta_ads: profileData.icpMetaAds,
      icp_newsletter: profileData.icpNewsletter,
      icp_outreach: profileData.icpOutreach
    };

    const res = await fetch("/api/brand-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      addSbToast("Profile saved successfully!", "success");
      setIsEditingProfile(false);
    } else {
      addSbToast("Error saving profile", "error");
    }
    setIsSavingProfile(false);
  };

  // ── Poll for global n8n errors directly from Supabase (RLS disabled) ──
  // Strategy: track the DISMISSED ERROR MESSAGE (not timestamp).
  // This way, even if n8n updates updated_at every few seconds with the same error,
  // the alert stays dismissed until a genuinely NEW/DIFFERENT error message appears.
  useEffect(() => {
    let active = true;

    const checkErrors = async () => {
      try {
        const { data, error } = await supabase
          .from("Error Alerts")
          .select("Error")
          .eq("id", 1)
          .maybeSingle();

        if (!active) return;
        if (error || !data) {
          setErrorNotification(null);
          setErrorNotificationTime(null);
          return;
        }

        const errMsg: string = (data.Error || "").trim();

        if (!errMsg) {
          setErrorNotification(null);
          setErrorNotificationTime(null);
          return;
        }

        // Only show if this exact error message has not been dismissed before
        const lastDismissedMsg = localStorage.getItem("toga_last_dismissed_error_msg") || "";
        if (errMsg !== lastDismissedMsg) {
          setErrorNotification(errMsg);
          setErrorNotificationTime(errMsg); // reuse state field to carry the key for dismiss
        } else {
          setErrorNotification(null);
          setErrorNotificationTime(null);
        }
      } catch (err) {
        console.error("[UI] Error checking notifications:", err);
      }
    };

    // Check instantly on mount
    checkErrors();

    // Check every 5 seconds
    const interval = setInterval(checkErrors, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const dismissError = useCallback(async (msg: string) => {
    if (!msg) return;
    localStorage.setItem("toga_last_dismissed_error_msg", msg.trim());
    try {
      await supabase
        .from("Error Alerts")
        .update({ Error: "" })
        .eq("id", 1);
    } catch (e) {
      console.warn("Could not clear error from Supabase:", e);
    }
    setErrorNotification(null);
    setErrorNotificationTime(null);
  }, []);

  // Auto-dismiss error notification after 5 seconds
  useEffect(() => {
    if (errorNotification) {
      const timer = setTimeout(() => {
        dismissError(errorNotification);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorNotification, dismissError]);

  const [sbLoading, setSbLoading] = useState(true);
  const [sbTriggeringId, setSbTriggeringId] = useState(null);
  const [sbSessionTriggered, setSbSessionTriggered] = useState(new Set());
  const [sbToasts, setSbToasts] = useState([]);
  const [sbExpandedInsights, setSbExpandedInsights] = useState({});
  const [sbAdsConfigOpen, setSbAdsConfigOpen] = useState({});
  const [sbAdsConfigs, setSbAdsConfigs] = useState({});
  const [sbModalReport, setSbModalReport] = useState(null);
  const [sbModalTab, setSbModalTab] = useState("competitors");
  const [sbSortField, setSbSortField] = useState("score");
  const [sbSortDir, setSbSortDir] = useState("desc");

  const [createTabAdsConfig, setCreateTabAdsConfig] = useState<any>({
    totalAds: 1,
    videoCount: 1,
    imageCount: 0,
    items: [
      { id: Date.now(), type: "video", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", idea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" }
    ]
  });
  const [createTabConfigOpen, setCreateTabConfigOpen] = useState(false);
  const [pendingAds, setPendingAds] = useState([]);
  const [adTableLinks, setAdTableLinks] = useState({});
  // Stores { "1": { text: "...", format: "Video", Approved: bool }, ... }
  const [allApprovedAds, setAllApprovedAds] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [selectedAdForDetails, setSelectedAdForDetails] = useState(null);
  const [workflowStatus, setWorkflowStatus] = useLocalStorage("toga_workflow_status", "");
  const [isStatusPolling, setIsStatusPolling] = useLocalStorage("toga_is_status_polling", false);
  const [isEditingAd, setIsEditingAd] = useState(false);
  const [editingAdData, setEditingAdData] = useState<any>({});
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isRetryingAd, setIsRetryingAd] = useState(false);
  const [sentIdeaIds, setSentIdeaIds] = useState({});
  const [generatedIdeas, setGeneratedIdeas] = useState({});
  const [retryPrompt, setRetryPrompt] = useState("");
  const [isRetryingSubmit, setIsRetryingSubmit] = useState(false);
  const [acceptingPrompts, setAcceptingPrompts] = useState(false);
  const [promptsAccepted, setPromptsAccepted] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("toga_prompts_accepted") === "true";
    }
    return false;
  });
  const [selectedMetaCampaign, setSelectedMetaCampaign] = useState(null);
  const [launchAdCandidate, setLaunchAdCandidate] = useState(null);

  // Custom Media Upload
  const [customUploadLoading, setCustomUploadLoading] = useState(false);
  const [customUploadError, setCustomUploadError] = useState("");

  // Live Campaigns State
  const [liveCampaigns, setLiveCampaigns] = useState([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState(new Set());
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Edit Campaign / Ad Set Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editType, setEditType] = useState(null); // "Campaign" or "AdSet"
  const [editData, setEditData] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Meta Reports State
  const [metaInsights, setMetaInsights] = useState(null);
  const [metaCampaignInsights, setMetaCampaignInsights] = useState([]);
  const [metaReportsLoading, setMetaReportsLoading] = useState(false);
  const [metaReportsError, setMetaReportsError] = useState("");
  const [selectedCampaignForReports, setSelectedCampaignForReports] = useState(null);

  function resetCreateTabWorkspace() {
    setCreateTabAdsConfig({
      totalAds: 1,
      videoCount: 1,
      imageCount: 0,
      items: [
        { id: Date.now(), type: "video", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", idea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" }
      ]
    });
    setAdScenesMap({});
    setAdAudioKeysMap({});
    setAdStatus("idle");
    setPromptsAccepted(false);
    setFailedPrompts([]);
    setSentIdeaIds({});
    setGeneratedIdeas({});
    setWebhookError("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("toga_prompts_accepted");
      localStorage.removeItem("toga_ad_status");
      localStorage.removeItem("toga_ad_data");
    }
  }

  const addSbToast = useCallback((message, type = "success") => {
    const id = crypto.randomUUID();
    setSbToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setSbToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const fetchAdTableLinks = useCallback(async () => {
    setAdVideosLoading(true);

    // 1. Fetch from Storage (Global Lookup)
    // We create a map of filename -> storage info to verify existence and fix bucket mismatches
    const storageLookup = new Map();
    try {
      const buckets = ["AD1", "AD2", "AD3", "AD4", "AD5"];
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage.from(bucket).list('', { limit: 100 });
        if (files && files.length > 0) {
          files.forEach(file => {
            if (file.name === ".emptyFolderPlaceholder") return;
            // Map filename to the first bucket we find it in (or prioritize later buckets if needed)
            storageLookup.set(file.name, {
              bucket,
              time: file.created_at,
              publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${file.name}`
            });
          });
        }
      }
    } catch (e) {
      console.warn("Storage sync failed:", e);
    }

    // 2. Fetch from Database
    const { data: dbData, error: dbError } = await supabase
      .from("your_name_table")
      .select("id, text, time, format, Approved, \"json data\"")
      .order("time", { ascending: false });

    if (dbError && dbError.code !== "PGRST116") {
      console.error("Database fetch error:", dbError);
    }

    const latest = {};
    const approvedList = [];
    const validPending = [];

    console.log(`[Diagnostics] DB rows found: ${dbData?.length || 0}`);
    console.log(`[Diagnostics] Storage lookup size: ${storageLookup.size}`);

    // Process DB data
    (dbData || []).forEach(row => {
      const normalizedText = normalizeSupabaseUrl(row.text);
      if (!normalizedText) return;

      const fileName = normalizedText.split("/").pop();
      const storageInfo = storageLookup.get(fileName);

      // We prioritize the database record. If storageLookup found it, we use the storage URL.
      // If storageLookup is empty (e.g. due to list permissions), we still show the ad using the normalized URL.
      const finalUrl = storageInfo ? storageInfo.publicUrl : normalizedText;
      const entry = { ...row, originalText: row.text, text: finalUrl };

      if (row.Approved && row.Approved !== "false") {
        approvedList.push(entry);
      } else {
        validPending.push(entry);
        if (!latest[row.id]) {
          latest[row.id] = entry;
        }
      }

      if (!storageInfo && storageLookup.size > 0) {
        console.warn(`[Diagnostics] File not detected in storage list, but showing from DB: ${fileName}`);
      }
    });


    console.log(`[Diagnostics] Valid pending found: ${validPending.length}`);
    console.log(`[Diagnostics] Approved found: ${approvedList.length}`);

    // Filter pending ads to only include the latest batch (within 1 hour of the absolute newest ad overall)
    let batchPending = [...validPending];
    if (dbData && dbData.length > 0) {
      const newestAdOverallTime = new Date(dbData[0].time).getTime();
      const BATCH_WINDOW_MS = 60 * 60 * 1000; // 1 hour
      batchPending = validPending.filter(a => {
        const adTime = new Date(a.time).getTime();
        return (newestAdOverallTime - adTime) <= BATCH_WINDOW_MS;
      });
    }

    // Select top 3 videos and top 2 images for the Create Ad tab
    const topVideos = batchPending.filter(a => (a.format || "").toLowerCase() === "video").slice(0, 3);
    const topImages = batchPending.filter(a => (a.format || "").toLowerCase() !== "video").slice(0, 2);

    console.log(`[Diagnostics] Top Videos: ${topVideos.length}, Top Images: ${topImages.length}`);
    setPendingAds([...topVideos, ...topImages]);

    setAdTableLinks(latest);
    setAllApprovedAds(approvedList);


    setAdVideosLoading(false);
    setAdVideosRefreshKey(Date.now());
  }, [addSbToast]);




  const fetchLiveCampaigns = useCallback(async () => {
    setLiveLoading(true);
    setLiveError("");
    try {
      const res = await fetch("/api/meta/live-campaigns");
      const data = await res.json();
      if (res.ok) {
        setLiveCampaigns(data || []);
      } else {
        setLiveError(data.error || "Failed to fetch live campaigns");
      }
    } catch (e) {
      setLiveError("Failed to connect to API");
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (id, type, status, action) => {
    if (action === "delete" && !confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;

    setUpdatingStatusId(id);
    try {
      const res = await fetch("/api/meta/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, action }),
      });
      const data = await res.json();
      if (res.ok) {
        addSbToast(`${type} ${action === "delete" ? "deleted" : "updated"} successfully!`);
        fetchLiveCampaigns(); // Refresh
      } else {
        addSbToast(data.error || `Failed to update ${type}`, "error");
      }
    } catch (e) {
      addSbToast("Network error", "error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleEditCampaign = async (campaignId) => {
    setEditModalOpen(true);
    setEditType("Campaign");
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/meta/campaign-details?campaignId=${campaignId}`);
      const data = await res.json();
      if (res.ok) {
        setEditData(data.campaign);
      } else {
        setEditError(data.error || "Failed to fetch details");
      }
    } catch (e) {
      setEditError("Network error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditAdSet = async (campaignId, adSetId) => {
    setEditModalOpen(true);
    setEditType("AdSet");
    setEditLoading(true);
    setEditError("");
    try {
      const res = await fetch(`/api/meta/campaign-details?campaignId=${campaignId}`);
      const data = await res.json();
      if (res.ok) {
        const adSet = data.adSets?.find(a => a.id === adSetId);
        if (adSet) {
          setEditData(adSet);
        } else setEditError("Ad Set not found");
      } else {
        setEditError(data.error || "Failed to fetch details");
      }
    } catch (e) {
      setEditError("Network error");
    } finally {
      setEditLoading(false);
    }
  };

  const updateTargeting = (key, value) => {
    if (!editData) return;
    let t = editData.targeting;
    if (typeof t === 'string') {
      try { t = JSON.parse(t); } catch (e) { t = {}; }
    } else {
      t = { ...t };
    }

    if (key === 'age_min') t.age_min = parseInt(value, 10) || 18;
    if (key === 'age_max') t.age_max = parseInt(value, 10) || 65;
    if (key === 'gender') {
      if (value === '0') {
        delete t.genders;
      } else {
        t.genders = [parseInt(value, 10)];
      }
    }
    if (key === 'countries') {
      if (!t.geo_locations) t.geo_locations = {};
      t.geo_locations.countries = value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    }

    setEditData({ ...editData, targeting: t });
  };

  const saveEdit = async () => {
    setEditSaving(true);
    setEditError("");
    try {
      const payload: any = {};
      if (editType === "Campaign") {
        payload.campaignId = editData.id;
        payload.campaignData = {
          name: editData.name,
        };
      } else if (editType === "AdSet") {
        payload.adSetId = editData.id;
        let parsedTargeting = editData.targeting;
        if (typeof parsedTargeting === 'string') {
          try {
            parsedTargeting = JSON.parse(parsedTargeting);
          } catch (e) {
            setEditError("Invalid JSON in targeting");
            setEditSaving(false);
            return;
          }
        }
        payload.adSetData = {
          name: editData.name,
          daily_budget: parseInt(editData.daily_budget, 10),
          targeting: parsedTargeting
        };
        if (editData.end_time) {
          payload.adSetData.end_time = editData.end_time;
        }
      }

      const res = await fetch("/api/meta/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        addSbToast(`${editType} updated successfully!`);
        setEditModalOpen(false);
        fetchLiveCampaigns();
      } else {
        setEditError(data.error || "Update failed");
      }
    } catch (e) {
      setEditError("Network error");
    } finally {
      setEditSaving(false);
    }
  };

  const fetchMetaInsights = useCallback(async () => {
    setMetaReportsLoading(true);
    setMetaReportsError("");
    try {
      const res = await fetch("/api/meta/reports");
      const data = await res.json();
      if (res.ok) {
        setMetaInsights(data.account || { spend: 0, impressions: 0, reach: 0, linkClicks: 0, inline_link_click_ctr: 0, leads: 0 });
        setMetaCampaignInsights(data.campaigns || []);
      } else {
        setMetaReportsError(data.error || "Failed to fetch Meta insights");
      }
    } catch (e) {
      setMetaReportsError("Failed to connect to reporting API");
    } finally {
      setMetaReportsLoading(false);
    }
  }, []);

  // On mount: if analysisStatus is "generating" but no sessionStorage flag,
  // it means the page was refreshed mid-analysis — reset to idle so user can re-trigger
  useEffect(() => {
    const isActiveSession = sessionStorage.getItem("toga_analysis_active");
    if (!isActiveSession) {
      // No active fetch in this session — clear any stale generating state
      setAnalysisStatus("idle");
      setAnalysisProgress(0);
      window.localStorage.removeItem("toga_analysis_start");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function fetchReports() {
      const { data, error } = await supabase
        .from("reports_json")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase error:", error);
        addSbToast("Failed to fetch reports", "error");
      }
      setSbRows(data || []);
      setSbLoading(false);
    }
    fetchReports();
    fetchAdTableLinks();

    // Realtime: auto-fetch new/updated/deleted rows
    const channel = supabase
      .channel("reports_json_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports_json" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSbRows((prev) => [payload.new, ...prev]);
            addSbToast("New report received!");

            // Link to active analysis if topic matches
            const newReport = parseSbReport(payload.new);
            setPendingAnalysisTopic(currentTopic => {
              if (currentTopic && newReport.topic === currentTopic) {
                setAnalysisData({ ...newReport, id: payload.new.id });
                setAnalysisStatus("done");
                addSbToast("Analysis completed and loaded!");
                return null; // Reset pending topic
              }
              return currentTopic;
            });
          } else if (payload.eventType === "UPDATE") {
            setSbRows((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          } else if (payload.eventType === "DELETE") {
            setSbRows((prev) => prev.filter((r) => r.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [addSbToast]);

  useEffect(() => {
    // Check local session (Bypassing Supabase Auth)
    const checkLocalSession = () => {
      const isLoggedIn = localStorage.getItem("toga_auth_session") === "true";
      const userEmail = localStorage.getItem("toga_user_email") || "togahealthai@gmail.com";

      if (isLoggedIn) {
        setUser({ email: userEmail });
        setIsAuthenticating(false);
      } else {
        // No local session found, redirect to login
        router.push("/login");
      }
    };

    checkLocalSession();

    // Listen for storage changes (e.g. logout in another tab)
    const handleStorageChange = (e) => {
      if (e.key === "toga_auth_session" && e.newValue !== "true") {
        setUser(null);
        router.push("/login");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [router]);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("toga_auth_session");
      localStorage.removeItem("toga_user_email");
      addSbToast("Signed out successfully");
      router.push("/login");
    } catch (e) {
      console.error("Logout error:", e);
      addSbToast("Failed to sign out", "error");
    }
  };

  useEffect(() => {
    if (tab === "live_campaigns") {
      fetchLiveCampaigns();
    }
    if (tab === "reports" || tab === "overview") {
      fetchMetaInsights();
    }
  }, [tab, fetchLiveCampaigns, fetchMetaInsights]);

  // ── Polling workflow status from Supabase status_table (id: 1) ──
  useEffect(() => {
    let interval;
    if (isStatusPolling || adStatus === "waiting") {
      interval = setInterval(async () => {
        const { data, error } = await supabase
          .from("status_table")
          .select("status")
          .eq("id", 1)
          .maybeSingle();

        if (error) {
          console.error("Status polling error:", error);
          return;
        }

        if (data) {
          const newStatus = data.status || "";
          setWorkflowStatus(newStatus);

          // Refresh if any part of the workflow completed or if overall completion reached
          const isIntermediateDone = newStatus.toLowerCase().includes("completed") && !workflowStatus?.toLowerCase().includes("completed");
          const isFullyDone = newStatus.toLowerCase().includes("completed");

          if (isIntermediateDone || isFullyDone) {
            fetchAdTableLinks(); // Refresh the grid
          }

          if (isFullyDone) {
            setIsStatusPolling(false);
            setAdStatus("idle");
            addSbToast("Ads Generation Completed! Your ad creatives are being processed. Check the Ad Previews section below.", "success");
          }
        }
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStatusPolling, adStatus, fetchAdTableLinks, addSbToast]);

  // ── Analysis progress bar: increments over time, persists across refresh ──
  useEffect(() => {
    if (analysisStatus !== "generating") {
      setAnalysisProgress(analysisStatus === "done" ? 100 : 0);
      return;
    }

    const startRaw = window.localStorage.getItem("toga_analysis_start");
    const startTime = startRaw ? Number(startRaw) : null;
    const MAX_DURATION = 300_000; // 5 min max (proxy maxDuration)

    // Auto-reset if start time is missing or > 6 min old (stale from previous session)
    if (!startTime || (Date.now() - startTime) > 360_000) {
      setAnalysisStatus("idle");
      setAnalysisProgress(0);
      window.localStorage.removeItem("toga_analysis_start");
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const raw = Math.min(0.88, elapsed / MAX_DURATION);
      const eased = 1 - Math.pow(1 - raw / 0.88, 2);
      setAnalysisProgress(Math.round(eased * 88) + 2); // start at 2%
    };
    tick();
    const timer = setInterval(tick, 2000);
    return () => clearInterval(timer);
  }, [analysisStatus]);

  function parseSbReport(row) {
    let rd = row.report_data;
    try {
      if (typeof rd === "string") rd = JSON.parse(rd);
      // Handle array-wrapped format: [{...}] → {...}
      if (Array.isArray(rd)) rd = rd[0] || {};
      return rd || {};
    } catch { return {}; }
  }

  const sbReports = sbRows.map((row) => ({ row, report: parseSbReport(row) }));
  const sbTotalReports = sbRows.length;
  const sbTotalCompetitors = sbReports.reduce((s, { report }) => s + (report.competitors_table || []).length, 0);
  const sbHighThreats = sbReports.reduce((s, { report }) => s + (report.competitors_table || []).filter((c) => c.threat === "high").length, 0);
  const sbPendingAds = sbRows.filter((r) => !r.ads_workflow_triggered).length;

  // ── Ads config helpers ──
  const VIDEO_TYPES = ["Reel", "Story", "Feed Post", "Carousel"];
  const DURATIONS = ["20 seconds", "28 seconds", "32 seconds", "36 seconds", "40 seconds"];
  const AUDIO_STYLES = ["Background Music", "Voiceover Only", "Music + Voiceover", "No Audio"];
  const VIDEO_STYLES = ["Bold & Colorful", "Cinematic", "Minimal & Clean", "Dark & Moody", "Neon / Glow", "Hand-drawn / Sketch"];
  const LANGUAGES = ["English", "Spanish", "French", "Hebrew", "Turkish"];
  const VOICE_OPTIONS = {
    male: [
      { label: "Markmont", id: "rTOopItG6FIkKMIVxsl5" },
      { label: "John", id: "lXyLz3Gu0YqdG8RfvIyZ" },
    ],
    female: [
      { label: "Adhalina", id: "i2SoWWnAm3qCyr53Jenw" },
      { label: "Clara", id: "k9KXsQFJqzAoomTCOrJB" },
    ],
  };

  function getAdsConfig(reportId) {
    return sbAdsConfigs[reportId] || { numAds: 1, videos: [{ videoType: "Reel", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", videoIdea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" }] };
  }

  function updateAdsConfig(reportId, updater) {
    setSbAdsConfigs((prev) => {
      const current = prev[reportId] || { numAds: 1, videos: [{ videoType: "Reel", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", videoIdea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" }] };
      return { ...prev, [reportId]: updater(current) };
    });
  }

  function setNumAds(reportId, num) {
    updateAdsConfig(reportId, (cfg) => {
      const n = Math.max(1, Math.min(5, num));
      const videos = [...cfg.videos];
      while (videos.length < n) videos.push({ videoType: "Reel", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", videoIdea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" });
      return { ...cfg, numAds: n, videos: videos.slice(0, n) };
    });
  }

  function updateVideoConfig(reportId, idx, field, value) {
    updateAdsConfig(reportId, (cfg) => {
      const videos = [...cfg.videos];
      videos[idx] = { ...videos[idx], [field]: value };
      return { ...cfg, videos };
    });
  }

  function updateCreateTabTotalAds(num) {
    if (num > 5) {
      addSbToast("Maximum of 5 total ads allowed", "error");
      return;
    }
    const n = Math.max(1, num);
    setCreateTabAdsConfig((prev) => {
      const currentTotal = prev.items.length;
      let newItems = [...prev.items];

      if (n > currentTotal) {
        for (let i = 0; i < n - currentTotal; i++) {
          // Default to video if space allows, else image
          const vCount = newItems.filter(x => x.type === "video").length;
          const type = vCount < 3 ? "video" : "image";

          if (type === "video") {
            newItems.push({ id: Date.now() + i, type: "video", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", idea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" });
          } else {
            // Check if we can add image
            const iCount = newItems.filter(x => x.type === "image").length;
            if (iCount < 2) {
              newItems.push({ id: Date.now() + i, type: "image", imageStyle: "Bold & Colorful", idea: "" });
            } else {
              // If we reach 3V and 2I, we can't add more anyway due to n=5 limit
              break;
            }
          }
        }
      } else {
        newItems = newItems.slice(0, n);
      }

      const vCount = newItems.filter(x => x.type === "video").length;
      const iCount = newItems.filter(x => x.type === "image").length;
      return { totalAds: newItems.length, videoCount: vCount, imageCount: iCount, items: newItems };
    });
  }

  function setCreateTabItemType(idx, type) {
    setCreateTabAdsConfig((prev) => {
      const currentItem = prev.items[idx];
      if (currentItem.type === type) return prev;

      if (type === "video" && prev.videoCount >= 3) {
        addSbToast("Maximum of 3 Videos allowed", "error");
        return prev;
      }
      if (type === "image" && prev.imageCount >= 2) {
        addSbToast("Maximum of 2 Images allowed", "error");
        return prev;
      }

      const newItems = [...prev.items];
      if (type === "video") {
        newItems[idx] = { id: newItems[idx].id, type: "video", duration: "28 seconds", audioStyle: "Background Music", videoStyle: "Bold & Colorful", idea: "", character: "male", voiceId: "rTOopItG6FIkKMIVxsl5" };
      } else {
        newItems[idx] = { id: newItems[idx].id, type: "image", imageStyle: "Bold & Colorful", idea: "" };
      }
      const vCount = newItems.filter(x => x.type === "video").length;
      const iCount = newItems.filter(x => x.type === "image").length;
      return { ...prev, videoCount: vCount, imageCount: iCount, items: newItems };
    });
  }

  function updateCreateTabItemField(idx, field, value) {
    setCreateTabAdsConfig((prev) => {
      const newItems = [...prev.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      return { ...prev, items: newItems };
    });
  }


  async function handleApproveAd(row) {
    if (!row) return;
    setApprovingId(row.id + "_" + row.time);

    let error;
    if (row.isVirtual) {
      // This is a virtual entry from Storage Sync. We need to create a real record in the database.
      const { error: insError } = await supabase
        .from("your_name_table")
        .insert([{
          id: row.id,
          text: row.text,
          time: row.time,
          format: row.format,
          Approved: "true"
        }]);
      error = insError;
    } else {
      // RLS is now disabled, so we can use the client directly
      const { error: updError } = await supabase
        .from("your_name_table")
        .update({ Approved: "true" })
        .eq("text", row.originalText || row.text);
      error = updError;
    }

    if (error) {
      console.error("Approval error:", error);
      addSbToast(`Approval failed: ${error.message || 'Unknown error'}`, "error");
    } else {
      addSbToast("Ad approved successfully!");
      await fetchAdTableLinks();
    }



    setApprovingId(null);
  }


  async function handleSaveEdits(ad) {
    if (!ad) return;
    setIsSavingAd(true);

    const oldJson = typeof ad["json data"] === "string" ? JSON.parse(ad["json data"]) : (ad["json data"] || {});

    // Construct the new schema
    const updatedJsonData = {
      campaign: {
        name: editingAdData.campaignName || (oldJson.campaign?.name || "Untitled Campaign")
      },
      ad: {
        id: oldJson.ad?.id || oldJson.ads?.[0]?.id || Date.now(),
        name: editingAdData.adName || (oldJson.ad?.name || oldJson.ads?.[0]?.name || "Untitled Ad"),
        type: oldJson.ad?.type || oldJson.ads?.[0]?.type || "video",
        headline: editingAdData.headline || (oldJson.ad?.headline || oldJson.ads?.[0]?.headline || "No headline provided."),
        primary_text: editingAdData.primaryText ?? (oldJson.ad?.primary_text || oldJson.ads?.[0]?.primary_text || ""),
        call_to_action_type: editingAdData.ctaType || (oldJson.ad?.call_to_action_type || oldJson.ads?.[0]?.call_to_action_type || "WATCH_MORE"),
        website_url: editingAdData.linkData || (oldJson.ad?.website_url || oldJson.link_data || ad.text || "")
      },
      link_data: editingAdData.linkData || (oldJson.link_data || ad.text || "")
    };

    const { error } = await supabase
      .from("your_name_table")
      .update({ "json data": JSON.stringify(updatedJsonData) })
      .match({ id: ad.id, time: ad.time });

    if (error) {
      console.error("Save error:", error);
      addSbToast("Failed to save changes", "error");
    } else {
      addSbToast("Changes saved successfully!");
      setIsEditingAd(false);
      await fetchAdTableLinks();
    }
    setIsSavingAd(false);
  }



  async function handleRefreshAdVideos() {
    await fetchAdTableLinks();
  }

  async function handleTriggerAds(reportId, reportData) {
    const config = getAdsConfig(reportId);
    setSbTriggeringId(reportId);
    try {
      const res = await fetch("/api/trigger-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId, report_data: reportData, ads_config: config }),
      });
      const result = await res.json();
      if (result.success) {
        setSbSessionTriggered((prev) => new Set([...prev, reportId]));
        addSbToast("Ads workflow triggered successfully!");
      } else {
        addSbToast("Failed to trigger. Try again.", "error");
      }
    } catch {
      addSbToast("Failed to trigger. Try again.", "error");
    }
    setSbTriggeringId(null);
  }

  async function handleCreateTabTriggerAds() {
    if (!analysisData) {
      addSbToast("No analysis data available. Run Ads Analysis first.", "error");
      return;
    }
    const config = createTabAdsConfig;

    // Single loading state for all ads
    setAdScenesGenerating({ __all__: true });
    setAdStatus("generating");
    setWebhookError("");

    try {
      // ONE single webhook call with all ad configs bundled together
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_GENERATE_AD_URL || "https://n8n.srv881198.hstgr.cloud/webhook/generate_ad";
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: analysisData?.id || crypto.randomUUID(),
          report_data: analysisData,
          ads_config: config,
        }),
      });
      const data = await res.json();

      // Store scenes under corresponding keys matching their itemIndex
      const scenesMap: any = {};
      const audioKeysMap: any = {};
      config.items.forEach((item: any, idx: number) => {
        const match = Array.isArray(data)
          ? data.find((d: any) => d.itemIndex === idx) || data[idx]
          : null;
        scenesMap[item.id] = match?.scenes || [];
        audioKeysMap[item.id] = match?.audioKey || "";
      });
      setAdScenesMap(scenesMap);
      setAdAudioKeysMap(audioKeysMap);
      setAdStatus("done");
      addSbToast("Ad prompts generated! Click \"View Prompts\" on each ad.", "success");
    } catch (e) {
      setAdStatus("error");
      setWebhookError(e.message || "Failed to reach webhook");
      addSbToast("Failed to generate ad prompts. Try again.", "error");
    } finally {
      setAdScenesGenerating({});
    }
  }

  async function handleAcceptPrompts() {
    setAcceptingPrompts(true);
    setFailedPrompts([]); // Clear any previous errors
    addSbToast("Sending accepted prompts to webhook...");
    try {
      // Enrich createTabAdsConfig.items with their corresponding audioKey
      const enrichedConfig = {
        ...createTabAdsConfig,
        items: (createTabAdsConfig.items || []).map((item: any) => ({
          ...item,
          audioKey: adAudioKeysMap[item.id] || ""
        }))
      };

      const webhookUrl = process.env.NEXT_PUBLIC_N8N_ACCEPT_PROMPTS_URL || "https://n8n.srv881198.hstgr.cloud/webhook/3be958fe-3d6e-4ccf-8d72-5a9a0bb2d932";
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: analysisData?.id || crypto.randomUUID(),
          report_data: analysisData,
          ads_config: enrichedConfig,
          generated_prompts: adScenesMap,
          audioKeys: adAudioKeysMap,
          audio_keys: adAudioKeysMap
        }),
      });
      if (res.ok) {
        try {
          const resData = await res.json();
          console.log("Accept prompts webhook response:", resData);
          const responseObj = Array.isArray(resData) ? resData[0] : resData;
          // Video failure format: responseObj.data array with state === "fail"
          const hasVideoFailures = responseObj && responseObj.failCount > 0 && Array.isArray(responseObj.data);
          // Image failure format: responseObj.failedPrompts array OR responseObj.results with success === false
          const rawImageFailures: any[] = responseObj?.failedPrompts || responseObj?.results?.filter((r: any) => r.success === false || r.state === "fail") || [];
          const hasImageFailures = rawImageFailures.length > 0;

          if (hasVideoFailures) {
            const failures = responseObj.data.filter((task: any) => task.state === "fail");
            setFailedPrompts(failures.map((f: any) => ({
              taskId: f.taskId || "",
              prompt: f.prompt || "",
              failMsg: f.failMsg || "Generation failed — content may have been flagged as sensitive."
            })));
            addSbToast(`${responseObj.failCount} video generation task(s) failed. Open the affected ad card to fix the prompt.`, "error");
          } else if (hasImageFailures) {
            setFailedImagePrompts(rawImageFailures.map((f: any, i: number) => ({
              prompt: f.prompt || "",
              reason: f.reason || f.failMsg || "Generation failed — content may have violated policy.",
              index: f.index ?? i
            })));
            const failCount = rawImageFailures.length;
            addSbToast(`${failCount} image generation task(s) failed due to policy violation. Review and fix the prompts below.`, "error");
          } else {
            setFailedPrompts([]);
            setFailedImagePrompts([]);
            addSbToast("All prompts successfully accepted!", "success");
            addSbToast("Refreshing Supabase Ads previews...", "info");
            await fetchAdTableLinks();
            addSbToast("Ads previews updated!", "success");
            resetCreateTabWorkspace();
            setIsStatusPolling(true);
          }
        } catch {
          // If JSON parse fails, treat as success
          setFailedPrompts([]);
          setFailedImagePrompts([]);
          addSbToast("Prompts successfully accepted!", "success");
          addSbToast("Refreshing Supabase Ads previews...", "info");
          await fetchAdTableLinks();
          addSbToast("Ads previews updated!", "success");
          resetCreateTabWorkspace();
          setIsStatusPolling(true);
        }
      } else {
        addSbToast("Failed to accept prompts. Please try again.", "error");
      }
    } catch (e) {
      addSbToast("Error sending accepted prompts.", "error");
    } finally {
      setAcceptingPrompts(false);
    }
  }

  /** Returns true if any scene in this ad slot matched a failed generation task */
  function doesSlotHaveError(itemId: any): boolean {
    if (failedPrompts.length === 0) return false;
    const scenes: any[] = adScenesMap[itemId] || [];
    if (scenes.length === 0) return false;
    return scenes.some((scene: any) =>
      failedPrompts.some((fail) => {
        const scenario = (scene.video_scenario || "").trim();
        const failPrompt = (fail.prompt || "").trim();
        return (
          (scenario && failPrompt.length > 10 && (failPrompt.includes(scenario.slice(0, 60)) || scenario.includes(failPrompt.slice(0, 60)))) ||
          fail.taskId === scene.taskId
        );
      })
    );
  }

  function formatSbDate(iso) {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    return `${day} ${mon} ${d.getFullYear()}`;
  }

  function formatSbTime(iso) {
    if (!iso) return "00:00";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  function truncateSb(str, len = 200) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "..." : str;
  }

  function toggleSbSort(field) {
    if (sbSortField === field) setSbSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSbSortField(field); setSbSortDir("desc"); }
  }

  // ── Reusable webhook caller ──
  async function callWebhook(payload, setStatus) {
    setStatus("generating");
    setWebhookError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-action": payload.action || ""
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({ ok: true }));
      const resultData = Array.isArray(data) ? data[0] : data;
      const isValid =
        resultData &&
        typeof resultData === "object" &&
        !resultData.rawResponse &&
        Object.keys(resultData).length > 0;
      return isValid ? resultData : null;
    } catch (e) {
      setStatus("error");
      setWebhookError(e.message || "Could not reach n8n");
      console.error("Webhook error:", e);
      return null;
    }
  }

  // ── Action 1: Competitor Analysis ──
  async function runCompetitorAnalysis() {
    // Read keywords directly from localStorage to avoid stale closure after async delay
    let kwSnapshot: string[] = researchKeywords;
    try {
      const stored = window.localStorage.getItem("toga_research_keywords");
      if (stored) { const parsed = JSON.parse(stored); if (Array.isArray(parsed) && parsed.length > 0) kwSnapshot = parsed; }
    } catch {}

    if (kwSnapshot.length === 0) {
      addSbToast("Please add at least one keyword before running analysis.", "error");
      return;
    }

    setAnalysisData(null);
    setAnalysisError("");
    setAnalysisProgress(0);
    window.localStorage.setItem("toga_analysis_start", String(Date.now()));
    sessionStorage.setItem("toga_analysis_active", "1"); // marks this session as the one that fired
    setAnalysisStatus("generating");
    setPendingAnalysisTopic(selectedTopic);
    await new Promise((r) => setTimeout(r, 100));

    console.log("[Analysis] Triggering webhook with keywords:", kwSnapshot);

    try {
      const result = await callWebhook({
        action: "competitor_analysis",
        topic: kwSnapshot[0] || selectedTopic || "Dental Implants Turkey",
        keywords: kwSnapshot,
        countries: researchCountries,
        max_ads: Number(researchMaxAds) || 100,
        only_active: researchOnlyActive,
        sort: researchSort,
        timestamp: new Date().toISOString(),
      }, setAnalysisStatus);

      console.log("[Analysis] Webhook response:", result);

      if (result && !result.error) {
        setAnalysisData(result);
        setAnalysisStatus("done");
        setAnalysisProgress(100);
        window.localStorage.removeItem("toga_analysis_start");
        sessionStorage.removeItem("toga_analysis_active");
        setPendingAnalysisTopic(null);
        addSbToast("Analysis complete!", "success");
      } else if (result?.error && !result?.isTimeout) {
        setAnalysisStatus("error");
        setAnalysisProgress(0);
        window.localStorage.removeItem("toga_analysis_start");
        sessionStorage.removeItem("toga_analysis_active");
        setAnalysisError(result.error);
        addSbToast(`Analysis failed: ${result.error}`, "error");
      }
      // null or isTimeout → keep progress bar, n8n still processing
    } catch (err: any) {
      console.error("[Analysis] Unexpected error:", err);
      setAnalysisStatus("error");
      setAnalysisProgress(0);
      window.localStorage.removeItem("toga_analysis_start");
      sessionStorage.removeItem("toga_analysis_active");
      setAnalysisError(err.message || "Unexpected error");
      addSbToast(`Analysis error: ${err.message || "Unknown"}`, "error");
    }
  }

  // ── Action 2: Generate Ad ──
  async function createAdFromAnalysis() {
    setAdData(null);
    const result = await callWebhook({
      action: "generate_ad",
      topic: selectedTopic,
      executive_summary: analysisData?.executive_summary || "",
      top_hooks: analysisData?.hooks_table || [],
      competitors: (analysisData?.competitors_table || []).slice(0, 5),
      gaps: analysisData?.gaps_table || [],
      timestamp: new Date().toISOString(),
    }, setAdStatus);
    if (result) {
      console.log("n8n ad response:", result);
      setAdData(result);
      setAdStatus("done");
    } else if (adStatus !== "error") {
      setAdStatus("waiting");
    }
  }





  // ── Receive n8n result ──
  function receiveAnalysisResult(data) {
    setAnalysisData(data);
    setAnalysisStatus("done");
  }

  // ── DEV: simulate n8n response ──
  function simulateAnalysisResponse() {
    receiveAnalysisResult({
      success: true,
      executive_summary: "Clinical excellence and patient-centric care are the primary drivers for local healthcare providers. Digital presence is currently under-utilized, offering a significant opportunity to capture high-intent search traffic through specialized service campaigns.",
      competitors_table: [
        { name: "Global Health Clinic", ads: 14, score: 72, threat: "High", angle: "Surgical precision", hook: "JCI accredited care you can trust" },
        { name: "Wellness Prime", ads: 9, score: 85, threat: "High", angle: "Preventative focus", hook: "Your health journey, optimized" },
      ],
      hooks_table: [
        { pattern: "Treatment results", example: "Before treatment → Patient recovery", reason: "Visual results validate clinical efficacy", score: "8.1" },
      ],
      market_insights_table: [
        { field: "Dominant platform", value: "Meta (Instagram Reels)" },
        { field: "Average CPC", value: "€1.20" },
        { field: "Top ad format", value: "Video reel — 28 sec" },
        { field: "Trending style", value: "Anime & illustrative (+3×)" },
        { field: "Peak booking time", value: "Thu–Sat, 6–10 pm" },
        { field: "Avg. competitor spend", value: "€60/day" },
      ],
      gaps_table: [
        { gap: "Quality vs price", opportunity: "Counter discount-led ads with award proof", priority: "High", impact: "High CTR, lower CPA" },
        { gap: "Orthopedic specialization", opportunity: "Target 'hip replacement surgery' keywords", priority: "Medium", impact: "High-intent patient traffic" },
        { gap: "Seasonal hooks missing", opportunity: "Halloween piercing + costume combo campaign", priority: "Medium", impact: "Timely spike in bookings" },
        { gap: "Diagnostic Focus", opportunity: "Target 'MRI and diagnostic imaging' keywords", priority: "Medium", impact: "High-intent service volume" },
        { gap: "Patient Transparency", opportunity: "Virtual facility tour & specialist profiles", priority: "Low", impact: "Clinical trust & patient retention" },
      ],
    });
  }

  // ── Approval helpers ──
  function getAdStatus(adId) {
    return adCardStatuses[adId] || "pending";
  }

  function approveAd(ad) {
    setAdCardStatuses(prev => ({ ...prev, [ad.id]: "approved" }));
    setApprovedAds(prev => [...prev.filter(a => a.id !== ad.id), ad]);
    setSchedulePickerOpen(null);
  }

  function rejectAd(adId) {
    setAdCardStatuses(prev => ({ ...prev, [adId]: "rejected" }));
    setApprovedAds(prev => prev.filter(a => a.id !== adId));
    setScheduledAds(prev => prev.filter(a => a.id !== adId));
    setSchedulePickerOpen(null);
  }

  function scheduleAd(ad) {
    const dateInfo = scheduleDates[ad.id];
    if (!dateInfo?.date) return;
    const scheduledAt = `${dateInfo.date} ${dateInfo.time || "09:00"}`;
    setAdCardStatuses(prev => ({ ...prev, [ad.id]: "scheduled" }));
    setScheduledAds(prev => [
      ...prev.filter(a => a.id !== ad.id),
      { ...ad, scheduledAt },
    ]);
    setSchedulePickerOpen(null);
  }

  function undoAction(adId) {
    setAdCardStatuses(prev => ({ ...prev, [adId]: "pending" }));
    setApprovedAds(prev => prev.filter(a => a.id !== adId));
    setScheduledAds(prev => prev.filter(a => a.id !== adId));
    setRejectedAds(prev => prev.filter(a => a.id !== adId));
  }

  function approveAllPending() {
    (adData?.ad_scripts || [])
      .filter(a => getAdStatus(a.id) === "pending")
      .forEach(ad => approveAd(ad));
  }

  function rejectAllPending() {
    (adData?.ad_scripts || [])
      .filter(a => getAdStatus(a.id) === "pending")
      .forEach(ad => rejectAd(ad.id));
  }

  function countByStatus(status) {
    return (adData?.ad_scripts || []).filter(a => getAdStatus(a.id) === status).length;
  }

  function simulateAdResponse() {
    setAdData({
      topic: selectedTopic,
      headline: "Where Anime Meets Skin — Your Story, Inked Forever",
      body: "Our award-winning artists bring your favourite anime characters to life. Bold lines, vivid colour, unmatched detail. Book your consultation today.",
      cta: "Book Now",
      format: "Video reel — 28 sec",
      platform: "Meta (FB + IG)",
    });
    setAdStatus("done");
  }

  // ─── STYLES ───
  const tabStyle = (id) => ({
    padding: "8px 16px",
    borderRadius: "var(--radius-md)",
    border: "none",
    background: tab === id ? "var(--primary-light)" : "transparent",
    color: tab === id ? "var(--primary-dark)" : "var(--text-muted)",
    fontWeight: tab === id ? 700 : 500,
    fontSize: 13,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 7,
    transition: "all 0.18s ease",
    boxShadow: tab === id ? "0 1px 3px rgba(37,99,235,0.12)" : "none",
    fontFamily: "var(--font-sans)",
  });

  const topicBtnStyle = (t) => ({
    fontSize: 12,
    padding: "6px 14px",
    borderRadius: "var(--radius-pill)",
    cursor: "pointer",
    border:
      selectedTopic === t
        ? "1.5px solid var(--primary)"
        : "1px solid var(--border)",
    background:
      selectedTopic === t ? "var(--primary-light)" : "transparent",
    color:
      selectedTopic === t ? "var(--primary)" : "var(--text-muted)",
    fontWeight: selectedTopic === t ? 500 : 400,
    fontFamily: "inherit",
    transition: "all 0.2s ease",
  });

  // ─────────────────────────────────────────────────────────────
  if (isAuthenticating || !user) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        gap: 16,
      }}>
        <Spinner size={30} color="var(--primary)" />
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-muted)",
          letterSpacing: "0.02em",
        }}>
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        color: "var(--text)",
        minHeight: "100vh",
        display: "flex",
        background: "var(--background)",
      }}
    >
      {acceptingPrompts && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(15, 23, 42, 0.85)", backdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          color: "#fff", padding: 20
        }} className="animate-in fade-in duration-300">
          <div style={{
            background: "var(--card-bg, #1e293b)", border: "1px solid var(--border, #334155)",
            padding: "40px 30px", borderRadius: "var(--radius-lg, 16px)", maxWidth: 500, width: "100%",
            textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20
          }} className="animate-in zoom-in-95 duration-300">
            <div style={{
              width: 80, height: 80, borderRadius: "50%", background: "rgba(34, 197, 94, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #22c55e",
              animation: "spin 8s linear infinite"
            }}>
              <span style={{ fontSize: 36 }}>🎬</span>
            </div>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "var(--text, #fff)" }}>
                Generating Final Ad Creatives
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted, #94a3b8)", lineHeight: "1.6" }}>
                AI is now rendering your high-definition video files, generating authentic voiceovers, and uploading final assets to Supabase storage.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(34, 197, 94, 0.05)", padding: "10px 20px", borderRadius: "var(--radius-md, 8px)", border: "1.5px solid rgba(34, 197, 94, 0.15)", width: "100%", justifyContent: "center" }}>
              <Spinner size={16} color="#22c55e" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#22c55e", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Running n8n Workflow...
              </span>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-dim, #64748b)" }}>
              Please do not close this window. Your dashboard will refresh automatically upon completion.
            </p>
          </div>
        </div>
      )}

      {/* ── MOBILE TOP BAR ── */}
      {/* ── MOBILE TOP BAR ── */}
      <div className="mobile-topbar" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, zIndex: 400, background: "var(--card-bg)", borderBottom: "1px solid var(--border)", padding: "10px 16px", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/toga-health-logo.png" alt="Toga" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "contain" }} />
          <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>Toga Health AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          style={{ background: mobileMenuOpen ? "var(--primary)" : "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 18, color: mobileMenuOpen ? "#fff" : "var(--text)", transition: "all 0.2s" }}>
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* ── MOBILE BACKDROP ── */}
      {mobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          style={{ display: "none", position: "fixed", inset: 0, zIndex: 350, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className="main-layout-sidebar"
        data-open={mobileMenuOpen ? "true" : "false"}
        style={{
          width: 260,
          background: "var(--card-bg)",
          borderRight: "1px solid var(--border)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: "1px solid var(--border-light)" }}>
          <img
            src="/toga-health-logo.png"
            alt="Toga Health AI"
            style={{
              width: 38, height: 38,
              borderRadius: "var(--radius-md)",
              objectFit: "contain",
              background: "#fff",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
            }}
          />
          <div style={{
            fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em",
            color: "var(--text)", lineHeight: 1.1,
          }}>
            Toga Health AI
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flex: 1,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              style={{
                ...tabStyle(t.id),
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                border: "none",
                fontSize: 13,
                fontWeight: tab === t.id ? 700 : 500,
                textAlign: "left",
                cursor: "pointer",
                background: tab === t.id ? "var(--primary-light)" : "transparent",
                color: tab === t.id ? "var(--primary-dark)" : "var(--text-muted)",
                transition: "all 0.18s ease",
                boxShadow: tab === t.id ? "0 1px 3px rgba(37,99,235,0.12)" : "none",
              }}
              onClick={() => {
                if (t.externalLink) {
                  window.open(t.externalLink, "_blank", "noopener,noreferrer");
                } else {
                  setTab(t.id);
                  setMobileMenuOpen(false); // close sidebar on mobile after nav
                }
              }}
            >
              <span style={{ fontSize: 14, opacity: 0.85 }}>{t.icon}</span>
              <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Footer (User Profile & Sign Out) */}
        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
          {user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--primary-light)", border: "2px solid var(--primary-mid)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--primary)", flexShrink: 0
                }}>
                  <User size={14} />
                </div>
                <div style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Admin</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  padding: "9px 12px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)", background: "var(--card-bg)",
                  color: "var(--red)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.15s", fontFamily: "inherit", width: "100%"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-light)"; e.currentTarget.style.borderColor = "var(--red)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              style={{
                padding: "9px 12px", borderRadius: "var(--radius-md)",
                border: "none", background: "var(--primary)",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                transition: "all 0.15s", fontFamily: "inherit", width: "100%"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-dark)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)"; }}
            >
              <LogIn size={13} /> Sign In
            </button>
          )}
        </div>
      </aside>

      {/* ── RIGHT MAIN CONTENT ── */}
      <main
        className="main-layout-content"
        style={{
          flex: 1,
          padding: "24px 32px 4rem",
          minWidth: 0,
          maxWidth: "100%",
          overflowX: "hidden",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >

      {/* ═══════════════════════════════════════════════════════
          OVERVIEW
      ═══════════════════════════════════════════════════════ */}
      {tab === "overview" && (() => {
        // Compute dynamic top statistics
        const activeCampaigns = metaCampaignInsights.filter(c => c.effective_status === 'ACTIVE').length;
        const totalCampaignsRendered = activeCampaigns || campaigns.length; // fallback
        const pendingAuthCount = (adData?.ad_scripts || []).filter(a => getAdStatus(a.id) === "pending").length;

        // Determine Top Performer
        let topPerformer = null;
        if (metaCampaignInsights.length > 0) {
          topPerformer = [...metaCampaignInsights].sort((a, b) => {
            const ctrA = parseFloat(a.insights?.inline_link_click_ctr || 0);
            const ctrB = parseFloat(b.insights?.inline_link_click_ctr || 0);
            return ctrB - ctrA;
          })[0];
        }

        const spendTotal = parseFloat(metaInsights?.spend || 0);
        const impressionsTotal = parseFloat(metaInsights?.impressions || 0);
        const cpm = impressionsTotal > 0 ? (spendTotal / impressionsTotal * 1000).toFixed(2) : "0.00";

        return (
          <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
            {/* Top Stat Ribbon */}
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5"
            >
              <MetricCard
                label="Live campaigns"
                value={totalCampaignsRendered}
                sub="Meta Ads API"
                color="var(--primary)"
                bg="var(--primary-light)"
              />
              <MetricCard
                label="Market Intel"
                value={sbRows.length}
                sub="Available reports"
                color="var(--green)"
                bg="var(--green-light)"
              />
              <MetricCard
                label="Pending approval"
                value={pendingAuthCount}
                sub={pendingAuthCount > 0 ? "Action needed" : "All clear"}
                color={pendingAuthCount > 0 ? "var(--red)" : "var(--amber)"}
                bg={pendingAuthCount > 0 ? "var(--red-light)" : "var(--amber-light)"}
                dot={pendingAuthCount > 0}
              />
              <MetricCard
                label="Stopped"
                value={stoppedIds.length}
                sub="This session"
                color="var(--text-muted)"
                bg="var(--surface)"
              />
            </div>

            {/* Dash Body Panels */}
            <div
              className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4"
            >
              {/* Left Column */}
              <div className="overview-left-col" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Account Health Window */}
                <Card className="account-health-card" style={{ background: "linear-gradient(135deg, #f8fafc, #eff6ff)", border: "1px solid #bfdbfe", padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <SectionTitle style={{ margin: 0, color: "var(--primary)" }}>Account Health Snapshot</SectionTitle>
                    <Badge text="Live Data" color="var(--primary)" bg="var(--primary-light)" />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {[
                      { label: "Total Inv.", value: `$${spendTotal.toFixed(2)}`, color: "var(--text)" },
                      { label: "Total Reach", value: impressionsTotal.toLocaleString(), color: "var(--text)" },
                      { label: "Avg CPM", value: `$${cpm}`, color: "var(--primary)" },
                    ].map((stat) => (
                      <div key={stat.label} style={{ background: "#ffffff", padding: "12px 10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)", textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>{stat.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Top Performer Campaign */}
                <Card style={{ position: "relative", overflow: "hidden", border: "1px solid #bbf7d0", background: "#f0fdf4" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, fontSize: 80, opacity: 0.1 }}>🏆</div>
                  <SectionTitle style={{ color: "var(--green-strong)" }}>Top Performing Campaign</SectionTitle>

                  {topPerformer ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "lowercase", display: "inline-block", background: "rgba(0,0,0,0.05)", padding: "2px 8px", borderRadius: 4 }}>{topPerformer.objective?.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{topPerformer.name}</div>

                      <div className="flex flex-col sm:flex-row gap-4 lg:gap-5">
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Spend</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>${parseFloat(topPerformer.insights?.spend || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>CTR (Link)</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{parseFloat(topPerformer.insights?.inline_link_click_ctr || 0).toFixed(2)}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Conversions</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{topPerformer.insights?.leads || 0}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "20px 0", fontSize: 13, color: "var(--text-muted)" }}>No campaigns are currently tracking performance data.</div>
                  )}
                </Card>

              </div>

              {/* Right Column: Quick Actions */}
              <div className="overview-right-col" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card>
                  <SectionTitle>Quick Actions</SectionTitle>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    {[
                      ["Run competitor analysis", () => setTab("analysis"), "◎", "Assess competitive blind spots in the market."],
                      ["Create new ad setup", () => setTab("create"), "◈", "Generate scripts and creative logic using AI."],
                      ["Review approvals queue", () => setTab("approval"), "◉", "Finalize ad creatives and prepare launch configurations."],
                      ["Monitor live tracking", () => setTab("reports"), "◧", "Review granular performance tables inside Reports."],
                    ].map(([label, fn, icon, sub]: any, i) => (
                      <button
                        key={i}
                        onClick={fn}
                        style={{
                          padding: "12px 16px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                          background: "#fff",
                          color: "var(--text)",
                          cursor: "pointer",
                          textAlign: "left",
                          fontFamily: "inherit",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          transition: "all 0.15s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--surface-hover)";
                          e.currentTarget.style.borderColor = "var(--primary-light)";
                          e.currentTarget.style.transform = "translateX(2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.borderColor = "var(--border)";
                          e.currentTarget.style.transform = "translateX(0)";
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: 13, color: "var(--primary-strong)" }}>
                            <span style={{ fontSize: 14 }}>{icon}</span> {label}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, marginLeft: 24 }}>{sub}</div>
                        </div>
                        <span style={{ opacity: 0.4, paddingLeft: 10 }}>→</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
          ADS ANALYSIS
      ═══════════════════════════════════════════════════════ */}
      {tab === "analysis" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Page Header ── */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 20, padding: "20px 28px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            {/* Left: title + description */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 26 }}>🔍</span>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A" }}>Competitor Ad Analysis</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 3 }}>Research competitor ads, find gaps, and get ready-to-use ad scripts powered by AI</div>
              </div>
            </div>
            {/* Right: how-to steps */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {[
                { num: "1", label: "Add keywords & configure", icon: "⌨️" },
                { num: "2", label: "Run the analysis", icon: "▶️" },
                { num: "3", label: "Review insights & scripts", icon: "📋" },
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 20, padding: "6px 12px 6px 8px" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#2563EB", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {step.num}
                    </div>
                    <span style={{ fontSize: 12, color: "#475569", fontWeight: 500, whiteSpace: "nowrap" }}>{step.label}</span>
                  </div>
                  {i < 2 && <span style={{ color: "#CBD5E1", fontSize: 16, margin: "0 4px" }}>→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar + Content Row ── */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* History Sidebar */}
          <div className="w-full lg:w-[290px] lg:flex-shrink-0 lg:sticky lg:top-5" style={{
            background: "#fff", border: "1px solid #E2E8F0",
            borderRadius: 20, overflow: "hidden",
            height: "fit-content", boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}>
            {/* Sidebar Header — on mobile acts as toggle */}
            <div
              onClick={() => setShowPreviousRuns(o => !o)}
              style={{ padding: "14px 20px", background: "#F8FAFC", borderBottom: showPreviousRuns ? "1px solid #E2E8F0" : "none", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>🕐</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Previous Runs</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{sbRows.length} saved {sbRows.length === 1 ? "result" : "results"}</div>
              </div>
              {/* Toggle chevron — visible on mobile, hidden on desktop */}
              <span className="prev-runs-chevron" style={{ fontSize: 13, color: "#64748b", fontWeight: 700, transition: "transform 0.2s", display: "inline-block", transform: showPreviousRuns ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>

            {/* Run Cards — toggled on mobile, always shown on desktop via CSS */}
            <div className="prev-runs-list" style={{ display: showPreviousRuns ? "flex" : "none", flexDirection: "column", gap: 0, maxHeight: "70vh", overflowY: "auto" }}>
              {[...sbRows].reverse().map((row: any, idx: number) => {
                const report = parseSbReport(row);
                const inputsObj = typeof row.inputs === 'string' ? JSON.parse(row.inputs || "{}") : (row.inputs || {});
                const keyword = inputsObj.topic || (inputsObj.keywords && inputsObj.keywords[0]) || inputsObj.action || inputsObj.query || null;
                const displayTitle = keyword || report.topic || `Run at ${formatSbTime(row.created_at)}`;

                return (
                  <div key={row.id} style={{
                    padding: "14px 20px",
                    borderBottom: "1px solid #F1F5F9",
                    transition: "background 0.15s",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F8FAFC";
                    if (row.inputs) {
                      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                      const rect = e.currentTarget.getBoundingClientRect();
                      let y = rect.top;
                      if (y + 420 > window.innerHeight) y = Math.max(10, window.innerHeight - 440);
                      setHoveredInputs({ data: inputsObj, x: rect.right + 12, y });
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    hoverTimeoutRef.current = setTimeout(() => setHoveredInputs(null), 200);
                  }}>
                    {/* Run number + title */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: "#EFF6FF", color: "#2563EB", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        {sbRows.length - idx}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", lineHeight: 1.35, textTransform: "capitalize", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                        {displayTitle}
                      </div>
                    </div>
                    {/* Date */}
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 10, display: "flex", alignItems: "center", gap: 5, paddingLeft: 32 }}>
                      <span>📅</span> {formatSbDate(row.created_at)}
                    </div>
                    {/* Use Result button */}
                    <div style={{ paddingLeft: 32 }}>
                      <button
                        onClick={() => {
                          setAnalysisData({ ...report, id: row.id });
                          setAnalysisStatus("done");
                          setSelectedTopic(report.topic || TOPICS[1]);
                          addSbToast("Loaded history: " + report.topic);
                        }}
                        style={{
                          width: "100%", padding: "8px 0", borderRadius: 10, border: "none",
                          background: "#2563EB", color: "#fff",
                          fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#1D4ED8"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#2563EB"; }}
                      >
                        Use Result →
                      </button>
                    </div>
                  </div>
                );
              })}
              {sbRows.length === 0 && (
                <div style={{ padding: "32px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>No runs yet</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Your analysis history will appear here</div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Card style={{ marginBottom: 14 }}>
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes radar-sweep {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
                @keyframes radar-pulse {
                  0% { transform: scale(0.6); opacity: 0.8; }
                  100% { transform: scale(2.2); opacity: 0; }
                }
                @keyframes blip-glow {
                  0%, 100% { transform: scale(0.8); opacity: 0.4; }
                  50% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 4px var(--primary)); }
                }
              `}} />
              <SectionTitle>Topic for analysis</SectionTitle>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  marginBottom: 24,
                  background: "var(--surface)",
                  padding: 20,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Keywords Tag Manager */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 8,
                    }}
                  >
                    Keywords (Press Enter or click Add to append)
                  </label>
                  
                  {/* Selected Keywords list as beautiful tags */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 10,
                      padding: 8,
                      background: "var(--card-bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      minHeight: "45px",
                    }}
                  >
                    {researchKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          background: "var(--primary-light)",
                          border: "1px solid var(--primary-mid)",
                          borderRadius: "var(--radius-pill)",
                          color: "var(--primary-dark)",
                          fontSize: 13,
                          fontWeight: 500,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => {
                            setResearchKeywords(prev => prev.filter((_, i) => i !== idx));
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--primary)",
                            fontSize: 14,
                            fontWeight: "bold",
                            cursor: "pointer",
                            padding: "0 2px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = "var(--red-dark)"}
                          onMouseLeave={(e) => e.currentTarget.style.color = "var(--primary)"}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    {researchKeywords.length === 0 && (
                      <span style={{ fontSize: 13, color: "var(--text-dim)", alignSelf: "center", paddingLeft: 4 }}>
                        No keywords selected. Add some below.
                      </span>
                    )}
                  </div>

                  {/* Add Keyword Input Box */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Add a new keyword..."
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = keywordInput.trim();
                          if (val && !researchKeywords.includes(val)) {
                            setResearchKeywords(prev => [...prev, val]);
                            setKeywordInput("");
                          }
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "var(--card-bg)",
                        color: "var(--text)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        outline: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--primary)";
                        e.target.style.boxShadow = "0 0 0 3px var(--primary-light)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--border)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = keywordInput.trim();
                        if (val && !researchKeywords.includes(val)) {
                          setResearchKeywords(prev => [...prev, val]);
                          setKeywordInput("");
                        }
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-md)",
                        border: "none",
                        background: "var(--primary)",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-dark)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "var(--primary)"}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Grid for Options */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 16,
                  }}
                >
                  {/* Google Maps Country Search Autocomplete */}
                  <div style={{ position: "relative" }} onMouseLeave={() => setShowLocationDropdown(false)}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 8,
                      }}
                    >
                      Countries / Locations
                    </label>

                    {/* Google Maps style capsule input */}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <span style={{ position: "absolute", left: 10, fontSize: 14, color: "var(--text-muted)" }}>
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search country (e.g. Turkey)..."
                        value={locationSearchInput}
                        onChange={(e) => {
                          setLocationSearchInput(e.target.value);
                          setShowLocationDropdown(true);
                        }}
                        onFocus={() => setShowLocationDropdown(true)}
                        style={{
                          width: "100%",
                          padding: "8px 12px 8px 30px",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border)",
                          background: "var(--card-bg)",
                          color: "var(--text)",
                          fontFamily: "inherit",
                          fontSize: 13,
                          outline: "none",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                        onFocusCapture={(e) => {
                          e.target.style.borderColor = "var(--primary)";
                          e.target.style.boxShadow = "0 0 0 3px var(--primary-light)";
                        }}
                        onBlurCapture={(e) => {
                          e.target.style.borderColor = "var(--border)";
                          e.target.style.boxShadow = "none";
                        }}
                      />
                      {locationSearchInput && (
                        <button
                          type="button"
                          onClick={() => setLocationSearchInput("")}
                          style={{
                            position: "absolute",
                            right: 10,
                            background: "none",
                            border: "none",
                            fontSize: 12,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown list */}
                    {showLocationDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 50,
                          background: "var(--card-bg)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "var(--shadow-lg)",
                          maxHeight: 200,
                          overflowY: "auto",
                          marginTop: 4,
                        }}
                      >
                        {LOCATION_SUGGESTIONS.filter(item =>
                          item.name.toLowerCase().includes(locationSearchInput.toLowerCase()) ||
                          item.shortcut.toLowerCase().includes(locationSearchInput.toLowerCase())
                        ).map((item, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              if (!researchCountries.includes(item.shortcut)) {
                                setResearchCountries(prev => [...prev, item.shortcut]);
                              }
                              setLocationSearchInput("");
                              setShowLocationDropdown(false);
                            }}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              fontSize: 13,
                              borderBottom: "1px solid var(--border-light)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <div>
                              <span style={{ marginRight: 6 }}>📍</span>
                              <span style={{ fontWeight: 500 }}>{item.name}</span>
                              <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 20 }}>
                                {item.details}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 6px", borderRadius: 4 }}>
                              {item.shortcut}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Selected Countries Location Pin Badges */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {researchCountries.map(code => {
                        const matched = LOCATION_SUGGESTIONS.find(c => c.shortcut === code);
                        const label = matched ? matched.name : code;
                        return (
                          <span
                            key={code}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 8px",
                              background: "var(--secondary-light)",
                              border: "1px solid var(--secondary-dark)",
                              borderRadius: "var(--radius-sm)",
                              color: "var(--secondary-dark)",
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            📍 {label} ({code})
                            <button
                              type="button"
                              onClick={() => {
                                setResearchCountries(prev => prev.filter(c => c !== code));
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--secondary-dark)",
                                fontSize: 12,
                                fontWeight: "bold",
                                cursor: "pointer",
                                marginLeft: 2,
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = "var(--red-dark)"}
                              onMouseLeave={(e) => e.currentTarget.style.color = "var(--secondary-dark)"}
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                      {researchCountries.length === 0 && (
                        <span style={{ fontSize: 12, color: "var(--text-dim)", fontStyle: "italic", marginTop: 4 }}>
                          No countries selected. Webhook payload will omit location targeting.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Max Ads Input */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Max Ads
                    </label>
                    <input
                      type="number"
                      value={researchMaxAds}
                      onChange={(e) => setResearchMaxAds(e.target.value)}
                      min={1}
                      max={1000}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "var(--card-bg)",
                        color: "var(--text)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        outline: "none",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--primary)";
                        e.target.style.boxShadow = "0 0 0 3px var(--primary-light)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--border)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  {/* Only Active Ads Toggle */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 8,
                      }}
                    >
                      Only Active Ads
                    </label>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        userSelect: "none",
                        padding: "6px 0",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={researchOnlyActive}
                        onChange={(e) => setResearchOnlyActive(e.target.checked)}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: "var(--primary)",
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>
                        Active Only
                      </span>
                    </label>
                  </div>

                  {/* Sort Option Dropdown */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 6,
                      }}
                    >
                      Sort
                    </label>
                    <select
                      value={researchSort}
                      onChange={(e) => setResearchSort(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        background: "var(--card-bg)",
                        color: "var(--text)",
                        fontFamily: "inherit",
                        fontSize: 13,
                        outline: "none",
                        cursor: "pointer",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--primary)";
                        e.target.style.boxShadow = "0 0 0 3px var(--primary-light)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--border)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      <option value="Impressions High → Low">Impressions High → Low</option>
                      <option value="Impressions Low → High">Impressions Low → High</option>
                      <option value="Newest First">Newest First</option>
                      <option value="Oldest First">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* IDLE / DONE / ERROR STATE: TRIGGER BUTTON */}
              {(analysisStatus === "idle" || analysisStatus === "done" || analysisStatus === "error") && (
                <div style={{ width: "100%" }}>
                  <button
                    onClick={runCompetitorAnalysis}
                    style={{
                      width: "100%",
                      padding: "12px 18px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: "var(--primary)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "background 0.2s, transform 0.15s",
                      boxShadow: "var(--shadow-md)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-dark)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {analysisStatus === "done"
                      ? "Re-run competitor analysis"
                      : "Trigger n8n webhook — run competitor analysis"}
                  </button>
                  {analysisStatus === "error" && (
                    <div style={{ marginTop: 10, fontSize: 13, color: "var(--red-strong)", background: "var(--red-light)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--red)" }}>
                      <strong>Webhook error:</strong> {analysisError || webhookError || "Could not reach the webhook endpoint."}
                    </div>
                  )}
                </div>
              )}

              {/* ANALYSIS PROGRESS BAR */}
              {analysisStatus === "generating" && (
                <div className="animate-fade-in" style={{
                  background: "#fff", borderRadius: 14, border: "1.5px solid #bfdbfe",
                  padding: "20px 24px", boxShadow: "0 2px 12px rgba(37,99,235,0.08)"
                }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Spinner size={16} color="#2563eb" />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Competitor Analysis Running</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>n8n is scraping Meta Ads Library &amp; running AI analysis…</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#2563eb" }}>{analysisProgress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 8, background: "#e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${analysisProgress}%`,
                      background: "linear-gradient(90deg, #2563eb, #0ea5e9)",
                      borderRadius: 8,
                      transition: "width 1.8s ease-out",
                      boxShadow: "0 0 8px rgba(37,99,235,0.4)"
                    }} />
                  </div>

                  {/* Step indicators */}
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Connecting to n8n", pct: 5 },
                      { label: "Scraping Meta Ads Library", pct: 25 },
                      { label: "AI competitor analysis", pct: 55 },
                      { label: "Generating insights", pct: 80 },
                    ].map((s) => (
                      <div key={s.label} style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: analysisProgress >= s.pct ? "#eff6ff" : "#f8fafc",
                        color: analysisProgress >= s.pct ? "#1d4ed8" : "#94a3b8",
                        border: `1px solid ${analysisProgress >= s.pct ? "#bfdbfe" : "#e2e8f0"}`,
                        transition: "all 0.5s"
                      }}>
                        <span>{analysisProgress >= s.pct ? "✓" : "○"}</span>
                        {s.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* ── RESULTS ── */}
            {analysisStatus === "done" && analysisData && (
              <div className="animate-slide-up">

                {/* 1. Executive Summary */}
                {analysisData?.executive_summary && (
                  <Card style={{ marginBottom: 14 }}>
                    <SectionTitle>Executive Summary</SectionTitle>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-body)" }}>
                      {analysisData.executive_summary}
                    </div>
                  </Card>
                )}

                {/* 2. Competitor Ads — Card List */}
                {(analysisData?.competitors_table?.length > 0) && (
                  <div style={{ marginBottom: 20, background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ padding: "16px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>🏆</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Competitor Ads</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{analysisData.competitors_table.length} competitors tracked</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {analysisData.competitors_table.map((row: any, i: number) => {
                        const threat = row?.threat?.toLowerCase();
                        const threatColor = threat === "high" ? { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" } : threat === "medium" ? { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" } : { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" };
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 20px", borderBottom: i < analysisData.competitors_table.length - 1 ? "1px solid #F1F5F9" : "none", transition: "background 0.15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            {/* Rank */}
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", color: "#64748B", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                              {i + 1}
                            </div>
                            {/* Name + hook */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{row?.name}</span>
                                <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 6 }}>{row?.ads} ads</span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: threatColor.bg, color: threatColor.color, border: `1px solid ${threatColor.border}` }}>{row?.threat}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, color: "#64748B" }}>Angle: </span>{row?.angle}
                              </div>
                              {row?.hook && <div style={{ fontSize: 12, color: "#2563EB", fontStyle: "italic", lineHeight: 1.5 }}>"{row?.hook}"</div>}
                            </div>
                            {/* Score */}
                            <div style={{ flexShrink: 0, textAlign: "center" }}>
                              <div style={{ width: 40, height: 40, borderRadius: "50%", border: `2px solid ${row?.score >= 9 ? "#DC2626" : row?.score >= 7 ? "#D97706" : "#16A34A"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: row?.score >= 9 ? "#DC2626" : row?.score >= 7 ? "#D97706" : "#16A34A" }}>{row?.score}</span>
                              </div>
                              <div style={{ fontSize: 9, color: "#94A3B8", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>score</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Top Hook Patterns — Cards */}
                {(analysisData?.hooks_table?.length > 0) && (
                  <div style={{ marginBottom: 20, background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                    <div style={{ padding: "16px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>🎣</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Top Hook Patterns</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>Winning formulas from competitor ads</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {analysisData.hooks_table.map((row: any, i: number) => (
                        <div key={i} style={{ display: "flex", gap: 16, padding: "16px 20px", borderBottom: i < analysisData.hooks_table.length - 1 ? "1px solid #F1F5F9" : "none", transition: "background 0.15s" }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          {/* Index */}
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Pattern name + score */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{row?.pattern}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#EFF6FF", color: "#2563EB", border: "1px solid #DBEAFE", flexShrink: 0 }}>{row?.score}</span>
                            </div>
                            {/* Example */}
                            {row?.example && <div style={{ fontSize: 12, color: "#2563EB", fontStyle: "italic", lineHeight: 1.5, marginBottom: 6, padding: "6px 10px", background: "#EFF6FF", borderRadius: 8, borderLeft: "3px solid #2563EB" }}>"{row?.example}"</div>}
                            {/* Reason */}
                            {row?.reason && <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>{row?.reason}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4 + 5. Market Insights & Gap Opportunities — side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16, marginBottom: 20 }}>

                  {/* 4. Market Insights — Info Cards */}
                  {(analysisData?.market_insights_table?.length > 0) && (
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                      <div style={{ padding: "16px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>📊</span>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Market Insights</div>
                      </div>
                      <div style={{ padding: "8px 0" }}>
                        {analysisData.market_insights_table.map((row: any, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 20px", borderBottom: i < analysisData.market_insights_table.length - 1 ? "1px solid #F8FAFC" : "none" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", width: 90, flexShrink: 0, paddingTop: 2 }}>{row?.field}</div>
                            <div style={{ fontSize: 13, color: "#1E293B", lineHeight: 1.6, flex: 1 }}>{row?.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Gap Opportunities — Cards */}
                  {(analysisData?.gaps_table?.length > 0) && (
                    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                      <div style={{ padding: "16px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>💡</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>Gap Opportunities</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{analysisData.gaps_table.length} opportunities identified</div>
                        </div>
                      </div>
                      <div style={{ padding: "8px 0" }}>
                        {analysisData.gaps_table.map((row: any, i: number) => {
                          const pri = row?.priority?.toLowerCase();
                          const priStyle = pri === "high" ? { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" } : pri === "medium" ? { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" } : { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" };
                          return (
                            <div key={i} style={{ padding: "12px 20px", borderBottom: i < analysisData.gaps_table.length - 1 ? "1px solid #F1F5F9" : "none", transition: "background 0.15s" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", lineHeight: 1.4 }}>{row?.gap}</div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: priStyle.bg, color: priStyle.color, border: `1px solid ${priStyle.border}`, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{row?.priority}</span>
                              </div>
                              {row?.opportunity && <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, marginBottom: row?.impact ? 4 : 0 }}>{row?.opportunity}</div>}
                              {row?.impact && <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>💥 {row?.impact}</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw response fallback — shown when none of the expected tables are present */}
                {(!analysisData?.competitors_table?.length &&
                  !analysisData?.hooks_table?.length &&
                  !analysisData?.market_insights_table?.length &&
                  !analysisData?.gaps_table?.length &&
                  !analysisData?.message?.toLowerCase().includes("workflow")) && (
                    <Card style={{ marginBottom: 14 }}>
                      <SectionTitle>n8n Raw Response</SectionTitle>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                        n8n responded but no table data was found. Raw output:
                      </div>
                      <pre style={{
                        fontSize: 11,
                        background: "var(--surface)",
                        borderRadius: "var(--radius-md)",
                        padding: 12,
                        overflow: "auto",
                        maxHeight: 300,
                        margin: 0,
                        color: "var(--text)",
                        lineHeight: 1.6,
                      }}>
                        {JSON.stringify(analysisData, null, 2)}
                      </pre>
                    </Card>
                  )}

                {analysisData && (
                  <div>
                    <button
                      onClick={() => { setTab("create"); setCreateTabConfigOpen(true); }}
                      disabled={adStatus === "generating" || adStatus === "waiting"}
                      style={{
                        padding: "11px 18px",
                        borderRadius: "var(--radius-md)",
                        border: "none",
                        background: (adStatus === "generating" || adStatus === "waiting") ? "var(--primary-light)" : "var(--primary)",
                        color: (adStatus === "generating" || adStatus === "waiting") ? "var(--primary)" : "#fff",
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: (adStatus === "generating" || adStatus === "waiting") ? "not-allowed" : "pointer",
                        opacity: (adStatus === "generating" || adStatus === "waiting") ? 0.7 : 1,
                        fontFamily: "inherit",
                        display: "center",
                        alignItems: "center",
                        gap: 8,
                        transition: "background 0.2s",
                      }}
                    >
                      {adStatus === "generating" ? <><Spinner size={12} color="var(--primary)" /> Sending to n8n...</> :
                        adStatus === "waiting" ? <><Spinner size={12} color="var(--primary)" /> Generating ad...</> :
                          "Create ad based on this analysis →"}
                    </button>
                    {adStatus === "waiting" && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "var(--amber)" }}>
                        n8n is generating your ad using the analysis data. Results will appear in the Create Ad tab when ready.
                      </div>
                    )}
                    {adStatus === "error" && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "var(--red-strong)" }}>
                        Could not reach n8n: {webhookError}. Please try again.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          CREATE AD
      ═══════════════════════════════════════════════════════ */}
      {tab === "create" && (
        <div className="animate-fade-in" style={{ maxWidth: "100%", overflowX: "hidden", boxSizing: "border-box" }}>
          {!analysisData && (
            <div
              style={{
                background: "var(--amber-light)",
                border: "0.5px solid var(--amber)",
                borderRadius: "var(--radius-md)",
                padding: 14,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: "var(--amber)",
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                No competitor analysis yet
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--amber-dark)",
                }}
              >
                Run competitor analysis first so AI can create a
                better ad based on real data.
              </div>
            </div>
          )}

          {/* ── Executive Summary from Analysis ── */}
          {analysisData?.executive_summary ? (
            <Card style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 20px", borderBottom: "1.5px solid var(--border-mid)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "linear-gradient(135deg, #eff6ff, #f0f9ff)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📊</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>Competitor Analysis Summary</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Based on your latest analysis run</div>
                  </div>
                </div>
                {(analysisData?.topic || pendingAnalysisTopic) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--primary)", color: "#fff", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    <span>🏷️</span>
                    <span>{analysisData?.topic || pendingAnalysisTopic}</span>
                  </div>
                )}
              </div>
              {/* Summary text */}
              <div style={{ padding: "16px 20px" }}>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, margin: 0 }}>
                  {analysisData.executive_summary}
                </p>
              </div>
            </Card>
          ) : (
            <Card style={{ marginBottom: 14, padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "var(--amber-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>💡</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>No analysis loaded</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Run or load a competitor analysis from the Ads Analysis tab to power your ad creation.</div>
                </div>
              </div>
            </Card>
          )}

          <Card style={{ marginBottom: 14, maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
              {/* Toggle configuration panel */}
              {!createTabConfigOpen ? (
                <button
                  onClick={() => setCreateTabConfigOpen(true)}
                  disabled={adStatus === "generating" || adStatus === "waiting" || !analysisData}
                  style={{
                    width: "100%",
                    padding: "11px 18px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "var(--surface)" : "var(--primary)",
                    color: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "var(--primary)" : "#fff",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "not-allowed" : "pointer",
                    opacity: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? 0.7 : 1,
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "background 0.2s",
                  }}
                >
                  {adStatus === "generating" ? <><Spinner size={12} color="var(--primary)" /> Sending to n8n...</> :
                    adStatus === "waiting" ? <><Spinner size={12} color="var(--primary)" /> Generating ad...</> :
                      "Generate ad — trigger n8n"}
                </button>
              ) : (
                <div className="animate-fade-in" style={{
                  borderRadius: "var(--radius-lg)",
                  background: "#fff",
                  border: "1.5px solid #e0e7ff",
                  overflow: "hidden",
                }}>
                  {/* Cancel button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
                    <button
                      onClick={() => setCreateTabConfigOpen(false)}
                      style={{
                        padding: "5px 14px", borderRadius: "var(--radius-sm)", border: "1px solid #e0e7ff",
                        background: "#f5f3ff", color: "#7c3aed", fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      ✕ Close
                    </button>
                  </div>

                  {/* ── PHASE 1: TOTAL QUANTITY ── */}
                  <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", marginBottom: 2, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 10, fontWeight: 800 }}>1</span>
                          How many ads?
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Choose between 1 and 5 creatives.</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => updateCreateTabTotalAds(n)}
                            type="button"
                            style={{
                              width: 38, height: 38, borderRadius: 10,
                              border: createTabAdsConfig.totalAds === n ? "2px solid var(--primary)" : "1.5px solid var(--border)",
                              background: createTabAdsConfig.totalAds === n ? "var(--primary)" : "var(--surface)",
                              color: createTabAdsConfig.totalAds === n ? "#fff" : "var(--text-muted)",
                              fontSize: 14, fontWeight: 800, cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
                              boxShadow: createTabAdsConfig.totalAds === n ? "0 4px 10px rgba(2,132,199,0.3)" : "none",
                            }}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── PHASE 2: ALLOCATION ── */}
                  <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 10, fontWeight: 800 }}>2</span>
                          Allocate Types
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "var(--primary-light)", color: "var(--primary)", fontWeight: 700 }}>Max 3🎬 / 2🖼️</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Divide your {createTabAdsConfig.totalAds} ads into Videos and Images.</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card-bg)", padding: "6px 14px", borderRadius: 20, border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>🎬 {createTabAdsConfig.videoCount}/3</span>
                        <div style={{ width: 1, height: 14, background: "var(--border)" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>🖼️ {createTabAdsConfig.imageCount}/2</span>
                      </div>
                    </div>

                    <div className="create-ads-allocate-row" style={{ display: "flex", flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                      {createTabAdsConfig.items.map((item, idx) => {
                        const videoDisabled = item.type !== "video" && createTabAdsConfig.videoCount >= 3;
                        const imageDisabled = item.type !== "image" && createTabAdsConfig.imageCount >= 2;
                        const isVideo = item.type === "video";
                        const isImage = item.type === "image";
                        return (
                          <div key={item.id} style={{ flex: "1 1 80px", minWidth: 80, maxWidth: 120, display: "flex", flexDirection: "column", gap: 5 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginLeft: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Ad {idx + 1}</div>
                            <div style={{
                              display: "flex", borderRadius: 10, overflow: "hidden",
                              border: isVideo ? "1.5px solid var(--primary)" : isImage ? "1.5px solid #64748b" : "1.5px solid var(--border)",
                              background: "var(--card-bg)", boxShadow: "var(--shadow-sm)"
                            }}>
                              <button onClick={() => setCreateTabItemType(idx, "video")} type="button" style={{
                                flex: 1, padding: "11px 0", border: "none", cursor: videoDisabled ? "not-allowed" : "pointer",
                                background: isVideo ? "var(--primary-light)" : "transparent",
                                fontSize: 17, transition: "all 0.15s", opacity: videoDisabled ? 0.25 : 1
                              }} title={videoDisabled ? "3 Video max" : "Video"}>🎬</button>
                              <div style={{ width: 1, background: "var(--border)" }} />
                              <button onClick={() => setCreateTabItemType(idx, "image")} type="button" style={{
                                flex: 1, padding: "11px 0", border: "none", cursor: imageDisabled ? "not-allowed" : "pointer",
                                background: isImage ? "#f1f5f9" : "transparent",
                                fontSize: 17, transition: "all 0.15s", opacity: imageDisabled ? 0.25 : 1
                              }} title={imageDisabled ? "2 Image max" : "Image"}>🖼️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── PHASE 3: DETAILED CONFIG ── */}
                  <div className="create-ads-config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, padding: "20px 24px", maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
                    {createTabAdsConfig.items.map((item, idx) => {
                      const isVideo = item.type === "video";
                      return (
                        <div key={item.id} style={{
                          borderRadius: 14,
                          background: "#fff",
                          border: doesSlotHaveError(item.id) ? "2px solid #ef4444" : isVideo ? "1.5px solid #bfdbfe" : "1.5px solid #e2e8f0",
                          overflow: "hidden",
                          boxShadow: doesSlotHaveError(item.id) ? "0 4px 20px rgba(239,68,68,0.12)" : "0 2px 12px rgba(0,0,0,0.06)",
                          maxWidth: "100%", boxSizing: "border-box", minWidth: 0
                        }}>
                          {/* Config card header */}
                          <div style={{
                            padding: "12px 18px",
                            background: doesSlotHaveError(item.id)
                              ? "linear-gradient(135deg, #fef2f2, #fee2e2)"
                              : isVideo ? "linear-gradient(135deg, #eff6ff, #dbeafe)" : "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                            display: "flex", alignItems: "center", gap: 10,
                            borderBottom: doesSlotHaveError(item.id) ? "1.5px solid #fecaca" : isVideo ? "1.5px solid #bfdbfe" : "1.5px solid #e2e8f0"
                          }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: doesSlotHaveError(item.id) ? "#fee2e2" : isVideo ? "#dbeafe" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                              {doesSlotHaveError(item.id) ? "⚠️" : isVideo ? "🎬" : "🖼️"}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: doesSlotHaveError(item.id) ? "#dc2626" : isVideo ? "#1d4ed8" : "#475569" }}>
                                {isVideo ? "Video" : "Image"} {idx + 1}
                              </div>
                              <div style={{ fontSize: 10, color: doesSlotHaveError(item.id) ? "#ef4444" : isVideo ? "#3b82f6" : "#94a3b8", marginTop: 1, fontWeight: 600 }}>
                                {doesSlotHaveError(item.id) ? "Policy violation — fix prompt" : "Configuration"}
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: 20, maxWidth: "100%", boxSizing: "border-box", overflowX: "hidden" }}>

                          {isVideo ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              <div className="config-input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration</div>
                                  <CustomSelect
                                    value={item.duration}
                                    onChange={(v) => updateCreateTabItemField(idx, "duration", v)}
                                    options={DURATIONS.map(d => ({ value: d, label: d }))}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Audio Style</div>
                                  <CustomSelect
                                    value={item.audioStyle}
                                    onChange={(v) => updateCreateTabItemField(idx, "audioStyle", v)}
                                    options={AUDIO_STYLES.map(a => ({ value: a, label: a }))}
                                  />
                                </div>
                              </div>
                              <div className="config-input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, minWidth: 0 }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Character</div>
                                  <CustomSelect
                                    value={item.character || "male"}
                                    onChange={(v) => {
                                      setCreateTabAdsConfig((prev) => {
                                        const newItems = [...prev.items];
                                        newItems[idx] = { ...newItems[idx], character: v };
                                        return { ...prev, items: newItems };
                                      });
                                    }}
                                    options={[{ value: "male", label: "👨 Male" }, { value: "female", label: "👩 Female" }]}
                                  />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Voice</div>
                                  <button
                                    type="button"
                                    onClick={() => setVoiceModalOpenForId(item.id)}
                                    style={{
                                      width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                      border: "none", background: "#0284c7", color: "#fff",
                                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                      fontFamily: "inherit", transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#0369a1"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#0284c7"; }}
                                  >
                                    🎙️ Voices
                                  </button>
                                  {voiceLabels[item.id] && (
                                    <div style={{
                                      display: "flex", alignItems: "center", gap: 4, minWidth: 0,
                                      padding: "4px 8px", background: "#eff6ff",
                                      border: "1px solid #bfdbfe", borderRadius: 6,
                                      overflow: "hidden",
                                    }}>
                                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, fontWeight: 600, color: "#1d4ed8" }}>
                                        {voiceLabels[item.id]}
                                      </span>
                                      <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", background: "#dbeafe", padding: "1px 4px", borderRadius: 3, flexShrink: 0 }}>
                                        ✓
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="config-input-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Visual Style</div>
                                  <CustomSelect
                                    value={item.videoStyle}
                                    onChange={(v) => updateCreateTabItemField(idx, "videoStyle", v)}
                                    options={VIDEO_STYLES.map(s => ({ value: s, label: s }))}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Language</div>
                                  <CustomSelect
                                    value={item.language || "English"}
                                    onChange={(v) => updateCreateTabItemField(idx, "language", v)}
                                    options={LANGUAGES.map(l => ({ value: l, label: l }))}
                                  />
                                </div>
                              </div>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.06em" }}>Script / Storyboard Idea</div>
                                  <button
                                    disabled={sentIdeaIds[item.id]}
                                    onClick={async () => {
                                      if (sentIdeaIds[item.id]) return;
                                      setSentIdeaIds(prev => ({ ...prev, [item.id]: true }));
                                      addSbToast(`Generating Video ${idx + 1} ideas via webhook...`);
                                      console.log("Sending to Webhook:", item);
                                      try {
                                        const webhookUrl = process.env.NEXT_PUBLIC_N8N_SINGLE_IDEA_URL || "https://n8n.srv881198.hstgr.cloud/webhook/5dd8a76d-f4e4-45b5-808a-c784057d29b1";
                                        const res = await fetch(webhookUrl, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify(item),
                                          cache: "no-store"
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          let ideasArr = [];
                                          if (Array.isArray(data)) {
                                            if (data[0] && Array.isArray(data[0].ideas)) ideasArr = data[0].ideas;
                                            else if (data[0] && data[0].idea) ideasArr = data;
                                            else if (Array.isArray(data[0])) ideasArr = data[0];
                                          } else if (data && Array.isArray(data.ideas)) {
                                            ideasArr = data.ideas;
                                          }
                                          if (ideasArr && ideasArr.length > 0) {
                                            setGeneratedIdeas(prev => ({ ...prev, [item.id]: ideasArr }));
                                            addSbToast("Ideas generated successfully!", "success");
                                          } else {
                                            console.error("Unrecognized JSON format from n8n:", data);
                                            addSbToast("No valid ideas format returned.", "error");
                                          }
                                        } else {
                                          addSbToast("Failed to generate ideas", "error");
                                        }
                                      } catch (err) {
                                        addSbToast("Error fetching ideas", "error");
                                      } finally {
                                        setSentIdeaIds(prev => ({ ...prev, [item.id]: false }));
                                      }
                                    }}
                                    style={{
                                      padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "none",
                                      background: sentIdeaIds[item.id] ? "#38bdf8" : "linear-gradient(135deg, #0284c7, #38bdf8)",
                                      color: "#fff", fontSize: 10, fontWeight: 700,
                                      cursor: sentIdeaIds[item.id] ? "not-allowed" : "pointer",
                                      transition: "all 0.2s", textTransform: "uppercase",
                                      opacity: sentIdeaIds[item.id] ? 0.7 : 1,
                                      boxShadow: sentIdeaIds[item.id] ? "none" : "0 3px 10px rgba(2,132,199,0.4)"
                                    }}
                                  >
                                    {sentIdeaIds[item.id] ? "✨ Generating..." : "✨ Generate an idea"}
                                  </button>
                                </div>
                                <textarea
                                  placeholder="e.g. generate a video with offer and sales ads..."
                                  value={item.idea}
                                  onChange={(e) => updateCreateTabItemField(idx, "idea", e.target.value)}
                                  style={{
                                    width: "100%", minHeight: 80, padding: "12px", borderRadius: "var(--radius-md)",
                                    border: "1.5px solid #bae6fd", background: "#fff",
                                    fontSize: 12, outline: "none", color: "#0369a1", resize: "vertical", fontFamily: "inherit"
                                  }}
                                />
                                {generatedIdeas[item.id] && generatedIdeas[item.id].length > 0 && (
                                  <div style={{
                                    marginTop: 16, display: "flex", flexDirection: "column", gap: 10,
                                    padding: "16px", borderRadius: 12,
                                    border: "1.5px solid #bae6fd",
                                    background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)"
                                  }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.04em" }}>✨ AI Generated Ideas — Click to use</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                                      {generatedIdeas[item.id].map((ideaObj, ideaIndex) => (
                                        <div
                                          key={`${item.id}-${ideaIndex}`}
                                          onClick={() => {
                                            updateCreateTabItemField(idx, "idea", ideaObj.idea);
                                            setGeneratedIdeas(prev => {
                                              const updated = { ...prev };
                                              delete updated[item.id];
                                              return updated;
                                            });
                                          }}
                                          style={{
                                            padding: "13px 16px", borderRadius: 10, border: "1.5px solid #bae6fd",
                                            background: "#fff", cursor: "pointer", fontSize: 12, color: "#0369a1",
                                            transition: "all 0.18s", lineHeight: 1.6, boxShadow: "0 2px 8px rgba(2,132,199,0.07)"
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0284c7"; e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(2,132,199,0.15)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#bae6fd"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(2,132,199,0.07)"; }}
                                        >
                                          {ideaObj.idea}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Visual Style</div>
                                <CustomSelect
                                  value={item.imageStyle || "Bold & Colorful"}
                                  onChange={(v) => updateCreateTabItemField(idx, "imageStyle", v)}
                                  options={VIDEO_STYLES.map(s => ({ value: s, label: s }))}
                                />
                              </div>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Image Description / Prompt</div>
                                  <button
                                    disabled={sentIdeaIds[item.id]}
                                    onClick={async () => {
                                      if (sentIdeaIds[item.id]) return;
                                      setSentIdeaIds(prev => ({ ...prev, [item.id]: true }));
                                      addSbToast(`Generating Image ${idx + 1} ideas via webhook...`);
                                      console.log("Sending to Webhook:", item);
                                      try {
                                        const webhookUrl = process.env.NEXT_PUBLIC_N8N_SINGLE_IDEA_URL || "https://n8n.srv881198.hstgr.cloud/webhook/5dd8a76d-f4e4-45b5-808a-c784057d29b1";
                                        const res = await fetch(webhookUrl, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify(item),
                                          cache: "no-store"
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          let ideasArr = [];
                                          if (Array.isArray(data)) {
                                            if (data[0] && Array.isArray(data[0].ideas)) ideasArr = data[0].ideas;
                                            else if (data[0] && data[0].idea) ideasArr = data;
                                            else if (Array.isArray(data[0])) ideasArr = data[0];
                                          } else if (data && Array.isArray(data.ideas)) {
                                            ideasArr = data.ideas;
                                          }
                                          if (ideasArr && ideasArr.length > 0) {
                                            setGeneratedIdeas(prev => ({ ...prev, [item.id]: ideasArr }));
                                            addSbToast("Ideas generated successfully!", "success");
                                          } else {
                                            console.error("Unrecognized JSON format from n8n:", data);
                                            addSbToast("No valid ideas format returned.", "error");
                                          }
                                        } else {
                                          addSbToast("Failed to generate ideas", "error");
                                        }
                                      } catch (err) {
                                        addSbToast("Error fetching ideas", "error");
                                      } finally {
                                        setSentIdeaIds(prev => ({ ...prev, [item.id]: false }));
                                      }
                                    }}
                                    style={{
                                      padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "none",
                                      background: sentIdeaIds[item.id] ? "#fde68a" : "linear-gradient(135deg, #b45309, #d97706)",
                                      color: "#fff", fontSize: 10, fontWeight: 700,
                                      cursor: sentIdeaIds[item.id] ? "not-allowed" : "pointer",
                                      transition: "all 0.2s", textTransform: "uppercase",
                                      opacity: sentIdeaIds[item.id] ? 0.7 : 1,
                                      boxShadow: sentIdeaIds[item.id] ? "none" : "0 3px 10px rgba(217,119,6,0.4)"
                                    }}
                                  >
                                    {sentIdeaIds[item.id] ? "✨ Generating..." : "✨ Generate an idea"}
                                  </button>
                                </div>
                                <textarea
                                  placeholder="Describe the aesthetic, colors, and subject of the image..."
                                  value={item.idea}
                                  onChange={(e) => updateCreateTabItemField(idx, "idea", e.target.value)}
                                  style={{
                                    width: "100%", minHeight: 80, padding: "12px", borderRadius: "var(--radius-md)",
                                    border: "1.5px solid #fde68a", background: "#fff",
                                    fontSize: 12, outline: "none", color: "#78350f", resize: "vertical", fontFamily: "inherit"
                                  }}
                                />
                                {generatedIdeas[item.id] && generatedIdeas[item.id].length > 0 && (
                                  <div style={{
                                    marginTop: 16, display: "flex", flexDirection: "column", gap: 10,
                                    padding: "16px", borderRadius: 12,
                                    border: "1.5px solid #fde68a",
                                    background: "linear-gradient(135deg, #fffbeb, #fef3c7)"
                                  }}>
                                    <div style={{ fontSize: 11, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.04em" }}>✨ AI Generated Ideas — Click to use</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                                      {generatedIdeas[item.id].map((ideaObj, ideaIndex) => (
                                        <div
                                          key={`${item.id}-img-${ideaIndex}`}
                                          onClick={() => {
                                            updateCreateTabItemField(idx, "idea", ideaObj.idea);
                                            setGeneratedIdeas(prev => {
                                              const updated = { ...prev };
                                              delete updated[item.id];
                                              return updated;
                                            });
                                          }}
                                          style={{
                                            padding: "13px 16px", borderRadius: 10, border: "1.5px solid #fde68a",
                                            background: "#fff", cursor: "pointer", fontSize: 12, color: "#78350f",
                                            transition: "all 0.18s", lineHeight: 1.6, boxShadow: "0 2px 8px rgba(217,119,6,0.07)"
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#d97706"; e.currentTarget.style.background = "#fffbeb"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 18px rgba(217,119,6,0.15)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#fde68a"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(217,119,6,0.07)"; }}
                                        >
                                          {ideaObj.idea}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* ── View Image & Video Prompts button ── */}
                          {adScenesGenerating["__all__"] ? (
                            <div style={{
                              marginTop: 16, padding: "13px 0", display: "flex", alignItems: "center",
                              justifyContent: "center", gap: 8, borderTop: "1.5px solid #e2e8f0",
                              color: isVideo ? "#0284c7" : "#b45309", fontSize: 12, fontWeight: 600,
                            }}>
                              <Spinner size={14} color={isVideo ? "#0284c7" : "#b45309"} />
                              Generating prompts… please wait
                            </div>
                          ) : adScenesMap[item.id]?.length > 0 ? (
                            <button
                              onClick={() => {
                                const scenes = adScenesMap[item.id] || [];
                                setScenesModal({ open: true, scenes, adLabel: `${isVideo ? "Video" : "Image"} ${idx + 1}`, itemId: item.id });
                                setEditedScenes(JSON.parse(JSON.stringify(scenes)));
                              }}
                              style={{
                                marginTop: 16, width: "100%", padding: "13px 0", borderRadius: "var(--radius-md)",
                                border: "none", fontFamily: "inherit", cursor: "pointer",
                                background: doesSlotHaveError(item.id)
                                  ? "linear-gradient(135deg, #dc2626, #ef4444)"
                                  : isVideo ? "linear-gradient(135deg, #0284c7, #38bdf8)" : "linear-gradient(135deg, #b45309, #d97706)",
                                color: "#fff", fontSize: 12, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                boxShadow: doesSlotHaveError(item.id)
                                  ? "0 4px 12px rgba(220,38,38,0.40)"
                                  : isVideo ? "0 4px 12px rgba(2,132,199,0.35)" : "0 4px 12px rgba(217,119,6,0.35)",
                                transition: "transform 0.15s",
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
                            >
                              {doesSlotHaveError(item.id)
                                ? "⚠️ Generation failed — click to fix prompt"
                                : <>🎬 View Image &amp; Video Prompts &nbsp;·&nbsp; {adScenesMap[item.id].length} scenes</>}
                            </button>
                          ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Status Area */}
                  <div style={{ padding: "20px 24px", background: "linear-gradient(135deg, #fffbeb 0%, #f0f9ff 100%)", borderTop: "1.5px solid #bae6fd" }}>
                    {(isStatusPolling || adStatus === "waiting") ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {!workflowStatus?.toLowerCase().includes("completed") && (
                          <div style={{ position: "relative", height: 2, background: "var(--primary-light)", borderRadius: 1, overflow: "hidden", marginBottom: 12 }}>
                            <div className="animate-pulse" style={{
                              position: "absolute", top: 0, left: 0, height: "100%", width: "30%",
                              background: "var(--primary)", borderRadius: 1,
                              animation: "scan 2s linear infinite"
                            }} />
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className={workflowStatus?.toLowerCase().includes("completed") ? "" : "animate-pulse"} style={{ width: 10, height: 10, borderRadius: "50%", background: workflowStatus?.toLowerCase().includes("completed") ? "var(--green)" : "var(--primary)" }} />
                            <SectionTitle style={{ marginBottom: 0 }}>{workflowStatus?.toLowerCase().includes("completed") ? "Workflow Completed" : "Workflow in Progress"}</SectionTitle>
                          </div>
                          {workflowStatus?.toLowerCase().includes("completed") ? (
                            <Badge text="COMPLETED" color="var(--green)" bg="var(--green-light)" />
                          ) : (
                            <Badge text="RUNNING" color="var(--primary)" bg="var(--primary-light)" />
                          )}
                        </div>

                        <div style={{ padding: "14px 18px", borderRadius: "var(--radius-md)", background: "var(--card-bg)", border: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Current Status</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: workflowStatus?.toLowerCase().includes("completed") ? "var(--green)" : "var(--primary)", display: "flex", alignItems: "center", gap: 8 }}>
                            {!workflowStatus?.toLowerCase().includes("completed") && <Spinner size={14} color="var(--primary)" />}
                            {workflowStatus || "Video is Generating..."}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
                            n8n is orchestrating Claude 3.5 and Runway ML. Ad previews will refresh automatically upon completion.
                          </div>

                          {/* Image & Video Generation Progress Bars */}
                          {(() => {
                            const lStatus = workflowStatus?.toLowerCase() || "";

                            // Determine what to show based on status text or if we requested them
                            // Determine what to show based on status text and current configuration
                            const hasBoth = lStatus.includes("image/video");
                            const showImage = createTabAdsConfig.imageCount > 0 && (hasBoth || lStatus.includes("image") || lStatus.includes("triggering"));
                            const showVideo = createTabAdsConfig.videoCount > 0 && (hasBoth || lStatus.includes("video") || lStatus.includes("triggering") || !lStatus);

                            // Determine completion
                            const allDone = lStatus === "completed" || lStatus === "workflow completed";
                            const imgDone = allDone || lStatus.includes("image ad completed") || lStatus.includes("image completed");
                            const vidDone = allDone || lStatus.includes("video ad completed") || lStatus.includes("video completed");

                            if (!workflowStatus || workflowStatus === "waiting") return null;

                            return (
                              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
                                {showImage && (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontWeight: 600, marginBottom: 6 }}>
                                      <span>{imgDone ? "Image Generation Completed" : "Generating Image (~1:30)"}</span>
                                      <span>{imgDone ? "100%" : ""}</span>
                                    </div>
                                    <div style={{ position: "relative", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                                      <style>{`
                                            @keyframes fillImageGen {
                                              0% { width: 0%; }
                                              100% { width: 98%; }
                                            }
                                          `}</style>
                                      <div
                                        style={{
                                          position: "absolute", top: 0, left: 0, height: "100%",
                                          background: imgDone ? "var(--green)" : "var(--primary)",
                                          borderRadius: 3,
                                          width: imgDone ? "100%" : "0%",
                                          animation: !imgDone ? "fillImageGen 90s linear forwards" : "none",
                                          transition: "width 0.5s ease-out, background 0.5s"
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {showVideo && (
                                  <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-dim)", fontWeight: 600, marginBottom: 6 }}>
                                      <span>{vidDone ? "Video Generation Completed" : "Generating Video (~10:00)"}</span>
                                      <span>{vidDone ? "100%" : ""}</span>
                                    </div>
                                    <div style={{ position: "relative", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                                      <style>{`
                                            @keyframes fillVideoGen {
                                              0% { width: 0%; }
                                              100% { width: 98%; }
                                            }
                                          `}</style>
                                      <div
                                        style={{
                                          position: "absolute", top: 0, left: 0, height: "100%",
                                          background: vidDone ? "var(--green)" : "var(--primary)",
                                          borderRadius: 3,
                                          width: vidDone ? "100%" : "0%",
                                          animation: !vidDone ? "fillVideoGen 600s linear forwards" : "none",
                                          transition: "width 0.5s ease-out, background 0.5s"
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>🚀</span>
                          <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>
                            <b>{createTabAdsConfig.totalAds} Ads</b> ready ({createTabAdsConfig.videoCount}V / {createTabAdsConfig.imageCount}I)
                          </div>
                        </div>

                        {adStatus === "generating" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0284c7", fontSize: 13, fontWeight: 700 }}>
                            <Spinner size={16} color="#0284c7" /> Generating prompts… please wait
                          </div>
                        ) : Object.values(adScenesMap).some(scenes => Array.isArray(scenes) && scenes.length > 0) ? (
                          <button
                            onClick={handleAcceptPrompts}
                            disabled={acceptingPrompts}
                            type="button"
                            className="w-full sm:w-auto"
                            style={{
                              padding: "12px 30px", borderRadius: "var(--radius-lg)", border: "none",
                              background: acceptingPrompts ? "var(--primary-light)" : "linear-gradient(135deg, #22c55e, #16a34a)",
                              color: "#fff",
                              fontSize: 13, fontWeight: 700, cursor: acceptingPrompts ? "not-allowed" : "pointer",
                              fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                              opacity: acceptingPrompts ? 0.7 : 1, transition: "transform 0.15s, box-shadow 0.15s",
                              boxShadow: acceptingPrompts ? "none" : "0 4px 12px rgba(34, 197, 94, 0.3)"
                            }}
                            onMouseEnter={(e) => { if (!acceptingPrompts) e.currentTarget.style.transform = "translateY(-1px)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                          >
                            {acceptingPrompts ? <><Spinner size={14} /> Accepting...</> : "Accept Prompts ✓"}
                          </button>
                        ) : (
                          <button
                            onClick={handleCreateTabTriggerAds}
                            disabled={adStatus === "generating" || adStatus === "waiting" || !analysisData}
                            type="button"
                            className="w-full sm:w-auto"
                            style={{
                              padding: "12px 30px", borderRadius: "var(--radius-lg)", border: "none",
                              background: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "var(--primary-light)" : "linear-gradient(135deg, #0284c7, #0ea5e9)",
                              color: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "var(--primary)" : "#fff",
                              fontSize: 13, fontWeight: 700, cursor: (adStatus === "generating" || !analysisData) ? "not-allowed" : "pointer",
                              fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                              opacity: (adStatus === "generating" || !analysisData) ? 0.7 : 1, transition: "transform 0.15s, box-shadow 0.15s",
                              boxShadow: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "none" : "0 4px 12px rgba(2, 132, 199, 0.3)"
                            }}
                            onMouseEnter={(e) => { if (adStatus !== "generating") e.currentTarget.style.transform = "translateY(-1px)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                          >
                            Confirm &amp; Generate Ads →
                          </button>
                        )}
                      </div>
                    )}

                    {adStatus === "error" && (
                      <div style={{ marginTop: 12, padding: 12, borderRadius: "var(--radius-sm)", background: "var(--red-light)", color: "var(--red-strong)", fontSize: 12, border: "0.5px solid var(--red)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <span><b>Error:</b> {webhookError || "Failed to generate ad prompts."}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAdStatus("idle");
                            setWebhookError("");
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--red-strong)",
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 800,
                            padding: "0 4px",
                            lineHeight: 1
                          }}
                          title="Dismiss Error"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </Card>




          {/* ── FAILED IMAGE PROMPTS PANEL ── */}
          {failedImagePrompts.length > 0 && (
            <div style={{ marginTop: 20, borderRadius: 16, overflow: "hidden", border: "2px solid #ef4444", boxShadow: "0 8px 32px rgba(220,38,38,0.18)" }}>
              {/* Header */}
              <div style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Image Generation Failed</div>
                    <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>
                      {failedImagePrompts.length} prompt{failedImagePrompts.length > 1 ? "s" : ""} violated content policy — edit and resubmit
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setFailedImagePrompts([])}
                  style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 700 }}
                >
                  Dismiss
                </button>
              </div>
              {/* Failed prompt cards */}
              <div style={{ background: "#fff1f2", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {failedImagePrompts.map((fp, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #fca5a5", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: "#ef4444", color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 800 }}>
                          Image #{fp.index + 1}
                        </span>
                        <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>Policy Violation</span>
                      </div>
                      <button
                        onClick={() => setEditingImagePrompt({ open: true, index: fp.index, prompt: fp.prompt, reason: fp.reason })}
                        style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "7px 16px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
                      >
                        ✏️ Edit &amp; Resubmit
                      </button>
                    </div>
                    <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Prompt</div>
                      <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.6, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{fp.prompt}</div>
                    </div>
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🚫</span>
                      <div style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.5 }}><b>Reason: </b>{fp.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AD PREVIEWS ── */}
          {(() => {
            const adIds = [1, 2, 3, 4, 5]; // Mapping to Ad 1-3, Image 1-2
            return (
              <div style={{ marginTop: 24 }}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5" style={{ marginBottom: 12 }}>
                  <SectionTitle style={{ marginBottom: 0 }}>Ad Previews — Dynamic Table</SectionTitle>
                  <button
                    onClick={handleRefreshAdVideos}
                    disabled={adVideosLoading}
                    type="button"
                    style={{
                      display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
                      padding: "10px 24px", borderRadius: "var(--radius-md)",
                      border: "0.5px solid var(--border)", background: "var(--surface)",
                      color: "var(--text)", fontSize: 13, fontWeight: 600,
                      cursor: adVideosLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit", opacity: adVideosLoading ? 0.6 : 1,
                      transition: "all 0.2s",
                      boxShadow: "var(--shadow-sm)"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface)"}
                  >
                    <span style={{
                      display: "inline-block",
                      fontSize: 16,
                      animation: adVideosLoading ? "spin 1s linear infinite" : "none"
                    }}>↻</span>
                    {adVideosLoading ? "Refreshing..." : "Refresh Previews"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* HELPER FOR RENDERING CARDS */}
                  {(() => {
                    const renderCard = (latestEntry) => {
                      const url = latestEntry?.text || "";
                      const isVideo = (latestEntry?.format || "").toLowerCase() === "video";

                      const id = latestEntry?.id || "Unknown";
                      let label = isVideo ? `Video Ad ${id}` : `Image Ad ${id}`;

                      return (
                        <Card key={latestEntry?.id + "_" + latestEntry?.time} style={{ padding: 12, height: "100%" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {label}
                          </div>
                          <div style={{
                            background: "#000",
                            borderRadius: "var(--radius-md)",
                            aspectRatio: "9/16",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)"
                          }}>
                            {latestEntry?.Approved && latestEntry?.Approved !== "false" ? (
                              <div style={{ fontSize: 13, color: "#fff", fontWeight: 700, textAlign: "center", padding: 20 }}>
                                ✓ Approved
                              </div>
                            ) : !url ? (
                              <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: 10 }}>
                                Waiting for {label} link...
                              </div>
                            ) : isVideo ? (
                              <video
                                key={url}
                                src={url}
                                controls
                                autoPlay={false}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            ) : (
                              <img
                                key={url}
                                src={url}
                                alt={label}
                                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              />
                            )}
                          </div>

                          {url && (!latestEntry?.Approved || latestEntry?.Approved === "false") && (
                            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                              <button
                                onClick={() => setSelectedAdForDetails(latestEntry)}
                                style={{
                                  flex: 1, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center",
                                  gap: 6, padding: "8px 0", borderRadius: "var(--radius-md)",
                                  border: "1px solid var(--border)", background: "var(--surface)",
                                  color: "var(--text)", fontSize: 11, fontWeight: 600, transition: "all 0.15s",
                                  cursor: "pointer", fontFamily: "inherit"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface)"}
                              >
                                ↗ Full View
                              </button>
                              <button
                                onClick={() => handleApproveAd(latestEntry)}
                                disabled={latestEntry?.Approved || approvingId === (latestEntry?.id + "_" + latestEntry?.time)}
                                style={{
                                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                  gap: 6, padding: "8px 0", borderRadius: "var(--radius-md)",
                                  border: "none",
                                  background: latestEntry?.Approved ? "var(--green-light)" : "var(--primary)",
                                  color: latestEntry?.Approved ? "var(--green)" : "#fff",
                                  fontSize: 11, fontWeight: 600,
                                  cursor: latestEntry?.Approved ? "default" : "pointer",
                                  opacity: approvingId === (latestEntry?.id + "_" + latestEntry?.time) ? 0.7 : 1,
                                  transition: "all 0.15s"
                                }}
                              >
                                {approvingId === (latestEntry?.id + "_" + latestEntry?.time) ? (
                                  <Spinner size={10} />
                                ) : latestEntry?.Approved ? (
                                  "✓ Approved"
                                ) : (
                                  "✓ Approve"
                                )}
                              </button>
                            </div>
                          )}
                        </Card>
                      );
                    };

                    if (pendingAds.length === 0) {
                      return (
                        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: 14, background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px dashed var(--border)" }}>
                          No pending ads to preview.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 px-0 sm:px-4" style={{
                        maxWidth: "1100px",
                        margin: "0 auto"
                      }}>
                        {pendingAds.map(ad => (
                          <div key={ad.id + "_" + ad.time}>
                            {renderCard(ad)}
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── CUSTOM MEDIA UPLOAD ── */}
                  <div style={{
                    marginTop: 32, padding: 24, borderRadius: "var(--radius-lg)",
                    background: "var(--surface)", border: "2px dashed #000",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12
                  }}>
                    <SectionTitle style={{ marginBottom: 4, fontSize: 16 }}>Or Upload Your Own Media</SectionTitle>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", maxWidth: 400 }}>
                      Skip the AI generation and upload your own video or image. It will go directly to the Approved section.
                    </div>

                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <label style={{
                        padding: "10px 20px", borderRadius: "var(--radius-md)",
                        background: "var(--card-bg)", border: "1px solid var(--border)",
                        color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
                        opacity: customUploadLoading ? 0.6 : 1
                      }}>
                        {customUploadLoading ? (
                          <><Spinner size={14} color="var(--primary)" /> Uploading...</>
                        ) : (
                          <><span>+</span> Choose File to Upload</>
                        )}
                        <input
                          type="file"
                          accept="video/*,image/*"
                          style={{ display: "none" }}
                          disabled={customUploadLoading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setCustomUploadLoading(true);
                            setCustomUploadError("");

                            try {
                              const formData = new FormData();
                              formData.append("file", file);

                              const res = await fetch("/api/upload-ad", { method: "POST", body: formData });
                              let result: any;
                              try { result = await res.json(); } catch { throw new Error(`Upload failed (${res.status})`); }
                              if (!res.ok || result.error) throw new Error(result.error || "Upload failed");

                              const newAd = {
                                id: Date.now(),
                                time: result.time,
                                text: result.publicUrl,
                                format: result.format,
                                Approved: "true"
                              };

                              setAllApprovedAds(prev => [newAd, ...prev]);
                              await fetchAdTableLinks();
                              addSbToast("Media uploaded and approved!", "success");
                            } catch (err: any) {
                              setCustomUploadError(err.message || "Upload failed");
                              console.error(err);
                            } finally {
                              setCustomUploadLoading(false);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      {customUploadError && (
                        <div style={{ fontSize: 12, color: "var(--red-error)" }}>{customUploadError}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          APPROVAL
      ═══════════════════════════════════════════════════════ */}
      {tab === "approval" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <SectionTitle style={{ marginBottom: 0 }}>Ad Approval Queue</SectionTitle>
                {/* Filter pills — left side, next to title */}
                <div style={{ display: "flex", background: "#e2e8f0", borderRadius: 8, padding: 2, gap: 1 }}>
                  {[
                    { value: "all", label: "All" },
                    { value: "video", label: "🎬 Video" },
                    { value: "image", label: "🖼️ Image" },
                  ].map(f => (
                    <button
                      key={f.value}
                      onClick={() => setApprovalFilter(f.value)}
                      style={{
                        padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                        background: approvalFilter === f.value ? "#1e293b" : "transparent",
                        color: approvalFilter === f.value ? "#fff" : "#475569",
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Review and launch your final approved creatives from the database.
              </div>
            </div>
            <div style={{ background: "var(--green-light)", padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--green)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>✓</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", textTransform: "uppercase" }}>Approved</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{allApprovedAds.length}</div>
              </div>
            </div>
          </div>

          {allApprovedAds.length === 0 ? (
            <EmptyState
              title="No ads approved yet"
              sub="Go to the 'Create Ad' tab to preview and approve your generated creatives. Once approved, they will appear here for final launch."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 40, maxWidth: "1200px", margin: "0 auto" }}>
              {(() => {
                const renderApprovalCard = (ad) => {
                  const isVid = (ad.format || "").toLowerCase() === "video";
                  return (
                    <Card key={`${ad.id}_${ad.time}`} style={{ padding: 12, display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Badge
                            text={isVid ? "Video" : "Image"}
                            color={isVid ? "var(--primary)" : "var(--amber)"}
                            bg={isVid ? "var(--primary-light)" : "var(--amber-light)"}
                          />
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                            AD {ad.id}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 500 }}>
                          {new Date(ad.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div style={{
                        background: "#000",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-light)",
                        aspectRatio: "9/16",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        marginBottom: 16,
                        boxShadow: "var(--shadow-sm)"
                      }}>
                        {isVid ? (
                          <video src={ad.text} controls autoPlay={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <img src={ad.text} alt={`Approved Ad ${ad.id}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        )}
                      </div>

                      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        <button
                          onClick={() => setSelectedAdForDetails(ad)}
                          style={{
                            textDecoration: "none", textAlign: "center", fontSize: 11, fontWeight: 700,
                            padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                            color: "var(--text)", background: "var(--surface)", transition: "all 0.15s",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                          onMouseLeave={(e) => e.currentTarget.style.background = "var(--surface)"}
                        >
                          ↗ {typeof window !== "undefined" && window.innerWidth <= 768 ? "Details" : "Full View & Details"}
                        </button>
                        <button
                          onClick={() => {
                            setLaunchAdCandidate(ad);
                            setTab("campaigns");
                          }}
                          style={{
                            border: "none", borderRadius: "var(--radius-md)", padding: "10px",
                            background: "linear-gradient(135deg, var(--primary), #6366f1)",
                            color: "#fff", fontSize: 12, fontWeight: 700,
                            cursor: "pointer", boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                            transition: "transform 0.1s", textAlign: "center"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                          {typeof window !== "undefined" && window.innerWidth <= 768 ? "Launch →" : "Launch to Facebook Ads Manager →"}
                        </button>
                      </div>
                    </Card>
                  );
                };

                const sorted = [...allApprovedAds].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
                const videos = sorted.filter(ad => (ad.format || "").toLowerCase() === "video");
                const images = sorted.filter(ad => (ad.format || "").toLowerCase() !== "video");
                const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

                // Mobile: 2 cols; Desktop: 4 cols
                const gridCols = isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)";
                const gridGap = isMobile ? 10 : 16;

                if (approvalFilter === "video") {
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: gridGap }}>
                      {videos.map(renderApprovalCard)}
                    </div>
                  );
                }
                if (approvalFilter === "image") {
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: gridGap }}>
                      {images.map(renderApprovalCard)}
                    </div>
                  );
                }

                // "All" view
                if (isMobile) {
                  // Mobile: stack videos then images in single column
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      {videos.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>🎬 Videos ({videos.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                            {videos.map(renderApprovalCard)}
                          </div>
                        </div>
                      )}
                      {images.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>🖼️ Images ({images.length})</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                            {images.map(renderApprovalCard)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Desktop: left 2 cols videos | separator | right 2 cols images
                return (
                  <div style={{ display: "flex", gap: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SectionTitle style={{ marginBottom: 12, fontSize: 14 }}>Approved Videos</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                        {videos.map(renderApprovalCard)}
                      </div>
                    </div>
                    <div style={{ width: 2, background: "#0f172a", margin: "0 24px", borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <SectionTitle style={{ marginBottom: 12, fontSize: 14 }}>Approved Images</SectionTitle>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                        {images.map(renderApprovalCard)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          CAMPAIGN SETUP
      ═══════════════════════════════════════════════════════ */}
      {tab === "campaigns" && (
        <CampaignSetup
          selectedId={selectedMetaCampaign?.id}
          selectedAd={launchAdCandidate}
          approvedAds={allApprovedAds}
          onSelect={(campaign) => setSelectedMetaCampaign(campaign)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════
          RUNNING CAMPAIGNS (LIVE META)
      ═══════════════════════════════════════════════════════ */}
      {tab === "live_campaigns" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
            <div>
              <SectionTitle style={{ marginBottom: 4 }}>Running Campaigns</SectionTitle>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Monitor and control your live Meta Ads.
              </div>
            </div>
            <button
              onClick={fetchLiveCampaigns}
              disabled={liveLoading}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
            >
              {liveLoading ? <Spinner size={12} /> : "↻"} Refresh
            </button>
          </div>

          {liveError && (
            <Card style={{ background: "var(--red-light)", border: "1px solid var(--red-strong)" }}>
              <div style={{ color: "var(--red-strong)", fontSize: 14 }}>{liveError}</div>
            </Card>
          )}

          {!liveLoading && liveCampaigns.length === 0 && !liveError && (
            <Card>
              <EmptyState title="No campaigns found" sub="Start a new campaign in the 'Campaign Setup' tab." />
            </Card>
          )}

          {liveCampaigns.map(campaign => (
            <Card key={campaign.id} style={{ padding: 0, overflow: "hidden" }}>
              {/* Campaign Header */}
              <div
                onClick={() => setExpandedCampaigns(prev => {
                  const next = new Set(prev);
                  if (next.has(campaign.id)) next.delete(campaign.id);
                  else next.add(campaign.id);
                  return next;
                })}
                style={{ padding: "14px 16px", background: "var(--surface)", borderBottom: expandedCampaigns.has(campaign.id) ? "1px solid var(--border-light)" : "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 10 }}
              >
                {/* Top row: arrow + name + status */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 16, color: "var(--primary)", transition: "transform 0.2s", transform: expandedCampaigns.has(campaign.id) ? "rotate(90deg)" : "rotate(0deg)", marginTop: 2, flexShrink: 0 }}>▶</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{campaign.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ID: {campaign.id}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{campaign.objective}</div>
                  </div>
                  <Badge
                    text={campaign.effective_status}
                    color={campaign.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                    bg={campaign.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                  />
                </div>
                {/* Bottom row: action buttons */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingLeft: 26 }} onClick={(e) => e.stopPropagation()}>
                  {[
                    { label: "Edit", color: "var(--primary)", border: "var(--primary)", fn: () => handleEditCampaign(campaign.id), disabled: false },
                    { label: "Run", color: "var(--green)", border: "var(--green)", fn: () => handleUpdateStatus(campaign.id, "Campaign", "ACTIVE", "run"), disabled: campaign.effective_status === "ACTIVE" || updatingStatusId === campaign.id },
                    { label: "Pause", color: "var(--amber)", border: "var(--amber)", fn: () => handleUpdateStatus(campaign.id, "Campaign", "PAUSED", "pause"), disabled: campaign.effective_status === "PAUSED" || updatingStatusId === campaign.id },
                    { label: "Delete", color: "var(--red-strong)", border: "var(--red-strong)", fn: () => handleUpdateStatus(campaign.id, "Campaign", null, "delete"), disabled: updatingStatusId === campaign.id },
                  ].map(btn => (
                    <button key={btn.label}
                      onClick={(e) => { e.stopPropagation(); btn.fn(); }}
                      disabled={btn.disabled}
                      style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${btn.border}`, background: "transparent", color: btn.color, fontSize: 11, fontWeight: 700, cursor: btn.disabled ? "default" : "pointer", opacity: btn.disabled ? 0.45 : 1, transition: "all 0.15s" }}
                    >{btn.label}</button>
                  ))}
                </div>
              </div>

              {/* Campaign Body (Ad Sets) */}
              {expandedCampaigns.has(campaign.id) && (
                <div style={{ padding: "10px 20px 20px 40px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {campaign.adsets?.data?.length > 0 ? campaign.adsets.data.map(adset => (
                    <div key={adset.id} style={{ border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                      {/* Ad Set Header */}
                      <div
                        onClick={() => setExpandedAdSets(prev => {
                          const next = new Set(prev);
                          if (next.has(adset.id)) next.delete(adset.id);
                          else next.add(adset.id);
                          return next;
                        })}
                        style={{ padding: "10px 14px", background: "var(--surface)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8 }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, color: "var(--primary)", transition: "transform 0.2s", transform: expandedAdSets.has(adset.id) ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}>▶</span>
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adset.name}</span>
                          <Badge text={adset.effective_status} color={adset.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"} bg={adset.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"} />
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingLeft: 20 }} onClick={(e) => e.stopPropagation()}>
                          {[
                            { label: "Edit", color: "var(--primary)", fn: () => handleEditAdSet(campaign.id, adset.id), disabled: false },
                            { label: "Run", color: "var(--green)", fn: () => handleUpdateStatus(adset.id, "AdSet", "ACTIVE", "run"), disabled: adset.effective_status === "ACTIVE" || updatingStatusId === adset.id },
                            { label: "Pause", color: "var(--amber)", fn: () => handleUpdateStatus(adset.id, "AdSet", "PAUSED", "pause"), disabled: adset.effective_status === "PAUSED" || updatingStatusId === adset.id },
                            { label: "Delete", color: "var(--red-strong)", fn: () => handleUpdateStatus(adset.id, "AdSet", null, "delete"), disabled: updatingStatusId === adset.id },
                          ].map(btn => (
                            <button key={btn.label} onClick={(e) => { e.stopPropagation(); btn.fn(); }} disabled={btn.disabled}
                              style={{ padding: "3px 10px", borderRadius: 20, border: `1px solid ${btn.color}`, background: "transparent", color: btn.color, fontSize: 10, fontWeight: 700, cursor: btn.disabled ? "default" : "pointer", opacity: btn.disabled ? 0.45 : 1 }}
                            >{btn.label}</button>
                          ))}
                        </div>
                      </div>

                      {/* Ad Set Body (Ads) */}
                      {expandedAdSets.has(adset.id) && (
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, background: "var(--card-bg)" }}>
                          {adset.ads?.data?.length > 0 ? adset.ads.data.map(ad => {
                            const insights = ad.insights?.data?.[0] || {};
                            return (
                              <div key={ad.id} style={{ padding: 12, borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border-light)" }}>
                                {/* Ad header: thumbnail + name + status */}
                                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                                  <div style={{ width: 56, height: 56, borderRadius: 8, background: "#000", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border-light)" }}>
                                    {ad.creative?.thumbnail_url
                                      ? <img src={ad.creative.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 18 }}>🎬</div>
                                    }
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{ad.name}</div>
                                      <Badge text={ad.effective_status} color={ad.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"} bg={ad.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"} />
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>ID: {ad.id}</div>
                                  </div>
                                </div>

                                {/* Metrics */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "8px 10px", background: "var(--card-bg)", borderRadius: 8, border: "1px solid var(--border-light)", marginBottom: 10 }}>
                                  {[
                                    { label: "Spend", value: `$${insights.spend || "0.00"}`, color: "var(--text)" },
                                    { label: "CTR", value: `${parseFloat(insights.inline_link_click_ctr || 0).toFixed(2)}%`, color: "var(--primary)" },
                                    { label: "Clicks", value: insights.clicks || "0", color: "var(--text)" },
                                  ].map(m => (
                                    <div key={m.label}>
                                      <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>{m.label}</div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}</div>
                                    </div>
                                  ))}
                                </div>

                                {/* Controls */}
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  {[
                                    { label: "Run", color: "var(--green)", disabled: ad.effective_status === "ACTIVE" || updatingStatusId === ad.id, fn: () => handleUpdateStatus(ad.id, "Ad", "ACTIVE", "run") },
                                    { label: "Pause", color: "var(--amber)", disabled: ad.effective_status === "PAUSED" || updatingStatusId === ad.id, fn: () => handleUpdateStatus(ad.id, "Ad", "PAUSED", "pause") },
                                    { label: "Delete", color: "var(--red-strong)", disabled: updatingStatusId === ad.id, fn: () => handleUpdateStatus(ad.id, "Ad", null, "delete") },
                                  ].map(btn => (
                                    <button key={btn.label} onClick={btn.fn} disabled={btn.disabled}
                                      style={{ padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${btn.color}`, background: "transparent", color: btn.color, fontSize: 11, fontWeight: 700, cursor: btn.disabled ? "default" : "pointer", opacity: btn.disabled ? 0.45 : 1 }}
                                    >{btn.label}</button>
                                  ))}
                                </div>
                              </div>
                            );
                          }) : <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: 10 }}>No ads found in this set.</div>}
                        </div>
                      )}
                    </div>
                  )) : <div style={{ fontSize: 13, color: "var(--text-dim)", padding: 20, textAlign: "center" }}>No ad sets found in this campaign.</div>}
                </div>
              )}
            </Card>
          ))}
          {editModalOpen && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
              <div style={{ background: "var(--surface)", width: 500, maxWidth: "90%", borderRadius: "var(--radius-lg)", padding: 24, display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--shadow-lg)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>Edit {editType}</div>
                  <button onClick={() => setEditModalOpen(false)} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text-muted)" }}>×</button>
                </div>

                {editLoading ? (
                  <div style={{ padding: 40, display: "flex", justifyContent: "center" }}><Spinner size={24} color="var(--primary)" /></div>
                ) : editError ? (
                  <div style={{ padding: 12, background: "var(--red-light)", color: "var(--red-strong)", borderRadius: 8, fontSize: 13 }}>{editError}</div>
                ) : editData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Name</div>
                      <input
                        type="text"
                        value={editData.name || ""}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                      />
                    </div>
                    {editType === "AdSet" && (
                      <>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Daily Budget (in cents)</div>
                          <input
                            type="number"
                            value={editData.daily_budget || ""}
                            onChange={(e) => setEditData({ ...editData, daily_budget: e.target.value })}
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Target Locations (Country Codes, e.g. US, CA)</div>
                          <input
                            type="text"
                            value={(() => {
                              let t = editData.targeting;
                              if (typeof t === 'string') try { t = JSON.parse(t); } catch (e) { t = {}; }
                              return t?.geo_locations?.countries?.join(', ') || "";
                            })()}
                            onChange={(e) => updateTargeting('countries', e.target.value)}
                            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Age Min</div>
                            <input
                              type="number" min="18" max="65"
                              value={(() => {
                                let t = editData.targeting;
                                if (typeof t === 'string') try { t = JSON.parse(t); } catch (e) { t = {}; }
                                return t?.age_min || 18;
                              })()}
                              onChange={(e) => updateTargeting('age_min', e.target.value)}
                              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Age Max</div>
                            <input
                              type="number" min="18" max="65"
                              value={(() => {
                                let t = editData.targeting;
                                if (typeof t === 'string') try { t = JSON.parse(t); } catch (e) { t = {}; }
                                return t?.age_max || 65;
                              })()}
                              onChange={(e) => updateTargeting('age_max', e.target.value)}
                              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>Gender</div>
                            <select
                              value={(() => {
                                let t = editData.targeting;
                                if (typeof t === 'string') try { t = JSON.parse(t); } catch (e) { t = {}; }
                                return t?.genders?.[0] || '0';
                              })()}
                              onChange={(e) => updateTargeting('gender', e.target.value)}
                              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                            >
                              <option value="0">All</option>
                              <option value="1">Male</option>
                              <option value="2">Female</option>
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>End Date (Optional)</div>
                            <input
                              type="datetime-local"
                              value={editData.end_time ? new Date(editData.end_time).toISOString().slice(0, 16) : ""}
                              onChange={(e) => {
                                const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                setEditData({ ...editData, end_time: newDate });
                              }}
                              style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)", background: "var(--card-bg)", color: "var(--text)", outline: "none", fontSize: 14 }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button
                        onClick={() => setEditModalOpen(false)}
                        style={{ flex: 1, padding: 12, borderRadius: 8, background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", fontWeight: 600, color: "var(--text)" }}
                      >Cancel</button>
                      <button
                        onClick={saveEdit}
                        disabled={editSaving}
                        style={{ flex: 1, padding: 12, borderRadius: 8, background: "var(--primary)", border: "none", cursor: editSaving ? "default" : "pointer", fontWeight: 600, color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", gap: 8, opacity: editSaving ? 0.7 : 1 }}
                      >
                        {editSaving ? <Spinner size={16} /> : "Save Changes"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}



      {/* ═══════════════════════════════════════════════════════
          REPORTS — Meta Ads Performance Dashboard
      ═══════════════════════════════════════════════════════ */}
      {tab === "reports" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 40, paddingTop: 8 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ marginBottom: 10 }}>
            <div>
              <SectionTitle style={{ marginBottom: 4 }}>Meta Ads Performance</SectionTitle>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Real-time metrics and campaign performance directly from your Meta Ad Account.
              </div>
            </div>
            <button
              onClick={fetchMetaInsights}
              disabled={metaReportsLoading}
              style={{
                padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--border)",
                background: "#fff", cursor: metaReportsLoading ? "not-allowed" : "pointer",
                fontSize: 13, display: "flex", alignItems: "center", gap: 8,
                opacity: metaReportsLoading ? 0.6 : 1, transition: "all 0.2s"
              }}
            >
              {metaReportsLoading ? <Spinner size={12} /> : "↻"} Refresh Data
            </button>
          </div>

          {metaReportsError && (
            <Card style={{ background: "var(--red-light)", border: "1px solid var(--red-strong)" }}>
              <div style={{ color: "var(--red-strong)", fontSize: 14 }}>{metaReportsError}</div>
            </Card>
          )}

          {!metaInsights && !metaReportsLoading && !metaReportsError && (
            <Card>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Ready to load Meta Insights</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Sync your live Facebook ad metrics into the dashboard.</div>
                <button
                  onClick={fetchMetaInsights}
                  style={{
                    padding: "10px 24px", borderRadius: "var(--radius-md)", border: "none",
                    background: "var(--primary)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)"
                  }}
                >
                  Load Performance Data
                </button>
              </div>
            </Card>
          )}

          {metaReportsLoading && !metaInsights && (
            <Card>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 16 }}>
                <Spinner size={32} color="var(--primary)" />
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--primary)" }}>Connecting to Meta Graph API...</div>
              </div>
            </Card>
          )}

          {metaInsights && (
            <>
              {/* Account Level KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-3">
                <MetricCard
                  label="Total Spend"
                  value={`$${parseFloat(metaInsights.spend || 0).toFixed(2)}`}
                  sub="All Time"
                  color="var(--blue)" bg="var(--blue-light)"
                />
                <MetricCard
                  label="Impressions"
                  value={parseFloat(metaInsights.impressions || "0").toLocaleString()}
                  sub={`Reach: ${parseFloat(metaInsights.reach || "0").toLocaleString()}`}
                  color="var(--primary)" bg="var(--primary-light)"
                />
                <MetricCard
                  label="Link Clicks"
                  value={parseFloat(metaInsights.linkClicks || "0").toLocaleString()}
                  sub={`CTR: ${parseFloat(metaInsights.inline_link_click_ctr || 0).toFixed(2)}%`}
                  color="var(--amber)" bg="var(--amber-light)"
                />
                <MetricCard
                  label="Conversions"
                  value={parseFloat(metaInsights.leads || "0").toLocaleString()}
                  sub="Leads/Responses"
                  color="var(--green)" bg="var(--green-light)"
                />
              </div>

              {/* Campaign Breakdown */}
              <Card style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", background: "var(--surface)", borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Campaign Breakdown</span>
                </div>

                {metaCampaignInsights.length === 0 ? (
                  <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                    No campaigns found
                  </div>
                ) : typeof window !== "undefined" && window.innerWidth <= 768 ? (
                  /* ── MOBILE: card list ── */
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px" }}>
                    {metaCampaignInsights.map((c: any) => {
                      const ins = c.insights || {};
                      const isActive = c.effective_status === "ACTIVE";
                      return (
                        <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                          {/* Card header */}
                          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                            </div>
                            <div style={{ flexShrink: 0, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, background: isActive ? "#f0fdf4" : "#fffbeb", color: isActive ? "#16a34a" : "#d97706", border: `1px solid ${isActive ? "#86efac" : "#fde68a"}` }}>
                              {c.effective_status}
                            </div>
                          </div>
                          {/* Metrics */}
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "12px 14px", gap: 6 }}>
                            {[
                              { label: "Spend", value: `$${parseFloat(ins.spend || 0).toFixed(2)}`, color: "#0f172a" },
                              { label: "Reach", value: parseFloat(ins.impressions || "0").toLocaleString(), color: "#0f172a" },
                              { label: "CTR", value: `${parseFloat(ins.inline_link_click_ctr || 0).toFixed(2)}%`, color: "#2563eb" },
                              { label: "Leads", value: parseFloat(ins.leads || "0").toLocaleString(), color: "#16a34a" },
                            ].map(m => (
                              <div key={m.label} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{m.label}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: m.color }}>{m.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                      <thead>
                        <tr style={{ background: "var(--card-bg)" }}>
                          <th style={{ padding: "12px 20px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>Campaign</th>
                          <th style={{ padding: "12px 20px", textAlign: "left", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>Status</th>
                          <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>Spend</th>
                          <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>Impr.</th>
                          <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>CTR</th>
                          <th style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>Leads</th>
                          <th style={{ padding: "12px 20px", textAlign: "center", fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)", fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metaCampaignInsights.map(c => {
                          const ins = c.insights || {};
                          return (
                            <tr key={c.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                              <td style={{ padding: "16px 20px" }}>
                                <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>ID: {c.id}</div>
                              </td>
                              <td style={{ padding: "16px 20px" }}>
                                <Badge
                                  text={c.effective_status}
                                  color={c.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                                  bg={c.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                                />
                              </td>
                              <td style={{ padding: "16px 20px", textAlign: "right", fontWeight: 600 }}>
                                ${parseFloat(ins.spend || 0).toFixed(2)}
                              </td>
                              <td style={{ padding: "16px 20px", textAlign: "right" }}>
                                {parseFloat(ins.impressions || "0").toLocaleString()}
                              </td>
                              <td style={{ padding: "16px 20px", textAlign: "right", color: "var(--primary)", fontWeight: 600 }}>
                                {parseFloat(ins.inline_link_click_ctr || 0).toFixed(2)}%
                              </td>
                              <td style={{ padding: "16px 20px", textAlign: "right", fontWeight: 600 }}>
                                {parseFloat(ins.leads || "0").toLocaleString()}
                              </td>
                              <td style={{ padding: "16px 20px", textAlign: "center" }}>
                                <button
                                  onClick={() => setSelectedCampaignForReports(c)}
                                  style={{
                                    padding: "6px 12px", borderRadius: "10px", border: "1px solid var(--border)",
                                    background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 500,
                                    color: "var(--primary)", transition: "all 0.15s"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--primary-light)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}  {/* end desktop table / mobile cards */}
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── REPORTS AD DETAILS MODAL ── */}
      {selectedCampaignForReports && (() => {
        const c = selectedCampaignForReports;
        let allAds = [];
        if (c.adsets && c.adsets.length > 0) {
          c.adsets.forEach(adset => {
            if (adset.ads && adset.ads.length > 0) {
              allAds.push(...adset.ads);
            }
          });
        }

        return (
          <div
            onClick={() => setSelectedCampaignForReports(null)}
            className="animate-in fade-in duration-300"
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="animate-scale-in"
              style={{
                width: "100%", maxWidth: 900, maxHeight: "85vh",
                background: "var(--card-bg)", border: "0.5px solid var(--border)",
                borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
                display: "flex", flexDirection: "column", overflow: "hidden"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Campaign Creatives & Breakdown</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    {c.name} • {allAds.length} attached creative{allAds.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCampaignForReports(null)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)",
                    background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, transition: "background 0.15s"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
                >✕</button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                {allAds.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>No ad creatives found for this campaign.</div>
                  </div>
                ) : (
                  allAds.map(ad => {
                    const ins = ad.insights || {};
                    const thumbUrl = ad.creative?.thumbnail_url || null;
                    return (
                      <div key={ad.id} style={{
                        display: "flex", gap: 16, background: "var(--surface)", border: "1px solid var(--border-light)",
                        borderRadius: "var(--radius-md)", padding: 16, alignItems: "center"
                      }}>
                        <div style={{
                          width: 100, height: 100, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                          background: "var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0
                        }}>
                          {thumbUrl ? (
                            <img src={thumbUrl} alt="Ad Thumbnail" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ fontSize: 24 }}>🎬</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}>{ad.name}</div>
                            <Badge
                              text={ad.effective_status}
                              color={ad.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                              bg={ad.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                            />
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Ad ID: {ad.id}</div>

                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Spend</div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>${parseFloat(ins.spend || 0).toFixed(2)}</div>
                            </div>
                            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Impressions</div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{parseFloat(ins.impressions || "0").toLocaleString()}</div>
                            </div>
                            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>CTR</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{parseFloat(ins.inline_link_click_ctr || 0).toFixed(2)}%</div>
                            </div>
                            <div style={{ background: "#fff", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>Leads</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--green)" }}>{parseFloat(ins.leads || "0").toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════
          SOCIAL-DASH — Creator Studio Section
      ═══════════════════════════════════════════════════════ */}
      {tab === "social-dash" && (
        <div className="animate-fade-in sd-tab-wrapper">
          <SocialDash />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PROFILE SECTION
      ═══════════════════════════════════════════════════════ */}
      {tab === "profile" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200, margin: "0 auto", padding: "8px 0", width: "100%", boxSizing: "border-box" }}>

          {/* Page Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ClipboardList size={28} color="#3B82F6" />
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F172A", margin: 0 }}>Brand & ICP Configuration</h1>
              <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0 0" }}>Define your brand strategy and ideal customer profile</p>
            </div>
            {!isEditingProfile ? (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", color: "#2563EB", border: "1.5px solid #2563EB", borderRadius: 12, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                ✏️ Edit
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setIsEditingProfile(false)}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", color: "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#2563EB", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontWeight: 600, fontSize: 13, cursor: isSavingProfile ? "not-allowed" : "pointer", opacity: isSavingProfile ? 0.7 : 1, whiteSpace: "nowrap", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}
                >
                  {isSavingProfile ? <Spinner size={16} color="#fff" /> : <span>💾 Save</span>}
                </button>
              </div>
            )}
          </div>

          {/* Brand Strategy Section */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Megaphone size={20} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2563EB" }}>Brand Strategy</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Define your brand positioning and core messaging</div>
              </div>
            </div>
            {[
              { key: "productsAndServices", label: "Products & Services", placeholder: "Hair Transplant, Dental Implants, Rhinoplasty", iconEl: <Tag size={16} color="#059669" />, iconBg: "#ECFDF5" },
              { key: "valueProposition", label: "Value Proposition", placeholder: 'Why choose you — the core unique benefit (e.g., "50% cheaper than Europe, same quality")', iconEl: <Gem size={16} color="#0D9488" />, iconBg: "#F0FDFA" },
              { key: "brandVoice", label: "Brand Voice", placeholder: "Tone of all content (e.g., Trustworthy, Empathetic, Professional, Action-oriented)", iconEl: <MessageSquare size={16} color="#7C3AED" />, iconBg: "#F5F3FF" },
              { key: "positioning", label: "Positioning", placeholder: 'Market placement (e.g., "Premium affordable medical tourism for Europeans")', iconEl: <Target size={16} color="#EA580C" />, iconBg: "#FFF7ED" },
              { key: "competitors", label: "Competitors", placeholder: "Competing clinics/brands to benchmark against", iconEl: <Users size={16} color="#DB2777" />, iconBg: "#FDF2F8" },
              { key: "painPoints", label: "Pain Points", placeholder: 'Core customer problems your service solves (e.g., "High costs at home", "Hair loss confidence")', iconEl: <AlertTriangle size={16} color="#D97706" />, iconBg: "#FFFBEB" },
            ].map((f, i, arr) => (
              <div key={f.key} className="profile-field-row" style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: f.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {f.iconEl}
                  </div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{f.label}</label>
                </div>
                <textarea
                  value={profileData[f.key]}
                  onChange={(e) => setProfileData({...profileData, [f.key]: e.target.value})}
                  placeholder={f.placeholder}
                  rows={2}
                  disabled={!isEditingProfile}
                  style={{ width: "100%", padding: "10px 14px", fontSize: 13, border: `1.5px solid ${isEditingProfile ? "#93C5FD" : "#E2E8F0"}`, borderRadius: 12, background: isEditingProfile ? "#fff" : "#F8FAFC", color: "#334155", outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", cursor: isEditingProfile ? "text" : "default" }}
                />
              </div>
            ))}
          </div>

          {/* ICP Fields Section */}
          <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Users size={20} color="#2563EB" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2563EB" }}>ICP Fields (Separate Per Workflow)</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>Define your ideal customer profile for targeted communication</div>
              </div>
            </div>
            {[
              { key: "icpMetaAds", label: "ICP - Meta Ads", placeholder: 'Audience for paid ads — age, gender, interests, behaviors (e.g., "Males 35-55, UK/Canada, interested in hair loss solutions")', iconEl: <LayoutGrid size={16} color="#059669" />, iconBg: "#ECFDF5" },
              { key: "icpNewsletter", label: "ICP - Newsletter", placeholder: "Subscriber profile — who reads your emails, what stage of journey they're in (e.g., \"Already aware of medical tourism, comparing options, needs trust-building\")", iconEl: <Mail size={16} color="#7C3AED" />, iconBg: "#F5F3FF" },
              { key: "icpOutreach", label: "ICP - Outreach", placeholder: 'Cold lead profile — job title, business type, location for scraping (e.g., "Clinic owners in UAE, Real Estate agents in Dubai")', iconEl: <Send size={16} color="#2563EB" />, iconBg: "#EFF6FF" },
            ].map((f, i, arr) => (
              <div key={f.key} className="profile-field-row" style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: f.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {f.iconEl}
                  </div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{f.label}</label>
                </div>
                <textarea
                  value={profileData[f.key]}
                  onChange={(e) => setProfileData({...profileData, [f.key]: e.target.value})}
                  placeholder={f.placeholder}
                  rows={2}
                  disabled={!isEditingProfile}
                  style={{ width: "100%", padding: "10px 14px", fontSize: 13, border: `1.5px solid ${isEditingProfile ? "#93C5FD" : "#E2E8F0"}`, borderRadius: 12, background: isEditingProfile ? "#fff" : "#F8FAFC", color: "#334155", outline: "none", resize: "none", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", cursor: isEditingProfile ? "text" : "default" }}
                />
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
            <Info size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#64748B" }}>Use this template to maintain consistency across all marketing and communication workflows.</span>
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          AD DETAILS MODAL (POP-UP)
      ═══════════════════════════════════════════════════════ */}
      {selectedAdForDetails && (() => {
        // Reactive lookup: ensure modal status stays in sync with state updates
        const adId = selectedAdForDetails.id;
        const adTime = selectedAdForDetails.time;

        const currentAdInCreate = adTableLinks[adId];
        const currentAdInApproved = allApprovedAds.find(x => x.id === adId && x.time === adTime);

        // Prioritize live status from state
        const ad = (currentAdInCreate?.time === adTime ? currentAdInCreate : null)
          || currentAdInApproved
          || selectedAdForDetails;

        let jsonData: any = {};
        try {
          const raw = ad["json data"];
          jsonData = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
        } catch (e) { console.error("JSON parse error:", e); }

        const isVid = (ad.format || "").toLowerCase() === "video";
        const isMobileModal = typeof window !== "undefined" && window.innerWidth <= 768;

        return (
          <div
            className="animate-in fade-in duration-300"
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.85)", zIndex: 2000,
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
              backdropFilter: "blur(6px)"
            }}
            onClick={() => { setSelectedAdForDetails(null); setIsEditingAd(false); setIsRetryingAd(false); setRetryPrompt(""); }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", width: "100%", maxWidth: isMobileModal ? "100%" : 860,
                borderRadius: isMobileModal ? 16 : 20, overflow: "hidden", display: "flex",
                flexDirection: "column", maxHeight: "94vh",
                boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
                border: "1px solid #e2e8f0",
              }}
            >
              {/* ── Modal Header ── */}
              <div style={{ padding: isMobileModal ? "12px 16px" : "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", background: isVid ? "#eff6ff" : "#fffbeb", color: isVid ? "#1d4ed8" : "#b45309", border: `1px solid ${isVid ? "#bfdbfe" : "#fde68a"}` }}>
                    {isVid ? "🎬 Video" : "🖼️ Image"}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>Ad ID: <span style={{ fontFamily: "monospace", color: "#475569" }}>{ad.id}</span></div>
                  {!isMobileModal && <div style={{ fontSize: 11, color: "#94a3b8" }}>· {new Date(ad.time).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!isEditingAd && !isRetryingAd && (
                    <button
                      onClick={() => {
                        setIsEditingAd(true);
                        const firstAd = jsonData.ad || jsonData.ads?.[0] || {};
                        setEditingAdData({
                          campaignName: jsonData.campaign?.name || "Untitled Campaign",
                          adName: firstAd.name || "Untitled Ad",
                          headline: firstAd.headline || "No headline provided.",
                          primaryText: firstAd.primary_text || "",
                          ctaType: firstAd.call_to_action_type || "WATCH_MORE",
                          linkData: jsonData.link_data || ad.text || ""
                        });
                      }}
                      style={{ padding: "7px 16px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                    >
                      ✎ Edit
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedAdForDetails(null); setIsEditingAd(false); setIsRetryingAd(false); setRetryPrompt(""); }}
                    style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #e2e8f0", background: "#fff", fontSize: 18, cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* ── Modal Body ── */}
              <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, flexDirection: isMobileModal ? "column" : "row" }}>
                {/* Media Panel */}
                <div style={{
                  width: isMobileModal ? "100%" : "42%",
                  height: isMobileModal ? 240 : "auto",
                  flexShrink: 0, background: "#0f172a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRight: isMobileModal ? "none" : "1px solid #1e293b",
                  borderBottom: isMobileModal ? "1px solid #1e293b" : "none",
                }}>
                  {isVid ? (
                    <video src={ad.text} controls style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: isMobileModal ? 240 : "80vh" }} />
                  ) : (
                    <img src={ad.text} alt="Ad" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: isMobileModal ? 240 : "80vh" }} />
                  )}
                </div>

                {/* Info Panel */}
                <div style={{ flex: 1, padding: isMobileModal ? "16px" : "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: isMobileModal ? 14 : 20 }}>

                  {/* Campaign & Ad Name */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobileModal ? "1fr" : "1fr 1fr", gap: isMobileModal ? 10 : 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Campaign Name</div>
                      {isEditingAd ? (
                        <input value={editingAdData.campaignName} onChange={(e) => setEditingAdData({ ...editingAdData, campaignName: e.target.value })}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #2563eb", background: "#fff", fontSize: 13, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{jsonData.campaign?.name || "Untitled Campaign"}</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Ad Name</div>
                      {isEditingAd ? (
                        <input value={editingAdData.adName} onChange={(e) => setEditingAdData({ ...editingAdData, adName: e.target.value })}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #2563eb", background: "#fff", fontSize: 13, fontWeight: 600, outline: "none", boxSizing: "border-box" }} />
                      ) : (
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{jsonData.ad?.name || jsonData.ads?.[0]?.name || "Untitled Ad"}</div>
                      )}
                    </div>
                  </div>

                  {/* Headline */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Ad Headline</div>
                    {isEditingAd ? (
                      <textarea value={editingAdData.headline} onChange={(e) => setEditingAdData({ ...editingAdData, headline: e.target.value })}
                        style={{ width: "100%", minHeight: 72, padding: "10px 12px", borderRadius: 9, border: "1.5px solid #2563eb", background: "#fff", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", lineHeight: 1.6, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                        {jsonData.ad?.headline || jsonData.ads?.[0]?.headline || jsonData.description || "No headline provided."}
                      </div>
                    )}
                  </div>

                  {/* Primary Text */}
                  {(isEditingAd || jsonData.ad?.primary_text || jsonData.ads?.[0]?.primary_text) && (
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Primary Text</div>
                      {isEditingAd ? (
                        <textarea
                          value={editingAdData.primaryText || ""}
                          onChange={(e) => setEditingAdData({ ...editingAdData, primaryText: e.target.value })}
                          rows={4}
                          style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #2563eb", background: "#fff", fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                        />
                      ) : (
                        <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, padding: "12px 14px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                          {jsonData.ad?.primary_text || jsonData.ads?.[0]?.primary_text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CTA + Link */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobileModal ? "1fr" : "1fr 1fr", gap: isMobileModal ? 10 : 16 }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Call to Action</div>
                      {isEditingAd ? (
                        <select value={editingAdData.ctaType} onChange={(e) => {
                          const newCta = e.target.value;
                          const suggestions: Record<string, string> = { WHATSAPP_MESSAGE: "+10000000000", CONTACT_US: "https://togahh.com/contact", MESSAGE_PAGE: "https://m.me/togahh" };
                          setEditingAdData({ ...editingAdData, ctaType: newCta, linkData: suggestions[newCta] || "https://togahh.com/" });
                        }} style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #2563eb", background: "#fff", fontSize: 13, fontWeight: 600, outline: "none" }}>
                          <option value="WATCH_MORE">Watch More</option>
                          <option value="LEARN_MORE">Learn More</option>
                          <option value="BOOK_NOW">Book Now</option>
                          <option value="SHOP_NOW">Shop Now</option>
                          <option value="SIGN_UP">Sign Up</option>
                          <option value="CONTACT_US">Contact Us</option>
                          <option value="APPLY_NOW">Apply Now</option>
                          <option value="GET_OFFER">Get Offer</option>
                          <option value="WHATSAPP_MESSAGE">WhatsApp</option>
                          <option value="MESSAGE_PAGE">Message Page</option>
                        </select>
                      ) : (
                        <div style={{ display: "inline-flex", alignItems: "center", padding: "6px 14px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 20, fontSize: 12, fontWeight: 700, border: "1px solid #bfdbfe" }}>
                          {(jsonData.ad?.call_to_action_type || jsonData.ads?.[0]?.call_to_action_type || "WATCH_MORE").replace(/_/g, " ")}
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Destination URL</div>
                      {isEditingAd ? (
                        <input value={editingAdData.linkData} onChange={(e) => setEditingAdData({ ...editingAdData, linkData: e.target.value })}
                          style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #2563eb", background: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                      ) : (
                        <a href={jsonData.link_data || jsonData.ad?.website_url || ad.text} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                          {jsonData.ad?.website_url || jsonData.link_data ? (jsonData.ad?.website_url || jsonData.link_data) : "View media ↗"}
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: "auto", paddingTop: 20, borderTop: "1px solid var(--border-light)", display: "flex", gap: 12 }}>
                    {isEditingAd ? (
                      <>
                        <button
                          onClick={() => setIsEditingAd(false)}
                          style={{
                            flex: 1, padding: "12px", background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)", color: "var(--text)", fontWeight: 600, fontSize: 13, cursor: "pointer"
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdits(ad)}
                          disabled={isSavingAd}
                          style={{
                            flex: 1, padding: "12px", background: "var(--primary)", border: "none",
                            borderRadius: "var(--radius-md)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer"
                          }}
                        >
                          {isSavingAd ? <Spinner size={12} /> : "Save Changes"}
                        </button>
                      </>
                    ) : (
                      <>
                        <a
                          href={ad.text}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1, textDecoration: "none", textAlign: "center", padding: "12px",
                            background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)", color: "var(--text)", fontWeight: 600, fontSize: 13
                          }}
                        >
                          Download Media
                        </a>
                        <button
                          style={{
                            flex: 1, padding: "12px",
                            background: ad.Approved ? "var(--green-light)" : "var(--primary)",
                            border: "none",
                            borderRadius: "var(--radius-md)",
                            color: ad.Approved ? "var(--green)" : "#fff",
                            fontWeight: 700, fontSize: 13,
                            cursor: ad.Approved ? "default" : "pointer",
                            opacity: approvingId === (ad.id + "_" + ad.time) ? 0.7 : 1,
                            transition: "all 0.2s"
                          }}
                          disabled={ad.Approved === "true" || ad.Approved === true || approvingId === (ad.id + "_" + ad.time)}
                          onClick={async () => {
                            await handleApproveAd(ad);
                          }}
                        >
                          {approvingId === (ad.id + "_" + ad.time) ? (
                            <Spinner size={12} />
                          ) : ad.Approved ? (
                            "✓ Approved"
                          ) : (
                            "✓ Approve Ad"
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notifications */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {sbToasts.map((t) => (
          <div key={t.id} className="animate-toast" style={{
            minWidth: 280, padding: "14px 20px", borderRadius: "var(--radius-md)", background: "#fff",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            border: `1px solid ${t.type === "error" ? "var(--red-error)" : "var(--primary)"}`,
            display: "flex", alignItems: "center", gap: 12, borderLeft: `4px solid ${t.type === "error" ? "var(--red-error)" : "var(--primary)"}`
          }}>
            <span style={{ fontSize: 18 }}>{t.type === "error" ? "⚠️" : "✨"}</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                {t.type === "error" ? "Error" : "Success"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-body)" }}>{t.message}</div>
            </div>
            <button
              onClick={() => setSbToasts(prev => prev.filter(toast => toast.id !== t.id))}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 16 }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* ── Scenes Prompt Modal ── */}
      {scenesModal.open && (() => {
        // Determine which scenes inside this modal are flagged as failed
        const modalFailures = failedPrompts.filter((fail) =>
          editedScenes.some((scene: any) => {
            const scenario = (scene.video_scenario || "").trim();
            const failPrompt = (fail.prompt || "").trim();
            return (
              (scenario && failPrompt.length > 10 && (failPrompt.includes(scenario.slice(0, 60)) || scenario.includes(failPrompt.slice(0, 60)))) ||
              fail.taskId === scene.taskId
            );
          })
        );
        const hasFailuresInModal = modalFailures.length > 0;
        const headerBg = hasFailuresInModal
          ? "linear-gradient(135deg, #dc2626, #ef4444)"
          : "linear-gradient(135deg, #0284c7, #0ea5e9)";

        return (
        <div
          onClick={() => {
            if (hasUnsavedChanges) {
              addSbToast("You have unsaved changes. Click \"Save Changes\" before closing.", "error");
              return;
            }
            setHasUnsavedChanges(false);
            setScenesModal({ open: false, scenes: [], adLabel: "", itemId: null });
          }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 18, width: "100%", maxWidth: 980,
              maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column",
              boxShadow: hasFailuresInModal ? "0 32px 80px rgba(220,38,38,0.35)" : "0 32px 80px rgba(0,0,0,0.35)",
              border: hasFailuresInModal ? "2px solid #ef4444" : "none",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: headerBg,
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{hasFailuresInModal ? "⚠️" : "🎬"}</span>
                {scenesModal.adLabel} — Image &amp; Video Prompts
                <span style={{ fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                  {editedScenes.length} scenes
                </span>
                {hasFailuresInModal && (
                  <span style={{ fontSize: 10, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: 20, color: "#fff", fontWeight: 700 }}>
                    {modalFailures.length} FAILED
                  </span>
                )}
                {!hasFailuresInModal && (
                  <span style={{ fontSize: 10, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 20, color: "#e0f2fe" }}>
                    ✏️ Editable
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {/* Save button */}
                <button
                  onClick={() => {
                    if (scenesModal.itemId) {
                      setAdScenesMap(prev => {
                        const updated = { ...prev };
                        Object.keys(updated).forEach(k => {
                          if (updated[k] === prev[scenesModal.itemId] || k === String(scenesModal.itemId)) {
                            updated[k] = editedScenes;
                          }
                        });
                        return updated;
                      });
                    }
                    setHasUnsavedChanges(false);
                    setScenesModal({ open: false, scenes: [], adLabel: "", itemId: null });
                  }}
                  style={{
                    background: "#fff", border: "none",
                    color: hasFailuresInModal ? "#dc2626" : "#0284c7",
                    borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 800,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >{hasUnsavedChanges ? "💾 Save Changes *" : "✓ Save Changes"}</button>
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      addSbToast("You have unsaved changes. Click \"Save Changes\" before closing.", "error");
                      return;
                    }
                    setHasUnsavedChanges(false);
                    setScenesModal({ open: false, scenes: [], adLabel: "", itemId: null });
                  }}
                  style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
                >✕ Close</button>
              </div>
            </div>

            {/* ── Failure Warning Banner ── */}
            {hasFailuresInModal && (
              <div style={{
                background: "#fef2f2", borderBottom: "2px solid #fecaca",
                padding: "12px 24px", display: "flex", flexDirection: "column", gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "#dc2626" }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  {modalFailures.length} scene(s) failed to generate. Edit the highlighted video scenario prompt and save.
                </div>
                {modalFailures.map((fail, fi) => (
                  <div key={fi} style={{
                    background: "#fff", border: "1px solid #fecaca", borderRadius: 8,
                    padding: "8px 14px", fontSize: 11, color: "#991b1b", lineHeight: 1.6
                  }}>
                    <span style={{ fontWeight: 700 }}>Error:</span> {fail.failMsg}
                  </div>
                ))}
              </div>
            )}

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 1fr", padding: "10px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>#</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em", paddingRight: 16 }}>🖼️ Image Prompt</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 16 }}>🎬 Video Scenario</div>
            </div>

            {/* Editable scenes rows */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {editedScenes.map((scene: any, i: number) => {
                // Check if this specific scene is a failed one
                const sceneIsFailed = failedPrompts.some((fail) => {
                  const scenario = (scene.video_scenario || "").trim();
                  const failPrompt = (fail.prompt || "").trim();
                  return (
                    (scenario && failPrompt.length > 10 && (failPrompt.includes(scenario.slice(0, 60)) || scenario.includes(failPrompt.slice(0, 60)))) ||
                    fail.taskId === scene.taskId
                  );
                });
                const sceneFailMsg = sceneIsFailed
                  ? (failedPrompts.find((fail) => {
                      const scenario = (scene.video_scenario || "").trim();
                      const failPrompt = (fail.prompt || "").trim();
                      return (scenario && failPrompt.length > 10 && (failPrompt.includes(scenario.slice(0, 60)) || scenario.includes(failPrompt.slice(0, 60)))) || fail.taskId === scene.taskId;
                    })?.failMsg || "Generation failed.")
                  : "";

                return (
                  <div key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    {/* Failed scene warning sub-header */}
                    {sceneIsFailed && (
                      <div style={{
                        padding: "6px 20px", background: "#fef2f2", borderBottom: "1px solid #fecaca",
                        fontSize: 11, fontWeight: 700, color: "#dc2626",
                        display: "flex", alignItems: "center", gap: 6
                      }}>
                        <span>⚠️ Scene {scene.scene} failed:</span>
                        <span style={{ fontWeight: 500 }}>{sceneFailMsg}</span>
                      </div>
                    )}
                    <div style={{
                      display: "grid", gridTemplateColumns: "44px 1fr 1fr",
                      background: sceneIsFailed ? "#fff5f5" : i % 2 === 0 ? "#fff" : "#f8fafc"
                    }}>
                      {/* Scene number */}
                      <div style={{ padding: "16px 8px", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 18 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 24, height: 24, borderRadius: "50%",
                          background: sceneIsFailed ? "#ef4444" : "#0284c7",
                          color: "#fff", fontSize: 11, fontWeight: 800
                        }}>{scene.scene}</span>
                      </div>

                      {/* Image Prompt — editable */}
                      <div style={{ padding: "12px 12px 12px 0", borderRight: "1px solid #e2e8f0" }}>
                        {scene.script_line && (
                          <div style={{
                            fontSize: 10, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
                            color: sceneIsFailed ? "#dc2626" : "#0284c7"
                          }}>{scene.script_line}</div>
                        )}
                        <textarea
                          value={scene.prompt_clean || scene.prompt || ""}
                          onChange={e => {
                            setEditedScenes((prev: any[]) => {
                              const arr = [...prev];
                              arr[i] = { ...arr[i], prompt_clean: e.target.value, prompt: e.target.value };
                              return arr;
                            });
                            setHasUnsavedChanges(true);
                          }}
                          rows={5}
                          style={{
                            width: "100%", fontSize: 11, color: "#334155", lineHeight: 1.75,
                            border: sceneIsFailed ? "1.5px solid #f87171" : "1.5px solid #e2e8f0",
                            borderRadius: 8, padding: "10px 12px",
                            resize: "vertical", fontFamily: "inherit", outline: "none",
                            background: sceneIsFailed ? "#fff1f2" : "#f8fafc", transition: "border 0.15s",
                          }}
                          onFocus={e => e.target.style.borderColor = sceneIsFailed ? "#ef4444" : "#0284c7"}
                          onBlur={e => e.target.style.borderColor = sceneIsFailed ? "#f87171" : "#e2e8f0"}
                        />
                      </div>

                      {/* Video Scenario — editable */}
                      <div style={{ padding: "12px 12px" }}>
                        <textarea
                          value={scene.video_scenario || ""}
                          onChange={e => {
                            setEditedScenes((prev: any[]) => {
                              const arr = [...prev];
                              arr[i] = { ...arr[i], video_scenario: e.target.value };
                              return arr;
                            });
                            setHasUnsavedChanges(true);
                          }}
                          rows={5}
                          style={{
                            width: "100%", fontSize: 11, lineHeight: 1.75,
                            color: sceneIsFailed ? "#991b1b" : "#6d28d9",
                            border: sceneIsFailed ? "1.5px solid #f87171" : "1.5px solid #e2e8f0",
                            borderRadius: 8, padding: "10px 12px",
                            resize: "vertical", fontFamily: "inherit", outline: "none",
                            background: sceneIsFailed ? "#fff1f2" : "#f5f3ff", transition: "border 0.15s",
                          }}
                          onFocus={e => e.target.style.borderColor = sceneIsFailed ? "#ef4444" : "#7c3aed"}
                          onBlur={e => e.target.style.borderColor = sceneIsFailed ? "#f87171" : "#e2e8f0"}
                        />
                        {scene.emotion_type && (
                          <span style={{
                            marginTop: 6, display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700, border: "1px solid",
                            background: scene.emotion_type === "happy" ? "#f0fdf4" : scene.emotion_type === "sad" ? "#eff6ff" : "#fafafa",
                            color: scene.emotion_type === "happy" ? "#15803d" : scene.emotion_type === "sad" ? "#1d4ed8" : "#64748b",
                            borderColor: scene.emotion_type === "happy" ? "#bbf7d0" : scene.emotion_type === "sad" ? "#bfdbfe" : "#e2e8f0",
                          }}>{scene.emotion_type}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── Edit Image Prompt Modal ── */}
      {editingImagePrompt?.open && (
        <div
          onClick={() => setEditingImagePrompt(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 18, width: "100%", maxWidth: 680,
              boxShadow: "0 32px 80px rgba(220,38,38,0.35)",
              border: "2px solid #ef4444", overflow: "hidden", display: "flex", flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>✏️</span>
                <div>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Edit Image Prompt — Image #{(editingImagePrompt.index ?? 0) + 1}</div>
                  <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>Modify the prompt to comply with content policy, then resubmit</div>
                </div>
              </div>
              <button
                onClick={() => setEditingImagePrompt(null)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "6px 12px", fontSize: 18, fontWeight: 700, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Reason */}
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🚫</span>
                <div style={{ fontSize: 13, color: "#991b1b", lineHeight: 1.5 }}><b>Violation reason: </b>{editingImagePrompt.reason}</div>
              </div>

              {/* Editable prompt */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Image Prompt
                </label>
                <textarea
                  value={editingImagePrompt.prompt}
                  onChange={e => setEditingImagePrompt(prev => prev ? { ...prev, prompt: e.target.value } : null)}
                  rows={8}
                  style={{
                    width: "100%", fontSize: 13, color: "#1e293b", lineHeight: 1.7,
                    border: "1.5px solid #f87171", borderRadius: 10, padding: "12px 14px",
                    resize: "vertical", fontFamily: "inherit", outline: "none",
                    background: "#fff1f2", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#dc2626"}
                  onBlur={e => e.target.style.borderColor = "#f87171"}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditingImagePrompt(null)}
                  style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, color: "#475569", cursor: "pointer", padding: "10px 20px", fontSize: 13, fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!editingImagePrompt) return;
                    const updatedPrompt = editingImagePrompt.prompt.trim();
                    if (!updatedPrompt) return;
                    // Update the failedImagePrompts list with the new prompt
                    setFailedImagePrompts(prev => prev.map(fp =>
                      fp.index === editingImagePrompt.index ? { ...fp, prompt: updatedPrompt } : fp
                    ));
                    // Resubmit to single idea webhook
                    try {
                      const singleIdeaUrl = process.env.NEXT_PUBLIC_N8N_SINGLE_IDEA_URL || "";
                      const res = await fetch(singleIdeaUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ prompt: updatedPrompt, index: editingImagePrompt.index }),
                      });
                      if (res.ok) {
                        // Remove this prompt from failed list on success
                        setFailedImagePrompts(prev => prev.filter(fp => fp.index !== editingImagePrompt.index));
                        addSbToast("Prompt resubmitted successfully!", "success");
                      } else {
                        addSbToast("Resubmit failed — please try again.", "error");
                      }
                    } catch {
                      addSbToast("Error resubmitting prompt.", "error");
                    }
                    setEditingImagePrompt(null);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #3b82f6)", border: "none", borderRadius: 10,
                    color: "#fff", cursor: "pointer", padding: "10px 24px", fontSize: 13, fontWeight: 700,
                    boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                  }}
                >
                  Resubmit Prompt →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Voice Explorer Modal (Create Ads) ── */}
      {voiceModalOpenForId !== null && (() => {
        const currentItem = createTabAdsConfig.items.find((it: any) => it.id === voiceModalOpenForId);
        return (
          <VoiceExplorerModal
            isOpen={voiceModalOpenForId !== null}
            onOpenChange={(open) => { if (!open) setVoiceModalOpenForId(null); }}
            selectedVoiceId={currentItem?.voiceId || ""}
            onSelectVoice={(id, label) => {
              if (voiceModalOpenForId !== null) {
                setCreateTabAdsConfig((prev: any) => {
                  const newItems = [...prev.items];
                  const idx = newItems.findIndex((it: any) => it.id === voiceModalOpenForId);
                  if (idx !== -1) newItems[idx] = { ...newItems[idx], voiceId: id };
                  return { ...prev, items: newItems };
                });
                setVoiceLabels(prev => ({ ...prev, [voiceModalOpenForId]: label }));
              }
              setVoiceModalOpenForId(null);
            }}
          />
        );
      })()}

      </main>

      {errorNotification && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '100%',
            maxWidth: '380px',
            animation: 'sdSlideIn 0.25s ease-out forwards',
            pointerEvents: 'auto'
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #fca5a5',
              borderLeft: '6px solid #dc2626',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
              padding: '16px',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div 
                style={{
                  background: '#fee2e2',
                  borderRadius: '50%',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1, paddingRight: '20px' }}>
                <h3 
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#b91c1c',
                    margin: '0 0 4px 0',
                    lineHeight: '1.2'
                  }}
                >
                  Workflow Execution Error
                </h3>
                <p 
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    margin: 0,
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    fontWeight: 500
                  }}
                >
                  {errorNotification}
                </p>
              </div>

              {/* Small close button in top right of the toast */}
              <button
                onClick={async () => {
                  if (errorNotification) {
                    localStorage.setItem("toga_last_dismissed_error_msg", errorNotification.trim());
                  }
                  try {
                    await supabase
                      .from("Error Alerts")
                      .update({ Error: "" })
                      .eq("id", 1);
                  } catch (e) {
                    console.warn("Could not clear error from Supabase:", e);
                  }
                  setErrorNotification(null);
                  setErrorNotificationTime(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 600,
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  lineHeight: 1,
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredInputs && typeof window !== "undefined" && document.body && createPortal(
        <div style={{
          position: "fixed",
          left: hoveredInputs.x,
          top: hoveredInputs.y,
          zIndex: 999999,
          width: 360,
          background: "#fff",
          borderRadius: 18,
          boxShadow: "0 20px 60px -10px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          fontFamily: "Inter, sans-serif"
        }}
        onMouseEnter={() => { if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current); }}
        onMouseLeave={() => { hoverTimeoutRef.current = setTimeout(() => setHoveredInputs(null), 200); }}
        >
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 14 }}>⚙️</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Run Configuration</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>Inputs used for this analysis</div>
              </div>
            </div>
            <button onClick={() => setHoveredInputs(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, width: 24, height: 24, color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* Content */}
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14, maxHeight: 420, overflowY: "auto" }}>
            {Object.entries(hoveredInputs.data).map(([key, value]) => {
              if (key === 'timestamp' || key === 'session_id') return null;

              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

              const keyIcons: Record<string, string> = {
                action: "⚡", topic: "🎯", keywords: "🔑", countries: "🌍",
                max_ads: "📊", only_active: "✅", query: "🔍"
              };
              const icon = keyIcons[key] || "•";

              let displayValue: React.ReactNode;

              if (Array.isArray(value)) {
                displayValue = (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                    {(value as any[]).map((v, i) => (
                      <span key={i} style={{ padding: "4px 10px", background: "#EFF6FF", color: "#2563EB", borderRadius: 20, fontSize: 11, fontWeight: 600, border: "1px solid #DBEAFE" }}>
                        {v}
                      </span>
                    ))}
                  </div>
                );
              } else if (typeof value === 'boolean') {
                displayValue = (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", background: value ? "#DCFCE7" : "#FEE2E2", color: value ? "#166534" : "#991B1B", border: `1px solid ${value ? "#BBF7D0" : "#FECACA"}` }}>
                    {value ? "✓ Enabled" : "✗ Disabled"}
                  </span>
                );
              } else if (typeof value === 'number') {
                displayValue = <span style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", display: "block", marginTop: 2 }}>{value}</span>;
              } else {
                displayValue = <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", display: "block", marginTop: 4, textTransform: "capitalize" }}>{String(value).replace(/_/g, ' ')}</span>;
              }

              return (
                <div key={key} style={{ display: "flex", flexDirection: "column", padding: "10px 12px", background: "#F8FAFC", borderRadius: 10, border: "1px solid #F1F5F9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
                  </div>
                  {displayValue}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
