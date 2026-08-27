import React from "react";
import {
  Link2,
  Upload,
  CheckCircle2,
  Check,
  Move,
  Folder,
  HardDrive,
  FolderOpen,
  Sparkles,
  Music,
  Volume2,
  Type,
  Copyright,
  Zap,
  Loader2,
  XCircle,
  Gamepad2,
  Film,
  AlertCircle,
} from "lucide-react";

const Section = ({ title, children, accent = "text-amber-400" }: { title: string; children: React.ReactNode; accent?: string }) => (
  <div className="space-y-3">
    <h3 className={`text-xs font-bold ${accent} uppercase tracking-wider`}>{title}</h3>
    {children}
  </div>
);

const QUALITIES = [
  { id: "720p", label: "720p HD", desc: "Fast rendering • Optimal" },
  { id: "1080p", label: "1080p FHD", desc: "Crisp detail • Recommended" },
  { id: "4k", label: "4K Master", desc: "Ultra HD master export" },
  { id: "8k", label: "8K Cinema", desc: "Maximum bitrate" },
];

const LAYOUTS = [
  { id: "vertical_crop", label: "Auto Face-Tracking (9:16)", desc: "Tracks active speaker smoothly" },
  { id: "landscape_blur", label: "Landscape + Blurred Canvas", desc: "Preserves horizontal video with soft blur" },
  { id: "landscape_fit", label: "Landscape Fit (Letterbox)", desc: "Pads inside vertical canvas" },
  { id: "custom_split", label: "Custom Split-Screen (2 Boxes)", desc: "Visual multi-box crop editor" },
  { id: "gameplay_bg", label: "Satisfying Gameplay Split", desc: "Speaker + Subway Surfers / GTA background" },
];

const DURATION_MODES = [
  { id: "auto", label: "Auto Viral Moments", desc: "AI scans whole video for peak hooks" },
  { id: "custom", label: "Custom Timestamp Range", desc: "Clip exact start and end times" },
];

interface SetupSidebarProps {
  inputType: "youtube" | "local";
  setInputType: (t: "youtube" | "local") => void;
  ytUrl: string;
  setYtUrl: (url: string) => void;
  localFilePath: string;
  setLocalFilePath: (path: string) => void;
  setActiveVideoUrl: (url: string) => void;
  quality: string;
  setQuality: (q: string) => void;
  layout: string;
  setLayout: (l: string) => void;
  setCropModalOpen: (mode: "none" | "top" | "bottom") => void;
  cameraStyle: "instant" | "snappy" | "smooth";
  setCameraStyle: (s: "instant" | "snappy" | "smooth") => void;
  durationMode: string;
  setDurationMode: (d: string) => void;
  numClips: number | string;
  setNumClips: React.Dispatch<React.SetStateAction<number | string>>;
  targetDuration: number | string;
  setTargetDuration: React.Dispatch<React.SetStateAction<number | string>>;
  topicPrompt: string;
  setTopicPrompt: (t: string) => void;
  customOutputDir: string;
  setCustomOutputDir: (dir: string) => void;
  chooseCustomDirectory: () => void;
  customFolderName: string;
  setCustomFolderName: (f: string) => void;
  vaultFolders: string[];
  exportFileName: string;
  setExportFileName: (name: string) => void;
  transcriptionLanguage: string;
  setTranscriptionLanguage: (lang: string) => void;
  autoBroll: boolean;
  setAutoBroll: (b: boolean) => void;
  addBgMusic: boolean;
  setAddBgMusic: (m: boolean) => void;
  bgMusicVol: number;
  setBgMusicVol: (v: number) => void;
  autoSfx: boolean;
  setAutoSfx: (s: boolean) => void;
  addCaptions: boolean;
  setAddCaptions: (c: boolean) => void;
  captionYPct: number;
  setCaptionYPct: (y: number) => void;
  selectedEffectId: string;
  setSelectedEffectId: (id: string) => void;
  avoidCopyright: boolean;
  setAvoidCopyright: (a: boolean) => void;
  startTs: string;
  setStartTs: (ts: string) => void;
  endTs: string;
  setEndTs: (ts: string) => void;
  running: boolean;
  statusText: string;
  progress: number;
  runClipper: () => void;
  done: boolean;
  errorMsg: string;
  generatedClips: any[];
  setViewMode: (mode: any) => void;
  onCancel?: () => void;
  gameplayBgVideo?: string;
  setGameplayBgVideo?: (v: string) => void;
  backgroundVideos?: Array<{ name: string; path: string; url: string; size: number }>;
  onUploadBackgroundVideo?: (file: File) => Promise<void>;
  bgMusicFile?: string;
  setBgMusicFile?: (m: string) => void;
  backgroundTracks?: Array<{ name: string; path: string; url: string; size: number }>;
  onUploadBackgroundMusic?: (file: File) => Promise<void>;
  isKeyMissingForActiveEngine?: boolean;
  activeEngineName?: string;
  onOpenEngineSettings?: () => void;
}

