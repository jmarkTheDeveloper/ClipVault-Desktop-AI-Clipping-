import React, { useState, useEffect } from "react";
import { Zap, Film, FolderOpen, Check, ChevronRight, Cpu, HardDrive, Layers, Sparkles } from "lucide-react";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
}

// ── CUSTOM SVG LOGO ──────────────────────────────────────────────────────────
function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="cv-tile" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2cf590" />
          <stop offset="100%" stopColor="#00bf53" />
        </linearGradient>
        <linearGradient id="cv-inner" x1="0" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#20e880" />
          <stop offset="100%" stopColor="#009e44" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#cv-tile)" />
      <rect width="40" height="12" rx="10" fill="rgba(0,0,0,0.06)" />
      <path d="M8.5 10.5 L20 31.5 L31.5 10.5" stroke="rgba(0,0,0,0.18)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 10 L20 31 L31.5 10" stroke="white" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5.5" y="7" width="5.5" height="5" rx="1.5" fill="url(#cv-inner)" />
      <rect x="29" y="7" width="5.5" height="5" rx="1.5" fill="url(#cv-inner)" />
      <rect x="15" y="17.5" width="10" height="7" rx="1.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
    </svg>
  );
}

interface WorkflowCardData {
  id: Mode;
  num: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  badge: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  glowColor: string;
  subtitle: string;
  features: string[];
}

const WORKFLOWS: WorkflowCardData[] = [
  {
    id: "ai-clipper",
    num: "01",
    icon: Zap,
    title: "AI Video Clipper",
    badge: "🔥 Viral Short-Form Engine",
    accent: "#fbbf24",
    accentBg: "rgba(251,191,36,0.08)",
    accentBorder: "rgba(251,191,36,0.22)",
    glowColor: "rgba(251,191,36,0.45)",
    subtitle: "Paste YouTube links or import local media. AI detects high-retention viral hooks, tracks speaker faces, and crafts 9:16 Shorts with dynamic subtitles.",
    features: [
      "Active Speaker Face Tracking (9:16)",
      "CapCut Word-by-Word Subtitles & SFX",
      "Satisfying Gameplay & ASMR Split",
      "Smart Stream Slicing (yt-dlp)",
      "Whisper AI Multi-Language Auto-Sync",
    ],
  },
  {
    id: "movie-recapper",
    num: "02",
    icon: Film,
    title: "Movie Recapper",
    badge: "🍿 AI Narrator Engine",
    accent: "#c084fc",
    accentBg: "rgba(192,132,252,0.08)",
    accentBorder: "rgba(192,132,252,0.22)",
    glowColor: "rgba(192,132,252,0.45)",
    subtitle: "Transform full-length movies, trailers, and series into suspenseful recap shorts with AI narrator voices and cinematic background soundtracks.",
    features: [
      "5 AI Narrator Voices (Edge TTS)",
      "Cinematic Ambient Music Mixing",
      "Pitch, Speed & Emotion Controls",
      "Content ID & Copyright Protection",
      "Automatic High-Climax Scene Slicing",
    ],
  },
  {
    id: "saved-vault",
    num: "03",
    icon: FolderOpen,
    title: "Saved Clips Vault",
    badge: "💾 Windows Explorer Sync",
    accent: "#00e676",
    accentBg: "rgba(0,230,118,0.08)",
    accentBorder: "rgba(0,230,118,0.22)",
    glowColor: "rgba(0,230,118,0.45)",
    subtitle: "Manage, organize, duplicate, and export your generated viral clips. Nested folder hierarchy directly synced with your Windows desktop directory.",
    features: [
      "Real-time Windows File Explorer Mirror",
      "True Drag & Drop Folder Organization",
      "Native Drag-Out to Premiere / CapCut",
      "One-Click Duplicate & Locked File Purge",
      "Instant Video Preview & Metadata Viewer",
    ],
  },
];

