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
import './social-dash.css';

const medicalBlue = "#0284c7";
const medicalTeal = "#0d9488";

export default function SocialDash() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const videoRef = useRef(null);
  const [status, setStatus] = useState("Loading...");
  const [showModal, setShowModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [generatedStory, setGeneratedStory] = useState(null);
  const [lastInputs, setLastInputs] = useState(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);


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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'n8n' }, (payload) => {
        if (payload.new?.status) setStatus(payload.new.status);
      })
      .subscribe();

    return () => { socialSupabase.removeChannel(channel); };
  }, []);

  // Timer logic for progress bar (max 6 minutes = 360s)
  useEffect(() => {
    let interval;
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
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Monitor status to trigger refresh and progress completion
  useEffect(() => {
    if (status === "video created successfully") {
      setProgress(100);
      setIsGenerating(false);
      handleRefreshPreview();
      showToast("Video created successfully!", "success");
    } else if (
      status && 
      status !== "Waiting for Data..." && 
      status !== "Status Error" && 
      status !== "Connection Error" && 
      status !== "video created successfully" &&
      status !== "Loading..." &&
      status !== "Generating images..." &&
      status !== "Images will be generated soon!"
    ) {
      if (!isGenerating) {
        setIsGenerating(true);
        setProgress(0);
      }
    }
  }, [status]);

  const handleRefreshPreview = () => {
    const sampleUrl = "https://cdssxtquayzijmbnlqmt.supabase.co/storage/v1/object/public/n8n/finalbefore2.mp3";
    setVideoUrl(`${sampleUrl}?t=${Date.now()}`);
  };


  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const triggerWebhook = async (url, label, successMessage, body = null, method = 'POST') => {
    setLoading(label);
    try {
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, body, method }),
      });
      if (response.ok) {
        showToast(successMessage, 'success');
        // Safely handle immediate or non-JSON responses
        const data = await response.json().catch(() => ({ status: 'ok' }));
        return data;
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(`Trigger failed: ${errorData.error || response.statusText}`, 'info');
        return null;
      }
    } catch (err) {
      console.error("Webhook Error:", err);
      showToast("Trigger failed. Check console for details.", 'info');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateImages = () => {
    setStatus("Generating images...");
    triggerWebhook(
      "https://n8n.srv1208919.hstgr.cloud/webhook/1703fb64-ec58-4e56-9ce7-bd9e16e15220",
      "images", 
      "Images will be generated soon!",
      null,
      "GET"
    );
  };


  const handleManualTrigger = () => {
    setIsGenerating(true);
    setProgress(0);
    setStatus("Starting video process...");
    triggerWebhook(
      "https://n8n.srv1208919.hstgr.cloud/webhook/289d4090-ac38-4c90-9876-5ca765e46211",
      "manual", "Video processing started. Check email!"
    );
  };


  const handleDynamicTrigger = () => {
    setShowModal(true);
  };

  const handleModalSubmit = async (data) => {
    setShowModal(false);
    setLastInputs(data);
    const result = await triggerWebhook(
      "https://n8n.srv1208919.hstgr.cloud/webhook/7be28969-c4ad-404a-b982-841dda7133af",
      "dynamic", 
      "Spotlight Triggered!",
      data
    );
    
    console.log("Webhook Result:", result);

    const story = Array.isArray(result) 
      ? (result[0]?.output?.story || result[0]?.story)
      : (result?.output?.story || result?.story);
    
    if (story) {
      setGeneratedStory(story);
    }
  };

  const handleAcceptStory = async () => {
    setGeneratedStory(null); // Clear immediately as requested
    setIsGenerating(true);   // Show timeline immediately
    setProgress(0);
    setStatus("Initiating workflow...");
    await triggerWebhook(
      "https://n8n.srv1208919.hstgr.cloud/webhook/81f0d39d-6344-421a-b3a2-019b2c737483",
      "accept",
      "Story accepted and saved!",
      { ...lastInputs, generated_story: generatedStory, status: "accepted" }
    );
  };




  const handleRetrySubmit = async (retryPrompt) => {
    setShowRetryModal(false);
    const data = { ...lastInputs, retry_prompt: retryPrompt, status: "retry", generated_story: generatedStory };
    
    const result = await triggerWebhook(
      "https://n8n.srv1208919.hstgr.cloud/webhook/ddcfb213-9313-46e3-8270-dd603301c1bd",
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

  const handlePostVideo = () => triggerWebhook(
    "https://n8n.srv1208919.hstgr.cloud/webhook/8f91f8e3-d06f-4e73-a545-e18065750416",
    "post", "Video posted to social media!"
  );

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
