import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Volume2,
  VolumeX,
  Move,
  Loader2,
  Gamepad2,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Clock,
  Pin,
  Flag,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { CropBox, CustomSegment } from "./types";
import { extractYouTubeId } from "./types";

interface PhonePreviewProps {
  activeVideoUrl: string;
  ytUrl?: string;
  loadingPreview?: boolean;
  previewError?: string;
  onRetryPreview?: () => void;
  isProcessing: boolean;
  progress: number;
  layout: string;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  addCaptions: boolean;
  captionYPct: number;
  isDraggingCaption: boolean;
  startCaptionDrag: (e: React.MouseEvent) => void;
  selectedEffectId: string;
  cropTop: CropBox;
  cropBottom: CropBox;
  mediaDuration?: number;
  durationMode?: string;
  setDurationMode?: (mode: string) => void;
  customSegments?: CustomSegment[];
  setCustomSegments?: React.Dispatch<React.SetStateAction<CustomSegment[]>>;
  activeSegmentId?: string;
  setActiveSegmentId?: (id: string) => void;
  startTs?: string;
  setStartTs?: (ts: string) => void;
  endTs?: string;
  setEndTs?: (ts: string) => void;
  currentTime?: number;
  setCurrentTime?: (t: number) => void;
  isPlaying?: boolean;
  setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
  isCropEditorOpen?: boolean;
  onCancel?: () => void;
  gameplayBgVideo?: string;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const CroppedVideo: React.FC<{
  src: string;
  youtubeId: string | null;
  crop: CropBox;
  isMuted: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  label?: string;
}> = ({ src, youtubeId, crop, isMuted, videoRef, onTimeUpdate, onLoadedMetadata, label }) => {
  const cropW = Math.max(20, crop.width || 140);
  const cropH = Math.max(20, crop.height || 110);
  const cropX = Math.max(0, crop.x || 0);
  const cropY = Math.max(0, crop.y || 0);

  const scaleW = (456 / cropW) * 100;
  const scaleH = (256 / cropH) * 100;
  const leftP = -(cropX / cropW) * 100;
  const topP = -(cropY / cropH) * 100;

  if (src) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center select-none">
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onCanPlay={(e) => {
            e.currentTarget.play().catch(() => {});
          }}
          onError={(e) => {
            const target = e.currentTarget;
            setTimeout(() => {
              if (target && target.src) {
                try {
                  target.load();
                  target.play().catch(() => {});
                } catch {}
              }
            }, 700);
          }}
          className="pointer-events-none"
          style={{
            position: "absolute",
            width: `${scaleW}%`,
            height: `${scaleH}%`,
            maxWidth: "none",
            maxHeight: "none",
            left: `${leftP}%`,
            top: `${topP}%`,
            objectFit: "fill",
            transform: "translateZ(0)",
            willChange: "transform",
          }}
        />
      </div>
    );
  }

  if (youtubeId) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center select-none">
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
          alt="YouTube Preview"
          className="pointer-events-none select-none"
          style={{
            position: "absolute",
            width: `${scaleW}%`,
            height: `${scaleH}%`,
            maxWidth: "none",
            maxHeight: "none",
            left: `${leftP}%`,
            top: `${topP}%`,
            objectFit: "fill",
            transform: "translateZ(0)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-bold">
      {label || "No Video"}
    </div>
  );
};

