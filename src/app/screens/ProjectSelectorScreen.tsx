import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronRight,
  Zap,
  Github,
  Heart,
  ShieldCheck,
  Lock,
  Scale,
  AlertTriangle,
  X,
  Cpu,
  Globe,
  Key,
  FileCheck,
  ExternalLink,
  CheckCircle2,
  ArrowDown,
  GraduationCap,
  Sparkles,
  Code2,
  Coffee,
  User,
} from "lucide-react";

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
  const [complianceAccepted, setComplianceAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem("clipvault_compliance_accepted") === "true";
    } catch {
      return false;
    }
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [complianceTab, setComplianceTab] = useState<string>("all");
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
  const [showScrollPrompt, setShowScrollPrompt] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const documentPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((r) => r.json())
      .then((d) => setEngineOnline(d.status === "ok"))
      .catch(() => setEngineOnline(false));
  }, []);

  // 5-second inactivity timer for scroll down prompt
  useEffect(() => {
    if (showPrivacyModal && !complianceAccepted && !hasScrolledToBottom) {
      setShowScrollPrompt(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setShowScrollPrompt(true);
      }, 5000);
    } else {
      setShowScrollPrompt(false);
    }
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [showPrivacyModal, complianceAccepted, hasScrolledToBottom, complianceTab]);

  const features = [
    "Active Speaker Face Tracking (9:16)",
    "Dynamic Word-by-Word Subtitles & SFX",
    "Satisfying Gameplay & ASMR Split",
    "Smart Stream Slicing Technology",
    "AI Multi-Language Audio-Sync Engine",
  ];

  const stats = [
    { value: "9:16", label: "Native Shorts" },
    { value: "5+",   label: "AI Models"     },
    { value: "<2m",  label: "Fast Export"   },
  ];

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden", background: "#050505", fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

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
        @keyframes wfBouncePrompt {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
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
          <span style={{ fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: G }}>Vault</span>
          </span>
          <span style={{
            padding: "2px 7px", borderRadius: 5, fontSize: 8.5, fontWeight: 700,
            letterSpacing: "0.12em", background: "rgba(0,230,118,0.08)",
            color: G, border: "1px solid rgba(0,230,118,0.2)",
            fontFamily: "'Geist Mono', monospace",
          }}>
            V1.0
          </span>
        </div>

        {/* Status pills & Privacy Button (safely positioned away from Windows window buttons) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 6,
              background: complianceAccepted ? "rgba(0,230,118,0.06)" : "rgba(255,255,255,0.03)",
              border: complianceAccepted ? "1px solid rgba(0,230,118,0.25)" : "1px solid rgba(255,255,255,0.08)",
              color: complianceAccepted ? G : "rgba(255,255,255,0.55)",
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              fontSize: 9.5,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.borderColor = "rgba(0,230,118,0.35)";
              e.currentTarget.style.background = "rgba(0,230,118,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = complianceAccepted ? G : "rgba(255,255,255,0.55)";
              e.currentTarget.style.borderColor = complianceAccepted ? "1px solid rgba(0,230,118,0.25)" : "rgba(255,255,255,0.08)";
              e.currentTarget.style.background = complianceAccepted ? "rgba(0,230,118,0.06)" : "rgba(255,255,255,0.03)";
            }}
          >
            <ShieldCheck style={{ width: 11, height: 11, color: G }} />
            <span>{complianceAccepted ? "Privacy & BYOK Active" : "Privacy & BYOK Security"}</span>
          </button>

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
            <span style={{ color: "rgba(255,255,255,0.38)", fontFamily: "'Geist Mono', monospace", fontSize: 9.5 }}>
              {engineOnline ? "Local Engine Online (127.0.0.1:8000)" : "Engine Offline"}
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 5, padding: "4px 9px",
            borderRadius: 6, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.32)", fontFamily: "'Geist Mono', monospace", fontSize: 9.5,
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
                AI VIDEO SUITE
              </span>
              <div style={{ height: 1, width: 20, background: "rgba(0,230,118,0.35)" }} />
            </div>

            {/* Main Headline */}
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontWeight: 900,
              fontSize: "clamp(32px, 3.5vw, 48px)", letterSpacing: "-0.04em",
              lineHeight: 1.08, margin: "0 0 12px", color: "#fff",
            }}>
              Welcome to
              <br />
              <span style={{ color: G }}>ClipVault</span>
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
                  <div style={{ fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 18, color: G, lineHeight: 1 }}>
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
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    CS Student
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>

                  <a
                    href="https://patreon.com/jmarkTheDeveloper?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#ff667a",
                      textDecoration: "none",
                      padding: "3.5px 9px",
                      borderRadius: 6,
                      background: "rgba(255,102,122,0.08)",
                      border: "1px solid rgba(255,102,122,0.2)",
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
                Computer Science student at National University Philippines building advanced AI tools.
              </p>
            </div>

            {/* Footer Links Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 2, flexWrap: "wrap" }}>
              {/* Privacy & Compliance Trigger Link */}
              <button
                type="button"
                onClick={() => setShowPrivacyModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.35)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(0,230,118,0.9)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
              >
                <ShieldCheck style={{ width: 12, height: 12, color: G }} />
                <span>Privacy Policy, BYOK Compliance & Software License</span>
              </button>

              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>•</span>

              {/* About the Creator / About Us */}
              <button
                type="button"
                onClick={() => setShowAboutModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10.5,
                  color: "rgba(255,255,255,0.45)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fbbf24"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >
                <Heart style={{ width: 12, height: 12, color: "#fbbf24", fill: "rgba(251,191,36,0.3)" }} />
                <span style={{ fontWeight: 600 }}>About Us</span>
              </button>
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
                fontFamily: "'Geist Mono', monospace", fontSize: 24, fontWeight: 700,
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
                    background: "#2cf590", boxShadow: "0 0 4px #2cf590",
                  }} />
                </div>
                <div style={{
                  position: "absolute", inset: 12, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(0,230,118,0.18) 0%, rgba(0,0,0,0.4) 100%)",
                  border: "1px solid rgba(0,230,118,0.32)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animationName: "wfIconGlow", animationDuration: "3s",
                  animationTimingFunction: "ease-in-out", animationIterationCount: "infinite",
                }}>
                  <Zap style={{ width: 14, height: 14, color: G, fill: G }} />
                </div>
              </div>

              {/* Title & Desc */}
              <div>
                <h2 style={{
                  fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 20,
                  color: "#fff", letterSpacing: "-0.03em", margin: "0 0 4px",
                }}>
                  AI Video Clipper
                </h2>
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 500 }}>
                  Face tracking 9:16 Shorts with dynamic subtitles
                </p>
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
              onClick={() => {
                if (!complianceAccepted) {
                  setShowPrivacyModal(true);
                  return;
                }
                onSelect("ai-clipper");
              }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                background: G, color: "#000", fontSize: 13, fontWeight: 800,
                fontFamily: "'Space Grotesk', 'Geist', sans-serif", letterSpacing: "-0.01em",
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

      {/* ── Widescreen Industry-Grade Privacy, BYOK Compliance & Legal Center Modal ── */}
      {showPrivacyModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => {
            if (complianceAccepted) {
              setShowPrivacyModal(false);
            }
          }}
        >
          <div
            style={{
              position: "relative",
              width: "min(920px, 95vw)",
              height: "min(680px, 88vh)",
              background: "#0c0c0f",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              boxShadow: "0 35px 120px rgba(0,0,0,0.98), 0 0 1px 1px rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.015)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "rgba(0,230,118,0.08)",
                    border: "1px solid rgba(0,230,118,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShieldCheck style={{ width: 18, height: 18, color: G }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <h3 style={{ fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", margin: 0 }}>
                      Security, BYOK Privacy & Compliance Center
                    </h3>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontSize: 8.5,
                      fontFamily: "'Geist Mono', monospace",
                      fontWeight: 700,
                      background: "rgba(0,230,118,0.1)",
                      color: G,
                      border: "1px solid rgba(0,230,118,0.2)",
                    }}>
                      VERIFIED V1.0
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    Local-First Architecture • Zero Telemetry • Fair-Use & DMCA Guidelines • Proprietary License
                  </p>
                </div>
              </div>

              {/* Close (X) button ONLY visible if the user has already accepted the compliance terms */}
              {complianceAccepted && (
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(false)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.5)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  }}
                >
                  <X style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>

            {/* First-Time Notice Banner */}
            {!complianceAccepted && (
              <div style={{ padding: "8px 24px", background: "rgba(0,230,118,0.06)", borderBottom: "1px solid rgba(0,230,118,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.7)", flexShrink: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck style={{ width: 13, height: 13, color: G }} />
                  <span><strong>First-Time Security Review:</strong> Please review and confirm the local BYOK security & compliance terms before launching ClipVault.</span>
                </span>
              </div>
            )}

            {/* Modal Body: 2-Column Widescreen Split */}
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "240px 1fr", overflow: "hidden" }}>
              {/* Left Sidebar Navigation & Security Badges */}
              <div
                style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRight: "1px solid rgba(255,255,255,0.06)",
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  overflowY: "auto",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 9.5, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "rgba(255,255,255,0.3)", padding: "0 8px 6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Compliance Index
                  </span>

                  {[
                    { id: "all", label: "View All Sections", icon: FileCheck },
                    { id: "byok", label: "01. BYOK & Privacy", icon: Key },
                    { id: "device", label: "02. On-Device Processing", icon: Cpu },
                    { id: "platform", label: "03. Platform Terms & yt-dlp", icon: Globe },
                    { id: "ai", label: "04. AI Models & Billing", icon: Zap },
                    { id: "liability", label: "05. Liability & Warranty", icon: AlertTriangle },
                    { id: "license", label: "06. DMCA & Software License", icon: Scale },
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = complianceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setComplianceTab(tab.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "8px 10px",
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: isActive ? 700 : 500,
                          textAlign: "left",
                          color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                          background: isActive ? "rgba(0,230,118,0.1)" : "transparent",
                          border: isActive ? "1px solid rgba(0,230,118,0.25)" : "1px solid transparent",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                            e.currentTarget.style.color = "#fff";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                          }
                        }}
                      >
                        <IconComponent style={{ width: 13, height: 13, color: isActive ? G : "rgba(255,255,255,0.4)" }} />
                        <span style={{ truncate: true }}>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Security Audit Badge */}
                <div
                  style={{
                    padding: "12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <span style={{ fontWeight: 700, color: G, display: "flex", alignItems: "center", gap: 5 }}>
                    <Lock style={{ width: 11, height: 11 }} /> LOCAL AUDIT
                  </span>
                  <div style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                    • Port: 127.0.0.1:8000<br />
                    • Remote Proxies: 0<br />
                    • Telemetry: Inactive<br />
                    • Keys: Local Only
                  </div>
                </div>
              </div>

              {/* Right Document Pane */}
              <div
                ref={documentPaneRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 40;
                  if (isBottom) {
                    setHasScrolledToBottom(true);
                    setShowScrollPrompt(false);
                  } else if (!hasScrolledToBottom) {
                    setShowScrollPrompt(false);
                    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                    scrollTimeoutRef.current = setTimeout(() => {
                      setShowScrollPrompt(true);
                    }, 5000);
                  }
                }}
                style={{
                  padding: "24px 30px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {/* Section 01 */}
                {(complianceTab === "all" || complianceTab === "byok") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: G }}>
                        01
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                        Bring Your Own Key (BYOK) & Credential Privacy
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>
                      ClipVault operates under a strict <strong>zero-telemetry, local-first architecture</strong>. When you input your API keys for AI models (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 2.0, Groq Llama 3.3, or DeepSeek):
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.55)", display: "flex", flexDirection: "column", gap: 4 }}>
                      <li><strong>Local Encrypted Storage:</strong> Keys are stored only within your machine's local environment (`%LOCALAPPDATA%` and encrypted Electron safeStorage).</li>
                      <li><strong>Direct TLS Encrypted Dispatch:</strong> API calls connect directly from your computer to official provider endpoints (e.g. `api.openai.com`, `generativelanguage.googleapis.com`) over TLS 1.3 / HTTPS.</li>
                      <li><strong>No Middleman Proxies:</strong> ClipVault does not operate remote servers, proxy relays, or central databases. Your keys and prompts are never intercepted, cached, or logged by the application author.</li>
                    </ul>
                  </div>
                )}

                {/* Section 02 */}
                {(complianceTab === "all" || complianceTab === "device") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: G }}>
                        02
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                        Zero-Telemetry & 100% On-Device Processing
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>
                      All computationally intensive media operations run locally on your computer's native CPU and GPU hardware (Intel QSV, NVIDIA NVENC, AMD AMF):
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.55)", display: "flex", flexDirection: "column", gap: 4 }}>
                      <li><strong>No Media Uploads:</strong> Video files, raw audio tracks, sliced clips, and exported MP4 master files never leave your hard drive.</li>
                      <li><strong>Privacy Compliance:</strong> Compliant with global privacy standards (GDPR, CCPA) by virtue of zero personal data collection, zero tracking cookies, and zero user IP harvesting.</li>
                      <li><strong>Local Computer Vision:</strong> OpenCV facial landmark tracking and speaker detection run on your local Python runtime.</li>
                    </ul>
                  </div>
                )}

                {/* Section 03 */}
                {(complianceTab === "all" || complianceTab === "platform") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: G }}>
                        03
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                        Platform Terms of Service & Stream Slicing Ingestion
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>
                      ClipVault integrates open-source media utilities (`yt-dlp`, `ffmpeg`) to process user-provided video URLs:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: "rgba(255,255,255,0.55)", paddingLeft: 14, borderLeft: "2px solid rgba(0,230,118,0.3)" }}>
                      <div>• <strong>Independent Utility:</strong> ClipVault is an independent project and is NOT affiliated, authorized, endorsed, or sponsored by YouTube, Google LLC, ByteDance (TikTok), Meta Platforms (Instagram/Facebook), Twitch, or any subsidiary.</div>
                      <div>• <strong>Substantial Non-Infringing Uses:</strong> The software is engineered for lawful workflows including personal archiving, education, fair-use commentary, video editing, and processing user-created or public domain media.</div>
                      <div>• <strong>User Legal Responsibility:</strong> The end user is solely responsible for respecting platform Terms of Service and ensuring they have legal rights or fair-use justification for any third-party media ingested.</div>
                    </div>
                  </div>
                )}

                {/* Section 04 */}
                {(complianceTab === "all" || complianceTab === "ai") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>
                        04
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                        Third-Party AI Models & API Billing Disclaimer
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>
                      Users are subject to the respective Terms of Service and Acceptable Use Policies of their configured AI providers (OpenAI, Anthropic, Google, Groq, DeepSeek):
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.55)", display: "flex", flexDirection: "column", gap: 4 }}>
                      <li><strong>Billing & Quota Responsibility:</strong> You are solely responsible for monitoring your token usage, rate limits, and billing tiers with each provider. ClipVault and its maintainer assume zero liability for unexpected charges or API billing overages.</li>
                      <li><strong>AI Output Verification:</strong> AI-generated titles, hooks, and captions should be reviewed by the user prior to publishing to ensure factual accuracy and compliance with content distribution policies.</li>
                    </ul>
                  </div>
                )}

                {/* Section 05 */}
                {(complianceTab === "all" || complianceTab === "liability") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#ef4444" }}>
                        05
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                        Disclaimer of Warranties & Limitation of Liability
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontFamily: "'JetBrains Mono', monospace", background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                      IN NO EVENT SHALL THE AUTHOR (JMARKTHEDEVELOPER), CONTRIBUTORS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, LOSS OF DATA, SYSTEM HALTS, HARDWARE STRAIN, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                    </p>
                  </div>
                )}

                {/* Section 06 */}
                {(complianceTab === "all" || complianceTab === "license") && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: G }}>
                        06
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 14 }}>
                        DMCA Compliance & Exclusive Proprietary Commercial License
                      </span>
                    </div>
                    <p style={{ margin: "0 0 8px" }}>
                      ClipVault is dedicated to intellectual property respect and ethical desktop software distribution:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.55)", display: "flex", flexDirection: "column", gap: 4 }}>
                      <li><strong>DMCA & No Content Hosting:</strong> ClipVault does not host, stream, index, or distribute media assets. All media streams are ingested directly by the user on their own local device.</li>
                      <li><strong>Exclusive Proprietary Commercial License:</strong> Copyright &copy; 2026 Jae Mark (jmarkTheDeveloper). All rights reserved. Free permission is granted for personal, non-commercial local use. Any commercial resale, SaaS re-hosting, redistribution, or unauthorized monetization without express written consent from the author is strictly prohibited.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 5-Second Inactivity Scroll Prompt */}
            {showScrollPrompt && !hasScrolledToBottom && !complianceAccepted && (
              <div
                style={{
                  position: "absolute",
                  bottom: 68,
                  right: 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(18, 18, 22, 0.95)",
                  border: "1px solid rgba(0, 230, 118, 0.4)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.85), 0 0 16px rgba(0, 230, 118, 0.25)",
                  color: "#fff",
                  fontSize: 11.5,
                  fontWeight: 700,
                  animation: "wfBouncePrompt 1.8s infinite ease-in-out",
                  zIndex: 40,
                  pointerEvents: "none",
                }}
              >
                <ArrowDown style={{ width: 13, height: 13, color: G }} />
                <span>Read and scroll down to proceed</span>
              </div>
            )}

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 24px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.015)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <a
                  href="https://patreon.com/jmarkTheDeveloper?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 11.5,
                    color: "#ff667a",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ff8595"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#ff667a"; }}
                >
                  <span>Support on Patreon</span>
                  <ExternalLink style={{ width: 10, height: 10, opacity: 0.6 }} />
                </a>

                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>•</span>

                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'JetBrains Mono', monospace" }}>
                  Exclusive License © 2026 Jae Mark (jmarkTheDeveloper)
                </span>
              </div>

              {!complianceAccepted ? (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {!hasScrolledToBottom ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,0.48)", fontSize: 11.5, fontFamily: "'Geist Mono', monospace" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
                      <span>Scroll to bottom to unlock accept</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: G, fontSize: 11.5, fontWeight: 600 }}>
                      <CheckCircle2 style={{ width: 14, height: 14, color: G }} />
                      <span>Review Completed & Verified</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!hasScrolledToBottom}
                    onClick={() => {
                      try {
                        localStorage.setItem("clipvault_compliance_accepted", "true");
                      } catch {}
                      setComplianceAccepted(true);
                      setShowPrivacyModal(false);
                    }}
                    style={{
                      padding: "8px 24px",
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 12,
                      color: hasScrolledToBottom ? "#000" : "rgba(0,0,0,0.35)",
                      background: hasScrolledToBottom ? G : "rgba(0,230,118,0.22)",
                      border: "none",
                      cursor: hasScrolledToBottom ? "pointer" : "not-allowed",
                      boxShadow: hasScrolledToBottom ? "0 0 20px rgba(0,230,118,0.35)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    Accept & Continue
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, color: G, display: "flex", alignItems: "center", gap: 5, fontFamily: "'Geist Mono', monospace" }}>
                    <CheckCircle2 style={{ width: 13, height: 13 }} /> Compliance Accepted
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.removeItem("clipvault_compliance_accepted");
                      } catch {}
                      setComplianceAccepted(false);
                      setHasScrolledToBottom(false);
                      setShowScrollPrompt(false);
                    }}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 6,
                      fontSize: 10.5,
                      color: "rgba(255,255,255,0.4)",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.1)",
                      cursor: "pointer",
                      fontFamily: "'Geist Mono', monospace",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#ff667a";
                      e.currentTarget.style.borderColor = "rgba(255,102,122,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                    }}
                    title="Reset compliance state for testing"
                  >
                    Reset Acceptance
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyModal(false)}
                    style={{
                      padding: "7px 20px",
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      color: "#fff",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    }}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── About Us / Foundational Vision & Student Developer Manifesto ── */}
      {showAboutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background: "rgba(0,0,0,0.92)",
            backdropFilter: "blur(20px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 16px",
          }}
          onClick={() => setShowAboutModal(false)}
        >
          <div
            style={{
              position: "relative",
              width: "min(880px, 95vw)",
              maxHeight: "88vh",
              background: "#0a0a0c",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 24,
              boxShadow: "0 40px 160px rgba(0,0,0,0.98), 0 0 1px 1px rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "24px 36px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.015)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'Geist Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#fbbf24",
                    padding: "4px 10px",
                    borderRadius: 6,
                    background: "rgba(251,191,36,0.1)",
                    border: "1px solid rgba(251,191,36,0.25)",
                  }}
                >
                  Founder Letter
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  ClipVault AI Architecture & Mission
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Modal Body (Clean Editorial Manifesto) */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "36px 44px",
                display: "flex",
                flexDirection: "column",
                gap: 28,
              }}
            >
              {/* Headline */}
              <div>
                <h1
                  style={{
                    margin: "0 0 12px",
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#ffffff",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.25,
                  }}
                >
                  Building a New Standard for Creator Software.
                </h1>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "rgba(255,255,255,0.5)",
                    lineHeight: 1.6,
                  }}
                >
                  Why ClipVault AI was created as an independent, desktop-native alternative to cloud video SaaS.
                </p>
              </div>

              {/* Founder Tag & GitHub Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 20,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Code2 style={{ width: 18, height: 18, color: G }} />
                  <span style={{ fontSize: 14, fontFamily: "'Geist Mono', monospace", fontWeight: 700, color: "#fff" }}>
                    @jmarkTheDeveloper
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>•</span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    Computer Science Student & Solo Founder
                  </span>
                </div>

                <a
                  href="https://github.com/jmarkTheDeveloper"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'Geist Mono', monospace",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  <Github style={{ width: 14, height: 14 }} />
                  <span>github.com/jmarkTheDeveloper</span>
                  <ExternalLink style={{ width: 12, height: 12, opacity: 0.6 }} />
                </a>
              </div>

              {/* Manifesto Text Content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 15.5,
                  lineHeight: 1.75,
                  letterSpacing: "-0.01em",
                }}
              >
                <p style={{ margin: 0 }}>
                  This application was designed and coded entirely by an active <strong style={{ color: "#fff" }}>Computer Science college student</strong> aiming to achieve self-sufficiency, make a living through craftsmanship, and introduce an honest, powerful business impact into the video creator economy.
                </p>

                {/* Pull Quote */}
                <div
                  style={{
                    padding: "16px 22px",
                    background: "rgba(255,255,255,0.02)",
                    borderLeft: `3px solid ${G}`,
                    borderRadius: "0 12px 12px 0",
                    color: "#ffffff",
                    fontSize: 16,
                    fontStyle: "italic",
                    lineHeight: 1.65,
                  }}
                >
                  "Creators shouldn't be forced to rent their editing workflow from cloud servers when their own computer has all the processing power needed to do it locally, privately, and for free."
                </div>

                <p style={{ margin: 0 }}>
                  Today's video clipping market is overcrowded with cloud SaaS platforms that lock basic video operations behind <span style={{ color: "#ff667a", fontWeight: 600 }}>$30 to $100+ monthly subscriptions</span>. They require you to upload massive gigabyte video files to remote queues, wait several minutes for simple cuts, and consume artificial credit pools.
                </p>

                <h3
                  style={{
                    margin: "12px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  The ClipVault Principles
                </h3>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <li>
                    <strong style={{ color: "#fff" }}>Zero Cloud Bottlenecks:</strong> Video processing, scene detection, facial steadicam tracking, and typography rendering execute 100% on your local machine using hardware-accelerated encoders (NVENC, Intel QuickSync, or AMD AMF).
                  </li>
                  <li>
                    <strong style={{ color: "#fff" }}>Bring-Your-Own-Key (BYOK) Freedom:</strong> Connect directly to cutting-edge AI providers like Google Gemini, Groq, or OpenAI using your personal API keys. Your keys and raw footage never pass through any intermediate server.
                  </li>
                  <li>
                    <strong style={{ color: "#fff" }}>Unlimited Creator Sovereignty:</strong> No monthly usage caps, no watermark paywalls, and no arbitrary restrictions on how many clips you can produce.
                  </li>
                </ul>

                <h3
                  style={{
                    margin: "16px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Why ClipVault is a Paid Product
                </h3>

                <p style={{ margin: 0 }}>
                  You might wonder why ClipVault is offered as a commercial tool rather than completely free software. The answer is rooted in transparency, financial independence, and long-term software sustainability:
                </p>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  <li>
                    <strong style={{ color: "#fff" }}>Financial Development & University Tuition:</strong> As a full-time Computer Science student, charging an honest, accessible fee directly covers college tuition, living expenses, development hardware, and dedicated engineering hours.
                  </li>
                  <li>
                    <strong style={{ color: "#fff" }}>Sustainable Independence over Corporate Traps:</strong> Free software projects frequently die from developer burnout, turn into ad-bloated adware, or get acquired and shut down. A sustainable revenue model ensures ClipVault receives active feature updates, AI model integrations, and direct technical support.
                  </li>
                  <li>
                    <strong style={{ color: "#fff" }}>Fair Lifetime Value vs Subscription Extortion:</strong> Cloud clipping SaaS platforms charge $30–$100 every single month. ClipVault replaces recurring monthly drains with an accessible, high-value tool where you own your workflows forever.
                  </li>
                </ul>

                <h3
                  style={{
                    margin: "16px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  A Respectful Plea: Please Do Not Break or Pirate This Software
                </h3>

                <p style={{ margin: 0 }}>
                  If you ever consider attempting to crack, reverse-engineer, bypass license validations, redistribute unauthorized binaries, or repackage ClipVault AI: <strong style={{ color: "#ff667a" }}>please reconsider and avoid doing so</strong>.
                </p>

                <div
                  style={{
                    padding: "18px 22px",
                    borderRadius: 14,
                    background: "rgba(255,102,122,0.06)",
                    border: "1px solid rgba(255,102,122,0.25)",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: 14.5,
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#ff8595", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck style={{ width: 18, height: 18, color: "#ff8595" }} />
                    <span>Please Respect Independent Student Engineering</span>
                  </div>
                  <p style={{ margin: "0 0 10px" }}>
                    ClipVault was architected and built through hundreds of late-night hours by a solo Computer Science college student with zero corporate funding or venture backing. Cracking or illicitly sharing this software does not harm a faceless multi-billion-dollar corporation — it directly deprives an independent student of tuition funds, living expenses, hardware upgrades, and the ability to make an honest living.
                  </p>
                  <div style={{ color: "rgba(255,255,255,0.75)" }}>
                    If you are a student, educator, or facing severe financial hardship and cannot afford ClipVault, please reach out directly to <strong style={{ color: "#fff" }}>@jmarkTheDeveloper</strong> on GitHub instead of turning to unauthorized or cracked copies. Let's foster a creative software culture built on mutual respect and integrity.
                  </div>
                </div>

                <h3
                  style={{
                    margin: "16px 0 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Supporting This Project
                </h3>

                <p style={{ margin: 0 }}>
                  Building and refining computer vision pipelines, multi-camera director algorithms, and cross-platform desktop installers as a student requires dedicated late-night engineering alongside university coursework.
                </p>

                <p style={{ margin: 0 }}>
                  If you purchase ClipVault AI or recommend it to fellow creators, editors, and agencies, thank you from the bottom of my heart. You are not just buying software — you are directly empowering an independent student developer to build a sustainable business, pay for education, and continue crafting powerful creator tools.
                </p>
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div
              style={{
                padding: "18px 36px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.01)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "'Geist Mono', monospace",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                ClipVault AI Video Studio • @jmarkTheDeveloper
              </span>
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                style={{
                  padding: "10px 28px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#000",
                  background: "#fff",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.85)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fff";
                }}
              >
                Close Manifesto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectSelectorScreen;

