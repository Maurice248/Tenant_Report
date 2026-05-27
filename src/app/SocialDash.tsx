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

  // ── Social Image Workspace States ──
  const [showImageWorkspace, setShowImageWorkspace] = useState<boolean>(false);
  const [isImageGenerating, setIsImageGenerating] = useState<boolean>(false);
  const [generatedSocialImage, setGeneratedSocialImage] = useState<string | null>(null);
  const [socialDescriptions, setSocialDescriptions] = useState<{
    instagram: string;
    facebook: string;
    tiktok: string;
    linkedin: string;
  }>({
    instagram: "",
    facebook: "",
    tiktok: "",
    linkedin: ""
  });
  const [activePlatform, setActivePlatform] = useState<'instagram' | 'facebook' | 'tiktok' | 'linkedin'>('instagram');
  const [showSocialRetryModal, setShowSocialRetryModal] = useState<boolean>(false);

  // ── Clear progress from localStorage on page load (so refresh removes it) ──
  useEffect(() => {
    localStorage.removeItem('sd_generation_start');
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

    // Switch to visual workspace & show mobile screen loader instantly
    setShowImageWorkspace(true);
    setIsImageGenerating(true);
    setGeneratedSocialImage(null);

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

      // Parse n8n response payload structure
      try {
        const payload = Array.isArray(result) ? result[0] : result;
        const imageUrl = payload?.image_url || payload?.image || "https://tempfile.aiquickdraw.com/workers/nano/image_1779862412111_eo1ssy.png";
        const platforms = payload?.platforms || {};

        const instaText = platforms.instagram?.content || 
                          platforms.instagram?.caption || 
                          "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n.\n.\n.\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #CanadianPatients #ConfidenceRestored #LifeTransformation #NewBeginnings #SelfCareJourney #TransformationStory #TOGAHealth #MedicalTourism #AffordableHealthcare";

        const fbText = platforms.facebook?.content || 
                       platforms.facebook?.caption || 
                       "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #CanadianPatients #ConfidenceRestored #LifeTransformation #NewBeginnings #SelfCareJourney #TransformationStory #TOGAHealth #MedicalTourism #AffordableHealthcare";

        const ttText = platforms.tiktok?.caption || 
                       platforms.tiktok?.content || 
                       platforms.tiktok?.description || 
                       platforms.twitter?.content || 
                       platforms.twitter?.caption || 
                       "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #Togahealth";

        const liText = platforms.linkedin?.content || 
                       platforms.linkedin?.caption || 
                       "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #CanadianPatients #ConfidenceRestored";

        setGeneratedSocialImage(imageUrl);
        setSocialDescriptions({
          instagram: instaText,
          facebook: fbText,
          tiktok: ttText,
          linkedin: liText
        });
      } catch (err) {
        console.error("Error parsing webhook social data:", err);
      } finally {
        setIsImageGenerating(false);
      }
    } else {
      setIsGenerating(false);
      setGenerationType(null);
      setIsImageGenerating(false);
      
      // Load high-fidelity fallback/mock data so the user always has a premium experience
      setGeneratedSocialImage("https://tempfile.aiquickdraw.com/workers/nano/image_1779862412111_eo1ssy.png");
      setSocialDescriptions({
        instagram: "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n.\n.\n.\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #CanadianPatients #ConfidenceRestored #LifeTransformation #NewBeginnings #SelfCareJourney #TransformationStory #TOGAHealth #MedicalTourism #AffordableHealthcare",
        facebook: "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #CanadianPatients #ConfidenceRestored #LifeTransformation #NewBeginnings #SelfCareJourney #TransformationStory #TOGAHealth #MedicalTourism #AffordableHealthcare",
        tiktok: "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\n#HairTransplant #HairRestoration #HairTransplantTurkey",
        linkedin: "What Nobody Tells You About DHI Hair Transplants 🇹🇷\n\nWaiting for hair restoration in Canada felt endless and costly. Discovering the DHI hair transplant with TOGA Health in Turkey changed everything — a no-shave, minimally invasive method that offers precision and faster recovery. Unlike traditional transplants, DHI uses direct implantation for a natural look without long downtime. Now, I can enjoy fuller hair without hiding behind scars or shaved areas. TOGA Health helped me skip the wait and regain confidence with cutting-edge care tailored just for me. Visit TOGA Health to learn more about transforming your life\n\n#HairTransplant #HairRestoration #HairTransplantTurkey #MedicalTourismTurkey #IstanbulHealthcare #CanadianPatients #ConfidenceRestored"
      });
    }
  };

  const handleSocialPost = async () => {
    setLoading('post_social');
    try {
      const webhookUrl = "https://n8n.srv1208919.hstgr.cloud/webhook/5636fbef-db11-419b-b7cf-92bff14c25b7";
      await triggerWebhook(
        webhookUrl,
        "post_social",
        "Social campaign posted successfully!",
        {
          image_url: generatedSocialImage,
          descriptions: socialDescriptions,
          status: "Approved"
        },
        "POST"
      );
    } finally {
      setLoading(null);
    }
  };

  const handleSocialRetrySubmit = async (retryPrompt: string) => {
    setShowSocialRetryModal(false);
    setLoading('post_social');
    try {
      const webhookUrl = "https://n8n.srv1208919.hstgr.cloud/webhook/5636fbef-db11-419b-b7cf-92bff14c25b7";
      await triggerWebhook(
        webhookUrl,
        "post_social",
        "Social campaign retry submitted!",
        {
          image_url: generatedSocialImage,
          descriptions: socialDescriptions,
          status: "Reject",
          retry_prompt: retryPrompt
        },
        "POST"
      );
    } finally {
      setLoading(null);
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

  const getPlatformConfig = (platform: 'instagram' | 'facebook' | 'tiktok' | 'linkedin') => {
    switch (platform) {
      case 'instagram':
        return {
          color: '#e1306c',
          bgActive: 'rgba(225, 48, 108, 0.15)',
          borderColor: 'rgba(225, 48, 108, 0.3)',
          charLimit: 2200,
          icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          )
        };
      case 'facebook':
        return {
          color: '#1877f2',
          bgActive: 'rgba(24, 119, 242, 0.15)',
          borderColor: 'rgba(24, 119, 242, 0.3)',
          charLimit: 63206,
          icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )
        };
      case 'tiktok':
        return {
          color: '#00f2fe',
          bgActive: 'rgba(0, 242, 254, 0.15)',
          borderColor: 'rgba(0, 242, 254, 0.3)',
          charLimit: 2200,
          icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.07-2.88-.53-4.13-1.28-.24-.15-.47-.32-.69-.49v7.1c0 2.22-.64 4.51-2.22 6.09-1.63 1.67-4.14 2.59-6.45 2.44-2.83-.16-5.61-2.07-6.52-4.78C1.23 15.81 1.76 12 3.86 9.77c1.7-1.85 4.41-2.71 6.89-2.22V11.7c-1.39-.47-3.07-.13-4.08.88a4.13 4.13 0 00-1.07 3.52c.28 1.54 1.61 2.87 3.16 3.03 1.79.16 3.61-.95 4.09-2.67.14-.52.17-1.06.17-1.6V.02z" />
            </svg>
          )
        };
      case 'linkedin':
        return {
          color: '#0a66c2',
          bgActive: 'rgba(10, 102, 194, 0.15)',
          borderColor: 'rgba(10, 102, 194, 0.3)',
          charLimit: 3000,
          icon: (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
            </svg>
          )
        };
    }
  };

  const renderAvatar = () => (
    <div style={{
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      border: '1px solid #e2e8f0'
    }}>
      <img src="/toga-health-logo.png" alt="Toga Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );

  const renderInstagramMock = () => {
    const text = socialDescriptions.instagram;
    const formattedText = text.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#')) {
        return <span key={i} style={{ color: '#00376b', fontWeight: 600 }}>{word}</span>;
      }
      return word;
    });

    return (
      <div style={{ paddingBottom: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {renderAvatar()}
            <div>
              <p style={{ fontSize: '11px', fontWeight: 700, margin: 0 }}>toga_health_ai</p>
              <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>AI Medical Center · Istanbul, Turkey</p>
            </div>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>•••</span>
        </div>

        {/* Media Block */}
        <div style={{ background: '#000000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', aspectRatio: '16/9', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
          <img
            src={generatedSocialImage || "https://tempfile.aiquickdraw.com/workers/nano/image_1779862412111_eo1ssy.png"}
            alt="Instagram Mockup"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Action icons bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <span style={{ cursor: 'pointer', fontSize: '16px' }}>❤️</span>
            <span style={{ cursor: 'pointer', fontSize: '16px' }}>💬</span>
            <span style={{ cursor: 'pointer', fontSize: '16px' }}>➡️</span>
          </div>
          <span style={{ cursor: 'pointer', fontSize: '16px' }}>🔖</span>
        </div>

        {/* Likes */}
        <p style={{ fontSize: '11px', fontWeight: 700, padding: '0 12px', margin: '0 0 6px 0' }}>1,482 likes</p>

        {/* Description text */}
        <div style={{ padding: '0 12px', fontSize: '11px', lineHeight: '1.5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          <span style={{ fontWeight: 700, marginRight: '6px' }}>toga_health_ai</span>
          {formattedText}
        </div>
      </div>
    );
  };

  const renderFacebookMock = () => {
    const text = socialDescriptions.facebook;
    const formattedText = text.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#')) {
        return <span key={i} style={{ color: '#1877f2', fontWeight: 500 }}>{word}</span>;
      }
      return word;
    });

    return (
      <div style={{ padding: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {renderAvatar()}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, margin: 0 }}>Toga Health AI</p>
              <span style={{ color: '#1877f2', fontSize: '10px' }}>✔️</span>
            </div>
            <p style={{ fontSize: '9px', color: '#65676b', margin: 0 }}>Sponsored · 🌍</p>
          </div>
        </div>

        {/* Facebook Caption is ABOVE the image */}
        <p style={{ fontSize: '11px', lineHeight: '1.6', margin: '0 0 10px 0', wordBreak: 'break-word', whiteSpace: 'pre-wrap', color: '#0f172a' }}>
          {formattedText}
        </p>

        {/* Media Block */}
        <div style={{ background: '#f0f2f5', border: '1px solid #e4e6eb', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000000' }}>
            <img
              src={generatedSocialImage || "https://tempfile.aiquickdraw.com/workers/nano/image_1779862412111_eo1ssy.png"}
              alt="Facebook Mockup"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ padding: '10px', background: '#f0f2f5', borderTop: '1px solid #e4e6eb' }}>
            <p style={{ fontSize: '9px', color: '#65676b', textTransform: 'uppercase', margin: 0 }}>togahealth.ai</p>
            <p style={{ fontSize: '12px', fontWeight: 700, margin: '4px 0 0 0', color: '#050505' }}>Skip the Canadian Medical Wait times</p>
          </div>
        </div>

        {/* Likes Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e6eb', padding: '8px 0', marginTop: '8px' }}>
          <span style={{ fontSize: '10px', color: '#65676b' }}>👍❤️ 244</span>
          <span style={{ fontSize: '10px', color: '#65676b' }}>42 Comments · 18 Shares</span>
        </div>

        {/* Engagement buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#65676b', fontSize: '10px', fontWeight: 600, padding: '4px', cursor: 'pointer' }}>👍 Like</button>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#65676b', fontSize: '10px', fontWeight: 600, padding: '4px', cursor: 'pointer' }}>💬 Comment</button>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#65676b', fontSize: '10px', fontWeight: 600, padding: '4px', cursor: 'pointer' }}>➡️ Share</button>
        </div>
      </div>
    );
  };

  const renderLinkedInMock = () => {
    const text = socialDescriptions.linkedin;
    const formattedText = text.split(/(\s+)/).map((word, i) => {
      if (word.startsWith('#')) {
        return <span key={i} style={{ color: '#0a66c2', fontWeight: 600 }}>{word}</span>;
      }
      return word;
    });

    return (
      <div style={{ padding: '12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          {renderAvatar()}
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, margin: 0, color: '#000000' }}>Toga Health AI</p>
            <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>Innovative Patient Operations Hub · 10,240 followers</p>
            <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>1h · 🌍</p>
          </div>
        </div>

        {/* LinkedIn Caption ABOVE the image */}
        <p style={{ fontSize: '11px', lineHeight: '1.6', margin: '0 0 10px 0', color: '#000000', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {formattedText}
        </p>

        {/* Media card */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', background: '#000000', aspectRatio: '16/9' }}>
          <img
            src={generatedSocialImage || "https://tempfile.aiquickdraw.com/workers/nano/image_1779862412111_eo1ssy.png"}
            alt="LinkedIn Mockup"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Likes Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '8px 0', marginTop: '8px' }}>
          <span style={{ fontSize: '9px', color: '#64748b' }}>👍👏❤️ 82 · 12 comments</span>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#64748b', fontSize: '9px', fontWeight: 600, padding: '4px' }}>👍 Like</button>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#64748b', fontSize: '9px', fontWeight: 600, padding: '4px' }}>💬 Comment</button>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#64748b', fontSize: '9px', fontWeight: 600, padding: '4px' }}>➡️ Share</button>
          <button style={{ flex: 1, background: 'none', border: 'none', color: '#64748b', fontSize: '9px', fontWeight: 600, padding: '4px' }}>Send</button>
        </div>
      </div>
    );
  };

  const renderTikTokMock = () => {
    const text = socialDescriptions.tiktok;

    return (
      <div style={{ minHeight: '100%', width: '100%', background: '#000000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        
        {/* Background Image full fit */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
          <img
            src={generatedSocialImage || "https://tempfile.aiquickdraw.com/workers/nano/image_1779862412111_eo1ssy.png"}
            alt="TikTok Mockup"
            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.85 }}
          />
          {/* Subtle bottom gradient cover */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '140px', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
        </div>

        {/* Top Spacer */}
        <div style={{ zIndex: 2, height: '30px' }} />

        {/* Mid-content: Left User Details & Right floats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '10px', zIndex: 2, marginTop: 'auto', width: '100%' }}>
          
          {/* User & Caption Info */}
          <div style={{ flex: 1, paddingRight: '20px', color: '#ffffff', textShadow: '0 1px 4px rgba(0,0,0,0.8)', textAlign: 'left' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, margin: '0 0 4px 0' }}>@toga_health_ai</p>
            <p style={{ fontSize: '9px', lineHeight: '1.4', margin: 0, maxHeight: '60px', overflowY: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {text}
            </p>
            <p style={{ fontSize: '8px', color: '#d4d4d8', marginTop: '4px' }}>🎵 original sound - Toga Health AI</p>
          </div>

          {/* Right Floating Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            {/* Avatar with Pink Plus */}
            <div style={{ position: 'relative', width: '28px', height: '28px' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1.5px solid #ffffff', overflow: 'hidden', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/toga-health-logo.png" alt="Toga" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', background: '#ff0050', color: '#ffffff', borderRadius: '50%', width: '10px', height: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6px', fontWeight: 800 }}>+</div>
            </div>

            {/* Heart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', cursor: 'pointer' }}>❤️</span>
              <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 600 }}>34.2K</span>
            </div>

            {/* Comment */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', cursor: 'pointer' }}>💬</span>
              <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 600 }}>822</span>
            </div>

            {/* Share */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', cursor: 'pointer' }}>➡️</span>
              <span style={{ fontSize: '8px', color: '#ffffff', fontWeight: 600 }}>154</span>
            </div>
            
            {/* Audio Vinyl */}
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#334155', border: '3px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7' }} />
            </div>
          </div>

        </div>

      </div>
    );
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
                disabled={loading === 'images' || isImageGenerating}
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
                disabled={loading === 'dynamic' || isImageGenerating || showImageWorkspace}
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
          {!showImageWorkspace ? (
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
          ) : (
            <div className="sd-preview-panel sd-image-workspace-panel animate-fade-in" style={{ padding: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#0f172a', position: 'relative' }}>
              {/* Workspace Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7', boxShadow: '0 0 8px #0284c7' }} />
                    Social Campaign Mockup
                  </h3>
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', margin: 0 }}>High-fidelity social feed preview & editor</p>
                </div>
                <button
                  onClick={() => {
                    setShowImageWorkspace(false);
                    setIsImageGenerating(false);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#64748b'; }}
                >
                  Back to Video
                </button>
              </div>

              {isImageGenerating ? (
                /* Mobile Screen - Loader State */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '520px', background: 'rgba(255, 255, 255, 0.8)', border: '2px dashed #cbd5e1', borderRadius: '24px', position: 'relative' }}>
                  {/* Glowing light pulse */}
                  <div style={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.1)', filter: 'blur(40px)', animation: 'pulse 2s infinite' }} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', zIndex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      <Loader2 size={42} color="#0284c7" style={{ animation: 'spin 1.5s linear infinite' }} />
                      <ImageIcon size={18} color="#0284c7" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 600, margin: 0 }}>Drafting Platform Creatives...</p>
                      <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', maxWidth: '240px', margin: '6px 0 0 0' }}>Generating scaled images & tailoring custom copywriting for social distribution</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Interactive Social Campaign Workspace (Mobile View + Editor) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Phone Simulator Frame */}
                  <div className="sd-phone-frame" style={{
                    width: '100%',
                    maxWidth: '285px',
                    margin: '0 auto',
                    background: '#f8fafc',
                    border: '8px solid #cbd5e1',
                    borderRadius: '36px',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1), inset 0 0 20px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    
                    {/* Simulated Notch / Dynamic Island */}
                    <div style={{
                      width: '110px',
                      height: '20px',
                      background: '#cbd5e1',
                      borderRadius: '0 0 16px 16px',
                      margin: '0 auto',
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: 0,
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b', marginRight: '6px' }} />
                      <div style={{ width: '30px', height: '3px', borderRadius: '3px', background: '#94a3b8' }} />
                    </div>

                    {/* Horizontal 4 Brand Buttons Group inside Phone Simulator */}
                    <div style={{
                      display: 'flex',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                      borderBottom: '1px solid rgba(0,0,0,0.06)',
                      padding: '24px 8px 8px 8px', // padding top 24px to clear notch
                      gap: '4px',
                      justifyContent: 'space-between',
                      zIndex: 5,
                      position: 'relative'
                    }}>
                      {(['instagram', 'facebook', 'tiktok', 'linkedin'] as const).map((p) => {
                        const isActive = activePlatform === p;
                        const config = getPlatformConfig(p);
                        return (
                          <button
                            key={p}
                            onClick={() => setActivePlatform(p)}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '6px 2px',
                              borderRadius: '10px',
                              background: isActive ? config.bgActive : 'transparent',
                              border: isActive ? `1px solid ${config.borderColor}` : '1px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              color: isActive ? config.color : '#64748b'
                            }}
                          >
                            <span style={{ color: isActive ? config.color : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {config.icon}
                            </span>
                            <span style={{ fontSize: '8px', fontWeight: isActive ? 700 : 500, textTransform: 'capitalize' }}>{p}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Simulated Mobile Device screen viewport */}
                    <div style={{
                      height: '480px',
                      overflowY: 'auto',
                      background: activePlatform === 'tiktok' ? '#000000' : '#ffffff',
                      color: activePlatform === 'tiktok' ? '#ffffff' : '#0f172a',
                      position: 'relative',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                    }} className="sd-phone-screen">
                      
                      {activePlatform === 'instagram' && renderInstagramMock()}
                      {activePlatform === 'facebook' && renderFacebookMock()}
                      {activePlatform === 'linkedin' && renderLinkedInMock()}
                      {activePlatform === 'tiktok' && renderTikTokMock()}

                    </div>
                  </div>

                  {/* Real-time Caption Editor Workspace Card */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '14px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: getPlatformConfig(activePlatform).color, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getPlatformConfig(activePlatform).icon}
                        </span>
                        Edit {activePlatform} Post
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: socialDescriptions[activePlatform].length > getPlatformConfig(activePlatform).charLimit ? '#ef4444' : '#64748b'
                      }}>
                        {socialDescriptions[activePlatform].length.toLocaleString()} / {getPlatformConfig(activePlatform).charLimit.toLocaleString()} chars
                      </span>
                    </div>

                    <textarea
                      value={socialDescriptions[activePlatform]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSocialDescriptions(prev => ({
                          ...prev,
                          [activePlatform]: val
                        }));
                      }}
                      rows={4}
                      style={{
                        width: '100%',
                        background: '#f8fafc',
                        border: `1.5px solid #e2e8f0`,
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '12px',
                        color: '#0f172a',
                        fontFamily: 'inherit',
                        outline: 'none',
                        resize: 'none',
                        transition: 'all 0.2s',
                        lineHeight: '1.6'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = getPlatformConfig(activePlatform).color; e.target.style.boxShadow = `0 0 10px ${getPlatformConfig(activePlatform).color}22`; e.target.style.background = '#ffffff'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; e.target.style.background = '#f8fafc'; }}
                      placeholder={`Draft your perfect ${activePlatform} post here...`}
                    />

                    {/* Clickable Medical Hashtag Palette */}
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '6px', margin: '0 0 6px 0' }}>⚕️ Tap to Append Healthcare Hashtags</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {['#TOGAHealth', '#HairTransplantTurkey', '#DHITransplant', '#MedicalTourism', '#ConfidenceRestored'].map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              const currentText = socialDescriptions[activePlatform];
                              const space = currentText.endsWith(' ') || currentText === '' ? '' : ' ';
                              setSocialDescriptions(prev => ({
                                ...prev,
                                [activePlatform]: currentText + space + tag
                              }));
                            }}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '4px 8px',
                              fontSize: '9px',
                              fontWeight: 600,
                              color: '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Approve & Publish Bar */}
                  <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid #e2e8f0',
                    background: '#ffffff',
                    borderRadius: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Creative Approved</p>
                      <p style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', margin: '2px 0 0 0' }}>Verify scaling & descriptions before pushing live</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => setShowSocialRetryModal(true)}
                        disabled={loading === 'post_social'}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <RefreshCw size={13} /> Retry
                      </button>
                      <button
                        onClick={handleSocialPost}
                        disabled={loading === 'post_social'}
                        style={{
                          background: `linear-gradient(135deg, ${medicalBlue}, ${medicalTeal})`,
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)'
                        }}
                      >
                        {loading === 'post_social' ? <Spinner size={12} color="white" /> : <Share2 size={13} />}
                        Post
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
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

      <RetryModal 
        isOpen={showSocialRetryModal}
        onOpenChange={setShowSocialRetryModal}
        onSubmit={handleSocialRetrySubmit}
        loading={loading === 'post_social'}
      />

    </div>
  );
}
