import React from "react";
import {
  Sparkles,
  FolderOpen,
  FolderPlus,
  ArrowLeft,
  Folder,
  FolderCheck,
  ExternalLink,
  CheckCircle2,
  CheckSquare,
  Square,
  Zap,
  Play,
  Loader2,
  Trash2,
  Move,
} from "lucide-react";
import type { ClipMetadata } from "./types";

interface GalleryViewProps {
  generatedClips: any[];
  onBackToEditor: () => void;
  openOutputFolder: () => void;
  lastOutputFolder: string;
  exportNotice: string;
  setExportNotice: (msg: string) => void;
  gallerySelectedClips: number[];
  setGallerySelectedClips: React.Dispatch<React.SetStateAction<number[]>>;
  galleryTargetFolder: string;
  setGalleryTargetFolder: (val: string) => void;
  galleryRandomFolder: string;
  setGalleryRandomFolder: (val: string) => void;
  customFolderName: string;
  handleSortGeneratedClips: () => void;
  isSortingGallery: boolean;
  onSelectClip: (idx: number) => void;
  onDeleteClip?: (path: string, idx: number) => void;
}

const GalleryClipCard: React.FC<{
  clip: any;
  index: number;
  isSelected: boolean;
  onSelectClip: (idx: number) => void;
  onDeleteClip?: (path: string, idx: number) => void;
  onContextMenu: (e: React.MouseEvent, clip: any, idx: number) => void;
  onToggleSelect: (e: React.MouseEvent) => void;
}> = ({ clip, index, isSelected, onSelectClip, onDeleteClip, onContextMenu, onToggleSelect }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = React.useState(false);

  const handleMouseEnter = () => {
    if (videoRef.current && !hasError) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && !hasError) {
      videoRef.current.pause();
      try { videoRef.current.currentTime = 0.1; } catch {}
    }
  };

  const clipPath = typeof clip === "object" ? (clip.path || "") : (typeof clip === "string" ? clip : "");
  const videoSrc =
    typeof clip === "object" && clip.url
      ? `${clip.url}#t=0.1`
      : typeof clip === "string"
      ? `${clip}#t=0.1`
      : typeof clip === "object" && clip.path
      ? `local:///${clip.path.replace(/\\/g, "/")}#t=0.1`
      : "";

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => onContextMenu(e, clip, index)}
      className={`bg-[#141414] rounded-2xl border transition-all cursor-pointer group flex flex-col relative overflow-hidden ${
        isSelected ? "border-amber-400 ring-1 ring-amber-400/40" : "border-white/5 hover:border-amber-400/50"
      }`}
      onClick={() => onSelectClip(index)}
    >
      <div className="relative w-full aspect-[9/16] bg-black overflow-hidden shadow-inner flex items-center justify-center">
        {!hasError && videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            preload="metadata"
            muted
            loop
            playsInline
            onError={() => setHasError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 bg-black pointer-events-none"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-600 gap-2 p-4 text-center">
            <Play className="w-8 h-8 text-gray-700" />
            <span className="text-[10px] text-gray-500 font-bold">Clip Preview</span>
          </div>
        )}

        {/* Selection Checkbox */}
        <button
          type="button"
          onClick={onToggleSelect}
          className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-lg"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-amber-400" />
          ) : (
            <Square className="w-4 h-4 text-gray-400 hover:text-white" />
          )}
        </button>

        {/* Quick Delete Hover Button */}
        {onDeleteClip && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteClip(clipPath, index);
            }}
            title="Delete Clip Permanently"
            className="absolute top-2 right-2 z-30 p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-400/50 transition-all cursor-pointer shadow-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center hover:scale-110 active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}

        <div className="absolute top-2 right-2 group-hover:opacity-0 transition-opacity bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10">
          9:16
        </div>
        <div className="absolute bottom-2 left-2 bg-amber-400/90 text-black px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-lg flex items-center gap-1">
          <Zap className="w-3 h-3 fill-black" /> Score: {clip.virality_score || 99}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
            <Play className="w-5 h-5 fill-white text-white ml-1" />
          </div>
        </div>
      </div>

      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          <h4 className="text-white font-bold text-xs line-clamp-1 mb-1">
            {typeof clip === "object" ? clip.title : `Clip ${index + 1}`}
          </h4>
          <p className="text-[10px] text-gray-400 line-clamp-2">
            {typeof clip === "object" ? clip.description : "High-engagement viral short"}
          </p>
        </div>
      </div>
    </div>
  );
};