export const SetupSidebar: React.FC<SetupSidebarProps> = ({
  inputType,
  setInputType,
  ytUrl,
  setYtUrl,
  localFilePath,
  setLocalFilePath,
  setActiveVideoUrl,
  onCancel,
  isKeyMissingForActiveEngine = false,
  activeEngineName = "Cloud AI",
  onOpenEngineSettings,
  quality,
  setQuality,
  layout,
  setLayout,
  setCropModalOpen,
  cameraStyle,
  setCameraStyle,
  durationMode,
  setDurationMode,
  numClips,
  setNumClips,
  targetDuration,
  setTargetDuration,
  topicPrompt,
  setTopicPrompt,
  customOutputDir,
  setCustomOutputDir,
  chooseCustomDirectory,
  customFolderName,
  setCustomFolderName,
  vaultFolders,
  exportFileName,
  setExportFileName,
  transcriptionLanguage,
  setTranscriptionLanguage,
  autoBroll,
  setAutoBroll,
  addBgMusic,
  setAddBgMusic,
  bgMusicVol,
  setBgMusicVol,
  autoSfx,
  setAutoSfx,
  addCaptions,
  setAddCaptions,
  captionYPct,
  setCaptionYPct,
  selectedEffectId,
  setSelectedEffectId,
  avoidCopyright,
  setAvoidCopyright,
  startTs,
  setStartTs,
  endTs,
  setEndTs,
  running,
  statusText,
  progress,
  runClipper,
  done,
  errorMsg,
  generatedClips,
  setViewMode,
  gameplayBgVideo = "",
  setGameplayBgVideo = () => {},
  backgroundVideos = [],
  onUploadBackgroundVideo,
  bgMusicFile = "",
  setBgMusicFile = () => {},
  backgroundTracks = [],
  onUploadBackgroundMusic,
}) => {
  return (
    <div className="w-[520px] flex-shrink-0 border-r border-white/5 overflow-y-auto px-8 py-6 bg-[#070707] flex flex-col">
      <div className="space-y-7 w-full animate-fadeIn">
        {/* Media Source Section */}
        <Section title="Media Source">
          <div className="flex items-center bg-white/5 rounded-xl p-1 mb-3 border border-white/10">
            <button
              onClick={() => setInputType("youtube")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                inputType === "youtube" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              YouTube Link
            </button>
            <button
              onClick={() => setInputType("local")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                inputType === "local" ? "bg-amber-400 text-black shadow-md" : "text-gray-400 hover:text-white"
              }`}
            >
              Local Upload
            </button>
          </div>

          {inputType === "youtube" ? (
            <>
              <p className="text-xs text-gray-400 mb-2.5">
                Paste a YouTube URL to automatically download and extract high-energy clips.
              </p>
              <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-white/5 border border-amber-400/30">
                <Link2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <input
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-transparent text-xs text-white outline-none placeholder-gray-500 font-mono"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2.5">Select a local video file from your computer to process.</p>
              <button
                onClick={async () => {
                  try {
                    const filePaths = await (window as any).electronAPI?.showOpenDialog?.({
                      properties: ["openFile"],
                      filters: [{ name: "Videos", extensions: ["mp4", "mkv", "mov", "webm"] }],
                    });
                    if (filePaths && filePaths.length > 0) {
                      const filePath = filePaths[0];
                      const url = `http://127.0.0.1:8000/stream?path=${encodeURIComponent(filePath)}`;
                      setActiveVideoUrl(url);
                      setLocalFilePath(filePath);
                      setYtUrl("");
                    }
                  } catch (err) {
                    console.error("Failed to select file:", err);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-3.5 py-4 bg-white/5 border border-dashed border-amber-400/30 cursor-pointer hover:bg-white/10 transition-colors"
              >
                {localFilePath ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-400 truncate max-w-[200px]" title={localFilePath}>
                      {localFilePath.split("\\").pop()?.split("/").pop() || "Video Selected"}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Choose Video File...</span>
                  </>
                )}
              </button>
            </>
          )}
        </Section>

        {/* Download Quality */}
        <Section title="Download Quality">
          <div className="grid grid-cols-2 gap-3">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                  quality === q.id
                    ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <p className="text-white text-xs font-bold">{q.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{q.desc}</p>
              </button>
            ))}
          </div>
        </Section>

        {/* Video Layout Options */}
        <Section title="Video Layout">
          <div className="space-y-2">
            {LAYOUTS.map((l, i) => (
              <div key={l.id} className="flex flex-col gap-1">
                <button
                  onClick={() => setLayout(l.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    layout === l.id
                      ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                      : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      layout === l.id ? "bg-amber-400 text-black" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{l.label}</p>
                    <p className="text-[10px] text-gray-500 truncate">{l.desc}</p>
                  </div>
                  {layout === l.id && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                </button>
                {layout === l.id && l.id === "custom_split" && (
                  <button
                    onClick={() => setCropModalOpen("top")}
                    className="w-full py-2 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-amber-400 hover:text-black transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Move className="w-3.5 h-3.5" /> Adjust Crop Positions
                  </button>
                )}

                {layout === l.id && l.id === "gameplay_bg" && (
                  <div className="p-3.5 mt-1.5 rounded-xl bg-amber-400/5 border border-amber-400/25 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Gamepad2 className="w-3.5 h-3.5" /> Satisfying Background Video
                      </span>
                      {gameplayBgVideo ? (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                          ✓ Ready
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 animate-pulse">
                          Import Required
                        </span>
                      )}
                    </div>

                    {gameplayBgVideo ? (
                      <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Film className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs text-white font-mono truncate" title={gameplayBgVideo}>
                            {gameplayBgVideo.split(/[\\/]/).pop()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGameplayBgVideo("")}
                          className="text-[10px] text-gray-400 hover:text-red-400 font-bold shrink-0 transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-black/30 border border-dashed border-amber-400/30 text-center space-y-1">
                        <p className="text-[11px] font-bold text-gray-200">No Background Video Imported</p>
                        <p className="text-[9px] text-gray-400">
                          Import a video of your choice (Subway Surfers, GTA 5, Minecraft, Satisfying ASMR, etc.)
                        </p>
                      </div>
                    )}

                    {/* Import Button */}
                    <label className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md">
                      <Upload className="w-3.5 h-3.5 text-black" />
                      {gameplayBgVideo ? "Change / Import Another Video" : "📥 Import Gameplay Video (.mp4, .mov)"}
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && onUploadBackgroundVideo) {
                            onUploadBackgroundVideo(file);
                          }
                        }}
                      />
                    </label>

                    {/* Quick Pick from Library */}
                    {backgroundVideos && backgroundVideos.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[9px] text-gray-500 font-bold uppercase block">Existing Library:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {backgroundVideos.map((bg) => (
                            <button
                              key={bg.name}
                              type="button"
                              onClick={() => setGameplayBgVideo(bg.path || bg.url)}
                              className={`text-[10px] px-2 py-1 rounded-md font-mono transition-all border cursor-pointer truncate max-w-[150px] ${
                                gameplayBgVideo.includes(bg.name)
                                  ? "bg-amber-400 text-black font-bold border-amber-400"
                                  : "bg-white/5 text-gray-300 border-white/10 hover:border-amber-400/40"
                              }`}
                            >
                              🎮 {bg.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Camera Tracking Style */}
        <div className={layout === "custom_split" ? "opacity-30 pointer-events-none transition-opacity" : "transition-opacity"}>
          <Section title="Camera Tracking Style">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCameraStyle("instant")}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  cameraStyle === "instant"
                    ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-extrabold">Instant</p>
                  <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-400/20 text-amber-300">Fastest</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">Zero lag, always centered</p>
              </button>
              <button
                onClick={() => setCameraStyle("snappy")}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  cameraStyle === "snappy"
                    ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <p className="text-white text-xs font-bold">Snappy</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Dynamic action tracking</p>
              </button>
              <button
                onClick={() => setCameraStyle("smooth")}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                  cameraStyle === "smooth"
                    ? "bg-amber-400/10 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)] ring-1 ring-amber-400/30"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <p className="text-white text-xs font-bold">Smooth</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Gentle cinematic glide</p>
              </button>
            </div>
          </Section>
        </div>

        {/* Duration Mode & AI Settings */}
        <Section title="Clip Duration & AI Settings">
          <div className="space-y-2 mb-3">
            {DURATION_MODES.map((d, i) => (
              <div key={d.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setDurationMode(d.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    durationMode === d.id ? "bg-amber-400/10 border-amber-400/50 shadow-sm" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      durationMode === d.id ? "bg-amber-400 text-black" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-white">{d.label}</p>
                    <p className="text-[10px] text-gray-500">{d.desc}</p>
                  </div>
                </button>

                {/* Custom Timestamp Range Inputs - Appears directly under this option when chosen */}
                {d.id === "custom" && durationMode === "custom" && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-amber-400/5 border border-amber-400/30 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Start Timestamp</label>
                      <input
                        type="text"
                        value={startTs}
                        onChange={(e) => setStartTs(e.target.value)}
                        placeholder="e.g. 0:15"
                        className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white bg-black/40 border border-white/10 outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">End Timestamp</label>
                      <input
                        type="text"
                        value={endTs}
                        onChange={(e) => setEndTs(e.target.value)}
                        placeholder="e.g. 1:45"
                        className="w-full rounded-lg px-3 py-2 text-xs font-bold text-white bg-black/40 border border-white/10 outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {durationMode === "auto" && (
            <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-xs text-white font-medium">Clips to generate</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNumClips((n) => Math.max(1, (parseInt(n?.toString() || "1") || 1) - 1))}
                  className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={numClips}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNumClips(val === "" ? ("" as any) : Math.max(1, parseInt(val) || 1));
                  }}
                  onBlur={() => {
                    if (!numClips || isNaN(Number(numClips))) setNumClips(3);
                  }}
                  className="w-14 rounded bg-black/40 border border-white/10 px-1 py-1 text-white text-xs font-bold text-center outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setNumClips((n) => (parseInt(n?.toString() || "1") || 1) + 1)}
                  className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-xs text-white font-medium">Clip Length (Seconds)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={targetDuration}
                  onChange={(e) => {
                    setTargetDuration(e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1));
                  }}
                  onBlur={() => {
                    if (targetDuration === "") setTargetDuration(30);
                  }}
                  className="w-16 rounded bg-black/40 border border-white/10 px-2 py-1 text-white text-xs font-bold text-center outline-none focus:border-amber-400"
                />
                <span className="text-gray-400 text-xs">sec</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Include specific moments (Topic)
              </label>
              <input
                type="text"
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                placeholder="e.g. Find moments when they talked about the playoffs"
                className="w-full rounded-lg px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 placeholder-gray-600 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Output Directory & Batch Folder Settings */}
            <div className="space-y-2 mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" /> Output Destination Folder
                </label>
                {customOutputDir && (
                  <button
                    type="button"
                    onClick={() => setCustomOutputDir("")}
                    className="text-[9px] text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <div className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-[11px] text-gray-300 font-mono truncate" title={customOutputDir || "engine/clips"}>
                    {customOutputDir ? customOutputDir : "Default (engine/clips)"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={chooseCustomDirectory}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold border border-white/10 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3 text-amber-400" /> Browse
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Save into Subfolder / Batch
                  </label>
                  {customFolderName && (
                    <button
                      type="button"
                      onClick={() => setCustomFolderName("")}
                      className="text-[9px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                    >
                      Reset to Main Library
                    </button>
                  )}
                </div>

                {/* Subfolder Dropdown Selector */}
                <select
                  value={customFolderName || ""}
                  onChange={(e) => setCustomFolderName(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs text-white bg-black/50 border border-white/15 outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">📁 Main Library (Root Directory)</option>
                  {vaultFolders
                    .filter((f) => f && f !== "Main Library" && f !== "all" && f !== "root")
                    .map((folder) => (
                      <option key={folder} value={folder}>
                        📁 {folder}
                      </option>
                    ))}
                </select>

                {/* Quick Pick Chips for All Existing Folders */}
                {vaultFolders.filter((f) => f && f !== "all").length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase">Folders:</span>
                    <button
                      type="button"
                      onClick={() => setCustomFolderName("")}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border cursor-pointer ${
                        !customFolderName
                          ? "bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-sm"
                          : "bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      📁 Main Library
                    </button>
                    {vaultFolders
                      .filter((f) => f && f !== "Main Library" && f !== "all" && f !== "root")
                      .map((folder) => (
                        <button
                          key={folder}
                          type="button"
                          onClick={() => setCustomFolderName(folder)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-all border cursor-pointer ${
                            customFolderName === folder
                              ? "bg-amber-400/20 text-amber-400 border-amber-400/40 shadow-sm"
                              : "bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          📁 {folder}
                        </button>
                      ))}
                  </div>
                )}

                {/* Custom Folder Name Input (to type a new subfolder) */}
                <input
                  type="text"
                  value={customFolderName}
                  onChange={(e) => setCustomFolderName(e.target.value)}
                  placeholder="Or type a new folder name (e.g. Movies, Gaming)..."
                  className="w-full rounded-lg px-3 py-1.5 text-xs text-white bg-black/30 border border-white/10 outline-none focus:border-amber-400 placeholder-gray-600 transition-colors select-text cursor-text pointer-events-auto shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1 mt-3">
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Export File Name Prefix (Optional)
              </label>
              <input
                type="text"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                placeholder="e.g. MyViralClip"
                className="w-full rounded-lg px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 placeholder-gray-600 transition-colors"
              />
            </div>

            <div className="space-y-1 mt-3 mb-2">
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Video Language</label>
              <select
                value={transcriptionLanguage}
                onChange={(e) => setTranscriptionLanguage(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-xs text-white bg-white/5 border border-white/10 outline-none focus:border-amber-400 cursor-pointer appearance-none"
              >
                <option className="bg-[#111] text-white" value="auto">
                  Auto-Detect Language
                </option>
                <option className="bg-[#111] text-white" value="en">
                  English
                </option>
                <option className="bg-[#111] text-white" value="tl">
                  Tagalog / Filipino
                </option>
                <option className="bg-[#111] text-white" value="es">
                  Spanish
                </option>
                <option className="bg-[#111] text-white" value="fr">
                  French
                </option>
                <option className="bg-[#111] text-white" value="de">
                  German
                </option>
                <option className="bg-[#111] text-white" value="ja">
                  Japanese
                </option>
                <option className="bg-[#111] text-white" value="zh">
                  Chinese
                </option>
              </select>
            </div>

          <div className="space-y-3">
            {/* Background Music Toggle */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/5 border border-white/5 transition-colors">
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-white/10 p-1 rounded-lg"
                onClick={() => setAddBgMusic(!addBgMusic)}
              >
                <div>
                  <span className="text-xs text-white font-medium flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-amber-400" /> Background Music
                  </span>
                  <span className="text-[10px] text-gray-500">Auto-ducked background soundtrack</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                    addBgMusic ? "bg-amber-400" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${
                      addBgMusic ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {addBgMusic && (
                <div className="mt-2 pl-5 pr-2 space-y-2.5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-gray-400">Volume</span>
                    <span className="text-[10px] text-amber-400 font-bold">{Math.round(bgMusicVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="1.0"
                    step="0.01"
                    value={bgMusicVol}
                    onChange={(e) => setBgMusicVol(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  {/* Custom Background Music Track Selector */}
                  <div className="pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Soundtrack Track:</span>
                      {bgMusicFile && (
                        <button
                          type="button"
                          onClick={() => setBgMusicFile("")}
                          className="text-[9px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                        >
                          Reset to Random
                        </button>
                      )}
                    </div>
                    {bgMusicFile ? (
                      <div className="p-2 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-1.5 text-xs text-amber-300">
                        <span className="font-mono text-[10px] truncate">{bgMusicFile.split(/[\\/]/).pop()}</span>
                        <span className="text-[9px] text-emerald-400 font-bold">✓ Selected</span>
                      </div>
                    ) : null}
                    <label className="w-full py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-[10px] font-bold border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                      <Upload className="w-3 h-3 text-amber-400" />
                      {bgMusicFile ? "Change Music File" : "📥 Import Custom Music (.mp3, .wav)"}
                      <input
                        type="file"
                        accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && onUploadBackgroundMusic) {
                            onUploadBackgroundMusic(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Auto SFX & Emojis */}
            <div
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => setAutoSfx(!autoSfx)}
            >
              <div>
                <span className="text-xs text-white font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Auto Emojis & SFX
                </span>
                <span className="text-[10px] text-gray-500">Pop sound effects and animated emojis</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                  autoSfx ? "bg-amber-400" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${
                    autoSfx ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>

            {/* Captions Toggle & Styles */}
            <div className="flex flex-col gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 transition-colors">
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-white/10 p-1 rounded-lg"
                onClick={() => setAddCaptions(!addCaptions)}
              >
                <div>
                  <span className="text-xs text-white font-medium flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-amber-400" /> AI Captions
                  </span>
                  <span className="text-[10px] text-gray-500">Generate animated word-by-word subtitles</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                    addCaptions ? "bg-amber-400" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${
                      addCaptions ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>

              {addCaptions && (
                <div className="space-y-3 pt-2 border-t border-white/5 animate-fadeIn">

                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Subtitle Style</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "capcut_yellow", name: "⚡ CapCut Yellow", bg: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40" },
                        { id: "opus_green", name: "🟢 Opus Neon", bg: "bg-emerald-400/20 text-emerald-300 border-emerald-400/40" },
                        { id: "clean_white", name: "✨ Clean White", bg: "bg-white/10 text-white border-white/20" },
                        { id: "neon_cyan", name: "💎 Electric Cyan", bg: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" },
                        { id: "fire_red", name: "🔥 Fire Red", bg: "bg-red-400/20 text-red-300 border-red-400/40" },
                        { id: "hormozi_bold", name: "💪 Hormozi Bold", bg: "bg-amber-400/20 text-amber-300 border-amber-400/40" },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedEffectId(s.id)}
                          className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border truncate transition-all cursor-pointer ${
                            selectedEffectId === s.id
                              ? "bg-amber-400 text-black border-amber-400 shadow-md font-extrabold"
                              : `${s.bg} hover:brightness-125`
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Copyright Bypass */}
            <div
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => setAvoidCopyright(!avoidCopyright)}
            >
              <div className="flex flex-col">
                <span className="text-xs text-white font-medium flex items-center gap-1.5">
                  <Copyright className="w-3.5 h-3.5 text-amber-400" /> Bypass Copyright
                </span>
                <span className="text-[10px] text-gray-500">Flips video & alters frequency fingerprint</span>
              </div>
              <div
                className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                  avoidCopyright ? "bg-amber-400" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${
                    avoidCopyright ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Run Button Panel */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          {running && (
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400">{statusText}</span>
                <span className="font-mono text-gray-300">{Math.floor(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {isKeyMissingForActiveEngine && (
            <div
              onClick={onOpenEngineSettings}
              className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-500/20 transition-all shadow-inner"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span className="truncate">
                  <b>API Key Required:</b> Missing for {activeEngineName}
                </span>
              </div>
              <span className="text-[11px] underline text-amber-400 hover:text-amber-300 font-bold shrink-0">Add Key ↗</span>
            </div>
          )}

          {running ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="flex-1 py-4 rounded-2xl font-bold text-sm bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center gap-2 cursor-wait"
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  title="Stop / Cancel Clip Processing"
                  className="px-5 py-4 rounded-2xl font-extrabold text-sm bg-red-500/20 hover:bg-red-500/40 border border-red-500/40 text-red-400 hover:text-red-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.25)]"
                >
                  <XCircle className="w-4 h-4 text-red-400" /> Stop
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={runClipper}
              className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isKeyMissingForActiveEngine
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                  : "bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:opacity-95 shadow-[0_0_25px_rgba(251,191,36,0.3)]"
              }`}
            >
              <Zap className={`w-4 h-4 ${isKeyMissingForActiveEngine ? "fill-amber-400 text-amber-400" : "fill-black text-black"}`} />
              {isKeyMissingForActiveEngine ? `Enter ${activeEngineName} API Key` : done ? "Re-Run AI Clipper" : "Run AI Clipper"}
            </button>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold whitespace-pre-wrap">
              {errorMsg}
            </div>
          )}

          {!running && generatedClips.length > 0 && (
            <button
              onClick={() => setViewMode("gallery")}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              View Generated Clips ({generatedClips.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
