
import React, { useState, useEffect } from "react";
import { Zap, Film, FolderOpen, Sparkles, Cpu, CheckCircle2, ArrowRight, ShieldCheck, Layers, Play, HardDrive, Music } from "lucide-react";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack: () => void;
  onSelect: (mode: Mode) => void;
}

interface WorkflowCard {
  id: Mode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  badge: string;
  badgeColor: string;
  subtitle: string;
  gradient: string;
  hoverBorder: string;
  glowColor: string;
  iconBg: string;
  iconColor: string;
  btnBg: string;
  btnHover: string;
  features: string[];
}

const WORKFLOWS: WorkflowCard[] = [
  {
    id: "ai-clipper",
    icon: Zap,
    title: "AI Video Clipper",
    badge: "🔥 Viral Short-Form Engine",
    badgeColor: "bg-amber-400/10 text-amber-300 border-amber-400/30",
    subtitle: "Paste YouTube links or import local media. AI detects high-retention viral hooks, tracks speaker faces, and crafts 9:16 Shorts with dynamic subtitles.",
    gradient: "linear-gradient(180deg, rgba(251,191,36,0.08) 0%, rgba(20,20,20,0.85) 100%)",
    hoverBorder: "border-amber-400/60 shadow-[0_0_35px_rgba(251,191,36,0.18)]",
    glowColor: "rgba(251,191,36,0.25)",
    iconBg: "bg-gradient-to-br from-amber-400/20 to-amber-500/10 border-amber-400/30",
    iconColor: "text-amber-400",
    btnBg: "bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.3)]",
    btnHover: "group-hover:translate-x-1",
    features: [
      "Active Speaker Face Tracking (9:16)",
      "CapCut Word-by-Word Subtitles & SFX",
      "Satisfying Gameplay & ASMR Split",
      "Smart Stream Slicing (yt-dlp)",
      "Whisper AI Multi-Language Auto-Sync"
    ],
  },
  {
    id: "movie-recapper",
    icon: Film,
    title: "Movie Recapper",
    badge: "🍿 AI Narrator Engine",
    badgeColor: "bg-purple-400/10 text-purple-300 border-purple-400/30",
    subtitle: "Transform full-length movies, trailers, and series into suspenseful recap shorts with AI narrator voices and cinematic background soundtracks.",
    gradient: "linear-gradient(180deg, rgba(168,85,247,0.08) 0%, rgba(20,20,20,0.85) 100%)",
    hoverBorder: "border-purple-400/60 shadow-[0_0_35px_rgba(168,85,247,0.18)]",
    glowColor: "rgba(168,85,247,0.25)",
    iconBg: "bg-gradient-to-br from-purple-400/20 to-purple-500/10 border-purple-400/30",
    iconColor: "text-purple-400",
    btnBg: "bg-purple-500 text-white hover:bg-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    btnHover: "group-hover:translate-x-1",
    features: [
      "5 AI Narrator Voices (Edge TTS)",
      "Cinematic Ambient Music Mixing",
      "Pitch, Speed & Emotion Controls",
      "Content ID & Copyright Protection",
      "Automatic High-Climax Scene Slicing"
    ],
  },
  {
    id: "saved-vault",
    icon: FolderOpen,
    title: "Saved Clips Vault",
    badge: "💾 Windows Explorer Sync",
    badgeColor: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    subtitle: "Manage, organize, duplicate, and export your generated viral clips. Nested folder hierarchy directly synced with your Windows desktop directory.",
    gradient: "linear-gradient(180deg, rgba(16,185,129,0.08) 0%, rgba(20,20,20,0.85) 100%)",
    hoverBorder: "border-emerald-400/60 shadow-[0_0_35px_rgba(16,185,129,0.18)]",
    glowColor: "rgba(16,185,129,0.25)",
    iconBg: "bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 border-emerald-400/30",
    iconColor: "text-emerald-400",
    btnBg: "bg-emerald-400 text-black hover:bg-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    btnHover: "group-hover:translate-x-1",
    features: [
      "Real-time Windows File Explorer Mirror",
      "True Drag & Drop Folder Organization",
      "Native Drag-Out to Premiere / CapCut",
      "One-Click Duplicate & Locked File Purge",
      "Instant Video Preview & Metadata Viewer"
    ],
  },
];

