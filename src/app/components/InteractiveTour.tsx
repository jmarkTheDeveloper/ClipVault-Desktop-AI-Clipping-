import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2, ChevronRight, Zap, Target, AlertCircle } from "lucide-react";

export interface TourStepOption {
  label: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
}

export interface TourStepInfo {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  options?: TourStepOption[];
  warningNotice?: string;
  tipNotice?: string;
  targetId: string;
  position?: "bottom" | "top" | "left" | "right";
}

export const TOUR_STEPS: TourStepInfo[] = [
  {
    step: 1,
    title: "Choose Studio Mode",
    subtitle: "Step 1 of 13 • Project Selection",
    description: "ClipVault provides high-speed autonomous pipelines and pro creative studios tailored for viral short-form content:",
    options: [
      {
        label: "1-Click Auto Clipper (Opus Style)",
        desc: "Autonomous zero-touch pipeline: drop a video or URL, and the local AI Engine automatically runs Whisper transcription, discovers top viral hooks, frames speakers, and exports batches in 1 click.",
        badge: "Autonomous",
        badgeColor: "#00e676",
      },
      {
        label: "Pro Manual Clipper Studio",
        desc: "Professional precision editing: multi-range custom timeline slicing, interactive segment scrubbing, virtual camera director, custom bounding boxes, and manual caption styling.",
        badge: "Pro Studio",
        badgeColor: "#38bdf8",
      },
    ],
    tipNotice: "Click '1-Click Auto Clipper', 'Pro Manual Clipper Studio', or 'Next Step' to enter your studio workspace.",
    targetId: "tour-step-1-clipper-card",
    position: "bottom",
  },
  {
    step: 2,
    title: "Ingest Video or Stream",
    subtitle: "Step 2 of 13 • Video Input",
    description: "Provide your footage via online streaming URL or private local files:",
    options: [
      {
        label: "YouTube / Web Stream Link",
        desc: "Paste any YouTube, Twitch, or web URL. ClipVault streams lossless high-bitrate video and indexes peak moments without downloading gigabytes.",
        badge: "Stream Ingest",
        badgeColor: "#ef4444",
      },
      {
        label: "Local File Upload",
        desc: "Select an MP4, MOV, MKV, or WEBM file from your PC for 100% private, instant zero-latency processing.",
        badge: "Local Disk",
        badgeColor: "#38bdf8",
      },
    ],
    targetId: "tour-step-2-ingest",
    position: "right",
  },
  {
    step: 3,
    title: "Select Multi-Model AI Engine",
    subtitle: "Step 3 of 13 • AI Intelligence & BYOK",
    description: "Choose the intelligence model that will detect your viral hooks, transcribe dialogue, and drive computer vision:",
    options: [
      {
        label: "Free Local GPU / Intel Arc QSV Engine",
        desc: "100% Free & Offline. Powered by local Python engine on port 8000 using faster-whisper, MediaPipe face tracking, and NVIDIA CUDA / Intel QSV / AMD DirectML with zero subscription costs.",
        badge: "Free & Offline",
        badgeColor: "#00e676",
      },
      {
        label: "Cloud AI (Groq, Gemini, OpenAI, Claude)",
        desc: "Requires API Key. Ultra-fast 500+ tok/s processing with Groq or deep viral hook analysis with Gemini 2.5 Flash, Claude 3.5, and GPT-4o via Bring-Your-Own-Key (BYOK).",
        badge: "Cloud API",
        badgeColor: "#fbbf24",
      },
    ],
    warningNotice: "Cloud AI models require an API key in Vault Keys. Local mode runs entirely offline on your GPU/NPU with zero subscription costs.",
    tipNotice: "You can configure or change your API keys anytime by clicking the Engine button in the top bar.",
    targetId: "tour-step-3-engine",
    position: "right",
  },
  {
    step: 4,
    title: "Timeline Slicing & Interactive Segments",
    subtitle: "Step 4 of 13 • Timeline Ranges",
    description: "Define how ClipVault discovers moments or manually slice exact timestamp bounds:",
    options: [
      {
        label: "Auto Viral Moments",
        desc: "AI scans the entire video, calculating hook strength and engagement retention to extract the best moments.",
        badge: "AI Auto-Scan",
        badgeColor: "#a855f7",
      },
      {
        label: "Interactive Custom Segments",
        desc: "Pin start and end timestamps, create multi-clip batches, and click any segment card or 'Play Clip' to instantly preview that scene.",
        badge: "Interactive",
        badgeColor: "#00e676",
      },
    ],
    tipNotice: "In Custom mode, click 'Play Clip' on any segment card or mark Start/End bounds directly from the player dock.",
    targetId: "tour-step-timeline",
    position: "right",
  },
  {
    step: 5,
    title: "AI Face Tracking & Video Layout",
    subtitle: "Step 5 of 13 • Computer Vision",
    description: "Smart cropping configurations optimized for vertical mobile platforms (Shorts, Reels, TikTok):",
    options: [
      {
        label: "Auto Face-Tracking (9:16)",
        desc: "MediaPipe computer vision tracks the active speaker smoothly across horizontal video frames with zero dead zones.",
        badge: "AI Vision",
        badgeColor: "#00e676",
      },
      {
        label: "Dual-Layer Split & Square Blur",
        desc: "Stacks speaker on top with secondary gameplay or B-roll on bottom, or centers speaker with soft aesthetic background blur.",
        badge: "Split & Blur",
        badgeColor: "#38bdf8",
      },
    ],
    targetId: "tour-step-4-reframe",
    position: "right",
  },
  {
    step: 6,
    title: "Virtual Camera Director Styles",
    subtitle: "Step 6 of 13 • Virtual Camera Director",
    description: "Choose how the virtual camera navigates and cuts between speakers during conversations:",
    options: [
      {
        label: "Instant Cut (Hard Tripod Lock)",
        desc: "Jump-cuts instantly to the active speaker with zero sliding motion. Perfect for podcasts and professional multi-guest interviews.",
        badge: "Pro Studio",
        badgeColor: "#fbbf24",
      },
      {
        label: "Snappy vs. Smooth Glide",
        desc: "Snappy delivers reactive agile camera pans, while Smooth provides graceful cinematic easing for relaxed stage presentations.",
        badge: "Motion Easing",
        badgeColor: "#38bdf8",
      },
    ],
    tipNotice: "Expand 'Advanced Camera & Quality Controls' below to enable Adaptive Quality Framing and AI Neural Upscaling.",
    targetId: "tour-step-camera",
    position: "right",
  },
  {
    step: 7,
    title: "Viral Captions, Emojis & Audio",
    subtitle: "Step 7 of 13 • Viral Polish & Audio",
    description: "Equip your clips with high-retention audio-visual effects:",
    options: [
      {
        label: "Dynamic Kinetic Subtitles",
        desc: "Word-by-word highlighted text with viral font styles (Viral Yellow, Neon Emerald, Clean White, Electric Cyan).",
        badge: "High Retention",
        badgeColor: "#fbbf24",
      },
      {
        label: "Auto-Ducked Soundtrack & SFX",
        desc: "Balanced background music that automatically dips when speakers speak, plus pop sound effects and animated emojis.",
        badge: "Auto-Ducking",
        badgeColor: "#00e676",
      },
    ],
    tipNotice: "Toggle 'Anti-Duplicate Filter' to flip footage and subtly shift tempo for fresh algorithmic ranking on TikTok and YouTube.",
    targetId: "tour-step-effects",
    position: "right",
  },
  {
    step: 8,
    title: "Live Phone Preview & Transport Dock",
    subtitle: "Step 8 of 13 • Mobile Canvas & Transport",
    description: "Full 9:16 mobile canvas simulation with responsive playback controls:",
    options: [
      {
        label: "9:16 Mobile Viewport",
        desc: "Live interactive preview with draggable kinetic captions, aspect ratio framing, and real-time speaker tracking.",
        badge: "Live Canvas",
        badgeColor: "#00e676",
      },
      {
        label: "Transport Dock & Segment Looping",
        desc: "Scrub through video, jump +15s/+1m, mark start/end bounds, or turn on Loop to repeat the active segment continuously.",
        badge: "Dock Transport",
        badgeColor: "#38bdf8",
      },
    ],
    tipNotice: "You can drag the caption text directly on the phone preview to reposition subtitles anywhere on screen.",
    targetId: "tour-step-phone-preview",
    position: "bottom",
  },
  {
    step: 9,
    title: "Hardware-Accelerated Render & Export",
    subtitle: "Step 9 of 13 • Render Pipeline",
    description: "Finalize export settings and compile your master short-form videos:",
    options: [
      {
        label: "Lossless GPU / QSV Pipeline",
        desc: "Intel QuickSync, NVIDIA NVENC, and AMD AMF hardware acceleration render pristine MP4 master files at lightning speeds.",
        badge: "Hardware Render",
        badgeColor: "#00e676",
      },
      {
        label: "Folder Assignment & Custom Output",
        desc: "Select your PC destination folder or assign clips to custom project folders before rendering.",
        badge: "Batch Folder",
        badgeColor: "#fbbf24",
      },
    ],
    tipNotice: "Next, we'll visit the Saved Clips Vault where all your rendered masters and project folders are organized.",
    targetId: "tour-step-5-export",
    position: "top",
  },
  {
    step: 10,
    title: "Saved Clips Vault & Physical Explorer Access",
    subtitle: "Step 10 of 13 • Local Storage Management",
    description: "Access and manage where your saved clips live on your computer:",
    options: [
      {
        label: "Open in Windows Explorer",
        desc: "Instantly launch native Windows File Explorer directly into your current project folder with one click.",
        badge: "Direct Access",
        badgeColor: "#fbbf24",
      },
      {
        label: "Dedicated 100% Local Storage",
        desc: "All master MP4 videos and viral hook metadata remain safely on your hard drive with zero cloud locks.",
        badge: "100% Private",
        badgeColor: "#38bdf8",
      },
    ],
    targetId: "vault-tour-step-1-storage",
    position: "bottom",
  },
  {
    step: 11,
    title: "Project Folders & Navigation",
    subtitle: "Step 11 of 13 • Project Organization",
    description: "Organize your short-form library with custom multi-level project folders:",
    options: [
      {
        label: "Project Category Folders",
        desc: "Create, nest, and rename folders for Gaming, Podcasts, Highlights, or Client Deliverables.",
        badge: "Categories",
        badgeColor: "#00e676",
      },
      {
        label: "Folder Breadcrumbs",
        desc: "Click breadcrumbs to traverse parent directories or drag clips onto breadcrumbs to return them to the Main Library.",
        badge: "Navigation",
        badgeColor: "#a855f7",
      },
    ],
    targetId: "vault-tour-step-2-breadcrumbs",
    position: "bottom",
  },
  {
    step: 12,
    title: "Search, Filter & Virality Scoring",
    subtitle: "Step 12 of 13 • Discovery & Ranking",
    description: "Locate and rank your highest-performing moments effortlessly:",
    options: [
      {
        label: "Instant Search & Folder Filter",
        desc: "Search across all clips by title, hook keywords, or filename with real-time filtering.",
        badge: "Instant Search",
        badgeColor: "#38bdf8",
      },
      {
        label: "Virality Score Ranking",
        desc: "Sort clips by AI Virality Score (90+), creation date, or duration to identify viral hits immediately.",
        badge: "Virality Rank",
        badgeColor: "#fbbf24",
      },
    ],
    targetId: "vault-tour-step-3-search",
    position: "bottom",
  },
  {
    step: 13,
    title: "Desktop Drag & Drop & Direct Export",
    subtitle: "Step 13 of 13 • Native Desktop Integration",
    description: "Full desktop-native drag-and-drop workflow:",
    options: [
      {
        label: "Folder Drag & Drop",
        desc: "Drag clips directly between project folders, or drop external MP4 files from Windows into ClipVault.",
        badge: "Drag & Drop",
        badgeColor: "#00e676",
      },
      {
        label: "Drag Out to Desktop / Editors",
        desc: "Drag clips straight out onto your Windows desktop, Premiere Pro, DaVinci Resolve, or any external video editor for publishing.",
        badge: "Direct Export",
        badgeColor: "#fbbf24",
      },
    ],
    tipNotice: "You've mastered ClipVault! Click Finish Tour to start creating viral short-form content.",
    targetId: "vault-tour-step-4-drag",
    position: "top",
  },
];

