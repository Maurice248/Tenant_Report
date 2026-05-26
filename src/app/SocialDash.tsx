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
import ImagePromptModal from './ImagePromptModal';

const medicalBlue = "#0284c7";
const medicalTeal = "#0d9488";

const findScenesRecursively = (obj: any): any[] => {
  if (!obj) return [];
  let allScenes: any[] = [];
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      allScenes = allScenes.concat(findScenesRecursively(item));
    }
  } else if (typeof obj === 'object') {
    if (obj.scenes && Array.isArray(obj.scenes)) {
      allScenes = allScenes.concat(obj.scenes);
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && key !== 'scenes') {
        allScenes = allScenes.concat(findScenesRecursively(obj[key]));
      }
    }
  }
  return allScenes;
};

interface ToastState {
  message: string;
  type: string;
}

export default function SocialDash() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showRetryModal, setShowRetryModal] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [generatedScenes, setGeneratedScenes] = useState<any[]>([]);
  const [acceptedStory, setAcceptedStory] = useState<string | null>(null);
  const [lastInputs, setLastInputs] = useState<any>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationType, setGenerationType] = useState<'video' | 'images' | null>(null);
  const prevStatusRef = useRef<string | undefined>(undefined); // tracks previous status to detect transitions
  const hasTriggeredInSession = useRef<boolean>(false);

  // ── Clear progress from localStorage on page load (so refresh removes it) ──
  useEffect(() => {
    localStorage.removeItem('sd_generation_start');
  }, []);

  // ── Poll for global n8n errors ──
  useEffect(() => {
    let active = true;

    const checkErrors = async () => {
      try {
        const res = await fetch('/api/notifications/error');
        if (res.ok) {
          const data = await res.json();
          if (data && data.message && active) {
            setErrorNotification(data.message);
          }
        }
      } catch (err) {
        console.error("[UI] Error checking notifications:", err);
      }
    };

    // Check instantly on mount
    checkErrors();

    // Check every 4 seconds
    const interval = setInterval(checkErrors, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
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

  // Timer logic for progress bar (max 6 minutes = 360s for video, 60s for images)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      const MAX_TIME = generationType === 'images' ? 60 : 360; // seconds
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
  }, [isGenerating, generationType]);

  // Monitor status to trigger video preview refresh only (completely decoupled from prompt/image loading progress)
  useEffect(() => {
    const isDone = status?.toLowerCase().includes("successfully") || status?.toLowerCase().includes("completed");
    const prevIsDone = prevStatusRef.current?.toLowerCase().includes("successfully") || prevStatusRef.current?.toLowerCase().includes("completed");
    const isFirstLoad = prevStatusRef.current === undefined;

    if (isDone && !isFirstLoad && !prevIsDone) {
      // ✅ Status changed to done (e.g. video created successfully) — refresh preview
      handleRefreshPreview();
      showToast("Video preview updated!", "success");
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
    setShowImageModal(true);
  };

  const handleImagePromptSubmit = async (prompt: string) => {
    setShowImageModal(false);
    setStatus("Generating images...");
    setIsGenerating(true);
    setGenerationType('images');
    setProgress(0);
    hasTriggeredInSession.current = true;

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_IMAGE_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/1703fb64-ec58-4e56-9ce7-bd9e16e15220";
    const result = await triggerWebhook(
      webhookUrl,
      "images",
      "Images generated successfully!",
      { prompt, text: prompt },
      "POST"
    );

    if (result) {
      setProgress(100);
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationType(null);
      }, 1000);
    } else {
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const handleManualTrigger = () => {
    setIsGenerating(true);
    setProgress(0);
    hasTriggeredInSession.current = true;
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
    setGeneratedScenes([]);
  };

  const handleModalSubmit = async (data: any) => {
    console.log("[UI] Modal submitted with data:", data);
    setShowModal(false);
    setLastInputs(data);
    setGeneratedScenes([]);

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
    const backupStory = generatedStory;
    setGeneratedStory(null); // Clear immediately as requested
    setGeneratedScenes([]);
    setAcceptedStory(null); // Clear any previous accepted story
    
    // Start progress bar loader immediately on click
    setIsGenerating(true);
    setGenerationType('video');
    setProgress(0);
    hasTriggeredInSession.current = true;
    localStorage.setItem('sd_generation_start', Date.now().toString()); // ── Persist start time
    setStatus("Accepting story and generating prompts...");

    const webhookUrl = process.env.NEXT_PUBLIC_N8N_SOCIAL_ACCEPT_URL || "https://n8n.srv1208919.hstgr.cloud/webhook/81f0d39d-6344-421a-b3a2-019b2c737483";
    const result = await triggerWebhook(
      webhookUrl,
      "accept",
      "Story accepted and saved!",
      { ...lastInputs, generated_story: backupStory, status: "accepted" }
    );

    console.log("[UI] handleAcceptStory result:", result);

    const scenes = findScenesRecursively(result) || [];

    const isAccepted = (scenes && scenes.length > 0) || (
      Array.isArray(result)
        ? (result[0]?.body?.status === "accepted" || result[0]?.status === "accepted" || (result[0]?.body && result[0].body.status === "accepted") || (result[0] && result[0].status === "accepted"))
        : (result?.body?.status === "accepted" || result?.status === "accepted" || (result?.body && result.body.status === "accepted") || (result && result.status === "accepted"))
    );

    if (isAccepted && scenes && scenes.length > 0) {
      console.log("[UI] Story accepted, scenes returned directly from webhook response. Rendering.");
      setGeneratedScenes(scenes);
      setAcceptedStory(backupStory); // Retain accepted story text
      setProgress(100);
      setTimeout(() => {
        setIsGenerating(false);   // Turn off loader since prompts are ready on UI
        setGenerationType(null);
      }, 1000);
    } else {
      if (isAccepted) {
        console.warn("[UI] Story accepted but no scenes returned in webhook response. Decoupling progress check.");
      } else {
        console.warn("[UI] Accept webhook failed or was rejected.");
      }
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const handleConfirmPrompts = async () => {
    // Start progress bar loader immediately on click
    setIsGenerating(true);
    setGenerationType('video');
    setProgress(0);
    hasTriggeredInSession.current = true;
    localStorage.setItem('sd_generation_start', Date.now().toString()); // ── Persist start time
    setStatus("Generating your social video preview...");

    const webhookUrl = "https://n8n.srv1208919.hstgr.cloud/webhook/c44e7bac-b0db-43a7-96d3-8b2a3f483885";
    console.log("[UI] Confirming prompts to:", webhookUrl);
    
    // Trigger webhook which will only respond at the very end when video is done
    const result = await triggerWebhook(
      webhookUrl,
      "confirm",
      "Video created successfully!",
      {
        story: acceptedStory,
        scenes: generatedScenes,
        status: "confirmed"
      },
      "POST"
    );

    if (result) {
      console.log("[UI] Prompts confirmed and video created successfully:", result);
      setProgress(100);
      handleRefreshPreview();
      setTimeout(() => {
        setIsGenerating(false);   // Turn off loader since video is ready
        setGenerationType(null);
      }, 1000);
    } else {
      console.warn("[UI] Confirm prompts webhook failed.");
      setIsGenerating(false);
      setGenerationType(null);
    }
  };

  const handleRetrySubmit = async (retryPrompt: string) => {
    setShowRetryModal(false);
    setGeneratedScenes([]);
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
              <h2 className="sd-card-title">Video Generation</h2>
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
                  : <><Settings size={14} /> Video Generation</>}
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
                <h2 className="sd-card-title">
                  {generationType === 'images' ? 'Image Generation in Progress' : 'Video Generation in Progress'}
                </h2>
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
                  {generationType === 'images'
                    ? 'System is currently generating your social images. This may take up to a minute.'
                    : 'System is currently processing your request. The preview will update automatically.'}
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

          {generatedScenes && generatedScenes.length > 0 && (
            <div className="sd-action-card sd-action-card-success animate-fade-in" style={{ paddingBottom: 0 }}>
              <div className="sd-card-head" style={{ borderBottom: '1px solid #dcfce7', paddingBottom: 16 }}>
                <div className="sd-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <ImageIcon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 className="sd-card-title">Generated Ad Scenes</h2>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Inspect and edit your scaled image and video scenario prompts.
                  </p>
                </div>
                <Badge text={`${generatedScenes.length} scenes`} color="#16a34a" bg="#f0fdf4" />
              </div>
              <div className="sd-card-inner" style={{ padding: 0, background: '#ffffff' }}>
                <div style={{ display: "grid", gridTemplateColumns: "44px 1.1fr 1.3fr 1.3fr", padding: "10px 20px", background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>#</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em", paddingRight: 16 }}>📖 Voiceover Storyline</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em", paddingRight: 16 }}>🖼️ Image Prompt</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 16 }}>🎬 Video Scenario</div>
                </div>

                <div style={{ overflowY: "auto", maxHeight: "450px" }}>
                  {generatedScenes.map((scene: any, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "44px 1.1fr 1.3fr 1.3fr", borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      {/* Scene number */}
                      <div style={{ padding: "16px 8px", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 18 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 24, height: 24, borderRadius: "50%",
                          background: "#0284c7",
                          color: "#fff", fontSize: 11, fontWeight: 800
                        }}>{scene.scene}</span>
                      </div>

                      {/* Storyline / Story Sentence — editable */}
                      <div style={{ padding: "12px 12px 12px 0", borderRight: "1px solid #e2e8f0" }}>
                        <textarea
                          value={scene.story_sentence || ""}
                          onChange={(e) => {
                            setGeneratedScenes((prev: any[]) => {
                              const arr = [...prev];
                              arr[i] = { ...arr[i], story_sentence: e.target.value };
                              return arr;
                            });
                          }}
                          rows={4}
                          style={{
                            width: "100%", fontSize: 11, color: "#15803d", fontWeight: 500, lineHeight: 1.75,
                            border: "1.5px solid #dcfce7",
                            borderRadius: 8, padding: "10px 12px",
                            resize: "vertical", fontFamily: "inherit", outline: "none",
                            background: "#f0fdf4", transition: "border 0.15s",
                          }}
                          onFocus={e => e.target.style.borderColor = "#16a34a"}
                          onBlur={e => e.target.style.borderColor = "#dcfce7"}
                          placeholder="No voiceover storyline sentence..."
                        />
                      </div>

                      {/* Image Prompt — editable */}
                      <div style={{ padding: "12px 12px 12px 12px", borderRight: "1px solid #e2e8f0" }}>
                        <textarea
                          value={scene.prompt || ""}
                          onChange={(e) => {
                            setGeneratedScenes((prev: any[]) => {
                              const arr = [...prev];
                              arr[i] = { ...arr[i], prompt: e.target.value };
                              return arr;
                            });
                          }}
                          rows={4}
                          style={{
                            width: "100%", fontSize: 11, color: "#334155", lineHeight: 1.75,
                            border: "1.5px solid #e2e8f0",
                            borderRadius: 8, padding: "10px 12px",
                            resize: "vertical", fontFamily: "inherit", outline: "none",
                            background: "#f8fafc", transition: "border 0.15s",
                          }}
                          onFocus={e => e.target.style.borderColor = "#0284c7"}
                          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                          placeholder="No image prompt..."
                        />
                      </div>

                      {/* Video Scenario — editable */}
                      <div style={{ padding: "12px 12px" }}>
                        <textarea
                          value={scene.video_scenario || ""}
                          onChange={(e) => {
                            setGeneratedScenes((prev: any[]) => {
                              const arr = [...prev];
                              arr[i] = { ...arr[i], video_scenario: e.target.value };
                              return arr;
                            });
                          }}
                          rows={4}
                          style={{
                            width: "100%", fontSize: 11, lineHeight: 1.75,
                            color: "#6d28d9",
                            border: "1.5px solid #e2e8f0",
                            borderRadius: 8, padding: "10px 12px",
                            resize: "vertical", fontFamily: "inherit", outline: "none",
                            background: "#f5f3ff", transition: "border 0.15s",
                          }}
                          onFocus={e => e.target.style.borderColor = "#7c3aed"}
                          onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                          placeholder="No video scenario..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer bar with Confirm Prompts button */}
                <div style={{
                  padding: "14px 20px",
                  borderTop: "1.5px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  background: "#f8fafc",
                  borderBottomLeftRadius: 12,
                  borderBottomRightRadius: 12
                }}>
                  <button
                    className="sd-btn-primary"
                    style={{
                      width: "auto",
                      padding: "10px 24px",
                      background: `linear-gradient(135deg, ${medicalBlue}, ${medicalTeal})`,
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8
                    }}
                    onClick={handleConfirmPrompts}
                    disabled={loading === 'confirm'}
                  >
                    {loading === 'confirm' ? (
                      <><Spinner size={14} color="white" /> Confirming...</>
                    ) : (
                      <><CheckCircle2 size={14} /> Confirm Prompts</>
                    )}
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

      <ImagePromptModal 
        isOpen={showImageModal}
        onOpenChange={setShowImageModal}
        onSubmit={handleImagePromptSubmit}
        loading={loading === 'images'}
      />

      {errorNotification && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(239, 68, 68, 0.1)',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              margin: '20px',
              borderTop: '4px solid #ef4444',
              animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div 
                style={{
                  background: '#fef2f2',
                  borderRadius: '50%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1e293b',
                    margin: '0 0 8px 0',
                    lineHeight: '1.25'
                  }}
                >
                  Workflow Execution Error
                </h3>
                <p 
                  style={{
                    fontSize: '13px',
                    color: '#64748b',
                    margin: '0 0 20px 0',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {errorNotification}
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={async () => {
                  setErrorNotification(null);
                  try {
                    await fetch('/api/notifications/error', { method: 'DELETE' });
                  } catch (err) {
                    console.error("[UI] Failed to clear error on server:", err);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  background: '#f1f5f9',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#1e293b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                Dismiss Error
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
