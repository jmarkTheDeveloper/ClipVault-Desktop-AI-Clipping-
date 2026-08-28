import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft, X, CheckCircle2, ChevronRight, Zap, Target } from "lucide-react";

export interface TourStepOption {
  label: string;
  desc: string;
  badge?: string;
  badgeColor?: string;
}

export interface TourStepInfo {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  options?: TourStepOption[];
  targetId: string;
  position?: "bottom" | "top" | "left" | "right";
}

export const TOUR_STEPS: TourStepInfo[] = [
  {
    step: 1,
    title: "Choose Studio Mode",
    subtitle: "Step 1 of 5 • Project Selector",
    description: "Select your creation workflow to begin:",
    options: [
      {
        label: "AI Video Clipper Studio",
        desc: "Convert podcasts, gaming streams, and long horizontal videos into viral 9:16 Shorts with MediaPipe face tracking.",
        badge: "Core Engine",
        badgeColor: "#00e676",
      },
    ],
    targetId: "tour-step-1-clipper-card",
    position: "bottom",
  },
  {
    step: 2,
    title: "Ingest Video or Stream",
    subtitle: "Step 2 of 5 • Stream Slicing",
    description: "Choose how you want to provide your video footage:",
    options: [
      {
        label: "YouTube / Stream Link",
        desc: "Paste any YouTube, Twitch, or web URL. ClipVault automatically extracts high-bitrate video and indexes peak moments.",
        badge: "Online Stream",
        badgeColor: "#ef4444",
      },
      {
        label: "Local File Upload",
        desc: "Select an MP4, MOV, MKV, or WEBM file from your PC for 100% private, instant zero-latency processing.",
        badge: "Local Disk",
        badgeColor: "#38bdf8",
      },
    ],
    targetId: "tour-step-2-ingest",
    position: "right",
  },
  {
    step: 3,
    title: "Select Multi-Model AI Engine",
    subtitle: "Step 3 of 5 • AI Brain",
    description: "Choose the intelligence model that will detect your viral hooks:",
    options: [
      {
        label: "Groq LPU (Llama 3.3 70B)",
        desc: "Lightning 500+ tokens/sec transcription with free BYOK keys.",
        badge: "Fast & Free",
        badgeColor: "#fbbf24",
      },
      {
        label: "Gemini 2.5 / OpenAI GPT-4o",
        desc: "Deep cognitive multimodal understanding of humor, punches, and viral moments.",
        badge: "High IQ",
        badgeColor: "#a855f7",
      },
    ],
    targetId: "tour-step-3-engine",
    position: "right",
  },
  {
    step: 4,
    title: "AI Face Tracking & Auto-Reframe",
    subtitle: "Step 4 of 5 • Computer Vision",
    description: "Smart cropping configurations for mobile platforms:",
    options: [
      {
        label: "Auto Face-Tracking (9:16)",
        desc: "MediaPipe computer vision tracks the active speaker smoothly across horizontal video frames.",
        badge: "AI Vision",
        badgeColor: "#00e676",
      },
      {
        label: "Satisfying Gameplay Split",
        desc: "Stacks speaker on top with Subway Surfers or GTA gameplay on the bottom.",
        badge: "Split-Screen",
        badgeColor: "#38bdf8",
      },
    ],
    targetId: "tour-step-4-reframe",
    position: "right",
  },
  {
    step: 5,
    title: "Viral Captions & Hardware Export",
    subtitle: "Step 5 of 5 • Final Export",
    description: "Finalize dynamic typography and render your short-form master:",
    options: [
      {
        label: "CapCut & Opus Kinetic Subtitles",
        desc: "Word-by-word highlighted text with sound effects and animated emojis.",
        badge: "High Retention",
        badgeColor: "#fbbf24",
      },
      {
        label: "Hardware-Accelerated Render",
        desc: "Intel QSV & GPU acceleration exports clean MP4s straight to your hard drive.",
        badge: "Lossless Export",
        badgeColor: "#00e676",
      },
    ],
    targetId: "tour-step-5-export",
    position: "top",
  },
];

