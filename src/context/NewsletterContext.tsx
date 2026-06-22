"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Status = "idle" | "loading" | "success" | "rejected" | "regenerating" | "proceeding" | "proceeded" | "error";

export interface NewsletterData {
  subjectLine?: string;
  preheader?: string;
  headerTitle?: string;
  intro?: string;
  mainStory?: string;
  keyInsights?: string;
  industryUpdate?: string;
  proTip?: string;
  callToAction?: string;
  closing?: string;
  footerNote?: string;
  output?: string;
  content?: string;
  newsletter?: string;
}

interface NewsletterState {
  selectedService: string;
  topic: string;
  status: Status;
  newsletter: NewsletterData | null;
  rawFallback: string;
  errorMessage: string;
  retryPrompt: string;
  templateId: string;
  setSelectedService: (v: string) => void;
  setTopic: (v: string) => void;
  setStatus: (v: Status) => void;
  setNewsletter: (v: NewsletterData | null) => void;
  setRawFallback: (v: string) => void;
  setErrorMessage: (v: string) => void;
  setRetryPrompt: (v: string) => void;
  setTemplateId: (v: string) => void;
  reset: () => void;
}

const NewsletterContext = createContext<NewsletterState | null>(null);

export function NewsletterProvider({ children }: { children: ReactNode }) {
  const [selectedService, setSelectedService] = useState("");
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [newsletter, setNewsletter] = useState<NewsletterData | null>(null);
  const [rawFallback, setRawFallback] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryPrompt, setRetryPrompt] = useState("");
  const [templateId, setTemplateId] = useState("");

  const reset = () => {
    setStatus("idle");
    setNewsletter(null);
    setRawFallback("");
    setSelectedService("");
    setTopic("");
    setRetryPrompt("");
    setTemplateId("");
    setErrorMessage("");
  };

  return (
    <NewsletterContext.Provider value={{
      selectedService, topic, status, newsletter, rawFallback,
      errorMessage, retryPrompt, templateId,
      setSelectedService, setTopic, setStatus, setNewsletter,
      setRawFallback, setErrorMessage, setRetryPrompt, setTemplateId,
      reset,
    }}>
      {children}
    </NewsletterContext.Provider>
  );
}

export function useNewsletter() {
  const ctx = useContext(NewsletterContext);
  if (!ctx) throw new Error("useNewsletter must be used within NewsletterProvider");
  return ctx;
}
