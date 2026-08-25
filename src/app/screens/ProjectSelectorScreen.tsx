import React, { useState, useEffect } from "react";
import { Check, ChevronRight, Zap } from "lucide-react";

const G = "#00e676";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
}

function Logo({ size = 24 }: { size?: number }) {
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

export function ProjectSelectorScreen({ onBack = () => {}, onSelect }: Props) {
  const [engineOnline, setEngineOnline] = useState(true);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((r) => r.json())
      .then((d) => setEngineOnline(d.status === "ok"))
      .catch(() => setEngineOnline(false));
  }, []);

  const features = [
    "Active Speaker Face Tracking (9:16)",
    "CapCut Word-by-Word Subtitles & SFX",
    "Satisfying Gameplay & ASMR Split",
    "Smart Stream Slicing (yt-dlp)",
    "Whisper AI Multi-Language Auto-Sync",
  ];

  const stats = [
    { value: "9:16", label: "Native Format" },
    { value: "5+",   label: "AI Models"     },
    { value: "<2m",  label: "To Export"     },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#050505", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes wfGlowPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(0,230,118,0.14), 0 40px 100px rgba(0,0,0,0.8); }
          50%       { box-shadow: 0 0 60px rgba(0,230,118,0.13), 0 0 0 1px rgba(0,230,118,0.32), 0 40px 100px rgba(0,0,0,0.8); }
        }
        @keyframes wfOrbitCW {
          from { transform: rotate(0deg); } to { transform: rotate(360deg); }
        }
        @keyframes wfOrbitCCW {
          from { transform: rotate(0deg); } to { transform: rotate(-360deg); }
        }
        @keyframes wfIconGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(0,230,118,0.1); }
          50%       { box-shadow: 0 0 32px rgba(0,230,118,0.32); }
        }
        @keyframes wfScanDown {
          0%   { top: -1px; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 0.6; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes wfAmbient {
          0%, 100% { transform: translate(-50%, -50%) scale(1);    opacity: 0.9; }
          50%       { transform: translate(-50%, -50%) scale(1.12); opacity: 1;   }
        }
        @keyframes wfFeatIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wfStatIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wfDotPulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.4); opacity: 0.7; }
        }
        @media (max-width: 639px) {
          .wf-status-pills { display: none !important; }
          .wf-card-body    { padding: 22px 20px !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        height: 50, flexShrink: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", background: "#060606",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={24} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: G }}>Vault</span>
          </span>
          <span style={{
            padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 700,
            letterSpacing: "0.14em", background: "rgba(0,230,118,0.08)",
            color: G, border: "1px solid rgba(0,230,118,0.2)",
          }}>
            V2.0 PRO
          </span>
        </div>

        {/* Status pills */}
        <div className="wf-status-pills" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
            borderRadius: 6, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: engineOnline ? G : "#ef4444",
              boxShadow: engineOnline ? `0 0 6px ${G}` : "0 0 6px #ef4444",
              animationName: "wfDotPulse", animationDuration: "2s",
              animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
            }} />
            <span style={{ color: "rgba(255,255,255,0.38)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5 }}>
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
            borderRadius: 6, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.28)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          }}>
            ⚡ Hardware Accelerated
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{
        flex: 1, overflowY: "auto", position: "relative",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px 16px 20px",
      }}>
        {/* Dot-grid background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

        {/* Ambient glow */}
        <div style={{
          position: "absolute", width: 720, height: 720, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,230,118,0.055) 0%, transparent 60%)",
          top: "50%", left: "50%", pointerEvents: "none",
          animationName: "wfAmbient", animationDuration: "6s",
          animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

          {/* Label */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ height: 1, width: 22, background: "rgba(0,230,118,0.28)" }} />
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(0,230,118,0.5)" }}>
              Production Workflow
            </span>
            <div style={{ height: 1, width: 22, background: "rgba(0,230,118,0.28)" }} />
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontWeight: 900, textAlign: "center",
            fontSize: "clamp(34px, 3.8vw, 50px)", letterSpacing: "-0.04em",
            lineHeight: 1.05, margin: "0 0 10px",
          }}>
            <span style={{ color: "#fff" }}>Select Your Production</span>
            <br />
            <span style={{ color: G }}>Workflow</span>
          </h1>

          {/* Subtitle */}
          <p style={{
            textAlign: "center", color: "rgba(255,255,255,0.24)",
            fontSize: 13.5, lineHeight: 1.6, maxWidth: 420, margin: "0 0 20px", padding: "0 8px",
          }}>
            Paste a YouTube link or import local footage. AI detects viral hooks, tracks speaker faces, and auto-exports 9:16 Shorts.
          </p>

          {/* ── Card ── */}
          <div className="wf-card-body" style={{
            position: "relative", overflow: "hidden",
            width: "min(540px, 100%)",
            background: "linear-gradient(155deg, #101010 0%, #0a0a0a 100%)",
            borderRadius: 18, padding: "26px 32px",
            animationName: "wfGlowPulse", animationDuration: "3.5s",
            animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
          }}>
            {/* Top highlight edge */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.055), transparent)",
            }} />

            {/* Scan line */}
            <div style={{
              position: "absolute", left: 0, right: 0, height: 1, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent 0%, rgba(0,230,118,0.4) 20%, rgba(0,230,118,0.9) 50%, rgba(0,230,118,0.4) 80%, transparent 100%)",
              animationName: "wfScanDown", animationDuration: "4s",
              animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
            }} />

            {/* Badge row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 999,
                background: "rgba(0,230,118,0.07)", border: "1px solid rgba(0,230,118,0.2)",
              }}>
                <Zap style={{ width: 11, height: 11, color: G }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: G }}>Viral Short-Form Engine</span>
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700,
                color: "rgba(255,255,255,0.05)", letterSpacing: "-0.05em", lineHeight: 1,
              }}>
                01
              </span>
            </div>

            {/* Animated icon cluster */}
            <div style={{ position: "relative", width: 76, height: 76, marginBottom: 20 }}>
              {/* Outer orbit */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "1px dashed rgba(0,230,118,0.18)",
                animationName: "wfOrbitCW", animationDuration: "10s",
                animationTimingFunction: "linear", animationIterationCount: "infinite",
              }}>
                <div style={{
                  position: "absolute", width: 5, height: 5, borderRadius: "50%",
                  top: -2.5, left: "50%", marginLeft: -2.5,
                  background: G, boxShadow: `0 0 8px ${G}`,
                }} />
              </div>
              {/* Inner orbit */}
              <div style={{
                position: "absolute", inset: 12, borderRadius: "50%",
                border: "1px dashed rgba(0,230,118,0.1)",
                animationName: "wfOrbitCCW", animationDuration: "5s",
                animationTimingFunction: "linear", animationIterationCount: "infinite",
              }}>
                <div style={{
                  position: "absolute", width: 3.5, height: 3.5, borderRadius: "50%",
                  bottom: -1.75, left: "50%", marginLeft: -1.75,
                  background: "rgba(0,230,118,0.6)",
                }} />
              </div>
              {/* Icon tile */}
              <div style={{
                position: "absolute", inset: 20, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.26)",
                animationName: "wfIconGlow", animationDuration: "2.4s",
                animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
              }}>
                <Zap style={{ width: 16, height: 16, color: G }} />
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 900,
              fontSize: 22, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 5px",
            }}>
              AI Video Clipper
            </h2>

            {/* Description */}
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12.5, lineHeight: 1.6, margin: "0 0 16px" }}>
              Paste YouTube links or import local media. AI detects high-retention viral hooks, tracks speaker faces, and crafts 9:16 Shorts with dynamic subtitles.
            </p>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {stats.map((s, i) => (
                <div key={s.label} style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "10px 8px", borderRadius: 12,
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)",
                  animationName: "wfStatIn", animationDuration: "0.4s",
                  animationFillMode: "both", animationDelay: `${i * 0.08}s`,
                }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "-0.03em", color: G, lineHeight: 1 }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3, fontWeight: 500 }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
              {features.map((feat, i) => (
                <div key={feat} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  animationName: "wfFeatIn", animationDuration: "0.4s",
                  animationFillMode: "both", animationDelay: `${0.15 + i * 0.06}s`,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,230,118,0.09)", border: "1px solid rgba(0,230,118,0.24)",
                  }}>
                    <Check style={{ width: 8, height: 8, color: G }} />
                  </div>
                  <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.46)", fontWeight: 500 }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 14 }} />

            {/* Launch button */}
            <button
              type="button"
              onClick={() => onSelect("ai-clipper")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "13px 18px", borderRadius: 12, border: "none", cursor: "pointer",
                background: G, color: "#000", fontSize: 13.5, fontWeight: 800,
                fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em",
                boxShadow: "0 0 24px rgba(0,230,118,0.28)", transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.boxShadow = "0 0 48px rgba(0,230,118,0.55)"; el.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.boxShadow = "0 0 24px rgba(0,230,118,0.28)"; el.style.transform = "none"; }}
            >
              <span>Launch Studio</span>
              <div style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
                <ChevronRight style={{ width: 15, height: 15 }} />
              </div>
            </button>
          </div>

          {/* Skip */}
          <button
            type="button"
            onClick={() => (onBack ? onBack() : onSelect("ai-clipper"))}
            style={{
              marginTop: 16, fontSize: 11.5, background: "none", border: "none",
              cursor: "pointer", color: "rgba(255,255,255,0.2)", transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; }}
          >
            Skip — go to home dashboard →
          </button>
        </div>
      </main>
    </div>
  );
}

export default ProjectSelectorScreen;

