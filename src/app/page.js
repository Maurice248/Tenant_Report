"use client";

import { useState, useEffect, useCallback } from "react";
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
  Settings,
  Bell
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";
import CampaignSetup from "./CampaignSetup";
import SocialDash from "./SocialDash";
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
  { id: "newsletter", label: "Newsletter", icon: "📰", externalLink: "https://newsletter-dashboard-ecfb.vercel.app/newsletter/generate" },
  { id: "outreach", label: "Outreach", icon: "✉️", externalLink: "https://togaah-outreach-kc5r-git-main-optiserve.vercel.app" },
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



// ─── MAIN DASHBOARD ──────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[1]);
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Analysis
  useEffect(() => {
    console.log("[Diagnostics] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  }, []);

  // Analysis state
  const [analysisStatus, setAnalysisStatus] = useState("idle");
  // idle | generating | waiting | done | error
  const [analysisData, setAnalysisData] = useState(null);

  const [analysisError, setAnalysisError] = useState("");
  const [pendingAnalysisTopic, setPendingAnalysisTopic] = useState(null);

  // Ad creation
  const [adStatus, setAdStatus] = useState("idle");
  // idle | generating | waiting | done | error
  const [adData, setAdData] = useState(null);

  // Approval & launch
  const [approved, setApproved] = useState(false);
  const [budget, setBudget] = useState(50);
  const [duration, setDuration] = useState(7);
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

  const [createTabAdsConfig, setCreateTabAdsConfig] = useState({
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
  const [workflowStatus, setWorkflowStatus] = useState("");
  const [isStatusPolling, setIsStatusPolling] = useState(false);
  const [isEditingAd, setIsEditingAd] = useState(false);
  const [editingAdData, setEditingAdData] = useState({});
  const [isSavingAd, setIsSavingAd] = useState(false);
  const [isRetryingAd, setIsRetryingAd] = useState(false);
  const [sentIdeaIds, setSentIdeaIds] = useState({});
  const [generatedIdeas, setGeneratedIdeas] = useState({});
  const [retryPrompt, setRetryPrompt] = useState("");
  const [isRetryingSubmit, setIsRetryingSubmit] = useState(false);
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

  const addSbToast = useCallback((message, type = "success") => {
    const id = Date.now();
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

    // Select top 3 videos and top 2 images for the Create Ad tab
    const topVideos = validPending.filter(a => (a.format || "").toLowerCase() === "video").slice(0, 3);
    const topImages = validPending.filter(a => (a.format || "").toLowerCase() !== "video").slice(0, 2);

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
      const payload = {};
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
          .single();

        if (error) {
          console.error("Status polling error:", error);
          return;
        }

        if (data) {
          const newStatus = data.status || "";
          setWorkflowStatus(newStatus);

          // Refresh if any part of the workflow completed or if overall completion reached
          const isIntermediateDone = newStatus.toLowerCase().includes("completed") && !workflowStatus?.toLowerCase().includes("completed");
          const isFullyDone = newStatus === "Completed";

          if (isIntermediateDone || isFullyDone) {
            fetchAdTableLinks(); // Refresh the grid
          }

          if (isFullyDone) {
            setIsStatusPolling(false);
            setAdStatus("idle");
            addSbToast("Ads generation completed!", "success");
          }
        }
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStatusPolling, adStatus, fetchAdTableLinks, addSbToast]);

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

  async function handleRetryAdSubmit(ad) {
    if (!ad || !retryPrompt) return;
    setIsRetryingSubmit(true);

    const adData = typeof ad["json data"] === "string" ? JSON.parse(ad["json data"]) : (ad["json data"] || {});

    try {
      const res = await fetch("https://n8n.srv881198.hstgr.cloud/webhook/3ba2e5c5-b680-48b8-a905-6386b74a28d9", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: retryPrompt,
          ad_id: ad.id,
          original_data: adData,
          media_url: ad.text,
          timestamp: new Date().toISOString()
        }),
      });

      if (res.ok) {
        addSbToast("Retry request sent successfully!");
        setIsRetryingAd(false);
        setRetryPrompt("");
      } else {
        addSbToast("Failed to send retry request", "error");
      }
    } catch (e) {
      console.error("Retry error:", e);
      addSbToast("Failed to reach retry webhook", "error");
    }
    setIsRetryingSubmit(false);
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
    setAdStatus("generating");
    setWebhookError("");
    try {
      const res = await fetch("/api/trigger-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: analysisData?.id || crypto.randomUUID(),
          report_data: analysisData,
          ads_config: config
        }),
      });
      const result = await res.json();
      if (result.success) {
        addSbToast("Ads workflow triggered successfully!");
        setAdStatus("waiting");
        setIsStatusPolling(true); // Initiate polling
      } else {
        setAdStatus("error");
        setWebhookError(result.error || "Failed to trigger ad generation");
        addSbToast("Failed to trigger generation. Try again.", "error");
      }
    } catch (e) {
      setAdStatus("error");
      setWebhookError(e.message || "Failed to reach API");
      addSbToast("Failed to trigger generation. Try again.", "error");
    }
  }

  function formatSbDate(iso) {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
    return `${day} ${mon} ${d.getFullYear()}`;
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
    setAnalysisData(null);
    setAnalysisError("");
    setAnalysisStatus("generating");
    setPendingAnalysisTopic(selectedTopic);
    await new Promise((r) => setTimeout(r, 100));

    const result = await callWebhook({
      action: "competitor_analysis",
      topic: selectedTopic,
      timestamp: new Date().toISOString(),
    }, setAnalysisStatus);

    if (result) {
      if (result.error && result.isTimeout) {
        // If it was a timeout, don't show error, just stay in waiting
        setAnalysisStatus("waiting");
        addSbToast("Trigger successful, waiting for results...");
      } else {
        setAnalysisData(result);
        setAnalysisStatus("done");
        setPendingAnalysisTopic(null);
      }
    } else if (analysisStatus !== "error") {
      setAnalysisStatus("waiting");
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

  // ── Action 3: Launch Meta Ad ──
  async function launchMetaAd() {
    const result = await callWebhook({
      action: "launch_meta_ad",
      adData: adData,
      budget: budget,
      duration: duration,
      timestamp: new Date().toISOString(),
    }, setLaunchStatus);
    // Optimistic: add to campaigns list regardless of n8n response
    setCampaigns(prev => [...prev, {
      id: `C${Date.now()}`,
      name: adData?.topic || "New Campaign",
      platform: "Meta",
      budget: `€${budget}/day`,
      duration: `${duration} days`,
      status: "launching",
      spend: "€0",
      ctr: "—",
      clicks: 0,
      leads: 0,
    }]);
    if (result) setLaunchStatus("live");
    setTab("campaigns");
  }

  // ── Action 4: Stop Campaign ──
  async function stopCampaign(campaignId, campaignName) {
    setStoppedIds(prev => [...prev, campaignId]); // optimistic
    await callWebhook({
      action: "stop_campaign",
      campaignId: campaignId,
      campaignName: campaignName,
      timestamp: new Date().toISOString(),
    }, setStopStatus);
  }

  // ── Action 5: Generate Report ──
  async function generateReport() {
    const result = await callWebhook({
      action: "generate_report",
      period: "manual",
      timestamp: new Date().toISOString(),
    }, setReportStatus);
    if (result) setReportStatus("done");
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
        maxWidth: 1440,
        margin: "0 auto",
        padding: "0 24px 4rem",
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 0 18px",
          borderBottom: "1px solid var(--border)",
          marginBottom: 24,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40,
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 20, fontWeight: 800,
            boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            flexShrink: 0,
          }}>
            A
          </div>
          <div>
            <div style={{
              fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em",
              color: "var(--text)", lineHeight: 1.1,
            }}>
              Aumatic AI
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>
              Ads & Outreach Platform
            </div>
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Icon buttons */}
          <button
            style={{
              width: 36, height: 36, borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)", background: "var(--card-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Bell size={16} />
          </button>
          <button
            style={{
              width: 36, height: 36, borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)", background: "var(--card-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <Settings size={16} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />

          {/* User / Auth */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "var(--primary-light)", border: "2px solid var(--primary-mid)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--primary)",
              }}>
                <User size={16} />
              </div>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Admin</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                style={{
                  padding: "7px 12px", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)", background: "var(--card-bg)",
                  color: "var(--red)", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s", fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--red-light)"; e.currentTarget.style.borderColor = "var(--red)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-bg)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              style={{
                padding: "9px 18px", borderRadius: "var(--radius-md)",
                border: "none", background: "var(--primary)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 7,
                boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                transition: "all 0.15s", fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-dark)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(37,99,235,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(37,99,235,0.25)"; }}
            >
              <LogIn size={15} /> Sign In
            </button>
          )}
        </div>
      </div>

      {/* ── NAV TABS ── */}
      <div
        className="tab-nav"
        style={{
          display: "flex",
          gap: 4,
          padding: "6px",
          background: "var(--card-bg)",
          borderRadius: "var(--radius-lg)",
          marginBottom: 28,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xs)",
          overflowX: "auto",
          position: "sticky",
          top: 16,
          zIndex: 100,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            style={tabStyle(t.id)}
            onClick={() => {
              if (t.externalLink) {
                window.open(t.externalLink, "_blank", "noopener,noreferrer");
              } else {
                setTab(t.id);
              }
            }}
          >
            <span style={{ fontSize: 13, opacity: 0.75 }}>{t.icon}</span>
            <span style={{ whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Account Health Window */}
                <Card style={{ background: "linear-gradient(135deg, #f8fafc, #eff6ff)", border: "1px solid #bfdbfe", padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <SectionTitle style={{ margin: 0, color: "var(--primary)" }}>Account Health Snapshot</SectionTitle>
                    <Badge text="Live Data" color="var(--primary)" bg="var(--primary-light)" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div style={{ background: "#ffffff", padding: 16, borderRadius: "var(--radius-md)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Inv.</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginTop: 6 }}>${spendTotal.toFixed(2)}</div>
                    </div>
                    <div style={{ background: "#ffffff", padding: 16, borderRadius: "var(--radius-md)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Reach</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginTop: 6 }}>{impressionsTotal.toLocaleString()}</div>
                    </div>
                    <div style={{ background: "#ffffff", padding: 16, borderRadius: "var(--radius-md)", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", border: "1px solid var(--border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Avg CPM</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)", marginTop: 6 }}>${cpm}</div>
                    </div>
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
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    ].map(([label, fn, icon, sub], i) => (
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
        <div className="animate-fade-in flex flex-col lg:flex-row gap-5">
          {/* History Sidebar */}
          <div className="w-full lg:w-[250px] lg:flex-shrink-0 lg:sticky lg:top-5" style={{
            background: "var(--card-bg)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)", padding: 18, display: "flex", flexDirection: "column", gap: 14,
            height: "fit-content", boxShadow: "var(--shadow-sm)"
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span>📜</span> Analysis History
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
              {[...sbRows].reverse().map((row) => {
                const report = parseSbReport(row);
                return (
                  <div key={row.id} style={{
                    padding: 12, borderRadius: "var(--radius-md)", border: "0.5px solid var(--border-light)",
                    background: "var(--surface)", transition: "transform 0.15s, border-color 0.15s"
                  }} onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--primary)"} onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border-light)"}>
                    <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 11, marginBottom: 2 }}>{report.topic || "Untitled Run"}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>📅</span> {formatSbDate(row.created_at)}
                    </div>
                    <button
                      onClick={() => {
                        setAnalysisData({ ...report, id: row.id });
                        setAnalysisStatus("done");
                        setSelectedTopic(report.topic || TOPICS[1]);
                        addSbToast("Loaded history: " + report.topic);
                      }}
                      style={{
                        width: "100%", padding: "6px 0", borderRadius: "var(--radius-sm)", border: "none",
                        background: "var(--primary-light)", color: "var(--primary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary-light)"; e.currentTarget.style.color = "var(--primary)"; }}
                    >
                      Use Result
                    </button>
                  </div>
                );
              })}
              {sbRows.length === 0 && <div style={{ fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: 20 }}>No previous runs found</div>}
            </div>
          </div>

          {/* Main Content Area */}
          <div style={{ flex: 1 }}>
            <Card style={{ marginBottom: 14 }}>
              <SectionTitle>Topic for analysis</SectionTitle>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: 20,
                }}
              >
                {TOPICS.map((t) => (
                  <button
                    key={t}
                    style={topicBtnStyle(t)}
                    onClick={() => setSelectedTopic(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <SectionTitle>n8n Workflow Steps</SectionTitle>
              <WorkflowStep
                step="1"
                label="Trigger webhook"
                sub={`POST → ${API_URL}/competitor_analysis`}
                active={analysisStatus === "idle"}
                done={analysisStatus !== "idle" || !!analysisData}
              />
              <WorkflowStep
                step="2"
                label="n8n receives & scrapes competitors"
                sub="Apify actor — IG, FB, Google local studios"
                active={analysisStatus === "generating" || analysisStatus === "waiting"}
                done={analysisStatus === "done" || !!analysisData}
              />
              <WorkflowStep
                step="3"
                label="Claude analyzes patterns in n8n"
                sub="CTR, creative type, offers, copy angles"
                active={analysisStatus === "waiting"}
                done={analysisStatus === "done" || !!analysisData}
              />
              <WorkflowStep
                step="4"
                label="n8n POSTs results back to dashboard"
                sub="Results appear below"
                active={false}
                done={analysisStatus === "done" || !!analysisData}
              />

              {/* TRIGGER BUTTON — shown when idle, error, or done (allow re-run) */}
              {(analysisStatus === "idle" || analysisStatus === "done" || analysisStatus === "error") && (
                <div>
                  <button
                    onClick={runCompetitorAnalysis}
                    disabled={false}
                    style={{
                      width: "100%",
                      padding: "11px 18px",
                      borderRadius: "var(--radius-md)",
                      border: "none",
                      background: "var(--primary)",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "background 0.2s, transform 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#3D35A0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--primary)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    {analysisStatus === "done"
                      ? "Re-run competitor analysis"
                      : "Trigger n8n webhook — run competitor analysis"}
                  </button>
                  {analysisStatus === "error" && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--red-strong)" }}>
                      Could not reach n8n: {analysisError || webhookError}. Please try again.
                    </div>
                  )}
                </div>
              )}

              {/* GENERATING */}
              {analysisStatus === "generating" && (
                <div
                  className="animate-slide-up"
                  style={{ background: "var(--primary-light)", borderRadius: "var(--radius-md)", padding: 16, textAlign: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
                    <Spinner size={14} />
                    <span style={{ fontSize: 13, color: "var(--primary)", fontWeight: 500 }}>
                      Sending to n8n...
                    </span>
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--purple-dark)" }}>
                    POST {API_URL}
                  </div>
                </div>
              )}

              {/* WAITING */}
              {analysisStatus === "waiting" && (
                <div className="animate-slide-up">
                  <div
                    style={{
                      background: "var(--amber-light)",
                      border: "0.5px solid var(--amber)",
                      borderRadius: "var(--radius-md)",
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--amber)",
                        fontWeight: 500,
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Spinner size={12} color="var(--amber)" />
                      Webhook triggered — waiting for n8n response
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--amber-dark)",
                        lineHeight: 1.6,
                      }}
                    >
                      n8n scraping + analyzing competitors. When
                      done, n8n must POST results back here.
                      <br />
                      <strong>
                        Add a &ldquo;Respond to Webhook&rdquo; node
                        in n8n
                      </strong>{" "}
                      with the JSON format below.
                    </div>
                  </div>

                  {/* Expected response format */}
                  <div
                    style={{
                      background: "var(--surface)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 14px",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Expected n8n response format
                    </div>
                    <pre
                      style={{
                        fontSize: 11,
                        color: "var(--text)",
                        margin: 0,
                        lineHeight: 1.7,
                        overflow: "auto",
                      }}
                    >
                      {`{
  "success": true,
  "executive_summary": "...",
  "competitors_table": [
    { "name": "...", "ads": 0, "score": 0,
      "threat": "...", "angle": "...", "hook": "..." }
  ],
  "hooks_table": [
    { "pattern": "...", "example": "...",
      "reason": "...", "score": "..." }
  ],
  "market_insights_table": [
    { "field": "...", "value": "..." }
  ],
  "gaps_table": [
    { "gap": "...", "opportunity": "...",
      "priority": "...", "impact": "..." }
  ]
}`}
                    </pre>
                  </div>

                  <SecondaryButton onClick={simulateAnalysisResponse}>
                    ⚙ Simulate n8n response — UI testing only
                  </SecondaryButton>
                </div>
              )}

              {/* ERROR */}
              {analysisStatus === "error" && (
                <div className="animate-slide-up">
                  <div
                    style={{
                      background: "var(--red-error-bg)",
                      border: "0.5px solid var(--red-error)",
                      borderRadius: "var(--radius-md)",
                      padding: 14,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--red-strong)",
                        fontWeight: 500,
                        marginBottom: 4,
                      }}
                    >
                      Webhook trigger failed
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--red-dark)",
                      }}
                    >
                      {analysisError}
                    </div>
                  </div>
                  <SecondaryButton
                    onClick={() => setAnalysisStatus("idle")}
                  >
                    Reset
                  </SecondaryButton>
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

                {/* 2. Competitor Ads Table */}
                {(analysisData?.competitors_table?.length > 0) && (
                  <Card style={{ marginBottom: 14 }}>
                    <SectionTitle>Competitor Ads</SectionTitle>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                        <thead>
                          <tr style={{ background: "var(--surface)" }}>
                            {["Name", "Ads", "Score", "Threat", "Angle", "Hook"].map((h) => (
                              <th key={h} style={{
                                padding: "9px 12px",
                                textAlign: "left",
                                fontWeight: 600,
                                fontSize: 11,
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                borderBottom: "1px solid var(--border)",
                                whiteSpace: "nowrap",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.competitors_table.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid var(--border-light)" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <td style={{ padding: "10px 12px", fontWeight: 500, color: "var(--text)" }}>{row?.name}</td>
                              <td style={{ padding: "10px 12px", color: "var(--text-body)" }}>{row?.ads}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-pill)",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: row?.score >= 75 ? "var(--green-light)" : row?.score >= 50 ? "var(--amber-light)" : "var(--red-error-bg)",
                                  color: row?.score >= 75 ? "var(--green)" : row?.score >= 50 ? "var(--amber)" : "var(--red-dark)",
                                }}>{row?.score}</span>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <Badge
                                  text={row?.threat}
                                  color={row?.threat === "High" ? "var(--red-dark)" : row?.threat === "Medium" ? "var(--amber)" : "var(--green)"}
                                  bg={row?.threat === "High" ? "var(--red-error-bg)" : row?.threat === "Medium" ? "var(--amber-light)" : "var(--green-light)"}
                                />
                              </td>
                              <td style={{ padding: "10px 12px", color: "var(--text-body)" }}>{row?.angle}</td>
                              <td style={{ padding: "10px 12px", color: "var(--primary)", fontStyle: "italic" }}>&ldquo;{row?.hook}&rdquo;</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* 3. Top Hook Patterns Table */}
                {(analysisData?.hooks_table?.length > 0) && (
                  <Card style={{ marginBottom: 14 }}>
                    <SectionTitle>Top Hook Patterns</SectionTitle>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                        <thead>
                          <tr style={{ background: "var(--surface)" }}>
                            {["Pattern", "Example", "Reason", "Score"].map((h) => (
                              <th key={h} style={{
                                padding: "9px 12px",
                                textAlign: "left",
                                fontWeight: 600,
                                fontSize: 11,
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                borderBottom: "1px solid var(--border)",
                                whiteSpace: "nowrap",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.hooks_table.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid var(--border-light)" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <td style={{ padding: "10px 12px", fontWeight: 500, color: "var(--text)", whiteSpace: "nowrap" }}>{row?.pattern}</td>
                              <td style={{ padding: "10px 12px", color: "var(--primary)", fontStyle: "italic" }}>&ldquo;{row?.example}&rdquo;</td>
                              <td style={{ padding: "10px 12px", color: "var(--text-body)", lineHeight: 1.5 }}>{row?.reason}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "var(--radius-pill)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  background: "var(--primary-light)",
                                  color: "var(--primary)",
                                }}>{row?.score}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {/* 4 + 5. Market Insights & Gap Opportunities — side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px] mb-[14px]">

                  {/* 4. Market Insights Table */}
                  {(analysisData?.market_insights_table?.length > 0) && (
                    <Card>
                      <SectionTitle>Market Insights</SectionTitle>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                        <thead>
                          <tr style={{ background: "var(--surface)" }}>
                            {["Field", "Value"].map((h) => (
                              <th key={h} style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                fontWeight: 600,
                                fontSize: 11,
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                borderBottom: "1px solid var(--border)",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.market_insights_table.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid var(--border-light)" }}>
                              <td style={{ padding: "9px 10px", fontWeight: 500, color: "var(--text-muted)", fontSize: 11 }}>{row?.field}</td>
                              <td style={{ padding: "9px 10px", fontWeight: 500, color: "var(--text)" }}>{row?.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
                  )}

                  {/* 5. Gap Opportunities Table */}
                  {(analysisData?.gaps_table?.length > 0) && (
                    <Card>
                      <SectionTitle>Gap Opportunities</SectionTitle>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                        <thead>
                          <tr style={{ background: "var(--surface)" }}>
                            {["Gap", "Opportunity", "Priority", "Impact"].map((h) => (
                              <th key={h} style={{
                                padding: "8px 10px",
                                textAlign: "left",
                                fontWeight: 600,
                                fontSize: 11,
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                borderBottom: "1px solid var(--border)",
                                whiteSpace: "nowrap",
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.gaps_table.map((row, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid var(--border-light)" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <td style={{ padding: "9px 10px", fontWeight: 500, color: "var(--text)" }}>{row?.gap}</td>
                              <td style={{ padding: "9px 10px", color: "var(--text-body)", lineHeight: 1.5 }}>{row?.opportunity}</td>
                              <td style={{ padding: "9px 10px" }}>
                                <Badge
                                  text={row?.priority}
                                  color={row?.priority === "High" ? "var(--red-dark)" : row?.priority === "Medium" ? "var(--amber)" : "var(--green)"}
                                  bg={row?.priority === "High" ? "var(--red-error-bg)" : row?.priority === "Medium" ? "var(--amber-light)" : "var(--green-light)"}
                                />
                              </td>
                              <td style={{ padding: "9px 10px", color: "var(--blue)", fontSize: 11 }}>{row?.impact}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Card>
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
      )}

      {/* ═══════════════════════════════════════════════════════
          CREATE AD
      ═══════════════════════════════════════════════════════ */}
      {tab === "create" && (
        <div className="animate-fade-in">
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

          <Card style={{ marginBottom: 14 }}>
            <SectionTitle>Select topic</SectionTitle>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 20,
              }}
            >
              {TOPICS.map((t) => (
                <button
                  key={t}
                  style={topicBtnStyle(t)}
                  onClick={() => setSelectedTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <SectionTitle>n8n Workflow Steps</SectionTitle>
            <WorkflowStep
              step="1"
              label="Topic + analysis data sent to n8n"
              sub="Competitor brief + topic = better ad"
              active={adStatus === "idle"}
              done={adStatus !== "idle"}
            />
            <WorkflowStep
              step="2"
              label="Claude generates ad copy"
              sub="Using top hook patterns and ready templates"
              active={adStatus === "waiting"}
              done={adStatus === "done"}
            />
            <WorkflowStep
              step="3"
              label="Runway ML video / DALL-E image"
              sub="28-sec reel or static visual"
              active={adStatus === "waiting"}
              done={adStatus === "done"}
            />
            <WorkflowStep
              step="4"
              label="Ready ad sent to Approval tab"
              sub="You confirm budget & launch"
              active={false}
              done={adStatus === "done"}
            />

            <div>
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
                  padding: 18, borderRadius: "var(--radius-md)",
                  background: "var(--surface)", border: "0.5px solid var(--border-light)",
                }}>
                  {/* Cancel button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button
                      onClick={() => setCreateTabConfigOpen(false)}
                      style={{
                        padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                        background: "var(--card-bg)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>

                  {/* ── PHASE 1: TOTAL QUANTITY ── */}
                  <div style={{
                    padding: 24, borderRadius: "var(--radius-lg)",
                    background: "var(--surface)", border: "0.5px solid var(--border-light)",
                    marginBottom: 20, position: "relative", overflow: "hidden"
                  }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5" style={{ marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                          STEP 1: HOW MANY ADS?
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                          Pick the total number of creatives you want to generate.
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => updateCreateTabTotalAds(n)}
                            type="button"
                            style={{
                              width: 38, height: 38, borderRadius: "var(--radius-md)",
                              border: createTabAdsConfig.totalAds === n ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                              background: createTabAdsConfig.totalAds === n ? "var(--primary-light)" : "var(--card-bg)",
                              color: createTabAdsConfig.totalAds === n ? "var(--primary)" : "var(--text)",
                              fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                              fontFamily: "inherit"
                            }}
                          >
                            {n}
                          </button>
                        ))}
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={createTabAdsConfig.totalAds}
                          onChange={(e) => updateCreateTabTotalAds(parseInt(e.target.value) || 1)}
                          style={{
                            width: 50, padding: "8px 0", textAlign: "center", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border)", background: "var(--card-bg)",
                            color: "var(--text)", fontSize: 13, fontWeight: 600, outline: "none",
                            fontFamily: "inherit"
                          }}
                        />
                      </div>
                    </div>

                    {/* ── PHASE 2: ALLOCATION ── */}
                    <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 20 }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5" style={{ marginBottom: 16 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                              STEP 2: ALLOCATE TYPES
                            </div>
                            <div style={{
                              fontSize: 10, padding: "2px 6px", borderRadius: 4,
                              background: "var(--amber-light)", color: "var(--amber)", fontWeight: 700,
                              border: "0.5px solid var(--amber)"
                            }}>
                              LIMIT: 3V / 2I
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                            Divide your {createTabAdsConfig.totalAds} ads into Videos and Images.
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card-bg)", padding: 4, borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                          <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: createTabAdsConfig.videoCount >= 3 ? "var(--primary)" : "var(--text)" }}>
                            🎬 {createTabAdsConfig.videoCount}/3
                          </div>
                          <div style={{ width: 1, height: 16, background: "var(--border)" }} />
                          <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: createTabAdsConfig.imageCount >= 2 ? "var(--amber)" : "var(--text)" }}>
                            🖼️ {createTabAdsConfig.imageCount}/2
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {createTabAdsConfig.items.map((item, idx) => {
                          const videoDisabled = item.type !== "video" && createTabAdsConfig.videoCount >= 3;
                          const imageDisabled = item.type !== "image" && createTabAdsConfig.imageCount >= 2;

                          return (
                            <div key={item.id} style={{
                              flex: "1 1 120px", display: "flex", flexDirection: "column", gap: 6
                            }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", marginLeft: 2 }}>AD {idx + 1}</div>
                              <div style={{
                                display: "flex", borderRadius: "var(--radius-md)", overflow: "hidden",
                                border: "1px solid var(--border)", background: "var(--card-bg)"
                              }}>
                                <button
                                  onClick={() => setCreateTabItemType(idx, "video")}
                                  type="button"
                                  style={{
                                    flex: 1, padding: "10px 0", border: "none", cursor: videoDisabled ? "not-allowed" : "pointer",
                                    background: item.type === "video" ? "var(--primary-light)" : "transparent",
                                    color: item.type === "video" ? "var(--primary)" : "var(--text-dim)",
                                    fontSize: 14, transition: "all 0.15s",
                                    opacity: videoDisabled ? 0.3 : 1
                                  }}
                                  title={videoDisabled ? "3 Video maximum reached" : "Video"}
                                >
                                  🎬
                                </button>
                                <button
                                  onClick={() => setCreateTabItemType(idx, "image")}
                                  type="button"
                                  style={{
                                    flex: 1, padding: "10px 0", border: "none", cursor: imageDisabled ? "not-allowed" : "pointer",
                                    background: item.type === "image" ? "var(--amber-light)" : "transparent",
                                    color: item.type === "image" ? "var(--amber)" : "var(--text-dim)",
                                    fontSize: 14, transition: "all 0.15s",
                                    opacity: imageDisabled ? 0.3 : 1
                                  }}
                                  title={imageDisabled ? "2 Image maximum reached" : "Image"}
                                >
                                  🖼️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── PHASE 3: DETAILED CONFIG ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                    {createTabAdsConfig.items.map((item, idx) => {
                      const isVideo = item.type === "video";
                      return (
                        <div key={item.id} style={{
                          padding: 20, borderRadius: "var(--radius-lg)",
                          background: isVideo ? "linear-gradient(to bottom, var(--card-bg), var(--surface))" : "linear-gradient(to bottom, var(--card-bg), var(--amber-light))",
                          border: `1.5px solid ${isVideo ? "var(--primary-light)" : "var(--amber-light)"}`,
                          boxShadow: "var(--shadow-sm)"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                            <span style={{ fontSize: 20 }}>{isVideo ? "🎬" : "🖼️"}</span>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                              {isVideo ? "Video" : "Image"} {idx + 1} Configuration
                            </div>
                          </div>

                          {isVideo ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Duration</div>
                                  <select
                                    value={item.duration}
                                    onChange={(e) => updateCreateTabItemField(idx, "duration", e.target.value)}
                                    style={{
                                      width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                      border: "1px solid var(--border)", background: "var(--card-bg)",
                                      fontSize: 12, outline: "none", color: "var(--text)", fontFamily: "inherit"
                                    }}
                                  >
                                    {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Audio Style</div>
                                  <select
                                    value={item.audioStyle}
                                    onChange={(e) => updateCreateTabItemField(idx, "audioStyle", e.target.value)}
                                    style={{
                                      width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                      border: "1px solid var(--border)", background: "var(--card-bg)",
                                      fontSize: 12, outline: "none", color: "var(--text)", fontFamily: "inherit"
                                    }}
                                  >
                                    {AUDIO_STYLES.map(a => <option key={a} value={a}>{a}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Character</div>
                                  <select
                                    value={item.character || "male"}
                                    onChange={(e) => {
                                      const newChar = e.target.value;
                                      const firstVoice = VOICE_OPTIONS[newChar][0].id;
                                      setCreateTabAdsConfig((prev) => {
                                        const newItems = [...prev.items];
                                        newItems[idx] = { ...newItems[idx], character: newChar, voiceId: firstVoice };
                                        return { ...prev, items: newItems };
                                      });
                                    }}
                                    style={{
                                      width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                      border: "1px solid var(--border)", background: "var(--card-bg)",
                                      fontSize: 12, outline: "none", color: "var(--text)", fontFamily: "inherit"
                                    }}
                                  >
                                    <option value="male">👨 Male</option>
                                    <option value="female">👩 Female</option>
                                  </select>
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Voice</div>
                                  <select
                                    value={item.voiceId || VOICE_OPTIONS[item.character || "male"][0].id}
                                    onChange={(e) => updateCreateTabItemField(idx, "voiceId", e.target.value)}
                                    style={{
                                      width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                      border: "1px solid var(--border)", background: "var(--card-bg)",
                                      fontSize: 12, outline: "none", color: "var(--text)", fontFamily: "inherit"
                                    }}
                                  >
                                    {(VOICE_OPTIONS[item.character || "male"] || []).map(v => (
                                      <option key={v.id} value={v.id}>{v.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Visual Style</div>
                                <select
                                  value={item.videoStyle}
                                  onChange={(e) => updateCreateTabItemField(idx, "videoStyle", e.target.value)}
                                  style={{
                                    width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)", background: "var(--card-bg)",
                                    fontSize: 12, outline: "none", color: "var(--text)", fontFamily: "inherit"
                                  }}
                                >
                                  {VIDEO_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Script / Storyboard Idea</div>
                                  <button
                                    disabled={sentIdeaIds[item.id]}
                                    onClick={async () => {
                                      if (sentIdeaIds[item.id]) return;
                                      setSentIdeaIds(prev => ({ ...prev, [item.id]: true }));
                                      addSbToast(`Generating Video ${idx + 1} ideas via webhook...`);
                                      console.log("Sending to Webhook:", item);
                                      try {
                                        const res = await fetch("https://n8n.srv881198.hstgr.cloud/webhook/5dd8a76d-f4e4-45b5-808a-c784057d29b1", {
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
                                      padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "none",
                                      background: sentIdeaIds[item.id] ? "#4a4a6a" : "#1a1a2e", color: "#fff", fontSize: 10, fontWeight: 700,
                                      cursor: sentIdeaIds[item.id] ? "not-allowed" : "pointer",
                                      transition: "all 0.2s", textTransform: "uppercase",
                                      opacity: sentIdeaIds[item.id] ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => { if (!sentIdeaIds[item.id]) e.currentTarget.style.background = "#2a2a4e"; }}
                                    onMouseLeave={(e) => { if (!sentIdeaIds[item.id]) e.currentTarget.style.background = "#1a1a2e"; }}
                                  >
                                    {sentIdeaIds[item.id] ? "Generating..." : "Generate an idea"}
                                  </button>
                                </div>
                                <textarea
                                  placeholder="e.g. generate a video with offer and sales ads..."
                                  value={item.idea}
                                  onChange={(e) => updateCreateTabItemField(idx, "idea", e.target.value)}
                                  style={{
                                    width: "100%", minHeight: 80, padding: "12px", borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)", background: "var(--card-bg)",
                                    fontSize: 12, outline: "none", color: "var(--text)", resize: "vertical", fontFamily: "inherit"
                                  }}
                                />
                                {generatedIdeas[item.id] && generatedIdeas[item.id].length > 0 && (
                                  <div style={{
                                    marginTop: 16, display: "flex", flexDirection: "column", gap: 12,
                                    padding: "16px", borderRadius: "var(--radius-lg)",
                                    border: "1px dashed var(--primary-light)",
                                    background: "rgba(99, 102, 241, 0.04)"
                                  }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.02em" }}>✨ AI Generated Ideas (Click to use)</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                                      {generatedIdeas[item.id].map(ideaObj => (
                                        <div
                                          key={ideaObj.id}
                                          onClick={() => updateCreateTabItemField(idx, "idea", ideaObj.idea)}
                                          style={{
                                            padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--primary-light)",
                                            background: "var(--surface)", cursor: "pointer", fontSize: 12, color: "var(--text-body)",
                                            transition: "all 0.2s", lineHeight: 1.5, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--primary-light)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)"; }}
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
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Visual Style</div>
                                <select
                                  value={item.imageStyle || "Bold & Colorful"}
                                  onChange={(e) => updateCreateTabItemField(idx, "imageStyle", e.target.value)}
                                  style={{
                                    width: "100%", padding: "10px", borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)", background: "var(--card-bg)",
                                    fontSize: 12, outline: "none", color: "var(--text)", fontFamily: "inherit"
                                  }}
                                >
                                  {VIDEO_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Image Description / Prompt</div>
                                  <button
                                    disabled={sentIdeaIds[item.id]}
                                    onClick={async () => {
                                      if (sentIdeaIds[item.id]) return;
                                      setSentIdeaIds(prev => ({ ...prev, [item.id]: true }));
                                      addSbToast(`Generating Image ${idx + 1} ideas via webhook...`);
                                      console.log("Sending to Webhook:", item);
                                      try {
                                        const res = await fetch("https://n8n.srv881198.hstgr.cloud/webhook/5dd8a76d-f4e4-45b5-808a-c784057d29b1", {
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
                                      padding: "4px 10px", borderRadius: "var(--radius-sm)", border: "none",
                                      background: sentIdeaIds[item.id] ? "#4a4a6a" : "#1a1a2e", color: "#fff", fontSize: 10, fontWeight: 700,
                                      cursor: sentIdeaIds[item.id] ? "not-allowed" : "pointer",
                                      transition: "all 0.2s", textTransform: "uppercase",
                                      opacity: sentIdeaIds[item.id] ? 0.6 : 1
                                    }}
                                    onMouseEnter={(e) => { if (!sentIdeaIds[item.id]) e.currentTarget.style.background = "#2a2a4e"; }}
                                    onMouseLeave={(e) => { if (!sentIdeaIds[item.id]) e.currentTarget.style.background = "#1a1a2e"; }}
                                  >
                                    {sentIdeaIds[item.id] ? "Generating..." : "Generate an idea"}
                                  </button>
                                </div>
                                <textarea
                                  placeholder="Describe the aesthetic, colors, and subject of the image..."
                                  value={item.idea}
                                  onChange={(e) => updateCreateTabItemField(idx, "idea", e.target.value)}
                                  style={{
                                    width: "100%", minHeight: 80, padding: "12px", borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border)", background: "var(--card-bg)",
                                    fontSize: 12, outline: "none", color: "var(--text)", resize: "vertical", fontFamily: "inherit"
                                  }}
                                />
                                {generatedIdeas[item.id] && generatedIdeas[item.id].length > 0 && (
                                  <div style={{
                                    marginTop: 16, display: "flex", flexDirection: "column", gap: 12,
                                    padding: "16px", borderRadius: "var(--radius-lg)",
                                    border: "1px dashed var(--primary-light)",
                                    background: "rgba(99, 102, 241, 0.04)"
                                  }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.02em" }}>✨ AI Generated Ideas (Click to use)</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                                      {generatedIdeas[item.id].map(ideaObj => (
                                        <div
                                          key={ideaObj.id}
                                          onClick={() => updateCreateTabItemField(idx, "idea", ideaObj.idea)}
                                          style={{
                                            padding: "14px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--primary-light)",
                                            background: "var(--surface)", cursor: "pointer", fontSize: 12, color: "var(--text-body)",
                                            transition: "all 0.2s", lineHeight: 1.5, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)"; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--primary-light)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)"; }}
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
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Status Area */}
                  <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: "var(--radius-lg)", background: "var(--surface)", border: "1px solid var(--border-light)" }}>
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
                            const hasBoth = lStatus.includes("image/video");
                            const showImage = hasBoth || lStatus.includes("image") || createTabAdsConfig.imageCount > 0;
                            const showVideo = hasBoth || lStatus.includes("video") || createTabAdsConfig.videoCount > 0;

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
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 15 }}>🚀</span>
                          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                            <b>{createTabAdsConfig.totalAds} Ads</b> ready ({createTabAdsConfig.videoCount}V / {createTabAdsConfig.imageCount}I)
                          </div>
                        </div>
                        <button
                          onClick={handleCreateTabTriggerAds}
                          disabled={adStatus === "generating" || adStatus === "waiting" || !analysisData}
                          type="button"
                          className="w-full sm:w-auto"
                          style={{
                            padding: "12px 30px", borderRadius: "var(--radius-lg)", border: "none",
                            background: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "var(--primary-light)" : "linear-gradient(135deg, #f97316, #ec4899)",
                            color: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "var(--primary)" : "#fff",
                            fontSize: 13, fontWeight: 700, cursor: (adStatus === "generating" || !analysisData) ? "not-allowed" : "pointer",
                            fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                            opacity: (adStatus === "generating" || !analysisData) ? 0.7 : 1, transition: "transform 0.15s, box-shadow 0.15s",
                            boxShadow: (adStatus === "generating" || adStatus === "waiting" || !analysisData) ? "none" : "0 4px 12px rgba(236, 72, 153, 0.3)"
                          }}
                          onMouseEnter={(e) => { if (adStatus !== "generating") e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                          {adStatus === "generating" ? <><Spinner size={14} /> Triggering...</> : "Confirm & Generate Ads →"}
                        </button>
                      </div>
                    )}

                    {adStatus === "error" && (
                      <div style={{ marginTop: 12, padding: 10, borderRadius: "var(--radius-sm)", background: "var(--red-light)", color: "var(--red-strong)", fontSize: 12, border: "0.5px solid var(--red)" }}>
                        <b>Error:</b> {webhookError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>




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
                              const timestamp = new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '').replace(/\//g, '-').replace(' ', '_').replace(':', '-').replace(' pm', 'PM').replace(' am', 'AM');
                              const ext = file.name.split('.').pop();
                              const randomId = Math.floor(Math.random() * 10000);
                              const fileName = `${timestamp}_${randomId}.${ext}`;

                              const { data, error } = await supabase.storage.from("AD1").upload(fileName, file);
                              if (error) throw error;

                              const { data: publicUrlData } = supabase.storage.from("AD1").getPublicUrl(fileName);
                              const publicUrl = publicUrlData.publicUrl;

                              const isVideo = file.type.startsWith("video/");
                              const newAd = {
                                id: 1, // Defaulting to AD1 category
                                time: new Date().toISOString(),
                                text: publicUrl,
                                format: isVideo ? "Video" : "Image",
                                Approved: "true"
                              };

                              // RLS is disabled, use client directly
                              const { error: dbError } = await supabase
                                .from("your_name_table")
                                .insert([{
                                  id: 4,
                                  text: publicUrl,
                                  time: new Date().toISOString(),
                                  format: isVideo ? "Video" : "Image",
                                  Approved: "true"
                                }]);

                              if (dbError) throw dbError;


                              setAllApprovedAds(prev => [newAd, ...prev]);
                              await fetchAdTableLinks(); // Refresh to ensure UI is in sync

                              try { addSbToast("Media uploaded and approved!", "success"); } catch (err) { }
                            } catch (err) {
                              setCustomUploadError(err.message || "Upload failed");
                              console.error(err);
                            } finally {
                              setCustomUploadLoading(false);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ marginBottom: 20 }}>
            <div>
              <SectionTitle style={{ marginBottom: 4 }}>Ad Approval Queue</SectionTitle>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Review and launch your final approved creatives from the database.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                background: "var(--green-light)", padding: "8px 16px", borderRadius: "var(--radius-md)",
                border: "1px solid var(--green)", display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ fontSize: 18 }}>✓</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--green)", textTransform: "uppercase" }}>Approved</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>{allApprovedAds.length}</div>
                </div>
              </div>
            </div>
          </div>

          {allApprovedAds.length === 0 ? (
            <EmptyState
              title="No ads approved yet"
              description="Go to the 'Create Ad' tab to preview and approve your generated creatives. Once approved, they will appear here for final launch."
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
                          ↗ Full View & Details
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
                            transition: "transform 0.1s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
                          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        >
                          Launch to Facebook Ads Manager →
                        </button>
                      </div>
                    </Card>
                  );
                };

                const approvedVideos = allApprovedAds
                  .filter(ad => (ad.format || "").toLowerCase() === "video")
                  .sort((a, b) => new Date(b.time) - new Date(a.time));

                const approvedImages = allApprovedAds
                  .filter(ad => (ad.format || "").toLowerCase() !== "video")
                  .sort((a, b) => new Date(b.time) - new Date(a.time));

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12" style={{ padding: "0 20px" }}>
                    {/* Left Column: Videos */}
                    <div className="flex flex-col gap-4">
                      <SectionTitle style={{ marginBottom: 8, fontSize: 16 }}>Approved Videos</SectionTitle>
                      {approvedVideos.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {approvedVideos.map(renderApprovalCard)}
                        </div>
                      ) : (
                        <div style={{ padding: "30px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", color: "var(--text-dim)", fontSize: 13 }}>
                          No videos approved yet.
                        </div>
                      )}
                    </div>

                    {/* Right Column: Images */}
                    <div className="flex flex-col gap-4 relative">
                      {/* Vertical separator visible only on large screens */}
                      <div className="hidden lg:block absolute left-[-24px] top-0 bottom-0 w-[2px] bg-black" style={{ marginLeft: "-1px", borderRadius: "2px", opacity: 1 }}></div>

                      <SectionTitle style={{ marginBottom: 8, fontSize: 16 }}>Approved Images</SectionTitle>
                      {approvedImages.length > 0 ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          {approvedImages.map(renderApprovalCard)}
                        </div>
                      ) : (
                        <div style={{ padding: "30px", textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius-lg)", color: "var(--text-dim)", fontSize: 13 }}>
                          No images approved yet.
                        </div>
                      )}
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
          onSelect={(campaign) => setSelectedMetaCampaign(campaign)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════
          RUNNING CAMPAIGNS (LIVE META)
      ═══════════════════════════════════════════════════════ */}
      {tab === "live_campaigns" && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <SectionTitle style={{ marginBottom: 4 }}>Running Campaigns</SectionTitle>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Monitor and control your live Meta Ads. Run, pause, or delete individual ads.
              </div>
            </div>
            <button
              onClick={fetchLiveCampaigns}
              disabled={liveLoading}
              style={{ padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--border)", background: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
            >
              {liveLoading ? <Spinner size={12} /> : "↻"} Refresh Data
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
                style={{ padding: "16px 20px", background: "var(--surface)", borderBottom: expandedCampaigns.has(campaign.id) ? "1px solid var(--border-light)" : "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 18, color: "var(--primary)", transition: "transform 0.2s", transform: expandedCampaigns.has(campaign.id) ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{campaign.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>ID: {campaign.id} • {campaign.objective}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Badge
                    text={campaign.effective_status}
                    color={campaign.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                    bg={campaign.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                  />
                  <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditCampaign(campaign.id); }}
                      style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", fontSize: 10, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}
                    >Edit</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(campaign.id, "Campaign", "ACTIVE", "run"); }}
                      disabled={campaign.effective_status === "ACTIVE" || updatingStatusId === campaign.id}
                      style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--green)", background: campaign.effective_status === "ACTIVE" ? "var(--green-light)" : "transparent", color: "var(--green)", fontSize: 10, fontWeight: 800, cursor: campaign.effective_status === "ACTIVE" ? "default" : "pointer", opacity: updatingStatusId === campaign.id ? 0.5 : 1, transition: "all 0.2s" }}
                    >Run</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(campaign.id, "Campaign", "PAUSED", "pause"); }}
                      disabled={campaign.effective_status === "PAUSED" || updatingStatusId === campaign.id}
                      style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--amber)", background: campaign.effective_status === "PAUSED" ? "var(--amber-light)" : "transparent", color: "var(--amber)", fontSize: 10, fontWeight: 800, cursor: campaign.effective_status === "PAUSED" ? "default" : "pointer", opacity: updatingStatusId === campaign.id ? 0.5 : 1, transition: "all 0.2s" }}
                    >Pause</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(campaign.id, "Campaign", null, "delete"); }}
                      disabled={updatingStatusId === campaign.id}
                      style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--red-strong)", background: "transparent", color: "var(--red-strong)", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: updatingStatusId === campaign.id ? 0.5 : 1, transition: "all 0.2s" }}
                    >Delete</button>
                  </div>
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
                        style={{ padding: "12px 16px", background: "var(--surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 13, color: "var(--primary)", transition: "transform 0.2s", transform: expandedAdSets.has(adset.id) ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                          <span style={{ fontSize: 14, fontWeight: 600 }}>Set: {adset.name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <Badge
                            text={adset.effective_status}
                            color={adset.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                            bg={adset.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                          />
                          <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditAdSet(campaign.id, adset.id); }}
                              style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--primary)", background: "transparent", color: "var(--primary)", fontSize: 10, fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}
                            >Edit</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(adset.id, "AdSet", "ACTIVE", "run"); }}
                              disabled={adset.effective_status === "ACTIVE" || updatingStatusId === adset.id}
                              style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--green)", background: adset.effective_status === "ACTIVE" ? "var(--green-light)" : "transparent", color: "var(--green)", fontSize: 10, fontWeight: 800, cursor: adset.effective_status === "ACTIVE" ? "default" : "pointer", opacity: updatingStatusId === adset.id ? 0.5 : 1, transition: "all 0.2s" }}
                            >Run</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(adset.id, "AdSet", "PAUSED", "pause"); }}
                              disabled={adset.effective_status === "PAUSED" || updatingStatusId === adset.id}
                              style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--amber)", background: adset.effective_status === "PAUSED" ? "var(--amber-light)" : "transparent", color: "var(--amber)", fontSize: 10, fontWeight: 800, cursor: adset.effective_status === "PAUSED" ? "default" : "pointer", opacity: updatingStatusId === adset.id ? 0.5 : 1, transition: "all 0.2s" }}
                            >Pause</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(adset.id, "AdSet", null, "delete"); }}
                              disabled={updatingStatusId === adset.id}
                              style={{ padding: "4px 12px", borderRadius: "var(--radius-pill)", border: "1px solid var(--red-strong)", background: "transparent", color: "var(--red-strong)", fontSize: 10, fontWeight: 800, cursor: "pointer", opacity: updatingStatusId === adset.id ? 0.5 : 1, transition: "all 0.2s" }}
                            >Delete</button>
                          </div>
                        </div>
                      </div>

                      {/* Ad Set Body (Ads) */}
                      {expandedAdSets.has(adset.id) && (
                        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12, background: "var(--card-bg)" }}>
                          {adset.ads?.data?.length > 0 ? adset.ads.data.map(ad => {
                            const insights = ad.insights?.data?.[0] || {};
                            return (
                              <div key={ad.id} style={{ display: "flex", gap: 16, padding: 12, borderRadius: "var(--radius-sm)", background: "var(--surface)", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-sm)" }}>
                                {/* Ad Image/Thumbnail */}
                                <div style={{ width: 80, height: 80, borderRadius: "8px", background: "#000", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border-light)" }}>
                                  {ad.creative?.thumbnail_url ? (
                                    <img src={ad.creative.thumbnail_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 20 }}>🎬</div>
                                  )}
                                </div>

                                {/* Ad Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                                    <div>
                                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: "var(--text)" }}>{ad.name}</div>
                                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>ID: {ad.id}</div>
                                    </div>
                                    <Badge
                                      text={ad.effective_status}
                                      color={ad.effective_status === "ACTIVE" ? "var(--green)" : "var(--amber)"}
                                      bg={ad.effective_status === "ACTIVE" ? "var(--green-light)" : "var(--amber-light)"}
                                    />
                                  </div>

                                  {/* Metrics Row */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 mb-3 bg-[var(--card-bg)] p-2 md:p-3 rounded-lg border border-[var(--border-light)]">
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Spend</span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>${insights.spend || "0.00"}</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>CTR</span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{parseFloat(insights.inline_link_click_ctr || 0).toFixed(2)}%</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Clicks</span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{insights.clicks || "0"}</span>
                                    </div>
                                  </div>

                                  {/* Controls */}
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() => handleUpdateStatus(ad.id, "Ad", "ACTIVE", "run")}
                                      disabled={ad.effective_status === "ACTIVE" || updatingStatusId === ad.id}
                                      style={{ padding: "6px 16px", borderRadius: "var(--radius- pill)", border: "1.5px solid var(--green)", background: ad.effective_status === "ACTIVE" ? "var(--green-light)" : "transparent", color: "var(--green)", fontSize: 11, fontWeight: 800, cursor: ad.effective_status === "ACTIVE" ? "default" : "pointer", opacity: updatingStatusId === ad.id ? 0.5 : 1, transition: "all 0.2s" }}
                                    >
                                      Run
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(ad.id, "Ad", "PAUSED", "pause")}
                                      disabled={ad.effective_status === "PAUSED" || updatingStatusId === ad.id}
                                      style={{ padding: "6px 16px", borderRadius: "var(--radius-pill)", border: "1.5px solid var(--amber)", background: ad.effective_status === "PAUSED" ? "var(--amber-light)" : "transparent", color: "var(--amber)", fontSize: 11, fontWeight: 800, cursor: ad.effective_status === "PAUSED" ? "default" : "pointer", opacity: updatingStatusId === ad.id ? 0.5 : 1, transition: "all 0.2s" }}
                                    >
                                      Pause
                                    </button>
                                    <button
                                      onClick={() => handleUpdateStatus(ad.id, "Ad", null, "delete")}
                                      disabled={updatingStatusId === ad.id}
                                      style={{ padding: "6px 16px", borderRadius: "var(--radius-pill)", border: "1.5px solid var(--red-strong)", background: "transparent", color: "var(--red-strong)", fontSize: 11, fontWeight: 800, cursor: "pointer", opacity: updatingStatusId === ad.id ? 0.5 : 1, transition: "all 0.2s" }}
                                    >
                                      Delete
                                    </button>
                                  </div>
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
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 40 }}>
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
                )}
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
        <div className="animate-fade-in" style={{
          margin: "-40px",
          padding: "40px",
          minHeight: "calc(100vh - 100px)",
          borderRadius: "var(--radius-lg)"
        }}>
          <SocialDash />
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

        let jsonData = {};
        try {
          const raw = ad["json data"];
          jsonData = typeof raw === "string" ? JSON.parse(raw) : (raw || {});
        } catch (e) { console.error("JSON parse error:", e); }

        const isVid = (ad.format || "").toLowerCase() === "video";

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
              className="animate-in zoom-in-95 duration-300"
              style={{
                background: "var(--card-bg)", width: "100%", maxWidth: 900,
                borderRadius: "var(--radius-lg)", overflow: "hidden", display: "flex",
                flexDirection: "column", maxHeight: "90vh", boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                border: "1px solid var(--border)",
                position: "relative"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Retry Overlay */}
              {isRetryingAd && (
                <div style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 40
                }}>
                  <div style={{ width: "100%", maxWidth: 500, background: "#fff", padding: 30, borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "var(--text)" }}>Retry Generation</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
                      Provide specific instructions for the AI to improve this creative.
                    </div>
                    <textarea
                      autoFocus
                      placeholder="e.g. Make it more cinematic and focus on the artist's hands..."
                      value={retryPrompt}
                      onChange={(e) => setRetryPrompt(e.target.value)}
                      style={{
                        width: "100%", minHeight: 120, padding: 15, borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)", background: "var(--surface)",
                        fontSize: 14, outline: "none", color: "var(--text)", resize: "none", marginBottom: 20,
                        fontFamily: "inherit"
                      }}
                    />
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        onClick={() => setIsRetryingAd(false)}
                        style={{
                          flex: 1, padding: "12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--text)", fontWeight: 600, cursor: "pointer"
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRetryAdSubmit(ad)}
                        disabled={!retryPrompt || isRetryingSubmit}
                        style={{
                          flex: 1, padding: "12px", borderRadius: "var(--radius-md)", border: "none",
                          background: "var(--primary)", color: "#fff", fontWeight: 700, cursor: (retryPrompt && !isRetryingSubmit) ? "pointer" : "not-allowed",
                          opacity: (retryPrompt && !isRetryingSubmit) ? 1 : 0.6
                        }}
                      >
                        {isRetryingSubmit ? <Spinner size={14} /> : "Submit Retry →"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge
                    text={isVid ? "Video Ads" : "Image Ads"}
                    color={isVid ? "var(--primary)" : "var(--amber)"}
                    bg={isVid ? "var(--primary-light)" : "var(--amber-light)"}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>AD ID: {ad.id}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {!isEditingAd && !isRetryingAd && (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingAd(true);
                          const firstAd = jsonData.ad || jsonData.ads?.[0] || {};
                          setEditingAdData({
                            campaignName: jsonData.campaign?.name || "Untitled Campaign",
                            adName: firstAd.name || "Untitled Ad",
                            headline: firstAd.headline || "No headline provided.",
                            ctaType: firstAd.call_to_action_type || "WATCH_MORE",
                            linkData: jsonData.link_data || ad.text || ""
                          });
                        }}
                        style={{
                          padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--primary)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4
                        }}
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => setIsRetryingAd(true)}
                        style={{
                          padding: "5px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
                          background: "var(--surface)", color: "var(--amber-dark)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 4
                        }}
                      >
                        ↻ Retry
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedAdForDetails(null); setIsEditingAd(false); setIsRetryingAd(false); setRetryPrompt(""); }}
                    style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "var(--text-dim)", marginLeft: 8 }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Media Column */}
                <div className="w-full lg:w-[40%] bg-[#000] flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[var(--border-light)] min-h-[300px]">
                  {isVid ? (
                    <video src={ad.text} controls autoPlay={false} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <img src={ad.text} alt="Ad detail" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  )}
                </div>

                {/* Info Column */}
                <div className="w-full lg:w-[60%] p-4 lg:p-6 overflow-y-auto flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Campaign Name</label>
                      {isEditingAd ? (
                        <input
                          value={editingAdData.campaignName}
                          onChange={(e) => setEditingAdData({ ...editingAdData, campaignName: e.target.value })}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--primary)", background: "var(--card-bg)", fontSize: 14, fontWeight: 600, outline: "none"
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{jsonData.campaign?.name || "Untitled Campaign"}</div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Ad Name</label>
                      {isEditingAd ? (
                        <input
                          value={editingAdData.adName}
                          onChange={(e) => setEditingAdData({ ...editingAdData, adName: e.target.value })}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--primary)", background: "var(--card-bg)", fontSize: 14, fontWeight: 600, outline: "none"
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-body)" }}>{jsonData.ad?.name || jsonData.ads?.[0]?.name || "Untitled Ad"}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Ad Headline</label>
                    {isEditingAd ? (
                      <textarea
                        value={editingAdData.headline}
                        onChange={(e) => setEditingAdData({ ...editingAdData, headline: e.target.value })}
                        style={{
                          width: "100%", minHeight: 80, padding: 12, borderRadius: "var(--radius-md)",
                          border: "1px solid var(--primary)", background: "var(--card-bg)", fontSize: 14, lineHeight: 1.6, outline: "none", resize: "vertical"
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", background: "var(--surface)", padding: 12, borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
                        {jsonData.ad?.headline || jsonData.ads?.[0]?.headline || jsonData.description || "No headline provided."}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Call to Action (Type)</label>
                      {isEditingAd ? (
                        <select
                          value={editingAdData.ctaType}
                          onChange={(e) => {
                            const newCta = e.target.value;
                            const suggestions = {
                              WHATSAPP_MESSAGE: "+10000000000",
                              CONTACT_US: "https://togahh.com/contact",
                              MESSAGE_PAGE: "https://m.me/togahh",
                            };
                            setEditingAdData({ 
                              ...editingAdData, 
                              ctaType: newCta,
                              linkData: suggestions[newCta] || "https://togahh.com/"
                            });
                          }}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--primary)", background: "var(--card-bg)", fontSize: 13, fontWeight: 600, outline: "none"
                          }}
                        >
                          <option value="WATCH_MORE">WATCH_MORE</option>
                          <option value="LEARN_MORE">LEARN_MORE</option>
                          <option value="BOOK_NOW">BOOK_NOW</option>
                          <option value="SHOP_NOW">SHOP_NOW</option>
                          <option value="SIGN_UP">SIGN_UP</option>
                          <option value="CONTACT_US">CONTACT_US</option>
                          <option value="APPLY_NOW">APPLY_NOW</option>
                          <option value="GET_OFFER">GET_OFFER</option>
                          <option value="WHATSAPP_MESSAGE">WHATSAPP_MESSAGE</option>
                          <option value="MESSAGE_PAGE">MESSAGE_PAGE</option>
                        </select>
                      ) : (
                        <div style={{
                          display: "inline-block", padding: "6px 12px", background: "var(--primary-light)",
                          color: "var(--primary)", borderRadius: "var(--radius-pill)", fontSize: 13, fontWeight: 600
                        }}>
                          {jsonData.ad?.call_to_action_type || jsonData.ads?.[0]?.call_to_action_type || jsonData.cta || "WATCH_MORE"}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Media Link / Link Data</label>
                      {isEditingAd ? (
                        <input
                          value={editingAdData.linkData}
                          onChange={(e) => setEditingAdData({ ...editingAdData, linkData: e.target.value })}
                          style={{
                            width: "100%", padding: "8px 12px", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--primary)", background: "var(--card-bg)", fontSize: 13, outline: "none"
                          }}
                        />
                      ) : (
                        <a href={jsonData.link_data || jsonData.link || ad.text} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                          {(jsonData.link_data || jsonData.link || ad.text) ? "View Link ↗" : "N/A"}
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
                          disabled={ad.Approved || approvingId === (ad.id + "_" + ad.time)}
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

    </div>
  );
}