export const VAULT_TOUR_STEPS: TourStepInfo[] = [
  {
    step: 1,
    title: "Storage & Physical Explorer Access",
    subtitle: "Step 1 of 4 • Storage Management",
    description: "Access and manage where your saved clips live on your local drive:",
    options: [
      {
        label: "Open Folder in Explorer",
        desc: "Instantly launch native Windows File Explorer directly in your current project folder.",
        badge: "Direct Access",
        badgeColor: "#fbbf24",
      },
      {
        label: "Dedicated Local Vault",
        desc: "All master MP4 videos and viral hook metadata are preserved locally with zero cloud dependencies.",
        badge: "100% Private",
        badgeColor: "#38bdf8",
      },
    ],
    targetId: "vault-tour-step-1-storage",
    position: "bottom",
  },
  {
    step: 2,
    title: "Project Folders & Navigation",
    subtitle: "Step 2 of 4 • Project Folders",
    description: "Organize your short-form library with custom project folders:",
    options: [
      {
        label: "Project Category Folders",
        desc: "Create and rename custom folders for Gaming, Podcasts, Highlights, or Client batches.",
        badge: "Categories",
        badgeColor: "#00e676",
      },
      {
        label: "Folder Breadcrumbs",
        desc: "Click or drag clips onto breadcrumbs to return them to the Main Library at any time.",
        badge: "Navigation",
        badgeColor: "#a855f7",
      },
    ],
    targetId: "vault-tour-step-2-breadcrumbs",
    position: "bottom",
  },
  {
    step: 3,
    title: "Search, Filter & Virality Scoring",
    subtitle: "Step 3 of 4 • Discovery & Filtering",
    description: "Locate and rank your highest-performing moments:",
    options: [
      {
        label: "Instant Search & Folder Filter",
        desc: "Search by title/filename or filter down to specific project folders instantly.",
        badge: "Filter",
        badgeColor: "#38bdf8",
      },
      {
        label: "Virality Score Ranking",
        desc: "Sort clips by AI Virality Score, newest creation date, or alphabetical order.",
        badge: "Virality Rank",
        badgeColor: "#fbbf24",
      },
    ],
    targetId: "vault-tour-step-3-search",
    position: "bottom",
  },
  {
    step: 4,
    title: "Desktop Drag & Drop & Direct Export",
    subtitle: "Step 4 of 4 • File Management",
    description: "Full desktop-native drag-and-drop and clip controls:",
    options: [
      {
        label: "Drag & Drop Organizing",
        desc: "Drag clips between project folders, or drop external video files into ClipVault to import.",
        badge: "Drag & Drop",
        badgeColor: "#00e676",
      },
      {
        label: "Drag Out to Desktop",
        desc: "Drag clips straight out onto your Windows desktop or into your favorite video editor.",
        badge: "Direct Export",
        badgeColor: "#fbbf24",
      },
    ],
    targetId: "vault-tour-step-4-drag",
    position: "top",
  },
];

