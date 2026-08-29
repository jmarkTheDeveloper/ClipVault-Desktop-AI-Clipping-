import React, { useState, useRef, useEffect } from "react";
import {
  FolderCheck,
  FolderOpen,
  FolderPlus,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Plus,
  Move,
  Search,
  Filter,
  CheckSquare,
  Square,
  Folder,
  Trash2,
  CheckCircle2,
  Loader2,
  Zap,
  Play,
  Grid,
  List,
  HardDrive,
  Edit2,
  UploadCloud,
  ArrowUpDown,
  Copy,
  Sparkles,
} from "lucide-react";
import type { ClipMetadata } from "./types";

interface SavedClipsVaultProps {
  vaultClips: ClipMetadata[];
  vaultFolders: string[];
  vaultLoading: boolean;
  vaultSearch: string;
  setVaultSearch: (val: string) => void;
  vaultSelectedFolder: string;
  setVaultSelectedFolder: (val: string) => void;
  selectedClipPaths: string[];
  setSelectedClipPaths: React.Dispatch<React.SetStateAction<string[]>>;
  draggedClipPath: string | null;
  setDraggedClipPath: (path: string | null) => void;
  onDropOnFolder: (e: React.DragEvent, folder: string) => void;
  setShowNewFolderModal: (open: boolean) => void;
  openOutputFolder: (folder?: string) => void;
  chooseCustomDirectory: () => void;
  customOutputDir: string;
  lastOutputFolder: string;
  exportNotice: string;
  setExportNotice: (msg: string) => void;
  setMoveModalClips: (clips: string[] | null) => void;
  deleteVaultClip: (path: string) => Promise<void>;
  deleteVaultClips?: (paths: string[]) => Promise<void>;
  deleteFolder?: (folderName: string) => Promise<void>;
  openNewSubfolderModal?: (parentFolder: string) => void;
  onRenameFolder?: (oldFolder: string, newName: string) => Promise<void>;
  onImportClips?: (files: FileList, targetFolder: string) => Promise<void>;
  onDuplicateClip?: (filePath: string) => Promise<void>;
  setPreviewVaultClip: (clip: ClipMetadata | null) => void;
  onBackToEditor: () => void;
  onStartVaultTour?: () => void;
}

// ---------------------------------------------------------------------------
// Folder Card (Windows Explorer / Drive Grid View)
// ---------------------------------------------------------------------------
interface FolderCardProps {
  folderPath: string;
  displayName: string;
  directClipCount: number;
  totalClipCount: number;
  subfolderCount: number;
  isSelected: boolean;
  isDragOver: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDelete?: () => void;
  onRename?: () => void;
  onOpenNewSubfolder?: () => void;
  onOpenInExplorer?: () => void;
}

