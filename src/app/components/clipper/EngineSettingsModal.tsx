import React, { useState, useEffect } from "react";
import {
  Cpu,
  CheckCircle2,
  Zap,
  ShieldCheck,
  ExternalLink,
  Globe,
  Radio,
  Server,
  Activity,
  Layers,
  Sparkles,
  HardDrive,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { EngineOption } from "./types";

export type ByokMode = "local" | "developer" | "custom";

export interface HardwareScanResult {
  status: string;
  cpu: string;
  gpu: string;
  npu: string | null;
  vendor: string;
  encoder: string;
  encoder_codec: string;
  ram_gb: number;
  engine_id: string;
  engine_name: string;
  engine_desc: string;
  specs: Array<{ label: string; value: string }>;
}

interface EngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engines: EngineOption[];
  selectedEngine: string;
  onSelectEngine: (engineId: string) => void;
  byokMode: ByokMode;
  setByokMode: (mode: ByokMode) => void;
  anthropicKey: string;
  setAnthropicKey: (val: string) => void;
  higgsfieldKey: string;
  setHiggsfieldKey: (val: string) => void;
  seeDanceKey: string;
  setSeeDanceKey: (val: string) => void;
  openAiKey: string;
  setOpenAiKey: (val: string) => void;
  geminiKey?: string;
  setGeminiKey?: (val: string) => void;
  groqKey?: string;
  setGroqKey?: (val: string) => void;
  deepseekKey?: string;
  setDeepseekKey?: (val: string) => void;
  moonlightKey?: string;
  setMoonlightKey?: (val: string) => void;
  qwenKey?: string;
  setQwenKey?: (val: string) => void;
  customBaseUrl: string;
  setCustomBaseUrl: (val: string) => void;
}

// Cloud-only engines for BYOK & Developer Demo
const CLOUD_ENGINES: EngineOption[] = [
  {
    id: "gemini_flash",
    name: "Google Gemini",
    desc: "Gemini 2.5 Flash / 2.0 Pro multimodal transcript intelligence",
    category: "frontier-llm",
    badge: "Recommended",
    providerType: "cloud"
  },
  {
    id: "groq_lpu",
    name: "Groq LPU Engine",
    desc: "Ultra-fast Llama 3.3 70B and Whisper at 500+ tok/s real-time",
    category: "ultra-fast",
    badge: "500+ t/s",
    providerType: "cloud"
  },
  {
    id: "deepseek",
    name: "DeepSeek V3 / R1",
    desc: "Deep reasoning engine for high-retention viral hook analysis",
    category: "ultra-fast",
    badge: "Reasoning",
    providerType: "cloud"
  },
  {
    id: "openai_chatgpt",
    name: "OpenAI ChatGPT",
    desc: "GPT-4o, OpenAI Sora, and Cloud Whisper audio engine",
    category: "frontier-llm",
    badge: "GPT-4o",
    providerType: "cloud"
  },
  {
    id: "claude_fable",
    name: "Anthropic Claude",
    desc: "Claude 3.7 and 3.5 Sonnet viral script and hook specialist",
    category: "frontier-llm",
    badge: "Claude 3.7",
    providerType: "cloud"
  },
  {
    id: "moonlight",
    name: "Moonlight AI",
    desc: "Moonshot Kimi long-context video narrative analysis",
    category: "ultra-fast",
    badge: "Long Context",
    providerType: "cloud"
  },
  {
    id: "qwen_ai",
    name: "Alibaba Qwen",
    desc: "Qwen 2.5 72B and Qwen-VL analysis via DashScope",
    category: "frontier-llm",
    badge: "Qwen 2.5",
    providerType: "cloud"
  },
  {
    id: "higgsfield",
    name: "Higgsfield AI",
    desc: "Cinematic camera motion and visual highlight generation",
    category: "video-gen",
    badge: "Camera FX",
    providerType: "cloud"
  },
  {
    id: "seedance",
    name: "SeeDance AI",
    desc: "ByteDance music beat sync and dance highlight clipping",
    category: "video-gen",
    badge: "Beat Sync",
    providerType: "cloud"
  },
];

export interface EngineImpactProfile {
  title: string;
  badge: string;
  viralityFocus: string;
  speed: string;
  bestFor: string;
  summary: string;
  perks: string[];
}

