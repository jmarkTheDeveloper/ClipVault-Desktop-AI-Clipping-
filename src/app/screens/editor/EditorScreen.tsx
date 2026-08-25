import React, { useEffect, useState } from "react";
import { ArrowLeft, Download, Share2, Settings, X, Film, CheckCircle2 } from "lucide-react";
import { EditorProvider, useEditor } from "./hooks/EditorContext";
import { usePlayback } from "./hooks/usePlayback";
import { useTimelineDrag } from "./hooks/useTimelineDrag";
import { MediaLibraryPanel } from "./components/MediaLibraryPanel";
import { PreviewPlayer } from "./components/PreviewPlayer";
import { TimelineContainer } from "./components/Timeline/TimelineContainer";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Logo } from "../../components/Logo";
import { GOOGLE_FONTS, MEDIA_LIBRARY } from "../../utils/types";
import { useRef } from "react";

// Left tools configuration
import { Wand2, Music, Type, Sparkles, Palette, Layers, Zap } from "lucide-react";

const LEFT_TOOLS = [
  { id: "ai", icon: Wand2, label: "AI Magic" },
  { id: "media", icon: Film, label: "Media" },
  { id: "audio", icon: Music, label: "Audio" },
  { id: "text", icon: Type, label: "Text" },
  { id: "effects", icon: Sparkles, label: "Effects" },
  { id: "filters", icon: Palette, label: "Filters" },
  { id: "transitions", icon: Layers, label: "Transitions" },
  { id: "animation", icon: Zap, label: "Animation" },
];