interface Props {
  active: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export const InteractiveTour: React.FC<Props> = ({
  active,
  currentStep,
  onNext,
  onPrev,
  onExit,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const stepInfo = TOUR_STEPS.find((s) => s.step === currentStep) || TOUR_STEPS[0];

  useEffect(() => {
    if (!active) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.getElementById(stepInfo.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, currentStep, stepInfo.targetId]);

  if (!active) return null;

  const isLastStep = currentStep === TOUR_STEPS.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Backdrop Blur Layer with Cutout Hole: Background is blurred, target is 100% sharp */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          clipPath: targetRect
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${targetRect.left - 8}px 100%, 
                ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                ${targetRect.left + targetRect.width + 8}px ${targetRect.top - 8}px, 
                ${targetRect.left + targetRect.width + 8}px ${targetRect.top + targetRect.height + 8}px, 
                ${targetRect.left - 8}px ${targetRect.top + targetRect.height + 8}px, 
                ${targetRect.left - 8}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : "none",
          zIndex: 9998,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight Frame: Giant 9999px box shadow darkens the rest of the screen while keeping the hole clear */}
      {targetRect && (
        <div
          style={{
            position: "absolute",
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            borderRadius: 16,
            border: "2.5px solid #00e676",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 45px rgba(0, 230, 118, 0.65), inset 0 0 25px rgba(0, 230, 118, 0.35)",
            pointerEvents: "none",
            animation: "pulseGlow 2s infinite ease-in-out",
            zIndex: 10000,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Animated Target Reticle / Pointer Tag */}
          <div
            style={{
              position: "absolute",
              top: -15,
              left: 16,
              background: "#00e676",
              color: "#000",
              fontSize: 11,
              fontWeight: 800,
              fontFamily: "'Geist Mono', monospace",
              padding: "3px 10px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "0 4px 16px rgba(0,230,118,0.6)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <Target style={{ width: 12, height: 12 }} />
            <span>Target Action</span>
          </div>
        </div>
      )}

      {/* Floating Interactive Guide HUD (Centered at Bottom) */}
      <div
        style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(640px, 92vw)",
          background: "#0d0d11",
          border: "1px solid rgba(0, 230, 118, 0.4)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.9), 0 0 30px rgba(0, 230, 118, 0.2)",
          borderRadius: 18,
          padding: "20px 24px",
          pointerEvents: "auto",
          zIndex: 10001,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animation: "slideUpHUD 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header Row: Badge & Exit */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "rgba(0,230,118,0.15)",
                border: "1px solid #00e676",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#00e676",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {currentStep}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "'Geist Mono', monospace",
                fontWeight: 700,
                color: "#00e676",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {stepInfo.subtitle}
            </span>
          </div>

          <button
            type="button"
            onClick={onExit}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ff667a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <span>Exit Tour</span>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Middle Row: Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
              {stepInfo.title}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              {stepInfo.description}
            </div>
          </div>

          {/* Option Breakdown Cards (YouTube vs Local Upload, AI Engines, etc.) */}
          {stepInfo.options && stepInfo.options.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: stepInfo.options.length > 1 ? "1fr 1fr" : "1fr",
                gap: 10,
                marginTop: 2,
              }}
            >
              {stepInfo.options.map((opt) => (
                <div
                  key={opt.label}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
                      {opt.label}
                    </span>
                    {opt.badge && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          fontFamily: "'Geist Mono', monospace",
                          padding: "1.5px 6px",
                          borderRadius: 4,
                          background: opt.badgeColor ? `${opt.badgeColor}18` : "rgba(255,255,255,0.1)",
                          color: opt.badgeColor || "#fff",
                          border: `1px solid ${opt.badgeColor ? `${opt.badgeColor}40` : "rgba(255,255,255,0.2)"}`,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: "rgba(255, 255, 255, 0.55)", lineHeight: 1.45 }}>
                    {opt.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Row: Progress Dots & Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 10,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Step Dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {TOUR_STEPS.map((s) => (
              <div
                key={s.step}
                style={{
                  width: s.step === currentStep ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: s.step === currentStep ? "#00e676" : s.step < currentStep ? "rgba(0,230,118,0.5)" : "rgba(255,255,255,0.15)",
                  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={onPrev}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <ArrowLeft style={{ width: 13, height: 13 }} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={onNext}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                borderRadius: 8,
                background: "#00e676",
                border: "none",
                color: "#000",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(0, 230, 118, 0.35)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#33eb91";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#00e676";
                e.currentTarget.style.transform = "none";
              }}
            >
              <span>{isLastStep ? "Finish Tour 🎉" : "Next Step"}</span>
              <ArrowRight style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe Styles */}
      <style>{`
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 25px rgba(0, 230, 118, 0.35), inset 0 0 15px rgba(0, 230, 118, 0.2);
            border-color: #00e676;
          }
          50% {
            box-shadow: 0 0 45px rgba(0, 230, 118, 0.7), inset 0 0 25px rgba(0, 230, 118, 0.4);
            border-color: #55f5a8;
          }
        }
        @keyframes slideUpHUD {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
};

export const FirstTimeWelcomeModal: React.FC<{
  isOpen: boolean;
  onStartTour: () => void;
  onSkip: () => void;
}> = ({ isOpen, onStartTour, onSkip }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(14px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
      onClick={onSkip}
    >
      <div
        style={{
          width: "min(520px, 94vw)",
          background: "#0c0c10",
          border: "1px solid rgba(0, 230, 118, 0.35)",
          boxShadow: "0 32px 100px rgba(0,0,0,0.95), 0 0 40px rgba(0, 230, 118, 0.2)",
          borderRadius: 24,
          padding: "32px 36px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          position: "relative",
          animation: "scaleInModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(0,230,118,0.1)",
              border: "1px solid rgba(0,230,118,0.3)",
              color: "#00e676",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "'Geist Mono', monospace",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <Sparkles style={{ width: 12, height: 12 }} />
            <span>Welcome Creator</span>
          </div>

          <button
            type="button"
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.4)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Title & Body */}
        <div>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: 22,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            Are you new to ClipVault AI?
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
            }}
          >
            Take a 45-second interactive guided walkthrough to see how smart stream slicing, AI face tracking, and viral CapCut-style typography work.
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onStartTour}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 12,
              background: "#00e676",
              border: "none",
              color: "#000",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 0 24px rgba(0, 230, 118, 0.4)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#33eb91";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#00e676";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span>Start Interactive Tour</span>
            <ArrowRight style={{ width: 15, height: 15 }} />
          </button>

          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.75)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "rgba(255,255,255,0.75)";
            }}
          >
            Skip for Now
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleInModal {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

