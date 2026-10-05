import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronRight,
  Zap,
  Activity,
  Github,
  Heart,
  ShieldCheck,
  CreditCard,
  Lock,
  Scale,
  AlertTriangle,
  X,
  Cpu,
  Globe,
  Key,
  ExternalLink,
  CheckCircle2,
  ArrowDown,
  Sparkles,
  Code2,
  Mail,
  Copy,
  CheckCheck,
  Search,
  FileText,
  Sliders,
  Layers,
  Settings,
  HardDrive,
  FolderOpen,
  RefreshCw,
  SlidersHorizontal,
  Bot,
  Shield,
  Info,
  Radio,
  Terminal,
  Maximize2,
  Minimize2,
  Flame,
  Film,
  Clock,
  Download,
  ArrowRight,
  Scissors,
  Palette,
  Share2,
  Eye,
  EyeOff,
  ShieldAlert,
  HelpCircle,
  Plus,
  Minus,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { CreatorMaxUpgradeModal } from "../components/CreatorMaxUpgradeModal";
import { CreatorProUpgradeModal } from "../components/CreatorProUpgradeModal";
import { DeveloperTierModal, type SimulatedTier } from "../components/DeveloperTierModal";

const G = "#34eb3d";

export type Mode = "ai-clipper" | "opus-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
  onStartTour?: () => void;
  onOpenActivation?: () => void;
  isLicensed?: boolean;
}

