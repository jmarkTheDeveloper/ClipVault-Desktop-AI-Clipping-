
import { ArrowLeft, Music, Sparkles } from "lucide-react";
import { G } from "../utils/types";

interface Props { onBack: () => void; }

const ACCENT = "#ec4899";

const UPCOMING_FEATURES = [
  "Beat-synced lyric animations with word-by-word highlighting",
  "16 animated caption styles matching your music genre",
  "YouTube audio strip + lyric auto-fetch via API",
  "Dynamic background footage library (abstract, city, nature)",
  "Export as 9:16 Short or 16:9 music video",
  "Verse / chorus / bridge auto-segmentation",
  "Custom font upload and kerning controls",
  "AI-suggested color palette based on song mood",
];

export function LyricCreatorScreen({ onBack }: Props) {
  return (
    <div className="h-screen w-screen flex flex-col font-['Inter',sans-serif] overflow-hidden" style={{ background: "#050505" }}>
      <div className="pointer-events-none fixed inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 50% at 50% 0%, rgba(236,72,153,0.07) 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center gap-4 px-8 h-16 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(5,5,5,0.9)", backdropFilter: "blur(20px)" }}>
        <button onClick={onBack} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: "#5a5a5a" }}>
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ec4899, #be185d)" }}>
            <Music className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold">Lyric Creator</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(236,72,153,0.1)", color: ACCENT, border: "1px solid rgba(236,72,153,0.2)" }}>🎵 Coming Soon</span>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 overflow-auto">
        <div className="max-w-lg w-full text-center">
          {/* Animated icon */}
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 relative" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(190,24,93,0.08))", border: "1px solid rgba(236,72,153,0.2)" }}>
            <Music className="w-10 h-10" style={{ color: ACCENT }} />
            <div className="absolute inset-0 rounded-3xl animate-pulse" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)" }} />
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: ACCENT }}>In Development</p>
          <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Lyric Creator</h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: "#555" }}>
            We're building a powerful beat-synced lyric video creator.<br />
            Sync song lyrics over dynamic background footage with animated word-by-word highlights — export-ready for TikTok, Reels & YouTube.
          </p>

          {/* Feature preview */}
          <div className="rounded-2xl p-6 text-left space-y-3" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.12)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: ACCENT }}>Upcoming Features</span>
            </div>
            {UPCOMING_FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: ACCENT }} />
                <span className="text-xs leading-relaxed" style={{ color: "#666" }}>{f}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs" style={{ color: "#333" }}>
            Use <span style={{ color: G }}>General Editor</span> or <span style={{ color: "#fbbf24" }}>AI Clipper</span> in the meantime for your lyric video needs.
          </p>
        </div>
      </div>
    </div>
  );
}