interface Props {
  active: boolean;
  tourType?: "clipper" | "vault";
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  onSelectMode?: (mode: "ai-clipper" | "opus-clipper") => void;
}

export const InteractiveTour: React.FC<Props> = ({
  active,
  tourType = "clipper",
  currentStep,
  onNext,
  onPrev,
  onExit,
  onSelectMode,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps = tourType === "vault" ? VAULT_TOUR_STEPS : TOUR_STEPS;
  const stepInfo = (steps.find((s) => s.step === currentStep) || steps[0])!;

  // 1. Auto-scroll target element into view whenever tour step changes
  useEffect(() => {
    if (!active) return;

    let targetId = stepInfo.targetId;
    if (currentStep === 3) {
      const dialogEl = document.getElementById("engine-settings-dialog");
      if (dialogEl && dialogEl.offsetParent !== null) {
        targetId = "engine-settings-dialog";
      }
    }

    const scrollTarget = () => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    };

    scrollTarget();
    const t1 = setTimeout(scrollTarget, 100);
    const t2 = setTimeout(scrollTarget, 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, currentStep, stepInfo.targetId]);

  // 2. 60fps continuous requestAnimationFrame for buttery-smooth tracking on scroll and animation
  useEffect(() => {
    if (!active) {
      setTargetRect(null);
      return;
    }

    let animId: number;

    const updateRect = () => {
      let targetId = stepInfo.targetId;
      if (currentStep === 3) {
        const dialogEl = document.getElementById("engine-settings-dialog");
        if (dialogEl && dialogEl.offsetParent !== null) {
          targetId = "engine-settings-dialog";
        }
      }
      const el = document.getElementById(targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect((prev) => {
          if (!prev || Math.abs(prev.top - rect.top) > 0.5 || Math.abs(prev.left - rect.left) > 0.5 || Math.abs(prev.width - rect.width) > 0.5 || Math.abs(prev.height - rect.height) > 0.5) {
            return rect;
          }
          return prev;
        });
      } else {
        setTargetRect(null);
      }
      animId = requestAnimationFrame(updateRect);
    };

    animId = requestAnimationFrame(updateRect);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active, currentStep, stepInfo.targetId]);

  if (!active) return null;

  const isLastStep = currentStep === steps.length;
  // Adaptive HUD Placement: if target element is near the bottom, position HUD at the top so it never covers the button
  const shouldPlaceAtTop =
    stepInfo.position === "top"
      ? true
      : stepInfo.position === "bottom"
      ? false
      : targetRect
      ? targetRect.bottom > (typeof window !== "undefined" ? window.innerHeight - 260 : 600) && targetRect.top > 200
      : false;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        pointerEvents: "none",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Backdrop Blur Layer with Cutout Hole: Background is blurred, target is 100% sharp */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          clipPath: targetRect
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${targetRect.left - 8}px 100%, 
                ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                ${targetRect.left + targetRect.width + 8}px ${targetRect.top - 8}px, 
                ${targetRect.left + targetRect.width + 8}px ${targetRect.top + targetRect.height + 8}px, 
                ${targetRect.left - 8}px ${targetRect.top + targetRect.height + 8}px, 
                ${targetRect.left - 8}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : "none",
          zIndex: 9998,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight Frame: Giant 9999px box shadow darkens the rest of the screen while keeping the hole clear */}
      {targetRect && (
        <div
          style={{
            position: "absolute",
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 16,
            border: "2.5px solid #00e676",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 45px rgba(0, 230, 118, 0.65), inset 0 0 25px rgba(0, 230, 118, 0.35)",
            pointerEvents: "none",
            animation: "pulseGlow 2s infinite ease-in-out",
            zIndex: 10000,
            transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Animated Target Reticle / Pointer Tag */}
          <div
            style={{
              position: "absolute",
              top: -15,
              left: 16,
              background: "#00e676",
              color: "#000",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "'Geist Mono', monospace",
              padding: "3px 10px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "0 4px 16px rgba(0,230,118,0.6)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <Target style={{ width: 12, height: 12 }} />
            <span>Target Action</span>
          </div>
        </div>
      )}

      {/* Floating Interactive Guide HUD (Centered at Bottom or Top depending on target) */}
      <div
        style={{
          position: "fixed",
          top: shouldPlaceAtTop ? 32 : "auto",
          bottom: shouldPlaceAtTop ? "auto" : 32,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(640px, 92vw)",
          background: "#0d0d11",
          border: "1px solid rgba(0, 230, 118, 0.4)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.95), 0 0 35px rgba(0, 230, 118, 0.25)",
          borderRadius: 18,
          padding: "20px 24px",
          pointerEvents: "auto",
          zIndex: 10010,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animation: "slideUpHUD 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          transition: "top 0.3s ease, bottom 0.3s ease",
        }}
      >
        {/* Header Row: Badge & Exit */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(0,230,118,0.15)",
                border: "1px solid #00e676",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00e676",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {currentStep}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "'Geist Mono', monospace",
                fontWeight: 700,
                color: "#00e676",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {stepInfo.subtitle}
            </span>
          </div>

          <button
            type="button"
            onClick={onExit}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ff667a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <span>Exit Tour</span>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Middle Row: Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
              {stepInfo.title}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              {stepInfo.description}
            </div>
          </div>

          {/* Option Breakdown Cards (YouTube vs Local Upload, AI Engines, etc.) */}
          {stepInfo.options && stepInfo.options.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: stepInfo.options.length > 1 ? "1fr 1fr" : "1fr",
                gap: 10,
                marginTop: 2,
              }}
            >
              {stepInfo.options.map((opt, optIdx) => {
                const isStep1 = stepInfo.step === 1;
                const isOpus = optIdx === 0;
                return (
                  <div
                    key={opt.label}
                    onClick={() => {
                      if (isStep1) {
                        if (onSelectMode) {
                          onSelectMode(isOpus ? "opus-clipper" : "ai-clipper");
                        } else {
                          onNext();
                        }
                      }
                    }}
                    role={isStep1 ? "button" : undefined}
                    tabIndex={isStep1 ? 0 : undefined}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      cursor: isStep1 ? "pointer" : "default",
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    onMouseEnter={(e) => {
                      if (isStep1) {
                        e.currentTarget.style.background = isOpus ? "rgba(0, 230, 118, 0.08)" : "rgba(56, 189, 248, 0.08)";
                        e.currentTarget.style.borderColor = isOpus ? "rgba(0, 230, 118, 0.45)" : "rgba(56, 189, 248, 0.45)";
                        e.currentTarget.style.transform = "translateY(-1.5px)";
                        e.currentTarget.style.boxShadow = isOpus ? "0 6px 20px rgba(0,230,118,0.2)" : "0 6px 20px rgba(56,189,248,0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isStep1) {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                        {opt.label}
                      </span>
                      {opt.badge && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            fontFamily: "'Geist Mono', monospace",
                            padding: "1.5px 6px",
                            borderRadius: 4,
                            background: opt.badgeColor ? `${opt.badgeColor}18` : "rgba(255,255,255,0.1)",
                            color: opt.badgeColor || "#fff",
                            border: `1px solid ${opt.badgeColor ? `${opt.badgeColor}40` : "rgba(255,255,255,0.2)"}`,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            flexShrink: 0,
                          }}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "rgba(255, 255, 255, 0.55)", lineHeight: 1.45 }}>
                      {opt.desc}
                    </p>
                    {isStep1 && (
                      <div style={{
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: isOpus ? "#00e676" : "#38bdf8",
                      }}>
                        <span>Click to Enter Studio</span>
                        <ChevronRight style={{ width: 12, height: 12 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Warning Notice Callout */}
          {stepInfo.warningNotice && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: 10,
                padding: "8px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 11,
                color: "#fde68a",
                lineHeight: 1.45,
              }}
            >
              <AlertCircle style={{ width: 14, height: 14, color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
              <span style={{ textAlign: "justify" }}>{stepInfo.warningNotice}</span>
            </div>
          )}

          {/* Tip Notice Callout */}
          {stepInfo.tipNotice && (
            <div
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: 10,
                padding: "8px 12px",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                fontSize: 11,
                color: "#bae6fd",
                lineHeight: 1.45,
              }}
            >
              <Sparkles style={{ width: 14, height: 14, color: "#38bdf8", flexShrink: 0, marginTop: 1 }} />
              <span style={{ textAlign: "justify" }}>{stepInfo.tipNotice}</span>
            </div>
          )}
        </div>

        {/* Footer Row: Progress Dots & Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Step Dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {steps.map((s) => (
              <div
                key={s.step}
                style={{
                  width: s.step === currentStep ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: s.step === currentStep ? "#00e676" : s.step < currentStep ? "rgba(0,230,118,0.5)" : "rgba(255,255,255,0.15)",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={onPrev}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <ArrowLeft style={{ width: 13, height: 13 }} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                background: "#00e676",
                border: "none",
                color: "#000",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(0, 230, 118, 0.35)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#33eb91";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#00e676";
                e.currentTarget.style.transform = "none";
              }}
            >
              <span>{isLastStep ? "Finish Tour" : "Next Step"}</span>
              <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 25px rgba(0, 230, 118, 0.35), inset 0 0 15px rgba(0, 230, 118, 0.2);
            border-color: #00e676;
          }
          50% {
            box-shadow: 0 0 45px rgba(0, 230, 118, 0.7), inset 0 0 25px rgba(0, 230, 118, 0.4);
            border-color: #55f5a8;
          }
        }
        @keyframes slideUpHUD {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
                opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
};

export interface FirstTimeWelcomeModalProps {
  isOpen: boolean;
  tourType?: "clipper" | "vault";
  onStartTour: () => void;
  onSkip: () => void;
}

export const FirstTimeWelcomeModal: React.FC<FirstTimeWelcomeModalProps> = ({
  isOpen,
  tourType = "clipper",
  onStartTour,
  onSkip,
}) => {
  if (!isOpen) return null;

  const isVault = tourType === "vault";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10005,
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        animation: "fadeInModal 0.2s ease-out",
      }}
      onClick={onSkip}
    >
      <div
        style={{
          width: "min(520px, 94vw)",
          background: "#0c0c10",
          border: isVault ? "1px solid rgba(251, 191, 36, 0.35)" : "1px solid rgba(0, 230, 118, 0.35)",
          boxShadow: isVault ? "0 32px 100px rgba(0,0,0,0.95), 0 0 40px rgba(251, 191, 36, 0.2)" : "0 32px 100px rgba(0,0,0,0.95), 0 0 40px rgba(0, 230, 118, 0.2)",
          borderRadius: 24,
          padding: "32px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          position: "relative",
          animation: "scaleInModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: isVault ? "rgba(251,191,36,0.1)" : "rgba(0,230,118,0.1)",
              border: isVault ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(0,230,118,0.3)",
              color: isVault ? "#fbbf24" : "#00e676",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Geist Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            <span>{isVault ? "Saved Clips Vault Walkthrough" : "Welcome Creator"}</span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Title & Body */}
        <div>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 22,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            {isVault ? "Saved Clips Vault Walkthrough" : "Are you new to ClipVault AI?"}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
            }}
          >
            {isVault
              ? "Take a quick 25-second walkthrough to see how Windows Explorer folder organization, AI virality sorting, and native drag-and-drop export work."
              : "Take a 45-second interactive guided walkthrough to see how smart stream slicing, AI face tracking, and dynamic kinetic typography work."}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onStartTour}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 12,
              background: isVault ? "#fbbf24" : "#00e676",
              border: "none",
              color: "#000",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: isVault ? "0 0 24px rgba(251, 191, 36, 0.4)" : "0 0 24px rgba(0, 230, 118, 0.4)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isVault ? "#fcd34d" : "#33eb91";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isVault ? "#fbbf24" : "#00e676";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span>{isVault ? "Start Vault Walkthrough" : "Start Interactive Tour"}</span>
            <ArrowRight style={{ width: 15, height: 15 }} />
          </button>

          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
          >
            {isVault ? "Dismiss" : "Skip for Now"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleInModal {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

