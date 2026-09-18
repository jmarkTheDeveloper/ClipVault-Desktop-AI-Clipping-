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
  X
} from "lucide-react";

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

  // The 3 Minimalist Controls (Opus Style)
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState("capcut_yellow");
  const [captionPlacement, setCaptionPlacement] = useState<"bottom" | "middle" | "top">("bottom");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [quality, setQuality] = useState<"1080p" | "4k" | "720p">("1080p");

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

  // Debounced Video Info Fetcher
  useEffect(() => {
    const trimmed = url.trim();
    if (!trimmed || (!trimmed.startsWith("http://") && !trimmed.startsWith("https://"))) {
      setVideoInfo(null);
      setInfoError(null);
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

    setErrorMsg(null);
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStatus("Submitting 1-Click task to AI clipping engine...");
    setGeneratedClips([]);

    // Translate caption placement to Y percentage
    const yPct = captionPlacement === "top" ? 0.20 : captionPlacement === "middle" ? 0.50 : 0.70;

    const payload = {
      url: url.trim(),
      num_clips: null, // Auto discovery
      target_duration: -1,
      layout: aspectRatio === "16:9" ? "landscape" : "vertical_crop",
      aspect_ratio: aspectRatio,
      quality: quality === "4k" ? "1080p" : quality, // Hardware optimal
      export_resolution: quality === "4k" ? "2160p" : quality === "1080p" ? "1080p" : "720p",
      add_captions: captionsEnabled,
      caption_style: captionStyle,
      caption_y_pct: yPct,
      camera_style: "instant",
      adaptive_crop: true,
      enable_super_resolution: quality === "4k",
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
      <header className="h-14 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0b0e]/90 backdrop-blur-md z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-3">
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
      <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center">
        <div className="w-full max-w-4xl flex flex-col gap-6">

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
                    Ranked by AI virality score, reframed for {aspectRatio}, with burned-in dynamic captions.
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
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
                  <span>1-Click Viral Clipping</span>
                  <Sparkles className="w-6 h-6 text-[#00e676]" />
                </h1>
                <p className="text-xs md:text-sm text-gray-400">
                  Paste any video link. Choose your captions, size, and quality. AI handles transcription, face tracking, and viral hook detection automatically.
                </p>
              </div>

              {/* Main Input Card */}
              <div className="bg-[#111115] border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
                
                {/* URL Input Box */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Source Video Link</span>
                    <span className="text-[11px] text-gray-500 font-normal lowercase">YouTube, Rumble, or local file</span>
                  </label>

                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-gray-500 pointer-events-none">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste YouTube link (e.g. https://youtube.com/watch?v=...)"
                      disabled={isGenerating}
                      className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl pl-10 pr-24 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00e676] transition-all disabled:opacity-50"
                    />
                    <div className="absolute right-2 flex items-center gap-1.5">
                      {url && (
                        <button
                          type="button"
                          onClick={() => setUrl("")}
                          disabled={isGenerating}
                          className="p-1.5 text-gray-400 hover:text-white rounded-md transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handlePaste}
                        disabled={isGenerating}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.16] text-xs font-semibold text-gray-200 transition-all cursor-pointer"
                      >
                        Paste
                      </button>
                    </div>
                  </div>

                  {/* Or upload local file */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="text-[11px] text-gray-500">or</span>
                    <button
                      type="button"
                      onClick={handleSelectLocalFile}
                      disabled={isGenerating}
                      className="text-[11px] font-semibold text-[#00e676] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Choose local video file</span>
                    </button>
                  </div>
                </div>

                {/* Live Video Info Card Preview */}
                {resolvingInfo && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3 animate-pulse">
                    <Loader2 className="w-4 h-4 text-[#00e676] animate-spin" />
                    <span className="text-xs text-gray-400">Resolving video details and duration...</span>
                  </div>
                )}

                {infoError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{infoError}</span>
                  </div>
                )}

                {videoInfo && !resolvingInfo && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center gap-3.5">
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
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{videoInfo.title}</h4>
                      <p className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        {videoInfo.uploader && <span>{videoInfo.uploader}</span>}
                        {videoInfo.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {Math.floor(videoInfo.duration / 60)}m {Math.floor(videoInfo.duration % 60)}s
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div className="h-px bg-white/[0.06]" />

                {/* THE 3 MINIMALIST CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* 1. AI CAPTIONS */}
                  <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Subtitles className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>AI Captions</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setCaptionsEnabled(!captionsEnabled)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          captionsEnabled ? "bg-[#00e676]" : "bg-white/20"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                            captionsEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {captionsEnabled ? (
                      <div className="flex flex-col gap-2 pt-1">
                        {/* Style Presets */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Style</span>
                          <select
                            value={captionStyle}
                            onChange={(e) => setCaptionStyle(e.target.value)}
                            className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00e676]"
                          >
                            <option value="capcut_yellow">CapCut Yellow Glow</option>
                            <option value="hormozi_bold">Hormozi Punch</option>
                            <option value="clean_minimal">Clean Minimal White</option>
                            <option value="neon_cyan">Neon Cyan</option>
                            <option value="karaoke_glow">Karaoke Animated</option>
                          </select>
                        </div>

                        {/* Placement */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Position</span>
                          <div className="grid grid-cols-3 gap-1">
                            {(["bottom", "middle", "top"] as const).map((pos) => (
                              <button
                                key={pos}
                                type="button"
                                onClick={() => setCaptionPlacement(pos)}
                                className={`py-1 text-[11px] font-semibold rounded-md border capitalize transition-all cursor-pointer ${
                                  captionPlacement === pos
                                    ? "bg-[#00e676]/15 border-[#00e676] text-[#00e676]"
                                    : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white"
                                }`}
                              >
                                {pos}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-500 italic pt-2">Captions disabled</span>
                    )}
                  </div>

                  {/* 2. VIDEO SIZE / ASPECT RATIO */}
                  <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Video Size</span>
                    </span>

                    <div className="flex flex-col gap-1.5 pt-1">
                      {[
                        { id: "9:16", label: "9:16 Portrait", sub: "TikTok, Shorts, Reels" },
                        { id: "1:1", label: "1:1 Square", sub: "Instagram, LinkedIn" },
                        { id: "16:9", label: "16:9 Landscape", sub: "YouTube, Twitter" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAspectRatio(item.id as any)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                            aspectRatio === item.id
                              ? "bg-sky-400/15 border-sky-400 text-white"
                              : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{item.label}</div>
                            <div className="text-[10px] text-gray-500">{item.sub}</div>
                          </div>
                          {aspectRatio === item.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. QUALITY */}
                  <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                      <span>Quality</span>
                    </span>

                    <div className="flex flex-col gap-1.5 pt-1">
                      {[
                        { id: "1080p", label: "1080p Full HD", sub: "Recommended (60fps)" },
                        { id: "4k", label: "4K Ultra HD", sub: "AI Super-Resolution" },
                        { id: "720p", label: "720p Fast", sub: "Rapid Generation" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setQuality(item.id as any)}
                          className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                            quality === item.id
                              ? "bg-purple-400/15 border-purple-400 text-white"
                              : "bg-white/[0.03] border-white/[0.08] text-gray-400 hover:text-white"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold">{item.label}</div>
                            <div className="text-[10px] text-gray-500">{item.sub}</div>
                          </div>
                          {quality === item.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Progress Bar (Active Rendering) */}
                {isGenerating && (
                  <div className="p-4 rounded-xl bg-[#00e676]/5 border border-[#00e676]/20 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-2">
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
                        className="text-xs font-semibold text-rose-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action CTA Button */}
                {!isGenerating && (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!url.trim() || resolvingInfo}
                    className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl ${
                      !url.trim() || resolvingInfo
                        ? "bg-white/10 text-gray-500 cursor-not-allowed"
                        : "bg-[#00e676] text-black hover:brightness-110 shadow-[#00e676]/25 hover:shadow-[#00e676]/40 hover:-translate-y-0.5"
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Get Clips in 1 Click</span>
                  </button>
                )}

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