const DOTS = [
  { s: 3, t: "12%", l: "8%", delay: 0, dur: 5 },
  { s: 2, t: "75%", l: "6%", delay: 1.2, dur: 4 },
  { s: 4, t: "18%", l: "88%", delay: 0.5, dur: 6 },
  { s: 2, t: "82%", l: "92%", delay: 2, dur: 4.5 },
  { s: 3, t: "48%", l: "3%", delay: 0.8, dur: 5.5 },
  { s: 2, t: "32%", l: "95%", delay: 1.5, dur: 3.8 },
  { s: 3, t: "88%", l: "45%", delay: 2.2, dur: 5 },
  { s: 2, t: "8%", l: "52%", delay: 1.8, dur: 4.2 },
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
    <div
      className="h-screen w-screen flex flex-col overflow-hidden select-none relative"
      style={{
        background: "#050505",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes wfGlowPulse {
          0%, 100% { box-shadow: 0 0 35px rgba(255,255,255,0.03), 0 0 0 1px rgba(255,255,255,0.06); }
          50%       { box-shadow: 0 0 70px var(--card-glow), 0 0 0 1px var(--card-border); }
        }
        @keyframes wfOrbitCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes wfOrbitCCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes wfIconGlow {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.05); }
        }
        @keyframes wfScanDown {
          0%   { top: -2px; opacity: 0; }
          8%   { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes wfAmbient {
          0%, 100% { opacity: 0.08; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.16; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes wfFloatDot {
          0%, 100% { transform: translateY(0); opacity: 0.25; }
          50%       { transform: translateY(-14px); opacity: 0.75; }
        }
      `}</style>

      {/* ── Top Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          height: 60,
          background: "rgba(5,5,5,0.96)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={28} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 19, letterSpacing: "-0.03em", color: "#fff" }}>
                Clip<span style={{ color: "#00e676" }}>Vault</span> Studio
              </span>
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 6,
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  background: "rgba(0,230,118,0.08)",
                  color: "#00e676",
                  border: "1px solid rgba(0,230,118,0.2)",
                  textTransform: "uppercase",
                }}
              >
                V2.0 PRO
              </span>
            </div>
            <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", margin: 0, fontWeight: 500 }}>
              Desktop AI Video Virality Engine
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: engineOnline ? "#00e676" : "#ef4444",
                boxShadow: engineOnline ? "0 0 8px #00e676" : "0 0 8px #ef4444",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5 }}>
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              color: "#fbbf24",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10.5,
              fontWeight: 700,
            }}
          >
            ⚡ Hardware Accelerated
          </div>
        </div>
      </header>

      {/* ── Main Production Workflow Screen ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 32px",
          position: "relative",
          overflowY: "auto",
        }}
      >
        {/* Ambient radial glow backdrop */}
        <div
          style={{
            position: "absolute",
            width: 780,
            height: 780,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,230,118,0.06) 0%, rgba(251,191,36,0.03) 40%, transparent 70%)",
            top: "45%",
            left: "50%",
            pointerEvents: "none",
            animationName: "wfAmbient",
            animationDuration: "6s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        />

        {/* Floating micro-dots */}
        {DOTS.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: p.s,
              height: p.s,
              top: p.t,
              left: p.l,
              borderRadius: "50%",
              background: i % 2 === 0 ? "#00e676" : "#fbbf24",
              pointerEvents: "none",
              animationName: "wfFloatDot",
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
            }}
          />
        ))}

        {/* Section Pill Label */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ height: 1, width: 28, background: "rgba(0,230,118,0.4)" }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(0,230,118,0.6)" }}>
            PRODUCTION WORKFLOW
          </span>
          <div style={{ height: 1, width: 28, background: "rgba(0,230,118,0.4)" }} />
        </div>

        {/* Hero Title */}
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            textAlign: "center",
            fontSize: "clamp(30px, 3.8vw, 48px)",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            margin: "0 0 10px",
          }}
        >
          <span style={{ color: "#fff" }}>Select Your </span>
          <span style={{ color: "#fbbf24" }}>Production</span>
          <br />
          <span style={{ color: "#00e676" }}>Workflow</span>
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.35)",
            fontSize: 13.5,
            lineHeight: 1.6,
            maxWidth: 580,
            margin: "0 0 32px",
            fontWeight: 500,
          }}
        >
          Create high-retention viral shorts, AI-narrated cinema recaps, and manage your media library with zero PC lag.
        </p>

        {/* ── 3 Interactive Cards Grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 20,
            width: "100%",
            maxWidth: 1100,
            zIndex: 10,
          }}
        >
          {WORKFLOWS.map((w) => {
            const Icon = w.icon;
            const isHovered = hovered === w.id;

            return (
              <div
                key={w.id}
                onClick={() => onSelect(w.id)}
                onMouseEnter={() => setHovered(w.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  background: isHovered ? "#0f0f13" : "#0a0a0d",
                  borderRadius: 22,
                  padding: "28px 28px 24px",
                  border: `1px solid ${isHovered ? w.accentBorder : "rgba(255,255,255,0.06)"}`,
                  boxShadow: isHovered
                    ? `0 0 40px ${w.glowColor}, 0 0 0 1px ${w.accent}`
                    : "0 0 20px rgba(0,0,0,0.5)",
                  transform: isHovered ? "translateY(-4px)" : "none",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Sweeping Laser Scan Line */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: 1,
                    pointerEvents: "none",
                    background: `linear-gradient(90deg, transparent 0%, ${w.accent} 50%, transparent 100%)`,
                    animationName: "wfScanDown",
                    animationDuration: "3.2s",
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                    opacity: isHovered ? 1 : 0.4,
                  }}
                />

                {/* Top Badge & Number Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: w.accentBg,
                      border: `1px solid ${w.accentBorder}`,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: w.accent }}>
                      {w.badge}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 22,
                      fontWeight: 700,
                      color: isHovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
                      transition: "color 0.2s",
                    }}
                  >
                    {w.num}
                  </span>
                </div>

                {/* Animated Orbital Icon Tile */}
                <div style={{ position: "relative", width: 68, height: 68, marginBottom: 20 }}>
                  {/* Outer orbit ring */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: `1px dashed ${w.accentBorder}`,
                      animationName: "wfOrbitCW",
                      animationDuration: "8s",
                      animationTimingFunction: "linear",
                      animationIterationCount: "infinite",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        width: 4.5,
                        height: 4.5,
                        borderRadius: "50%",
                        top: -2.25,
                        left: "50%",
                        marginLeft: -2.25,
                        background: w.accent,
                        boxShadow: `0 0 6px ${w.accent}`,
                      }}
                    />
                  </div>

                  {/* Inner orbit ring */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 10,
                      borderRadius: "50%",
                      border: `1px dashed rgba(255,255,255,0.08)`,
                      animationName: "wfOrbitCCW",
                      animationDuration: "4s",
                      animationTimingFunction: "linear",
                      animationIterationCount: "infinite",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        bottom: -1.5,
                        left: "50%",
                        marginLeft: -1.5,
                        background: w.accent,
                      }}
                    />
                  </div>

                  {/* Icon Tile */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 16,
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: w.accentBg,
                      border: `1px solid ${w.accentBorder}`,
                      animationName: isHovered ? "wfIconGlow" : "none",
                      animationDuration: "2s",
                      animationTimingFunction: "ease-in-out",
                      animationIterationCount: "infinite",
                    }}
                  >
                    <Icon style={{ width: 18, height: 18, color: w.accent }} />
                  </div>
                </div>

                {/* Title + Subtitle */}
                <h2
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 900,
                    fontSize: 21,
                    letterSpacing: "-0.03em",
                    color: "#fff",
                    margin: "0 0 8px",
                  }}
                >
                  {w.title}
                </h2>
                <p
                  style={{
                    color: "rgba(255,255,255,0.38)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    margin: "0 0 20px",
                    fontWeight: 400,
                    minHeight: 56,
                  }}
                >
                  {w.subtitle}
                </p>

                {/* Feature Checklist */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24, marginTop: "auto" }}>
                  {w.features.map((feat) => (
                    <div key={feat} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div
                        style={{
                          width: 15,
                          height: 15,
                          borderRadius: "50%",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: w.accentBg,
                          border: `1px solid ${w.accentBorder}`,
                        }}
                      >
                        <Check style={{ width: 8.5, height: 8.5, color: w.accent }} />
                      </div>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 18 }} />

                {/* Launch Studio Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(w.id);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#000",
                    background: w.accent,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Outfit', sans-serif",
                    letterSpacing: "-0.01em",
                    boxShadow: isHovered ? `0 0 25px ${w.glowColor}` : "none",
                    transform: isHovered ? "translateY(-1px)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>Launch Studio</span>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <ChevronRight style={{ width: 14, height: 14 }} />
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Hardware & Architecture Badges ── */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Zap style={{ width: 12, height: 12, color: "#fbbf24" }} />
            <span>0% PC Lag (Idle Priority Engine)</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Cpu style={{ width: 12, height: 12, color: "#00e676" }} />
            <span>Intel QSV / NVENC / AMF</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Layers style={{ width: 12, height: 12, color: "#c084fc" }} />
            <span>SIL OFL Viral Fonts</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <HardDrive style={{ width: 12, height: 12, color: "#38bdf8" }} />
            <span>Smart Stream Slicing (yt-dlp)</span>
          </div>
        </div>
      </main>
    </div>
  );
}