const DraggableCaptionOverlay: React.FC<{
  addCaptions: boolean;
  captionYPct: number;
  selectedEffectId: string;
  isDraggingCaption?: boolean;
  startCaptionDrag: (e: React.MouseEvent) => void;
}> = ({ addCaptions, captionYPct, selectedEffectId, isDraggingCaption, startCaptionDrag }) => {
  if (!addCaptions) return null;

  const getHighlightConfig = () => {
    switch (selectedEffectId) {
      case "opus_green":
      case "emerald_green":
        return { bg: "bg-[#00FF66]", text: "text-black", border: "border-black" };
      case "neon_cyan":
        return { bg: "bg-[#00F0FF]", text: "text-black", border: "border-black" };
      case "fire_red":
        return { bg: "bg-[#FF3C3C]", text: "text-white", border: "border-black" };
      case "sigma_pink":
        return { bg: "bg-[#FF4D94]", text: "text-white", border: "border-black" };
      case "clean_white":
        return { bg: "bg-white", text: "text-black", border: "border-black" };
      case "hormozi_bold":
        return { bg: "bg-[#FFD700]", text: "text-black", border: "border-black" };
      case "capcut_yellow":
      default:
        return { bg: "bg-[#FFE600]", text: "text-black", border: "border-black" };
    }
  };

  const hl = getHighlightConfig();

  return (
    <div
      className="absolute inset-x-0 flex justify-center z-30 select-none px-4 pointer-events-none"
      style={{ top: `${captionYPct || 70}%`, transform: "translateY(-50%)" }}
    >
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startCaptionDrag(e);
        }}
        title="Click & Drag to reposition captions on screen"
        className={`pointer-events-auto px-3.5 py-2 rounded-2xl bg-black/85 backdrop-blur-md border transition-all cursor-grab active:cursor-grabbing shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center gap-2 group ${
          isDraggingCaption
            ? "border-amber-400 ring-2 ring-amber-400/60 scale-105"
            : "border-white/20 hover:border-amber-400/80 hover:bg-black/95 hover:scale-102"
        }`}
      >
        <Move className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition-colors pointer-events-none shrink-0" />
        
        {/* Visual Live Highlight Preview matching rendered output */}
        <div className="flex items-center gap-1.5 pointer-events-none tracking-wider uppercase font-black text-sm">
          <span className={`px-2 py-0.5 rounded-lg ${hl.bg} ${hl.text} border-2 ${hl.border} shadow-[0_2px_8px_rgba(0,0,0,0.6)] font-black`}>
            VIRAL
          </span>
          <span className="text-white px-1 py-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] [text-shadow:_0_0_3px_#000,_0_0_6px_#000] font-black">
            VIDEO
          </span>
        </div>
      </div>
    </div>
  );
};

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  activeVideoUrl,
  ytUrl = "",
  loadingPreview = false,
  previewError = "",
  onRetryPreview,
  isProcessing,
  progress,
  layout,
  isMuted,
  setIsMuted,
  videoRef,
  addCaptions,
  captionYPct,
  isDraggingCaption,
  startCaptionDrag,
  selectedEffectId,
  cropTop,
  cropBottom,
  mediaDuration,
  durationMode,
  setDurationMode,
  customSegments = [{ id: "1", start: "0:00", end: "" }],
  setCustomSegments,
  activeSegmentId = "1",
  setActiveSegmentId,
  startTs = "",
  setStartTs,
  endTs = "",
  setEndTs,
  currentTime: currentTimeProp,
  setCurrentTime: setCurrentTimeProp,
  isPlaying: isPlayingProp,
  setIsPlaying: setIsPlayingProp,
  isCropEditorOpen = false,
  onCancel,
  gameplayBgVideo = "",
}) => {
  const youtubeId = extractYouTubeId(ytUrl);
  const posterUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "";
  const hasMedia = Boolean(activeVideoUrl);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Playback & Scrubber States
  const [internalPlaying, setInternalPlaying] = useState(true);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [streamError, setStreamError] = useState(false);

  // Reset stream error when URL changes
  useEffect(() => {
    setStreamError(false);
    setIsBuffering(false);
  }, [activeVideoUrl]);

  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : internalPlaying;
  const setIsPlaying = setIsPlayingProp || setInternalPlaying;

  const currentTime = currentTimeProp !== undefined ? currentTimeProp : internalCurrentTime;
  const setCurrentTime = setCurrentTimeProp || setInternalCurrentTime;

  const [duration, setDuration] = useState<number>(() => (mediaDuration && mediaDuration > 0 ? mediaDuration : 0));

  // Sync duration whenever mediaDuration from server updates
  useEffect(() => {
    if (mediaDuration && mediaDuration > 0) {
      setDuration(mediaDuration);
    }
  }, [mediaDuration]);

  // Synchronize mute state across all video elements in the preview
  useEffect(() => {
    const vids = containerRef.current?.querySelectorAll("video") || [];
    vids.forEach((v) => {
      v.muted = isMuted;
    });
  }, [isMuted]);

  const isSeekingRef = useRef<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const seekTimeoutRef = useRef<any>(null);

  // Spacebar keyboard play/pause toggle when not inside an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;
      if (e.code === "Space" && hasMedia) {
        e.preventDefault();
        togglePlayAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, hasMedia]);

  // Synchronize play/pause state across all video elements in the preview
  useEffect(() => {
    const vids = containerRef.current?.querySelectorAll("video") || document.querySelectorAll("video");
    vids.forEach((v) => {
      if (isPlaying) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [isPlaying]);

  // Re-synchronize newly mounted video elements whenever layout, video source, or background video changes
  useEffect(() => {
    const syncAll = () => {
      const vids = containerRef.current?.querySelectorAll("video") || [];
      vids.forEach((v) => {
        v.muted = isMuted;
        if (isPlaying) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    };

    syncAll();
    const timer1 = setTimeout(syncAll, 60);
    const timer2 = setTimeout(syncAll, 250);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [layout, activeVideoUrl, gameplayBgVideo]);

  // Synchronized seek across all active video elements without glitching or rubber-banding
  const commitSeek = (timeInSeconds: number) => {
    isSeekingRef.current = true;
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);

    const maxDur = duration > 0 ? duration : (mediaDuration && mediaDuration > 0 ? mediaDuration : 3600);
    const target = Math.max(0, Math.min(timeInSeconds, maxDur));

    const allVideos = containerRef.current?.querySelectorAll("video") || document.querySelectorAll("video");
    allVideos.forEach((vid) => {
      try {
        vid.currentTime = target;
      } catch {}
    });

    setCurrentTime(target);

    // Safety timeout in case onSeeked is delayed
    seekTimeoutRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 1500);
  };

  const seekAllVideos = (timeInSeconds: number) => {
    commitSeek(timeInSeconds);
  };

  const togglePlayAll = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    const allVideos = containerRef.current?.querySelectorAll("video") || document.querySelectorAll("video");
    allVideos.forEach((vid) => {
      if (nextState) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  };

  const handleVideoAreaClick = (e: React.MouseEvent) => {
    if (isDraggingCaption) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;
    togglePlayAll();
  };

  const seekRelative = (deltaSeconds: number) => {
    commitSeek(currentTime + deltaSeconds);
  };

  // SINGLE MASTER CLOCK: Only fire timeupdate if not dragging, not seeking, and Crop Editor is closed
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isDraggingRef.current || isSeekingRef.current || isCropEditorOpen) return;
    const v = e.currentTarget;
    if (v.duration && !isNaN(v.duration) && isFinite(v.duration) && v.duration > 0) {
      if (!duration || Math.abs(duration - v.duration) > 1) {
        setDuration(v.duration);
      }
    }
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 120) {
      lastUpdateTimeRef.current = now;
      setCurrentTime(v.currentTime || 0);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration && !isNaN(target.duration) && isFinite(target.duration) && target.duration > 0) {
      setDuration(target.duration);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0a0a0a] select-none relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* 9:16 Smartphone Mockup */}
      <div className="relative w-[400px] h-[780px] max-h-[88vh] bg-black rounded-[54px] p-3.5 shadow-[0_0_90px_rgba(0,0,0,0.9)] border-[8px] border-[#222] ring-1 ring-white/15 flex flex-col z-10">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#111] rounded-full z-40 flex items-center justify-center shadow-inner border border-white/5 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] mr-2" />
          <div className="w-10 h-1.5 rounded-full bg-[#1c1c1e]" />
        </div>

        {/* Screen Viewport */}
        <div className="relative flex-1 bg-[#111] rounded-[42px] overflow-hidden flex flex-col border border-white/5">
          {/* Upper Video / Canvas Viewport */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black select-none">
            {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-4 p-6 text-center z-30">
              <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
              <span className="text-amber-400 font-bold text-sm">{Math.floor(progress)}%</span>
              <p className="text-xs text-gray-400">Processing clips in 4K/1080p...</p>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
                >
                  <XCircle className="w-3.5 h-3.5" /> Stop Processing
                </button>
              )}
            </div>
          ) : loadingPreview ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
              <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-white">Connecting Video Stream...</p>
              <p className="text-[10px] text-gray-400 max-w-[200px]">Fetching stream & synchronizing preview</p>
            </div>
          ) : previewError ? (
            <div className="w-full h-full relative overflow-hidden bg-black flex flex-col items-center justify-center p-6 text-center select-none">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt="Video thumbnail"
                  className="absolute inset-0 w-full h-full object-cover filter blur-2xl opacity-20 scale-125 pointer-events-none"
                />
              )}
              <div className="relative z-10 flex flex-col items-center max-w-[270px] space-y-3 p-5 rounded-2xl bg-[#141419]/95 border border-red-500/30 backdrop-blur-xl shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-red-200">Video Stream Unavailable</p>
                  <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                    {previewError || "This YouTube video is unavailable, private, or deleted. Please verify the URL or try another link."}
                  </p>
                </div>
                {onRetryPreview && (
                  <button
                    type="button"
                    onClick={onRetryPreview}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Stream</span>
                  </button>
                )}
              </div>
            </div>
          ) : !activeVideoUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-3 p-6 text-center text-gray-500 bg-[#0a0a0d] select-none">
              <div className="w-12 h-12 rounded-2xl border border-dashed border-gray-700 flex items-center justify-center mx-auto mb-1 text-gray-400 bg-white/5">
                <span className="text-xs font-bold">9:16</span>
              </div>
              <p className="text-xs font-bold text-gray-300">Video Preview</p>
              <p className="text-[11px] text-gray-500 max-w-[200px]">Paste a YouTube link or choose a local video to begin AI framing</p>
            </div>
          ) : (
            /* Active Live Video Viewport Container (Click to Play/Pause) */
            <div
              onClick={handleVideoAreaClick}
              className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center select-none cursor-pointer"
            >
              {layout === "custom_split" ? (
                /* Custom Split Screen Preview (Top & Bottom Crop Boxes) */
                <div className="w-full h-full flex flex-col relative select-none bg-black pointer-events-none">
                  <div className="absolute top-10 left-3 z-30 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Custom Split (9:16)
                  </div>
                  <div className="w-full h-1/2 relative overflow-hidden border-b-2 border-amber-400/50">
                    <CroppedVideo
                      videoRef={videoRef}
                      src={activeVideoUrl}
                      youtubeId={youtubeId}
                      crop={cropTop}
                      isMuted={isMuted}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      label="Top Crop (Amber)"
                    />
                  </div>
                  <div className="w-full h-1/2 relative overflow-hidden">
                    <CroppedVideo
                      src={activeVideoUrl}
                      youtubeId={youtubeId}
                      crop={cropBottom}
                      isMuted={isMuted}
                      label="Bottom Crop (Cyan)"
                    />
                  </div>
                </div>
              ) : layout === "gameplay_bg" ? (
                /* Dual-Layer Split (Speaker Top, B-Roll / Visuals Bottom) */
                <div className="w-full h-full flex flex-col relative select-none bg-black pointer-events-none">
                  <div className="absolute top-10 left-3 z-30 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Dual Split (9:16)
                  </div>
                  <div className="w-full h-1/2 relative overflow-hidden border-b-2 border-amber-400/30">
                    <video
                      ref={videoRef}
                      src={activeVideoUrl}
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onWaiting={() => setIsBuffering(true)}
                      onPlaying={() => {
                        setIsBuffering(false);
                        setStreamError(false);
                      }}
                      onCanPlay={(e) => {
                        setIsBuffering(false);
                        if (isPlaying) e.currentTarget.play().catch(() => {});
                      }}
                      onError={() => {
                        setIsBuffering(false);
                        setStreamError(true);
                      }}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </div>
                  <div className="w-full h-1/2 relative overflow-hidden bg-black">
                    {gameplayBgVideo ? (
                      <video
                        src={gameplayBgVideo}
                        className="w-full h-full object-cover pointer-events-none"
                        autoPlay
                        loop
                        muted
                        playsInline
                        onCanPlay={(e) => {
                          if (isPlaying) e.currentTarget.play().catch(() => {});
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] text-amber-400/40 text-xs font-bold font-mono">
                        [ Secondary B-Roll / Visuals ]
                      </div>
                    )}
                  </div>
                </div>
              ) : layout === "landscape_blur" ? (
                /* Landscape + Blurred Canvas (9:16) */
                <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center pointer-events-none">
                  <video
                    src={activeVideoUrl}
                    className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-125 opacity-60 pointer-events-none"
                    autoPlay
                    loop
                    muted={true}
                    playsInline
                  />
                  <video
                    ref={videoRef}
                    src={activeVideoUrl}
                    poster={posterUrl || undefined}
                    className="w-full max-h-full object-contain relative z-10 pointer-events-none shadow-2xl"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => {
                      setIsBuffering(false);
                      setStreamError(false);
                    }}
                    onCanPlay={(e) => {
                      setIsBuffering(false);
                      if (isPlaying) e.currentTarget.play().catch(() => {});
                    }}
                    onError={() => {
                      setIsBuffering(false);
                      setStreamError(true);
                    }}
                  />
                  <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 flex items-center gap-1 shadow-lg">
                    Blurred Canvas (9:16)
                  </div>
                </div>
              ) : layout === "landscape_fit" ? (
                /* Landscape Fit / Letterbox (9:16) */
                <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center pointer-events-none">
                  <video
                    ref={videoRef}
                    src={activeVideoUrl}
                    poster={posterUrl || undefined}
                    className="w-full max-h-full object-contain relative z-10 pointer-events-none"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => {
                      setIsBuffering(false);
                      setStreamError(false);
                    }}
                    onCanPlay={(e) => {
                      setIsBuffering(false);
                      if (isPlaying) e.currentTarget.play().catch(() => {});
                    }}
                    onError={() => {
                      setIsBuffering(false);
                      setStreamError(true);
                    }}
                  />
                  <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 flex items-center gap-1 shadow-lg">
                    Letterbox (9:16)
                  </div>
                </div>
              ) : (
                /* Auto Face-Tracking (9:16) - Full Vertical Cover Crop */
                <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center pointer-events-none">
                  <video
                    ref={videoRef}
                    src={activeVideoUrl}
                    poster={posterUrl || undefined}
                    className="w-full h-full object-cover object-center relative z-10 pointer-events-none"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => {
                      setIsBuffering(false);
                      setStreamError(false);
                    }}
                    onCanPlay={(e) => {
                      setIsBuffering(false);
                      if (isPlaying) e.currentTarget.play().catch(() => {});
                    }}
                    onError={() => {
                      setIsBuffering(false);
                      setStreamError(true);
                    }}
                  />
                  <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    9:16 Face Tracking Active
                  </div>
                </div>
              )}

              {/* Shared Video Controls Overlay (Mute + Mini Play) */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayAll();
                  }}
                  className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>

              {/* Central Big Play Button Indicator when Paused */}
              {!isPlaying && !isBuffering && !streamError && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayAll();
                  }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 backdrop-blur-[1px] cursor-pointer pointer-events-auto transition-all"
                >
                  <div className="w-14 h-14 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/60 flex items-center justify-center text-amber-400 shadow-2xl hover:scale-110 hover:bg-amber-400 hover:text-black transition-all">
                    <Play className="w-6 h-6 fill-current ml-1" />
                  </div>
                </div>
              )}

              {/* Central Buffering Indicator */}
              {isBuffering && (
                <div className="absolute inset-0 z-25 flex items-center justify-center bg-black/45 backdrop-blur-[1px] pointer-events-none">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/80 border border-amber-400/50 text-amber-300 text-xs font-bold shadow-lg animate-pulse">
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Buffering stream...</span>
                  </div>
                </div>
              )}

              {/* Central Stream Error / Reconnect Indicator */}
              {streamError && (
                <div className="absolute inset-0 z-25 flex flex-col items-center justify-center bg-black/85 p-6 text-center space-y-3 pointer-events-auto">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white">Stream Interrupted</p>
                    <p className="text-[11px] text-gray-400 max-w-[210px] leading-relaxed">
                      Video stream connection stalled or encountered an error.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStreamError(false);
                      const vids = containerRef.current?.querySelectorAll("video") || [];
                      vids.forEach((v) => {
                        try {
                          v.load();
                          if (isPlaying) v.play().catch(() => {});
                        } catch {}
                      });
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reload Stream</span>
                  </button>
                </div>
              )}

              {/* Draggable Subtitle Preview */}
              <DraggableCaptionOverlay
                addCaptions={addCaptions}
                captionYPct={captionYPct}
                selectedEffectId={selectedEffectId}
                isDraggingCaption={isDraggingCaption}
                startCaptionDrag={startCaptionDrag}
              />
            </div>
          )}
          </div>

          {/* Integrated Mobile Playback & Timestamp Dock Inside Phone Screen */}
          {hasMedia && !isProcessing && (
            <div className="w-full bg-[#0d0d0f]/95 backdrop-blur-xl border-t border-white/10 p-3 space-y-2 z-30 shrink-0 select-none">
              {/* Timeline Scrubber & Timestamp Readout */}
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-300 font-bold">
                <span className="text-amber-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> {formatTime(currentTime)}
                </span>
                <span className="text-gray-400 font-mono">
                  {duration > 0 ? formatTime(duration) : (mediaDuration && mediaDuration > 0 ? formatTime(mediaDuration) : "--:--")}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max={duration || mediaDuration || 100}
                step="0.5"
                value={currentTime}
                onPointerDown={() => { isDraggingRef.current = true; }}
                onMouseDown={() => { isDraggingRef.current = true; }}
                onTouchStart={() => { isDraggingRef.current = true; }}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setCurrentTime(val);
                }}
                onPointerUp={(e) => {
                  isDraggingRef.current = false;
                  commitSeek(parseFloat(e.currentTarget.value));
                }}
                onMouseUp={(e) => {
                  isDraggingRef.current = false;
                  commitSeek(parseFloat(e.currentTarget.value));
                }}
                onTouchEnd={(e) => {
                  isDraggingRef.current = false;
                  commitSeek(parseFloat(e.currentTarget.value));
                }}
                onKeyUp={(e) => {
                  commitSeek(parseFloat(e.currentTarget.value));
                }}
                className="w-full accent-amber-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
              />

              {/* Transport Buttons & Quick Scene Jumps */}
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => seekRelative(-10)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Rewind 10 seconds"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={togglePlayAll}
                  className="w-[84px] h-7 rounded-xl bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-300 transition-all shadow-md cursor-pointer shrink-0"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => seekRelative(10)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Forward 10 seconds"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />

                {/* Fast Scene Hoppers */}
                <button
                  type="button"
                  onClick={() => seekRelative(15)}
                  className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Jump forward 15 seconds"
                >
                  +15s
                </button>
                <button
                  type="button"
                  onClick={() => seekRelative(60)}
                  className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Jump forward 1 minute"
                >
                  +1m
                </button>
              </div>

              {/* Quick Mark Start / End Timestamps with Active Segment Pinning & Multi-Segment Tabs */}
              {(setStartTs || setEndTs || setCustomSegments) && (
                <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                  <div className="flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clip Time Bounds</span>
                      {customSegments.length > 1 && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                          {customSegments.length} Clips
                        </span>
                      )}
                    </div>
                    {(startTs || endTs || customSegments.some((s) => s.start || s.end)) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (setStartTs) setStartTs("");
                          if (setEndTs) setEndTs("");
                          if (setCustomSegments) {
                            setCustomSegments([{ id: "1", start: "0:00", end: "" }]);
                          }
                          if (setActiveSegmentId) setActiveSegmentId("1");
                        }}
                        className="text-[9px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                      >
                        Clear Bounds
                      </button>
                    )}
                  </div>

                  {/* Multi-Segment Chips Switcher if > 1 segment exists */}
                  {customSegments.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {customSegments.map((seg, idx) => {
                        const isSel = activeSegmentId === seg.id;
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => {
                              if (setActiveSegmentId) setActiveSegmentId(seg.id);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black border transition-all cursor-pointer shrink-0 ${
                              isSel
                                ? "bg-amber-400 text-black border-amber-400 shadow-sm"
                                : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                            }`}
                          >
                            Clip #{idx + 1} {seg.start ? `(${seg.start}${seg.end ? `-${seg.end}` : ""})` : ""}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Pin Start & Pin End Buttons */}
                  {(() => {
                    const currentActiveSeg = customSegments.find((s) => s.id === activeSegmentId) || customSegments[0] || { start: startTs, end: endTs };
                    const currentStartDisplay = currentActiveSeg.start || startTs || "0:00";
                    const currentEndDisplay = currentActiveSeg.end || endTs || (duration > 0 ? formatTime(duration) : (mediaDuration && mediaDuration > 0 ? formatTime(mediaDuration) : "0:00"));

                    return (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const formatted = formatTime(currentTime);
                            if (setCustomSegments) {
                              setCustomSegments((prev) => prev.map((s) => (s.id === activeSegmentId ? { ...s, start: formatted } : s)));
                            }
                            if (setStartTs) setStartTs(formatted);
                            if (setDurationMode) setDurationMode("custom");
                          }}
                          title={`Pin Start timestamp (${formatTime(currentTime)}) to active clip`}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                            currentActiveSeg.start || startTs
                              ? "bg-amber-400/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/30"
                              : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                          }`}
                        >
                          <Pin className={`w-3 h-3 ${currentActiveSeg.start || startTs ? "text-amber-400" : "text-gray-400"}`} />
                          <span>Start: {currentStartDisplay}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const formatted = formatTime(currentTime);
                            if (setCustomSegments) {
                              setCustomSegments((prev) => prev.map((s) => (s.id === activeSegmentId ? { ...s, end: formatted } : s)));
                            }
                            if (setEndTs) setEndTs(formatted);
                            if (setDurationMode) setDurationMode("custom");
                          }}
                          title={`Pin End timestamp (${formatTime(currentTime)}) to active clip`}
                          className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                            currentActiveSeg.end || endTs
                              ? "bg-cyan-400/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/30"
                              : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                          }`}
                        >
                          <Flag className={`w-3 h-3 ${currentActiveSeg.end || endTs ? "text-cyan-400" : "text-gray-400"}`} />
                          <span>End: {currentEndDisplay}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Home Indicator Bar (Swipe Bar) */}
        <div className="w-32 h-1 bg-white/20 rounded-full mx-auto mt-2 mb-0.5 pointer-events-none shrink-0" />
      </div>
    </div>
  );
};
