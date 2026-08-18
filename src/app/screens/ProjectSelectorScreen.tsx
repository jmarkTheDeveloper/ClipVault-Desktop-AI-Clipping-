
import React, { useState } from "react";
import { ArrowLeft, Zap, Film, Music, Pencil } from "lucide-react";
import { G } from "../utils/types";

type Mode = "ai-clipper" | "movie-recapper";

interface Props {
  onBack: () => void;
  onSelect: (mode: Mode) => void;
}

const MODES: { id: Mode; icon: typeof Zap; title: string; subtitle: string; badge?: string; gradient: string; glow: string; features: string[] }[] = [
  {
    id: "ai-clipper",
    icon: Zap,
    title: "AI Video Clipper",
    subtitle: "Paste a YouTube link and let AI auto-detect viral highlights. Exports as 9:16 Shorts with captions.",
    badge: "🚀 Viral Engine",
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(220,100,0,0.05) 100%)",
    glow: "rgba(251,191,36,0.2)",
    features: ["YouTube download (720p / 1080p)", "5 layout styles", "16 caption styles", "Auto-detect highlights"],
  },
  {
    id: "movie-recapper",
    icon: Film,
    title: "Movie Recapper",
    subtitle: "Transform movie scenes into AI-narrated recap videos with cinematic voiceovers and ambient music.",
    badge: "🍿 AI Narrated",
    gradient: "linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(60,20,120,0.05) 100%)",
    glow: "rgba(139,92,246,0.2)",
    features: ["5 AI narrator voices", "4 pitch & speed options", "Ambient background music", "Copyright bypass mode"],
  }
];

export function ProjectSelectorScreen({ onBack, onSelect }: Props) {
  const [hovered, setHovered] = useState<Mode | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col font-['Inter',sans-serif]" style={{ background: "#050505" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,230,118,0.07) 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 px-8 pt-7 h-20 pr-36 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00e676, #00a854)" }}>
            <Film className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold tracking-tight">ClipVault</span>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-auto">
        <div className="max-w-5xl w-full">
          {/* Title */}
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: G }}>New Project</p>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Choose your workflow</h1>
            <p className="text-sm" style={{ color: "#5a5a5a" }}>Select the mode that best fits what you want to create</p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isHovered = hovered === m.id;
              const isComingSoon = m.id === "lyric-creator";
              return (
                <button
                  key={m.id}
                  onClick={() => !isComingSoon && onSelect(m.id)}
                  onMouseEnter={() => setHovered(m.id)}
                  onMouseLeave={() => setHovered(null)}
                  disabled={isComingSoon}
                  className="relative flex flex-col text-left rounded-2xl p-5 transition-all duration-300 outline-none"
                  style={{
                    background: isHovered && !isComingSoon ? m.gradient : "rgba(12,12,12,0.9)",
                    border: `1px solid ${isHovered && !isComingSoon ? `rgba(255,255,255,0.12)` : "rgba(255,255,255,0.05)"}`,
                    boxShadow: isHovered && !isComingSoon ? `0 0 40px ${m.glow}` : "none",
                    transform: isHovered && !isComingSoon ? "translateY(-3px)" : "none",
                    opacity: isComingSoon ? 0.6 : 1,
                    cursor: isComingSoon ? "not-allowed" : "pointer",
                  }}
                >
                  {/* Badge */}
                  {m.badge && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#888", border: "1px solid rgba(255,255,255,0.08)" }}>
                      {m.badge}
                    </span>
                  )}

                  {/* Icon */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 flex-shrink-0 transition-all duration-300"
                    style={{ background: isHovered && !isComingSoon ? m.gradient : "rgba(255,255,255,0.04)", border: `1px solid ${isHovered && !isComingSoon ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}` }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Title & subtitle */}
                  <h3 className="text-white font-bold text-sm mb-2">{m.title}</h3>
                  <p className="text-[11px] leading-relaxed mb-4" style={{ color: "#666" }}>{m.subtitle}</p>

                  {/* Feature list */}
                  <ul className="space-y-1.5 mt-auto">
                    {m.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: G }} />
                        <span className="text-[10px]" style={{ color: "#555" }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Bottom CTA */}
                  {!isComingSoon && (
                    <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-xs font-semibold transition-colors duration-200" style={{ color: isHovered ? G : "#444" }}>
                        {isHovered ? "Click to open →" : "Select"}
                      </span>
                    </div>
                  )}
                  {isComingSoon && (
                    <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="text-xs font-semibold" style={{ color: "#333" }}>In development</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