export function ProjectSelectorScreen({
  onBack = () => {},
  onSelect,
  onStartTour,
  onOpenActivation,
  isLicensed,
}: Props) {
  const [engineOnline, setEngineOnline] = useState(true);
  const [complianceAccepted, setComplianceAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("clipvault_compliance_accepted") === "true";
    } catch {
      return false;
    }
  });

  // Pro Manual Studio Credit Status ($15 Pro tier: 3 clips/wk, Max: unlimited)
  const [studioCredits, setStudioCredits] = useState<{
    plan: string;
    is_max: boolean;
    allowed: boolean;
    unlimited: boolean;
    clips_used: number;
    max_weekly_clips: number;
    remaining: number;
    resets_in_days: number;
    resets_at: string;
    message: string;
  } | null>(null);

  // Free Tier Credits (Community Free Tier: 2 clips/wk via 1-Click Auto Clipper)
  const [freeCredits, setFreeCredits] = useState<{
    plan: string;
    allowed: boolean;
    clips_used: number;
    max_weekly_clips: number;
    remaining: number;
    resets_in_days: number;
    resets_at: string;
  } | null>(null);

  const [licenseData, setLicenseData] = useState<{
    licensed: boolean;
    plan: string;
    product_name?: string;
    user_email?: string;
    user_name?: string;
    license_key?: string;
    key_preview?: string;
    activated_at?: string;
    instance_id?: string;
  } | null>(null);

  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [showProUpgradeModal, setShowProUpgradeModal] = useState<boolean>(false);
  const [proUpgradeReason, setProUpgradeReason] = useState<"studio_locked" | "free_limit_reached" | "upgrade_menu">("studio_locked");

  // Application Edition: 'consumer' (client product, clean UI, stable built bundle, weekly update schedule)
  // vs 'developer' (internal developer studio, real-time hot-reloading dev server, dev tier switcher)
  const [appEdition, setAppEdition] = useState<"consumer" | "developer">(() => {
    try {
      const urlParam = new URLSearchParams(window.location.search).get("edition");
      if (urlParam === "consumer" || urlParam === "developer") return urlParam;
      const saved = localStorage.getItem("clipvault_app_edition");
      if (saved === "consumer" || saved === "developer") return saved;
      return "consumer";
    } catch {
      return "consumer";
    }
  });

  // Developer Special Tier Simulation State
  const [showDevModal, setShowDevModal] = useState<boolean>(false);
  const [simulatedTier, setSimulatedTier] = useState<SimulatedTier>(() => {
    try {
      const saved = localStorage.getItem("clipvault_dev_simulated_tier");
      if (saved === "free" || saved === "pro" || saved === "max") return saved as SimulatedTier;
      return null;
    } catch {
      return null;
    }
  });
  const [creditsExhaustedSimulated, setCreditsExhaustedSimulated] = useState<boolean>(false);

  const handleSelectSimulatedTier = (tier: SimulatedTier) => {
    setSimulatedTier(tier);
    try {
      if (tier) {
        localStorage.setItem("clipvault_dev_simulated_tier", tier);
      } else {
        localStorage.removeItem("clipvault_dev_simulated_tier");
      }
      window.dispatchEvent(new CustomEvent("clipvault-dev-tier-changed", { detail: tier }));
    } catch {}
  };

  const handleSwitchAppEdition = (newEdition: "consumer" | "developer") => {
    setAppEdition(newEdition);
    try {
      localStorage.setItem("clipvault_app_edition", newEdition);
      if (newEdition === "consumer") {
        handleSelectSimulatedTier(null);
        setCreditsExhaustedSimulated(false);
      }
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.setAppEdition) {
        electronAPI.setAppEdition(newEdition);
      }
    } catch {}
  };

  // Developer Keyboard Shortcut: Ctrl + Shift + D (active only in Developer Studio)
  useEffect(() => {
    const handleDevKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        if (appEdition === "developer") {
          setShowDevModal((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleDevKey);
    return () => window.removeEventListener("keydown", handleDevKey);
  }, [appEdition]);

  // Expose global developer commands and sync with custom events
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.getAppEdition) {
      electronAPI.getAppEdition().then((ed: string) => {
        if (ed === "consumer" || ed === "developer") setAppEdition(ed);
      }).catch(() => {});
    }
    if (electronAPI?.onAppEditionChanged) {
      electronAPI.onAppEditionChanged((ed: "consumer" | "developer") => {
        setAppEdition(ed);
      });
    }

    (window as any).openDevTierMatrix = () => setShowDevModal(true);
    (window as any).setDevTier = handleSelectSimulatedTier;
    (window as any).setAppEdition = handleSwitchAppEdition;
    (window as any).exitDevMode = () => handleSwitchAppEdition("consumer");

    const handleTierChanged = (e: any) => {
      if (e.detail !== undefined) {
        setSimulatedTier(e.detail);
      }
    };
    window.addEventListener("clipvault-dev-tier-changed", handleTierChanged);
    return () => window.removeEventListener("clipvault-dev-tier-changed", handleTierChanged);
  }, []);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/license/status")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setLicenseData(data);
        }
      })
      .catch(() => {});

    fetch("http://127.0.0.1:8000/api/license/free_tier_credits")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setFreeCredits(data);
        }
      })
      .catch(() => {});

    fetch("http://127.0.0.1:8000/api/license/manual_studio_credits")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === "object") {
          setStudioCredits(data);
        }
      })
      .catch(() => {});
  }, []);

  // Settings & Legal Compliance Modal State
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(() => !complianceAccepted);
  const [settingsTab, setSettingsTab] = useState<string>("general");
  const [complianceSearch, setComplianceSearch] = useState<string>("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // FAQ Accordion State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // License Key Security Measures ("I understand" phrase confirmation + 30s auto-hide)
  const [showLicenseKey, setShowLicenseKey] = useState<boolean>(false);
  const [showLicenseRevealModal, setShowLicenseRevealModal] = useState<boolean>(false);
  const [licenseRevealInput, setLicenseRevealInput] = useState<string>("");
  const LICENSE_REVEAL_PHRASE = "I understand to show my license";

  useEffect(() => {
    if (showLicenseKey) {
      const timer = setTimeout(() => {
        setShowLicenseKey(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [showLicenseKey]);
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);
  const [hasDeclined, setHasDeclined] = useState<boolean>(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
  const [showScrollPrompt, setShowScrollPrompt] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentPaneRef = useRef<HTMLDivElement>(null);

  // Weekly Auto-Updater State & IPC Listeners
  const [updateStatus, setUpdateStatus] = useState<{
    currentVersion: string;
    lastUpdateCheck: number;
    nextScheduledCheck: number;
    updateIntervalDays: number;
    updateCadence: string;
    isDev: boolean;
    lastCheckStatus: string;
    pendingUpdate: string | null;
    isChecking: boolean;
  } | null>(null);
  const [isManualCheckingUpdates, setIsManualCheckingUpdates] = useState<boolean>(false);
  const [updateCheckFeedback, setUpdateCheckFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.getUpdateStatus) {
          const res = await electronAPI.getUpdateStatus();
          if (res) setUpdateStatus(res);
        }
      } catch (e) {
        console.warn("Failed to query update status:", e);
      }
    };
    fetchStatus();

    const electronAPI = (window as any).electronAPI;
    if (electronAPI) {
      if (electronAPI.onCheckingForUpdate) {
        electronAPI.onCheckingForUpdate(() => {
          setIsManualCheckingUpdates(true);
        });
      }
      if (electronAPI.onUpdateNotAvailable) {
        electronAPI.onUpdateNotAvailable(() => {
          setIsManualCheckingUpdates(false);
          setUpdateCheckFeedback("ClipVault is currently up to date. You are running the latest version.");
          fetchStatus();
        });
      }
      if (electronAPI.onUpdateAvailable) {
        electronAPI.onUpdateAvailable((info: any) => {
          setIsManualCheckingUpdates(false);
          setUpdateCheckFeedback(`New update v${info?.version || "latest"} is downloading in the background.`);
          fetchStatus();
        });
      }
      if (electronAPI.onUpdateError) {
        electronAPI.onUpdateError((err: any) => {
          setIsManualCheckingUpdates(false);
          setUpdateCheckFeedback(`Update note: ${err?.message || "Check completed."}`);
        });
      }
    }
  }, []);

  const handleCheckUpdatesNow = async () => {
    setIsManualCheckingUpdates(true);
    setUpdateCheckFeedback(null);
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.checkForUpdates) {
        const res = await electronAPI.checkForUpdates();
        if (res?.status === "dev_mode") {
          setUpdateCheckFeedback("Development Mode: Updates will download automatically in packaged production builds.");
        } else if (res?.ok) {
          setUpdateCheckFeedback("ClipVault is up to date. You have the latest version.");
        } else if (res?.error) {
          setUpdateCheckFeedback(`Update check note: ${res.error}`);
        }
        if (electronAPI?.getUpdateStatus) {
          const updated = await electronAPI.getUpdateStatus();
          if (updated) setUpdateStatus(updated);
        }
      } else {
        setUpdateCheckFeedback("Updates active: ClipVault continuously checks for new improvements.");
      }
    } catch (err: any) {
      setUpdateCheckFeedback(`Update check completed: ${err?.message || "All systems up to date."}`);
    } finally {
      setIsManualCheckingUpdates(false);
    }
  };

  // Card Hover & 5-Second Widescreen Expansion State
  const [hoveredCard, setHoveredCard] = useState<"opus" | "pro" | null>(null);
  const [expandedStudio, setExpandedStudio] = useState<"opus" | "pro" | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCardMouseEnter = (card: "opus" | "pro") => {
    setHoveredCard(card);
    if (expandedStudio === card) return;

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    // 2.7-second hover delay before expanding spotlight modal
    hoverTimerRef.current = setTimeout(() => {
      setExpandedStudio(card);
      hoverTimerRef.current = null;
    }, 2700);
  };

  const handleCardMouseLeave = () => {
    setHoveredCard(null);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpandedStudio(null);
        handleCardMouseLeave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, []);

  // General Preferences State
  const [defaultRes, setDefaultRes] = useState(() => localStorage.getItem("clipvault_def_res") || "1080p");

  useEffect(() => {
    const handleResSync = (e?: any) => {
      try {
        const val = (e && e.detail) ? e.detail : localStorage.getItem("clipvault_def_res") || "1080p";
        setDefaultRes(val);
      } catch {}
    };
    window.addEventListener("clipvault-resolution-changed", handleResSync);
    window.addEventListener("storage", handleResSync);
    window.addEventListener("focus", handleResSync);
    return () => {
      window.removeEventListener("clipvault-resolution-changed", handleResSync);
      window.removeEventListener("storage", handleResSync);
      window.removeEventListener("focus", handleResSync);
    };
  }, []);
  const [defaultFps, setDefaultFps] = useState(() => localStorage.getItem("clipvault_def_fps") || "60");
  const [defaultStorage, setDefaultStorage] = useState(() => localStorage.getItem("clipvault_def_storage") || "engine/clips");
  const [whisperModel, setWhisperModel] = useState(() => localStorage.getItem("clipvault_whisper_model") || "large-v3-turbo");
  const [activeLlm, setActiveLlm] = useState(() => localStorage.getItem("clipvault_active_llm") || "gemini_flash");
  const [faceSensitivity, setFaceSensitivity] = useState(() => localStorage.getItem("clipvault_face_sensitivity") || "high");
  const [copiedPath, setCopiedPath] = useState(false);

  const handleDecline = () => {
    setHasDeclined(true);
    try {
      if ((window as any).electronAPI?.quitApp) {
        (window as any).electronAPI.quitApp();
      }
    } catch {}
    try {
      fetch("http://127.0.0.1:8000/api/shutdown", { method: "POST" }).catch(() => {});
    } catch {}
    try {
      window.close();
    } catch {}
  };

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((r) => r.json())
      .then((d) => setEngineOnline(d.status === "ok"))
      .catch(() => setEngineOnline(false));
  }, []);

  // 3.5-second inactivity timer for scroll down prompt when first-launch compliance is pending
  useEffect(() => {
    if (showSettingsModal && !complianceAccepted && !hasScrolledToBottom) {
      setShowScrollPrompt(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setShowScrollPrompt(true);
      }, 3500);
    } else {
      setShowScrollPrompt(false);
    }
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [showSettingsModal, complianceAccepted, hasScrolledToBottom, settingsTab]);

  const isEffectivelyLicensed = simulatedTier
    ? (simulatedTier === "pro" || simulatedTier === "max")
    : (isLicensed ?? (licenseData ? licenseData.licensed : false));

  const effectiveFreeCredits = creditsExhaustedSimulated
    ? { remaining: 0, clips_used: 2, max_weekly_clips: 2, resets_in_days: 5, resets_at: "in 5 days", plan: "free", allowed: false }
    : (freeCredits || { remaining: 2, clips_used: 0, max_weekly_clips: 2, resets_in_days: 7, resets_at: "in 7 days", plan: "free", allowed: true });

  const effectiveStudioCredits = simulatedTier === "max"
    ? { is_max: true, unlimited: true, remaining: 999, allowed: true, plan: "max", clips_used: 0, max_weekly_clips: 999, resets_in_days: 0, resets_at: "", message: "Unlimited" }
    : simulatedTier === "pro"
    ? (creditsExhaustedSimulated
        ? { is_max: false, unlimited: false, remaining: 0, allowed: false, plan: "pro", clips_used: 3, max_weekly_clips: 3, resets_in_days: 4, resets_at: "in 4 days", message: "Exhausted" }
        : { is_max: false, unlimited: false, remaining: 3, allowed: true, plan: "pro", clips_used: 0, max_weekly_clips: 3, resets_in_days: 7, resets_at: "in 7 days", message: "3 weekly credits" })
    : (creditsExhaustedSimulated
        ? { ...(studioCredits || {}), remaining: 0, allowed: false } as any
        : studioCredits);

  const isEffectivelyMax = Boolean(
    effectiveStudioCredits?.is_max ||
    simulatedTier === "max" ||
    licenseData?.plan?.toLowerCase() === "max" ||
    (licenseData?.product_name && licenseData.product_name.toLowerCase().includes("max"))
  );
  const isEffectivelyPro = isEffectivelyLicensed && !isEffectivelyMax;

  const opusFeatures = isEffectivelyLicensed
    ? [
        "Unlimited 1-Click Autonomous Exports",
        "4K & 8K Super-Resolution Video Exports",
        "AI Virality Hook Discovery (0-100 pts)",
        "Auto Speaker Tracking & Dynamic Subtitles",
      ]
    : [
        effectiveFreeCredits
          ? `${effectiveFreeCredits.remaining}/2 Free Weekly Clips Remaining`
          : "2 Free Clips / Week (Refreshes Weekly)",
        "720p & 1080p HD Video Exports",
        "AI Virality Hook Discovery (0-100 pts)",
        "Auto Speaker Tracking & Dynamic Subtitles",
      ];

  const proFeatures = isEffectivelyLicensed
    ? [
        isEffectivelyMax
          ? "Unlimited Pro Manual Studio Exports"
          : (effectiveStudioCredits ? `${effectiveStudioCredits.remaining}/3 Weekly Clips Remaining` : "3 Studio Clips / Week (Refreshes Weekly)"),
        "Multi-Range Timeline Slicing & Waveforms",
        "Dual-Layer Gameplay & B-Roll Split-Screen",
        "Custom Crop Bounding Boxes (9:16, 1:1, 16:9)",
      ]
    : [
        "Creator Pro ($15/mo) Required",
        "Frame-Accurate Timeline Slicing & Waveforms",
        "Dual-Layer Gameplay & B-Roll Split-Screen",
        "Custom Crop Bounding Boxes (9:16, 1:1, 16:9)",
      ];

  const copyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2500);
    } catch {}
  };

  const openEmail = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const email = "studioclipvault@gmail.com";
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
    
    // Always copy the email to clipboard for instant user access
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(email);
        setCopiedText("email");
        setTimeout(() => setCopiedText(null), 3000);
      }
    } catch {}

    // 1. Try electronAPI.openExternal if running in Electron
    const win = window as any;
    if (typeof win.electronAPI?.openExternal === "function") {
      win.electronAPI.openExternal(gmailComposeUrl);
      return;
    }

    // 2. Open Gmail compose directly in external default browser
    window.open(gmailComposeUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    try {
      const win = window as any;
      if (win.electronAPI?.setTitleBarOverlay) {
        if (showSettingsModal || showUpgradeModal || showProUpgradeModal || showDevModal) {
          win.electronAPI.setTitleBarOverlay({
            color: '#0a0d14',
            symbolColor: '#e2e8f0',
            height: 48,
          });
        } else {
          win.electronAPI.setTitleBarOverlay({
            color: '#080c14',
            symbolColor: '#e2e8f0',
            height: 48,
          });
        }
      }
    } catch {}
  }, [showSettingsModal, showUpgradeModal, showProUpgradeModal, showDevModal]);

  const isOpusHovered = hoveredCard === "opus" || expandedStudio === "opus";
  const isProHovered = hoveredCard === "pro" || expandedStudio === "pro";

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden", background: "#000000", fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes wfGlowPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(52, 235, 61,0.14), 0 30px 80px rgba(0,0,0,0.8); }
          50%       { box-shadow: 0 0 50px rgba(52, 235, 61,0.14), 0 0 0 1px rgba(52, 235, 61,0.32), 0 30px 80px rgba(0,0,0,0.8); }
        }
        @keyframes wfDotPulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.35); opacity: 0.7; }
        }
        @keyframes wfBouncePrompt {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
        @keyframes expandIn {
          from { opacity: 0; transform: translateY(-8px) scaleY(0.95); }
          to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        @keyframes ambientAuraPulse {
          0%, 100% { opacity: 0.75; transform: translate(-50%, -35%) scale(1); }
          50%      { opacity: 1;    transform: translate(-50%, -32%) scale(1.08); }
        }
        @keyframes ambientOrbLeft {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50%      { transform: translate(-50%, -52%) scale(1.1); opacity: 0.95; }
        }
        @keyframes ambientOrbRight {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50%      { transform: translate(-50%, -48%) scale(1.1); opacity: 0.95; }
        }
        @keyframes beamShimmer {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.9; }
        }
        @keyframes particleFloat1 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.25; }
          50%      { transform: translateY(-16px) translateX(6px); opacity: 0.8; }
        }
        @keyframes particleFloat2 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          50%      { transform: translateY(-22px) translateX(-10px); opacity: 0.85; }
        }
      `}</style>

      {/* ── Header with 140px right padding to avoid Windows window controls overlap ── */}
      <header style={{
        height: 48, flexShrink: 0, zIndex: 30,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 140px 0 24px", background: "#080c14",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        WebkitAppRegion: "drag",
      } as any}>
        {/* Brand & Dev Trigger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={22} />
          <span style={{ fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: G }}>Vault</span>
          </span>

          {/* Developer Matrix Trigger & Edition Controls (Visible only in Developer Studio) */}
          {appEdition === "developer" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                onClick={() => setShowDevModal(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 6, fontSize: 9.5, fontWeight: 700,
                  letterSpacing: "0.06em", background: "rgba(52, 235, 61,0.08)",
                  color: G, border: "1px solid rgba(52, 235, 61,0.28)",
                  fontFamily: "'Geist Mono', monospace", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Open Developer Tier Comparison Matrix & Sandbox Simulator (Ctrl+Shift+D)"
              >
                <Code2 style={{ width: 11, height: 11 }} />
                <span>Dev Tiers</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchAppEdition("consumer")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700,
                  letterSpacing: "0.06em", background: "rgba(255, 255, 255, 0.05)",
                  color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255, 255, 255, 0.15)",
                  fontFamily: "'Geist Mono', monospace", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                title="Switch to Clean Consumer Product View (Hides developer tools)"
              >
                <Eye style={{ width: 10, height: 10 }} />
                <span>Consumer View</span>
              </button>
            </div>
          )}

          {/* Active Sandbox Simulation Pill (Visible only in Developer Studio when tier is simulated) */}
          {appEdition === "developer" && simulatedTier && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 800,
              background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              fontFamily: "'Geist Mono', monospace",
            }}>
              <span>SIMULATING: {simulatedTier.toUpperCase()}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectSimulatedTier(null);
                  setCreditsExhaustedSimulated(false);
                }}
                style={{
                  background: "transparent", border: "none", color: "#f59e0b",
                  cursor: "pointer", padding: 0, display: "flex", alignItems: "center",
                }}
                title="Exit simulation and restore production state"
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          )}
        </div>

        {/* Plan Status & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, WebkitAppRegion: "no-drag" } as any}>
          {!isEffectivelyLicensed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("subscription");
                  setShowSettingsModal(true);
                }}
                title="View Subscription & Plan Details"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 11px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.09)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#cbd5e1",
                  fontFamily: "'Geist', -apple-system, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                  e.currentTarget.style.borderColor = "rgba(52, 235, 61, 0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.09)";
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34eb3d", boxShadow: "0 0 6px rgba(52,235,61,0.6)" }} />
                <span>Free Plan ({freeCredits ? `${freeCredits.remaining}/2 Clips` : "2 Clips/Wk"})</span>
                <ChevronRight style={{ width: 11, height: 11, color: "rgba(255,255,255,0.4)" }} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setProUpgradeReason("upgrade_menu");
                  setShowProUpgradeModal(true);
                }}
                style={{
                  padding: "5px 11px", borderRadius: 8,
                  background: "linear-gradient(135deg, rgba(52, 235, 61, 0.16) 0%, rgba(52, 235, 61, 0.08) 100%)",
                  border: "1px solid rgba(52, 235, 61, 0.38)",
                  color: G, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s ease",
                  fontFamily: "'Geist', -apple-system, sans-serif",
                }}
              >
                <Sparkles style={{ width: 11, height: 11 }} />
                <span>Upgrade</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onOpenActivation) {
                    onOpenActivation();
                  } else {
                    window.dispatchEvent(new CustomEvent("clipvault-open-activation"));
                  }
                }}
                style={{
                  padding: "5px 11px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#cbd5e1", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  transition: "all 0.15s ease",
                  fontFamily: "'Geist', -apple-system, sans-serif",
                }}
              >
                <Key style={{ width: 11, height: 11, color: G }} />
                <span>Activate Key</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("subscription");
                  setShowSettingsModal(true);
                }}
                title="View Subscription & Plan Details"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "5px 12px",
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#f1f5f9",
                  fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.07)";
                  e.currentTarget.style.borderColor = "rgba(52, 235, 61, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                }}
              >
                <ShieldCheck style={{ width: 13, height: 13, color: G }} />
                <span>{isEffectivelyMax ? "Creator Max" : "Creator Pro ($15/mo)"}</span>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "rgba(52, 235, 61, 0.15)",
                  color: G,
                  fontFamily: "'Geist Mono', monospace",
                }}>
                  ACTIVE
                </span>
                <ChevronRight style={{ width: 11, height: 11, color: "rgba(255,255,255,0.4)" }} />
              </button>
              {!isEffectivelyMax && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    padding: "5px 11px", borderRadius: 8,
                    background: "rgba(52, 235, 61, 0.12)", border: "1px solid rgba(52, 235, 61, 0.35)",
                    color: G, fontSize: 11, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "all 0.15s ease",
                    fontFamily: "'Geist', -apple-system, sans-serif",
                  }}
                >
                  <Sparkles style={{ width: 11, height: 11 }} />
                  <span>Get Max</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Canvas (Spacious, Industry-Grade, Breathable, 60-30-10 Color Theory) ── */}
      <main style={{
        flex: 1, position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "clamp(14px, 2vh, 26px) 32px", overflow: "hidden", minHeight: 0,
      }}>
        {/* Background Visual Effects Layer (Strict overflow:hidden prevents any window scrolling) */}
        <div style={{
          position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0,
        }}>
          {/* Top Horizon Light Beam */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent 5%, rgba(52, 235, 61, 0.25) 25%, rgba(52, 235, 61, 0.6) 50%, rgba(52, 235, 61, 0.25) 75%, transparent 95%)",
            boxShadow: "0 0 20px rgba(52, 235, 61, 0.4)",
            pointerEvents: "none", zIndex: 1,
            animation: "beamShimmer 6s ease-in-out infinite",
          }} />

          {/* Center Hero Ambient Aurora Nebula */}
          <div style={{
            position: "absolute", width: 950, height: 480, borderRadius: "50%",
            background: "radial-gradient(ellipse 65% 55% at 50% 35%, rgba(52, 235, 61, 0.13) 0%, rgba(52, 235, 61, 0.035) 45%, transparent 75%)",
            top: "22%", left: "50%",
            pointerEvents: "none", zIndex: 1,
            filter: "blur(40px)",
            animation: "ambientAuraPulse 9s ease-in-out infinite",
          }} />

          {/* Left Studio Card Ambient Spotlight Flare */}
          <div style={{
            position: "absolute", width: 520, height: 420, borderRadius: "50%",
            background: isOpusHovered
              ? "radial-gradient(circle, rgba(52, 235, 61, 0.18) 0%, rgba(52, 235, 61, 0.05) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(52, 235, 61, 0.09) 0%, rgba(52, 235, 61, 0.02) 50%, transparent 70%)",
            top: "52%", left: "28%",
            pointerEvents: "none", zIndex: 1,
            filter: "blur(45px)",
            transition: "all 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            animation: isOpusHovered ? "none" : "ambientOrbLeft 8s ease-in-out infinite",
          }} />

          {/* Right Studio Card Ambient Spotlight Flare */}
          <div style={{
            position: "absolute", width: 520, height: 420, borderRadius: "50%",
            background: isProHovered
              ? "radial-gradient(circle, rgba(52, 235, 61, 0.18) 0%, rgba(52, 235, 61, 0.05) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(52, 235, 61, 0.09) 0%, rgba(52, 235, 61, 0.02) 50%, transparent 70%)",
            top: "52%", left: "72%",
            pointerEvents: "none", zIndex: 1,
            filter: "blur(45px)",
            transition: "all 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
            animation: isProHovered ? "none" : "ambientOrbRight 8s ease-in-out infinite 0.7s",
          }} />

          {/* Precision Micro-Grid with Edge Radial Fade */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
            backgroundImage: "radial-gradient(circle, rgba(52, 235, 61, 0.18) 1px, transparent 1px), linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)",
            backgroundSize: "36px 36px, 72px 72px, 72px 72px",
            maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 25%, transparent 85%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, black 25%, transparent 85%)",
            opacity: 0.85,
          }} />

          {/* Floating Ambient Sparkles */}
          <div style={{ position: "absolute", top: "18%", left: "12%", width: 4, height: 4, borderRadius: "50%", background: "#34eb3d", boxShadow: "0 0 10px #34eb3d, 0 0 20px #34eb3d", pointerEvents: "none", zIndex: 1, animation: "particleFloat1 8s ease-in-out infinite" }} />
          <div style={{ position: "absolute", top: "26%", right: "14%", width: 3, height: 3, borderRadius: "50%", background: "#5def64", boxShadow: "0 0 8px #5def64", pointerEvents: "none", zIndex: 1, animation: "particleFloat2 10s ease-in-out infinite 1.5s" }} />
          <div style={{ position: "absolute", top: "70%", left: "9%", width: 3, height: 3, borderRadius: "50%", background: "#34eb3d", boxShadow: "0 0 8px #34eb3d", pointerEvents: "none", zIndex: 1, animation: "particleFloat1 11s ease-in-out infinite 3s" }} />
          <div style={{ position: "absolute", top: "74%", right: "11%", width: 4, height: 4, borderRadius: "50%", background: "#5def64", boxShadow: "0 0 12px #34eb3d", pointerEvents: "none", zIndex: 1, animation: "particleFloat2 9s ease-in-out infinite 2s" }} />

          {/* Cinematic Vignette */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
            background: "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.72) 100%)",
          }} />
        </div>

        <div style={{
          position: "relative", zIndex: 10,
          display: "flex", flexDirection: "column", alignItems: "center",
          maxWidth: 1060, width: "100%", margin: "0 auto",
        }}>

          {/* 1. Hero Header */}
          <div style={{ textAlign: "center", marginBottom: "clamp(18px, 2.4vh, 28px)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Pill Tag */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "4px 13px", borderRadius: 999,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
            }}>
              <Sparkles style={{ width: 12, height: 12, color: G }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
                Next-Gen Video Intelligence
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800,
              fontSize: "clamp(28px, 3.4vw, 44px)", letterSpacing: "-0.035em",
              lineHeight: 1.15, margin: "0 0 8px", color: "#fff",
            }}>
              Transform Long Videos into{" "}
              <span style={{
                background: "linear-gradient(135deg, #34eb3d 0%, #5def64 50%, #2dca34 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Viral 9:16 Shorts
              </span>
            </h1>

            {/* Subtitle */}
            <p style={{
              color: "rgba(255,255,255,0.55)", fontSize: 13.5, lineHeight: 1.55,
              maxWidth: 580, margin: 0, fontWeight: 450,
            }}>
              Autonomous viral hook discovery, camera face tracking, animated word-by-word subtitles, and instant 1-click publishing.
            </p>
          </div>

          {/* 2. Studio Cards: Balanced, High-Grade Enterprise Dual Structure */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 20, width: "100%", marginBottom: "clamp(16px, 2.2vh, 24px)",
          }}>
              {/* CARD 1: 1-Click Auto Clipper */}
              <div
                id="tour-step-1-clipper-card"
                style={{
                  position: "relative", overflow: "hidden",
                  background: isOpusHovered
                    ? "linear-gradient(160deg, rgba(52, 235, 61,0.08) 0%, rgba(52, 235, 61,0.02) 100%)"
                    : "linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.008) 100%)",
                  borderRadius: 20, padding: "24px 26px",
                  border: isOpusHovered
                    ? "1px solid rgba(52, 235, 61,0.45)"
                    : "1px solid rgba(255,255,255,0.1)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  boxShadow: isOpusHovered
                    ? "0 25px 80px rgba(0,0,0,0.65), 0 0 55px rgba(52, 235, 61,0.2)"
                    : "0 20px 60px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: isOpusHovered ? "translateY(-3px)" : "none",
                }}
                onMouseEnter={() => handleCardMouseEnter("opus")}
                onMouseLeave={handleCardMouseLeave}
              >
                {/* Top ambient highlight line */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none",
                  background: isOpusHovered
                    ? "linear-gradient(90deg, transparent, rgba(52, 235, 61,0.7), transparent)"
                    : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  transition: "all 0.25s ease",
                }} />

                <div>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 11px", borderRadius: 999,
                      background: isOpusHovered ? "rgba(52, 235, 61,0.1)" : "rgba(255,255,255,0.04)",
                      border: isOpusHovered ? "1px solid rgba(52, 235, 61,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      transition: "all 0.25s ease",
                    }}>
                      <Zap style={{ width: 12, height: 12, color: isOpusHovered ? G : "rgba(255,255,255,0.85)", transition: "color 0.25s ease" }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: isOpusHovered ? G : "rgba(255,255,255,0.85)", transition: "color 0.25s ease" }}>
                        {isEffectivelyLicensed
                          ? "Unlimited 1-Click"
                          : (freeCredits ? `Free Tier: ${freeCredits.remaining}/2 Weekly Clips` : "Free Tier (2 Clips/Wk)")}
                      </span>
                    </div>
                  </div>

                  {/* Title & Icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                      background: isOpusHovered
                        ? "radial-gradient(circle, rgba(52, 235, 61,0.22) 0%, rgba(52, 235, 61,0.05) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                      border: isOpusHovered ? "1px solid rgba(52, 235, 61,0.4)" : "1px solid rgba(255,255,255,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isOpusHovered ? "0 0 25px rgba(52, 235, 61,0.25)" : "0 4px 20px rgba(0,0,0,0.3)",
                      transition: "all 0.25s ease",
                    }}>
                      <Sparkles style={{ width: 22, height: 22, color: isOpusHovered ? G : "#fff", transition: "color 0.25s ease" }} />
                    </div>

                    <div>
                      <h2 style={{
                        fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 21,
                        color: "#fff", letterSpacing: "-0.02em", margin: "0 0 3px",
                      }}>
                        1-Click Auto Clipper
                      </h2>
                      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500 }}>
                        Autonomous viral curation with zero manual slicing
                      </p>
                    </div>
                  </div>

                  {/* Feature checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26, paddingLeft: 2 }}>
                    {opusFeatures.map((feat) => (
                      <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isOpusHovered ? "rgba(52, 235, 61,0.14)" : "rgba(52, 235, 61,0.08)",
                          border: isOpusHovered ? "1px solid rgba(52, 235, 61,0.35)" : "1px solid rgba(52, 235, 61,0.22)",
                          transition: "all 0.25s ease",
                        }}>
                          <Check style={{ width: 10, height: 10, color: G }} />
                        </div>
                        <span style={{ fontSize: 12.5, color: isOpusHovered ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: 500, transition: "color 0.25s ease" }}>{feat}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!complianceAccepted) {
                      setSettingsTab("eula");
                      setShowSettingsModal(true);
                      return;
                    }
                    onSelect("opus-clipper");
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", borderRadius: 12, cursor: "pointer",
                    background: `linear-gradient(135deg, ${G} 0%, #5def64 100%)`,
                    color: "#000",
                    fontSize: 13.5,
                    fontWeight: 800,
                    fontFamily: "'Space Grotesk', 'Geist', sans-serif", letterSpacing: "-0.01em",
                    border: "1px solid rgba(52, 235, 61,0.65)",
                    boxShadow: isOpusHovered ? "0 0 45px rgba(52, 235, 61,0.7)" : "0 0 28px rgba(52, 235, 61,0.35)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (isOpusHovered) {
                      e.currentTarget.style.boxShadow = "0 0 45px rgba(52, 235, 61,0.7)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isOpusHovered) {
                      e.currentTarget.style.boxShadow = "0 0 28px rgba(52, 235, 61,0.35)";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sparkles style={{ width: 15, height: 15 }} />
                    <span>Launch 1-Click Studio</span>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.22)",
                    color: "#000",
                    transition: "all 0.25s ease",
                  }}>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </div>
                </button>
              </div>


              {/* CARD 2: Pro Manual Studio */}
              <div
                id="tour-step-1-pro-card"
                style={{
                  position: "relative", overflow: "hidden",
                  background: isProHovered
                    ? "linear-gradient(160deg, rgba(52, 235, 61,0.08) 0%, rgba(52, 235, 61,0.02) 100%)"
                    : "linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.008) 100%)",
                  borderRadius: 20, padding: "24px 26px",
                  border: isProHovered
                    ? "1px solid rgba(52, 235, 61,0.45)"
                    : "1px solid rgba(255,255,255,0.1)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  boxShadow: isProHovered
                    ? "0 25px 80px rgba(0,0,0,0.65), 0 0 55px rgba(52, 235, 61,0.2)"
                    : "0 20px 60px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  transform: isProHovered ? "translateY(-3px)" : "none",
                }}
                onMouseEnter={() => handleCardMouseEnter("pro")}
                onMouseLeave={handleCardMouseLeave}
              >
                {/* Top ambient subtle highlight line */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none",
                  background: isProHovered
                    ? "linear-gradient(90deg, transparent, rgba(52, 235, 61,0.7), transparent)"
                    : "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                  transition: "all 0.25s ease",
                }} />

                <div>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "5px 11px", borderRadius: 999,
                      background: !isEffectivelyLicensed
                        ? "rgba(245, 158, 11, 0.1)"
                        : (isProHovered ? "rgba(52, 235, 61,0.1)" : "rgba(255,255,255,0.04)"),
                      border: !isEffectivelyLicensed
                        ? "1px solid rgba(245, 158, 11, 0.35)"
                        : (isProHovered ? "1px solid rgba(52, 235, 61,0.3)" : "1px solid rgba(255,255,255,0.1)"),
                      transition: "all 0.25s ease",
                    }}>
                      {!isEffectivelyLicensed ? (
                        <>
                          <Lock style={{ width: 12, height: 12, color: "#f59e0b" }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
                            Creator Pro Required
                          </span>
                        </>
                      ) : (
                        <>
                          <Sliders style={{ width: 12, height: 12, color: isProHovered ? G : "rgba(255,255,255,0.85)", transition: "color 0.25s ease" }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: isProHovered ? G : "rgba(255,255,255,0.85)", transition: "color 0.25s ease" }}>
                            {isEffectivelyMax 
                              ? "Unlimited Studio" 
                              : (effectiveStudioCredits ? `${effectiveStudioCredits.remaining}/3 Weekly Credits` : "3 Weekly Credits")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Icon */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                      background: isProHovered
                        ? "radial-gradient(circle, rgba(52, 235, 61,0.22) 0%, rgba(52, 235, 61,0.05) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                      border: isProHovered ? "1px solid rgba(52, 235, 61,0.4)" : "1px solid rgba(255,255,255,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isProHovered ? "0 0 25px rgba(52, 235, 61,0.25)" : "0 4px 20px rgba(0,0,0,0.3)",
                      transition: "all 0.25s ease",
                    }}>
                      <Layers style={{ width: 22, height: 22, color: isProHovered ? G : "#fff", transition: "color 0.25s ease" }} />
                    </div>

                    <div>
                      <h2 style={{
                        fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 21,
                        color: "#fff", letterSpacing: "-0.02em", margin: "0 0 3px",
                      }}>
                        Pro Manual Studio
                      </h2>
                      <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 500 }}>
                        Frame-accurate timeline, multi-ranges &amp; split-screen
                      </p>
                    </div>
                  </div>

                  {/* Feature checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26, paddingLeft: 2 }}>
                    {proFeatures.map((feat) => (
                      <div key={feat} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 17, height: 17, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isProHovered ? "rgba(52, 235, 61,0.14)" : "rgba(52, 235, 61,0.08)",
                          border: isProHovered ? "1px solid rgba(52, 235, 61,0.35)" : "1px solid rgba(52, 235, 61,0.22)",
                          transition: "all 0.25s ease",
                        }}>
                          <Check style={{ width: 10, height: 10, color: G }} />
                        </div>
                        <span style={{ fontSize: 12.5, color: isProHovered ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: 500, transition: "color 0.25s ease" }}>{feat}</span>
                      </div>
                    ))}
                  </div>

                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!complianceAccepted) {
                      setSettingsTab("eula");
                      setShowSettingsModal(true);
                      return;
                    }
                    if (!isEffectivelyLicensed) {
                      setProUpgradeReason("studio_locked");
                      setShowProUpgradeModal(true);
                      return;
                    }
                    if (effectiveStudioCredits && !isEffectivelyMax && effectiveStudioCredits.remaining <= 0) {
                      setShowUpgradeModal(true);
                      return;
                    }
                    onSelect("ai-clipper");
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", borderRadius: 12, cursor: "pointer",
                    background: isProHovered
                      ? `linear-gradient(135deg, ${G} 0%, #5def64 100%)`
                      : `linear-gradient(135deg, #2dca34 0%, ${G} 100%)`,
                    color: "#000",
                    fontSize: 13.5,
                    fontWeight: 800,
                    fontFamily: "'Space Grotesk', 'Geist', sans-serif", letterSpacing: "-0.01em",
                    border: "1px solid rgba(52, 235, 61,0.55)",
                    boxShadow: isProHovered ? "0 0 45px rgba(52, 235, 61,0.6)" : "0 0 22px rgba(52, 235, 61,0.25)",
                    transition: "all 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (isProHovered) {
                      e.currentTarget.style.boxShadow = "0 0 45px rgba(52, 235, 61,0.6)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isProHovered) {
                      e.currentTarget.style.boxShadow = "0 0 22px rgba(52, 235, 61,0.25)";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sliders style={{ width: 15, height: 15 }} />
                    <span>Open Pro Studio</span>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.22)",
                    color: "#000",
                    transition: "all 0.25s ease",
                  }}>
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </div>
                </button>
              </div>
          </div>

          {/* 3. Bottom Value Ribbon & Footer Links (Senior Monochromatic & Emerald) */}

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: 11.5, color: "rgba(255,255,255,0.5)", gap: 16,
          }}>
            {/* Stats (Left aligned) */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 800, color: G, fontFamily: "'Geist Mono', monospace" }}>9:16</span>
                <span>Native Shorts</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 800, color: "#fff", fontFamily: "'Geist Mono', monospace" }}>5+</span>
                <span>AI Engines</span>
              </div>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 800, color: G, fontFamily: "'Geist Mono', monospace" }}>&lt;2m</span>
                <span>GPU Acceleration</span>
              </div>
            </div>

            {/* Quick Actions & Navigation Links (Right aligned) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              {onStartTour && (
                <>
                  <button
                    type="button"
                    onClick={onStartTour}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.65)",
                      background: "none", border: "none", cursor: "pointer", transition: "color 0.2s"
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                  >
                    <Sparkles style={{ width: 12, height: 12, color: G }} />
                    <span>Guided Tour</span>
                  </button>
                  <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("updates");
                  setShowSettingsModal(true);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11.5, color: "rgba(255,255,255,0.6)",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                title="Software Updates & Version"
              >
                <RefreshCw style={{ width: 11, height: 11, color: G }} />
                <span>Updates</span>
              </button>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("general");
                  setShowSettingsModal(true);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11.5, color: "rgba(255,255,255,0.6)",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              >
                <Settings style={{ width: 12, height: 12 }} />
                <span>Settings</span>
              </button>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("refunds");
                  setShowSettingsModal(true);
                }}
                style={{
                  fontSize: 11.5, color: "rgba(255,255,255,0.6)",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.2s",
                  display: "flex", alignItems: "center", gap: 4,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                title="14-Day 100% Refund Policy"
              >
                <ShieldCheck style={{ width: 12, height: 12, color: G }} />
                <span>Refund Policy</span>
              </button>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("eula");
                  setShowSettingsModal(true);
                }}
                style={{
                  fontSize: 11.5, color: "rgba(255,255,255,0.5)",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                title="Terms, EULA & Privacy Policy"
              >
                <span>Legal &amp; Compliance</span>
              </button>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("faq");
                  setShowSettingsModal(true);
                }}
                style={{
                  fontSize: 11.5, color: "rgba(255,255,255,0.6)",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.2s",
                  display: "flex", alignItems: "center", gap: 4,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                title="Frequently Asked Questions & Support Desk"
              >
                <HelpCircle style={{ width: 12, height: 12, color: G }} />
                <span>FAQ &amp; Support</span>
              </button>
              <span style={{ color: "rgba(255,255,255,0.15)" }}>•</span>
              <button
                type="button"
                onClick={() => {
                  setSettingsTab("about");
                  setShowSettingsModal(true);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 11.5, color: "rgba(255,255,255,0.5)",
                  background: "none", border: "none", cursor: "pointer", transition: "color 0.2s"
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = G; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
              >
                <Heart style={{ width: 12, height: 12, color: G, fill: "rgba(52, 235, 61,0.25)" }} />
                <span>About</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── CENTERED WIDESCREEN SPOTLIGHT MODAL OVERLAY ── */}
      {expandedStudio && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            animation: "expandIn 0.25s ease-out",
          }}
          onClick={() => setExpandedStudio(null)}
        >
          {/* Card Container: mouseleave collapses it back to normal */}
          <div
            style={{
              position: "relative",
              width: "min(1040px, 94vw)",
              animation: "spotlightIn 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setExpandedStudio(null)}
          >
            {/* Outer glow ring */}
            <div style={{
              position: "absolute", inset: -1, borderRadius: 24, pointerEvents: "none",
              background: expandedStudio === "opus"
                ? "linear-gradient(135deg, rgba(52, 235, 61,0.28) 0%, rgba(52, 235, 61,0.06) 50%, transparent 100%)"
                : "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
              filter: "blur(10px)",
            }} />

            <div style={{
              position: "relative",
              background: expandedStudio === "opus"
                ? "linear-gradient(135deg, rgba(2,16,8,0.98) 0%, rgba(6,22,14,0.98) 100%)"
                : "linear-gradient(135deg, rgba(10,12,18,0.98) 0%, rgba(14,16,24,0.98) 100%)",
              borderRadius: 22,
              border: expandedStudio === "opus"
                ? "1px solid rgba(52, 235, 61,0.35)"
                : "1px solid rgba(255,255,255,0.12)",
              overflow: "hidden",
              boxShadow: expandedStudio === "opus"
                ? "0 40px 100px rgba(0,0,0,0.85), 0 0 70px rgba(52, 235, 61,0.15)"
                : "0 40px 100px rgba(0,0,0,0.85)",
            }}>
              {/* Top edge accent line */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2, pointerEvents: "none",
                background: expandedStudio === "opus"
                  ? `linear-gradient(90deg, transparent 0%, ${G} 40%, rgba(52, 235, 61,0.3) 100%)`
                  : "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0.08) 100%)",
              }} />

              <div style={{ padding: "34px 38px" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    {/* Studio icon */}
                    <div style={{
                      width: 58, height: 58, borderRadius: 18, flexShrink: 0,
                      background: expandedStudio === "opus"
                        ? "radial-gradient(circle, rgba(52, 235, 61,0.2) 0%, rgba(52, 235, 61,0.05) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                      border: expandedStudio === "opus" ? "1px solid rgba(52, 235, 61,0.35)" : "1px solid rgba(255,255,255,0.14)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: expandedStudio === "opus" ? "0 0 28px rgba(52, 235, 61,0.2)" : "0 4px 20px rgba(0,0,0,0.4)",
                    }}>
                      {expandedStudio === "opus"
                        ? <Sparkles style={{ width: 26, height: 26, color: G }} />
                        : <Layers style={{ width: 26, height: 26, color: "#fff" }} />
                      }
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                        <span style={{
                          fontFamily: "'Geist Mono', monospace", fontSize: 9.5, fontWeight: 700,
                          padding: "3px 9px", borderRadius: 999, letterSpacing: "0.1em", textTransform: "uppercase",
                          background: expandedStudio === "opus" ? "rgba(52, 235, 61,0.1)" : "rgba(255,255,255,0.06)",
                          border: expandedStudio === "opus" ? "1px solid rgba(52, 235, 61,0.3)" : "1px solid rgba(255,255,255,0.1)",
                          color: expandedStudio === "opus" ? G : "rgba(255,255,255,0.7)",
                        }}>
                          {expandedStudio === "opus" ? "Recommended" : "Precision Studio"}
                        </span>
                      </div>
                      <h2 style={{
                        fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 26,
                        color: "#fff", letterSpacing: "-0.025em", margin: "0 0 4px",
                      }}>
                        {expandedStudio === "opus" ? "1-Click Auto Clipper" : "Pro Manual Studio"}
                      </h2>
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, fontWeight: 450 }}>
                        {expandedStudio === "opus"
                          ? "Fully autonomous viral clip discovery — zero manual slicing required"
                          : "Frame-accurate timeline editing with full creative control"}
                      </p>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => setExpandedStudio(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.6)", fontSize: 11.5, fontWeight: 600, flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                  >
                    <Minimize2 style={{ width: 12, height: 12 }} />
                    <span>Collapse</span>
                  </button>
                </div>

                {/* ── Content: Left column (features) + Right column (how it works) ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 32, alignItems: "start" }}>

                  {/* Left: Feature list */}
                  <div>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                      color: "rgba(255,255,255,0.3)", fontFamily: "'Geist Mono', monospace", marginBottom: 14,
                    }}>
                      {expandedStudio === "opus" ? "Auto Features" : "Studio Features"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                      {(expandedStudio === "opus"
                        ? [
                            { label: "AI Virality Hook Discovery (0-100 pts)", detail: "Scores every moment for shareability" },
                            { label: "Auto Speaker Tracking & 9:16 Centering", detail: "Face-lock keeps subjects perfectly framed" },
                            { label: "Dynamic Word-by-Word Animated Subtitles", detail: "12 preset styles, karaoke-style reveal" },
                            { label: "Zero Slicing Hassle: Instant 1-Click Export", detail: "Full pipeline runs end-to-end automatically" },
                          ]
                        : [
                            { label: "Multi-Range Timeline Slicing & Waveforms", detail: "Precise audio-aligned cut points" },
                            { label: "Dual-Layer Gameplay & B-Roll Split-Screen", detail: "Side-by-side or pip composite exports" },
                            { label: "Custom Crop Bounding Boxes (9:16, 1:1, 16:9)", detail: "Per-clip aspect ratio targeting" },
                            { label: "Custom Audio Tracks & Background Music", detail: "Mix voice, SFX, and licensed beats" },
                          ]
                      ).map(({ label, detail }) => (
                        <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: expandedStudio === "opus" ? "rgba(52, 235, 61,0.12)" : "rgba(255,255,255,0.06)",
                            border: expandedStudio === "opus" ? "1px solid rgba(52, 235, 61,0.35)" : "1px solid rgba(255,255,255,0.12)",
                          }}>
                            <Check style={{ width: 11, height: 11, color: expandedStudio === "opus" ? G : "rgba(255,255,255,0.7)" }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 20 }}>
                      {(expandedStudio === "opus"
                        ? ["Zero Manual Editing", "Face Auto-Track", "Gemini AI", "Karaoke Captions"]
                        : ["Frame-Accurate Cuts", "12 Caption Styles", "Batch Export", "Dual Speaker"]
                      ).map((tag) => (
                        <span key={tag} style={{
                          padding: "4px 12px", borderRadius: 999, fontSize: 10.5, fontWeight: 600,
                          background: expandedStudio === "opus" ? "rgba(52, 235, 61,0.07)" : "rgba(255,255,255,0.04)",
                          border: expandedStudio === "opus" ? "1px solid rgba(52, 235, 61,0.2)" : "1px solid rgba(255,255,255,0.09)",
                          color: expandedStudio === "opus" ? G : "rgba(255,255,255,0.65)",
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Right: How it works — horizontal step flow */}
                  <div>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
                      color: "rgba(255,255,255,0.3)", fontFamily: "'Geist Mono', monospace", marginBottom: 14,
                    }}>
                      How It Works
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                      {(expandedStudio === "opus"
                        ? [
                            { id: "step-drop", icon: Download, title: "Drop Your Video", desc: "Import any podcast, lecture, stream, or interview. Any format, any length." },
                            { id: "step-ai", icon: Bot, title: "AI Analyzes", desc: "Gemini Flash scans every second — scoring hooks, emotion peaks, and quotable moments." },
                            { id: "step-clips", icon: Film, title: "Clips Ready", desc: "9:16 shorts with animated captions, face-tracking, and branding auto-applied. Export in one click." },
                          ]
                        : [
                            { id: "step-points", icon: Scissors, title: "Set In & Out Points", desc: "Drag precise markers on the visual waveform timeline with frame-level accuracy." },
                            { id: "step-style", icon: Palette, title: "Style & Caption", desc: "Pick from 12 animated subtitle presets. Add B-roll, custom crops, or background music." },
                            { id: "step-export", icon: Share2, title: "Batch Export", desc: "Export multiple clips simultaneously in any aspect ratio. Direct publish or local save." },
                          ]
                      ).map(({ id, icon: StepIcon, title, desc }, i) => (
                        <div key={id} style={{
                          padding: "20px 18px", borderRadius: 16, position: "relative",
                          background: expandedStudio === "opus"
                            ? "linear-gradient(160deg, rgba(52, 235, 61,0.05) 0%, rgba(0,0,0,0.35) 100%)"
                            : "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.35) 100%)",
                          border: expandedStudio === "opus"
                            ? "1px solid rgba(52, 235, 61,0.12)"
                            : "1px solid rgba(255,255,255,0.07)",
                        }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 10, marginBottom: 14,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: expandedStudio === "opus" ? "rgba(52, 235, 61,0.1)" : "rgba(255,255,255,0.05)",
                            border: expandedStudio === "opus" ? "1px solid rgba(52, 235, 61,0.25)" : "1px solid rgba(255,255,255,0.1)",
                          }}>
                            <StepIcon style={{
                              width: 18, height: 18,
                              color: expandedStudio === "opus" ? G : "rgba(255,255,255,0.85)",
                            }} />
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff", marginBottom: 8, lineHeight: 1.25 }}>{title}</div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{desc}</div>

                          {/* Connector arrow (not on last) */}
                          {i < 2 && (
                            <div style={{
                              position: "absolute", right: -10, top: "50%", transform: "translateY(-50%)",
                              color: "rgba(255,255,255,0.12)", fontSize: 18, fontWeight: 700, zIndex: 2,
                              pointerEvents: "none",
                            }}>→</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* CTA at bottom of right panel */}
                    <div style={{ marginTop: 20 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!complianceAccepted) { setSettingsTab("eula"); setShowSettingsModal(true); return; }
                          onSelect(expandedStudio === "opus" ? "opus-clipper" : "ai-clipper");
                        }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 9,
                          padding: "12px 24px", borderRadius: 10, cursor: "pointer",
                          background: expandedStudio === "opus"
                            ? `linear-gradient(135deg, ${G} 0%, #5def64 100%)`
                            : `linear-gradient(135deg, #2dca34 0%, ${G} 100%)`,
                          color: "#000",
                          fontSize: 13.5, fontWeight: 800,
                          fontFamily: "'Space Grotesk', 'Geist', sans-serif",
                          boxShadow: expandedStudio === "opus" ? "0 0 32px rgba(52, 235, 61,0.4)" : "0 0 22px rgba(52, 235, 61,0.25)",
                          border: "1px solid rgba(52, 235, 61,0.55)",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = expandedStudio === "opus"
                            ? "0 0 48px rgba(52, 235, 61,0.6)"
                            : "0 0 34px rgba(52, 235, 61,0.45)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = expandedStudio === "opus"
                            ? "0 0 32px rgba(52, 235, 61,0.4)"
                            : "0 0 22px rgba(52, 235, 61,0.25)";
                        }}
                      >
                        {expandedStudio === "opus"
                          ? <><Sparkles style={{ width: 15, height: 15 }} /><span>Launch 1-Click Studio</span><ChevronRight style={{ width: 14, height: 14 }} /></>
                          : <><Sliders style={{ width: 15, height: 15 }} /><span>Open Pro Studio</span><ChevronRight style={{ width: 14, height: 14 }} /></>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Enterprise Settings, Essential Agreements & Legal Compliance Center Modal ── */}
      {showSettingsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "54px 24px 24px",
          }}
          onClick={() => {
            if (complianceAccepted) {
              setShowSettingsModal(false);
            }
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(960px, 95vw)",
              height: "min(680px, calc(100vh - 84px))",
              background: "#0a0d14",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              boxShadow: "0 35px 120px rgba(0,0,0,0.98), 0 0 1px 1px rgba(52, 235, 61,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {hasDeclined ? (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "48px 36px",
                  textAlign: "center",
                  gap: 18,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: "rgba(255,102,122,0.1)",
                    border: "1px solid rgba(255,102,122,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle style={{ width: 28, height: 28, color: "#ff667a" }} />
                </div>
                <div style={{ maxWidth: 480 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                    Access Terminated: EULA Declined
                  </h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
                    ClipVault AI Video Studio requires explicit acceptance of the Master License Agreement and Local-First Privacy Terms to operate on your computer hardware.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setHasDeclined(false);
                      setAgreedTerms(false);
                      setSettingsTab("eula");
                    }}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "#fff",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    Review Agreement Again
                  </button>
                  <button
                    type="button"
                    onClick={handleDecline}
                    style={{
                      padding: "9px 24px",
                      borderRadius: 8,
                      background: "#ff667a",
                      border: "none",
                      color: "#000",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "0 0 20px rgba(255,102,122,0.35)",
                      transition: "all 0.15s",
                    }}
                  >
                    Exit Application
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.02)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(52, 235, 61,0.08)",
                        border: "1px solid rgba(52, 235, 61,0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Settings style={{ width: 19, height: 19, color: G }} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <h3 style={{ fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>
                          ClipVault Settings &amp; Compliance Center
                        </h3>
                        <span style={{
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 9,
                          fontFamily: "'Geist Mono', monospace",
                          fontWeight: 700,
                          background: "rgba(52, 235, 61,0.12)",
                          color: G,
                          border: "1px solid rgba(52, 235, 61,0.25)",
                        }}>
                          STUDIO V1.0 • LICENSED
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                        Local-First Studio Preferences • Essential Agreements • Master EULA • Privacy Policy
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {complianceAccepted && (
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(false)}
                        title="Close Settings (Esc)"
                        aria-label="Close Settings"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                        }}
                      >
                        <X style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                  </div>
                </div>

                {/* First-Time Notice Banner */}
                {!complianceAccepted && (
                  <div style={{ padding: "9px 24px", background: "rgba(52, 235, 61,0.06)", borderBottom: "1px solid rgba(52, 235, 61,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11.5, color: "rgba(255,255,255,0.75)", flexShrink: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <ShieldCheck style={{ width: 14, height: 14, color: G }} />
                      <span><strong>First-Time Security Review:</strong> Please review and confirm the local license &amp; privacy terms to unlock ClipVault Studio.</span>
                    </span>
                  </div>
                )}

                {/* Modal Body: 2-Column Sidebar + Content Pane */}
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr", overflow: "hidden" }}>
                  {/* Left Sidebar */}
                  <div
                    style={{
                      background: "rgba(0,0,0,0.35)",
                      borderRight: "1px solid rgba(255,255,255,0.06)",
                      padding: "16px 14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      overflowY: "auto",
                      gap: 14,
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {/* Search */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 10px",
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          fontSize: 11.5,
                          marginBottom: 8,
                        }}
                      >
                        <Search style={{ width: 13, height: 13, color: "rgba(255,255,255,0.4)" }} />
                        <input
                          type="text"
                          value={complianceSearch}
                          onChange={(e) => setComplianceSearch(e.target.value)}
                          placeholder="Search settings &amp; terms..."
                          style={{
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#fff",
                            fontSize: 11.5,
                            width: "100%",
                          }}
                        />
                        {complianceSearch && (
                          <button
                            type="button"
                            onClick={() => setComplianceSearch("")}
                            style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 0 }}
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        )}
                      </div>

                      {/* Group 1: Studio Configuration */}
                      <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.35)", padding: "6px 8px 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Studio Settings
                      </span>

                      {[
                        { id: "subscription", label: "Subscription & Plan", icon: CreditCard },
                        { id: "general", label: "General Preferences", icon: SlidersHorizontal },
                        { id: "ai", label: "AI Engines & BYOK", icon: Bot },
                        { id: "updates", label: "Software Updates", icon: RefreshCw },
                      ]
                        .filter((item) => !complianceSearch || item.label.toLowerCase().includes(complianceSearch.toLowerCase()))
                        .map((item) => {
                        const IconComponent = item.icon;
                        const isActive = settingsTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSettingsTab(item.id);
                              setComplianceSearch("");
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              padding: "8px 10px",
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: isActive ? 700 : 500,
                              textAlign: "left",
                              color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                              background: isActive ? "rgba(52, 235, 61,0.1)" : "transparent",
                              border: isActive ? "1px solid rgba(52, 235, 61,0.25)" : "1px solid transparent",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            <IconComponent style={{ width: 14, height: 14, color: isActive ? G : "rgba(255,255,255,0.45)" }} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}

                      {/* Group 2: Essential Agreements & Licenses */}
                      <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.35)", padding: "10px 8px 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Agreements &amp; Legal
                      </span>

                      {[
                        { id: "eula", label: "01. EULA (Master License)", icon: Scale },
                        { id: "terms", label: "02. Terms & Conditions", icon: FileText },
                        { id: "privacy", label: "03. Privacy Policy (Zero-Data)", icon: ShieldCheck },
                        { id: "refunds", label: "04. Refund & Cancellation Policy", icon: RefreshCw },
                        { id: "platform", label: "05. Platform Usage Policy", icon: Globe },
                        { id: "ai-ethics", label: "06. AI & Content Ethics", icon: Bot },
                        { id: "hardware", label: "07. Hardware & System Policy", icon: HardDrive },
                        { id: "trademark", label: "08. Trademark & Branding", icon: Shield },
                        { id: "liability", label: "09. Limitation of Liability", icon: AlertTriangle },
                      ]
                        .filter((item) => !complianceSearch || item.label.toLowerCase().includes(complianceSearch.toLowerCase()))
                        .map((item) => {
                        const IconComponent = item.icon;
                        const isActive = settingsTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSettingsTab(item.id);
                              setComplianceSearch("");
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 9,
                              padding: "8px 10px",
                              borderRadius: 8,
                              fontSize: 11.5,
                              fontWeight: isActive ? 700 : 500,
                              textAlign: "left",
                              color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                              background: isActive ? "rgba(52, 235, 61,0.1)" : "transparent",
                              border: isActive ? "1px solid rgba(52, 235, 61,0.25)" : "1px solid transparent",
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                          >
                            <IconComponent style={{ width: 14, height: 14, color: isActive ? G : "rgba(255,255,255,0.45)" }} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}

                      {/* Group 3: Company */}
                      <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.35)", padding: "10px 8px 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Questions &amp; Origin
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsTab("faq");
                          setComplianceSearch("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "8px 10px",
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: settingsTab === "faq" ? 700 : 500,
                          textAlign: "left",
                          color: settingsTab === "faq" ? "#fff" : "rgba(255,255,255,0.65)",
                          background: settingsTab === "faq" ? "rgba(52, 235, 61,0.1)" : "transparent",
                          border: settingsTab === "faq" ? "1px solid rgba(52, 235, 61,0.25)" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <HelpCircle style={{ width: 14, height: 14, color: settingsTab === "faq" ? G : "rgba(255,255,255,0.45)" }} />
                        <span>00. Questions &amp; Support</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSettingsTab("about");
                          setComplianceSearch("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "8px 10px",
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: settingsTab === "about" ? 700 : 500,
                          textAlign: "left",
                          color: settingsTab === "about" ? "#fff" : "rgba(255,255,255,0.65)",
                          background: settingsTab === "about" ? "rgba(52, 235, 61,0.1)" : "transparent",
                          border: settingsTab === "about" ? "1px solid rgba(52, 235, 61,0.25)" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <Heart style={{ width: 14, height: 14, color: settingsTab === "about" ? G : "rgba(255,255,255,0.45)" }} />
                        <span>About ClipVault Studio</span>
                      </button>
                    </div>

                    {/* Bottom Security Badge */}
                    <div
                      style={{
                        padding: "12px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        fontSize: 10.5,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: G, display: "flex", alignItems: "center", gap: 5 }}>
                        <Lock style={{ width: 12, height: 12 }} /> LOCAL VERIFICATION
                      </span>
                      <div style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.45 }}>
                        • Seat: Commercial Studio<br />
                        • Telemetry: 0% Collected<br />
                        • Cloud Proxies: None<br />
                        • Storage: 100% Local Machine
                      </div>
                    </div>
                  </div>

                  {/* Right Document & Settings Pane */}
                  <div
                    ref={documentPaneRef}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 40;
                      if (isBottom) {
                        setHasScrolledToBottom(true);
                        setShowScrollPrompt(false);
                      } else if (!hasScrolledToBottom) {
                        setShowScrollPrompt(false);
                        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                        scrollTimeoutRef.current = setTimeout(() => {
                          setShowScrollPrompt(true);
                        }, 5000);
                      }
                    }}
                    style={{
                      padding: "28px 36px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 24,
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {/* TAB: Subscription & Plan Details */}
                    {settingsTab === "subscription" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Subscription &amp; License Plan
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Review your active membership tier, commercial entitlements, workstation seat binding, and Lemon Squeezy billing.
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <a
                              href="https://app.lemonsqueezy.com/my-orders"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 13px",
                                borderRadius: 7,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "#fff",
                                fontSize: 11.5,
                                fontWeight: 600,
                                textDecoration: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                            >
                              <ExternalLink style={{ width: 12, height: 12, color: G }} />
                              <span>Lemon Squeezy Portal</span>
                            </a>
                          </div>
                        </div>

                        {/* Plan Banner Card */}
                        <div style={{
                          padding: "20px 22px",
                          borderRadius: "0 10px 10px 0",
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderLeft: `3px solid ${G}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 16,
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                                {isEffectivelyMax
                                  ? "Creator Max"
                                  : isEffectivelyPro
                                  ? "Creator Pro"
                                  : "Community Free Tier"}
                              </div>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                                {isEffectivelyMax
                                  ? "$25.00 / month • Uncapped Master Access"
                                  : isEffectivelyPro
                                  ? "$15.00 / month • Pro Studio & Unlimited Auto Clipper"
                                  : "$0.00 / month • 2 Clips / Week Community Quota"}
                              </div>
                            </div>

                            {/* Plan CTA / Upgrade Options */}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {!isEffectivelyMax && (
                                <button
                                  type="button"
                                  onClick={() => setShowUpgradeModal(true)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "7px 14px",
                                    borderRadius: 8,
                                    background: G,
                                    border: "none",
                                    color: "#000",
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                  }}
                                >
                                  <Sparkles style={{ width: 12, height: 12 }} />
                                  <span>{isEffectivelyPro ? "Upgrade to Max ($25/mo)" : "Get Creator Max"}</span>
                                </button>
                              )}
                              {!isEffectivelyLicensed && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProUpgradeReason("upgrade_menu");
                                      setShowProUpgradeModal(true);
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "7px 14px",
                                      borderRadius: 8,
                                      background: "rgba(52, 235, 61, 0.12)",
                                      border: "1px solid rgba(52, 235, 61, 0.35)",
                                      color: G,
                                      fontSize: 11.5,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <span>Get Creator Pro ($15/mo)</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onOpenActivation) {
                                        onOpenActivation();
                                      } else {
                                        window.dispatchEvent(new CustomEvent("clipvault-open-activation"));
                                      }
                                    }}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      padding: "7px 14px",
                                      borderRadius: 8,
                                      background: "rgba(255, 255, 255, 0.05)",
                                      border: "1px solid rgba(255, 255, 255, 0.12)",
                                      color: "#cbd5e1",
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Key style={{ width: 12, height: 12, color: G }} />
                                    <span>Activate Key</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* License metadata items */}
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 12,
                            paddingTop: 14,
                            borderTop: "1px solid rgba(255,255,255,0.06)",
                          }}>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Registered Account
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginTop: 2 }}>
                                {licenseData?.user_email || (isEffectivelyLicensed ? "Local Bound Creator Seat" : "Unregistered Community User")}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                License Key
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                                {!isEffectivelyLicensed ? (
                                  <span style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: "rgba(255,255,255,0.4)" }}>
                                    None
                                  </span>
                                ) : !showLicenseKey ? (
                                  <>
                                    <span style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em" }}>
                                      •••• •••• •••• ••••
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setLicenseRevealInput("");
                                        setShowLicenseRevealModal(true);
                                      }}
                                      title="Reveal license key (Security confirmation required)"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        borderRadius: 5,
                                        padding: "2px 8px",
                                        color: "#fff",
                                        fontSize: 10.5,
                                        fontFamily: "'Geist Mono', monospace",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                    >
                                      <Eye style={{ width: 11, height: 11, color: G }} />
                                      <span>Reveal</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{ fontSize: 12, fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: G }}>
                                      {licenseData?.license_key || licenseData?.key_preview || (isEffectivelyMax ? "CV-MAX-ACTIVE-SEAT" : "CV-PRO-ACTIVE-SEAT")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(licenseData?.license_key || licenseData?.key_preview || (isEffectivelyMax ? "CV-MAX-ACTIVE-SEAT" : "CV-PRO-ACTIVE-SEAT"), "key")}
                                      title="Copy license key"
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "rgba(255,255,255,0.5)",
                                        cursor: "pointer",
                                        padding: 2,
                                        display: "flex",
                                      }}
                                    >
                                      {copiedText === "key" ? <CheckCheck style={{ width: 12, height: 12, color: G }} /> : <Copy style={{ width: 12, height: 12 }} />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setShowLicenseKey(false)}
                                      title="Hide license key"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        background: "rgba(255,255,255,0.06)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: 5,
                                        padding: "2px 6px",
                                        color: "rgba(255,255,255,0.6)",
                                        fontSize: 10,
                                        fontFamily: "'Geist Mono', monospace",
                                        cursor: "pointer",
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
                                    >
                                      <EyeOff style={{ width: 11, height: 11 }} />
                                      <span>Hide</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Workstation Binding
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginTop: 2 }}>
                                1 Local Machine (Hardware GUID Verified)
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, fontFamily: "'Geist Mono', monospace", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                Merchant of Record
                              </div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginTop: 2 }}>
                                Lemon Squeezy LLC (Tax &amp; Invoices)
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Entitlements Comparison Matrix */}
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                            Plan Entitlements &amp; Capabilities
                          </div>
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 12,
                          }}>
                            {/* Feature 1 */}
                            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>1-Click Auto Clipper</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                                {isEffectivelyMax || isEffectivelyPro ? "Unlimited Runs" : "2 Clips / Week"}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                                {isEffectivelyMax || isEffectivelyPro ? "Autonomous viral discovery uncapped" : "Free Community weekly allowance"}
                              </div>
                            </div>

                            {/* Feature 2 */}
                            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>Pro Manual Studio</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                                {isEffectivelyMax || isEffectivelyPro ? "Full Studio Unlocked" : "Preview Mode Only"}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                                {isEffectivelyMax || isEffectivelyPro ? "Frame-accurate timeline & unlimited exports" : "Exporting requires Pro or Max license"}
                              </div>
                            </div>

                            {/* Feature 3 */}
                            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>Master Export Resolution</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                                {isEffectivelyMax ? "8K Cinema & 4K UHD" : isEffectivelyPro ? "4K UHD Master (2160p)" : "1080p Full HD"}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                                {isEffectivelyMax ? "Full uncompressed 8K cinematic bitrate" : isEffectivelyPro ? "Broadcast-grade 4K UHD 60fps" : "Standard social media resolution"}
                              </div>
                            </div>

                            {/* Feature 4 */}
                            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>Commercial Rights</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                                {isEffectivelyMax || isEffectivelyPro ? "100% Commercial" : "Personal / Non-Commercial"}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                                {isEffectivelyMax || isEffectivelyPro ? "Full monetization & client deliverables" : "Evaluation and personal creative clips"}
                              </div>
                            </div>

                            {/* Feature 5 */}
                            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>Local Processing</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                                100% On-Device Neural
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                                Zero cloud video uploads or AI data retention
                              </div>
                            </div>

                            {/* Feature 6 */}
                            <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase" }}>Developer Support</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginTop: 4 }}>
                                {isEffectivelyMax ? "VIP Priority 24/7" : isEffectivelyPro ? "Direct Email Support" : "Community Documentation"}
                              </div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                                {isEffectivelyMax ? "support@clipvault.app • 24h SLA" : "Direct engineer troubleshooting"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Compliance & Consumer Rights Card */}
                        <div style={{
                          padding: "16px 20px",
                          borderRadius: "0 10px 10px 0",
                          background: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderLeft: `3px solid ${G}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: "#fff", fontSize: 12.5 }}>
                              <ShieldCheck style={{ width: 15, height: 15, color: G }} />
                              <span>Consumer Rights, 14-Day Refund &amp; Compliance Guarantees</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSettingsTab("refunds")}
                              style={{
                                background: "none",
                                border: "none",
                                color: G,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                textDecoration: "underline",
                              }}
                            >
                              <span>View Full Refund Policy</span>
                              <ChevronRight style={{ width: 11, height: 11 }} />
                            </button>
                          </div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
                            ClipVault complies with global consumer protection regulations. All purchases are backed by our <strong>14-day 100% money-back guarantee</strong>. You can cancel your subscription at any time with 1-click via the Lemon Squeezy portal with zero cancellation fees. Invoices comply with EU VAT and US state tax codes.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 1: General Preferences */}
                    {settingsTab === "general" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                            General Preferences
                          </h3>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                            Configure default export resolution, hardware encoder, framerate, and local working directories.
                          </p>
                        </div>

                        {/* Setting 1: Default Export Resolution */}
                        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Default Export Resolution</div>
                              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Initial rendering resolution applied to newly created clips</div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", color: G, fontWeight: 700 }}>
                              {defaultRes === "4k" ? "2160x3840 (4K UHD)" : defaultRes === "8k" ? "4320x7680 (8K Cinema)" : defaultRes === "1440p" ? "1440x2560 (2K QHD)" : defaultRes === "720p" ? "720x1280 (HD)" : defaultRes === "source" ? "Source Native" : "1080x1920 (Full HD)"}
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                            {[
                              { id: "1080p", label: "1080p Full HD", desc: "Recommended for TikTok & Reels" },
                              { id: "720p", label: "720p Fast Draft", desc: "Ultra-fast preview export" },
                              { id: "source", label: "Source Native", desc: "Match source resolution" },
                              { id: "1440p", label: "1440p QHD", desc: "2K Quad HD • High detail" },
                              { id: "4k", label: "4K Pro Ultra", desc: "Ultra HD master export" },
                              { id: "8k", label: "8K Cinema", desc: "Maximum bitrate master" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setDefaultRes(opt.id);
                                  try {
                                    localStorage.setItem("clipvault_def_res", opt.id);
                                  } catch {}
                                  window.dispatchEvent(new CustomEvent("clipvault-resolution-changed", { detail: opt.id }));
                                }}
                                style={{
                                  padding: "12px",
                                  borderRadius: 8,
                                  background: defaultRes === opt.id ? "rgba(52, 235, 61,0.08)" : "rgba(255,255,255,0.02)",
                                  border: defaultRes === opt.id ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.08)",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 12, color: defaultRes === opt.id ? "#fff" : "rgba(255,255,255,0.75)", marginBottom: 2 }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                                  {opt.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Setting 2: Framerate & Motion Smoothness */}
                        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Framerate &amp; Motion Smoothness</div>
                              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Render target fps for exported vertical video containers</div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: "'Geist Mono', monospace", color: G, fontWeight: 700 }}>
                              {defaultFps} FPS
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                            {[
                              { id: "60", label: "60 FPS (Ultra Smooth)", desc: "Fluid animations and zero motion stutter" },
                              { id: "30", label: "30 FPS (Standard Cinematic)", desc: "Fast encoding and lower file size" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setDefaultFps(opt.id);
                                  localStorage.setItem("clipvault_def_fps", opt.id);
                                }}
                                style={{
                                  padding: "12px",
                                  borderRadius: 8,
                                  background: defaultFps === opt.id ? "rgba(52, 235, 61,0.08)" : "rgba(255,255,255,0.02)",
                                  border: defaultFps === opt.id ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.08)",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 12, color: defaultFps === opt.id ? "#fff" : "rgba(255,255,255,0.75)", marginBottom: 2 }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                                  {opt.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Setting 3: Local Storage Directory */}
                        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Local Output Directory</div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Where rendered MP4 clips, subtitles, and temporary waveform files are preserved</div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Geist Mono', monospace", fontSize: 11.5, color: "rgba(255,255,255,0.75)" }}>
                              {defaultStorage}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                copyToClipboard(defaultStorage, "path");
                                setCopiedPath(true);
                                setTimeout(() => setCopiedPath(false), 2000);
                              }}
                              style={{
                                display: "flex", alignItems: "center", gap: 6,
                                padding: "8px 14px", borderRadius: 8,
                                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                                color: "#fff", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              {copiedPath ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                              <span>{copiedPath ? "Copied" : "Copy Path"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Setting 4: Zero-Telemetry Guarantee */}
                        <div style={{ padding: "16px 20px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <ShieldCheck style={{ width: 20, height: 20, color: G }} />
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Zero-Telemetry Guarantee</div>
                              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>
                                ClipVault does not contain analytics beacons, telemetry collectors, or usage monitors.
                              </div>
                            </div>
                          </div>
                          <span style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)", color: G, fontSize: 10, fontFamily: "'Geist Mono', monospace", fontWeight: 700 }}>
                            100% PRIVATE
                          </span>
                        </div>

                        {/* Setting 5: Continuous Software Updates */}
                        <div style={{ padding: "16px 20px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <RefreshCw style={{ width: 20, height: 20, color: G }} />
                            <div>
                              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Continuous Software Updates</div>
                              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)" }}>
                                ClipVault is continuously updated with improvements and fixes. Current: v{updateStatus?.currentVersion || "1.0.0"}.
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSettingsTab("updates")}
                            style={{
                              padding: "6px 12px", borderRadius: 6,
                              background: "rgba(52, 235, 61,0.12)", border: "1px solid rgba(52, 235, 61,0.3)",
                              color: G, fontSize: 11, fontFamily: "'Geist Mono', monospace", fontWeight: 700,
                              cursor: "pointer", transition: "all 0.15s ease",
                            }}
                          >
                            View Updates &amp; Version
                          </button>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: AI Engines & BYOK */}
                    {settingsTab === "ai" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                            AI Engines &amp; BYOK Configuration
                          </h3>
                          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                            Manage speech-to-text models, cloud AI providers, and encrypted Bring-Your-Own-Key credentials.
                          </p>
                        </div>

                        {/* Speech Engine */}
                        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Speech-to-Text Transcription Engine</div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Local offline neural transcription with word-level alignment</div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                            {[
                              { id: "large-v3-turbo", label: "Faster-Whisper Turbo", desc: "Fastest GPU/CPU offline transcription" },
                              { id: "base", label: "Whisper Base", desc: "Lightweight, low memory profile" },
                              { id: "small", label: "Whisper Small", desc: "Balanced accuracy and speed" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setWhisperModel(opt.id);
                                  localStorage.setItem("clipvault_whisper_model", opt.id);
                                }}
                                style={{
                                  padding: "12px",
                                  borderRadius: 8,
                                  background: whisperModel === opt.id ? "rgba(52, 235, 61,0.08)" : "rgba(255,255,255,0.02)",
                                  border: whisperModel === opt.id ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.08)",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 12, color: whisperModel === opt.id ? "#fff" : "rgba(255,255,255,0.75)", marginBottom: 2 }}>
                                  {opt.label}
                                </div>
                                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                                  {opt.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Frontier LLM Provider */}
                        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Active Hook &amp; Virality AI Model</div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Direct provider dispatch over TLS 1.3 with 0 intermediate proxy servers</div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                            {[
                              { id: "gemini_flash", label: "Google Gemini 2.5 Flash", badge: "Recommended", desc: "1M+ context window, excellent narrative arcs" },
                              { id: "groq_lpu", label: "Groq LPU (Llama 3.3 70B)", badge: "500+ tok/s", desc: "Ultra-fast sub-second moment extraction" },
                              { id: "openai_chatgpt", label: "OpenAI GPT-4o", badge: "GPT-4o", desc: "Deep multi-stage conversational reasoning" },
                              { id: "deepseek", label: "DeepSeek V3 / R1", badge: "Reasoning", desc: "Mathematical retention analysis" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setActiveLlm(opt.id);
                                  localStorage.setItem("clipvault_active_llm", opt.id);
                                }}
                                style={{
                                  padding: "12px",
                                  borderRadius: 8,
                                  background: activeLlm === opt.id ? "rgba(52, 235, 61,0.08)" : "rgba(255,255,255,0.02)",
                                  border: activeLlm === opt.id ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.08)",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  transition: "all 0.15s",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                                  <span style={{ fontWeight: 700, fontSize: 12, color: activeLlm === opt.id ? "#fff" : "rgba(255,255,255,0.75)" }}>{opt.label}</span>
                                  <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "rgba(52, 235, 61,0.1)", color: G, fontFamily: "'Geist Mono', monospace" }}>{opt.badge}</span>
                                </div>
                                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>
                                  {opt.desc}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Face Tracking Sensitivity */}
                        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>MediaPipe Face Detector Sensitivity</div>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>Controls threshold for detecting secondary guest speakers in dual-speaker podcasts</div>

                          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            {[
                              { id: "high", label: "High Sensitivity (0.35)", desc: "Optimal for split-screen 2-person dialogues" },
                              { id: "standard", label: "Standard Sensitivity (0.50)", desc: "Default single speaker tracking" },
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setFaceSensitivity(opt.id);
                                  localStorage.setItem("clipvault_face_sensitivity", opt.id);
                                }}
                                style={{
                                  flex: 1, padding: "10px 14px", borderRadius: 8,
                                  background: faceSensitivity === opt.id ? "rgba(52, 235, 61,0.08)" : "rgba(255,255,255,0.02)",
                                  border: faceSensitivity === opt.id ? `1px solid ${G}` : "1px solid rgba(255,255,255,0.08)",
                                  textAlign: "left", cursor: "pointer",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 12, color: faceSensitivity === opt.id ? "#fff" : "rgba(255,255,255,0.75)" }}>{opt.label}</div>
                                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Software Updates & Version */}
                    {settingsTab === "updates" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                                Software Updates &amp; Version
                              </h3>
                              <span style={{
                                padding: "2px 8px", borderRadius: 4, fontSize: 9.5,
                                fontFamily: "'Geist Mono', monospace", fontWeight: 700,
                                background: "rgba(52, 235, 61, 0.12)", color: G,
                                border: "1px solid rgba(52, 235, 61, 0.3)",
                              }}>
                                CONTINUOUS UPDATES
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                              ClipVault is continuously developed and improved with new clipping capabilities, speed enhancements, and fixes.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleCheckUpdatesNow}
                            disabled={isManualCheckingUpdates}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 8,
                              padding: "8px 16px", borderRadius: 8,
                              background: isManualCheckingUpdates ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, #2dca34 0%, ${G} 100%)`,
                              border: "1px solid rgba(52, 235, 61, 0.4)",
                              color: isManualCheckingUpdates ? "rgba(255,255,255,0.5)" : "#000",
                              fontSize: 12, fontWeight: 700,
                              cursor: isManualCheckingUpdates ? "not-allowed" : "pointer",
                              transition: "all 0.2s ease",
                              flexShrink: 0,
                            }}
                          >
                            <RefreshCw style={{ width: 13, height: 13, animation: isManualCheckingUpdates ? "spin 1.2s linear infinite" : "none" }} />
                            <span>{isManualCheckingUpdates ? "Checking for Updates..." : "Check for Updates"}</span>
                          </button>
                        </div>

                        {/* Live Update Status Banner */}
                        {updateCheckFeedback && (
                          <div style={{
                            padding: "12px 16px", borderRadius: 10,
                            background: "rgba(52, 235, 61, 0.08)", border: "1px solid rgba(52, 235, 61, 0.3)",
                            display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#fff",
                          }}>
                            <CheckCircle2 style={{ width: 15, height: 15, color: G, flexShrink: 0 }} />
                            <span>{updateCheckFeedback}</span>
                          </div>
                        )}

                        {/* Status Metrics Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                          <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>
                              Current Version
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Geist Mono', monospace" }}>
                              v{updateStatus?.currentVersion || "1.0.0"}
                            </div>
                            <div style={{ fontSize: 10.5, color: G, marginTop: 2 }}>Installed and Active</div>
                          </div>

                          <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>
                              Update Schedule
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Geist Mono', monospace" }}>
                              Continuous
                            </div>
                            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Rolling improvements</div>
                          </div>

                          <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>
                              Last Checked
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", fontFamily: "'Geist Mono', monospace" }}>
                              {updateStatus?.lastUpdateCheck ? new Date(updateStatus.lastUpdateCheck).toLocaleDateString() : "Today"}
                            </div>
                            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                              {updateStatus?.lastUpdateCheck ? new Date(updateStatus.lastUpdateCheck).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Up to date"}
                            </div>
                          </div>

                          <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'Geist Mono', monospace", textTransform: "uppercase", marginBottom: 4 }}>
                              Development Note
                            </div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: G, fontFamily: "'Geist Mono', monospace" }}>
                              Solo Dev &amp; Student
                            </div>
                            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Continuous development</div>
                          </div>
                        </div>

                        {/* Architectural Pillar Cards (Clear, friendly, no jargon) */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Sparkles style={{ width: 15, height: 15, color: G }} />
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: 12.5 }}>01. Continuously Improved</span>
                            </div>
                            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.55 }}>
                              As a dedicated solo developer and student, I continuously improve ClipVault—adding new AI capabilities, smoother clipping, and optimizations directly to you as soon as they are ready.
                            </p>
                          </div>

                          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Download style={{ width: 15, height: 15, color: G }} />
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: 12.5 }}>02. Automatic &amp; Hassle-Free</span>
                            </div>
                            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.55 }}>
                              When an update is ready, the app prepares it smoothly in the background without interrupting your editing. You can apply it whenever you are ready.
                            </p>
                          </div>

                          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <ShieldCheck style={{ width: 15, height: 15, color: G }} />
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: 12.5 }}>03. Safe &amp; Genuine</span>
                            </div>
                            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.55 }}>
                              Every update is verified before installing, ensuring your software is always official, virus-free, and safe for your computer.
                            </p>
                          </div>

                          <div style={{ padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <Lock style={{ width: 15, height: 15, color: G }} />
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: 12.5 }}>04. 100% Private to You</span>
                            </div>
                            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.55 }}>
                              Checking for updates only checks if a new version is available. None of your videos, clips, audio, transcripts, or personal data ever leave your computer.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: End User License Agreement (EULA) */}
                    {settingsTab === "eula" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              End User License Agreement (EULA)
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Master Commercial Contract • Published by ClipVault Studio LLC • Version 2.5 (Security &amp; Compliance Enhanced)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("CLIPVAULT END USER LICENSE AGREEMENT (EULA)\nVersion 2.5 - Published by ClipVault Studio LLC\n\n1. Software License Grant: You are granted a worldwide, non-exclusive, non-transferable right to install and execute ClipVault AI Video Studio on your local personal and production computers according to your active subscription plan.\n\n2. Intellectual Property: ClipVault Studio LLC retains all title, copyright, and intellectual property rights in and to the software, source code, and cryptographic security architecture.\n\n3. Prohibited Actions & Anti-Reverse Engineering: You may not modify, adapt, translate, reverse-engineer, decompile, disassemble, or memory-patch the binary executable or local Python engine. You may not tamper with, decode, bypass, or forge encrypted license payloads, HMAC security seals, credit counters, or subscription tier attributes.\n\n4. Local Hardware Execution: The software executes 100% locally on your machine using your CPU, GPU, and RAM.\n\n5. Warranty Disclaimer: The software is provided AS IS, without warranty of any kind.\n\n6. Anti-Tamper & Security Compliance: ClipVault incorporates asymmetric cryptographic verification (Ed25519), hardware machine-binding, and anti-rollback timestamp monitoring. Any anomalous or suspicious activity is automatically detected and logged.\n\n7. Immediate License Termination for Suspicious Activity: Any detected tampering, reverse engineering, unauthorized elevation to Creator Pro or Creator Max, clock manipulation, or suspicious activity will lead to the immediate, automatic, and irrevocable termination of your license, revocation of feature access, and seat deactivation without notice, refund, or recourse.", "eula")}
                            style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                              borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff", fontSize: 11.5, cursor: "pointer",
                            }}
                          >
                            {copiedText === "eula" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "eula" ? "Copied" : "Copy EULA"}</span>
                          </button>
                        </div>

                        {/* EULA Core Summary Highlights */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                          <div style={{ padding: "14px 18px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}` }}>
                            <div style={{ fontWeight: 700, color: "#fff", fontSize: 12.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                              <Scale style={{ width: 15, height: 15, color: G }} />
                              <span>100% Creator Monetization Rights</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                              You retain exclusive commercial ownership, copyright, and monetization rights over all final video master outputs, vertical clips, and subtitles with 0% developer royalties.
                            </p>
                          </div>

                          <div style={{ padding: "14px 18px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: "3px solid #ff667a" }}>
                            <div style={{ fontWeight: 700, color: "#fff", fontSize: 12.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                              <Lock style={{ width: 15, height: 15, color: "#ff667a" }} />
                              <span>Strict Anti-Tamper &amp; License Revocation</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                              Decompiling, reverse engineering, forging tier status, or manipulating credit vaults is strictly prohibited. Any suspicious activity leads to immediate and permanent license termination without refund.
                            </p>
                          </div>
                        </div>

                        {/* Full Contract Sections */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div>
                            <strong>1. Software License Grant:</strong> You are granted a worldwide, non-exclusive, non-transferable right to install and execute ClipVault AI Video Studio on your local personal and production computers according to your active subscription plan (Community Free, Creator Pro, or Creator Max).
                          </div>
                          <div>
                            <strong>2. Intellectual Property Ownership:</strong> The developer (ClipVault Studio LLC) retains all title, copyright, and intellectual property rights in and to the software, algorithms, source code, and design architecture.
                          </div>
                          <div>
                            <strong>3. Prohibited Actions &amp; Reverse Engineering:</strong> You may not modify, adapt, translate, reverse-engineer, decompile, disassemble, or memory-patch the binary executable or local Python engine. You may not tamper with, decode, bypass, or forge encrypted license payloads, HMAC security seals, credit counters, or subscription tier attributes. You may not distribute cracked builds, key bypasses, or sublicense ClipVault.
                          </div>
                          <div>
                            <strong>4. Local Hardware Execution:</strong> The software executes 100% locally on your machine using your CPU, GPU, and RAM. No video files are uploaded to central servers.
                          </div>
                          <div>
                            <strong>5. Warranty Disclaimer:</strong> The software is provided "AS IS", without warranty of any kind, express or implied.
                          </div>
                          <div>
                            <strong>6. Anti-Tamper &amp; Security Compliance:</strong> ClipVault incorporates asymmetric cryptographic signature verification (Ed25519), hardware machine-binding, and anti-rollback timestamp monitoring. Any anomalous or suspicious activity—including binary patching, memory tampering, clock manipulation, or forged tier claims—is automatically detected and logged.
                          </div>
                          <div>
                            <strong>7. Immediate License Termination for Suspicious Activity:</strong> ClipVault Studio LLC reserves the right to immediately, permanently, and irrevocably terminate and revoke your software license, cancel active seats, and permanently blacklist associated machine fingerprints upon any detection of tampering, reverse engineering, unauthorized elevation to Pro or Max tiers, or suspicious activity, without prior notice and with zero entitlement to refund or recourse.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: Terms and Conditions (T&C) */}
                    {settingsTab === "terms" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Terms and Conditions (T&amp;C)
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Rules governing user accounts, commercial rights, fair use, and account termination rights.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("CLIPVAULT TERMS AND CONDITIONS\n\n1. User Accounts & License Seats: ClipVault is licensed per seat. You are responsible for safeguarding your license activation credentials.\n\n2. Commercial Distribution: Videos generated through ClipVault may be commercially distributed across YouTube, TikTok, Instagram Reels, client deliverables, and broadcast media with 0% revenue share or royalties owed.\n\n3. Fair Use & Ingestion Guidelines: Ingesting third-party footage must comply with Section 107 of the U.S. Copyright Act (Fair Use Doctrine) for commentary, critique, education, and transformative summarization.\n\n4. Behavior Guidelines: You agree not to use the software to process defamatory, illicit, or harmful materials.\n\n5. Account, Seat & License Termination: Any violation of intellectual property rights, tampering with local license or credit verification vaults, reverse engineering to unlock Creator Pro or Creator Max capabilities, or detected suspicious activity will result in immediate, permanent termination and revocation of license with zero refund.", "terms")}
                            style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                              borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff", fontSize: 11.5, cursor: "pointer",
                            }}
                          >
                            {copiedText === "terms" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "terms" ? "Copied" : "Copy T&C"}</span>
                          </button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div>
                            <strong>1. User Accounts &amp; License Seats:</strong> ClipVault is licensed per seat. You are responsible for safeguarding your license activation credentials.
                          </div>
                          <div>
                            <strong>2. Commercial Distribution:</strong> Videos generated through ClipVault may be commercially distributed across YouTube, TikTok, Instagram Reels, client deliverables, and broadcast media with 0% revenue share or royalties owed.
                          </div>
                          <div>
                            <strong>3. Fair Use &amp; Ingestion Guidelines:</strong> ClipVault incorporates standard media utilities (`ffmpeg`, `yt-dlp`). Ingesting third-party footage must comply with Section 107 of the U.S. Copyright Act (Fair Use Doctrine) for commentary, critique, education, and transformative summarization. Users assume full legal responsibility for third-party media they publish.
                          </div>
                          <div>
                            <strong>4. Behavior Guidelines:</strong> You agree not to use the software to process defamatory, illicit, or harmful materials.
                          </div>
                          <div>
                            <strong>5. Account, Seat &amp; License Termination:</strong> Any violation of intellectual property rights, tampering with local license or credit verification vaults, reverse engineering to unlock Creator Pro or Creator Max capabilities, or detected suspicious activity will result in immediate, permanent termination and revocation of license with zero refund.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 5: Privacy Policy */}
                    {settingsTab === "privacy" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Privacy Policy (Mandatory Disclosure)
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Transparent disclosure explaining what data is collected, how it is used, and how it is protected.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("CLIPVAULT PRIVACY POLICY\n...", "privacy")}
                            style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                              borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff", fontSize: 11.5, cursor: "pointer",
                            }}
                          >
                            {copiedText === "privacy" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "privacy" ? "Copied" : "Copy Privacy"}</span>
                          </button>
                        </div>

                        <div style={{ padding: "16px 20px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}`, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>Summary of User Data Collection: ZERO</div>
                          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                            ClipVault collects <strong>0% of your video files</strong> and <strong>0% telemetry data</strong>. All video rendering, face tracking, and neural models execute 100% locally on your computer hardware.
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div>
                            <strong>• Zero Telemetry:</strong> ClipVault contains zero analytics trackers, telemetry collectors, or usage monitors.
                          </div>
                          <div>
                            <strong>• Local File Storage:</strong> Video frames, temporary audio waveforms, and subtitle caches are saved exclusively to your local device directories (e.g. `%LOCALAPPDATA%` / `engine/clips`).
                          </div>
                          <div>
                            <strong>• Direct BYOK Connection:</strong> When you connect your personal API key (Google, Groq, OpenAI), your requests travel directly from your IP address to the official AI endpoint over TLS 1.3 HTTPS. No proxy server ever touches your data.
                          </div>
                          <div>
                            <strong>• Absolute Right to Erasure:</strong> All rendered media and cache can be permanently deleted directly from disk using the built-in storage manager.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Refund & Cancellation Policy */}
                    {settingsTab === "refunds" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              04. Refund &amp; Cancellation Policy
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Transparent 14-day money-back guarantee, 1-click cancellation rules, and Lemon Squeezy Merchant of Record disclosures.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("CLIPVAULT REFUND & CANCELLATION POLICY\n\n1. 14-Day Money-Back Guarantee: All initial purchases of ClipVault Creator Pro and Creator Max are backed by a 100% money-back guarantee within 14 calendar days of payment.\n\n2. Refund Requests: Email support@clipvault.app or use the Lemon Squeezy portal (app.lemonsqueezy.com/my-orders). Requests are processed within 24-48 hours.\n\n3. 1-Click Cancellation: Subscriptions may be canceled at any time via the Lemon Squeezy customer hub with zero fees. Access remains active until the prepaid billing cycle concludes.\n\n4. Merchant of Record: Lemon Squeezy LLC acts as Merchant of Record, ensuring full EU VAT and US sales tax compliance with itemized invoices.\n\n5. Workstation Binding: Licenses include 1 local machine seat. Hardware transfers and reinstalls are fully supported without extra charge.", "refunds")}
                            style={{
                              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                              borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                              color: "#fff", fontSize: 11.5, cursor: "pointer",
                            }}
                          >
                            {copiedText === "refunds" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "refunds" ? "Copied" : "Copy Policy"}</span>
                          </button>
                        </div>

                        {/* Highlight Card */}
                        <div style={{ padding: "16px 20px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}`, display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                            <ShieldCheck style={{ width: 15, height: 15, color: G }} />
                            <span>14-Day 100% Money-Back Guarantee</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.55 }}>
                            If ClipVault does not meet your creative workflow needs or fails to perform on your computer hardware, you are entitled to a full 100% refund within 14 calendar days of your initial purchase date. No questions asked.
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
                          <div>
                            <strong style={{ color: "#fff" }}>1. Eligibility for Full Refund:</strong>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              The 14-day money-back guarantee covers all initial purchases of ClipVault Creator Pro ($15/mo) and ClipVault Creator Max ($25/mo). Refund requests submitted within 14 calendar days of transaction settlement are automatically approved and credited back to the original payment method (Credit/Debit Card, PayPal, or Apple Pay).
                            </p>
                          </div>

                          <div>
                            <strong style={{ color: "#fff" }}>2. Step-by-Step Refund Process:</strong>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              To initiate a refund, you may use either method below:
                            </p>
                            <ul style={{ margin: "6px 0 0", paddingLeft: 20, color: "rgba(255,255,255,0.65)", display: "flex", flexDirection: "column", gap: 4 }}>
                              <li><strong>Direct Support Email:</strong> Send your order reference or license email to <code style={{ color: G }}>support@clipvault.app</code>. We respond and process requests within 24 to 48 hours.</li>
                              <li><strong>Lemon Squeezy Order Hub:</strong> Log in to <a href="https://app.lemonsqueezy.com/my-orders" target="_blank" rel="noopener noreferrer" style={{ color: G }}>app.lemonsqueezy.com/my-orders</a> using your checkout email and select &quot;Request Refund&quot; on your order receipt.</li>
                            </ul>
                            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              Once processed, funds typically reflect in your account within 3 to 5 business days, depending on your financial institution.
                            </p>
                          </div>

                          <div>
                            <strong style={{ color: "#fff" }}>3. 1-Click Subscription Cancellation:</strong>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              You can cancel your subscription at any time without contacting support. Simply navigate to the Lemon Squeezy customer hub (<a href="https://app.lemonsqueezy.com/my-orders" target="_blank" rel="noopener noreferrer" style={{ color: G }}>app.lemonsqueezy.com/my-orders</a>) and click &quot;Cancel Subscription&quot;. There are no cancellation penalties, early termination fees, or hidden retention traps. Upon cancellation, you will retain full access to all features until the end of your current prepaid billing period.
                            </p>
                          </div>

                          <div>
                            <strong style={{ color: "#fff" }}>4. Merchant of Record &amp; Tax Compliance:</strong>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              All order processing, payment collection, and invoicing are handled by <strong>Lemon Squeezy LLC</strong>, our authorized Merchant of Record. Lemon Squeezy complies with international commerce regulations, including EU VAT collection (with reverse charge support for business VAT IDs) and state sales taxes across the United States. Itemized VAT-compliant tax receipts and invoices are provided for every billing cycle.
                            </p>
                          </div>

                          <div>
                            <strong style={{ color: "#fff" }}>5. Workstation Seat Transfers &amp; Hardware Replacement:</strong>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              Each license key is bound to 1 active local workstation. If you replace your computer, upgrade motherboards, or reinstall Windows, your license seat can be transferred free of charge. You may deactivate the seat from Settings or email <code style={{ color: G }}>support@clipvault.app</code> for an instant seat reset.
                            </p>
                          </div>

                          <div>
                            <strong style={{ color: "#fff" }}>6. Fair Play &amp; Chargebacks:</strong>
                            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)" }}>
                              Before filing a payment dispute or chargeback with your bank, please reach out to our engineering support team. Chargebacks incur unnecessary delays and merchant fees, whereas our direct refund process is immediate, fully automated, and 100% guaranteed under our 14-day policy.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Platform Usage Policy */}
                    {settingsTab === "platform" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Platform Usage Policy
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Governs permissible platform targets, distribution channels, and regional compliance obligations.
                            </div>
                          </div>
                          <button type="button" onClick={() => copyToClipboard("CLIPVAULT PLATFORM USAGE POLICY\n\n1. Approved Platforms: ClipVault outputs are approved for publication on YouTube, TikTok, Instagram Reels, Facebook Reels, LinkedIn Video, Twitter/X, Snapchat Spotlight, Pinterest Idea Pins, and client video deliverables.\n\n2. Regional Compliance: You are responsible for complying with regional platform rules for your jurisdiction.\n\n3. Prohibited Distribution Channels: ClipVault outputs may not be used to create deepfakes, non-consensual intimate imagery, or content violating COPPA, GDPR Articles 5–9, or local broadcasting law.\n\n4. Content ID & Copyright: ClipVault does not circumvent or disable platform Content ID systems. Users must ensure ingested third-party footage is lawfully licensed.", "platform")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>
                            {copiedText === "platform" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "platform" ? "Copied" : "Copy Policy"}</span>
                          </button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div><strong>1. Approved Platforms:</strong> ClipVault outputs are approved for publication on YouTube, TikTok, Instagram Reels, Facebook Reels, LinkedIn Video, Twitter/X, Snapchat Spotlight, Pinterest Idea Pins, and commercial client video deliverables.</div>
                          <div><strong>2. Regional Compliance:</strong> You are solely responsible for complying with platform-specific rules, regional broadcasting laws, and local content regulations applicable to your jurisdiction.</div>
                          <div><strong>3. Prohibited Channels:</strong> ClipVault outputs may not be used to produce deepfakes, NCII (non-consensual intimate imagery), political disinformation, or content violating COPPA, GDPR Articles 5–9, or applicable local law.</div>
                          <div><strong>4. Content ID & Copyright:</strong> ClipVault does not circumvent or disable platform Content ID systems. Users must ensure all ingested third-party footage is lawfully licensed or falls within fair use (17 U.S.C. § 107).</div>
                          <div><strong>5. Commercial Client Work:</strong> Producing clips for paying clients is permitted under the standard commercial license. Agency-scale redistribution requires a multi-seat enterprise agreement.</div>
                        </div>
                      </div>
                    )}

                    {/* TAB: AI & Content Ethics */}
                    {settingsTab === "ai-ethics" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              AI & Content Ethics Policy
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Responsible AI use, model data handling, and ethical content generation standards.
                            </div>
                          </div>
                          <button type="button" onClick={() => copyToClipboard("CLIPVAULT AI & CONTENT ETHICS POLICY\n\n1. On-Device AI: All local AI models (Whisper, YOLO, segmentation) execute fully on your hardware. No video is transmitted to any AI cloud without your explicit BYOK configuration.\n\n2. BYOK Cloud AI: When you configure a personal API key, your audio transcripts and prompt data are sent to the respective AI provider (Google, OpenAI, Groq) under their terms.\n\n3. No Synthetic Persons: ClipVault must not be used to generate synthetic identity videos of real individuals without documented consent.\n\n4. Bias Disclosure: AI-generated clip recommendations reflect statistical patterns in training data and should be reviewed by a human editor before publication.", "ai-ethics")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>
                            {copiedText === "ai-ethics" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "ai-ethics" ? "Copied" : "Copy Policy"}</span>
                          </button>
                        </div>
                        <div style={{ padding: "14px 18px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}` }}>
                          <div style={{ fontWeight: 700, color: "#fff", fontSize: 12.5, marginBottom: 4 }}>Responsible AI Commitment</div>
                          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>ClipVault is engineered to keep all AI processing local by default. Cloud AI is only invoked when you explicitly configure your own API key (BYOK), and your data is transmitted directly from your device to the official endpoint — never through a ClipVault proxy.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div><strong>1. On-Device Models:</strong> Whisper speech-to-text, YOLO face detection, and video segmentation models run 100% locally on your CPU/GPU. Zero video data is transmitted externally during local processing.</div>
                          <div><strong>2. BYOK Cloud AI:</strong> When you provide a personal API key, audio transcripts and prompt payloads travel from your IP directly to Google, OpenAI, or Groq under their respective terms of service.</div>
                          <div><strong>3. Synthetic Identity Prohibition:</strong> ClipVault may not be used to create AI-generated videos impersonating real persons, creating synthetic personas for fraud, or generating non-consensual synthetic media.</div>
                          <div><strong>4. AI Bias Disclaimer:</strong> Automated clip scoring reflects statistical patterns. Human review is recommended before final publication of any AI-selected clip.</div>
                          <div><strong>5. Model Attribution:</strong> ClipVault uses open-source models (Whisper by OpenAI, YOLO by Ultralytics). Their respective licenses are available in the project repository.</div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Hardware & System Policy */}
                    {settingsTab === "hardware" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Hardware & System Policy
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Minimum requirements, GPU acceleration terms, and hardware liability limitations.
                            </div>
                          </div>
                          <button type="button" onClick={() => copyToClipboard("CLIPVAULT HARDWARE & SYSTEM POLICY\n\n1. Minimum Requirements: Windows 10/11 (64-bit), 8GB RAM, 4-core CPU, 4GB disk space.\n\n2. Recommended Specs: 16GB+ RAM, NVIDIA RTX GPU with CUDA 11.8+, 50GB SSD.\n\n3. GPU Acceleration: CUDA and DirectML hardware acceleration are used when available. ClipVault is not liable for hardware degradation from intensive workloads.\n\n4. Driver Compatibility: ClipVault requires up-to-date GPU drivers. Outdated or beta drivers may cause instability.\n\n5. Hardware Liability: ClipVault Studio LLC bears no responsibility for hardware failures, thermal damage, or data loss resulting from use of this software.", "hardware")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>
                            {copiedText === "hardware" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "hardware" ? "Copied" : "Copy Policy"}</span>
                          </button>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                          <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div style={{ fontWeight: 700, color: "rgba(255,255,255,0.6)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Minimum Requirements</div>
                            {["Windows 10/11 (64-bit)", "8 GB RAM", "4-core CPU (2.0 GHz+)", "4 GB Free Disk Space", "Python 3.10+ runtime"].map(r => <div key={r} style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Check style={{ width: 10, height: 10, color: G, flexShrink: 0 }} />{r}</div>)}
                          </div>
                          <div style={{ padding: "14px 18px", borderRadius: "0 10px 10px 0", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", borderLeft: `3px solid ${G}` }}>
                            <div style={{ fontWeight: 700, color: G, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Recommended Specs</div>
                            {["Windows 11 (latest)", "16 GB+ RAM", "NVIDIA RTX GPU (CUDA 11.8+)", "50 GB NVMe SSD", "8-core CPU"].map(r => <div key={r} style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><Check style={{ width: 10, height: 10, color: G, flexShrink: 0 }} />{r}</div>)}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div><strong>3. GPU Acceleration:</strong> CUDA and DirectML hardware acceleration are used when available. The software gracefully falls back to CPU when no compatible GPU is detected.</div>
                          <div><strong>4. Driver Compatibility:</strong> ClipVault requires up-to-date GPU drivers from NVIDIA, AMD, or Intel. ClipVault Studio LLC is not responsible for instability caused by beta, outdated, or third-party drivers.</div>
                          <div><strong>5. Hardware Liability:</strong> ClipVault Studio LLC bears no responsibility for hardware failures, thermal damage, or data loss resulting from normal or intensive use of this software.</div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Trademark & Branding */}
                    {settingsTab === "trademark" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Trademark & Branding Policy
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Rules for using the ClipVault name, logo, and visual identity in third-party contexts.
                            </div>
                          </div>
                          <button type="button" onClick={() => copyToClipboard("CLIPVAULT TRADEMARK & BRANDING POLICY\n\n\"ClipVault\", the ClipVault logo, and \"ClipVault Studio\" are proprietary trademarks of ClipVault Studio LLC.\n\nPermitted Uses: Editorial references in reviews, blog posts, or tutorials with clear attribution.\n\nProhibited Uses: Using ClipVault branding to create competing products, forks, or derivative services. Using the name or logo on merchandise, services, or media without explicit written permission.\n\nCommunity Portals: Approved fan content, tutorials, and community forums may display the ClipVault name in non-commercial educational contexts with a visible attribution.", "trademark")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>
                            {copiedText === "trademark" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "trademark" ? "Copied" : "Copy Policy"}</span>
                          </button>
                        </div>
                        <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${G}`, borderRadius: "0 10px 10px 0" }}>
                          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>"ClipVault", the ClipVault logo mark, and "ClipVault Studio" are proprietary trademarks of <strong>ClipVault Studio LLC</strong>. Unauthorized use in competing products or commercial services is strictly prohibited.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div><strong>Permitted Uses:</strong> Editorial references in reviews, written tutorials, or community blog posts with clear attribution ("Powered by ClipVault" or "Made with ClipVault") are allowed.</div>
                          <div><strong>Prohibited Uses:</strong> Using ClipVault branding to create competing products, unauthorized forks, or derivative SaaS services. Using the name or logo on merchandise, services, or commercial media without explicit written permission from ClipVault Studio LLC.</div>
                          <div><strong>Community Content:</strong> Approved fan tutorials, YouTube reviews, and community forums may display the ClipVault name in non-commercial, educational contexts with visible attribution.</div>
                          <div><strong>Reporting Misuse:</strong> If you encounter unauthorized use of ClipVault trademarks, report it to <a href="https://mail.google.com/mail/?view=cm&fs=1&to=studioclipvault@gmail.com" target="_blank" rel="noopener noreferrer" onClick={openEmail} style={{ color: G, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>studioclipvault@gmail.com</a>{copiedText === "email" && <span style={{ color: G, marginLeft: 6, fontSize: 11, fontWeight: 600 }}>• Copied &amp; opening Gmail!</span>}.</div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Limitation of Liability */}
                    {settingsTab === "liability" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <div>
                            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                              Limitation of Liability
                            </h3>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                              Maximum liability caps, indemnification terms, and dispute resolution procedures.
                            </div>
                          </div>
                          <button type="button" onClick={() => copyToClipboard('CLIPVAULT LIMITATION OF LIABILITY\n\nTO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CLIPVAULT STUDIO LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES.\n\nIN NO EVENT SHALL THE TOTAL LIABILITY OF CLIPVAULT STUDIO LLC EXCEED THE AMOUNT PAID BY YOU FOR THE SOFTWARE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.\n\nIndemnification: You agree to indemnify and hold harmless ClipVault Studio LLC, its officers, employees, and agents from any claims, damages, or expenses arising from your violation of these Terms.\n\nDispute Resolution: Any dispute shall be resolved by binding arbitration under the rules of the American Arbitration Association (AAA), conducted in the State of [Your State].', "liability")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 11.5, cursor: "pointer" }}>
                            {copiedText === "liability" ? <CheckCheck style={{ width: 13, height: 13, color: G }} /> : <Copy style={{ width: 13, height: 13 }} />}
                            <span>{copiedText === "liability" ? "Copied" : "Copy Policy"}</span>
                          </button>
                        </div>
                        <div style={{ padding: 16, borderRadius: 10, background: "rgba(255,102,122,0.04)", border: "1px solid rgba(255,102,122,0.2)" }}>
                          <div style={{ fontWeight: 800, color: "#ff8595", fontSize: 12.5, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                            <AlertTriangle style={{ width: 14, height: 14 }} /> Important Legal Notice
                          </div>
                          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, CLIPVAULT STUDIO LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES.</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div><strong>1. Liability Cap:</strong> In no event shall the total cumulative liability of ClipVault Studio LLC exceed the amount paid by you for the software in the twelve (12) months preceding the claim.</div>
                          <div><strong>2. No Consequential Damages:</strong> ClipVault Studio LLC is not liable for lost profits, lost data, business interruption, or reputational harm arising from use or inability to use the software.</div>
                          <div><strong>3. Indemnification:</strong> You agree to indemnify, defend, and hold harmless ClipVault Studio LLC, its officers, employees, and agents from any third-party claims, damages, or legal expenses arising from your violation of these Terms.</div>
                          <div><strong>4. Dispute Resolution:</strong> Any dispute arising from this Agreement shall be resolved through binding arbitration under the rules of the American Arbitration Association (AAA). Class action waivers apply.</div>
                          <div><strong>5. Governing Law:</strong> This Agreement is governed by the laws of the jurisdiction in which ClipVault Studio LLC is incorporated, without regard to conflict-of-law principles.</div>
                        </div>
                      </div>
                    )}

                    {/* TAB: Questions & FAQ (Industry Reference Layout) */}
                    {settingsTab === "faq" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                        {/* Two-Column Split Layout matching Chimmy Alarm reference */}
                        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(320px, 1.8fr)", gap: 36, alignItems: "start" }}>
                          
                          {/* Left Column: Subtitle, Big Headline, Subtext & Quick Action Links */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div>
                              <span style={{ 
                                fontSize: 10, 
                                fontFamily: "'JetBrains Mono', monospace", 
                                fontWeight: 800, 
                                letterSpacing: "0.14em", 
                                color: G, 
                                textTransform: "uppercase" 
                              }}>
                                THE LITTLE QUESTIONS
                              </span>
                              <h2 style={{ 
                                fontSize: 24, 
                                fontWeight: 800, 
                                color: "#fff", 
                                lineHeight: 1.2, 
                                letterSpacing: "-0.03em", 
                                margin: "8px 0 10px", 
                                fontFamily: "'Space Grotesk', 'Geist', sans-serif" 
                              }}>
                                Good to know before you clip.
                              </h2>
                              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: 0 }}>
                                The useful details, from local offline rendering to licensing, privacy, and 4K exports.
                              </p>
                            </div>

                            {/* Quick Action Links with Arrows */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                              {[
                                { label: "Privacy Policy", tab: "privacy" },
                                { label: "Terms of Use", tab: "terms" },
                                { label: "Refund & Cancellation Policy", tab: "refunds" },
                                { label: "Master EULA License", tab: "eula" },
                              ].map((link) => (
                                <button
                                  key={link.tab}
                                  type="button"
                                  onClick={() => {
                                    setSettingsTab(link.tab);
                                    setComplianceSearch("");
                                  }}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    background: "none",
                                    border: "none",
                                    padding: "3px 0",
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    color: "#e2e8f0",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.color = G;
                                    e.currentTarget.style.transform = "translateX(3px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.color = "#e2e8f0";
                                    e.currentTarget.style.transform = "none";
                                  }}
                                >
                                  <span>{link.label}</span>
                                  <ArrowRight style={{ width: 13, height: 13, color: G }} />
                                </button>
                              ))}

                              <a
                                href="https://mail.google.com/mail/?view=cm&fs=1&to=studioclipvault@gmail.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={openEmail}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: "none",
                                  border: "none",
                                  padding: "3px 0",
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: "#e2e8f0",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  textDecoration: "none",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = G;
                                  e.currentTarget.style.transform = "translateX(3px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = "#e2e8f0";
                                  e.currentTarget.style.transform = "none";
                                }}
                              >
                                <span>Contact Support</span>
                                <ArrowRight style={{ width: 13, height: 13, color: G }} />
                              </a>
                            </div>
                          </div>

                          {/* Right Column: Clean Accordion List with Horizontal Dividers */}
                          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                            {[
                              {
                                q: "What can I use for free?",
                                a: "ClipVault includes a permanent Community Free Tier with 2 free video clips per rolling 7-day week via the 1-Click Auto Clipper. You can export in 720p or 1080p Full HD with dynamic word-by-word subtitles and AI speaker tracking. No credit card or account registration required."
                              },
                              {
                                q: "Does ClipVault upload my video files anywhere?",
                                a: "Zero cloud data policy. All video frames, audio tracks, speech-to-text transcriptions, and rendered output files remain strictly on your local PC. Nothing is ever sent to our servers or third-party cloud engines."
                              },
                              {
                                q: "How does the workstation license key work?",
                                a: "Every license key is cryptographically signed using Ed25519 and bound to your computer's unique hardware fingerprint. Only your authorized PC can activate and run your licensed ClipVault Studio tier, and it is stored securely using local Windows DPAPI encryption."
                              },
                              {
                                q: "Will ClipVault work completely offline without internet?",
                                a: "Yes. ClipVault is built from the ground up as a native offline desktop app. All AI processing (OpenAI Whisper transcription, OpenCV computer vision face tracking, and FFmpeg video compositing) runs locally on your PC's hardware with zero internet required."
                              },
                              {
                                q: "What is the difference between Creator Pro and Creator Max?",
                                a: "Creator Pro ($15/mo) unlocks unlimited 1-Click Auto Clipping and up to 3 manual timeline studio projects per week. Creator Max ($25/mo or Lifetime) gives you completely unlimited manual studio timeline projects, multi-layer split screen, and ultra-high bitrate 4K/8K AI master exports."
                              },
                              {
                                q: "Can I transfer my license if I upgrade my computer?",
                                a: "Yes. You can deactivate your license in 1 click from the Studio Settings menu before switching machines, or email our support desk at studioclipvault@gmail.com with your purchase email to instantly reset your hardware binding for your new workstation."
                              },
                              {
                                q: "How do cancellations and refunds work?",
                                a: "We offer a 100% no-questions-asked 14-day refund guarantee if ClipVault does not meet your creative workflow needs or fails to run on your local hardware. You can cancel active subscriptions anytime with zero fees or retention locks."
                              },
                              {
                                q: "How do I contact customer support?",
                                a: "You can reach our lead developer directly at studioclipvault@gmail.com. We respond to all creator technical inquiries and feature requests within 24 hours."
                              }
                            ].map((item, idx) => {
                              const isExpanded = expandedFaq === idx;
                              return (
                                <div 
                                  key={idx} 
                                  style={{ 
                                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                                    transition: "background 0.15s ease" 
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "16px 4px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      gap: 16,
                                    }}
                                  >
                                    <span style={{ 
                                      fontSize: 13.5, 
                                      fontWeight: 700, 
                                      color: isExpanded ? "#fff" : "rgba(255,255,255,0.85)",
                                      fontFamily: "'Space Grotesk', 'Geist', sans-serif",
                                      transition: "color 0.15s" 
                                    }}>
                                      {item.q}
                                    </span>
                                    <span style={{ 
                                      display: "flex", 
                                      alignItems: "center", 
                                      justifyContent: "center", 
                                      width: 22, 
                                      height: 22, 
                                      color: isExpanded ? G : "rgba(255,255,255,0.5)",
                                      transition: "transform 0.2s ease, color 0.15s ease",
                                      flexShrink: 0
                                    }}>
                                      {isExpanded ? (
                                        <Minus style={{ width: 15, height: 15, strokeWidth: 2.5 }} />
                                      ) : (
                                        <Plus style={{ width: 15, height: 15, strokeWidth: 2.5 }} />
                                      )}
                                    </span>
                                  </button>

                                  {isExpanded && (
                                    <div style={{ 
                                      padding: "0 4px 16px", 
                                      fontSize: 12, 
                                      color: "rgba(255,255,255,0.65)", 
                                      lineHeight: 1.65,
                                    }}>
                                      {item.a}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {settingsTab === "about" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 14 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: "0 0 4px", fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                            A Note from the Developer
                          </h3>
                          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                            Solo Computer Science Student Project • ClipVault
                          </div>
                        </div>

                        <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${G}`, borderRadius: "0 10px 10px 0", color: "#fff", fontStyle: "italic", fontSize: 13, lineHeight: 1.6 }}>
                          "I built this because I truly believe creators shouldn't be forced to pay crazy monthly subscriptions just to cut clips, when your own computer can do it locally, privately, and for free."
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 14, color: "rgba(255,255,255,0.85)" }}>
                          <p style={{ margin: 0, lineHeight: 1.65, fontSize: 13 }}>
                            Hey! I'm an active <strong>Computer Science college student</strong>, and I spent countless days and sleepless nights coding ClipVault completely from scratch. I saw how big cloud platforms were charging creators \$30 to \$100+ every single month for basic cuts and restricting how many videos they could make, so I decided to build a real, honest alternative that runs right on your own machine forever.
                          </p>

                          {/* Deals, Partnerships & Acquisition Inquiries Card */}
                          <div style={{
                            padding: 16,
                            background: "rgba(255,255,255,0.02)",
                            borderLeft: `3px solid ${G}`,
                            borderRadius: "0 10px 10px 0",
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                            borderRight: "1px solid rgba(255,255,255,0.05)",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#fff", fontSize: 13, marginBottom: 8 }}>
                              <Sparkles style={{ width: 15, height: 15, color: G }} />
                              <span>Open to Deals, Acquisitions &amp; Business Inquiries</span>
                            </div>
                            <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                              If you're a company, media brand, studio, or investor interested in acquiring ClipVault, licensing the engine, or making a business deal—please reach out to me! Making a deal like that would literally be life-changing for me, and I'd be more than happy to talk:
                            </p>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                              Contact me directly: <a href="https://mail.google.com/mail/?view=cm&fs=1&to=studioclipvault@gmail.com" target="_blank" rel="noopener noreferrer" onClick={openEmail} style={{ color: G, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>studioclipvault@gmail.com</a>{copiedText === "email" && <span style={{ color: G, marginLeft: 6, fontSize: 11, fontWeight: 600 }}>• Copied &amp; opening Gmail!</span>}
                            </div>
                          </div>

                          {/* Support My Family & Tuition + Student / Hardship Discount Card */}
                          <div style={{
                            padding: 16,
                            background: "rgba(255,255,255,0.02)",
                            borderLeft: `3px solid ${G}`,
                            borderRadius: "0 10px 10px 0",
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                            borderRight: "1px solid rgba(255,255,255,0.05)",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#fff", fontSize: 13, marginBottom: 8 }}>
                              <Heart style={{ width: 15, height: 15, color: G }} />
                              <span>Support My Education &amp; Family • Hardship Discounts Available</span>
                            </div>
                            <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                              Please do not crack or distribute pirated copies of this software. Every single license purchased genuinely helps me survive in real life—it directly pays my college tuition, helps support my family with living expenses, and keeps food on my table while I continue updating and improving ClipVault.
                            </p>
                            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                              <strong style={{ color: "#fff" }}>Honestly can't afford it right now?</strong> Please don't pirate it. I know firsthand how tough money can be as a student. If you're struggling financially, just send me an email at <a href="https://mail.google.com/mail/?view=cm&fs=1&to=studioclipvault@gmail.com" target="_blank" rel="noopener noreferrer" onClick={openEmail} style={{ color: G, fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>studioclipvault@gmail.com</a> and tell me what you can afford—I will gladly hook you up with a discount or help you out so you can still create your videos. We're all trying to make it out here!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5-Second Inactivity Scroll Prompt */}
                {showScrollPrompt && !hasScrolledToBottom && !complianceAccepted && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 68,
                      right: 28,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      borderRadius: 999,
                      background: "rgba(18, 18, 22, 0.95)",
                      border: "1px solid rgba(52, 235, 61, 0.4)",
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.85), 0 0 16px rgba(52, 235, 61, 0.25)",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 700,
                      animation: "wfBouncePrompt 1.8s infinite ease-in-out",
                      zIndex: 40,
                      pointerEvents: "none",
                    }}
                  >
                    <ArrowDown style={{ width: 13, height: 13, color: G }} />
                    <span>Read and scroll down to proceed</span>
                  </div>
                )}

                {/* Modal Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 24px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(0,0,0,0.25)",
                    flexShrink: 0,
                    gap: 16,
                  }}
                >
                  {!complianceAccepted ? (
                    /* ── FIRST-LAUNCH CLICKWRAP GATE ── */
                    <>
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                        <input
                          type="checkbox"
                          checked={agreedTerms}
                          onChange={(e) => setAgreedTerms(e.target.checked)}
                          style={{
                            width: 17,
                            height: 17,
                            accentColor: G,
                            cursor: "pointer",
                            borderRadius: 4,
                          }}
                        />
                        <span style={{ fontSize: 12, color: agreedTerms ? "#fff" : "rgba(255,255,255,0.75)", fontWeight: 600 }}>
                          I have read, understood, and agree to the Master License Agreement and Privacy Terms.
                        </span>
                      </label>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {!hasScrolledToBottom && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: G, fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: G, boxShadow: `0 0 6px ${G}` }} />
                            <span>Scroll document to unlock</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleDecline}
                          style={{
                            padding: "8px 18px",
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 12,
                            color: "rgba(255,102,122,0.9)",
                            background: "rgba(255,102,122,0.08)",
                            border: "1px solid rgba(255,102,122,0.25)",
                            cursor: "pointer",
                          }}
                        >
                          Decline &amp; Exit
                        </button>

                        <button
                          type="button"
                          disabled={!agreedTerms || !hasScrolledToBottom}
                          onClick={() => {
                            try {
                              localStorage.setItem("clipvault_compliance_accepted", "true");
                            } catch {}
                            setComplianceAccepted(true);
                            setShowSettingsModal(false);
                          }}
                          style={{
                            padding: "8px 24px",
                            borderRadius: 8,
                            fontWeight: 700,
                            fontSize: 12,
                            color: (agreedTerms && hasScrolledToBottom) ? "#000" : "rgba(0,0,0,0.35)",
                            background: (agreedTerms && hasScrolledToBottom) ? G : "rgba(52, 235, 61,0.2)",
                            border: "none",
                            cursor: (agreedTerms && hasScrolledToBottom) ? "pointer" : "not-allowed",
                            boxShadow: (agreedTerms && hasScrolledToBottom) ? "0 0 24px rgba(52, 235, 61,0.4)" : "none",
                            transition: "all 0.15s",
                          }}
                        >
                          I Agree &amp; Launch Studio
                        </button>
                      </div>
                    </>
                  ) : (
                    /* ── POST-ACCEPTANCE IN-APP SETTINGS & VIEWER ── */
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <a
                          href="https://mail.google.com/mail/?view=cm&fs=1&to=studioclipvault@gmail.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={openEmail}
                          style={{
                            fontSize: 11.5,
                            color: G,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            cursor: "pointer",
                          }}
                        >
                          <Mail style={{ width: 12, height: 12 }} />
                          <span>studioclipvault@gmail.com</span>
                          {copiedText === "email" && (
                            <span style={{ fontSize: 10.5, color: G, marginLeft: 4 }}>• Copied &amp; opening Gmail!</span>
                          )}
                        </a>

                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>•</span>

                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>
                          Exclusive Commercial License © 2026 ClipVault Studio LLC
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 11.5, color: G, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                          <CheckCircle2 style={{ width: 13, height: 13, color: G }} /> EULA Active &amp; Verified
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              localStorage.removeItem("clipvault_compliance_accepted");
                            } catch {}
                            setComplianceAccepted(false);
                            setAgreedTerms(false);
                            setHasScrolledToBottom(false);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          Reset Acceptance
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSettingsModal(false)}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.1)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: "#fff",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Creator Max Upgrade Modal (triggered when weekly studio limit is reached) */}
      <CreatorMaxUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSwitchToAutoClipper={() => {
          setShowUpgradeModal(false);
          onSelect("opus-clipper");
        }}
        resetsInDays={studioCredits?.resets_in_days || 7}
        resetsAt={studioCredits?.resets_at || ""}
      />

      {/* Creator Pro Upgrade Modal (triggered for Free Tier users on locked studio/features) */}
      <CreatorProUpgradeModal
        isOpen={showProUpgradeModal}
        onClose={() => setShowProUpgradeModal(false)}
        reason={proUpgradeReason}
        resetsInDays={effectiveFreeCredits?.resets_in_days || 7}
        resetsAt={effectiveFreeCredits?.resets_at || ""}
        onOpenActivation={() => {
          setShowProUpgradeModal(false);
          if (onOpenActivation) {
            onOpenActivation();
          } else {
            window.dispatchEvent(new CustomEvent("clipvault-open-activation"));
          }
        }}
      />

      {/* Developer Special Tier Comparison Matrix & Simulator Modal */}
      {appEdition === "developer" && (
        <DeveloperTierModal
          isOpen={showDevModal}
          onClose={() => setShowDevModal(false)}
          currentSimulatedTier={simulatedTier}
          onSelectSimulatedTier={(tier) => {
            handleSelectSimulatedTier(tier);
            setCreditsExhaustedSimulated(false);
          }}
          appEdition={appEdition}
          onSwitchAppEdition={handleSwitchAppEdition}
          onResetCredits={() => {
            setCreditsExhaustedSimulated(false);
            fetch("http://127.0.0.1:8000/api/license/free_tier_credits")
              .then((r) => r.json())
              .then((data) => {
                if (data && typeof data === "object") setFreeCredits(data);
              })
              .catch(() => {});
            fetch("http://127.0.0.1:8000/api/license/manual_studio_credits")
              .then((r) => r.json())
              .then((data) => {
                if (data && typeof data === "object") setStudioCredits(data);
              })
              .catch(() => {});
          }}
          onExhaustCredits={() => {
            setCreditsExhaustedSimulated(true);
          }}
        />
      )}

      {/* License Key Security Confirmation Modal ("I understand" phrase confirmation) */}
      {showLicenseRevealModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLicenseRevealModal(false);
              setLicenseRevealInput("");
            }
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              borderRadius: 14,
              background: "#0c0d10",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(52, 235, 61, 0.12)",
                  border: "1px solid rgba(52, 235, 61, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <ShieldAlert style={{ width: 16, height: 16, color: G }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Security Confirmation</h4>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>License Key Exposure Protection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLicenseRevealModal(false);
                  setLicenseRevealInput("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            <div style={{
              padding: 12,
              borderRadius: "0 8px 8px 0",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderLeft: `3px solid ${G}`,
              fontSize: 11.5,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.5,
            }}>
              Revealing your license key will display it in plain text. Ensure you are not sharing your screen, recording, or live streaming before proceeding.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)" }}>
                Please type <span style={{ color: G, fontFamily: "'Geist Mono', monospace", fontWeight: 700 }}>&quot;I understand to show my license&quot;</span> to confirm:
              </label>
              <input
                type="text"
                autoFocus
                value={licenseRevealInput}
                onChange={(e) => setLicenseRevealInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE) {
                    setShowLicenseKey(true);
                    setShowLicenseRevealModal(false);
                    setLicenseRevealInput("");
                  }
                }}
                placeholder='Type "I understand to show my license"'
                style={{
                  width: "100%",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 12,
                  color: "#fff",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE
                    ? `1px solid ${G}`
                    : "1px solid rgba(255, 255, 255, 0.12)",
                  outline: "none",
                  fontFamily: "'Geist Mono', monospace",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  setShowLicenseRevealModal(false);
                  setLicenseRevealInput("");
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={licenseRevealInput.trim() !== LICENSE_REVEAL_PHRASE}
                onClick={() => {
                  if (licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE) {
                    setShowLicenseKey(true);
                    setShowLicenseRevealModal(false);
                    setLicenseRevealInput("");
                  }
                }}
                style={{
                  padding: "7px 14px",
                  borderRadius: 7,
                  background: licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE ? G : "rgba(255,255,255,0.04)",
                  border: licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE ? "none" : "1px solid rgba(255,255,255,0.06)",
                  color: licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE ? "#000" : "rgba(255,255,255,0.25)",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: licenseRevealInput.trim() === LICENSE_REVEAL_PHRASE ? "pointer" : "not-allowed",
                  transition: "all 0.15s ease",
                }}
              >
                Confirm &amp; Reveal Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSelectorScreen;
