"use client";

import { useState } from "react";
import { useCampaigns, Campaign } from "@/context/CampaignContext";
import { useN8nWebhooks, n8nUrl } from "@/hooks/use-n8n-webhooks";
import "./newsletter.css";

const SUBSCRIBER_OPTIONS = ["50", "150", "200", "All Subscribers"];
const DAILY_LIMIT_OPTIONS = [30, 40, 50, 60, 70, 80, 90, 100];

type Status = "idle" | "loading" | "success" | "error";

export default function CreateCampaign() {
  const { history, addCampaign, clearHistory } = useCampaigns();
  const n8nWebhooks = useN8nWebhooks();

  const [templateId, setTemplateId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [subscribers, setSubscribers] = useState("");
  const [dailyLimit, setDailyLimit] = useState<number | "">("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastCampaignId, setLastCampaignId] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const canSubmit =
    templateId.trim() && campaignName.trim() && subscribers && dailyLimit !== "";

  const handleCreate = async () => {
    if (!canSubmit) return;
    setStatus("loading");
    setErrorMessage("");

    try {
      const webhookUrl = n8nUrl(n8nWebhooks, "NEXT_PUBLIC_N8N_CAMPAIGN_WEBHOOK_URL");
      let campaignId = "";

      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId: templateId.trim(), campaignName: campaignName.trim(), subscribers, dailyLimit }),
        });
        if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
        const raw = await res.json();
        const data = Array.isArray(raw) ? raw[0] : raw;
        campaignId = data?.["campaign id"] || data?.campaignId || data?.campaign_id || data?.id || "";
      }

      const campaign: Campaign = {
        campaignId,
        campaignName: campaignName.trim(),
        templateId: templateId.trim(),
        subscribers,
        dailyLimit: dailyLimit as number,
        createdAt: new Date().toISOString(),
      };

      addCampaign(campaign);
      setLastCampaignId(campaignId);
      setStatus("success");
      setTemplateId("");
      setCampaignName("");
      setSubscribers("");
      setDailyLimit("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="nl-root">
      <div className="nl-grid nl-grid-2">

        {/* ---- Left: form ---- */}
        <div className="nl-panel nl-panel-body flex flex-col gap-5">

          <div className="space-y-2">
            <label className="nl-label">Template ID <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              placeholder="Paste the generated template ID..."
              className="nl-input font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="nl-label">Campaign Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. Weekly Tenant Screening Update..."
              className="nl-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="nl-label">Subscribers <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={subscribers}
                  onChange={(e) => setSubscribers(e.target.value)}
                  className="nl-select appearance-none pr-10"
                >
                  <option value="" disabled>Select group</option>
                  {SUBSCRIBER_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt === "All Subscribers" ? "All Subscribers" : `${opt} Subscribers`}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <label className="nl-label">Daily Limit <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Number(e.target.value))}
                  className="nl-select appearance-none pr-10"
                >
                  <option value="" disabled>Select limit</option>
                  {DAILY_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} emails / day</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!canSubmit || status === "loading"}
            className="nl-btn-primary mt-1"
          >
            {status === "loading" ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Launching...</>
            ) : (
              <><span>🚀</span> Launch Campaign</>
            )}
          </button>

          {status === "success" && (
            <div className="nl-alert-success border-l-4 border-l-green-600 rounded-r-xl mt-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-base font-black text-green-900">MISSION SUCCESS</p>
              </div>
              {lastCampaignId && (
                <div className="bg-white border border-green-200 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Campaign ID</p>
                    <p className="text-sm font-mono font-bold text-gray-900 truncate">{lastCampaignId}</p>
                  </div>
                  <button onClick={() => handleCopyId(lastCampaignId)} className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-black text-green-700 hover:bg-green-100 transition-all">
                    {copiedId === lastCampaignId ? "COPIED" : "COPY"}
                  </button>
                </div>
              )}
            </div>
          )}

          {status === "error" && (
            <div className="nl-alert-error border-l-4 border-l-red-600 rounded-r-xl mt-1">
              <p className="text-sm font-black text-red-900 uppercase mb-1">Launch Aborted</p>
              <p className="text-sm font-medium text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* ---- Right: History ---- */}
        <div className="nl-panel flex flex-col min-h-[480px] overflow-hidden">
          <div className="nl-panel-header">
            <div className="flex items-center gap-3">
              <h3 className="nl-panel-title">Command History</h3>
              <span className="nl-count-badge">{history.length}</span>
            </div>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-xs font-black uppercase text-gray-400 hover:text-red-600 transition-colors underline underline-offset-2">
                Wipe Logs
              </button>
            )}
          </div>

          <div className="flex-1 p-5 overflow-y-auto">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-16">
                <div className="w-16 h-16 border-4 border-gray-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm font-black uppercase tracking-widest">No Data Logs Found</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((c) => (
                  <div key={c.campaignId || c.createdAt} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{formatDate(c.createdAt)}</p>
                        <h4 className="text-base font-black text-gray-900 truncate uppercase">{c.campaignName}</h4>
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                        <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase">{c.subscribers}</span>
                        <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded uppercase">{c.dailyLimit}/day</span>
                      </div>
                    </div>
                    {c.campaignId && (
                      <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <span className="text-[10px] font-black uppercase text-gray-400 shrink-0">ID:</span>
                        <code className="text-xs font-mono font-bold truncate flex-1 text-gray-700">{c.campaignId}</code>
                        <button onClick={() => handleCopyId(c.campaignId)} className="shrink-0 text-indigo-600 hover:text-gray-900 font-black text-[10px] uppercase transition-colors">
                          {copiedId === c.campaignId ? "Copied" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
