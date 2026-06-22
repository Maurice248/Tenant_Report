"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { NewsletterData } from "./NewsletterContext";

export interface NewsletterHistoryItem {
  id: string;
  service: string;
  topic: string;
  newsletter: NewsletterData | null;
  rawFallback: string;
  templateId: string;
  status: "generated" | "proceeded";
  createdAt: string;
}

interface HistoryContextValue {
  history: NewsletterHistoryItem[];
  addEntry: (entry: Omit<NewsletterHistoryItem, "createdAt">) => void;
  updateEntry: (id: string, patch: Partial<NewsletterHistoryItem>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = "newsletter_history";

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function NewsletterHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<NewsletterHistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const save = (items: NewsletterHistoryItem[]) => {
    setHistory(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  };

  const addEntry = (entry: Omit<NewsletterHistoryItem, "createdAt">) => {
    const newItem: NewsletterHistoryItem = {
      ...entry,
      createdAt: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const updateEntry = (id: string, patch: Partial<NewsletterHistoryItem>) => {
    setHistory((prev) => {
      const updated = prev.map((item) => item.id === id ? { ...item, ...patch } : item);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const removeEntry = (id: string) => {
    save(history.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    save([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <HistoryContext.Provider value={{ history, addEntry, updateEntry, removeEntry, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useNewsletterHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useNewsletterHistory must be used within NewsletterHistoryProvider");
  return ctx;
}
