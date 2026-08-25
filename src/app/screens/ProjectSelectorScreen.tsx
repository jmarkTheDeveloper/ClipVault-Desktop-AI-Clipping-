import React, { useState, useEffect } from "react";
import { Check, ChevronRight, Zap, Github, Heart } from "lucide-react";

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
    { value: "9:16", label: "Native Shorts" },
    { value: "5+",   label: "AI Models"     },
    { value: "<2m",  label: "Fast Export"   },
  ];

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden", background: "#050505", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        @keyframes wfGlowPulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(0,230,118,0.14), 0 30px 80px rgba(0,0,0,0.8); }
          50%       { box-shadow: 0 0 50px rgba(0,230,118,0.14), 0 0 0 1px rgba(0,230,118,0.32), 0 30px 80px rgba(0,0,0,0.8); }
        }
        @keyframes wfOrbitCW {
          from { transform: rotate(0deg); } to { transform: rotate(360deg); }
        }
        @keyframes wfOrbitCCW {
          from { transform: rotate(0deg); } to { transform: rotate(-360deg); }
        }
        @keyframes wfIconGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(0,230,118,0.1); }
          50%       { box-shadow: 0 0 28px rgba(0,230,118,0.3); }
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
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes wfDotPulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.35); opacity: 0.7; }
        }
        @media (max-width: 900px) {
          .wf-split-layout { grid-template-columns: 1fr !important; gap: 20px !important; }
          .wf-left-col { text-align: center !important; align-items: center !important; }
          .wf-left-col p { margin-left: auto !important; margin-right: auto !important; }
        }
      `}</style>

      {/* ── Header with 140px right padding to avoid Windows window controls overlap ── */}
      <header style={{
        height: 48, flexShrink: 0, zIndex: 30,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 140px 0 24px", background: "#060606",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={22} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: G }}>Vault</span>
          </span>
          <span style={{
            padding: "2px 7px", borderRadius: 5, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.12em", background: "rgba(0,230,118,0.08)",
            color: G, border: "1px solid rgba(0,230,118,0.2)",
          }}>
            V1.0
          </span>
        </div>

        {/* Status pills (safely positioned away from Windows window buttons) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 9px",
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
            display: "flex", alignItems: "center", gap: 5, padding: "4px 9px",
            borderRadius: 6, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.32)", fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
          }}>
            ⚡ Hardware Accelerated
          </div>
        </div>
      </header>

      {/* ── Main Widescreen Industry Split Layout ── */}
      <main style={{
        flex: 1, position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px 32px", overflow: "hidden", minHeight: 0,
      }}>
        {/* Dot-grid background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }} />

        {/* Ambient glow */}
        <div style={{
          position: "absolute", width: 750, height: 750, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,230,118,0.05) 0%, transparent 60%)",
          top: "50%", left: "50%", pointerEvents: "none",
          animationName: "wfAmbient", animationDuration: "6s",
          animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
        }} />

        {/* ── 2-Column Wide Split Grid ── */}
        <div
          className="wf-split-layout"
          style={{
            position: "relative", zIndex: 10,
            display: "grid",
            gridTemplateColumns: "1.05fr 1.2fr",
            gap: 36,
            maxWidth: 1040,
            width: "100%",
            alignItems: "center",
          }}
        >
          {/* Left Column: Hero Typography & Key Stats */}
          <div className="wf-left-col" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* Pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ height: 1, width: 20, background: "rgba(0,230,118,0.35)" }} />
              <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(0,230,118,0.6)" }}>
                PRODUCTION WORKFLOW
              </span>
              <div style={{ height: 1, width: 20, background: "rgba(0,230,118,0.35)" }} />
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 900,
              fontSize: "clamp(30px, 3.2vw, 44px)", letterSpacing: "-0.04em",
              lineHeight: 1.08, margin: "0 0 12px", color: "#fff",
            }}>
              Select Your Production
              <br />
              <span style={{ color: G }}>Workflow</span>
            </h1>

            {/* Subtitle */}
            <p style={{
              color: "rgba(255,255,255,0.38)", fontSize: 13, lineHeight: 1.6,
              maxWidth: 420, margin: "0 0 20px", fontWeight: 500,
            }}>
              Paste YouTube links or import local media. AI automatically detects high-retention viral hooks, tracks speaker faces, and crafts 9:16 Shorts with dynamic subtitles.
            </p>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%", maxWidth: 420, marginBottom: 20 }}>
              {stats.map((s) => (
                <div key={s.label} style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)",
                }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: 18, color: G, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3, fontWeight: 500 }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Developer Profile & Support Banner */}
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                padding: "11px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 13 }}>🇵🇭</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff" }}>
                    Built by <span style={{ color: G }}>jmarkTheDeveloper</span>
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background: "rgba(0,230,118,0.08)",
                      color: G,
                      fontWeight: 600,
                    }}
                  >
                    CS Student
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <a
                    href="https://github.com/jmarkTheDeveloper"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      textDecoration: "none",
                      padding: "3.5px 8px",
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  >
                    <Github style={{ width: 11, height: 11 }} />
                    <span>GitHub</span>
                  </a>

                  <a
                    href="https://patreon.com/jmarkTheDeveloper"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#ff667a",
                      textDecoration: "none",
                      padding: "3.5px 8px",
                      borderRadius: 6,
                      background: "rgba(255,102,122,0.08)",
                      border: "1px solid rgba(255,102,122,0.22)",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,102,122,0.16)";
                      e.currentTarget.style.color = "#ff8595";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,102,122,0.08)";
                      e.currentTarget.style.color = "#ff667a";
                    }}
                  >
                    <Heart style={{ width: 11, height: 11, fill: "#ff667a" }} />
                    <span>Support</span>
                  </a>
                </div>
              </div>

              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1.4 }}>
                Computer Science student at National University Philippines building open-source AI tools.
              </p>
            </div>
          </div>

          {/* Right Column: Studio Card */}
          <div
            className="wf-card-body"
            style={{
              position: "relative", overflow: "hidden",
              background: "linear-gradient(155deg, #111113 0%, #09090b 100%)",
              borderRadius: 18, padding: "24px 28px",
              border: "1px solid rgba(0,230,118,0.2)",
              animationName: "wfGlowPulse", animationDuration: "3.5s",
              animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
            }}
          >
            {/* Top highlight edge */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
            }} />

            {/* Scan line */}
            <div style={{
              position: "absolute", left: 0, right: 0, height: 1, pointerEvents: "none",
              background: "linear-gradient(90deg, transparent 0%, rgba(0,230,118,0.4) 20%, rgba(0,230,118,0.9) 50%, rgba(0,230,118,0.4) 80%, transparent 100%)",
              animationName: "wfScanDown", animationDuration: "3.8s",
              animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
            }} />

            {/* Badge row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 999,
                background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.22)",
              }}>
                <Zap style={{ width: 11, height: 11, color: G }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: G }}>Viral Short-Form Engine</span>
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700,
                color: "rgba(255,255,255,0.06)", letterSpacing: "-0.05em", lineHeight: 1,
              }}>
                01
              </span>
            </div>

            {/* Animated icon & Title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              {/* Orbital Icon */}
              <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: "1px dashed rgba(0,230,118,0.18)",
                  animationName: "wfOrbitCW", animationDuration: "10s",
                  animationTimingFunction: "linear", animationIterationCount: "infinite",
                }}>
                  <div style={{
                    position: "absolute", width: 4, height: 4, borderRadius: "50%",
                    top: -2, left: "50%", marginLeft: -2,
                    background: G, boxShadow: `0 0 6px ${G}`,
                  }} />
                </div>
                <div style={{
                  position: "absolute", inset: 8, borderRadius: "50%",
                  border: "1px dashed rgba(0,230,118,0.1)",
                  animationName: "wfOrbitCCW", animationDuration: "5s",
                  animationTimingFunction: "linear", animationIterationCount: "infinite",
                }}>
                  <div style={{
                    position: "absolute", width: 3, height: 3, borderRadius: "50%",
                    bottom: -1.5, left: "50%", marginLeft: -1.5,
                    background: "rgba(0,230,118,0.6)",
                  }} />
                </div>
                <div style={{
                  position: "absolute", inset: 13, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.26)",
                  animationName: "wfIconGlow", animationDuration: "2.4s",
                  animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
                }}>
                  <Zap style={{ width: 15, height: 15, color: G }} />
                </div>
              </div>

              {/* Title */}
              <div>
                <h2 style={{
                  fontFamily: "'Outfit', sans-serif", fontWeight: 900,
                  fontSize: 20, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 2px",
                }}>
                  AI Video Clipper
                </h2>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                  Face tracking 9:16 Shorts with dynamic subtitles
                </span>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
              {features.map((feat, i) => (
                <div key={feat} style={{
                  display: "flex", alignItems: "center", gap: 9,
                  animationName: "wfFeatIn", animationDuration: "0.4s",
                  animationFillMode: "both", animationDelay: `${i * 0.05}s`,
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,230,118,0.09)", border: "1px solid rgba(0,230,118,0.24)",
                  }}>
                    <Check style={{ width: 8, height: 8, color: G }} />
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)", fontWeight: 500 }}>{feat}</span>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 16 }} />

            {/* Launch button */}
            <button
              type="button"
              onClick={() => onSelect("ai-clipper")}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                background: G, color: "#000", fontSize: 13, fontWeight: 800,
                fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em",
                boxShadow: "0 0 24px rgba(0,230,118,0.32)", transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.boxShadow = "0 0 44px rgba(0,230,118,0.6)"; el.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.boxShadow = "0 0 24px rgba(0,230,118,0.32)"; el.style.transform = "none"; }}
            >
              <span>Launch Studio</span>
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
                <ChevronRight style={{ width: 14, height: 14 }} />
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProjectSelectorScreen;

