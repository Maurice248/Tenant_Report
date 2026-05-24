"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Clapperboard,
  Image as ImageIcon,
  Share2,
  Play,
  Zap,
  Settings,
  Loader2,
  CheckCircle2,
  Activity,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

import { Badge, Spinner } from './components';
import { socialSupabase } from '../lib/socialSupabase';
import GeneratorModal from './GeneratorModal';
import RetryModal from './RetryModal';

const medicalBlue = "#0284c7";
const medicalTeal = "#0d9488";

interface ToastState {
  message: string;
  type: string;
}

export default function SocialDash() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showRetryModal, setShowRetryModal] = useState<boolean>(false);
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [lastInputs, setLastInputs] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const prevStatusRef = useRef<string | undefined>(undefined); // tracks previous status to detect transitions

  // ── Restore progress from localStorage on page load ──
  useEffect(() => {
    const savedStartTime = localStorage.getItem('sd_generation_start');
    if (savedStartTime) {
      const elapsed = (Date.now() - parseInt(savedStartTime)) / 1000;
      const MAX_TIME = 360;
      if (elapsed < MAX_TIME) {
        const restoredProgress = Math.min((elapsed / MAX_TIME) * 100, 98);
        setIsGenerating(true);
        setProgress(restoredProgress);
      } else {
        // Timed out — clear stale storage
        localStorage.removeItem('sd_generation_start');
      }
    }
  }, []);

  useEffect(() => {
    const sampleUrl = "https://cdssxtquayzijmbnlqmt.supabase.co/storage/v1/object/public/n8n/finalbefore2.mp3";
    setVideoUrl(`${sampleUrl}?t=${Date.now()}`);

    const fetchStatus = async () => {
      try {
        const { data, error } = await socialSupabase
          .from('n8n')
          .select('status')
          .order('id', { ascending: false })
          .limit(1);

        if (error) { setStatus("Status Error"); }
        else if (data && data.length > 0) { setStatus(data[0].status); }
        else { setStatus("Waiting for Data..."); }
      } catch { setStatus("Connection Error"); }
    };

    fetchStatus();

    const channel = socialSupabase
      .channel('n8n-status-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'n8n' }, (payload: any) => {
        if (payload.new?.status) setStatus(payload.new.status);
      })
      .subscribe();

    return () => { socialSupabase.removeChannel(channel); };
  }, []);

  // Timer logic for progress bar (max 6 minutes = 360s)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      const MAX_TIME = 360; // seconds
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) {
            clearInterval(interval);
            return 98; // Stay at 98% until status changes to success
          }
          return prev + (100 / MAX_TIME);
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  // Monitor status to trigger refresh and progress completion
  useEffect(() => {
    const isDone = status?.toLowerCase().includes("successfully") || status?.toLowerCase().includes("completed");
    const prevIsDone = prevStatusRef.current?.toLowerCase().includes("successfully") || prevStatusRef.current?.toLowerCase().includes("completed");
    const isFirstLoad = prevStatusRef.current === undefined;

    if (isDone && !isFirstLoad && !prevIsDone) {
      // ✅ Status genuinely JUST changed to done — real completion
      localStorage.removeItem('sd_generation_start');
      setProgress(100);
      setIsGenerating(false);
      handleRefreshPreview();
      if (progress > 0 && progress < 100) {
        showToast("Process completed successfully!", "success");
      }
    } else if (!isDone &&
      status &&
      status !== "Waiting for Data..." &&
      status !== "Status Error" &&
      status !== "Connection Error" &&
      status !== "Loading..." &&
      status !== "Generating images..." &&
      status !== "Images will be generated soon!"
    ) {
      if (!isGenerating) {
        setIsGenerating(true);
        setProgress(0);
        localStorage.setItem('sd_generation_start', Date.now().toString());
      }
    }

    prevStatusRef.current = status; // always update after checking
  }, [status]);

  const handleRefreshPreview = () => {
    const sampleUrl = "https://cdssxtquayzijmbnlqmt.supabase.co/storage/v1/object/public/n8n/finalbefore2.mp3";
    setVideoUrl(`${sampleUrl}?t=${Date.now()}`);
  };


  const showToast = (message: string, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerWebhook = async (url: string, label: string, successMessage: string, body: any = null, method = 'POST') => {
    setLoading(label);
    console.log(`[UI] Triggering webhook: ${url}`, { body, method });
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, body, method }),
      });

      console.log(`[UI] Proxy response status: ${response.status} ${response.statusText}`);

      const rawText = await response.text();
      console.log(`[UI] Raw proxy response:`, rawText.slice(0, 1000));

      let data: any;
      try { data = JSON.parse(rawText); }
      catch { data = rawText ? { message: rawText } : { status: 'ok' }; }

      if (response.ok) {
        showToast(successMessage, 'success');
        return data;
      } else {
        console.error(`[UI] Webhook failed:`, data);
        showToast(`Trigger failed: ${data?.error || response.statusText}`, 'info');
        return null;
      }
    } catch (err) {
      console.error("[UI] Webhook fetch error:", err);
      showToast("Trigger failed. Check browser console for details.", 'info');
      return null;
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateImages = () => {
    setStatus("Generating images...");
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_IMAGE_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/1703fb64-ec58-4e56-9ce7-bd9e16e15220";
    triggerWebhook(
      webhookUrl,
      "images",
      "Images will be generated soon!",
      null,
      "GET"
    );
  };

  const handleManualTrigger = () => {
    setIsGenerating(true);
    setProgress(0);
    localStorage.setItem('sd_generation_start', Date.now().toString()); // ── Persist start time
    setStatus("Starting video process...");
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_MANUAL_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/289d4090-ac38-4c90-9876-5ca765e46211";
    triggerWebhook(
      webhookUrl,
      "manual", "Video processing started. Check email!"
    );
  };

  const handleDynamicTrigger = () => {
    setShowModal(true);
  };

  const handleModalSubmit = async (data: any) => {
    console.log("[UI] Modal submitted with data:", data);
    setShowModal(false);
    setLastInputs(data);

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_DYNAMIC_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/7be28969-c4ad-404a-b982-841dda7133af";
    const result = await triggerWebhook(
      webhookUrl,
      "dynamic",
      "Spotlight Triggered!",
      data
    );

    console.log("[UI] handleModalSubmit result:", result);

    const story = Array.isArray(result)
      ? (result[0]?.output?.story || result[0]?.story)
      : (result?.output?.story || result?.story);

    console.log("[UI] Extracted story:", story ? story.slice(0, 100) : "NONE");

    if (story) {
      setGeneratedStory(story);
    } else {
      console.warn("[UI] No story found in result. Full result:", JSON.stringify(result));
    }
  };

  const handleAcceptStory = async () => {
    setGeneratedStory(null); // Clear immediately as requested
    setIsGenerating(true);   // Show timeline immediately
    setProgress(0);
    localStorage.setItem('sd_generation_start', Date.now().toString()); // ── Persist start time
    setStatus("Initiating workflow...");
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_ACCEPT_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/81f0d39d-6344-421a-b3a2-019b2c737483";
    await triggerWebhook(
      webhookUrl,
      "accept",
      "Story accepted and saved!",
      { ...lastInputs, generated_story: generatedStory, status: "accepted" }
    );
  };

  const handleRetrySubmit = async (retryPrompt: string) => {
    setShowRetryModal(false);
    const data = { ...lastInputs, retry_prompt: retryPrompt, status: "retry", generated_story: generatedStory };
    
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_RETRY_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/ddcfb213-9313-46e3-8270-dd603301c1bd";
    const result = await triggerWebhook(
      webhookUrl,
      "dynamic", 
      "Retry Triggered!",
      data
    );

    const story = Array.isArray(result) 
      ? (result[0]?.output?.story || result[0]?.story)
      : (result?.output?.story || result?.story);
    
    if (story) {
      setGeneratedStory(story);
    }
  };

  const handlePostVideo = () => {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_POST_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/8f91f8e3-d06f-4e73-a545-e18065750416";
    triggerWebhook(
      webhookUrl,
      "post", "Video posted to social media!"
    );
  };

  return (
    <div className="sd-root">

      {/* ---- Toast ---- */}
      {toast && (
        <div className="sd-toast">
          <div className="sd-toast-inner" style={{ borderLeftColor: toast.type === 'success' ? '#22c55e' : medicalBlue }}>
            {toast.type === 'success'
              ? <CheckCircle2 size={16} color="#22c55e" />
              : <Activity size={16} color={medicalBlue} />}
            {toast.message}
          </div>
        </div>
      )}

      {/* ---- Header ---- */}
      <header className="sd-header">
        <div>
          <h1 className="sd-header-title">Creator Studio</h1>
          <p className="sd-header-sub">Manage your social media content generation pipeline</p>
        </div>
        <div className="sd-badge-row">
          <Badge text="v2.0 Connected" color={medicalBlue} bg="var(--primary-light)" />
          <Badge text={status} color={status === "video created successfully" ? "var(--green)" : "var(--amber)"} bg={status === "video created successfully" ? "var(--green-light)" : "var(--amber-light)"} />
        </div>
      </header>


      {/* ---- Main grid ---- */}
      <div className="sd-grid">

        {/* ---- Left: Action cards ---- */}
        <div className="sd-left">

          {/* Social Image Creator */}
          <div className="sd-action-card sd-action-card-sky">
            <div className="sd-card-head">
              <div className="sd-card-icon sd-card-icon-sky">
                <ImageIcon size={20} />
              </div>
              <h2 className="sd-card-title">Social Image Creator</h2>
            </div>
            <div className="sd-card-inner">
              <div className="sd-card-inner-head">
                <span className="sd-card-inner-label">Auto-Scale</span>
                <Badge text="Instagram · FB · LI" color={medicalBlue} bg="var(--primary-light)" />
              </div>
              <p className="sd-card-inner-desc">
                Create professional visuals automatically scaled for all major social channels.
              </p>
              <button
                className="sd-btn-primary"
                onClick={handleGenerateImages}
                disabled={loading === 'images'}
                style={{ background: medicalBlue }}
              >
                {loading === 'images'
                  ? <><Spinner size={14} color="white" /> Processing...</>
                  : <><Zap size={14} /> Generate Social Images</>}
              </button>
            </div>
          </div>


          {/* Custom Spotlight */}
          <div className="sd-action-card sd-action-card-amber">
            <div className="sd-card-head">
              <div className="sd-card-icon sd-card-icon-amber">
                <Settings size={20} />
              </div>
              <h2 className="sd-card-title">Custom Spotlight</h2>
            </div>
            <div className="sd-card-inner">
              <div className="sd-card-inner-head">
                <span className="sd-card-inner-label">Manual Control</span>
                <Badge text="Custom" color="var(--amber)" bg="var(--amber-light)" />
              </div>
              <p className="sd-card-inner-desc">
                Input custom scripts, tones, and visual scenes for total creative control.
              </p>
              <button
                className="sd-btn-secondary"
                onClick={handleDynamicTrigger}
                disabled={loading === 'dynamic'}
              >
                {loading === 'dynamic'
                  ? <><Spinner size={14} /> Processing...</>
                  : <><Settings size={14} /> Dynamic Inputs</>}
              </button>
            </div>
          </div>

          {/* ---- Generation Progress Timeline ---- */}
          {isGenerating && (
            <div className="sd-action-card sd-action-card-success animate-fade-in">
              <div className="sd-card-head">
                <div className="sd-card-icon" style={{ background: '#f0fdfa', color: '#0d9488' }}>
                  <Zap size={20} />
                </div>
                <h2 className="sd-card-title">Generation in Progress</h2>
              </div>
              <div className="sd-card-inner">
                <div className="sd-timeline-header">
                  <span className="sd-timeline-label">Progress</span>
                  <span className="sd-timeline-value">{Math.round(progress)}%</span>
                </div>
                <div className="sd-timeline-bar">
                  <div className="sd-timeline-progress" style={{ width: `${progress}%` }} />
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                  System is currently processing your request. The preview will update automatically.
                </p>
              </div>
            </div>
          )}

          {/* Generated Story Output */}

          {generatedStory && (
            <div className="sd-action-card sd-action-card-success animate-fade-in">
              <div className="sd-card-head">
                <div className="sd-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <MessageSquare size={20} />
                </div>
                <h2 className="sd-card-title">Generated Story</h2>
              </div>
              <div className="sd-card-inner" style={{ background: '#ffffff', border: '1px solid #dcfce7' }}>
                <div className="sd-generated-text">
                  {loading === 'dynamic' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#64748b' }}>
                      <Spinner size={16} /> Generating new story...
                    </div>
                  ) : (
                    <textarea 
                      className="sd-story-textarea"
                      value={generatedStory}
                      onChange={(e) => setGeneratedStory(e.target.value)}
                      placeholder="Type or edit your story here..."
                    />
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button 
                    className="sd-btn-secondary" 
                    style={{ width: 'auto', fontSize: 12, padding: '8px 16px', background: '#f8fafc', color: '#1e293b' }}
                    onClick={() => setShowRetryModal(true)}
                  >
                    <RefreshCw size={14} /> Retry
                  </button>
                  <button 
                    className="sd-btn-primary" 
                    style={{ width: 'auto', fontSize: 12, padding: '8px 20px', background: '#16a34a' }}
                    onClick={handleAcceptStory}
                    disabled={loading === 'accept'}
                  >
                    {loading === 'accept' 
                      ? <><Spinner size={14} color="white" /> Processing...</> 
                      : <><CheckCircle2 size={14} /> Accept Story</>}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ---- Right: Preview panel ---- */}
        <div className="sd-right">
          <div className="sd-preview-panel">

            {/* Panel header */}
            <div className="sd-preview-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="sd-live-dot" />
                <span className="sd-preview-label">System Preview Output</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  className="sd-btn-refresh-small" 
                  onClick={handleRefreshPreview}
                  title="Refresh Preview"
                >
                  <RefreshCw size={14} />
                </button>
                <span className="sd-live-tag">Live Feed</span>
              </div>
            </div>


            {/* Video area */}
            <div className="sd-video-area">
              {videoUrl ? (
                <video ref={videoRef} src={videoUrl} controls>
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="sd-video-placeholder">
                  <Loader2 size={36} color="#334155" style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: '#475569', fontSize: 13, fontWeight: 500 }}>Loading preview stream...</p>
                </div>
              )}
            </div>

            {/* Approval bar */}
            <div className="sd-approval-bar">
              <div>
                <p className="sd-approval-title">Final Creative Approval</p>
                <p className="sd-approval-sub">Ready to push this content to your active social channels?</p>
              </div>
              <button
                className="sd-btn-post"
                onClick={handlePostVideo}
                disabled={loading === 'post'}
                style={{ background: `linear-gradient(135deg, ${medicalBlue}, ${medicalTeal})` }}
              >
                {loading === 'post'
                  ? <Spinner color="white" size={16} />
                  : <><Share2 size={16} /> Post Now</>}
              </button>
            </div>

          </div>
        </div>

      </div>

      <GeneratorModal 
        isOpen={showModal} 
        onOpenChange={setShowModal} 
        onSubmit={handleModalSubmit}
        loading={loading === 'dynamic'}
      />

      <RetryModal 
        isOpen={showRetryModal}
        onOpenChange={setShowRetryModal}
        onSubmit={handleRetrySubmit}
        loading={loading === 'dynamic'}
      />
    </div>
  );
}
