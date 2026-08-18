import React, { useState } from "react";
import { LoginScreen } from "./screens/LoginScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { EditorScreen } from "./screens/EditorScreen";
import { ProjectSelectorScreen } from "./screens/ProjectSelectorScreen";
import { AiClipperScreen } from "./screens/AiClipperScreen";
import { MovieRecapperScreen } from "./screens/MovieRecapperScreen";
import { LyricCreatorScreen } from "./screens/LyricCreatorScreen";
import { AiChatVideoScreen } from "./screens/AiChatVideoScreen";

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
  | "movie-recapper";

export default function App() {
  const [screen, setScreen] = useState<Screen>("project-select");

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen overflow-hidden" style={{ background: "#050505" }}>
        {screen === "project-select" && (
          <ProjectSelectorScreen
            onBack={() => {}}
            onSelect={(mode) => {
              if (mode === "ai-clipper")     setScreen("ai-clipper");
              else if (mode === "movie-recapper") setScreen("movie-recapper");
            }}
          />
        )}
        {screen === "ai-clipper"     && (
          <AiClipperScreen 
            onBack={() => setScreen("project-select")} 
          />
        )}
        {screen === "movie-recapper" && <MovieRecapperScreen onBack={() => setScreen("project-select")} />}
      </div>
    </ErrorBoundary>
  );
}
