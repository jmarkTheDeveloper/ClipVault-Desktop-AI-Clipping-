import React, { useState, useEffect } from "react";
import { Check, ChevronRight, Zap } from "lucide-react";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
}

// ── ACCENT ───────────────────────────────────────────────────────────────────
const G = "#00e676";

// ── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size = 26 }: { size?: number }) {
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

// ── WORKFLOW SCREEN ───────────────────────────────────────────────────────────
export function ProjectSelectorScreen({
  onBack = () => {},
  onSelect,
}: Props) {
  const [engineOnline, setEngineOnline] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => res.json())
      .then((data) => setEngineOnline(data.status === "ok"))
      .catch(() => setEngineOnline(false));
  }, []);

  const features = [
    "Active Speaker Face Tracking (9:16)",
    "CapCut Word-by-Word Subtitles & SFX",
    "Satisfying Gameplay & ASMR Split",
    "Smart Stream Slicing (yt-dlp)",
    "Whisper AI Multi-Language Auto-Sync",
  ];

  const dots = [
    { s: 3, t: "16%", l: "12%", delay: 0, dur: 5 },
    { s: 2, t: "70%", l: "8%", delay: 1.2, dur: 4 },
    { s: 4, t: "22%", l: "83%", delay: 0.5, dur: 6 },
    { s: 2, t: "74%", l: "87%", delay: 2, dur: 4.5 },
    { s: 3, t: "50%", l: "3%", delay: 0.8, dur: 5.5 },
    { s: 2, t: "36%", l: "93%", delay: 1.5, dur: 3.8 },
  ];

  const handleLaunch = () => {
    onSelect("ai-clipper");
  };

  const handleSkip = () => {
    if (onBack) onBack();
    else onSelect("ai-clipper");
  };

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-y-auto select-none relative"
      style={{ background: "#050505", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

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
          0%, 100% { transform: translateY(0); opacity: 0.25; }
          50%       { transform: translateY(-12px); opacity: 0.65; }
        }
      `}</style>

      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 46,
          background: "rgba(5,5,5,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          position: "relative",
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={24} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: G }}>Vault</span>
          </span>
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 5,
              fontSize: 8.5,
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.055)",
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: engineOnline ? G : "#ef4444",
                boxShadow: engineOnline ? `0 0 7px ${G}` : "0 0 7px #ef4444",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5 }}>
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.055)",
              color: "rgba(255,255,255,0.28)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9.5,
            }}
          >
            ⚡ Hardware Accelerated
          </div>
        </div>
      </header>

      {/* ── Main Production Workflow Screen (Centered Single Card - 100% Fit) ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 16px",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ height: 1, width: 20, background: "rgba(0,230,118,0.3)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(0,230,118,0.45)" }}>
            Production Workflow
          </span>
          <div style={{ height: 1, width: 20, background: "rgba(0,230,118,0.3)" }} />
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 900,
            textAlign: "center",
            fontSize: "clamp(22px, 2.5vw, 32px)",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: "0 0 4px",
          }}
        >
          <span style={{ color: "#fff" }}>Select Your Production </span>
          <span style={{ color: G }}>Workflow</span>
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.25)",
            fontSize: 11.5,
            lineHeight: 1.45,
            maxWidth: 440,
            margin: "0 0 12px",
          }}
        >
          Paste a YouTube link or import local footage. AI detects viral hooks, tracks speaker faces, and auto-exports 9:16 Shorts.
        </p>

        {/* ── Single Focused Hero Card ── */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            width: "min(430px, 94vw)",
            background: "#0b0b0b",
            borderRadius: 16,
            padding: "18px 24px",
            animationName: "wfGlowPulse",
            animationDuration: "3.2s",
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            zIndex: 10,
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "3.5px 9px",
                borderRadius: 999,
                background: "rgba(0,230,118,0.07)",
                border: "1px solid rgba(0,230,118,0.18)",
              }}
            >
              <Zap style={{ width: 11, height: 11, color: G }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: G }}>Viral Short-Form Engine</span>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22,
                fontWeight: 700,
                color: "rgba(255,255,255,0.06)",
                letterSpacing: "-0.05em",
                lineHeight: 1,
              }}
            >
              01
            </span>
          </div>

          {/* Animated icon */}
          <div style={{ position: "relative", width: 52, height: 52, marginBottom: 12 }}>
            {/* Outer orbit ring */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "1px dashed rgba(0,230,118,0.16)",
                animationName: "wfOrbitCW",
                animationDuration: "9s",
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
                  background: G,
                  boxShadow: `0 0 6px ${G}`,
                }}
              />
            </div>
            {/* Inner orbit ring */}
            <div
              style={{
                position: "absolute",
                inset: 8,
                borderRadius: "50%",
                border: "1px dashed rgba(0,230,118,0.09)",
                animationName: "wfOrbitCCW",
                animationDuration: "4.5s",
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
                  background: "rgba(0,230,118,0.55)",
                }}
              />
            </div>
            {/* Icon tile */}
            <div
              style={{
                position: "absolute",
                inset: 12,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,230,118,0.08)",
                border: "1px solid rgba(0,230,118,0.24)",
                animationName: "wfIconGlow",
                animationDuration: "2.2s",
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              }}
            >
              <Zap style={{ width: 14, height: 14, color: G }} />
            </div>
          </div>

          {/* Title + description */}
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 900,
              fontSize: 19,
              letterSpacing: "-0.03em",
              color: "#fff",
              margin: "0 0 3px",
            }}
          >
            AI Video Clipper
          </h2>
          <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 11.5, lineHeight: 1.45, margin: "0 0 12px" }}>
            Paste YouTube links or import local media. AI detects high-retention viral hooks, tracks speaker faces, and crafts 9:16 Shorts with dynamic subtitles.
          </p>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {features.map((feat, i) => (
              <div
                key={feat}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animationName: "wfFeatIn",
                  animationDuration: "0.45s",
                  animationFillMode: "both",
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <div
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,230,118,0.09)",
                    border: "1px solid rgba(0,230,118,0.22)",
                  }}
                >
                  <Check style={{ width: 7.5, height: 7.5, color: G }} />
                </div>
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.48)", fontWeight: 500 }}>{feat}</span>
              </div>
            ))}
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 12 }} />

          {/* Launch button */}
          <button
            type="button"
            onClick={handleLaunch}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 12.5,
              color: "#000",
              background: G,
              border: "none",
              cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.01em",
              boxShadow: "0 0 25px rgba(0,230,118,0.35)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 0 40px rgba(0,230,118,0.6)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 25px rgba(0,230,118,0.35)";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span>Launch Studio</span>
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

        {/* Skip link */}
        <button
          type="button"
          onClick={handleSkip}
          style={{
            marginTop: 10,
            fontSize: 11.5,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.25)",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.65)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.25)";
          }}
        >
          Skip — go to home dashboard →
        </button>
      </main>
    </div>
  );
}

export default ProjectSelectorScreen;





