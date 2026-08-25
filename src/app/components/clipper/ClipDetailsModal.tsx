import React, { useState } from "react";
import { Download, ExternalLink, Copy, Check, Trash2, Folder } from "lucide-react";
import type { ClipMetadata } from "./types";

interface ClipDetailsModalProps {
  clip: ClipMetadata | null;
  onClose: () => void;
  onDelete?: (path: string) => Promise<void>;
  onMove?: (clipPath: string) => void;
  onExportQuality?: (quality: string) => void;
}

export const ClipDetailsModal: React.FC<ClipDetailsModalProps> = ({
  clip,
  onClose,
  onDelete,
  onMove,
}) => {
  const [copied, setCopied] = useState(false);

  if (!clip) return null;

  const handleCopy = () => {
    if (clip.description) {
      navigator.clipboard.writeText(`${clip.title}\n\n${clip.description}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInExplorer = () => {
    if ((window as any).electronAPI?.showItemInFolder) {
      (window as any).electronAPI.showItemInFolder(clip.path);
    } else if ((window as any).electron?.ipcRenderer) {
      (window as any).electron.ipcRenderer.send("show-item-in-folder", clip.path);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-white/15 rounded-3xl p-6 max-w-4xl w-full flex flex-col md:flex-row gap-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-base bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* 9:16 Video Player */}
        <div className="w-full md:w-80 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner shrink-0">
          <video
            src={clip.url || (clip.path ? `local:///${clip.path.replace(/\\/g, "/")}` : "")}
            autoPlay
            loop
            controls
            playsInline
            onError={(e) => {
              if (clip.path) {
                const localSrc = `local:///${clip.path.replace(/\\/g, "/")}`;
                if (e.currentTarget.src !== localSrc) {
                  e.currentTarget.src = localSrc;
                }
              }
            }}
            className="w-full h-full object-contain bg-black"
          />
        </div>

        {/* Details & Actions */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold">
                Score: {clip.virality_score || 99} pts
              </span>
              <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-bold">
                📁 {clip.folder}
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-2 leading-snug">{clip.title}</h3>

            <p className="text-xs text-gray-400 font-mono mb-4">
              File: {clip.filename} ({clip.size_mb} MB)
            </p>

            {clip.description && (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto mb-4">
                {clip.description}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10 flex-wrap">
            {clip.description && (
              <button
                onClick={handleCopy}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied to Clipboard!" : "Copy Description & Tags"}
              </button>
            )}

            <button
              onClick={openInExplorer}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Reveal File
            </button>

            {onMove && (
              <button
                onClick={() => onMove(clip.path)}
                className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5 text-amber-400" /> Move Folder
              </button>
            )}

            {onDelete && (
              <button
                onClick={async () => {
                  if (confirm(`Delete "${clip.filename}" permanently from your computer?`)) {
                    await onDelete(clip.path);
                    onClose();
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
