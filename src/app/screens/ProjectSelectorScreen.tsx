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
  Mail,
} from "lucide-react";
import { Logo } from "../components/Logo";

const G = "#00e676";

export type Mode = "ai-clipper" | "movie-recapper" | "saved-vault";

interface Props {
  onBack?: () => void;
  onSelect: (mode: Mode) => void;
  onStartTour?: () => void;
}

export function ProjectSelectorScreen({ onBack = () => {}, onSelect, onStartTour }: Props) {
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
                Independent Computer Science student developer building creator-first video AI tools.
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

          {/* Right Column: Studio Card Box & Guided Tour Link */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              id="tour-step-1-clipper-card"
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

          {/* Guided Tour link underneath the box that holds Launch Studio */}
          {onStartTour && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 12 }}>
              <button
                type="button"
                onClick={onStartTour}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5.5,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#38bdf8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
              >
                <Sparkles style={{ width: 12, height: 12, color: "#38bdf8" }} />
                <span style={{ fontWeight: 600 }}>Interactive Guided Tour</span>
              </button>
            </div>
          )}
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
                    Compliance & EULA Index
                  </span>

                  {[
                    { id: "all", label: "Complete Agreement (All)", icon: FileCheck },
                    { id: "eula", label: "01. EULA & Commercial License", icon: Scale },
                    { id: "restrictions", label: "02. Anti-Reverse Engineering", icon: Lock },
                    { id: "privacy", label: "03. Zero-Telemetry & Privacy", icon: Key },
                    { id: "platform", label: "04. Ingestion & Betamax Doctrine", icon: Globe },
                    { id: "ai", label: "05. AI Models & API Billing", icon: Zap },
                    { id: "hardware", label: "06. Hardware Acceleration & Load", icon: Cpu },
                    { id: "trademark", label: "07. Trademarks & Fair Use", icon: FileCheck },
                    { id: "liability", label: "08. Warranty & Binding Terms", icon: AlertTriangle },
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
                    <Lock style={{ width: 11, height: 11 }} /> LOCAL AUDIT ACTIVE
                  </span>
                  <div style={{ color: "rgba(255,255,255,0.45)", lineHeight: 1.4 }}>
                    • Binding EULA v1.0<br />
                    • Telemetry: 0% Collected<br />
                    • Remote Proxies: 0<br />
                    • Hardware: Native Desktop
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
                  padding: "26px 32px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 28,
                  fontSize: 12.5,
                  lineHeight: 1.7,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {/* Header & At-a-Glance Executive Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4, fontFamily: "'Space Grotesk', 'Geist', sans-serif" }}>
                      ClipVault Software License &amp; Legal Compliance Agreement
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      Effective Date: August 2026 • Published by @jmarkTheDeveloper • Applicable to all Desktop Builds &amp; Commercial Releases
                    </div>
                  </div>

                  {/* 4 Executive "At a Glance" Summary Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                    <div style={{ padding: "14px", borderRadius: 10, background: "rgba(0,230,118,0.04)", border: "1px solid rgba(0,230,118,0.18)", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <ShieldCheck style={{ width: 16, height: 16, color: G }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Zero Telemetry &amp; 100% Local</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                        All video rendering, face tracking, and neural models execute 100% locally on your computer hardware. No video or telemetry ever leaves your device.
                      </p>
                    </div>

                    <div style={{ padding: "14px", borderRadius: 10, background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.18)", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Scale style={{ width: 16, height: 16, color: "#f59e0b" }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>100% Creator Ownership</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                        You retain full intellectual property ownership, monetization rights, and commercial distribution rights to all rendered video clips with 0% developer royalties.
                      </p>
                    </div>

                    <div style={{ padding: "14px", borderRadius: 10, background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.18)", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Key style={{ width: 16, height: 16, color: "#38bdf8" }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Encrypted BYOK Security</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                        Bring-Your-Own-Key API credentials are encrypted with native OS security and dispatched directly to your chosen AI provider (Google/OpenAI) over TLS 1.3 HTTPS.
                      </p>
                    </div>

                    <div style={{ padding: "14px", borderRadius: 10, background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.18)", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Globe style={{ width: 16, height: 16, color: "#a855f7" }} />
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>Fair Use &amp; DMCA Compliant</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.5 }}>
                        Engineered for lawful, transformative content creation, educational commentary, and creator highlights in compliance with standard DMCA safe harbor guidelines.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 01: Commercial License & Asset Rights */}
                {(complianceTab === "all" || complianceTab === "eula") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: G }}>01</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Commercial License &amp; Creator Rights</span>
                    </div>
                    <p style={{ margin: 0 }}>
                      This End-User License Agreement governs the installation and commercial execution of ClipVault AI Video Studio. By downloading, executing, or creating media with ClipVault, you agree to these terms:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: "2px solid rgba(0,230,118,0.3)" }}>
                      <div><strong>• Software License Grant:</strong> You are granted a worldwide, non-exclusive, perpetual license to install and execute ClipVault AI Video Studio across your personal and commercial production machines.</div>
                      <div><strong>• Full Commercial Ownership:</strong> You retain 100% exclusive intellectual property, monetization, and commercial copyright ownership over all video clips, master renders, transcripts, and social media captions generated through the software. The Licensor collects zero revenue-share or royalties from your content.</div>
                      <div><strong>• Local-First Privacy:</strong> Your videos, source media, transcripts, and private API keys are never uploaded to any centralized ClipVault server.</div>
                    </div>
                  </div>
                )}

                {/* Section 02: Acceptable Use & Integrity */}
                {(complianceTab === "all" || complianceTab === "restrictions") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#ff667a" }}>02</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Acceptable Use &amp; Software Integrity</span>
                    </div>
                    <p style={{ margin: 0 }}>
                      To protect software security and ensure compliance with software licensing standards, the following guidelines apply:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: "2px solid rgba(255,102,122,0.3)" }}>
                      <div><strong>• Permitted Uses:</strong> You may use ClipVault for commercial video editing, YouTube/TikTok/Reels short-form content creation, podcast clipping, gaming stream summaries, and personal archival.</div>
                      <div><strong>• Software Distribution:</strong> You may not repackage, rebrand, or resell ClipVault binaries as a third-party commercial SaaS or cloud web service without explicit written authorization from the Author.</div>
                      <div><strong>• System Integrity:</strong> You agree not to distribute malicious patches, keyloggers, or unauthorized security bypasses targeting the desktop application.</div>
                    </div>
                  </div>
                )}

                {/* Section 03: Data Sovereignty & Zero-Telemetry */}
                {(complianceTab === "all" || complianceTab === "privacy") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: G }}>03</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Data Privacy &amp; Local Sovereignty</span>
                    </div>
                    <p style={{ margin: 0 }}>
                      ClipVault adheres to strict privacy-by-design standards in full compliance with GDPR, CCPA, and international data protection mandates:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: "2px solid rgba(0,230,118,0.3)" }}>
                      <div><strong>• Zero Telemetry:</strong> ClipVault contains zero analytics trackers, user behavior beacons, or background telemetry.</div>
                      <div><strong>• Local File Storage:</strong> Video frames, temporary audio waveforms, face landmark arrays, and subtitle caches are saved exclusively to your local device directories (e.g. `%LOCALAPPDATA%` / `engine/clips`).</div>
                      <div><strong>• Direct Client-to-API Communication:</strong> When Bring-Your-Own-Key (BYOK) cloud AI mode is enabled, API calls connect directly from your personal IP address to the official AI endpoint (e.g. `generativelanguage.googleapis.com`) with zero intermediate proxy servers.</div>
                    </div>
                  </div>
                )}

                {/* Section 04: Fair Use & DMCA Compliance */}
                {(complianceTab === "all" || complianceTab === "platform") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: G }}>04</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Fair Use, DMCA &amp; Content Guidelines</span>
                    </div>
                    <p style={{ margin: 0 }}>
                      ClipVault incorporates industry-standard open-source media utilities (`ffmpeg`, `yt-dlp`) similar to professional tools such as VLC, OBS Studio, and DaVinci Resolve:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: "2px solid rgba(0,230,118,0.3)" }}>
                      <div><strong>• Lawful &amp; Transformative Use:</strong> ClipVault is intended for lawful media editing, transformative commentary, critique, education, podcast highlights, and processing user-owned or licensed footage under Section 107 of the U.S. Copyright Act (Fair Use Doctrine).</div>
                      <div><strong>• Decentralized Operation:</strong> ClipVault does not host, index, or distribute third-party media content. All stream slicing is initiated directly and locally by the user.</div>
                      <div><strong>• Creator Responsibility:</strong> As with all creative editing software, users are responsible for ensuring they possess the necessary rights, licenses, or fair-use justifications for the media they publish to public social platforms.</div>
                    </div>
                  </div>
                )}

                {/* Section 05: Third-Party AI Services & Billing */}
                {(complianceTab === "all" || complianceTab === "ai") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#f59e0b" }}>05</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Third-Party AI Models &amp; Direct Billing</span>
                    </div>
                    <p style={{ margin: 0 }}>
                      ClipVault enables creators to connect directly to leading frontier AI providers (Google Gemini, Groq, OpenAI, Anthropic):
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: "2px solid rgba(245,158,11,0.3)" }}>
                      <div><strong>• Direct Billing Transparency:</strong> You manage and fund your own API keys directly with each AI provider. ClipVault does not charge markups, subscription surcharges, or hidden token fees.</div>
                      <div><strong>• Free Local Fallback:</strong> In the event of API rate limits or quota depletion, ClipVault provides 100% free local CPU/GPU fallback processing using faster-whisper and rule-based heuristic highlight selectors.</div>
                    </div>
                  </div>
                )}

                {/* Section 06: Hardware Acceleration */}
                {(complianceTab === "all" || complianceTab === "hardware") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#38bdf8" }}>06</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Hardware Acceleration &amp; System Performance</span>
                    </div>
                    <p style={{ margin: 0 }}>
                      ClipVault utilizes native hardware encoders (Intel QuickSync, NVIDIA NVENC, AMD AMF) and MediaPipe computer vision:
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: "2px solid rgba(56,189,248,0.3)" }}>
                      <div><strong>• GPU Acceleration:</strong> Rendering pipelines automatically detect and optimize for your available GPU hardware for fast exports.</div>
                      <div><strong>• Storage Management:</strong> The built-in storage manager automatically cleans temporary working files after export to keep your disk space optimal.</div>
                    </div>
                  </div>
                )}

                {/* Section 07: Trademark Attributions */}
                {(complianceTab === "all" || complianceTab === "trademark") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#a855f7" }}>07</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Trademark &amp; Brand Disclaimers</span>
                    </div>
                    <div style={{ padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                      YouTube™ &amp; Google™ are trademarks of Google LLC. TikTok™ is a trademark of ByteDance Ltd. Instagram™ &amp; Meta™ are trademarks of Meta Platforms, Inc. OpenAI™, Groq™, Anthropic™, NVIDIA™, Intel™, and AMD™ are trademarks of their respective owners. Mention of these trademarks in ClipVault does not imply affiliation, sponsorship, or endorsement.
                    </div>
                  </div>
                )}

                {/* Section 08: Standard Disclaimers & Contact */}
                {(complianceTab === "all" || complianceTab === "liability") && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 800, color: "#ef4444" }}>08</span>
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
                      <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>Standard Warranty Disclaimers &amp; Inquiries</span>
                    </div>
                    <div style={{ padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. UNDER NO CIRCUMSTANCES SHALL THE AUTHOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OR INABILITY TO USE THE SOFTWARE.
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                      <span>For software support, feature requests, or legal inquiries, contact:</span>
                      <a href="mailto:jmarkthedeveloper@gmail.com" style={{ color: G, textDecoration: "none", fontWeight: 700 }}>
                        jmarkthedeveloper@gmail.com
                      </a>
                    </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <a
                  href="mailto:jmarkthedeveloper@gmail.com"
                  style={{
                    fontSize: 11.5,
                    color: G,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                >
                  <Mail style={{ width: 12, height: 12 }} />
                  <span>jmarkthedeveloper@gmail.com</span>
                </a>

                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>•</span>

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
                  Exclusive Commercial License © 2026 @jmarkTheDeveloper
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

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <a
                    href="mailto:jmarkthedeveloper@gmail.com"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "7px 14px",
                      borderRadius: 8,
                      background: "rgba(0,230,118,0.08)",
                      border: "1px solid rgba(0,230,118,0.25)",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Geist Mono', monospace",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(0,230,118,0.18)";
                      e.currentTarget.style.borderColor = "rgba(0,230,118,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(0,230,118,0.08)";
                      e.currentTarget.style.borderColor = "rgba(0,230,118,0.25)";
                    }}
                  >
                    <Mail style={{ width: 13, height: 13, color: G }} />
                    <span>jmarkthedeveloper@gmail.com</span>
                  </a>

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
                <p style={{ margin: 0, textAlign: "justify" }}>
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
                    textAlign: "justify",
                  }}
                >
                  "Creators shouldn't be forced to rent their editing workflow from cloud servers when their own computer has all the processing power needed to do it locally, privately, and for free."
                </div>

                <p style={{ margin: 0, textAlign: "justify" }}>
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
                    textAlign: "justify",
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

                <p style={{ margin: 0, textAlign: "justify" }}>
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
                    textAlign: "justify",
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

                <p style={{ margin: 0, textAlign: "justify" }}>
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
                    textAlign: "justify",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#ff8595", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldCheck style={{ width: 18, height: 18, color: "#ff8595" }} />
                    <span>Please Respect Independent Student Engineering</span>
                  </div>
                  <p style={{ margin: "0 0 10px", textAlign: "justify" }}>
                    ClipVault was architected and built through hundreds of late-night hours by a solo Computer Science college student with zero corporate funding or venture backing. Cracking or illicitly sharing this software does not harm a faceless multi-billion-dollar corporation — it directly deprives an independent student of tuition funds, living expenses, hardware upgrades, and the ability to make an honest living.
                  </p>
                  <div style={{ color: "rgba(255,255,255,0.75)", textAlign: "justify" }}>
                    If you are a student, educator, or facing severe financial hardship and cannot afford ClipVault, please reach out directly to <strong style={{ color: "#fff" }}>@jmarkTheDeveloper</strong> on GitHub or email <a href="mailto:jmarkthedeveloper@gmail.com" style={{ color: "#fff", textDecoration: "underline", fontWeight: 700 }}>jmarkthedeveloper@gmail.com</a> instead of turning to unauthorized or cracked copies. Let's foster a creative software culture built on mutual respect and integrity.
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

                <p style={{ margin: 0, textAlign: "justify" }}>
                  Building and refining computer vision pipelines, multi-camera director algorithms, and cross-platform desktop installers as a student requires dedicated late-night engineering alongside university coursework.
                </p>

                <p style={{ margin: 0, textAlign: "justify" }}>
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

