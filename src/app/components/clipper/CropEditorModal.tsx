import React from "react";
import { Rnd } from "react-rnd";
import { Sparkles, RefreshCw, Gamepad2, Mic, Film, ArrowUpDown, Clock, FastForward, Rewind } from "lucide-react";
import type { CropBox } from "./types";
import { extractYouTubeId } from "./types";

interface CropEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVideoUrl: string;
  ytUrl?: string;
  cropTop: CropBox;
  setCropTop: React.Dispatch<React.SetStateAction<CropBox>>;
  cropBottom: CropBox;
  setCropBottom: React.Dispatch<React.SetStateAction<CropBox>>;
  startTs: string;
  setStartTs: (ts: string) => void;
  endTs: string;
  setEndTs: (ts: string) => void;
}

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  isOpen,
  onClose,
  activeVideoUrl,
  ytUrl = "",
  cropTop,
  setCropTop,
  cropBottom,
  setCropBottom,
  startTs,
  setStartTs,
  endTs,
  setEndTs,
}) => {
  if (!isOpen) return null;
  const youtubeId = extractYouTubeId(ytUrl);

  const seekVideoBy = (seconds: number) => {
    const vids = document.querySelectorAll("video");
    vids.forEach((v) => {
      try {
        v.currentTime = Math.max(0, Math.min((v.currentTime || 0) + seconds, v.duration || 0));
      } catch {}
    });
  };

  const getCurrentTimeFormatted = () => {
    const vids = document.querySelectorAll("video");
    const vid = Array.from(vids).find((v) => v.src.includes(activeVideoUrl)) || vids[0];
    if (vid) {
      const mins = Math.floor(vid.currentTime / 60).toString().padStart(2, "0");
      const secs = Math.floor(vid.currentTime % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    }
    return "00:00";
  };

  // Preset Handlers
  const applyTinyWebcamPreset = () => {
    // Tiny Facecam box on bottom-left (140x110), Bottom: Full game screen (456x256)
    setCropTop({ x: 20, y: 130, width: 140, height: 110 });
    setCropBottom({ x: 0, y: 0, width: 456, height: 256 });
  };

  const applyStreamerPreset = () => {
    // Top: Facecam box on top-left (150x115), Bottom: Full game screen (456x256)
    setCropTop({ x: 15, y: 15, width: 150, height: 115 });
    setCropBottom({ x: 0, y: 0, width: 456, height: 256 });
  };

  const applyPodcastPreset = () => {
    // Top: Host left half (228x256), Bottom: Guest right half (228x256)
    setCropTop({ x: 0, y: 0, width: 228, height: 256 });
    setCropBottom({ x: 228, y: 0, width: 228, height: 256 });
  };

  const applyCinematicPreset = () => {
    // Top: 70% Action focus (456x180), Bottom: 30% Reaction (200x120)
    setCropTop({ x: 0, y: 20, width: 456, height: 180 });
    setCropBottom({ x: 128, y: 136, width: 200, height: 120 });
  };

  const applyStandard5050 = () => {
    setCropTop({ x: 0, y: 0, width: 456, height: 128 });
    setCropBottom({ x: 0, y: 128, width: 456, height: 128 });
  };

  const swapCrops = () => {
    const temp = { ...cropTop };
    setCropTop({ ...cropBottom });
    setCropBottom(temp);
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" /> Visual Crop Editor
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Position the glowing crop boxes over the camera and gameplay scenes.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-400 text-black hover:brightness-110 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
        >
          Done Cropping
        </button>
      </div>

      {/* AI Smart Crop Presets */}
      <div className="space-y-1.5 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 1-Click Pro Crop Presets
          </span>
          <button
            type="button"
            onClick={swapCrops}
            className="text-[10px] text-gray-400 hover:text-amber-400 flex items-center gap-1 font-bold cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3" /> Swap Boxes
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          <button
            type="button"
            onClick={applyTinyWebcamPreset}
            className="px-1.5 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-black text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tiny Box</span>
          </button>
          <button
            type="button"
            onClick={applyStreamerPreset}
            className="px-1.5 py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Top-Left Cam</span>
          </button>
          <button
            type="button"
            onClick={applyPodcastPreset}
            className="px-1.5 py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Podcast</span>
          </button>
          <button
            type="button"
            onClick={applyCinematicPreset}
            className="px-1.5 py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>Cinematic</span>
          </button>
          <button
            type="button"
            onClick={applyStandard5050}
            className="px-1.5 py-2 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Full 50/50</span>
          </button>
        </div>
      </div>

      {/* 456x256 Fixed Canvas Stage for Precise Crop Coordinates */}
      <div className="relative w-[456px] h-[256px] bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-2 ring-white/5 mx-auto select-none">
        {activeVideoUrl ? (
          <video src={activeVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : youtubeId ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
            title="Crop Editor YouTube Preview"
            className="w-full h-full object-cover pointer-events-none scale-125"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-bold">
            No Video Loaded
          </div>
        )}

        {/* TOP CROP BOX (AMBER) */}
        <Rnd
          position={{ x: cropTop.x, y: cropTop.y }}
          size={{ width: cropTop.width, height: cropTop.height }}
          onDrag={(e, d) => setCropTop((prev) => ({ ...prev, x: d.x, y: d.y }))}
          onResize={(e, dir, ref, delta, position) => {
            setCropTop({
              width: parseFloat(ref.style.width),
              height: parseFloat(ref.style.height),
              x: position.x,
              y: position.y,
            });
          }}
          bounds="parent"
          className="group cursor-move z-20"
        >
          <div className="absolute inset-0 border-2 border-amber-400 bg-amber-400/25 shadow-[0_0_20px_rgba(251,191,36,0.4)] flex flex-col justify-between p-1.5 backdrop-blur-[1px]">
            <span className="text-[9px] font-black text-amber-300 bg-black/90 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
              TOP CLIP (9:16)
            </span>
            <div className="w-full flex justify-between text-[8px] font-mono text-amber-300/80">
              <span>{Math.round(cropTop.width)}px</span>
              <span>{Math.round(cropTop.height)}px</span>
            </div>
          </div>
        </Rnd>

        {/* BOTTOM CROP BOX (CYAN) */}
        <Rnd
          position={{ x: cropBottom.x, y: cropBottom.y }}
          size={{ width: cropBottom.width, height: cropBottom.height }}
          onDrag={(e, d) => setCropBottom((prev) => ({ ...prev, x: d.x, y: d.y }))}
          onResize={(e, dir, ref, delta, position) => {
            setCropBottom({
              width: parseFloat(ref.style.width),
              height: parseFloat(ref.style.height),
              x: position.x,
              y: position.y,
            });
          }}
          bounds="parent"
          className="group cursor-move z-10"
        >
          <div className="absolute inset-0 border-2 border-cyan-400 bg-cyan-400/25 shadow-[0_0_20px_rgba(34,211,238,0.4)] flex flex-col justify-between p-1.5 backdrop-blur-[1px]">
            <span className="text-[9px] font-black text-cyan-300 bg-black/90 px-1.5 py-0.5 rounded w-max uppercase tracking-wider">
              BOTTOM CLIP (9:16)
            </span>
            <div className="w-full flex justify-between text-[8px] font-mono text-cyan-300/80">
              <span>{Math.round(cropBottom.width)}px</span>
              <span>{Math.round(cropBottom.height)}px</span>
            </div>
          </div>
        </Rnd>
      </div>

      {/* Scene Navigation & Timestamp Controls */}
      <div className="w-[456px] mx-auto bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" /> Preview Other Scenes
          </span>
          <span className="text-[10px] font-mono text-gray-400">Jump along the timeline to test crops</span>
        </div>

        {/* Fast Scene Jump Chips */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => seekVideoBy(-10)}
            className="flex-1 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Rewind className="w-3 h-3 text-amber-400" /> -10s
          </button>
          <button
            type="button"
            onClick={() => seekVideoBy(10)}
            className="flex-1 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <FastForward className="w-3 h-3 text-amber-400" /> +10s
          </button>
          <button
            type="button"
            onClick={() => seekVideoBy(30)}
            className="flex-1 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            +30s
          </button>
          <button
            type="button"
            onClick={() => seekVideoBy(60)}
            className="flex-1 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            +1 min
          </button>
          <button
            type="button"
            onClick={() => seekVideoBy(300)}
            className="flex-1 py-1.5 rounded-lg bg-black/40 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            +5 min
          </button>
        </div>

        {/* Set Start / End Timestamp Buttons */}
        <div className="flex gap-2 pt-1 border-t border-white/10">
          <button
            onClick={() => setStartTs(getCurrentTimeFormatted())}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-black transition-all border border-amber-400/30 cursor-pointer shadow-sm"
          >
            📍 Set Start ({startTs || "00:00"})
          </button>
          <button
            onClick={() => setEndTs(getCurrentTimeFormatted())}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-cyan-400/20 text-cyan-300 hover:bg-cyan-400 hover:text-black transition-all border border-cyan-400/30 cursor-pointer shadow-sm"
          >
            🏁 Set End ({endTs || "00:00"})
          </button>
        </div>
      </div>
    </div>
  );
};
