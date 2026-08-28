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

  // Interactive Guided Tour State
  const [tourActive, setTourActive] = useState<boolean>(false);
  const [tourType, setTourType] = useState<"clipper" | "vault">("clipper");
  const [tourStep, setTourStep] = useState<number>(1);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState<boolean>(false);
  const [showVaultWelcomePrompt, setShowVaultWelcomePrompt] = useState<boolean>(false);

  useEffect(() => {
    try {
      const completed = localStorage.getItem("clipvault_tutorial_completed");
      if (!completed) {
        setShowWelcomePrompt(true);
      }
    } catch {}
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
      </div>
    </ErrorBoundary>
  );
}

