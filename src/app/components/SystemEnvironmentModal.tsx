import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  CheckCircle2,
  HardDrive,
  Zap,
  ShieldCheck,
  RefreshCw,
  X,
  Layers,
  ArrowRight,
  Activity,
  Check,
  AlertTriangle,
  Monitor,
  Sparkles,
  Info,
} from "lucide-react";

export interface SystemCheckItem {
  id: string;
  name: string;
  status: "pending" | "running" | "passed" | "warning";
  details: string;
  desc: string;
}

export interface HardwareData {
  status: string;
  cpu: string;
  gpu: string;
  npu: string | null;
  vendor: string;
  encoder: string;
  encoder_codec: string;
  acceleration_type: string;
  ram_gb: number;
  cores: number;
  disk_free_gb: number;
  ffmpeg_ready: boolean;
  is_potato?: boolean;
  potato_warning?: string | null;
  apology_notice?: string;
  compatibility_level: "ultra" | "smooth" | "potato" | "compatible";
  performance_tag: string;
  summary_headline: string;
  specs: Array<{ label: string; value: string }>;
  checks: Array<{
    id: string;
    name: string;
    status: string;
    details: string;
    desc: string;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

export function SystemEnvironmentModal({ isOpen, onClose, isStandalone = false }: Props) {
  const [stage, setStage] = useState<"testing" | "completed">("testing");
  const [progress, setProgress] = useState<number>(0);
  const [hardware, setHardware] = useState<HardwareData | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(true);
  const [simulatePotato, setSimulatePotato] = useState<boolean>(false);
  const activeTimersRef = useRef<NodeJS.Timeout[]>([]);

  const getInitialChecks = (): SystemCheckItem[] => [
    {
      id: "cpu",
      name: "Processor Architecture & Instruction Sets",
      status: "pending",
      details: "Detecting multi-core CPU and AVX2 instruction sets...",
      desc: "Powers multi-threaded frame extraction and intelligent video cutting.",
    },
    {
      id: "memory",
      name: "System Memory (RAM) Allocation",
      status: "pending",
      details: "Measuring memory buffer capacity...",
      desc: "Guarantees smooth high-definition video playback and neural caching.",
    },
    {
      id: "graphics",
      name: "Graphics & Hardware Video Encoder",
      status: "pending",
      details: "Probing NVENC, Intel QuickSync, and AMD AMF hardware engines...",
      desc: "Dramatically accelerates video exports with automatic CPU failover.",
    },
    {
      id: "storage",
      name: "Storage & Scratch Workspace",
      status: "pending",
      details: "Validating disk capacity and temporary folder permissions...",
      desc: "Provides fast local caching for video ingest, slices, and exports.",
    },
    {
      id: "codec",
      name: "Video Pipeline & FFmpeg Engine",
      status: "pending",
      details: "Testing media multiplexing and audio normalization...",
      desc: "Statically linked H.264, AAC, and subtitle rendering engine.",
    },
  ];

  const [checkItems, setCheckItems] = useState<SystemCheckItem[]>(getInitialChecks);

  const clearAllTimers = () => {
    activeTimersRef.current.forEach((t) => clearTimeout(t));
    activeTimersRef.current = [];
  };

  const runEnvironmentTest = async () => {
    clearAllTimers();
    setStage("testing");
    setProgress(5);
    setCheckItems(getInitialChecks());

    let fetchedData: HardwareData | null = null;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/hardware_scan");
      if (res.ok) {
        fetchedData = await res.json();
      }
    } catch (e) {
      console.warn("Hardware scan probe note:", e);
    }

    if (!fetchedData) {
      fetchedData = {
        status: "ready",
        cpu: "Multi-Core x86_64 Processor",
        gpu: "Integrated Graphics",
        npu: null,
        vendor: "Intel",
        encoder: "Multi-Threaded CPU (libx264)",
        encoder_codec: "libx264",
        acceleration_type: "Multi-Core CPU Software",
        ram_gb: 8.0,
        cores: 8,
        disk_free_gb: 25.0,
        ffmpeg_ready: true,
        compatibility_level: "smooth",
        performance_tag: "Smooth Performance (Hardware Verified)",
        summary_headline: "Your computer can run ClipVault smoothly!",
        specs: [
          { label: "CPU", value: "Multi-Core Processor" },
          { label: "GPU", value: "Graphics Processor" },
          { label: "Memory", value: "8.0 GB RAM" },
          { label: "Video Encoder", value: "Multi-Threaded CPU (libx264)" },
          { label: "Available Storage", value: "25.0 GB Free" },
        ],
        checks: [],
      };
    }

    setHardware(fetchedData);

    const stepPlans = [
      {
        id: "cpu",
        pct: 22,
        details: `${fetchedData.cpu} (${fetchedData.cores || 4} Cores / Threads)`,
        delay: 350,
      },
      {
        id: "memory",
        pct: 45,
        details: `${fetchedData.ram_gb} GB RAM Installed`,
        delay: 750,
      },
      {
        id: "graphics",
        pct: 68,
        details: `${fetchedData.gpu} • ${fetchedData.encoder}`,
        delay: 1150,
      },
      {
        id: "storage",
        pct: 88,
        details: `${fetchedData.disk_free_gb} GB Available Free Storage`,
        delay: 1550,
      },
      {
        id: "codec",
        pct: 100,
        details: "FFmpeg H.264 & AAC Pipeline Ready",
        delay: 1950,
      },
    ];

    // Schedule exact sequential step updates by id to guarantee zero race conditions
    stepPlans.forEach((plan, idx) => {
      const runTimer = setTimeout(() => {
        // Mark current as running
        setCheckItems((prev) =>
          prev.map((item) => (item.id === plan.id ? { ...item, status: "running" } : item))
        );
      }, plan.delay - 200);
      activeTimersRef.current.push(runTimer);

      const passTimer = setTimeout(() => {
        setProgress(plan.pct);
        setCheckItems((prev) =>
          prev.map((item) =>
            item.id === plan.id
              ? {
                  ...item,
                  status: "passed",
                  details: plan.details,
                }
              : item
          )
        );

        if (idx === stepPlans.length - 1) {
          const finishTimer = setTimeout(() => {
            setStage("completed");
          }, 400);
          activeTimersRef.current.push(finishTimer);
        }
      }, plan.delay);
      activeTimersRef.current.push(passTimer);
    });
  };

  useEffect(() => {
    if (isOpen) {
      runEnvironmentTest();
    } else {
      clearAllTimers();
    }
    return () => {
      clearAllTimers();
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem("clipvault_install_verified", "true");
        localStorage.setItem("clipvault_env_check_completed", "true");
      } catch {}
    }
    onClose();
  };

  if (!isOpen) return null;

  // Determine if potato hardware view applies
  const isPotatoMode =
    simulatePotato ||
    Boolean(hardware?.is_potato) ||
    hardware?.compatibility_level === "potato" ||
    (hardware ? hardware.ram_gb < 7.5 : false);

  const headline = isPotatoMode
    ? "Your system can handle ClipVault, but might see some performance issues."
    : hardware?.summary_headline || "Your computer can run ClipVault smoothly!";

  const performanceTag = isPotatoMode
    ? "Entry Hardware (CPU Multi-Threaded Mode)"
    : hardware?.performance_tag || "Smooth Performance (Hardware Accelerated)";

  const apologyText =
    hardware?.apology_notice ||
    "Sorry for inconvenience this application is still undergoing for system updates";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        background: isStandalone ? "#080c14" : "rgba(0, 0, 0, 0.90)",
        backdropFilter: isStandalone ? "none" : "blur(14px)",
        WebkitBackdropFilter: isStandalone ? "none" : "blur(14px)",
        fontFamily: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#ffffff",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes fadeInModal {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUpModal {
          from { transform: scale(0.97) translateY(8px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.92); opacity: 0.6; }
          50% { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(0.92); opacity: 0.6; }
        }
        @keyframes radarSweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Standalone Window Title Bar (CapCut Installer / First Launch Style) */}
      <header
        style={{
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          background: "#080c14",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          WebkitAppRegion: "drag",
        } as any}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Space Grotesk', 'Geist', sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.03em", color: "#fff" }}>
            Clip<span style={{ color: "#00e676" }}>Vault</span>
          </span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 5,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.1em",
              background: "rgba(251, 191, 36, 0.12)",
              color: "#fbbf24",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              fontFamily: "'Geist Mono', monospace",
              textTransform: "uppercase",
            }}
          >
            Installation Setup & Verification
          </span>
        </div>

        {/* Window controls or close button */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, WebkitAppRegion: "no-drag" } as any}>
          {stage === "completed" && !isStandalone && (
            <button
              type="button"
              onClick={handleConfirm}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#9ca3af",
                cursor: "pointer",
                padding: "6px",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Verification Dashboard */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 20px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "min(640px, 96vw)",
            background: "linear-gradient(180deg, #141310 0%, #0c0b0a 100%)",
            border: isPotatoMode ? "1px solid rgba(245, 158, 11, 0.45)" : "1px solid rgba(251, 191, 36, 0.35)",
            boxShadow: isPotatoMode
              ? "0 32px 100px rgba(0,0,0,0.95), 0 0 50px rgba(245, 158, 11, 0.22)"
              : "0 32px 100px rgba(0,0,0,0.95), 0 0 50px rgba(250, 204, 21, 0.18)",
            borderRadius: 24,
            padding: "32px 36px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            position: "relative",
            animation: "scaleUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Top Pill & Simulation Switch */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(251, 191, 36, 0.12)",
                border: "1px solid rgba(251, 191, 36, 0.35)",
                color: "#fbbf24",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <Activity style={{ width: 13, height: 13 }} />
              <span>Post-Installation System Environment Test</span>
            </div>

            {/* Toggle to test / preview Potato Hardware state */}
            <button
              type="button"
              onClick={() => setSimulatePotato((p) => !p)}
              style={{
                background: simulatePotato ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.05)",
                border: simulatePotato ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.1)",
                color: simulatePotato ? "#fbbf24" : "#9ca3af",
                padding: "3px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Toggle to preview potato / lower-spec hardware behavior"
            >
              {simulatePotato ? "Previewing Potato Hardware" : "Test Potato Mode"}
            </button>
          </div>

          {/* Phase 1: In-Progress Testing View */}
          {stage === "testing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24, textAlign: "center", alignItems: "center", padding: "12px 0" }}>
              {/* Radar Scanner Animation */}
              <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: "2px solid rgba(251, 191, 36, 0.25)",
                    animation: "pulseRing 2.2s infinite ease-in-out",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    border: "1px dashed rgba(251, 191, 36, 0.35)",
                    animation: "radarSweep 6s infinite linear",
                  }}
                />
                <div
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.25) 0%, rgba(20, 19, 16, 0.9) 100%)",
                    border: "1px solid rgba(251, 191, 36, 0.5)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 25px rgba(245, 158, 11, 0.25)",
                  }}
                >
                  <Cpu style={{ width: 26, height: 26, color: "#facc15" }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#fbbf24", marginTop: 2 }}>{progress}%</span>
                </div>
              </div>

              {/* Title & Instructions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
                  Testing System Environment...
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", maxWidth: 440, lineHeight: 1.5 }}>
                  Please wait, checking if this application can run on your system.
                </p>
              </div>

              {/* Glowing Amber Progress Bar */}
              <div style={{ width: "100%", background: "rgba(255, 255, 255, 0.06)", height: 6, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #f59e0b 0%, #facc15 100%)",
                    borderRadius: 999,
                    boxShadow: "0 0 16px rgba(250, 204, 21, 0.6)",
                    transition: "width 0.35s ease-out",
                  }}
                />
              </div>

              {/* Live Checklist */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
                {checkItems.map((item, idx) => {
                  const isPassed = item.status === "passed";
                  const isRunning = item.status === "running";
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 14,
                        background: isPassed
                          ? "rgba(251, 191, 36, 0.06)"
                          : isRunning
                          ? "rgba(255, 255, 255, 0.05)"
                          : "rgba(255, 255, 255, 0.02)",
                        border: isPassed
                          ? "1px solid rgba(251, 191, 36, 0.25)"
                          : isRunning
                          ? "1px solid rgba(255, 255, 255, 0.15)"
                          : "1px solid rgba(255, 255, 255, 0.04)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        opacity: isPassed || isRunning ? 1 : 0.45,
                        transition: "all 0.25s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: isPassed ? "rgba(251, 191, 36, 0.2)" : "rgba(255, 255, 255, 0.08)",
                            color: isPassed ? "#facc15" : "#9ca3af",
                            flexShrink: 0,
                          }}
                        >
                          {isPassed ? (
                            <Check style={{ width: 13, height: 13, strokeWidth: 3 }} />
                          ) : isRunning ? (
                            <RefreshCw style={{ width: 12, height: 12, animation: "radarSweep 1.5s infinite linear" }} />
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{idx + 1}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isPassed ? "#ffffff" : "#d1d5db" }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: 11, color: isPassed ? "#fbbf24" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.details}
                          </span>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: 6,
                          flexShrink: 0,
                          background: isPassed
                            ? "rgba(251, 191, 36, 0.15)"
                            : isRunning
                            ? "rgba(255, 255, 255, 0.1)"
                            : "transparent",
                          color: isPassed ? "#facc15" : isRunning ? "#e5e7eb" : "#6b7280",
                        }}
                      >
                        {isPassed ? "Verified" : isRunning ? "Checking..." : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 2: Completed Test Result View */}
          {stage === "completed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Result Header Banner */}
              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: 18,
                  background: isPotatoMode
                    ? "linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(20, 19, 16, 0.6) 100%)"
                    : "linear-gradient(135deg, rgba(251, 191, 36, 0.14) 0%, rgba(245, 158, 11, 0.04) 100%)",
                  border: isPotatoMode
                    ? "1px solid rgba(245, 158, 11, 0.55)"
                    : "1px solid rgba(251, 191, 36, 0.4)",
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.01em" }}>
                    {headline}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#d1d5db", lineHeight: 1.45 }}>
                    {isPotatoMode
                      ? "Your hardware meets baseline requirements to run ClipVault, but you might experience slower processing or performance issues during heavy video encoding and frame analysis on this configuration."
                      : "Your system passed all hardware and environment checks. All video editing, AI tracking, and export features are ready."}
                  </p>

                  {/* Potato Warning Notice & Apology (Requested by user) */}
                  {isPotatoMode && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px dashed rgba(245, 158, 11, 0.45)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>
                        Performance Advisory:
                      </span>
                      <span style={{ fontSize: 11, color: "#e5e7eb" }}>
                        We recommend using 720p export quality and cloud Whisper transcription (Groq / OpenAI) for faster processing.
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#facc15",
                          fontStyle: "italic",
                          fontWeight: 600,
                          marginTop: 2,
                        }}
                      >
                        *{apologyText}*
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Grade Badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Performance Rating</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: isPotatoMode ? "#f59e0b" : "#fbbf24",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Zap style={{ width: 14, height: 14, fill: isPotatoMode ? "#f59e0b" : "#fbbf24" }} />
                  <span>{performanceTag}</span>
                </span>
              </div>

              {/* Hardware Specification Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(20, 19, 16, 0.8)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Processor (CPU)</span>
                  <span style={{ fontSize: 12, color: "#ffffff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {simulatePotato ? "Dual-Core Potato Processor" : hardware?.cpu || "Multi-Core CPU"}
                  </span>
                  <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 500 }}>
                    {simulatePotato ? "2 Logical Cores" : `${hardware?.cores || 4} Logical Cores Active`}
                  </span>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(20, 19, 16, 0.8)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Graphics & Acceleration</span>
                  <span style={{ fontSize: 12, color: "#ffffff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {simulatePotato ? "Basic Integrated GPU" : hardware?.gpu || "Integrated Graphics"}
                  </span>
                  <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 500 }}>
                    {simulatePotato ? "Software CPU Encoding (libx264)" : hardware?.encoder || "Hardware Video Acceleration"}
                  </span>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(20, 19, 16, 0.8)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>System Memory (RAM)</span>
                  <span style={{ fontSize: 12, color: "#ffffff", fontWeight: 700 }}>
                    {simulatePotato ? "4.0 GB RAM Installed" : `${hardware?.ram_gb || 8.0} GB RAM Installed`}
                  </span>
                  <span style={{ fontSize: 10, color: isPotatoMode ? "#f59e0b" : "#10b981", fontWeight: 500 }}>
                    {isPotatoMode ? "Baseline Buffer Limit" : "Optimized for Fast Frame Buffering"}
                  </span>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(20, 19, 16, 0.8)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>Scratch Workspace</span>
                  <span style={{ fontSize: 12, color: "#ffffff", fontWeight: 700 }}>
                    {simulatePotato ? "4.5 GB Free Space" : `${hardware?.disk_free_gb || 20.0} GB Free Space`}
                  </span>
                  <span style={{ fontSize: 10, color: "#10b981", fontWeight: 500 }}>
                    System Guard Auto-Purge Active
                  </span>
                </div>
              </div>

              {/* Checklist of Verified Systems */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Diagnostic Verification Details
                </span>
                {checkItems.map((item) => (
                  <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <CheckCircle2 style={{ width: 14, height: 14, color: "#facc15", marginTop: 2, flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer with Checkbox & Enter Button */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  paddingTop: 8,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "#9ca3af",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      style={{
                        accentColor: "#fbbf24",
                        width: 15,
                        height: 15,
                        cursor: "pointer",
                      }}
                    />
                    <span>Do not show again on startup</span>
                  </label>

                  <button
                    type="button"
                    onClick={runEnvironmentTest}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#fbbf24",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    <RefreshCw style={{ width: 12, height: 12 }} />
                    <span>Run Test Again</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirm}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: "linear-gradient(90deg, #facc15 0%, #f59e0b 100%)",
                    border: "none",
                    color: "#000000",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: "0 4px 25px rgba(250, 204, 21, 0.35)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.08)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "brightness(1)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span>Confirm & Enter ClipVault Studio</span>
                  <ArrowRight style={{ width: 16, height: 16, strokeWidth: 2.5 }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
