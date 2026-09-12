import React, { useState, useEffect } from "react";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { EditorScreen } from "./screens/EditorScreen";
import { ProjectSelectorScreen } from "./screens/ProjectSelectorScreen";
import { AiClipperScreen } from "./screens/AiClipperScreen";
import { MovieRecapperScreen } from "./screens/MovieRecapperScreen";
import { LyricCreatorScreen } from "./screens/LyricCreatorScreen";
import { AiChatVideoScreen } from "./screens/AiChatVideoScreen";
import { InteractiveTour, FirstTimeWelcomeModal } from "./components/InteractiveTour";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ClipVault Error Boundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 font-bold text-xl">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">ClipVault Studio Recovered</h2>
          <p className="text-xs text-gray-400 max-w-md text-center">
            {this.state.error?.toString() || "An unexpected rendering glitch occurred. Click below to reload cleanly."}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("clipvault_history");
              window.location.reload();
            }}
            className="px-5 py-2.5 rounded-xl bg-[#00e676] text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-lg"
          >
            Reload ClipVault Cleanly
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export type Screen =
  | "project-select"
  | "ai-clipper"
  | "movie-recapper"
  | "saved-vault";

export default function App() {
  const [screen, setScreen] = useState<Screen>("project-select");
  const [clipperViewMode, setClipperViewMode] = useState<"setup" | "vault">("setup");

  // Tour States
  const [tourActive, setTourActive] = useState(false);
  const [tourType, setTourType] = useState<"clipper" | "vault">("clipper");
  const [tourStep, setTourStep] = useState(1);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(() => {
    try {
      return !localStorage.getItem("clipvault_tutorial_completed");
    } catch {
      return false;
    }
  });
  const [showVaultWelcomePrompt, setShowVaultWelcomePrompt] = useState(false);

  // Background Task State Tracking
  const [taskState, setTaskState] = useState<{
    running: boolean;
    statusText: string;
    progress: number;
    done: boolean;
    clipCount: number;
  }>({
    running: false,
    statusText: "",
    progress: 0,
    done: false,
    clipCount: 0,
  });

  const [showDoneToast, setShowDoneToast] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);

  useEffect(() => {
    const handleTaskUpdate = (e: any) => {
      if (e.detail) {
        const prevRunning = taskState.running;
        setTaskState(e.detail);
        if (e.detail.done && !e.detail.running && prevRunning) {
          setShowDoneToast(true);
          setTimeout(() => setShowDoneToast(false), 8000);
        }
      }
    };
    window.addEventListener("clipvault-task-update", handleTaskUpdate);
    return () => window.removeEventListener("clipvault-task-update", handleTaskUpdate);
  }, [taskState.running]);

  // Intercept Electron Window Close (X) & Web Unload when clipping task is active
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.onCloseRequested) {
      electronAPI.onCloseRequested(() => {
        if (taskState.running) {
          setShowExitConfirmModal(true);
        } else {
          if (electronAPI.confirmExit) {
            electronAPI.confirmExit();
          } else {
            electronAPI.quitApp();
          }
        }
      });
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (taskState.running) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [taskState.running]);

  useEffect(() => {
    // Expose quick dev tools in window console for instant testing
    (window as any).resetTutorials = () => {
      try {
        localStorage.removeItem("clipvault_tutorial_completed");
        localStorage.removeItem("clipvault_vault_tour_completed");
      } catch {}
      setShowWelcomePrompt(true);
      setShowVaultWelcomePrompt(false);
      setTourActive(false);
    };

    (window as any).startVaultTutorial = () => {
      handleStartVaultTour();
    };

    (window as any).startClipperTutorial = () => {
      handleStartTour();
    };

    // Keyboard shortcut: Ctrl + Shift + T resets all tutorials
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "T" || e.key === "t")) {
        e.preventDefault();
        (window as any).resetTutorials();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleStartTour = () => {
    setShowWelcomePrompt(false);
    setShowVaultWelcomePrompt(false);
    setTourType("clipper");
    setTourStep(1);
    setScreen("project-select");
    setTourActive(true);
  };

  const handleStartVaultTour = () => {
    setShowWelcomePrompt(false);
    setShowVaultWelcomePrompt(false);
    setTourType("vault");
    setTourStep(1);
    setScreen("ai-clipper");
    setClipperViewMode("vault");
    setTourActive(true);
  };

  const handleSkipWelcome = () => {
    setShowWelcomePrompt(false);
    try {
      localStorage.setItem("clipvault_tutorial_completed", "true");
    } catch {}
  };

  const handleSkipVaultWelcome = () => {
    setShowVaultWelcomePrompt(false);
    try {
      localStorage.setItem("clipvault_vault_tour_completed", "true");
    } catch {}
  };

  const handleNextTourStep = () => {
    if (tourType === "clipper") {
      if (tourStep === 1) {
        setClipperViewMode("setup");
        setScreen("ai-clipper");
        setTourStep(2);
      } else if (tourStep < 5) {
        setTourStep((prev) => prev + 1);
      } else {
        // Completed Tour
        setTourActive(false);
        try {
          localStorage.setItem("clipvault_tutorial_completed", "true");
        } catch {}
      }
    } else if (tourType === "vault") {
      if (tourStep < 4) {
        setTourStep((prev) => prev + 1);
      } else {
        setTourActive(false);
        try {
          localStorage.setItem("clipvault_vault_tour_completed", "true");
        } catch {}
      }
    }
  };

  const handlePrevTourStep = () => {
    if (tourType === "clipper") {
      if (tourStep === 2) {
        setScreen("project-select");
        setTourStep(1);
      } else if (tourStep > 1) {
        setTourStep((prev) => prev - 1);
      }
    } else if (tourType === "vault") {
      if (tourStep > 1) {
        setTourStep((prev) => prev - 1);
      }
    }
  };

  const handleExitTour = () => {
    setTourActive(false);
    try {
      if (tourType === "clipper") {
        localStorage.setItem("clipvault_tutorial_completed", "true");
      } else {
        localStorage.setItem("clipvault_vault_tour_completed", "true");
      }
    } catch {}
  };

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden" style={{ background: "#050505" }}>
        {screen === "project-select" && (
          <ProjectSelectorScreen
            onBack={() => {}}
            onStartTour={handleStartTour}
            onSelect={(mode) => {
              if (mode === "ai-clipper") {
                setClipperViewMode("setup");
                setScreen("ai-clipper");
                if (tourActive && tourStep === 1) {
                  setTourStep(2);
                }
              } else if (mode === "movie-recapper") {
                setScreen("movie-recapper");
              } else if (mode === "saved-vault") {
                setClipperViewMode("vault");
                setScreen("saved-vault");
              }
            }}
          />
        )}

        {/* Persistently mounted AiClipperScreen so background processing and compiler NEVER reset when going back */}
        <div style={{ display: screen === "ai-clipper" || screen === "saved-vault" ? "block" : "none", height: "100%", width: "100%" }}>
          <AiClipperScreen 
            onBack={() => setScreen("project-select")} 
            initialViewMode={clipperViewMode}
            onStartTour={handleStartTour}
            onStartVaultTour={handleStartVaultTour}
            onTriggerVaultWelcome={() => setShowVaultWelcomePrompt(true)}
          />
        </div>

        {screen === "movie-recapper" && <MovieRecapperScreen onBack={() => setScreen("project-select")} />}

        {/* First-Time Clipper Welcome Prompt Modal */}
        <FirstTimeWelcomeModal
          isOpen={showWelcomePrompt}
          tourType="clipper"
          onStartTour={handleStartTour}
          onSkip={handleSkipWelcome}
        />

        {/* First-Time Saved Vault Welcome Prompt Modal */}
        <FirstTimeWelcomeModal
          isOpen={showVaultWelcomePrompt}
          tourType="vault"
          onStartTour={handleStartVaultTour}
          onSkip={handleSkipVaultWelcome}
        />

        {/* Interactive Guided Tour Spotlight HUD */}
        <InteractiveTour
          active={tourActive}
          tourType={tourType}
          currentStep={tourStep}
          onNext={handleNextTourStep}
          onPrev={handlePrevTourStep}
          onExit={handleExitTour}
        />

        {/* Global Floating Background Task HUD when navigating other screens */}
        {taskState.running && screen !== "ai-clipper" && (
          <div
            onClick={() => {
              setClipperViewMode("setup");
              setScreen("ai-clipper");
            }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#0d0f12]/95 border border-[#00e676]/40 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_24px_rgba(0,230,118,0.25)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#00e676] hover:scale-[1.02] transition-all backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md group"
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-[#00e676]/15 border border-[#00e676]/30 flex items-center justify-center text-[#00e676]">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#00e676] rounded-full animate-ping" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
                  AI Clipping in Background
                </span>
                <span className="text-xs font-extrabold text-[#00e676]">{taskState.progress}%</span>
              </div>
              <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                {taskState.statusText || "Rendering high-resolution vertical clips..."}
              </p>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-gradient-to-r from-[#00e676] to-[#00b0ff] h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(5, taskState.progress)}%` }}
                />
              </div>
            </div>

            <div className="px-2.5 py-1.5 rounded-lg bg-white/10 group-hover:bg-[#00e676] group-hover:text-black text-gray-300 text-[11px] font-bold transition-all flex items-center gap-1 flex-shrink-0">
              View
              <span>→</span>
            </div>
          </div>
        )}

        {/* Global Floating Completion Banner */}
        {showDoneToast && screen !== "ai-clipper" && screen !== "saved-vault" && (
          <div
            onClick={() => {
              setClipperViewMode("vault");
              setScreen("saved-vault");
              setShowDoneToast(false);
            }}
            className="fixed top-6 right-6 z-[9999] bg-[#0d1f14]/95 border border-[#00e676] shadow-[0_12px_36px_rgba(0,0,0,0.9),0_0_30px_rgba(0,230,118,0.4)] rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition-all backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-[#00e676] text-black font-extrabold flex items-center justify-center text-lg shadow-lg">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                Clipping Complete
              </div>
              <p className="text-[11px] text-gray-300">
                {taskState.clipCount > 0 ? `${taskState.clipCount} viral clips generated & saved` : "Your clips are ready in Saved Vault"}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDoneToast(false);
              }}
              className="ml-2 text-gray-400 hover:text-white text-xs px-1.5 py-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Clipping Task Exit Confirmation Guard Overlay */}
        {showExitConfirmModal && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-[#0d0f12] border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_40px_rgba(245,158,11,0.25)] rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 relative overflow-hidden">
              {/* Top Warning Badge */}
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-2xl flex items-center justify-center mx-auto shadow-lg relative font-bold">
                !
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Active Clipping Task in Progress
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  ClipVault is currently processing video clips in the background ({taskState.progress}% complete). Closing the app now will cancel your active task and discard unsaved progress.
                </p>
              </div>

              {/* Progress Pill Bar */}
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-300 flex items-center gap-2 truncate max-w-[220px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse flex-shrink-0" />
                    <span className="truncate">{taskState.statusText || "Processing video clips..."}</span>
                  </span>
                  <span className="text-[#00e676] font-extrabold ml-2">{taskState.progress}%</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#00e676] to-[#00b0ff] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, taskState.progress)}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowExitConfirmModal(false);
                  }}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#00e676] text-black font-extrabold text-xs hover:brightness-110 shadow-[0_0_20px_rgba(0,230,118,0.3)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Keep Clipping in Background
                </button>

                <button
                  onClick={() => {
                    if ((window as any).electronAPI?.confirmExit) {
                      (window as any).electronAPI.confirmExit();
                    } else if ((window as any).electronAPI?.quitApp) {
                      (window as any).electronAPI.quitApp();
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  Exit & Cancel Task
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

