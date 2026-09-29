import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Sparkles,
  Link2,
  UploadCloud,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FolderOpen,
  Share2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Subtitles,
  Zap,
  TrendingUp,
  Copy,
  ExternalLink,
  Film,
  Layers,
  Clock,
  FileVideo,
  X,
  ChevronDown,
  Move
} from "lucide-react";
import { EngineSettingsModal } from "../components/clipper/EngineSettingsModal";
import type { ByokMode } from "../components/clipper/EngineSettingsModal";
import { AI_ENGINES } from "./AiClipperScreen";
import { SUBTITLE_PRESETS, SubtitleStyleCard } from "../components/clipper/SubtitleStyleCard";
import { isLikedVideosUrl, cleanYouTubeUrl } from "../components/clipper/types";

const G = "#00e676";



interface Props {
  onBack: () => void;
  onGoToVault?: () => void;
}

interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader?: string;
}

interface ClipResult {
  filename: string;
  path: string;
  url: string;
  title: string;
  duration: number;
  virality_score: number;
  sub_scores?: {
    hook: number;
    flow: number;
    value: number;
    trend: number;
  };
  reason?: string;
  content_description?: string;
}

export function OpusClipperScreen({ onBack, onGoToVault }: Props) {
  // Input State
  const [url, setUrl] = useState("");
  const [resolvingInfo, setResolvingInfo] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [sourceTab, setSourceTab] = useState<"url" | "local">("url");

  // The 3 Minimalist Controls (Opus Style)
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState("opus_green");
  const [captionPlacement, setCaptionPlacement] = useState<"bottom" | "middle" | "top">("bottom");
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<"auto_split" | "podcast_split" | "vertical_crop" | "square_blur">("auto_split");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [quality, setQuality] = useState<"1080p" | "4k" | "720p">("1080p");
  const [clipYield, setClipYield] = useState<"auto" | "max" | "top10">("auto");

  // Dynamic Auto-Yield calculations based on video duration
  const dynamicAutoClips = videoInfo && videoInfo.duration > 0
    ? Math.max(5, Math.min(25, Math.round(videoInfo.duration / 180)))
    : null;
  const durationMin = videoInfo && videoInfo.duration > 0
    ? Math.round(videoInfo.duration / 60)
    : null;

  const getEffectiveNumClips = () => {
    if (clipYield === "top10") return 10;
    if (clipYield === "max") return 20;
    if (videoInfo && videoInfo.duration > 0) {
      return Math.max(5, Math.min(25, Math.round(videoInfo.duration / 180)));
    }
    return null;
  };

  // AI Engine & API Key State (synchronized with localStorage)
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState(() => localStorage.getItem("clipvault_selected_engine") || "gemini_flash");
  const [byokMode, setByokMode] = useState<ByokMode>(() => {
    const saved = localStorage.getItem("clipvault_byok_mode");
    if (saved === "local" || saved === "custom" || saved === "developer") return saved as ByokMode;
    return "custom";
  });
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("clipvault_anthropic_key") || "");
  const [higgsfieldKey, setHiggsfieldKey] = useState(() => localStorage.getItem("clipvault_higgsfield_key") || "");
  const [seeDanceKey, setSeeDanceKey] = useState(() => localStorage.getItem("clipvault_seedance_key") || "");
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem("clipvault_openai_key") || "");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("clipvault_gemini_key") || "");
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem("clipvault_groq_key") || "");
  const [deepseekKey, setDeepseekKey] = useState(() => localStorage.getItem("clipvault_deepseek_key") || "");
  const [moonlightKey, setMoonlightKey] = useState(() => localStorage.getItem("clipvault_moonlight_key") || "");
  const [qwenKey, setQwenKey] = useState(() => localStorage.getItem("clipvault_qwen_key") || "");
  const [customBaseUrl, setCustomBaseUrl] = useState(() => localStorage.getItem("clipvault_custom_base_url") || "");

  const getActiveEngineApiKey = (engineId: string = selectedEngine) => {
    switch (engineId) {
      case "openai_chatgpt":
        return openAiKey.trim() || localStorage.getItem("clipvault_openai_key")?.trim() || "";
      case "claude_fable":
        return anthropicKey.trim() || localStorage.getItem("clipvault_anthropic_key")?.trim() || "";
      case "gemini_flash":
        return geminiKey.trim() || localStorage.getItem("clipvault_gemini_key")?.trim() || "";
      case "groq_lpu":
        return groqKey.trim() || localStorage.getItem("clipvault_groq_key")?.trim() || "";
      case "deepseek":
        return deepseekKey.trim() || localStorage.getItem("clipvault_deepseek_key")?.trim() || "";
      case "moonlight":
        return moonlightKey.trim() || localStorage.getItem("clipvault_moonlight_key")?.trim() || "";
      case "qwen_ai":
      case "qwen":
        return qwenKey.trim() || localStorage.getItem("clipvault_qwen_key")?.trim() || "";
      case "higgsfield":
        return higgsfieldKey.trim() || localStorage.getItem("clipvault_higgsfield_key")?.trim() || "";
      case "seedance":
        return seeDanceKey.trim() || localStorage.getItem("clipvault_seedance_key")?.trim() || "";
      default:
        return "";
    }
  };

  const activeEngineObj = AI_ENGINES.find((e) => e.id === selectedEngine) || AI_ENGINES[0];
  const activeEngineKey = getActiveEngineApiKey(selectedEngine);

  useEffect(() => {
    localStorage.setItem("clipvault_selected_engine", selectedEngine);
  }, [selectedEngine]);
  useEffect(() => {
    localStorage.setItem("clipvault_byok_mode", byokMode);
  }, [byokMode]);
  useEffect(() => {
    localStorage.setItem("clipvault_gemini_key", geminiKey);
  }, [geminiKey]);
  useEffect(() => {
    localStorage.setItem("clipvault_openai_key", openAiKey);
  }, [openAiKey]);
  useEffect(() => {
    localStorage.setItem("clipvault_anthropic_key", anthropicKey);
  }, [anthropicKey]);
  useEffect(() => {
    localStorage.setItem("clipvault_groq_key", groqKey);
  }, [groqKey]);
  useEffect(() => {
    localStorage.setItem("clipvault_deepseek_key", deepseekKey);
  }, [deepseekKey]);
  useEffect(() => {
    localStorage.setItem("clipvault_moonlight_key", moonlightKey);
  }, [moonlightKey]);
  useEffect(() => {
    localStorage.setItem("clipvault_qwen_key", qwenKey);
  }, [qwenKey]);

  // Processing & Task State
  const [isGenerating, setIsGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results State
  const [generatedClips, setGeneratedClips] = useState<ClipResult[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Close caption style dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target as Node)) {
        setStyleDropdownOpen(false);
      }
    }
    if (styleDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [styleDropdownOpen]);

  // Debounced Video Info Fetcher
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) {
      setVideoInfo(null);
      setInfoError(null);
      return;
    }

    if (isLikedVideosUrl(trimmed)) {
      setInfoError("Liked Videos Playlist Link Detected: This link was copied from your private YouTube 'Liked videos' playlist (list=LL). YouTube blocks automated tools from accessing private playlists. Please use the direct video link instead.");
      setVideoInfo(null);
      setResolvingInfo(false);
      return;
    }

    const timer = setTimeout(async () => {
      setResolvingInfo(true);
      setInfoError(null);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/video_info?url=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.error) {
          setInfoError(data.error);
          setVideoInfo(null);
        } else {
          setVideoInfo({
            title: data.title || "Online Video",
            duration: data.duration || 0,
            thumbnail: data.thumbnail || "",
            uploader: data.uploader || "",
          });
        }
      } catch {
        setInfoError("Unable to connect to local video resolver.");
        setVideoInfo(null);
      } finally {
        setResolvingInfo(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [url]);

  // Polling for Task Progress
  useEffect(() => {
    if (!taskId || !isGenerating) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/progress/${taskId}`);
        const data = await res.json();

        setProgressPercent(data.progress || 0);
        setProgressStatus(data.status || "Generating viral clips...");

        if (data.completed) {
          setIsGenerating(false);
          clearInterval(pollInterval);
          if (Array.isArray(data.clips) && data.clips.length > 0) {
            const formatted: ClipResult[] = data.clips.map((c: any, idx: number) => ({
              filename: typeof c === "string" ? c : c.filename || `Clip_${idx + 1}.mp4`,
              path: typeof c === "string" ? c : c.path || "",
              url: typeof c === "string" ? `http://127.0.0.1:8000/stream?path=${encodeURIComponent(c)}` : c.url || `http://127.0.0.1:8000/stream?path=${encodeURIComponent(c.path || "")}`,
              title: c.title || `${data.title || "Viral Clip"} #${idx + 1}`,
              duration: c.duration || 45,
              virality_score: c.virality_score || 95,
              sub_scores: c.sub_scores || { hook: 96, flow: 94, value: 97, trend: 95 },
              reason: c.reason || "High emotional engagement hook with natural conversational pacing.",
              content_description: c.content_description || "",
            }));
            setGeneratedClips(formatted);
            setActiveClipIndex(0);
          } else {
            setErrorMsg("No clips were generated. Please try a different video or link.");
          }
        } else if (data.error || data.cancelled) {
          setIsGenerating(false);
          clearInterval(pollInterval);
          setErrorMsg(data.error || "Generation was stopped or encountered an issue.");
        }
      } catch {
        // Transient network error
      }
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [taskId, isGenerating]);

  // Paste from clipboard helper
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Fallback
    }
  };

  // Local File Selector
  const handleSelectLocalFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const filePath = file.path || file.name;
        setUrl(filePath);
        setSourceTab("local");
        setVideoInfo({
          title: file.name.replace(/\.[^/.]+$/, ""),
          duration: 0,
          thumbnail: "",
          uploader: "Local Video File",
        });
      }
    };
    input.click();
  };

  // Start Generation
  const handleGenerate = async () => {
    if (!url.trim()) return;

    if (sourceTab === "url" && isLikedVideosUrl(url)) {
      setErrorMsg("Liked Videos Playlist Link Detected: This link was copied from your private YouTube 'Liked videos' playlist (list=LL). YouTube blocks automated tools from accessing private playlists. Please click 'Clean Link' or use the direct video link instead.");
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStatus("Submitting 1-Click task to AI clipping engine...");
    setGeneratedClips([]);

    // Translate caption placement to Y percentage (Podcast split and Auto split default to 0.50 across center seam)
    const effectiveCapPlacement = (layoutMode === "podcast_split" || layoutMode === "auto_split") ? "middle" : captionPlacement;
    const yPct = effectiveCapPlacement === "top" ? 0.20 : effectiveCapPlacement === "middle" ? 0.50 : 0.70;

    const payload = {
      url: url.trim(),
      api_key: activeEngineKey || undefined,
      ai_engine: selectedEngine,
      num_clips: getEffectiveNumClips(),
      target_duration: -1,
      layout: aspectRatio === "16:9" ? "landscape" : layoutMode,
      aspect_ratio: aspectRatio,
      quality: quality === "4k" ? "1080p" : quality, // Hardware optimal
      export_resolution: quality === "4k" ? "2160p" : quality === "1080p" ? "1080p" : "720p",
      add_captions: captionsEnabled,
      caption_style: captionStyle,
      caption_y_pct: yPct,
      camera_style: "instant",
      adaptive_crop: true,
      enable_super_resolution: quality === "4k",
      add_bg_music: false,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.task_id) {
        setTaskId(data.task_id);
      } else {
        setIsGenerating(false);
        setErrorMsg(data.detail || "Server rejected task submission.");
      }
    } catch {
      setIsGenerating(false);
      setErrorMsg("Failed to connect to local ClipVault engine on port 8000.");
    }
  };

  // Cancel Active Task
  const handleCancel = async () => {
    if (taskId) {
      try {
        await fetch(`http://127.0.0.1:8000/api/cancel/${taskId}`, { method: "POST" });
      } catch {}
    }
    setIsGenerating(false);
    setProgressStatus("Cancelled by user.");
  };

  // Open output folder
  const handleOpenFolder = async () => {
    try {
      await fetch("http://127.0.0.1:8000/api/open_folder", { method: "POST" });
    } catch {}
  };

  const activeClip = generatedClips[activeClipIndex] || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070709] text-white select-none overflow-hidden">
      {/* Top Header Navigation Bar */}
      <header
        className="h-14 pl-6 pr-40 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0b0e]/90 backdrop-blur-md z-20 flex-shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-all cursor-pointer text-gray-300 hover:text-white"
            title="Back to Project Selector"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#00e676]/10 border border-[#00e676]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#00e676]" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">1-Click Auto Clipper</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00e676]/10 text-[#00e676] font-semibold border border-[#00e676]/25">
              Opus Concept
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {/* AI Model & API Key Configuration */}
          <button
            type="button"
            onClick={() => setShowKeySettings(true)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeEngineKey || activeEngineObj?.providerType === "local"
                ? "bg-white/[0.05] hover:bg-white/[0.1] text-gray-200 border-white/[0.1]"
                : "bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30"
            }`}
            title="Configure AI Model and API Key (Gemini, OpenAI, Groq, DeepSeek, Local Hardware)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00e676]" />
            <span className="max-w-[130px] truncate">{activeEngineObj?.name || "AI Engine"}</span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                activeEngineKey || activeEngineObj?.providerType === "local"
                  ? "bg-[#00e676] shadow-[0_0_6px_#00e676]"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
          </button>

          {onGoToVault && (
            <button
              type="button"
              onClick={onGoToVault}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/[0.08]"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Saved Vault</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
        <div className="w-full max-w-7xl xl:max-w-[1440px] flex flex-col gap-6">

          {generatedClips.length > 0 ? (
            /* RESULTS DASHBOARD (Opus Style) */
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#00e676]" />
                    <span>Generated {generatedClips.length} Viral Clips</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ranked by AI virality score, reframed for {aspectRatio}, with burned-in dynamic captions & original raw audio.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedClips([]);
                    setUrl("");
                    setVideoInfo(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Clip Another Video</span>
                </button>
              </div>

              {/* Main Player & Analytics Card */}
              {activeClip && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#111115] border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
                  {/* Left Column: Phone Player Preview */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    <div
                      className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center"
                      style={{
                        width: aspectRatio === "9:16" ? 270 : aspectRatio === "1:1" ? 320 : 360,
                        height: aspectRatio === "9:16" ? 480 : aspectRatio === "1:1" ? 320 : 202,
                      }}
                    >
                      <video
                        ref={videoRef}
                        src={activeClip.url}
                        className="w-full h-full object-cover cursor-pointer"
                        playsInline
                        muted={isMuted}
                        onClick={() => {
                          if (videoRef.current) {
                            if (isPlaying) videoRef.current.pause();
                            else videoRef.current.play();
                            setIsPlaying(!isPlaying);
                          }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />

                      {/* Centered Play Button Overlay */}
                      {!isPlaying && (
                        <div
                          onClick={() => {
                            videoRef.current?.play();
                            setIsPlaying(true);
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-all"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#00e676] text-black flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                            <Play className="w-6 h-6 ml-0.5 fill-black" />
                          </div>
                        </div>
                      )}

                      {/* Audio mute toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMuted(!isMuted);
                        }}
                        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Virality Breakdown & Quick Actions */}
                  <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                    <div>
                      {/* Virality Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/30 text-xs font-bold">
                            Score: {activeClip.virality_score} pts
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-400/10 text-sky-400 border border-sky-400/20 text-[11px] font-semibold">
                            {activeClip.duration.toFixed(0)}s Duration
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 font-mono">
                          Clip {activeClipIndex + 1} of {generatedClips.length}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white leading-snug mb-1">
                        {activeClip.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono truncate mb-4">
                        {activeClip.filename}
                      </p>

                      {/* Virality Sub-Score Meters */}
                      {activeClip.sub_scores && (
                        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-2.5 mb-4">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400 font-medium flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-400" /> Hook Strength
                            </span>
                            <span className="font-bold text-amber-400">{activeClip.sub_scores.hook}/100</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${activeClip.sub_scores.hook}%` }} />
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-gray-400 font-medium flex items-center gap-1.5">
                              <TrendingUp className="w-3.5 h-3.5 text-[#00e676]" /> Narrative Flow
                            </span>
                            <span className="font-bold text-[#00e676]">{activeClip.sub_scores.flow}/100</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-[#00e676] rounded-full" style={{ width: `${activeClip.sub_scores.flow}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Curation Reason */}
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-gray-300 leading-relaxed">
                        <strong className="text-white block mb-1">Why this went viral:</strong>
                        {activeClip.reason}
                      </div>
                    </div>

                    {/* Quick Publish & Export Bar */}
                    <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${activeClip.title}\n\n#viral #shorts #reels`);
                            setCopiedTitle(true);
                            setTimeout(() => setCopiedTitle(false), 2000);
                          }}
                          className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedTitle ? "Copied!" : "Copy Title & Tags"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenFolder}
                          className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Open File</span>
                        </button>
                      </div>

                      {onGoToVault && (
                        <button
                          type="button"
                          onClick={onGoToVault}
                          className="px-4 py-2 rounded-lg bg-[#00e676] text-black text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#00e676]/20"
                        >
                          <span>Go to Vault</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Clip Thumbnails Carousel / Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {generatedClips.map((clip, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveClipIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      activeClipIndex === idx
                        ? "bg-[#00e676]/10 border-[#00e676] shadow-lg shadow-[#00e676]/10"
                        : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Clip #{idx + 1}</span>
                      <span className="font-bold text-amber-400 text-[11px]">{clip.virality_score} pts</span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{clip.title}</p>
                    <span className="text-[10px] text-gray-500">{clip.duration.toFixed(0)}s</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* INPUT & MINIMALIST 3-OPTION STUDIO */
            <div className="flex flex-col gap-6">

              {/* Header Title Hero */}
              <div className="text-center max-w-2xl mx-auto space-y-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e676]/10 border border-[#00e676]/25 text-[#00e676] text-[11px] font-bold tracking-wide uppercase shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Next-Gen Autonomous Video Intelligence</span>
                </div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white">
                  1-Click Viral Clipping
                </h1>
                <p className="text-xs md:text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
                  Autonomous AI curation, face tracking, dynamic kinetic subtitles, and split-screen generation in one click.
                </p>
              </div>

              {/* Main Input Card */}
              <div className="bg-[#101116] border border-white/[0.08] rounded-3xl p-6 sm:p-8 lg:p-9 shadow-2xl flex flex-col gap-7">
                
                {/* AI API Key Setup Notice if not configured */}
                {!activeEngineKey && activeEngineObj?.providerType !== "local" && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">
                        AI API Key not set: Click to add your free Google Gemini API key for instant viral hook discovery.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeySettings(true)}
                      className="px-3 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 font-bold text-xs transition-colors shrink-0 ml-3 cursor-pointer"
                    >
                      Configure Key
                    </button>
                  </div>
                )}

                {/* Hero Source Video Input Module */}
                <div className="flex flex-col gap-3">
                  {/* Segmented Tab Switcher: URL vs Local File */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.08] gap-1">
                      <button
                        type="button"
                        onClick={() => setSourceTab("url")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          sourceTab === "url"
                            ? "bg-[#00e676] text-black shadow-md"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Public Video Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSourceTab("local")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          sourceTab === "local"
                            ? "bg-[#00e676] text-black shadow-md"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Local Video File</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-gray-500 hidden sm:inline">
                      {sourceTab === "url" ? "YouTube, Rumble, or Twitch URL" : "MP4, MOV, WEBM, MKV supported"}
                    </span>
                  </div>

                  {/* Input View 1: Public Web URL */}
                  {sourceTab === "url" ? (
                    <>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-gray-500 pointer-events-none">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="Paste public video URL (e.g. https://youtube.com/watch?v=...)"
                          disabled={isGenerating}
                          className={`w-full rounded-xl pl-10 pr-24 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none transition-all disabled:opacity-50 ${
                            isLikedVideosUrl(url)
                              ? "bg-red-500/10 border border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
                              : "bg-white/[0.03] border border-white/[0.12] focus:border-[#00e676] focus:ring-1 focus:ring-[#00e676]/40"
                          }`}
                        />
                        <div className="absolute right-2.5 flex items-center gap-1.5">
                          {url && (
                            <button
                              type="button"
                              onClick={() => {
                                setUrl("");
                                setVideoInfo(null);
                              }}
                              disabled={isGenerating}
                              className="p-1.5 text-gray-400 hover:text-white rounded-md transition-all cursor-pointer"
                              title="Clear input"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handlePaste}
                            disabled={isGenerating}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-xs font-bold text-gray-200 transition-all cursor-pointer"
                          >
                            Paste
                          </button>
                        </div>
                      </div>

                      {isLikedVideosUrl(url) && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-red-300">Liked Videos Playlist Link Detected:</span>{" "}
                              <span>This link was copied directly from your private YouTube &quot;Liked videos&quot; playlist (<code className="text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded">list=LL</code>). YouTube blocks external software from accessing private playlists. Please use the direct video link instead.</span>
                            </div>
                          </div>
                          {cleanYouTubeUrl(url) && (
                            <button
                              type="button"
                              onClick={() => {
                                const clean = cleanYouTubeUrl(url);
                                if (clean) setUrl(clean);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-all shrink-0 cursor-pointer shadow-md self-start sm:self-center"
                            >
                              Clean Link &amp; Use Direct Video
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* Input View 2: Local Video File Browse Card */
                    <div
                      onClick={handleSelectLocalFile}
                      className="border-2 border-dashed border-white/[0.12] hover:border-[#00e676]/60 rounded-xl p-5 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center group"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/[0.05] group-hover:bg-[#00e676]/10 flex items-center justify-center text-gray-400 group-hover:text-[#00e676] transition-colors">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-gray-200 group-hover:text-white">
                        {url && videoInfo?.uploader === "Local Video File" ? (
                          <span className="text-[#00e676]">Selected: {videoInfo.title}</span>
                        ) : (
                          <span>Click to browse video file from your computer</span>
                        )}
                      </div>
                      <span className="text-[10.5px] text-gray-500">Fast local NVENC / Intel QSV hardware accelerated processing</span>
                    </div>
                  )}

                  {/* Live Video Info Card Preview */}
                  {resolvingInfo && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3 animate-pulse">
                      <Loader2 className="w-4 h-4 text-[#00e676] animate-spin" />
                      <span className="text-xs text-gray-400">Resolving video title, duration, and stream metadata...</span>
                    </div>
                  )}

                  {infoError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{infoError}</span>
                    </div>
                  )}

                  {videoInfo && !resolvingInfo && (
                    <div className="p-3.5 rounded-xl bg-[#00e676]/[0.04] border border-[#00e676]/30 flex items-center justify-between gap-3.5">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {videoInfo.thumbnail ? (
                          <img
                            src={videoInfo.thumbnail}
                            alt="Thumbnail"
                            className="w-20 h-12 object-cover rounded-lg flex-shrink-0 bg-black"
                          />
                        ) : (
                          <div className="w-20 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                            <FileVideo className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{videoInfo.title}</h4>
                          <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                            {videoInfo.uploader && <span>{videoInfo.uploader}</span>}
                            {videoInfo.duration > 0 && (
                              <span className="flex items-center gap-1 text-[#00e676] font-semibold">
                                <Clock className="w-3 h-3" />
                                {Math.floor(videoInfo.duration / 60)}m {Math.floor(videoInfo.duration % 60)}s
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUrl("");
                          setVideoInfo(null);
                        }}
                        className="text-xs text-gray-400 hover:text-rose-400 font-semibold transition-colors shrink-0 px-2 py-1"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-white/[0.06]" />

                {/* THE 3-COLUMN MODULAR STUDIO DECK */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-7 items-stretch">

                  {/* COLUMN 1: VIDEO FRAMING & RATIO */}
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4.5 shadow-sm">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#00e676]" />
                        <span>Framing & Video Size</span>
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">Core Visuals</span>
                    </div>

                    {/* Canvas Ratio Pills */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Canvas Ratio</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "9:16", label: "9:16", badge: "VIRAL", sub: "Shorts · Reels" },
                          { id: "1:1", label: "1:1", badge: "FEED", sub: "Instagram" },
                          { id: "16:9", label: "16:9", badge: "DESK", sub: "YouTube" },
                        ].map((ar) => (
                          <button
                            key={ar.id}
                            type="button"
                            onClick={() => setAspectRatio(ar.id as any)}
                            className={`py-2.5 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                              aspectRatio === ar.id
                                ? "bg-[#00e676]/15 border-[#00e676] text-white shadow-sm font-bold"
                                : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="text-xs font-black">{ar.label}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{ar.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject Reframing Layouts */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Subject Reframing</span>
                      <div className="flex flex-col gap-2">
                        {[
                          {
                            id: "auto_split",
                            label: "Auto Detect & Split",
                            badge: "AI AUTO",
                            sub: "Auto-detects 2-person dialogues or solo speaker",
                          },
                          {
                            id: "podcast_split",
                            label: "Dual-Speaker Split",
                            badge: "STACKED",
                            sub: "Host top & guest bottom with split line subtitle",
                          },
                          {
                            id: "vertical_crop",
                            label: "Solo Face-Tracking",
                            badge: "9:16 SOLO",
                            sub: "Full vertical crop locked on active speaker",
                          },
                          {
                            id: "square_blur",
                            label: "Square Focus + Blur",
                            badge: "CANVAS",
                            sub: "Centered 1:1 frame with bokeh blurred background",
                          },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setLayoutMode(item.id as any);
                              if (item.id === "podcast_split" || item.id === "auto_split") {
                                setCaptionPlacement("middle");
                              }
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                              layoutMode === item.id
                                ? "bg-[#00e676]/10 border-[#00e676] text-white shadow-[0_0_14px_rgba(0,230,118,0.12)]"
                                : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12]"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white group-hover:text-white">{item.label}</span>
                                <span
                                  className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold border transition-colors ${
                                    layoutMode === item.id
                                      ? "bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40"
                                      : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-gray-400 mt-0.5 leading-tight">{item.sub}</div>
                            </div>
                            {layoutMode === item.id && <Check className="w-4 h-4 text-[#00e676] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: SUBTITLES & PRESETS */}
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4.5 shadow-sm relative z-20">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Subtitles className="w-4 h-4 text-[#00e676]" />
                        <span>AI Captions & Styles</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCaptionsEnabled(!captionsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          captionsEnabled ? "bg-[#00e676]" : "bg-white/20"
                        }`}
                        title={captionsEnabled ? "Captions enabled" : "Captions disabled"}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                            captionsEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {captionsEnabled ? (
                      <div className="flex flex-col gap-3.5">
                        {/* Style Presets Visual Gallery */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              Subtitle Style Preset
                            </span>
                            <span className="text-[9.5px] text-[#00e676] font-mono font-bold">
                              Kinetic Visuals
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {SUBTITLE_PRESETS.map((preset) => (
                              <SubtitleStyleCard
                                key={preset.id}
                                preset={preset}
                                isSelected={captionStyle === preset.id}
                                onSelect={(id) => setCaptionStyle(id)}
                                compact={false}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Active Style Details Callout */}
                        {(() => {
                          const activePreset =
                            SUBTITLE_PRESETS.find((p) => p.id === captionStyle) || SUBTITLE_PRESETS[0];
                          return (
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{
                                    backgroundColor: activePreset.color,
                                    boxShadow: `0 0 8px ${activePreset.color}`,
                                  }}
                                />
                                <span className="font-bold text-white text-xs truncate">
                                  {activePreset.name}
                                </span>
                                <span className="text-gray-400 text-[11px] truncate hidden sm:inline">
                                  • {activePreset.desc}
                                </span>
                              </div>
                              <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/30 shrink-0">
                                {activePreset.badge}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Subtitle Vertical Placement */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Position</span>
                            {(layoutMode === "podcast_split" || layoutMode === "auto_split") && (
                              <span className="text-[9.5px] text-[#00e676] font-medium">Split Seam (Middle)</span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "bottom", label: "Bottom" },
                              { id: "middle", label: "Center Seam" },
                              { id: "top", label: "Top" },
                            ].map((pos) => (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() => setCaptionPlacement(pos.id as any)}
                                className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  captionPlacement === pos.id
                                    ? "bg-[#00e676]/15 border-[#00e676] text-white shadow-sm"
                                    : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-[10.5px] text-gray-400 flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-[#00e676] shrink-0" />
                          <span>Pre-rendered with multi-stage Gaussian bloom & genuine Montserrat-Black.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-white/[0.01] border border-white/[0.04] text-gray-500 text-xs">
                        <Subtitles className="w-6 h-6 text-gray-600 mb-2" />
                        <span className="font-semibold text-gray-400">Captions Disabled</span>
                        <span className="text-[11px] text-gray-500 mt-1">Export clean video without animated typography</span>
                      </div>
                    )}
                  </div>

                  {/* COLUMN 3: VIRAL INTELLIGENCE & OUTPUT */}
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-4.5 shadow-sm">
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#00e676]" />
                        <span>Viral Intelligence & Output</span>
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">Export Master</span>
                    </div>

                    {/* Viral Moments Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Viral Moments Curation</span>
                      <div className="flex flex-col gap-2">
                        {[
                          {
                            id: "auto",
                            label: "Auto Discovery",
                            badge: dynamicAutoClips ? `~${dynamicAutoClips} CLIPS` : "SMART",
                            sub: durationMin ? `Full ${durationMin}m video coverage` : "Proportional to duration",
                          },
                          {
                            id: "max",
                            label: "Deep Sweep",
                            badge: "18-25 CLIPS",
                            sub: "Maximum viral yield across entire timeline",
                          },
                          {
                            id: "top10",
                            label: "Curated Top 10",
                            badge: "TOP 10",
                            sub: "Peak virality score hooks only",
                          },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setClipYield(item.id as any)}
                            className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group ${
                              clipYield === item.id
                                ? "bg-[#00e676]/10 border-[#00e676] text-white shadow-[0_0_14px_rgba(0,230,118,0.12)]"
                                : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border-white/[0.12]"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{item.label}</span>
                                <span
                                  className={`text-[8.5px] px-1.5 py-0.5 rounded font-mono font-bold border ${
                                    clipYield === item.id
                                      ? "bg-[#00e676]/20 text-[#00e676] border-[#00e676]/40"
                                      : "bg-white/[0.04] text-gray-400 border-white/[0.08]"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-gray-400 mt-0.5 leading-tight">{item.sub}</div>
                            </div>
                            {clipYield === item.id && <Check className="w-4 h-4 text-[#00e676] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quality Selection */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Export Resolution</span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "1080p", label: "1080p", badge: "REC", sub: "Full HD 60fps" },
                          { id: "4k", label: "4K PRO", badge: "UHD", sub: "Super-Resolution" },
                          { id: "720p", label: "720p", badge: "FAST", sub: "Rapid Preview" },
                        ].map((q) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setQuality(q.id as any)}
                            className={`py-2.5 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                              quality === q.id
                                ? "bg-[#00e676]/15 border-[#00e676] text-white shadow-sm font-bold"
                                : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="text-xs font-black">{q.label}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{q.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Progress Bar (Active Rendering) */}
                {isGenerating && (
                  <div className="p-4 rounded-2xl bg-[#00e676]/5 border border-[#00e676]/20 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-[#00e676] animate-spin" />
                        {progressStatus}
                      </span>
                      <span className="font-bold text-[#00e676]">{progressPercent}%</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-[#00e676] rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-400">
                        Analyzing dialogue, reframing faces, and compiling clips...
                      </span>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action CTA Button */}
                {!isGenerating && (
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!url.trim() || resolvingInfo}
                      className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl ${
                        !url.trim() || resolvingInfo
                          ? "bg-white/[0.05] text-gray-500 border border-white/[0.08] cursor-not-allowed"
                          : "bg-gradient-to-r from-[#00E676] via-[#00DF6D] to-[#00C853] text-black hover:brightness-110 shadow-[0_4px_24px_rgba(0,230,118,0.30)] hover:shadow-[0_6px_32px_rgba(0,230,118,0.45)] hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 fill-black" />
                      <span>Generate Viral Clips in 1 Click</span>
                    </button>
                    {!url.trim() && (
                      <span className="text-[11px] text-gray-500 text-center font-medium">
                        Paste a public video link or choose a local file above to activate 1-click clipping
                      </span>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </main>

      {/* AI Model & API Key Settings Modal */}
      <EngineSettingsModal
        isOpen={showKeySettings}
        onClose={() => setShowKeySettings(false)}
        engines={AI_ENGINES}
        selectedEngine={selectedEngine}
        onSelectEngine={setSelectedEngine}
        byokMode={byokMode}
        setByokMode={setByokMode}
        anthropicKey={anthropicKey}
        setAnthropicKey={setAnthropicKey}
        higgsfieldKey={higgsfieldKey}
        setHiggsfieldKey={setHiggsfieldKey}
        seeDanceKey={seeDanceKey}
        setSeeDanceKey={setSeeDanceKey}
        openAiKey={openAiKey}
        setOpenAiKey={setOpenAiKey}
        geminiKey={geminiKey}
        setGeminiKey={setGeminiKey}
        groqKey={groqKey}
        setGroqKey={setGroqKey}
        deepseekKey={deepseekKey}
        setDeepseekKey={setDeepseekKey}
        moonlightKey={moonlightKey}
        setMoonlightKey={setMoonlightKey}
        qwenKey={qwenKey}
        setQwenKey={setQwenKey}
        customBaseUrl={customBaseUrl}
        setCustomBaseUrl={setCustomBaseUrl}
      />
    </div>
  );
}