const FolderCard: React.FC<FolderCardProps> = ({
  displayName,
  directClipCount,
  subfolderCount,
  isSelected,
  isDragOver,
  onClick,
  onContextMenu,
  onDrop,
  onDragOver,
  onDragLeave,
  onDelete,
  onRename,
  onOpenNewSubfolder,
  onOpenInExplorer,
}) => {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
        isDragOver
          ? "bg-amber-400/20 border-amber-400 ring-2 ring-amber-400 scale-[1.02] shadow-[0_0_25px_rgba(251,191,36,0.35)]"
          : isSelected
          ? "bg-[#1e1a12] border-amber-400/70 shadow-lg ring-1 ring-amber-400/30"
          : "bg-[#141414] hover:bg-[#1c1c1c] border-white/5 hover:border-amber-400/40 hover:shadow-xl"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Folder className="w-6 h-6 text-amber-400 fill-amber-400/20" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
              {displayName}
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {directClipCount} {directClipCount === 1 ? "video" : "videos"}
              {subfolderCount > 0 && ` • ${subfolderCount} subfolder${subfolderCount > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Hover Actions Menu */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onOpenNewSubfolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNewSubfolder();
              }}
              title="Add Subfolder"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-400 hover:text-black text-gray-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenInExplorer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInExplorer();
              }}
              title="Open in Windows Explorer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-400 hover:text-black text-gray-300 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}
          {onRename && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              title="Rename Folder"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-blue-500 hover:text-white text-gray-300 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Folder"
              className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500 font-mono">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-gray-600" /> File folder
        </span>
        <span className="text-amber-400/80 group-hover:text-amber-400 font-sans font-bold flex items-center gap-0.5">
          {isDragOver ? "Drop to Move Here" : "Open"} <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Folder Row (Windows Explorer / Drive List View)
// ---------------------------------------------------------------------------
const FolderRow: React.FC<FolderCardProps> = ({
  displayName,
  directClipCount,
  subfolderCount,
  isSelected,
  isDragOver,
  onClick,
  onContextMenu,
  onDrop,
  onDragOver,
  onDragLeave,
  onDelete,
  onRename,
  onOpenNewSubfolder,
  onOpenInExplorer,
}) => {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`group px-4 py-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between select-none ${
        isDragOver
          ? "bg-amber-400/20 border-amber-400 ring-1 ring-amber-400"
          : isSelected
          ? "bg-[#1e1a12] border-amber-400/60"
          : "bg-[#141414] hover:bg-[#1a1a1a] border-white/5 hover:border-amber-400/30"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20 shrink-0" />
        <span className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
          {displayName}
        </span>
      </div>

      <div className="flex items-center gap-6 text-[11px] text-gray-400">
        <span className="w-24 text-right">
          {directClipCount} {directClipCount === 1 ? "video" : "videos"}
        </span>
        <span className="w-24 text-right hidden sm:inline">
          {subfolderCount > 0 ? `${subfolderCount} subfolders` : "No subfolders"}
        </span>
        <span className="w-24 text-right font-mono text-gray-500 hidden md:inline">
          File folder
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onOpenNewSubfolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNewSubfolder();
              }}
              title="Add Subfolder"
              className="p-1 rounded-lg bg-white/10 hover:bg-amber-400 hover:text-black text-gray-300 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenInExplorer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInExplorer();
              }}
              title="Open in Windows Explorer"
              className="p-1 rounded-lg bg-white/10 hover:bg-amber-400 hover:text-black text-gray-300 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
          )}
          {onRename && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
              title="Rename Folder"
              className="p-1 rounded-lg bg-white/10 hover:bg-blue-500 hover:text-white text-gray-300 transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete Folder"
              className="p-1 rounded-lg bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Video Clip Card (9:16 Preview Card with Native OS Drag-Out)
// ---------------------------------------------------------------------------
const VaultClipCard: React.FC<{
  clip: ClipMetadata;
  isSelected: boolean;
  selectedCount: number;
  onToggleSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, clip: ClipMetadata) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}> = ({
  clip,
  isSelected,
  selectedCount,
  onToggleSelect,
  onClick,
  onDelete,
  onContextMenu,
  onDragStart,
  onDragEnd,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = useState(false);

  const handleMouseEnter = () => {
    if (videoRef.current && !hasError) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && !hasError) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0.1;
      } catch {}
    }
  };

  const videoSrc = clip.url
    ? `${clip.url}#t=0.1`
    : clip.path
    ? `local:///${clip.path.replace(/\\/g, "/")}#t=0.1`
    : "";

  return (
    <div
      draggable
      onDragStart={(e) => {
        // Native Electron Drag-Out to Windows desktop / Video Editors
        if ((window as any).electronAPI?.startDrag && clip.path) {
          (window as any).electronAPI.startDrag(clip.path);
        }
        onDragStart(e);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => onContextMenu(e, clip)}
      className={`bg-[#141414] rounded-2xl border transition-all cursor-pointer group flex flex-col relative overflow-hidden active:scale-95 ${
        isSelected
          ? "border-amber-400 ring-1 ring-amber-400/40 shadow-xl"
          : "border-white/5 hover:border-amber-400/50 hover:shadow-xl"
      }`}
      onClick={onClick}
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
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSelect(e);
          }}
          className="absolute top-2 left-2 z-20 p-1.5 rounded-lg bg-black/80 hover:bg-black text-white border border-white/20 transition-all cursor-pointer shadow-lg"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-amber-400" />
          ) : (
            <Square className="w-4 h-4 text-gray-400 hover:text-white" />
          )}
        </button>

        {/* Quick Delete Hover Button */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetPath = clip.path || clip.url || clip.filename;
            if (targetPath) {
              onDelete(targetPath);
            }
          }}
          title="Delete Clip Permanently"
          className="absolute top-2 right-2 z-30 p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-400/50 transition-all cursor-pointer shadow-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center hover:scale-110 active:scale-95"
        >
          <Trash2 className="w-4 h-4 text-white pointer-events-none" />
        </button>

        <div className="absolute top-2 right-2 group-hover:opacity-0 transition-opacity bg-black/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10 pointer-events-none">
          9:16
        </div>

        <div className="absolute bottom-2 left-2 bg-amber-400/90 text-black px-2 py-0.5 rounded-md text-[10px] font-extrabold shadow-lg flex items-center gap-1">
          <Zap className="w-3 h-3 fill-black" /> Score: {clip.virality_score || 99}
        </div>

        {isSelected && selectedCount > 1 && (
          <div className="absolute bottom-2 right-2 bg-amber-400 text-black px-2 py-0.5 rounded-md text-[10px] font-black shadow-lg">
            +{selectedCount - 1} more
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
            <Play className="w-5 h-5 fill-white text-white ml-1" />
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between bg-[#141414]">
        <div>
          <h4 className="text-xs font-bold text-white truncate mb-1" title={clip.title}>
            {clip.title}
          </h4>
          <p className="text-[10px] text-gray-400 truncate font-mono">
            {clip.filename}
          </p>
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
          <span className="truncate max-w-[110px]">📁 {clip.folder || "Main Library"}</span>
          <span>{clip.file_size || ""}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main SavedClipsVault Component
// ---------------------------------------------------------------------------
export const SavedClipsVault: React.FC<SavedClipsVaultProps> = ({
  vaultClips,
  vaultFolders,
  vaultLoading,
  vaultSearch,
  setVaultSearch,
  vaultSelectedFolder,
  setVaultSelectedFolder,
  selectedClipPaths,
  setSelectedClipPaths,
  draggedClipPath,
  setDraggedClipPath,
  onDropOnFolder,
  setShowNewFolderModal,
  openOutputFolder,
  chooseCustomDirectory,
  customOutputDir,
  lastOutputFolder,
  exportNotice,
  setExportNotice,
  setMoveModalClips,
  deleteVaultClip,
  deleteVaultClips,
  deleteFolder,
  openNewSubfolderModal,
  onRenameFolder,
  onImportClips,
  onDuplicateClip,
  setPreviewVaultClip,
  onBackToEditor,
  onStartVaultTour,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; clip: ClipMetadata } | null>(null);
  const [folderContextMenu, setFolderContextMenu] = useState<{ x: number; y: number; folder: string } | null>(null);
  const [folderViewMode, setFolderViewMode] = useState<"grid" | "list">("grid");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState<string | null>(null);
  const [isWindowFileDragging, setIsWindowFileDragging] = useState(false);
  const [sortBy, setSortBy] = useState<"virality" | "newest" | "oldest" | "alpha">("virality");
  const [renameModalState, setRenameModalState] = useState<{ isOpen: boolean; oldFolder: string; newName: string }>({
    isOpen: false,
    oldFolder: "",
    newName: "",
  });

  const [cacheSizeMb, setCacheSizeMb] = useState<number | null>(null);
  const [isCleaningCache, setIsCleaningCache] = useState(false);

  const fetchCacheInfo = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/cache_info");
      if (res.ok) {
        const data = await res.json();
        setCacheSizeMb(data.size_mb);
      }
    } catch {}
  };

  useEffect(() => {
    fetchCacheInfo();
  }, []);

  const handleCleanCache = async () => {
    if (isCleaningCache) return;
    setIsCleaningCache(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/clear_cache", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`✓ Cleared cache! Freed ${data.freed_mb} MB of temporary disk space.`);
        setTimeout(() => setExportNotice(""), 4000);
        fetchCacheInfo();
      }
    } catch (err) {
      console.error("Failed to clean cache:", err);
    } finally {
      setIsCleaningCache(false);
    }
  };

  // -------------------------------------------------------------------------
  // Keyboard Shortcuts (Delete, Escape, Ctrl+A)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedClipPaths([]);
        setContextMenu(null);
        setFolderContextMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClipPaths]);

  // -------------------------------------------------------------------------
  // Explorer Directory Hierarchy Logic
  // -------------------------------------------------------------------------
  const isRoot = vaultSelectedFolder === "all" || vaultSelectedFolder === "Main Library" || !vaultSelectedFolder;
  const currentPathSegments = isRoot ? [] : vaultSelectedFolder.split("/").filter(Boolean);

  // Discover subfolders belonging directly to the current directory level
  const directFolders = vaultFolders.filter((f) => {
    if (isRoot) {
      return !f.includes("/");
    } else {
      const prefix = `${vaultSelectedFolder}/`;
      if (!f.startsWith(prefix)) return false;
      const remainder = f.slice(prefix.length);
      return remainder.length > 0 && !remainder.includes("/");
    }
  });

  // Calculate parent folder for "Up One Level"
  const getParentFolder = (): string => {
    if (isRoot || currentPathSegments.length <= 1) return "all";
    return currentPathSegments.slice(0, -1).join("/");
  };

  // Clips filtering & sorting (strictly shows clips directly in active directory)
  const filteredClips = vaultClips
    .filter((clip) => {
      const isClipInRoot = clip.folder === "Main Library" || clip.folder === "root" || !clip.folder || clip.folder === ".";
      const matchesFolder = isRoot ? isClipInRoot : clip.folder === vaultSelectedFolder;
      const matchesSearch =
        !vaultSearch ||
        clip.title.toLowerCase().includes(vaultSearch.toLowerCase()) ||
        clip.filename.toLowerCase().includes(vaultSearch.toLowerCase());
      return matchesFolder && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "virality") {
        return (b.virality_score || 0) - (a.virality_score || 0);
      } else if (sortBy === "newest") {
        return (b.created_at || 0) - (a.created_at || 0);
      } else if (sortBy === "oldest") {
        return (a.created_at || 0) - (b.created_at || 0);
      } else if (sortBy === "alpha") {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

  // Handle Drag Move (Multi-clip or single)
  const handleDropClips = (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    setDragOverBreadcrumb(null);

    // If external files dropped from OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onImportClips) {
        onImportClips(e.dataTransfer.files, targetFolder === "all" ? "Main Library" : targetFolder);
      }
      return;
    }

    onDropOnFolder(e, targetFolder);
  };

  return (
    <div
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          setIsWindowFileDragging(true);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (e.relatedTarget === null) {
          setIsWindowFileDragging(false);
        }
      }}
      onDrop={(e) => {
        setIsWindowFileDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onImportClips) {
          onImportClips(
            e.dataTransfer.files,
            vaultSelectedFolder === "all" ? "Main Library" : vaultSelectedFolder
          );
        }
      }}
      className="flex-1 bg-[#0a0a0a] overflow-y-auto p-6 md:p-8 animate-fadeIn relative"
    >
      {/* External OS File Drop Overlay */}
      {isWindowFileDragging && (
        <div className="fixed inset-0 z-50 bg-amber-400/20 backdrop-blur-md border-4 border-dashed border-amber-400 flex flex-col items-center justify-center p-8 text-center animate-fadeIn pointer-events-none">
          <UploadCloud className="w-16 h-16 text-amber-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-black text-white">Drop Video Files to Import</h2>
          <p className="text-sm font-bold text-amber-300 mt-1">
            Files will be imported into:{" "}
            <span className="font-mono bg-black/50 px-2 py-0.5 rounded">
              {isRoot ? "Main Library" : vaultSelectedFolder}
            </span>
          </p>
        </div>
      )}

      {/* Rename Folder Modal */}
      {renameModalState.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setRenameModalState({ isOpen: false, oldFolder: "", newName: "" })}
        >
          <div
            className="bg-[#141414] border border-amber-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" /> Rename Folder
            </h3>
            <p className="text-xs text-gray-400">
              Renaming <span className="font-bold text-white">"{renameModalState.oldFolder}"</span>
            </p>
            <input
              type="text"
              autoFocus
              value={renameModalState.newName}
              onChange={(e) =>
                setRenameModalState((prev) => ({ ...prev, newName: e.target.value }))
              }
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && onRenameFolder) {
                  onRenameFolder(renameModalState.oldFolder, renameModalState.newName);
                  setRenameModalState({ isOpen: false, oldFolder: "", newName: "" });
                }
              }}
              placeholder="Enter new folder name..."
              className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/60 border border-white/20 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 cursor-text select-text pointer-events-auto shadow-inner"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  setRenameModalState({ isOpen: false, oldFolder: "", newName: "" })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onRenameFolder) {
                    onRenameFolder(renameModalState.oldFolder, renameModalState.newName);
                  }
                  setRenameModalState({ isOpen: false, oldFolder: "", newName: "" });
                }}
                className="px-5 py-2 rounded-xl text-xs font-black bg-amber-400 text-black hover:bg-amber-300 transition-all shadow-md cursor-pointer"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clip Right-Click Context Menu */}
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
              top: Math.min(contextMenu.y, window.innerHeight - 260),
              left: Math.min(contextMenu.x, window.innerWidth - 240),
            }}
            className="fixed z-50 w-56 bg-[#141414]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 animate-scaleIn text-xs font-semibold select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-white/5 mb-1">
              <p className="text-white font-bold truncate">{contextMenu.clip.title}</p>
              <p className="text-[10px] text-gray-500 font-mono truncate">{contextMenu.clip.filename}</p>
            </div>

            <button
              onClick={() => {
                setPreviewVaultClip(contextMenu.clip);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Play className="w-4 h-4 text-amber-400" /> Play Preview
            </button>

            <button
              onClick={() => {
                (window as any).electronAPI?.showItemInFolder?.(contextMenu.clip.path);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-blue-400" /> Reveal in Explorer
            </button>

            <button
              onClick={() => {
                setMoveModalClips([contextMenu.clip.path]);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Move className="w-4 h-4 text-purple-400" /> Move to Folder...
            </button>

            {onDuplicateClip && (
              <button
                onClick={() => {
                  onDuplicateClip(contextMenu.clip.path);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 text-emerald-400" /> Duplicate Clip
              </button>
            )}

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

            <div className="h-px bg-white/10 my-1" />

            <button
              onClick={() => {
                deleteVaultClip(contextMenu.clip.path || contextMenu.clip.url || contextMenu.clip.filename);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors text-left cursor-pointer font-bold"
            >
              <Trash2 className="w-4 h-4 text-red-400" /> Delete Permanently
            </button>
          </div>
        </div>
      )}

      {/* Folder Right-Click Context Menu */}
      {folderContextMenu && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setFolderContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setFolderContextMenu(null);
          }}
        >
          <div
            style={{
              top: Math.min(folderContextMenu.y, window.innerHeight - 240),
              left: Math.min(folderContextMenu.x, window.innerWidth - 220),
            }}
            className="fixed z-50 bg-[#181818] border border-white/15 rounded-2xl p-1.5 shadow-2xl min-w-[210px] text-xs font-bold animate-fadeIn space-y-0.5 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 text-[10px] text-gray-500 font-extrabold uppercase border-b border-white/10 mb-1 truncate">
              📁 {folderContextMenu.folder}
            </div>

            <button
              onClick={() => {
                setVaultSelectedFolder(folderContextMenu.folder);
                setFolderContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" /> Open Folder
            </button>

            <button
              onClick={() => {
                if (openNewSubfolderModal) {
                  openNewSubfolderModal(folderContextMenu.folder);
                } else {
                  setShowNewFolderModal(true);
                }
                setFolderContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" /> New Subfolder inside...
            </button>

            {onRenameFolder && (
              <button
                onClick={() => {
                  const currentName = folderContextMenu.folder.split("/").pop() || folderContextMenu.folder;
                  setRenameModalState({
                    isOpen: true,
                    oldFolder: folderContextMenu.folder,
                    newName: currentName,
                  });
                  setFolderContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-blue-400" /> Rename Folder...
              </button>
            )}

            <button
              onClick={() => {
                openOutputFolder(folderContextMenu.folder);
                setFolderContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-blue-400" /> Open in Explorer
            </button>

            <div className="h-px bg-white/10 my-1" />

            {deleteFolder && (
              <button
                onClick={() => {
                  deleteFolder(folderContextMenu.folder);
                  setFolderContextMenu(null);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors text-left cursor-pointer font-bold"
              >
                <Trash2 className="w-4 h-4 text-red-400" /> Delete Folder
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              <FolderCheck className="text-amber-400 w-7 h-7" />
              <span>Saved Clips Vault</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/30 font-extrabold tracking-wide">
              {vaultClips.length} {vaultClips.length === 1 ? "Video" : "Videos"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Windows Explorer-style file organization. Drag clips between folders, drag out to desktop, or drop external videos to import.
          </p>
        </div>

        <div id="vault-tour-step-1-storage" className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
          {/* Primary Action: Open in Windows Explorer */}
          <button
            onClick={() => openOutputFolder(vaultSelectedFolder !== "all" && vaultSelectedFolder !== "Main Library" ? vaultSelectedFolder : undefined)}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(251,191,36,0.25)] flex items-center gap-1.5 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-95"
            title="Open the active folder in native Windows Explorer"
          >
            <FolderOpen className="w-4 h-4 text-black" />
            <span>Open in Explorer</span>
          </button>

          {/* Secondary Action: Change Directory */}
          <button
            onClick={chooseCustomDirectory}
            className="px-3 py-2 rounded-xl bg-[#141416] hover:bg-white/10 text-gray-200 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 hover:border-amber-400/40"
            title="Change output storage drive or custom directory"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Change Dir</span>
          </button>

          {/* Free Up Space / Clean Temp Cache */}
          <button
            onClick={handleCleanCache}
            disabled={isCleaningCache}
            className="px-3 py-2 rounded-xl bg-[#141416] hover:bg-white/10 text-gray-200 hover:text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 hover:border-amber-400/40"
            title="Clean temporary downloads, audio chunks, and frame cache to free up hard drive space"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isCleaningCache ? "Cleaning..." : cacheSizeMb !== null && cacheSizeMb > 0 ? `Free Space (${cacheSizeMb} MB)` : "Free Space"}</span>
          </button>

          {/* Guided Walkthrough Button */}
          {onStartVaultTour && (
            <button
              onClick={onStartVaultTour}
              className="px-3 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm hover:scale-[1.02] active:scale-95"
              title="Launch Saved Clips Vault Walkthrough"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Walkthrough</span>
            </button>
          )}

          {/* Back to Studio Navigation */}
          <button
            onClick={onBackToEditor}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-95 shadow-sm"
            title="Return to AI Clipper Studio"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-white" />
            <span>Back to Studio</span>
          </button>
        </div>
      </div>

      {/* Explorer Breadcrumb Navigation Path Bar (with Drop Target Support) */}
      <div id="vault-tour-step-2-breadcrumbs" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-[#121212] border border-white/10 rounded-2xl p-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin py-1">
          {!isRoot && (
            <button
              onClick={() => setVaultSelectedFolder(getParentFolder())}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverBreadcrumb(getParentFolder());
              }}
              onDragLeave={() => setDragOverBreadcrumb(null)}
              onDrop={(e) => handleDropClips(e, getParentFolder())}
              title="Go Up One Level"
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer ${
                dragOverBreadcrumb === getParentFolder()
                  ? "bg-amber-400 text-black ring-2 ring-amber-400"
                  : "bg-white/10 hover:bg-amber-400 hover:text-black text-amber-400"
              }`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}

          {/* Root Breadcrumb Chip (Drop clips here to move to Root!) */}
          <button
            onClick={() => setVaultSelectedFolder("all")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverBreadcrumb("all");
            }}
            onDragLeave={() => setDragOverBreadcrumb(null)}
            onDrop={(e) => handleDropClips(e, "Main Library")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              dragOverBreadcrumb === "all"
                ? "bg-amber-400 text-black ring-2 ring-amber-400 shadow-lg scale-105"
                : isRoot
                ? "bg-amber-400 text-black shadow-md font-extrabold"
                : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" /> All Vault Clips (Root)
          </button>

          {currentPathSegments.map((segment, index) => {
            const segmentFullPath = currentPathSegments.slice(0, index + 1).join("/");
            const isLast = index === currentPathSegments.length - 1;
            const isTarget = dragOverBreadcrumb === segmentFullPath;
            return (
              <React.Fragment key={segmentFullPath}>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <button
                  onClick={() => setVaultSelectedFolder(segmentFullPath)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverBreadcrumb(segmentFullPath);
                  }}
                  onDragLeave={() => setDragOverBreadcrumb(null)}
                  onDrop={(e) => handleDropClips(e, segmentFullPath)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isTarget
                      ? "bg-amber-400 text-black ring-2 ring-amber-400 shadow-lg scale-105"
                      : isLast
                      ? "bg-amber-400 text-black shadow-md font-extrabold"
                      : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" /> {segment}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (openNewSubfolderModal) {
                openNewSubfolderModal(isRoot ? "root" : vaultSelectedFolder);
              } else {
                setShowNewFolderModal(true);
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            {isRoot ? "New Folder" : "New Subfolder"}
          </button>
        </div>
      </div>

      {/* Search & Filter & Sort Bar */}
      <div id="vault-tour-step-3-search" className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="flex items-center bg-[#111] border border-white/10 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search saved clips by title or filename..."
            value={vaultSearch}
            onChange={(e) => setVaultSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-white placeholder-gray-500 outline-none"
          />
        </div>

        <div className="flex items-center bg-[#111] border border-white/10 rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
          <select
            value={vaultSelectedFolder}
            onChange={(e) => setVaultSelectedFolder(e.target.value)}
            className="w-full bg-transparent text-xs text-white outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#111] text-white">
              📁 All Folders ({vaultClips.length} clips)
            </option>
            {vaultFolders.map((f) => (
              <option key={f} value={f} className="bg-[#111] text-white">
                📁 {f} ({vaultClips.filter((c) => c.folder === f).length} clips)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center bg-[#111] border border-white/10 rounded-xl px-3 py-2">
          <ArrowUpDown className="w-4 h-4 text-amber-400 mr-2 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-transparent text-xs text-white outline-none cursor-pointer"
          >
            <option value="virality" className="bg-[#111] text-white">
              ⚡ Highest Virality Score
            </option>
            <option value="newest" className="bg-[#111] text-white">
              🕒 Newest First
            </option>
            <option value="oldest" className="bg-[#111] text-white">
              ⏳ Oldest First
            </option>
            <option value="alpha" className="bg-[#111] text-white">
              🔤 Title (A-Z)
            </option>
          </select>
        </div>

        <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2 overflow-hidden">
          <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0">Saved In:</span>
          <button
            type="button"
            onClick={openOutputFolder}
            title="Click to open this folder in Explorer"
            className="text-xs font-mono text-amber-400 hover:text-amber-300 underline truncate max-w-[150px] text-left cursor-pointer"
          >
            {customOutputDir || lastOutputFolder || "Default (engine/clips)"}
          </button>
          <button
            type="button"
            onClick={chooseCustomDirectory}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[10px] font-bold text-gray-300 hover:text-white border border-white/10 shrink-0 transition-colors cursor-pointer"
          >
            Change
          </button>
        </div>
      </div>

      {/* Notifications */}
      {exportNotice && (
        <div className="mb-6 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold animate-fadeIn flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {exportNotice}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 1: ALL FOLDERS (Windows Explorer Style)                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-white tracking-wide uppercase">
              {isRoot ? "All Folders" : `Subfolders in ${currentPathSegments[currentPathSegments.length - 1]}`}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-400">
              {directFolders.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-[#141414] border border-white/10 rounded-xl p-1 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFolderViewMode("grid")}
                title="Grid View"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  folderViewMode === "grid" ? "bg-amber-400 text-black shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFolderViewMode("list")}
                title="List View"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  folderViewMode === "list" ? "bg-amber-400 text-black shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {directFolders.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#121212] border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2">
            <FolderPlus className="w-8 h-8 text-gray-600 mb-1" />
            <p className="text-xs text-gray-400 font-bold">
              {isRoot ? "No custom folders yet" : "No subfolders in this folder"}
            </p>
            <p className="text-[11px] text-gray-500 max-w-sm">
              Organize your clips into categories like TikTok Highlights, Stream Highlights, or Shorts.
            </p>
            <button
              onClick={() => {
                if (openNewSubfolderModal) {
                  openNewSubfolderModal(isRoot ? "root" : vaultSelectedFolder);
                } else {
                  setShowNewFolderModal(true);
                }
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-400 text-black font-bold text-xs hover:bg-amber-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> {isRoot ? "Create First Folder" : "Create Subfolder"}
            </button>
          </div>
        ) : folderViewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {directFolders.map((folderPath) => {
              const displayName = folderPath.split("/").pop() || folderPath;
              const directClips = vaultClips.filter((c) => c.folder === folderPath).length;
              const totalClips = vaultClips.filter(
                (c) => c.folder === folderPath || c.folder.startsWith(`${folderPath}/`)
              ).length;
              const subfolderCount = vaultFolders.filter(
                (f) => f.startsWith(`${folderPath}/`) && !f.slice(folderPath.length + 1).includes("/")
              ).length;
              const isSelected = vaultSelectedFolder === folderPath;
              const isDragOver = dragOverFolder === folderPath;

              return (
                <FolderCard
                  key={folderPath}
                  folderPath={folderPath}
                  displayName={displayName}
                  directClipCount={directClips}
                  totalClipCount={totalClips}
                  subfolderCount={subfolderCount}
                  isSelected={isSelected}
                  isDragOver={isDragOver}
                  onClick={() => setVaultSelectedFolder(folderPath)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setFolderContextMenu({ x: e.clientX, y: e.clientY, folder: folderPath });
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolder(folderPath);
                  }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => handleDropClips(e, folderPath)}
                  onDelete={deleteFolder ? () => deleteFolder(folderPath) : undefined}
                  onRename={() => {
                    setRenameModalState({
                      isOpen: true,
                      oldFolder: folderPath,
                      newName: displayName,
                    });
                  }}
                  onOpenNewSubfolder={
                    openNewSubfolderModal ? () => openNewSubfolderModal(folderPath) : undefined
                  }
                  onOpenInExplorer={() => openOutputFolder(folderPath)}
                />
              );
            })}

            {/* Quick Add Folder Card */}
            <div
              onClick={() => {
                if (openNewSubfolderModal) {
                  openNewSubfolderModal(isRoot ? "root" : vaultSelectedFolder);
                } else {
                  setShowNewFolderModal(true);
                }
              }}
              className="p-4 rounded-2xl border border-dashed border-white/15 hover:border-amber-400/60 bg-[#121212] hover:bg-[#181818] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center group min-h-[110px]"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-amber-400/20 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">
                {isRoot ? "+ Add New Folder" : "+ Add Subfolder"}
              </span>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="flex flex-col gap-2">
            <div className="px-4 py-2 text-[10px] font-extrabold uppercase text-gray-500 flex items-center justify-between border-b border-white/5">
              <span>Name</span>
              <div className="flex items-center gap-6">
                <span className="w-24 text-right">Videos</span>
                <span className="w-24 text-right hidden sm:inline">Subfolders</span>
                <span className="w-24 text-right hidden md:inline">Type</span>
                <span className="w-12 text-right">Actions</span>
              </div>
            </div>
            {directFolders.map((folderPath) => {
              const displayName = folderPath.split("/").pop() || folderPath;
              const directClips = vaultClips.filter((c) => c.folder === folderPath).length;
              const totalClips = vaultClips.filter(
                (c) => c.folder === folderPath || c.folder.startsWith(`${folderPath}/`)
              ).length;
              const subfolderCount = vaultFolders.filter(
                (f) => f.startsWith(`${folderPath}/`) && !f.slice(folderPath.length + 1).includes("/")
              ).length;
              const isSelected = vaultSelectedFolder === folderPath;
              const isDragOver = dragOverFolder === folderPath;

              return (
                <FolderRow
                  key={folderPath}
                  folderPath={folderPath}
                  displayName={displayName}
                  directClipCount={directClips}
                  totalClipCount={totalClips}
                  subfolderCount={subfolderCount}
                  isSelected={isSelected}
                  isDragOver={isDragOver}
                  onClick={() => setVaultSelectedFolder(folderPath)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setFolderContextMenu({ x: e.clientX, y: e.clientY, folder: folderPath });
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolder(folderPath);
                  }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => handleDropClips(e, folderPath)}
                  onDelete={deleteFolder ? () => deleteFolder(folderPath) : undefined}
                  onRename={() => {
                    setRenameModalState({
                      isOpen: true,
                      oldFolder: folderPath,
                      newName: displayName,
                    });
                  }}
                  onOpenNewSubfolder={
                    openNewSubfolderModal ? () => openNewSubfolderModal(folderPath) : undefined
                  }
                  onOpenInExplorer={() => openOutputFolder(folderPath)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Drag & Drop Interactivity Banner */}
      <div id="vault-tour-step-4-drag" className="mb-6 p-3 rounded-2xl bg-amber-400/5 border border-amber-400/20 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-300/80">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-amber-300">Drag & Drop:</strong> Drag video cards onto folder cards or breadcrumb chips above to move them.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
          <span>Drop external MP4 files anywhere into this window to import.</span>
        </div>
      </div>

      {/* Multi-Selection Batch Actions Bar */}
      {selectedClipPaths.length > 0 && (
        <div className="mb-6 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
            <CheckSquare className="w-4 h-4 text-amber-400" />
            <span>{selectedClipPaths.length} Clip(s) Selected</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMoveModalClips(selectedClipPaths)}
              className="px-3 py-1.5 rounded-xl bg-amber-400 text-black font-extrabold text-xs hover:bg-amber-300 transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Folder className="w-3.5 h-3.5" /> Move to Folder...
            </button>
            {onDuplicateClip && (
              <button
                onClick={async () => {
                  for (const path of selectedClipPaths) {
                    await onDuplicateClip(path);
                  }
                  setSelectedClipPaths([]);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate Selected
              </button>
            )}
            <button
              onClick={async () => {
                if (deleteVaultClips) {
                  await deleteVaultClips(selectedClipPaths);
                } else {
                  for (const path of selectedClipPaths) {
                    await deleteVaultClip(path);
                  }
                  setSelectedClipPaths([]);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs hover:bg-red-500/30 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedClipPaths([])}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SECTION 2: VIDEOS & CLIPS GALLERY                                 */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white tracking-wide uppercase">
              {isRoot ? "All Saved Videos" : `Videos in ${currentPathSegments[currentPathSegments.length - 1]}`}
            </h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {filteredClips.length}
            </span>
          </div>

          {filteredClips.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (selectedClipPaths.length === filteredClips.length) {
                    setSelectedClipPaths([]);
                  } else {
                    setSelectedClipPaths(filteredClips.map((c) => c.path));
                  }
                }}
                className="text-xs text-gray-400 hover:text-white font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                {selectedClipPaths.length === filteredClips.length ? "Deselect All" : "Select All"}
              </button>
            </div>
          )}
        </div>

        {vaultLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-3" />
            <p className="text-sm font-bold text-gray-400">Loading your Saved Clips Vault...</p>
          </div>
        ) : filteredClips.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center bg-[#121212]/50 border border-dashed border-white/5 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <FolderCheck className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No Videos in this Directory</h3>
            <p className="text-xs text-gray-500 max-w-sm">
              {isRoot
                ? "No clips found. Start creating clips in Studio or drop MP4 files here!"
                : `No clips in "${vaultSelectedFolder}". Drag and drop clips here or drop files from your desktop.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredClips.map((clip) => {
              const isSelected = selectedClipPaths.includes(clip.path);
              return (
                <VaultClipCard
                  key={clip.path}
                  clip={clip}
                  isSelected={isSelected}
                  selectedCount={selectedClipPaths.length}
                  onClick={() => setPreviewVaultClip(clip)}
                  onDelete={(path) => deleteVaultClip(path)}
                  onContextMenu={(e, c) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, clip: c });
                  }}
                  onToggleSelect={(e) => {
                    e.stopPropagation();
                    setSelectedClipPaths((prev) =>
                      prev.includes(clip.path) ? prev.filter((p) => p !== clip.path) : [...prev, clip.path]
                    );
                  }}
                  onDragStart={(e) => {
                    // Support multi-clip drag: if dragged item is selected, keep selection
                    const dragPayload =
                      isSelected && selectedClipPaths.length > 1
                        ? JSON.stringify(selectedClipPaths)
                        : clip.path;
                    setDraggedClipPath(clip.path);
                    e.dataTransfer.setData("text/plain", dragPayload);
                  }}
                  onDragEnd={() => setDraggedClipPath(null)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
