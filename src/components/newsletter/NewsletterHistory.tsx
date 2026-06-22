"use client";

import { useState } from "react";
import { useNewsletterHistory, NewsletterHistoryItem } from "@/context/NewsletterHistoryContext";
import EmailPreview from "./EmailPreview";
import "./newsletter.css";

const formatDate = (id: string) => {
  try {
    const timestamp = parseInt(id);
    if (isNaN(timestamp)) return "Recently";
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Recently";
  }
};

function StatusBadge({ status }: { status: NewsletterHistoryItem["status"] }) {
  if (status === "proceeded") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[11px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Delivered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-bold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
      Draft
    </span>
  );
}

function HistoryItem({ item, onRemove }: { item: NewsletterHistoryItem; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (item.templateId) {
      navigator.clipboard.writeText(item.templateId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="nl-history-item">
      <div className="nl-history-row">
        <div className="nl-history-icon">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="nl-history-topic truncate">{item.topic}</h4>
            <StatusBadge status={item.status} />
          </div>
          <div className="nl-history-meta">
            <span className="uppercase tracking-widest text-[10px] text-gray-300 font-black mr-1">Specialty:</span>
            {item.service}
          </div>
        </div>

        <div className="min-w-[140px]">
          <div className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Created At</div>
          <div className="text-xs font-semibold text-gray-500">{formatDate(item.id)}</div>
        </div>

        <div className="nl-history-actions">
          {item.templateId && (
            <button
              onClick={handleCopy}
              className={`nl-btn-view ${copied ? "!bg-green-50 !text-green-600" : "!bg-white !text-indigo-600 border border-indigo-100"}`}
            >
              {copied ? "✓ Copied" : "📋 Template ID"}
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className={`nl-btn-view ${expanded ? "open" : ""}`}
          >
            {expanded ? "Hide" : "View"}
          </button>

          <button onClick={onRemove} className="nl-btn-delete" title="Delete Record">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="nl-history-expanded animate-in fade-in duration-300">
          {item.newsletter ? (
            <div className="max-w-4xl mx-auto">
              <EmailPreview data={item.newsletter} />
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap font-serif leading-relaxed text-sm shadow-inner max-w-4xl mx-auto">
              {item.rawFallback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewsletterHistory() {
  const { history, removeEntry } = useNewsletterHistory();
  const [filter, setFilter] = useState<"all" | "drafts" | "sent">("all");

  const counts = {
    all: history.length,
    drafts: history.filter(h => h.status === "generated").length,
    sent: history.filter(h => h.status === "proceeded").length,
  };

  const filtered = history.filter((item) => {
    if (filter === "all") return true;
    if (filter === "drafts") return item.status === "generated";
    if (filter === "sent") return item.status === "proceeded";
    return false;
  });

  return (
    <div className="nl-root">

      {/* Filter tabs */}
      <div className="nl-filter-bar">
        {["all", "drafts", "sent"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as "all" | "drafts" | "sent")}
            className={`nl-filter-btn ${filter === f ? "active" : ""}`}
          >
            {f}
            <span className="ml-2 bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded text-[11px] font-black">
              {counts[f as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* History card */}
      <div className="nl-panel overflow-hidden">
        <div className="nl-panel-header">
          <div className="flex items-center gap-3">
            <h3 className="nl-panel-title">Communication History</h3>
            <span className="nl-count-badge">{counts.all}</span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">No Records Found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or generate a new newsletter.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onRemove={() => removeEntry(item.id)}
              />
            ))
          )}
        </div>
      </div>

    </div>
  );
}
