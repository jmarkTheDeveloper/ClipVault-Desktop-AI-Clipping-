import React, { useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import {
  Sparkles,
  RefreshCw,
  Gamepad2,
  Mic,
  Film,
  ArrowUpDown,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Clock,
  Pin,
  Flag,
} from "lucide-react";
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
  mediaDuration?: number;
  durationMode?: string;
  setDurationMode?: (mode: string) => void;
  startTs?: string;
  setStartTs?: (ts: string) => void;
  endTs?: string;
  setEndTs?: (ts: string) => void;
  currentTime?: number;
  setCurrentTime?: (t: number) => void;
  isPlaying?: boolean;
  setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
  isMuted?: boolean;
  setIsMuted?: (m: boolean) => void;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
  mediaDuration = 0,
  durationMode,
  setDurationMode,
  startTs = "",
  setStartTs,
  endTs = "",
  setEndTs,
  currentTime = 0,
  setCurrentTime,
  isPlaying = true,
  setIsPlaying,
  isMuted = true,
}) => {
  if (!isOpen) return null;
  const youtubeId = extractYouTubeId(ytUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const seekTimeoutRef = useRef<any>(null);

  // Synchronize playback & mute state with isPlaying / isMuted (without currentTime loop!)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = isMuted;

    if (isPlaying) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [isPlaying, isMuted, activeVideoUrl]);

  // Initial time sync when mounting or changing url
  useEffect(() => {
    if (videoRef.current && currentTime > 0) {
      try {
        videoRef.current.currentTime = currentTime;
      } catch {}
    }
  }, [activeVideoUrl]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isSeekingRef.current) return;
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 120) {
      lastUpdateTimeRef.current = now;
      if (setCurrentTime) {
        setCurrentTime(e.currentTarget.currentTime || 0);
      }
    }
  };

  const togglePlay = () => {
    const nextState = !isPlaying;
    if (setIsPlaying) {
      setIsPlaying(nextState);
    }
    const allVideos = document.querySelectorAll("video");
    allVideos.forEach((v) => {
      if (nextState) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  };

  const seekTo = (seconds: number) => {
    isSeekingRef.current = true;
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);

    const maxDur = mediaDuration > 0 ? mediaDuration : 3600;
    const target = Math.max(0, Math.min(seconds, maxDur));

    const allVideos = document.querySelectorAll("video");
    allVideos.forEach((v) => {
      try {
        v.currentTime = target;
      } catch {}
    });

    if (setCurrentTime) {
      setCurrentTime(target);
    }

    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 350);
  };

  const seekDelta = (delta: number) => {
    seekTo(currentTime + delta);
  };

  // Preset Handlers
  const applyTinyWebcamPreset = () => {
    setCropTop({ x: 20, y: 130, width: 140, height: 110 });
    setCropBottom({ x: 0, y: 0, width: 456, height: 256 });
  };

  const applyStreamerPreset = () => {
    setCropTop({ x: 15, y: 15, width: 150, height: 115 });
    setCropBottom({ x: 0, y: 0, width: 456, height: 256 });
  };

  const applyPodcastPreset = () => {
    setCropTop({ x: 0, y: 0, width: 228, height: 256 });
    setCropBottom({ x: 228, y: 0, width: 228, height: 256 });
  };

  const applyCinematicPreset = () => {
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
    <div className="w-full flex-1 flex flex-col space-y-3.5 animate-fadeIn select-none">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Visual Crop Editor
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            Position the glowing crop boxes over the camera and gameplay scenes.
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-400 text-black hover:brightness-110 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer"
        >
          Done Cropping
        </button>
      </div>

      {/* AI Smart Crop Presets */}
      <div className="space-y-1.5 bg-white/[0.03] border border-white/10 rounded-2xl p-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> 1-Click Pro Crop Presets
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
            className="px-1 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 font-black text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer shadow-sm"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Tiny Box</span>
          </button>
          <button
            type="button"
            onClick={applyStreamerPreset}
            className="px-1 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Top-Left Cam</span>
          </button>
          <button
            type="button"
            onClick={applyPodcastPreset}
            className="px-1 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Podcast</span>
          </button>
          <button
            type="button"
            onClick={applyCinematicPreset}
            className="px-1 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-purple-400" />
            <span>Cinematic</span>
          </button>
          <button
            type="button"
            onClick={applyStandard5050}
            className="px-1 py-1.5 rounded-xl bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/50 text-white font-bold text-[10px] flex flex-col items-center gap-1 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Full 50/50</span>
          </button>
        </div>
      </div>

      {/* 456x256 Fixed Canvas Stage for Precise Crop Coordinates */}
      <div className="relative w-[456px] h-[256px] bg-[#111] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-2 ring-white/5 mx-auto select-none">
        {activeVideoUrl ? (
          <video
            ref={videoRef}
            src={activeVideoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onCanPlay={(e) => {
              if (isPlaying) e.currentTarget.play().catch(() => {});
            }}
            className="w-full h-full object-cover pointer-events-none"
          />
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

      {/* Synchronized Playback Dock for Precise Scene Scrubbing */}
      <div className="w-[456px] mx-auto p-2.5 rounded-xl bg-[#121212] border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-gray-300 font-bold">
          <span className="text-amber-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> {formatTime(currentTime)}
          </span>
          <span className="text-gray-400">
            {mediaDuration > 0 ? formatTime(mediaDuration) : "--:--"}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={mediaDuration || 100}
          step="0.5"
          value={currentTime}
          onChange={(e) => seekTo(parseFloat(e.target.value))}
          className="w-full accent-amber-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
        />

        <div className="flex items-center justify-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => seekDelta(-10)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Rewind 10 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="w-[84px] h-7 rounded-xl bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-300 transition-all shadow-md cursor-pointer shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            type="button"
            onClick={() => seekDelta(10)}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Forward 10 seconds"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clip Timestamp Bounds in Crop Editor */}
      {(setStartTs || setEndTs) && (
        <div className="w-[456px] mx-auto p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Clip Timestamp Bounds</span>
            {(startTs || endTs) && (
              <button
                type="button"
                onClick={() => {
                  if (setStartTs) setStartTs("");
                  if (setEndTs) setEndTs("");
                }}
                className="text-[9px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
              >
                Reset Bounds
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-300 block">Start Timestamp</label>
                {setStartTs && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartTs(formatTime(currentTime));
                      if (setDurationMode) setDurationMode("custom");
                    }}
                    className="text-[9px] text-amber-400 hover:underline font-bold cursor-pointer"
                  >
                    Pin Current
                  </button>
                )}
              </div>
              <input
                type="text"
                value={startTs}
                onChange={(e) => {
                  if (setStartTs) setStartTs(e.target.value);
                  if (setDurationMode) setDurationMode("custom");
                }}
                placeholder="0:00"
                className="w-full rounded-lg px-2.5 py-1.5 text-xs font-bold text-white bg-black/40 border border-white/10 outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-300 block">End Timestamp</label>
                {setEndTs && (
                  <button
                    type="button"
                    onClick={() => {
                      setEndTs(formatTime(currentTime));
                      if (setDurationMode) setDurationMode("custom");
                    }}
                    className="text-[9px] text-cyan-400 hover:underline font-bold cursor-pointer"
                  >
                    Pin Current
                  </button>
                )}
              </div>
              <input
                type="text"
                value={endTs}
                onChange={(e) => {
                  if (setEndTs) setEndTs(e.target.value);
                  if (setDurationMode) setDurationMode("custom");
                }}
                placeholder={mediaDuration && mediaDuration > 0 ? formatTime(mediaDuration) : "e.g. 1:45"}
                className="w-full rounded-lg px-2.5 py-1.5 text-xs font-bold text-white bg-black/40 border border-white/10 outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