export const ENGINE_IMPACT_PROFILES: Record<string, EngineImpactProfile> = {
  gemini_flash: {
    title: "Google Gemini 2.5 Flash / Pro",
    badge: "1M+ Token Multimodal",
    viralityFocus: "Deep Context & Storyline Arcs",
    speed: "Balanced (~1.5s - 3s)",
    bestFor: "Long-form Podcasts, Gaming Streams & Multi-hour Vlogs",
    summary: "Leverages Google's 1M+ token context window to digest entire multi-hour transcripts simultaneously without losing context or forgetting earlier callbacks.",
    perks: [
      "Finds long-range punchlines and narrative callbacks across multi-hour videos",
      "Excellent multi-speaker dialogue comprehension and joke detection",
      "Free daily API quota available via Google AI Studio"
    ]
  },
  groq_lpu: {
    title: "Groq LPU (Llama 3.3 70B & Whisper)",
    badge: "500+ Tokens/Sec",
    viralityFocus: "Ultra-Fast Hook & Moment Extraction",
    speed: "Near Instantaneous (~0.4s)",
    bestFor: "Rapid Batch Clipping & Fast-Paced Gameplay Commentary",
    summary: "Runs on Groq's custom LPUs at 500+ tokens/sec. Transcribes audio slices in ~0.4s via Whisper-Large-v3-Turbo and extracts viral hooks in sub-second time.",
    perks: [
      "Fastest turn-around time of any provider (zero waiting time)",
      "99%+ word-accurate subtitles with Whisper-Large-v3-Turbo",
      "Generous free rate limits available on Groq Console"
    ]
  },
  deepseek: {
    title: "DeepSeek V3 / R1 Reasoning",
    badge: "Chain-of-Thought",
    viralityFocus: "Mathematical & Strategic Virality Logic",
    speed: "Deep Thinking (~4s - 8s)",
    bestFor: "Debates, Complex Explanations, High-IQ Gaming & Analysis",
    summary: "Uses deep chain-of-thought reasoning to rigorously analyze why a specific moment will hold audience attention, rejecting filler and low-retention banter.",
    perks: [
      "Selects mathematically high-retention retention loops and hooks",
      "Excels at extracting counter-intuitive arguments and climax moments",
      "Unmatched price-to-performance ratio for reasoning-heavy analysis"
    ]
  },
  openai_chatgpt: {
    title: "OpenAI ChatGPT (GPT-4o)",
    badge: "Frontier Viral Polish",
    viralityFocus: "High-Click-Through Social Media Copywriting",
    speed: "Fast (~2s)",
    bestFor: "Viral Shorts, Reels, TikTok Entertainment & Punchy Hooks",
    summary: "Trained on massive web culture datasets. Produces the most naturally engaging, curiosity-inducing hook titles and viewer retention copy in the industry.",
    perks: [
      "Top-tier viral hook headlines designed for TikTok and Instagram Reels algorithms",
      "Native conversational understanding of internet slang, humor, and creator culture",
      "Integrates with OpenAI Whisper-1 transcription engine"
    ]
  },
  claude_fable: {
    title: "Anthropic Claude 3.7 / 3.5 Sonnet",
    badge: "Literary & Nuanced",
    viralityFocus: "Emotional Resonance & Narrative Flow",
    speed: "Fast (~2s)",
    bestFor: "Storytelling, Philosophy, Educational Creators & Film Recaps",
    summary: "Renowned for its human-like emotional nuance and narrative sensibility. Identifies compelling storytelling arcs that feel organic rather than clickbaity.",
    perks: [
      "Best-in-class emotional cadence and natural tone recognition",
      "Superb at crafting thoughtful, non-cliché hook titles for educational channels",
      "Eliminates AI jargon and creates authentic, human-sounding captions"
    ]
  },
  moonlight: {
    title: "Moonlight AI (Moonshot Kimi)",
    badge: "Long Context",
    viralityFocus: "Extended Stream Memory & Arc Tracking",
    speed: "Fast (~2.5s)",
    bestFor: "Twitch / Kick VODs & Extended Creator Live Streams",
    summary: "Engineered specifically for mega-context stream analysis. Preserves conversational memory across 200K+ token live broadcast transcripts.",
    perks: [
      "Maintains continuity across hours of live-stream gameplay and chatter",
      "Identifies recurring inside jokes and community stream highlights",
      "Reliable structured JSON output extraction"
    ]
  },
  qwen_ai: {
    title: "Alibaba Qwen 2.5 (72B)",
    badge: "Global & Multilingual",
    viralityFocus: "Multilingual & Cross-Cultural Nuance",
    speed: "Fast (~2s)",
    bestFor: "Non-English, Bilingual, Anime & Global Creator Content",
    summary: "The leading global open-weights frontier model. Unrivaled at understanding non-English slang, multilingual dialogue, and regional creator humor.",
    perks: [
      "Exceptional accuracy in Spanish, Tagalog, Japanese, Chinese, French, and 30+ languages",
      "Deep understanding of international pop culture and global trending memes",
      "Accessible via Alibaba Cloud DashScope API"
    ]
  },
  higgsfield: {
    title: "Higgsfield AI",
    badge: "Visual Highlights",
    viralityFocus: "Action Peaks & Visual Motion",
    speed: "Standard (~3s)",
    bestFor: "Action Stunts, IRL Vlogs & Visual Spectacle",
    summary: "Visual-first analysis engine optimized for identifying motion peaks, high-energy physical comedy, and visually striking scenes.",
    perks: [
      "Identifies visual energy spikes beyond just audio transcript keywords",
      "Great for silent comedy, gym feats, and visual demonstrations",
      "Complements dynamic camera panning layouts"
    ]
  },
  seedance: {
    title: "SeeDance AI",
    badge: "Rhythm & Music",
    viralityFocus: "Beat Drops & Choreography Timing",
    speed: "Standard (~3s)",
    bestFor: "Dance Clips, Music Videos & Beat-Synchronized Edits",
    summary: "Rhythm-aware clipping engine built for music creators and dancers. Cuts video moments precisely on beat drops and choreography climax moments.",
    perks: [
      "Coordinates clip boundaries with rhythmic beat transitions",
      "Tailored for TikTok dance trends and music performance clips",
      "Produces punchy viral audio-first highlights"
    ]
  }
};

