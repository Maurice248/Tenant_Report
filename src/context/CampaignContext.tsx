"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Campaign {
  campaignId: string;
  campaignName: string;
  templateId: string;
  subscribers: string;
  dailyLimit: number;
  createdAt: string;
}

interface CampaignContextValue {
  history: Campaign[];
  addCampaign: (c: Campaign) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = "campaign_history";

const CampaignContext = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Campaign[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const addCampaign = (c: Campaign) => {
    setHistory((prev) => {
      const updated = [c, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <CampaignContext.Provider value={{ history, addCampaign, clearHistory }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaigns() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaigns must be used within CampaignProvider");
  return ctx;
}
