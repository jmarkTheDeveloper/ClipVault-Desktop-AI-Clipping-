import React, { useState, useEffect } from "react";
import { Check, ChevronRight, Zap, Film, FolderOpen, Cpu, HardDrive, Layers } from "lucide-react";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
}

// ── CUSTOM VECTOR BRAND LOGO ──────────────────────────────────────────────────
function Logo({ size = 30 }: { size?: number }) {
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
  badge: string;
  icon: React.ComponentType<{ style?: React.CSSProperties; className?: string }>;
  title: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  glowColor: string;
  desc: string;
  features: string[];
  btnText: string;
}

const WORKFLOWS: WorkflowCardData[] = [
  {
    id: "ai-clipper",
    num: "01",
    badge: "Viral Short-Form Engine",
    icon: Zap,
    title: "AI Video Clipper",
    accent: "#fbbf24",
    accentBg: "rgba(251,191,36,0.08)",
    accentBorder: "rgba(251,191,36,0.25)",
    glowColor: "rgba(251,191,36,0.35)",
    desc: "Paste YouTube links or import local media. AI detects high-retention viral hooks, tracks speaker faces, and crafts 9:16 Shorts with dynamic subtitles.",
    features: [
      "Active Speaker Face Tracking (9:16)",
      "CapCut Word-by-Word Subtitles & SFX",
      "Satisfying Gameplay & ASMR Split",
      "Smart Stream Slicing (yt-dlp)",
      "Whisper AI Multi-Language Auto-Sync",
    ],
    btnText: "Launch Studio",
  },
  {
    id: "movie-recapper",
    num: "02",
    badge: "AI Narrator Engine",
    icon: Film,
    title: "Movie Recapper",
    accent: "#c084fc",
    accentBg: "rgba(192,132,252,0.08)",
    accentBorder: "rgba(192,132,252,0.25)",
    glowColor: "rgba(192,132,252,0.35)",
    desc: "Transform full-length movies, trailers, and series into suspenseful recap shorts with AI narrator voices and cinematic background soundtracks.",
    features: [
      "5 AI Narrator Voices (Edge TTS)",
      "Cinematic Ambient Music Mixing",
      "Pitch, Speed & Emotion Controls",
      "Content ID & Copyright Protection",
      "Automatic High-Climax Scene Slicing",
    ],
    btnText: "Launch Recapper",
  },
  {
    id: "saved-vault",
    num: "03",
    badge: "Windows Explorer Sync",
    icon: FolderOpen,
    title: "Saved Clips Vault",
    accent: "#00e676",
    accentBg: "rgba(0,230,118,0.08)",
    accentBorder: "rgba(0,230,118,0.25)",
    glowColor: "rgba(0,230,118,0.35)",
    desc: "Manage, organize, duplicate, and export your generated viral clips. Nested folder hierarchy directly synced with your Windows desktop directory.",
    features: [
      "Real-time Windows File Explorer Mirror",
      "True Drag & Drop Folder Organization",
      "Native Drag-Out to Premiere / CapCut",
      "One-Click Duplicate & Locked File Purge",
      "Instant Video Preview & Metadata Viewer",
    ],
    btnText: "Open Saved Vault",
  },
];