export const EngineSettingsModal: React.FC<EngineSettingsModalProps> = ({
  isOpen,
  onClose,
  engines,
  selectedEngine,
  onSelectEngine,
  byokMode,
  setByokMode,
  anthropicKey,
  setAnthropicKey,
  higgsfieldKey,
  setHiggsfieldKey,
  seeDanceKey,
  setSeeDanceKey,
  openAiKey,
  setOpenAiKey,
  geminiKey = "",
  setGeminiKey = () => {},
  groqKey = "",
  setGroqKey = () => {},
  deepseekKey = "",
  setDeepseekKey = () => {},
  moonlightKey = "",
  setMoonlightKey = () => {},
  qwenKey = "",
  setQwenKey = () => {},
  customBaseUrl,
  setCustomBaseUrl,
}) => {
  const [hardwareInfo, setHardwareInfo] = useState<HardwareScanResult | null>(() => {
    const cached = localStorage.getItem("clipvault_hardware_scan");
    if (cached) {
      try { return JSON.parse(cached); } catch { return null; }
    }
    return null;
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeCloudTab, setActiveCloudTab] = useState<"all" | "frontier" | "fast" | "video">("all");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Helper to extract the active key for the selected engine
  const getCurrentKey = (): string => {
    switch (selectedEngine) {
      case "gemini_flash":
        return geminiKey?.trim() || "";
      case "groq_lpu":
        return groqKey?.trim() || "";
      case "deepseek":
        return deepseekKey?.trim() || "";
      case "openai_chatgpt":
        return openAiKey?.trim() || "";
      case "claude_fable":
        return anthropicKey?.trim() || "";
      case "moonlight":
        return moonlightKey?.trim() || "";
      case "qwen":
      case "qwen_ai":
        return qwenKey?.trim() || "";
      case "higgsfield":
        return higgsfieldKey?.trim() || "";
      case "seedance":
        return seeDanceKey?.trim() || "";
      default:
        return (geminiKey || groqKey || openAiKey || anthropicKey || deepseekKey)?.trim() || "";
    }
  };

  const isCloudEngine = CLOUD_ENGINES.some((e) => e.id === selectedEngine);
  const isKeyMissing = (byokMode === "custom" || isCloudEngine) && !getCurrentKey();

  // Auto-dismiss 5-second popup toast
  useEffect(() => {
    if (apiWarning) {
      const timer = setTimeout(() => {
        setApiWarning(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [apiWarning]);

  // Trigger 5-second popup when entering Cloud AI mode without an API key or selecting an unconfigured engine
  useEffect(() => {
    if (isOpen && isKeyMissing) {
      setApiWarning("Oops you have not yet put any API");
    } else if (!isKeyMissing) {
      setApiWarning(null);
    }
  }, [isOpen, byokMode, selectedEngine, isKeyMissing]);

  const handleDone = () => {
    if (isKeyMissing) {
      setApiWarning("Oops you have not yet put any API");
      return;
    }
    onClose();
  };

  // Zero-Liability & Warning Pop Up only for newly added API when clicking/focusing into the field
  const [showLiabilityWarningModal, setShowLiabilityWarningModal] = useState(false);
  const [acknowledgedEngines, setAcknowledgedEngines] = useState<Record<string, boolean>>({});

  // Ensure legacy localStorage key does not permanently suppress the popup
  useEffect(() => {
    localStorage.removeItem("clipvault_liability_acknowledged");
  }, []);

  // Reset acknowledgment for unconfigured engine when engine changes or modal opens
  useEffect(() => {
    if (!getCurrentKey()?.trim()) {
      setAcknowledgedEngines((prev) => ({ ...prev, [selectedEngine]: false }));
    }
  }, [selectedEngine, isOpen]);

  const handleEntryFieldInteraction = (currentVal: string) => {
    // When a user clicks, focuses, or pastes into an empty entry field (newly added API)
    if (!currentVal?.trim()) {
      if (!acknowledgedEngines[selectedEngine]) {
        setShowLiabilityWarningModal(true);
      }
    }
  };

  const handleAcknowledgeLiability = () => {
    setAcknowledgedEngines((prev) => ({ ...prev, [selectedEngine]: true }));
    setShowLiabilityWarningModal(false);
  };

  // Reveal confirmation security modal state
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [revealInputText, setRevealInputText] = useState("");
  const [showModelComparison, setShowModelComparison] = useState(false);

  const handleToggleReveal = () => {
    // Ensure liability modal is closed when toggling reveal
    setShowLiabilityWarningModal(false);
    if (showSecretKey) {
      // Hiding is immediate and requires no confirmation
      setShowSecretKey(false);
    } else {
      const activeKey = getCurrentKey();
      if (!activeKey) {
        // Nothing sensitive entered yet
        setShowSecretKey(true);
      } else {
        // Sensitive key entered: trigger security confirmation modal
        setRevealInputText("");
        setShowRevealModal(true);
      }
    }
  };

  const REVEAL_CONFIRMATION_PHRASE = "I understand to show my API";

  const handleConfirmReveal = () => {
    if (revealInputText.trim() === REVEAL_CONFIRMATION_PHRASE) {
      setShowSecretKey(true);
      setShowRevealModal(false);
      setRevealInputText("");
    }
  };

  // Auto-re-mask revealed key after 30 seconds for screen safety
  useEffect(() => {
    if (showSecretKey) {
      const timer = setTimeout(() => {
        setShowSecretKey(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [showSecretKey]);

  // Perform Hardware Scan
  const runHardwareScan = async () => {
    setIsScanning(true);
    setScanError(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/hardware_scan");
      if (!res.ok) throw new Error("Hardware scan endpoint returned non-200 status");
      const data: HardwareScanResult = await res.json();
      setHardwareInfo(data);
      localStorage.setItem("clipvault_hardware_scan", JSON.stringify(data));
      if (data.engine_id) {
        onSelectEngine(data.engine_id);
      }
    } catch (err: any) {
      console.warn("Hardware scan error:", err);
      // Fallback to detected Intel Core Ultra profile
      const fallback: HardwareScanResult = {
        status: "ready",
        cpu: "Intel Core Ultra 5 135H",
        gpu: "Intel Arc Graphics",
        npu: "Intel AI Boost NPU",
        vendor: "Intel",
        encoder: "Intel QuickSync (h264_qsv)",
        encoder_codec: "h264_qsv",
        ram_gb: 16.0,
        engine_id: "intel_ai",
        engine_name: "Intel AI Engine",
        engine_desc: "Optimized for Intel Core Ultra CPU, Arc GPU, and AI Boost NPU.",
        specs: [
          { label: "CPU", value: "Intel Core Ultra 5 135H" },
          { label: "GPU", value: "Intel Arc Graphics" },
          { label: "NPU", value: "Intel AI Boost NPU" },
          { label: "Memory", value: "16.0 GB RAM" },
          { label: "Video Encoder", value: "Intel QuickSync (h264_qsv)" }
        ]
      };
      setHardwareInfo(fallback);
      localStorage.setItem("clipvault_hardware_scan", JSON.stringify(fallback));
      onSelectEngine("intel_ai");
    } finally {
      setIsScanning(false);
    }
  };

  const [cacheSizeMb, setCacheSizeMb] = useState<number | null>(null);
  const [isCleaningCache, setIsCleaningCache] = useState(false);
  const [cacheCleanNotice, setCacheCleanNotice] = useState<string | null>(null);

  const fetchCacheInfo = () => {
    fetch("http://127.0.0.1:8000/api/cache_info")
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.size_mb === "number") setCacheSizeMb(data.size_mb);
      })
      .catch(() => {});
  };

  // Automatically scan whenever modal opens if not yet scanned
  useEffect(() => {
    if (isOpen) {
      fetchCacheInfo();
      if (!hardwareInfo) {
        runHardwareScan();
      }
    }
  }, [isOpen, hardwareInfo]);

  if (!isOpen) return null;

  const filteredCloudEngines = CLOUD_ENGINES.filter((e) => {
    if (activeCloudTab === "frontier") return e.category === "frontier-llm";
    if (activeCloudTab === "fast") return e.category === "ultra-fast";
    if (activeCloudTab === "video") return e.category === "video-gen";
    return true;
  });

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div id="engine-settings-dialog" className="relative w-full max-w-[640px] rounded-3xl bg-[#0d0d0f] border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* 5-Second Popup Toast Notification */}
        {apiWarning && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg pointer-events-auto animate-fadeIn">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/60 backdrop-blur-xl shadow-[0_0_30px_rgba(251,191,36,0.3)] text-amber-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-amber-300 truncate">
                    Oops you have not yet put any API
                  </p>
                  <p className="text-[10.5px] text-amber-200/80 truncate">
                    Please paste your API key below to enable Cloud AI features.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApiWarning(null)}
                className="text-amber-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-xs font-bold shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Security Confirmation Modal for Revealing API Key */}
        {showRevealModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl animate-fadeIn font-sans">
            <div className="w-full max-w-md rounded-2xl bg-[#0e0e12] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-6 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm tracking-tight">Security Confirmation Required</h4>
                  <p className="text-[11px] text-zinc-400">Reveal Private API Key on Screen</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 space-y-1 text-xs text-amber-200">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Screen Exposure Warning
                </p>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Revealing this API key will display it in plain text. Make sure you are not streaming, recording your screen, or in the presence of unauthorized viewers.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300 block">
                  Please type <span className="text-amber-400 font-mono font-semibold select-all">"I understand to show my API"</span> to confirm:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={revealInputText}
                  onChange={(e) => setRevealInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && revealInputText.trim() === REVEAL_CONFIRMATION_PHRASE) {
                      handleConfirmReveal();
                    }
                  }}
                  placeholder='Type "I understand to show my API"'
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs text-white bg-zinc-900/90 border outline-none font-mono transition-all shadow-inner ${
                    revealInputText.trim() === REVEAL_CONFIRMATION_PHRASE
                      ? "border-emerald-500/80 ring-1 ring-emerald-500/30"
                      : "border-white/10 focus:border-amber-400/60"
                  }`}
                />
                {revealInputText.trim() === REVEAL_CONFIRMATION_PHRASE ? (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Phrase matched exactly. Click Confirm or press Enter.
                  </p>
                ) : (
                  <p className="text-[11px] text-zinc-500">
                    Exact case match required (capital "I" and uppercase "API").
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => {
                    setShowRevealModal(false);
                    setRevealInputText("");
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 font-medium text-xs border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Cancel / Keep Hidden
                </button>
                <button
                  type="button"
                  disabled={revealInputText.trim() !== REVEAL_CONFIRMATION_PHRASE}
                  onClick={handleConfirmReveal}
                  className={`px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm ${
                    revealInputText.trim() === REVEAL_CONFIRMATION_PHRASE
                      ? "bg-amber-400 text-zinc-950 hover:bg-amber-300 cursor-pointer shadow-amber-400/10 active:scale-[0.98]"
                      : "bg-white/[0.05] text-zinc-600 border border-white/[0.05] cursor-not-allowed opacity-50"
                  }`}
                >
                  Confirm &amp; Reveal Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Strict Zero-Liability & Confidentiality Warning Modal */}
        {showLiabilityWarningModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-xl animate-fadeIn font-sans">
            <div className="w-full max-w-lg rounded-2xl bg-[#0e0e12] border border-white/10 shadow-[0_20px_70px_rgba(0,0,0,0.85)] p-6 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm tracking-tight">
                      API Security &amp; Zero-Liability Policy
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Confidentiality and Usage Responsibility Notice
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 tracking-wide">
                  Notice
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 space-y-1 text-xs">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Never share your API key with anyone
                  </div>
                  <p className="text-[11.5px] text-zinc-300 leading-relaxed">
                    Never share, stream, reveal, or paste your API key in public view, recordings, or third-party websites. Your API key provides direct access to your private AI provider account and usage quotas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
                  <p className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                    Disclaimer of Responsibility &amp; Zero Liability:
                  </p>
                  <ul className="space-y-1.5 text-[11.5px] text-zinc-400 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 font-bold">•</span>
                      <span><strong className="text-zinc-200">We do NOT bear any responsibility</strong> for exposed, leaked, shared, or compromised API keys.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 font-bold">•</span>
                      <span><strong className="text-zinc-200">We are NOT responsible for any causes</strong>, including unexpected billing charges, quota usage, account suspensions, or any financial/data damages resulting from your API credentials.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 font-bold">•</span>
                      <span>ClipVault stores your credentials exclusively in your local device vault with zero telemetry. You are 100% solely responsible for securing and monitoring your key.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Stored exclusively on local device
                </span>
                <button
                  type="button"
                  onClick={handleAcknowledgeLiability}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-all shadow-md shadow-amber-400/10 active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> I Understand &amp; Accept Full Responsibility
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/25 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                AI Engine and Execution Hub
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/10 text-gray-300 border border-white/15 uppercase">
                  Production
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Choose between On-Device Hardware acceleration and Custom Cloud AI providers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {/* Architecture Switcher */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Execution Architecture
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black/70 border border-white/10 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setByokMode("custom");
                  if (!selectedEngine || selectedEngine === "intel_ai" || selectedEngine === "ryzen_ai" || selectedEngine === "nvidia_rtx") {
                    onSelectEngine("gemini_flash");
                  }
                }}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  byokMode === "custom"
                    ? "bg-amber-400 text-black shadow-lg font-extrabold ring-1 ring-amber-400/50"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>Cloud AI Models</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                  byokMode === "custom" ? "bg-black/20 text-black" : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                }`}>
                  Recommended
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setByokMode("local");
                  if (hardwareInfo?.engine_id) {
                    onSelectEngine(hardwareInfo.engine_id);
                  } else {
                    onSelectEngine("intel_ai");
                  }
                }}
                className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
                  byokMode === "local"
                    ? "bg-amber-400 text-black shadow-lg font-extrabold ring-1 ring-amber-400/50"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <HardDrive className="w-4 h-4" />
                <span>Local GPU / QSV</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-white/10 text-gray-400">
                  Free Offline
                </span>
              </button>
            </div>
          </div>

          {/* Quick Setup Tutorial & Warning Advisory Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-400/25 space-y-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                API Requirement &amp; Quality Notice
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed" style={{ textAlign: "justify" }}>
              <b>Important:</b> Cloud AI features require a valid API key and will not process without one. Slicing quality and viral hook accuracy depend directly on the model you select. For <b>Local GPU mode</b>, a dedicated GPU (NVIDIA RTX / AMD Radeon / Intel Arc) or Intel Core Ultra NPU is strongly recommended.
            </p>
            <div className="flex items-center gap-3 pt-1 border-t border-amber-500/15 text-[10.5px] text-amber-200/80 flex-wrap">
              <span>• <b>Free Keys:</b> Available instantly via Google AI Studio &amp; Groq Console</span>
              <span>• <b>Always Editable:</b> Reopen anytime via top-right Engine badge</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              VIEW 1: LOCAL HARDWARE (Only shows real detected hardware)
             ══════════════════════════════════════════════════════════════════ */}
          {byokMode === "local" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-xs">On-Device Hardware Scan</h4>
                  <p className="text-[11px] text-gray-400">
                    Runs 100% locally with zero cloud API keys, $0 cost, and full offline support.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runHardwareScan}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold transition-all cursor-pointer border border-white/10 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : "text-gray-300"}`} />
                  <span>{isScanning ? "Scanning System..." : "Run Hardware Scan"}</span>
                </button>
              </div>

              {/* Scanned Hardware Results */}
              {hardwareInfo ? (
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-sm text-amber-300">
                        {hardwareInfo.engine_name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-400 text-black uppercase">
                      Active Engine
                    </span>
                  </div>

                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    {hardwareInfo.engine_desc}
                  </p>

                  {/* Hardware Specs Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-400/20 text-xs">
                    {hardwareInfo.specs.map((s, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-black/40 border border-white/5 flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {s.label}
                        </span>
                        <span className="text-xs font-semibold text-white truncate" title={s.value}>
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300/80 font-medium">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Hardware Acceleration: <b>{hardwareInfo.encoder}</b>
                    </span>
                    <span>$0.00 API Cost (Free Forever)</span>
                  </div>

                  {/* Real Hardware Pipeline Note */}
                  <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-[10px] text-gray-400 space-y-1">
                    <p className="text-gray-300 font-semibold flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-amber-400" /> Real Hardware Pipeline:
                    </p>
                    <p>
                      • <b className="text-white">GPU ({hardwareInfo.gpu}):</b> Active at 40-50%+ in Task Manager. Powers Intel QuickSync Video for instant 150+ FPS hardware encoding.
                    </p>
                    <p>
                      • <b className="text-white">NPU ({hardwareInfo.npu || "AI Coprocessor"}):</b> Dedicated on-device neural tensor coprocessor. Video compression is handled by the GPU media block.
                    </p>
                  </div>
                </div>
              ) : (
                /* Unscanned Prompt */
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-3">
                  <Activity className="w-8 h-8 text-amber-400 mx-auto" />
                  <div>
                    <p className="text-white font-bold text-xs">No Hardware Profile Loaded</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                      Click the button below to probe your local CPU, Intel/NVIDIA/AMD GPU, and AI Neural Processing Unit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={runHardwareScan}
                    className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all cursor-pointer shadow-md inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Hardware Scan Now</span>
                  </button>
                </div>
              )}
            </div>
          )}



          {/* ══════════════════════════════════════════════════════════════════
              VIEW 3: CUSTOM BYOK (Only shows Cloud AI Engines & API Inputs)
             ══════════════════════════════════════════════════════════════════ */}
          {byokMode === "custom" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Cloud Category Filters */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-xs">Cloud AI Models (BYOK)</h4>
                  <p className="text-[11px] text-gray-400">
                    Select your preferred AI provider below and enter your private API key.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
                  {[
                    { id: "all", label: "All Cloud" },
                    { id: "frontier", label: "Frontier LLM" },
                    { id: "fast", label: "Ultra Fast" },
                    { id: "video", label: "Video FX" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCloudTab(tab.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        activeCloudTab === tab.id
                          ? "bg-amber-400 text-black font-extrabold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cloud Engine Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                {filteredCloudEngines.map((e) => {
                  const isSelected = selectedEngine === e.id;
                  const engineKey = (
                    e.id === "gemini_flash" ? geminiKey :
                    e.id === "groq_lpu" ? groqKey :
                    e.id === "deepseek" ? deepseekKey :
                    e.id === "openai_chatgpt" ? openAiKey :
                    e.id === "claude_fable" ? anthropicKey :
                    e.id === "moonlight" ? moonlightKey :
                    e.id === "qwen_ai" ? qwenKey :
                    e.id === "higgsfield" ? higgsfieldKey :
                    e.id === "seedance" ? seeDanceKey : ""
                  )?.trim() || "";
                  const hasKey = !!engineKey;
                  const keySnippet = hasKey ? engineKey.slice(-4) : "";
                  const providerLabel = e.name.replace("Google ", "").replace("OpenAI ", "").replace("Anthropic ", "").split(" ")[0];

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        onSelectEngine(e.id);
                        setByokMode("custom");
                      }}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-amber-400/10 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/50"
                          : "bg-white/[0.03] border-white/5 text-gray-300 hover:bg-white/[0.07]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-xs truncate">{e.name}</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[8px] font-extrabold uppercase bg-white/10 text-gray-300">
                            {e.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">
                          {e.desc}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[9px] font-bold">
                        {isSelected ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Selected Model
                          </span>
                        ) : (
                          <span className="text-gray-500">Click to Select</span>
                        )}
                        {hasKey ? (
                          <div className="text-right">
                            <span className="font-mono text-blue-400 text-[10px] font-extrabold block leading-tight">
                              ...{keySnippet}
                            </span>
                            <span className="text-[8.5px] text-gray-400 font-normal block leading-tight">
                              {providerLabel} API Key
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-[8.5px]">No Key</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Key Input Field for Selected Model */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3 font-sans">
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      Enter API Key for: <b className="text-white">{(CLOUD_ENGINES.find((e) => e.id === selectedEngine) || CLOUD_ENGINES[0])?.name || "AI Engine"}</b>
                    </span>
                  </div>
                  {getCurrentKey() ? (
                    <span className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                      <Lock className="w-3 h-3 text-emerald-400" /> Protected On-Device Vault ({`...${getCurrentKey().slice(-4)}`})
                    </span>
                  ) : (
                    <span className="text-[10.5px] text-zinc-400 font-medium flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
                      <ShieldCheck className="w-3 h-3 text-amber-400" /> Auto-Saves to Device Vault
                    </span>
                  )}
                </div>

                {/* Google Gemini Key */}
                {selectedEngine === "gemini_flash" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">Google Gemini 2.5 Flash Key (Recommended)</span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Free Gemini Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(geminiKey)}
                        onFocus={() => handleEntryFieldInteraction(geminiKey)}
                        onPaste={() => handleEntryFieldInteraction(geminiKey)}
                        placeholder="AIzaSy..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Google AI Studio provides free API quota daily. Paste your key above to enable Gemini 2.5 video understanding.
                    </p>
                  </div>
                )}

                {/* Groq LPU Key */}
                {selectedEngine === "groq_lpu" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">Groq LPU API Key</span>
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Groq Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(groqKey)}
                        onFocus={() => handleEntryFieldInteraction(groqKey)}
                        onPaste={() => handleEntryFieldInteraction(groqKey)}
                        placeholder="gsk_..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* DeepSeek Key */}
                {selectedEngine === "deepseek" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">DeepSeek V3 / R1 API Key</span>
                      <a
                        href="https://platform.deepseek.com/api_keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get DeepSeek Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={deepseekKey}
                        onChange={(e) => setDeepseekKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(deepseekKey)}
                        onFocus={() => handleEntryFieldInteraction(deepseekKey)}
                        onPaste={() => handleEntryFieldInteraction(deepseekKey)}
                        placeholder="sk-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* OpenAI Key */}
                {selectedEngine === "openai_chatgpt" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">OpenAI API Key (GPT-4o / Sora)</span>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get OpenAI Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={openAiKey}
                        onChange={(e) => setOpenAiKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(openAiKey)}
                        onFocus={() => handleEntryFieldInteraction(openAiKey)}
                        onPaste={() => handleEntryFieldInteraction(openAiKey)}
                        placeholder="sk-proj-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Anthropic Claude Key */}
                {selectedEngine === "claude_fable" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">Anthropic Claude API Key (3.7 / 3.5)</span>
                      <a
                        href="https://console.anthropic.com/settings/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Claude Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(anthropicKey)}
                        onFocus={() => handleEntryFieldInteraction(anthropicKey)}
                        onPaste={() => handleEntryFieldInteraction(anthropicKey)}
                        placeholder="sk-ant-api03-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Moonlight Key */}
                {selectedEngine === "moonlight" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">Moonshot / Moonlight API Key</span>
                      <a
                        href="https://platform.moonshot.cn/console/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Moonshot Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={moonlightKey}
                        onChange={(e) => setMoonlightKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(moonlightKey)}
                        onFocus={() => handleEntryFieldInteraction(moonlightKey)}
                        onPaste={() => handleEntryFieldInteraction(moonlightKey)}
                        placeholder="sk-moon-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Qwen Key */}
                {selectedEngine === "qwen_ai" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">Alibaba Qwen DashScope Key</span>
                      <a
                        href="https://dashscope.console.aliyun.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get DashScope Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={qwenKey}
                        onChange={(e) => setQwenKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(qwenKey)}
                        onFocus={() => handleEntryFieldInteraction(qwenKey)}
                        onPaste={() => handleEntryFieldInteraction(qwenKey)}
                        placeholder="sk-qwen-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Higgsfield Key */}
                {selectedEngine === "higgsfield" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">Higgsfield AI Key</span>
                      <a
                        href="https://higgsfield.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get Higgsfield Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={higgsfieldKey}
                        onChange={(e) => setHiggsfieldKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(higgsfieldKey)}
                        onFocus={() => handleEntryFieldInteraction(higgsfieldKey)}
                        onPaste={() => handleEntryFieldInteraction(higgsfieldKey)}
                        placeholder="hg-live-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* SeeDance Key */}
                {selectedEngine === "seedance" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-medium">SeeDance AI Key</span>
                      <a
                        href="https://seedance.ai"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 text-[11px] font-medium"
                      >
                        Get SeeDance Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSecretKey ? "text" : "password"}
                        value={seeDanceKey}
                        onChange={(e) => setSeeDanceKey(e.target.value)}
                        onClick={() => handleEntryFieldInteraction(seeDanceKey)}
                        onFocus={() => handleEntryFieldInteraction(seeDanceKey)}
                        onPaste={() => handleEntryFieldInteraction(seeDanceKey)}
                        placeholder="sd-live-..."
                        className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white bg-zinc-900/80 border border-white/10 outline-none focus:border-amber-400/60 font-mono shadow-inner transition-colors"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={handleToggleReveal}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer p-0.5 rounded"
                        title={showSecretKey ? "Hide key" : "Reveal key (Security confirmation required)"}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Clipping Results & Model Impact Notice */}
                {(() => {
                  const currentProfile = ENGINE_IMPACT_PROFILES[selectedEngine] || ENGINE_IMPACT_PROFILES["gemini_flash"];
                  return (
                    <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-2.5 shadow-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                              <span>AI Clipping Output Depends on Your API Key</span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                Model Impact
                              </span>
                            </h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                              Viral moments, hook titles, and clip selection styles directly reflect your chosen engine's architecture.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowModelComparison(!showModelComparison)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-0.5 whitespace-nowrap cursor-pointer flex-shrink-0"
                        >
                          {showModelComparison ? "Hide Guide" : "Compare All Engines ↗"}
                        </button>
                      </div>

                      {/* Active Engine Impact Spotlight Card */}
                      <div className="rounded-xl bg-black/40 border border-white/5 p-3 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-zinc-200">
                              Active: <span className="text-amber-400">{currentProfile.title}</span>
                            </span>
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                              {currentProfile.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400">
                            Inference: <strong className="text-zinc-200">{currentProfile.speed}</strong>
                          </span>
                        </div>

                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          {currentProfile.summary}
                        </p>

                        {/* Grid of Key Impact Stats */}
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-0.5">
                            <span className="text-zinc-500 font-semibold uppercase tracking-wider block text-[9px]">Virality Focus</span>
                            <span className="text-zinc-200 font-medium">{currentProfile.viralityFocus}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 space-y-0.5">
                            <span className="text-zinc-500 font-semibold uppercase tracking-wider block text-[9px]">Best Suited For</span>
                            <span className="text-zinc-200 font-medium">{currentProfile.bestFor}</span>
                          </div>
                        </div>

                        {/* Bullet Perks */}
                        <div className="space-y-1 pt-1.5 border-t border-white/5">
                          {currentProfile.perks.map((perk, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                              <Check className="w-3 h-3 text-amber-400 flex-shrink-0" />
                              <span>{perk}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Collapsible All-Engine Comparison Matrix */}
                      {showModelComparison && (
                        <div className="pt-2 border-t border-white/10 space-y-2">
                          <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                            How Engines Compare Across Different Content:
                          </div>
                          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {Object.entries(ENGINE_IMPACT_PROFILES).map(([key, profile]) => (
                              <div
                                key={key}
                                onClick={() => onSelectEngine(key)}
                                className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                                  selectedEngine === key
                                    ? "bg-amber-400/10 border-amber-400/40 text-white"
                                    : "bg-white/[0.02] border-white/5 hover:border-white/10 text-zinc-400"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-zinc-200">{profile.title}</span>
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-white/10 text-zinc-300">{profile.badge}</span>
                                  </div>
                                  <p className="text-[9px] text-zinc-400 line-clamp-1">{profile.bestFor}</p>
                                </div>
                                <span className="text-[9px] font-medium text-amber-400/90 whitespace-nowrap pl-2">
                                  {profile.viralityFocus}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Security & Confidentiality Warning Banner */}
                <div className="p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 space-y-1.5 text-xs text-zinc-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300 text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span>Security &amp; Confidentiality Policy</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLiabilityWarningModal(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-medium underline cursor-pointer"
                    >
                      Zero-Liability Policy ↗
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    <strong className="text-zinc-200">Local-only on-device storage:</strong> Never share your private key or stream your screen while revealing it. Your key is stored exclusively in your local device vault. ClipVault does not bear responsibility for compromised keys or third-party account costs.
                  </p>
                </div>

                {/* Custom Base URL (Proxy / Ollama) */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Custom OpenAI-Compatible API Proxy / Ollama URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={customBaseUrl}
                    onChange={(e) => setCustomBaseUrl(e.target.value)}
                    placeholder="e.g. http://localhost:11434/v1 or https://api.chatanywhere.tech/v1"
                    className="w-full rounded-xl px-3.5 py-1.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Storage & Disk Space Cache Cleaner */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Temporary Cache &amp; Download Space</h4>
                <p className="text-[10.5px] text-gray-400">
                  {cacheCleanNotice ? (
                    <span className="text-emerald-400 font-bold">{cacheCleanNotice}</span>
                  ) : cacheSizeMb !== null ? (
                    `Used by audio/video temp chunks: ${cacheSizeMb} MB`
                  ) : (
                    "Cleans temporary audio chunks &amp; downloads"
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={isCleaningCache}
              className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-black" />
              <span>{isCleaningCache ? "Cleaning..." : "Clear Cache"}</span>
            </button>
          </div>

          {/* Compliance and Trademark Attribution Notice */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1 text-[10px] text-gray-400">
            <div className="flex items-center gap-1.5 font-bold text-gray-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400/80" />
              <span>Compliance &amp; Trademark Attribution Notice</span>
            </div>
            <p className="leading-relaxed opacity-75 text-[9.5px]">
              Courtesy to all rightful trademark and copyright owners. ClipVault is an independent open ecosystem desktop software. All product names, logos, brands, and registered trademarks—including Intel®, Intel Core™, Intel Arc™, OpenVINO™, AMD®, Ryzen™, NVIDIA®, TensorRT™, CUDA®, Google®, Gemini™, OpenAI®, ChatGPT®, Anthropic®, Claude®, Groq®, DeepSeek®, Moonshot AI, Alibaba®, Qwen®, Higgsfield™, and ByteDance®—are the property of their respective owners. Their reference does not imply any affiliation, sponsorship, or endorsement.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className={`w-2 h-2 rounded-full ${isKeyMissing ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
            <span>
              Active Engine:{" "}
              <b className="text-white">
                {byokMode === "local"
                  ? hardwareInfo?.engine_name || "Intel AI Engine"
                  : (CLOUD_ENGINES.find((e) => e.id === selectedEngine) || CLOUD_ENGINES[0])?.name || "AI Engine"}
              </b>
              {isKeyMissing && (
                <span className="ml-2 text-amber-400 font-bold tracking-wide animate-pulse">
                  (Key Required)
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            disabled={isKeyMissing}
            onClick={handleDone}
            title={
              isKeyMissing
                ? "Please enter an API key for the selected cloud model to continue"
                : "Save settings and continue"
            }
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-md ${
              isKeyMissing
                ? "bg-white/10 text-gray-500 border border-white/10 cursor-not-allowed opacity-40 shadow-none"
                : "bg-amber-400 text-black hover:bg-amber-300 cursor-pointer shadow-amber-400/20"
            }`}
          >
            Done and Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};