export function EditorScreen({ onBack, initialVideoUrl }: { onBack: () => void, initialVideoUrl?: string }) {
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?" +
      GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, '+')}:ital,wght@0,400;0,700;1,400;1,700`).join("&") +
      "&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <EditorProvider>
      <EditorLayout onBack={onBack} initialVideoUrl={initialVideoUrl} />
    </EditorProvider>
  );
}

function EditorLayout({ onBack, initialVideoUrl }: { onBack: () => void, initialVideoUrl?: string }) {
  const { activeLeftTab, setActiveLeftTab, currentState, totalDuration, setIsPlaying, addVideoClip } = useEditor();
  const hasLoadedInitial = useRef(false);

  useEffect(() => {
    if (initialVideoUrl && !hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      const existing = MEDIA_LIBRARY.find(m => m.url === initialVideoUrl);
      if (existing) {
        addVideoClip(existing.id);
      } else {
        addVideoClip({
          id: Date.now(),
          url: initialVideoUrl,
          name: "Imported Short",
          type: "video",
          duration: 60,
        });
      }
    }
  }, [initialVideoUrl, addVideoClip]);
  
  // Export modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatusMsg, setExportStatusMsg] = useState("");
  const [completedUrl, setCompletedUrl] = useState<string | null>(null);

  // Settings selections
  const [selectedRes, setSelectedRes] = useState(() => localStorage.getItem("clipvault_def_res") || "1080p");
  const [selectedFps, setSelectedFps] = useState(() => parseInt(localStorage.getItem("clipvault_def_fps") || "60", 10));
  const [selectedFormat, setSelectedFormat] = useState("mp4");
  
  // Project Info
  const [projectName, setProjectName] = useState("Untitled Project");
  const [isEditingName, setIsEditingName] = useState(false);

  const { deleteSelected, selectedId } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        const hasMedia = currentState.clips.length > 0 || currentState.audioClips.length > 0 || currentState.textClips.length > 0;
        if (hasMedia) {
          setIsPlaying(p => !p);
        }
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId != null) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteSelected, setIsPlaying, currentState]);

  usePlayback();
  useTimelineDrag();

  const resolutions = [
    { id: "720p", label: "720p (HD Standard)", res: "1280x720" },
    { id: "1080p", label: "1080p (Full HD - Recommended)", res: "1920x1080" },
    { id: "1440p", label: "1440p (2K Quad HD)", res: "2560x1440" },
    { id: "4k", label: "4K (Ultra HD) - Requires Plus", res: "3840x2160" },
    { id: "8k", label: "8K (Extreme HD) - Requires Pro", res: "7680x4320" },
  ];

  const startExportProcess = async () => {
    try {
      setIsExporting(true);
      setExportProgress(10);
      setExportStatusMsg(`Initializing ${selectedRes.toUpperCase()} hardware render...`);
      setCompletedUrl(null);

      const res = await fetch("http://localhost:8000/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution: selectedRes,
          fps: selectedFps,
          format: selectedFormat,
          clips: currentState.clips,
          audioClips: currentState.audioClips,
          textClips: currentState.textClips,
          totalDuration,
        }),
      });

      const data = await res.json();
      if (data.task_id) {
        const interval = setInterval(async () => {
          try {
            const stRes = await fetch(`http://localhost:8000/api/status/${data.task_id}`);
            const stData = await stRes.json();
            if (stData.progress) setExportProgress(stData.progress);
            if (stData.message) setExportStatusMsg(stData.message);

            if (stData.status === "completed") {
              clearInterval(interval);
              setIsExporting(false);
              if (stData.result?.url) {
                setCompletedUrl(stData.result.url);
                window.open(stData.result.url, "_blank");
              }
            } else if (stData.status === "failed") {
              clearInterval(interval);
              setIsExporting(false);
              alert("Export failed: " + (stData.error || "Unknown error"));
            }
          } catch (e) {
            clearInterval(interval);
            setIsExporting(false);
          }
        }, 1000);
      } else {
        setIsExporting(false);
      }
    } catch (e) {
      setIsExporting(false);
      alert("Failed to connect to ClipVault render engine backend.");
    }
  };

  return (
    <div
      className="h-screen flex flex-col bg-[#050505] text-white overflow-hidden font-sans select-none relative"
      onContextMenu={e => e.preventDefault()}
    >
      {/* ── EXPORT CONFIGURATION & RENDER MODAL ── */}
      {showConfigModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-4">
          <div className="bg-[#101010] border border-white/10 rounded-2xl p-6 w-[440px] shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate pr-4">
                <Film className="w-4 h-4 text-[#00e676] shrink-0" /> <span className="truncate">Export: {projectName}</span>
              </h3>
              {!isExporting && (
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* File Name */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                File Name
              </label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                disabled={isExporting}
                placeholder="e.g. My Awesome Video"
                className="w-full rounded-xl px-3.5 py-2.5 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-[#00e676]/50 transition-all font-semibold placeholder-gray-600"
              />
            </div>

            {/* Resolution Selector */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Export Resolution (720p to 8K)
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                {resolutions.map(r => (
                  <button
                    key={r.id}
                    disabled={isExporting}
                    onClick={() => setSelectedRes(r.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedRes === r.id
                        ? "bg-[#00e676]/10 border-[#00e676] text-[#00e676]"
                        : "bg-white/5 border-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span>{r.label}</span>
                    <span className="text-[10px] font-mono text-gray-500">{r.res}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* FPS and Format */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Frame Rate (FPS)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[24, 30, 60, 120].map(fps => (
                    <button
                      key={fps}
                      disabled={isExporting}
                      onClick={() => setSelectedFps(fps)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        selectedFps === fps
                          ? "bg-[#00e676]/10 border-[#00e676] text-[#00e676]"
                          : "bg-white/5 border-white/5 text-gray-400"
                      }`}
                    >
                      {fps} fps
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {["mp4", "webm", "mov"].map(fmt => (
                    <button
                      key={fmt}
                      disabled={isExporting}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`py-1.5 rounded-lg text-xs font-semibold uppercase border transition-all ${
                        selectedFormat === fmt
                          ? "bg-[#00e676]/10 border-[#00e676] text-[#00e676]"
                          : "bg-white/5 border-white/5 text-gray-400"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Progress Bar */}
            {isExporting && (
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-300 truncate">{exportStatusMsg}</span>
                  <span className="text-[#00e676] font-mono">{exportProgress}%</span>
                </div>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#00e676] h-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Completed Result Link */}
            {completedUrl && !isExporting && (
              <div className="p-3 rounded-xl bg-[#00e676]/10 border border-[#00e676]/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00e676]" />
                  <span className="text-xs text-[#00e676] font-bold">Export Render Complete!</span>
                </div>
                <a
                  href={completedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-[#00e676] text-black text-xs font-bold hover:brightness-110"
                >
                  Download
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {!isExporting && (
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-gray-300"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={startExportProcess}
                disabled={isExporting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00e676] text-black hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? "Rendering..." : `Export ${selectedRes.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <div
        className="h-20 pt-7 flex items-center justify-between px-4 flex-shrink-0"
        style={{
          background: "rgba(8,8,8,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00e676]/15 border border-[#00e676]/30 text-[#00e676] hover:bg-[#00e676] hover:text-black font-bold text-xs transition-all duration-200 cursor-pointer shadow-md z-50"
            style={{ WebkitAppRegion: "no-drag" } as any}
            title="Back to Studio Home"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <div>
              {isEditingName ? (
                <input
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  onBlur={() => {
                    setIsEditingName(false);
                    if (!projectName.trim()) setProjectName("Untitled Project");
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setIsEditingName(false);
                      if (!projectName.trim()) setProjectName("Untitled Project");
                    }
                  }}
                  className="text-xs font-bold tracking-wide bg-black/50 border-b border-[#00e676] outline-none text-white w-40 px-1"
                  autoFocus
                />
              ) : (
                <h1 
                  onClick={() => setIsEditingName(true)}
                  className="text-xs font-bold tracking-wide cursor-text hover:text-[#00e676] transition-colors truncate max-w-[200px]" 
                  style={{ color: "#eee" }}
                  title="Click to rename project"
                >
                  {projectName || "Untitled Project"}
                </h1>
              )}
              <p className="text-[10px]" style={{ color: "#5a5a5a" }}>
                {selectedRes} · {selectedFps}fps
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 cursor-default select-none">
            <div className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Auto-Saved</span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[#00e676]/20"
            style={{ background: "#00e676", color: "#000" }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div
          className="w-[68px] flex flex-col items-center py-4 gap-2 flex-shrink-0 z-20"
          style={{ background: "rgba(8,8,8,0.98)", borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          {LEFT_TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveLeftTab(t.id)}
              className="w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-200 cursor-pointer relative group hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
              style={
                activeLeftTab === t.id
                  ? { color: "#00e676", background: "rgba(0,230,118,0.1)" }
                  : { color: "#888888" }
              }
            >
              <t.icon className="w-4 h-4 mb-1" />
              <span className="text-[8px] font-bold tracking-wider">{t.label}</span>
              {activeLeftTab === t.id && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                  style={{ background: "#00e676" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Left Panel */}
        <div
          className="w-[280px] flex-shrink-0 overflow-y-auto scrollbar-hide z-10"
          style={{ background: "rgba(10,10,10,0.95)", borderRight: "1px solid rgba(255,255,255,0.05)" }}
        >
          <MediaLibraryPanel />
        </div>

        {/* Center Canvas */}
        <PreviewPlayer drawFrame={() => {}} />

        {/* Right Properties Panel */}
        <PropertiesPanel />
      </div>

      {/* Bottom Timeline */}
      <div className="h-[280px] flex-shrink-0 z-30" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <TimelineContainer />
      </div>
    </div>
  );
}
