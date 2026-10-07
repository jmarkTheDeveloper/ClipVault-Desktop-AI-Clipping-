import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  FolderCheck,
  FolderOpen,
  FolderPlus,
  Plus,
  Folder,
  RefreshCw,
  Search,
  Sparkles,
  X,
  Trash2,
} from "lucide-react";
import { SavedClipsVault } from "../components/clipper/SavedClipsVault";
import { ClipDetailsModal } from "../components/clipper/ClipDetailsModal";
import type { ClipMetadata } from "../components/clipper/types";

interface SavedVaultScreenProps {
  onBack: () => void;
  onStartVaultTour?: () => void;
}

export const SavedVaultScreen: React.FC<SavedVaultScreenProps> = ({
  onBack,
  onStartVaultTour,
}) => {
  const [vaultClips, setVaultClips] = useState<ClipMetadata[]>([]);
  const [vaultFolders, setVaultFolders] = useState<string[]>([]);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultSelectedFolder, setVaultSelectedFolder] = useState("all");
  const [selectedClipPaths, setSelectedClipPaths] = useState<string[]>([]);
  const [draggedClipPath, setDraggedClipPath] = useState<string | null>(null);

  // Modals
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("root");
  const [moveModalClips, setMoveModalClips] = useState<string[] | null>(null);
  const [previewVaultClip, setPreviewVaultClip] = useState<ClipMetadata | null>(null);

  // Storage / Path
  const [exportNotice, setExportNotice] = useState("");
  const [customOutputDir, setCustomOutputDir] = useState("");
  const [lastOutputFolder, setLastOutputFolder] = useState("");
  const [isCleaningCache, setIsCleaningCache] = useState(false);

  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const vaultFetchAbortRef = useRef<AbortController | null>(null);

  const handleCleanCache = async () => {
    if (isCleaningCache) return;
    setIsCleaningCache(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/clear_cache", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Cleared cache! Freed ${data.freed_mb} MB of temporary disk space.`);
        setTimeout(() => setExportNotice(""), 4000);
      }
    } catch (err) {
      console.error("Failed to clean cache:", err);
    } finally {
      setIsCleaningCache(false);
    }
  };

  useEffect(() => {
    if (showNewFolderModal) {
      setTimeout(() => newFolderInputRef.current?.focus(), 100);
    }
  }, [showNewFolderModal]);

  const loadVaultClips = async (silent = false) => {
    if (vaultFetchAbortRef.current) {
      try { vaultFetchAbortRef.current.abort(); } catch {}
      vaultFetchAbortRef.current = null;
    }

    if (!silent) {
      setVaultLoading(true);
      setVaultError(null);
    }

    try {
      const controller = new AbortController();
      vaultFetchAbortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch("http://127.0.0.1:8000/api/saved_clips", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setVaultClips(data.clips || []);
        const standardFolders = ["Shorts Viral", "Movies", "Stream Highlights"];
        const fetchedFolders = (data.folders || []).filter(
          (f: string) => f && f !== "Main Library" && f !== "all" && f !== "root"
        );
        const combined = Array.from(new Set([...standardFolders, ...fetchedFolders]));
        setVaultFolders(combined);
        if (data.storage_dir || data.output_dir) {
          setLastOutputFolder(data.storage_dir || data.output_dir);
        }
        setVaultError(null);
        setVaultLoading(false);
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      setVaultLoading(false);
      if (!silent && err?.name !== "AbortError") {
        setVaultError("Cannot connect to ClipVault engine. Please verify the backend is running.");
      }
    }
  };

  useEffect(() => {
    loadVaultClips();
  }, []);

  const openOutputFolder = (folderName?: string) => {
    const targetFolder = folderName || vaultSelectedFolder;
    fetch("http://127.0.0.1:8000/api/open_folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(targetFolder && targetFolder !== "all" ? { folder_name: targetFolder } : {}),
    }).catch(() => {});
  };

  const chooseCustomDirectory = async () => {
    if ((window as any).electronAPI?.selectDirectory) {
      try {
        const selected = await (window as any).electronAPI.selectDirectory();
        if (selected) {
          setCustomOutputDir(selected);
          const res = await fetch("http://127.0.0.1:8000/api/set_output_dir", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ output_dir: selected }),
          });
          const data = await res.json().catch(() => ({}));
          if (data.success) {
            setExportNotice(`Output storage changed to: ${selected}`);
            setTimeout(() => setExportNotice(""), 4000);
            loadVaultClips(true);
          }
        }
      } catch (err) {
        console.error("Failed to select output directory:", err);
      }
    }
  };

  const deleteVaultClip = async (filePath: string) => {
    if (!filePath) return;
    const decodedPath = decodeURIComponent(filePath);
    const cleanName = decodedPath.split(/[/\\]/).pop() || decodedPath;

    // Disconnect playing video in DOM if needed
    if (typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((v) => {
        try {
          const s = decodeURIComponent(v.currentSrc || v.src || "");
          if (s.includes(cleanName) || s.includes(decodedPath)) {
            v.pause();
            v.removeAttribute("src");
            v.load();
          }
        } catch {}
      });
    }

    if (previewVaultClip && (previewVaultClip.path === filePath || previewVaultClip.path === decodedPath)) {
      setPreviewVaultClip(null);
    }

    setVaultClips((prev) =>
      prev.filter((c) => {
        if (!c) return false;
        const cPath = decodeURIComponent(String(c.path || ""));
        const cName = decodeURIComponent(String(c.filename || ""));
        return cPath !== decodedPath && cName !== cleanName && !cPath.endsWith(cleanName);
      })
    );
    setSelectedClipPaths((prev) => prev.filter((p) => decodeURIComponent(p) !== decodedPath));

    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: decodedPath, file_path: decodedPath, filename: cleanName }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice("Clip deleted permanently!");
        setTimeout(() => setExportNotice(""), 3000);
        setTimeout(() => loadVaultClips(true), 150);
      }
    } catch (err) {
      console.error("Failed to delete clip:", err);
    }
  };

  const deleteVaultClips = async (filePaths: string[]) => {
    if (!filePaths || filePaths.length === 0) return;
    const decodedPaths = filePaths.map((fp) => decodeURIComponent(fp));
    const names = decodedPaths.map((fp) => fp.split(/[/\\]/).pop() || fp);

    if (typeof document !== "undefined") {
      document.querySelectorAll("video").forEach((v) => {
        try {
          const s = decodeURIComponent(v.currentSrc || v.src || "");
          if (names.some((n) => s.includes(n))) {
            v.pause();
            v.removeAttribute("src");
            v.load();
          }
        } catch {}
      });
    }

    setPreviewVaultClip(null);

    setVaultClips((prev) =>
      prev.filter((c) => {
        if (!c) return false;
        const cPath = decodeURIComponent(String(c.path || ""));
        const cName = decodeURIComponent(String(c.filename || ""));
        return !decodedPaths.includes(cPath) && !names.includes(cName) && !names.some((n) => cPath.endsWith(n));
      })
    );
    setSelectedClipPaths([]);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: decodedPaths }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`${data.deleted_count || decodedPaths.length} clip(s) deleted permanently!`);
        setTimeout(() => setExportNotice(""), 3000);
        setTimeout(() => loadVaultClips(true), 150);
      }
    } catch (err) {
      console.error("Failed to batch delete clips:", err);
    }
  };

  const handleMoveClips = async (clipPaths: string[], targetFolder: string) => {
    if (!clipPaths || clipPaths.length === 0) return;
    const cleanTarget = targetFolder === "all" || targetFolder === "root" ? "Main Library" : targetFolder;
    const names = clipPaths.map((p) => p.split(/[/\\]/).pop() || p);

    setVaultClips((prev) =>
      prev.map((c) => {
        if (!c) return c;
        const cPath = String(c.path || "");
        const cName = String(c.filename || "");
        if (clipPaths.includes(cPath) || names.includes(cName)) {
          return { ...c, folder: cleanTarget };
        }
        return c;
      })
    );

    try {
      const res = await fetch("http://127.0.0.1:8000/api/move_clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clip_paths: clipPaths, target_folder: cleanTarget }),
      });
      if (res.ok) {
        setMoveModalClips(null);
        setSelectedClipPaths([]);
        setExportNotice(`Moved ${clipPaths.length} clip(s) to "${cleanTarget}"`);
        setTimeout(() => setExportNotice(""), 3500);
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to move clips:", err);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!folderName || folderName === "all" || folderName === "Main Library") return;
    setVaultFolders((prev) => prev.filter((f) => f !== folderName && !f.startsWith(`${folderName}/`)));
    if (vaultSelectedFolder === folderName || vaultSelectedFolder.startsWith(`${folderName}/`)) {
      setVaultSelectedFolder("all");
    }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/delete_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_name: folderName }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Folder "${folderName}" deleted.`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderNameInput.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/create_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder_name: newFolderNameInput.trim(),
          parent_folder: newFolderParent !== "root" ? newFolderParent : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setShowNewFolderModal(false);
        const createdName = data.folder_name || data.folder || newFolderNameInput.trim();
        setVaultFolders((prev) => Array.from(new Set([...prev, createdName])));
        setVaultSelectedFolder(createdName);
        setNewFolderNameInput("");
        setNewFolderParent("root");
        setExportNotice(`Folder "${createdName}" created successfully!`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleRenameFolder = async (oldFolder: string, newName: string) => {
    if (!oldFolder || !newName.trim()) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/rename_folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_folder: oldFolder, new_name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Renamed folder to "${data.new_folder}".`);
        setTimeout(() => setExportNotice(""), 3000);
        if (vaultSelectedFolder === oldFolder) {
          setVaultSelectedFolder(data.new_folder);
        }
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to rename folder:", err);
    }
  };

  const handleImportClips = async (files: FileList, targetFolder: string) => {
    if (!files || files.length === 0) return;
    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || !file.name.match(/\.(mp4|mov|webm|mkv)$/i)) continue;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("target_folder", targetFolder || "Main Library");
      try {
        const res = await fetch("http://127.0.0.1:8000/api/import_clip", {
          method: "POST",
          body: formData,
        });
        if (res.ok) count++;
      } catch (err) {
        console.error("Failed to import file:", err);
      }
    }
    if (count > 0) {
      setExportNotice(`Imported ${count} video(s) into ${targetFolder || "Main Library"}!`);
      setTimeout(() => setExportNotice(""), 3000);
      loadVaultClips(true);
    }
  };

  const handleDuplicateClip = async (filePath: string) => {
    if (!filePath) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/api/duplicate_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: filePath, path: filePath }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setExportNotice(`Duplicated "${data.filename}" successfully!`);
        setTimeout(() => setExportNotice(""), 3000);
        loadVaultClips(true);
      }
    } catch (err) {
      console.error("Failed to duplicate clip:", err);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#070709] text-white select-none overflow-hidden">
      {/* Standalone Independent Header */}
      <header
        className="h-16 pl-6 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0b0e]/95 backdrop-blur-xl z-20 flex-shrink-0"
        style={{ WebkitAppRegion: "drag", paddingRight: "150px" } as React.CSSProperties}
      >
        <div className="flex items-center gap-4" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10"
            title="Return to previous screen"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Clipper</span>
          </button>
          
          <div className="w-px h-5 bg-white/10" />

          {/* Clean Independent Vault Brand & Counter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                <FolderCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-tight">Saved Clips Vault</h1>
                <p className="text-[10px] text-gray-500 font-medium">Independent storage & exports</p>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
              <span>{vaultClips.length}</span>
              <span className="text-[10px] text-emerald-400/80 font-normal">
                {vaultClips.length === 1 ? "video" : "videos"}
              </span>
            </span>
          </div>
        </div>

        {/* Global Toolbar Actions (Walkthrough, Free Space, Refresh, Explorer, New Folder) */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          {onStartVaultTour && (
            <button
              type="button"
              onClick={onStartVaultTour}
              className="px-3 py-1.5 rounded-xl bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Launch Saved Clips Vault Walkthrough"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Walkthrough</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCleanCache}
            disabled={isCleaningCache}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            title="Clean temporary cache files"
          >
            <Trash2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isCleaningCache ? "Cleaning..." : "Free Space"}</span>
          </button>

          <button
            type="button"
            onClick={() => loadVaultClips(false)}
            title="Refresh Vault"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${vaultLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => openOutputFolder()}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-semibold text-gray-200 transition-all flex items-center gap-1.5 cursor-pointer border border-white/[0.08]"
          >
            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span>Open in Explorer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewFolderParent("root");
              setNewFolderNameInput("");
              setShowNewFolderModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-400 text-black text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-400/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>
      </header>

      {/* Main Vault Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <SavedClipsVault
          hideHeaderToolbar={true}
          vaultClips={vaultClips}
          vaultFolders={vaultFolders}
          vaultLoading={vaultLoading}
          vaultError={vaultError}
          vaultSearch={vaultSearch}
          setVaultSearch={setVaultSearch}
          vaultSelectedFolder={vaultSelectedFolder}
          setVaultSelectedFolder={setVaultSelectedFolder}
          selectedClipPaths={selectedClipPaths}
          setSelectedClipPaths={setSelectedClipPaths}
          draggedClipPath={draggedClipPath}
          setDraggedClipPath={setDraggedClipPath}
          onDropOnFolder={(e, folder) => {
            e.preventDefault();
            const rawData = e.dataTransfer.getData("text/plain") || draggedClipPath;
            if (!rawData) return;
            try {
              const parsed = JSON.parse(rawData);
              if (Array.isArray(parsed)) {
                handleMoveClips(parsed, folder);
                setSelectedClipPaths([]);
                return;
              }
            } catch {}
            if (selectedClipPaths.includes(rawData) && selectedClipPaths.length > 1) {
              handleMoveClips(selectedClipPaths, folder);
              setSelectedClipPaths([]);
            } else {
              handleMoveClips([rawData], folder);
            }
          }}
          setShowNewFolderModal={setShowNewFolderModal}
          openOutputFolder={openOutputFolder}
          chooseCustomDirectory={chooseCustomDirectory}
          customOutputDir={customOutputDir}
          lastOutputFolder={lastOutputFolder}
          exportNotice={exportNotice}
          setExportNotice={setExportNotice}
          setMoveModalClips={setMoveModalClips}
          deleteVaultClip={deleteVaultClip}
          deleteVaultClips={deleteVaultClips}
          deleteFolder={handleDeleteFolder}
          openNewSubfolderModal={(parentFolder) => {
            setNewFolderParent(parentFolder || "root");
            setNewFolderNameInput("");
            setShowNewFolderModal(true);
          }}
          onRenameFolder={handleRenameFolder}
          onImportClips={handleImportClips}
          onDuplicateClip={handleDuplicateClip}
          setPreviewVaultClip={setPreviewVaultClip}
          onBackToEditor={onBack}
          onStartVaultTour={onStartVaultTour}
          onRefresh={() => loadVaultClips(false)}
        />
      </main>

      {/* Video Preview Modal */}
      {previewVaultClip && (
        <ClipDetailsModal
          clip={previewVaultClip}
          onClose={() => setPreviewVaultClip(null)}
          onDelete={async (path) => {
            await deleteVaultClip(path);
            setPreviewVaultClip(null);
          }}
          onMove={(clipPath) => {
            setMoveModalClips([clipPath]);
          }}
          onClipUpdated={(updatedClip) => {
            setVaultClips((prev) =>
              prev.map((c) => (c.path === updatedClip.path ? updatedClip : c))
            );
            setPreviewVaultClip(updatedClip);
          }}
        />
      )}

      {/* Move to Folder Modal */}
      {moveModalClips && moveModalClips.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setMoveModalClips(null)}
        >
          <div
            className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-sm">
              Move {moveModalClips.length} Clip(s) To:
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <button
                onClick={() => handleMoveClips(moveModalClips, "Main Library")}
                className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-emerald-400/20 border border-white/10 hover:border-emerald-400/50 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-400" /> Main Library (Root)
                </span>
                <span className="text-[10px] text-gray-500 group-hover:text-emerald-300">Move Here →</span>
              </button>
              {vaultFolders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => handleMoveClips(moveModalClips, folder)}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-emerald-400/20 border border-white/10 hover:border-emerald-400/50 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer group"
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-400" /> {folder}
                  </span>
                  <span className="text-[10px] text-gray-500 group-hover:text-emerald-300">Move Here →</span>
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <button
                onClick={() => {
                  setMoveModalClips(null);
                  setShowNewFolderModal(true);
                }}
                className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Create new folder first
              </button>
              <button
                onClick={() => setMoveModalClips(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowNewFolderModal(false)}
        >
          <div
            className="bg-[#141414] border border-emerald-400/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-base flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />{" "}
                {newFolderParent && newFolderParent !== "root"
                  ? `New Subfolder in "${newFolderParent}"`
                  : "Create New Folder"}
              </h3>
              <button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1 block">Folder Location:</label>
              <select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/60 border border-white/15 outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="root">Root / Top Level</option>
                {vaultFolders.map((f) => (
                  <option key={f} value={f}>
                    Inside: {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 mb-1 block">Folder Name:</label>
              <input
                ref={newFolderInputRef}
                type="text"
                autoFocus
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") handleCreateFolder();
                }}
                placeholder="e.g. Movies, Shorts Viral, Stream Highlights..."
                className="w-full rounded-xl px-4 py-2.5 text-xs text-white bg-black/60 border border-white/20 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 cursor-text select-text pointer-events-auto shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-5 py-2 rounded-xl text-xs font-black bg-emerald-400 text-black hover:bg-emerald-300 transition-all shadow-md cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
