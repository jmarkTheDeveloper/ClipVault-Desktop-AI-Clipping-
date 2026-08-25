import React, { useState, useEffect } from "react";
import { Check, ChevronRight, Zap, Film, FolderOpen } from "lucide-react";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
}

// ── ACCENT ───────────────────────────────────────────────────────────────────
const G = "#00e676";

// ── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size = 36 }: { size?: number }) {
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

const WORKFLOW_PRESETS: Record<
  Mode,
  {
    num: string;
    badge: string;
    icon: React.ComponentType<{ style?: React.CSSProperties }>;
    title: string;
    desc: string;
    features: string[];
    btnText: string;
  }
> = {
  "ai-clipper": {
    num: "01",
    badge: "Viral Short-Form Engine",
    icon: Zap,
    title: "AI Video Clipper",
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
  "movie-recapper": {
    num: "02",
    badge: "AI Narrator Engine",
    icon: Film,
    title: "Movie Recapper",
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
  "saved-vault": {
    num: "03",
    badge: "Windows Explorer Sync",
    icon: FolderOpen,
    title: "Saved Clips Vault",
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
};

// ── WORKFLOW SCREEN ───────────────────────────────────────────────────────────
export function ProjectSelectorScreen({
  onBack = () => {},
  onSelect,
}: Props) {
  const [activeWorkflow, setActiveWorkflow] = useState<Mode>("ai-clipper");
  const [engineOnline, setEngineOnline] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => res.json())
      .then((data) => setEngineOnline(data.status === "ok"))
      .catch(() => setEngineOnline(false));
  }, []);

  const dots = [
    { s: 3, t: "16%", l: "12%", delay: 0, dur: 5 },
    { s: 2, t: "70%", l: "8%", delay: 1.2, dur: 4 },
    { s: 4, t: "22%", l: "83%", delay: 0.5, dur: 6 },
    { s: 2, t: "74%", l: "87%", delay: 2, dur: 4.5 },
    { s: 3, t: "50%", l: "3%", delay: 0.8, dur: 5.5 },
    { s: 2, t: "36%", l: "93%", delay: 1.5, dur: 3.8 },
  ];

  const current = WORKFLOW_PRESETS[activeWorkflow];
  const CurrentIcon = current.icon;

  const handleLaunch = () => {
    onSelect(activeWorkflow);
  };

  const handleSkip = () => {
    if (onBack) onBack();
    else onSelect("ai-clipper");
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-y-auto select-none"
      style={{ background: "#050505", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes wfGlowPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(0,230,118,0.07), 0 0 0 1px rgba(0,230,118,0.14); }
          50%       { box-shadow: 0 0 90px rgba(0,230,118,0.17), 0 0 0 1px rgba(0,230,118,0.34); }
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
          0%, 100% { box-shadow: 0 0 10px rgba(0,230,118,0.08); }
          50%       { box-shadow: 0 0 28px rgba(0,230,118,0.28); }
        }
        @keyframes wfScanDown {
          0%   { top: -1px; opacity: 0; }
          6%   { opacity: 1; }
          92%  { opacity: 0.5; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes wfAmbient {
          0%, 100% { opacity: 0.07; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.14; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes wfFeatIn {
          from { opacity: 0; transform: translateX(-7px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wfFloatDot {
          0%, 100% { transform: translateY(0);    opacity: 0.25; }
          50%       { transform: translateY(-12px); opacity: 0.65; }
        }
      `}</style>

      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          height: 56,
          background: "rgba(5,5,5,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={26} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: G }}>Vault</span>
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              background: "rgba(0,230,118,0.08)",
              color: G,
              border: "1px solid rgba(0,230,118,0.18)",
            }}
          >
            V2.0 PRO
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: engineOnline ? G : "#ef4444",
                boxShadow: engineOnline ? `0 0 8px ${G}` : "0 0 8px #ef4444",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.055)",
              color: "rgba(255,255,255,0.28)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
            }}
          >
            ⚡ Hardware Accelerated
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            width: 680,
            height: 680,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,230,118,0.055) 0%, transparent 62%)",
            top: "50%",
            left: "50%",
            pointerEvents: "none",
            animationName: "wfAmbient",
            animationDuration: "5s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        />

        {/* Floating micro-dots */}
        {dots.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: p.s,
              height: p.s,
              top: p.t,
              left: p.l,
              borderRadius: "50%",
              background: G,
              pointerEvents: "none",
              animationName: "wfFloatDot",
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
            }}
          />
        ))}

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ height: 1, width: 24, background: "rgba(0,230,118,0.3)" }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(0,230,118,0.45)" }}>
            Production Workflow
          </span>
          <div style={{ height: 1, width: 24, background: "rgba(0,230,118,0.3)" }} />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            textAlign: "center",
            fontSize: "clamp(32px, 4.5vw, 54px)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            margin: "0 0 16px",
          }}
        >
          <span style={{ color: "#fff" }}>Select Your Production</span>
          <br />
          <span style={{ color: G }}>Workflow</span>
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.22)",
            fontSize: 14,
            lineHeight: 1.75,
            maxWidth: 440,
            margin: "0 0 32px",
          }}
        >
          Paste a YouTube link or import local footage. AI detects viral hooks, tracks speaker faces, and auto-exports 9:16 Shorts.
        </p>

        {/* Workflow Switcher Pills (Optional Quick Tabs) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, zIndex: 10 }}>
          {(["ai-clipper", "movie-recapper", "saved-vault"] as Mode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveWorkflow(mode)}
              style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
                border: activeWorkflow === mode ? `1px solid rgba(0,230,118,0.4)` : "1px solid rgba(255,255,255,0.06)",
                background: activeWorkflow === mode ? "rgba(0,230,118,0.12)" : "rgba(255,255,255,0.02)",
                color: activeWorkflow === mode ? G : "rgba(255,255,255,0.35)",
              }}
            >
              {mode === "ai-clipper" && "⚡ AI Video Clipper"}
              {mode === "movie-recapper" && "🍿 Movie Recapper"}
              {mode === "saved-vault" && "💾 Saved Vault"}
            </button>
          ))}
        </div>

        {/* ── Card ── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            width: "min(500px, 100%)",
            background: "#0b0b0b",
            borderRadius: 20,
            padding: "36px 40px",
            animationName: "wfGlowPulse",
            animationDuration: "3.2s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
          }}
        >
          {/* Scan line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 1,
              pointerEvents: "none",
              background: "linear-gradient(90deg, transparent 0%, rgba(0,230,118,0.45) 25%, rgba(0,230,118,0.85) 50%, rgba(0,230,118,0.45) 75%, transparent 100%)",
              animationName: "wfScanDown",
              animationDuration: "3.5s",
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
            }}
          />

          {/* Top row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(0,230,118,0.07)",
                border: "1px solid rgba(0,230,118,0.18)",
              }}
            >
              <CurrentIcon style={{ width: 12, height: 12, color: G }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: G }}>{current.badge}</span>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 30,
                fontWeight: 700,
                color: "rgba(255,255,255,0.04)",
                letterSpacing: "-0.05em",
                lineHeight: 1,
              }}
            >
              {current.num}
            </span>
          </div>

          {/* Animated icon */}
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 32 }}>
            {/* Outer orbit ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px dashed rgba(0,230,118,0.14)",
                animationName: "wfOrbitCW",
                animationDuration: "9s",
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  top: -2.5,
                  left: "50%",
                  marginLeft: -2.5,
                  background: G,
                  boxShadow: `0 0 7px ${G}`,
                }}
              />
            </div>
            {/* Inner orbit ring */}
            <div
              style={{
                position: "absolute",
                inset: 14,
                borderRadius: "50%",
                border: "1px dashed rgba(0,230,118,0.08)",
                animationName: "wfOrbitCCW",
                animationDuration: "4.5s",
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
                  background: "rgba(0,230,118,0.55)",
                }}
              />
            </div>
            {/* Icon tile */}
            <div
              style={{
                position: "absolute",
                inset: 24,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,230,118,0.07)",
                border: "1px solid rgba(0,230,118,0.24)",
                animationName: "wfIconGlow",
                animationDuration: "2.2s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }}
            >
              <CurrentIcon style={{ width: 18, height: 18, color: G }} />
            </div>
          </div>

          {/* Title + description */}
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: 26,
              letterSpacing: "-0.03em",
              color: "#fff",
              margin: "0 0 8px",
            }}
          >
            {current.title}
          </h2>
          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 13.5, lineHeight: 1.7, margin: "0 0 32px" }}>
            {current.desc}
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {current.features.map((feat, i) => (
              <div
                key={feat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  animationName: "wfFeatIn",
                  animationDuration: "0.45s",
                  animationFillMode: "both",
                  animationDelay: `${i * 0.07}s`,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,230,118,0.09)",
                    border: "1px solid rgba(0,230,118,0.22)",
                  }}
                >
                  <Check style={{ width: 9, height: 9, color: G }} />
                </div>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.42)" }}>{feat}</span>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.04)", marginBottom: 24 }} />

          {/* Launch button */}
          <button
            onClick={handleLaunch}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              color: "#000",
              background: G,
              border: "none",
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.01em",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 40px rgba(0,230,118,0.5)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span>{current.btnText}</span>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.18)",
              }}
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </div>
          </button>
        </div>

        {/* Skip link */}
        <button
          onClick={handleSkip}
          style={{
            marginTop: 32,
            fontSize: 13,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.17)",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.17)";
          }}
        >
          Skip — go to home dashboard →
        </button>
      </main>
    </div>
  );
}

export default ProjectSelectorScreen;