export function ProjectSelectorScreen({ onBack, onSelect }: Props) {
  const [hovered, setHovered] = useState<Mode | null>(null);
  const [engineOnline, setEngineOnline] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => res.json())
      .then((data) => setEngineOnline(data.status === "ok"))
      .catch(() => setEngineOnline(false));
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif] bg-[#060608] text-white relative select-none">
      {/* Dynamic Animated Ambient Studio Background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Animated Radial Gradients */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-emerald-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl opacity-70 animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute -bottom-[20%] left-1/4 w-[600px] h-[400px] bg-purple-600/10 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDuration: "12s" }} />
        <div className="absolute top-1/3 -right-[10%] w-[500px] h-[400px] bg-amber-500/10 rounded-full blur-3xl opacity-40 animate-pulse" style={{ animationDuration: "10s" }} />
        
        {/* Subtle Cyber Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px"
          }}
        />
      </div>

      {/* Top Application Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#060608]/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-amber-400 to-amber-500 p-0.5 shadow-[0_0_20px_rgba(0,230,118,0.25)] flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0a0c] rounded-[10px] flex items-center justify-center">
              <Film className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">ClipVault Studio</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-amber-300 border border-white/10">
                v2.0 Pro
              </span>
            </div>
            <p className="text-[11px] font-semibold text-gray-400">Desktop AI Video Virality Engine</p>
          </div>
        </div>

        {/* Engine Status Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              {engineOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${engineOnline ? "bg-emerald-400" : "bg-red-400"}`}></span>
            </span>
            <span className="text-gray-300 text-[11px]">
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Hardware Accelerated</span>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 md:px-12 py-8 overflow-y-auto">
        <div className="max-w-6xl w-full flex flex-col items-center">
          
          {/* Hero Welcome Banner */}
          <div className="text-center mb-10 max-w-2xl animate-fadeIn">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-purple-500/10 border border-white/10 mb-4 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
              <span className="text-xs font-bold text-gray-200 tracking-wide">Next-Gen Autonomous Video Suite</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 tracking-tight leading-tight">
              Select Your <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-300 bg-clip-text text-transparent">Production Workflow</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium">
              Create high-retention viral shorts, AI-narrated cinema recaps, and manage your media library with zero PC lag.
            </p>
          </div>

          {/* 3 High-Impact Interactive Workflow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
            {WORKFLOWS.map((w, idx) => {
              const Icon = w.icon;
              const isHovered = hovered === w.id;

              return (
                <div
                  key={w.id}
                  onClick={() => onSelect(w.id)}
                  onMouseEnter={() => setHovered(w.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group relative flex flex-col rounded-3xl p-6 md:p-7 transition-all duration-300 cursor-pointer border backdrop-blur-2xl ${
                    isHovered
                      ? `${w.hoverBorder} -translate-y-2 bg-[#121216]/95`
                      : "border-white/10 hover:border-white/20 bg-[#0d0d10]/90"
                  }`}
                  style={{
                    background: isHovered ? w.gradient : "rgba(13,13,16,0.85)",
                    transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  {/* Glowing Top Corner Badge */}
                  <div className="flex items-center justify-between mb-5">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${w.badgeColor}`}>
                      {w.badge}
                    </span>
                    <span className="text-[11px] font-bold text-gray-500 group-hover:text-white transition-colors">
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Animated Glowing Icon */}
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-1 ${w.iconBg}`}>
                    <Icon className={`w-7 h-7 ${w.iconColor}`} />
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-xl font-black text-white mb-2 group-hover:text-amber-300 transition-colors">
                    {w.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
                    {w.subtitle}
                  </p>

                  {/* Feature Checkpoints */}
                  <div className="space-y-2.5 mb-7 mt-auto">
                    {w.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${w.iconColor}`} />
                        <span className="text-gray-300 font-medium text-[11px]">{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Launch Action Button */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                      Launch Studio
                    </span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${w.btnBg}`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Hardware & Architecture Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 md:gap-6 text-xs text-gray-400 font-semibold animate-fadeIn">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>0% PC Lag (Idle Priority Engine)</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Intel QSV / NVENC / AMF</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>SIL OFL Viral Fonts</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Smart Stream Slicing (yt-dlp)</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