export const GalleryView: React.FC<GalleryViewProps> = ({
  generatedClips,
  onBackToEditor,
  openOutputFolder,
  lastOutputFolder,
  exportNotice,
  setExportNotice,
  gallerySelectedClips,
  setGallerySelectedClips,
  galleryTargetFolder,
  setGalleryTargetFolder,
  galleryRandomFolder,
  setGalleryRandomFolder,
  customFolderName,
  handleSortGeneratedClips,
  isSortingGallery,
  onSelectClip,
  onDeleteClip,
}) => {
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; clip: any; index: number } | null>(null);

  return (
    <div className="flex-1 bg-[#0a0a0a] overflow-y-auto p-8 animate-fadeIn relative">
      {/* Right-Click Context Menu */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 240),
              left: Math.min(contextMenu.x, window.innerWidth - 240),
            }}
            className="fixed z-50 w-56 bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-scaleIn text-xs font-semibold select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-white font-bold truncate">
                {typeof contextMenu.clip === "object" ? contextMenu.clip.title : `Clip ${contextMenu.index + 1}`}
              </p>
              <p className="text-[10px] text-gray-500 font-mono truncate">
                {typeof contextMenu.clip === "object" ? (contextMenu.clip.filename || contextMenu.clip.path) : "Generated Clip"}
              </p>
            </div>

            <button
              onClick={() => {
                onSelectClip(contextMenu.index);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Play className="w-4 h-4 text-amber-400" /> Play / Details
            </button>

            {typeof contextMenu.clip === "object" && contextMenu.clip.path && (
              <button
                onClick={() => {
                  (window as any).electronAPI?.showItemInFolder?.(contextMenu.clip.path);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" /> Reveal in Explorer
              </button>
            )}

            {typeof contextMenu.clip === "object" && contextMenu.clip.path && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(contextMenu.clip.path);
                  setExportNotice("Copied file path to clipboard!");
                  setTimeout(() => setExportNotice(""), 3000);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <Zap className="w-4 h-4 text-gray-400" /> Copy File Path
              </button>
            )}

            {onDeleteClip && (
              <>
                <div className="h-px bg-white/10 my-1" />
                <button
                  onClick={() => {
                    const path = typeof contextMenu.clip === "object" ? contextMenu.clip.path : "";
                    onDeleteClip(path, contextMenu.index);
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors text-left cursor-pointer font-bold"
                >
                  <Trash2 className="w-4 h-4 text-red-400" /> Delete Permanently
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Sparkles className="text-amber-400 w-6 h-6" /> Generated Viral Clips
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 font-bold">
              {generatedClips.length} Clips
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            All generated videos are <span className="text-green-400 font-bold">immediately saved</span> on your disk
            and ready to upload.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={openOutputFolder}
            className="px-4 py-2.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-black" /> Open Output Folder
          </button>

          <button
            onClick={async () => {
              if ((window as any).electronAPI?.selectDirectory) {
                const dest = await (window as any).electronAPI.selectDirectory();
                if (dest) {
                  setExportNotice(`Export folder selected: ${dest}`);
                  setTimeout(() => setExportNotice(""), 5000);
                  if ((window as any).electronAPI?.openPath) {
                    await (window as any).electronAPI.openPath(dest);
                  }
                }
              }
            }}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-400" /> Export / Copy To...
          </button>

          <button
            onClick={onBackToEditor}
            className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Studio
          </button>
        </div>
      </div>

      {/* Folders Management Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-[#111] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center border border-amber-400/20">
            <Folder className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Target Filing Folder</h4>
            <p className="text-[10px] text-gray-400">
              Select or type a subfolder to group these clips into your vault.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="e.g. Highlights, Day 1 Bosses..."
            value={galleryTargetFolder || customFolderName}
            onChange={(e) => setGalleryTargetFolder(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-gray-500 outline-none w-48"
          />

          <button
            onClick={handleSortGeneratedClips}
            disabled={isSortingGallery}
            className="px-4 py-2 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSortingGallery ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FolderCheck className="w-3.5 h-3.5" />
            )}
            Move {gallerySelectedClips.length > 0 ? `${gallerySelectedClips.length} Selected` : "All"} to Folder
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-400/10 via-amber-400/5 to-transparent border border-amber-400/20 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-400/30">
            <FolderCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Permanently Stored In:</span>
              <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded font-bold">
                Auto-Saved
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono truncate max-w-xl">
              {lastOutputFolder || "Default engine/clips"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openOutputFolder}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer flex items-center gap-1"
          >
            Reveal in File Explorer <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {exportNotice}
        </div>
      )}

      {/* Clips Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {generatedClips.map((clip, i) => {
          const isSelected = gallerySelectedClips.includes(i);
          return (
            <GalleryClipCard
              key={i}
              clip={clip}
              index={i}
              isSelected={isSelected}
              onSelectClip={onSelectClip}
              onDeleteClip={onDeleteClip}
              onContextMenu={(e, c, idx) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, clip: c, index: idx });
              }}
              onToggleSelect={(e) => {
                e.stopPropagation();
                setGallerySelectedClips((prev) =>
                  prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]
                );
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