const DOTS = [
  { s: 3, t: "14%", l: "10%", delay: 0, dur: 5 },
  { s: 2, t: "68%", l: "6%", delay: 1.2, dur: 4 },
  { s: 4, t: "18%", l: "88%", delay: 0.5, dur: 6 },
  { s: 2, t: "78%", l: "92%", delay: 2, dur: 4.5 },
  { s: 3, t: "46%", l: "4%", delay: 0.8, dur: 5.5 },
  { s: 2, t: "35%", l: "96%", delay: 1.5, dur: 3.8 },
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

        @keyframes wfOrbitCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes wfOrbitCCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes wfScanDown {
          0%   { top: -2px; opacity: 0; }
          8%   { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes wfAmbient {
          0%, 100% { opacity: 0.06; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.12; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes wfFloatDot {
          0%, 100% { transform: translateY(0); opacity: 0.2; }
          50%       { transform: translateY(-10px); opacity: 0.6; }
        }
      `}</style>

      {/* ── Top Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          height: 52,
          background: "rgba(5,5,5,0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
          position: "relative",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={28} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "-0.03em", color: "#fff" }}>
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
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
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
            <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.2)",
              color: "#fbbf24",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            ⚡ Hardware Accelerated
          </div>
        </div>
      </header>

      {/* ── Main Production Workflow Screen (Engineered to 100% Fit Viewport) ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 28px 14px",
          position: "relative",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        {/* Ambient radial glow backdrop */}
        <div
          style={{
            position: "absolute",
            width: 750,
            height: 750,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,230,118,0.05) 0%, rgba(251,191,36,0.02) 45%, transparent 70%)",
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

        {/* Hero Header Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ height: 1, width: 22, background: "rgba(0,230,118,0.4)" }} />
            <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(0,230,118,0.6)" }}>
              PRODUCTION WORKFLOW
            </span>
            <div style={{ height: 1, width: 22, background: "rgba(0,230,118,0.4)" }} />
          </div>

          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              textAlign: "center",
              fontSize: "clamp(24px, 2.5vw, 36px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: "0 0 6px",
            }}
          >
            <span style={{ color: "#fff" }}>Select Your </span>
            <span style={{ color: "#fbbf24" }}>Production</span>{" "}
            <span style={{ color: "#00e676" }}>Workflow</span>
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: 12,
              lineHeight: 1.5,
              maxWidth: 620,
              margin: 0,
              fontWeight: 500,
            }}
          >
            Create high-retention viral shorts, AI-narrated cinema recaps, and manage your media library with zero PC lag.
          </p>
        </div>

        {/* ── 3 Widescreen Cards Grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 18,
            width: "100%",
            maxWidth: 1220,
            zIndex: 10,
            flex: 1,
            minHeight: 0,
            margin: "12px 0",
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
                  background: isHovered ? "#0f0f13" : "#09090b",
                  borderRadius: 18,
                  padding: "20px 22px",
                  border: `1px solid ${isHovered ? w.accentBorder : "rgba(255,255,255,0.06)"}`,
                  boxShadow: isHovered
                    ? `0 0 35px ${w.glowColor}, 0 0 0 1px ${w.accent}`
                    : "0 4px 20px rgba(0,0,0,0.5)",
                  transform: isHovered ? "translateY(-3px)" : "none",
                  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Sweeping Laser Scanline */}
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
                    opacity: isHovered ? 1 : 0.35,
                  }}
                />

                {/* Top Badge & Number Row */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3.5px 9px",
                        borderRadius: 999,
                        background: w.accentBg,
                        border: `1px solid ${w.accentBorder}`,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: w.accent }}>
                        {w.badge}
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        color: isHovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)",
                        transition: "color 0.2s",
                      }}
                    >
                      {w.num}
                    </span>
                  </div>

                  {/* Animated Orbital Icon */}
                  <div style={{ position: "relative", width: 54, height: 54, marginBottom: 14 }}>
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
                          width: 4,
                          height: 4,
                          borderRadius: "50%",
                          top: -2,
                          left: "50%",
                          marginLeft: -2,
                          background: w.accent,
                          boxShadow: `0 0 5px ${w.accent}`,
                        }}
                      />
                    </div>

                    {/* Inner orbit ring */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 8,
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
                          width: 2.5,
                          height: 2.5,
                          borderRadius: "50%",
                          bottom: -1.25,
                          left: "50%",
                          marginLeft: -1.25,
                          background: w.accent,
                        }}
                      />
                    </div>

                    {/* Icon Tile */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 12,
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: w.accentBg,
                        border: `1px solid ${w.accentBorder}`,
                      }}
                    >
                      <Icon style={{ width: 16, height: 16, color: w.accent }} />
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h2
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 900,
                      fontSize: 18,
                      letterSpacing: "-0.03em",
                      color: "#fff",
                      margin: "0 0 5px",
                    }}
                  >
                    {w.title}
                  </h2>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: 11,
                      lineHeight: 1.5,
                      margin: "0 0 12px",
                      fontWeight: 400,
                    }}
                  >
                    {w.desc}
                  </p>

                  {/* Feature Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {w.features.map((feat) => (
                      <div key={feat} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: w.accentBg,
                            border: `1px solid ${w.accentBorder}`,
                          }}
                        >
                          <Check style={{ width: 8, height: 8, color: w.accent }} />
                        </div>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Launch Button */}
                <div style={{ paddingTop: 12, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 12,
                      color: "#000",
                      background: w.accent,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'Outfit', sans-serif",
                      letterSpacing: "-0.01em",
                      boxShadow: isHovered ? `0 0 20px ${w.glowColor}` : "none",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <span>{w.btnText}</span>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(0,0,0,0.18)",
                      }}
                    >
                      <ChevronRight style={{ width: 13, height: 13 }} />
                    </div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Hardware Telemetry Bar ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Zap style={{ width: 11, height: 11, color: "#fbbf24" }} />
            <span>0% PC Lag (Idle Priority Engine)</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Cpu style={{ width: 11, height: 11, color: "#00e676" }} />
            <span>Intel QSV / NVENC / AMF</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <Layers style={{ width: 11, height: 11, color: "#c084fc" }} />
            <span>SIL OFL Viral Fonts</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.38)",
              fontSize: 10.5,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <HardDrive style={{ width: 11, height: 11, color: "#38bdf8" }} />
            <span>Smart Stream Slicing (yt-dlp)</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProjectSelectorScreen;




