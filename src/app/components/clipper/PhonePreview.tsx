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
} from "lucide-react";
import type { CropBox } from "./types";
import { extractYouTubeId } from "./types";

interface PhonePreviewProps {
  activeVideoUrl: string;
  ytUrl?: string;
  loadingPreview?: boolean;
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
  startTs?: string;
  setStartTs?: (ts: string) => void;
  endTs?: string;
  setEndTs?: (ts: string) => void;
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
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
          title="YouTube Crop Preview"
          className="pointer-events-none"
          style={{
            position: "absolute",
            width: `${scaleW}%`,
            height: `${scaleH}%`,
            maxWidth: "none",
            maxHeight: "none",
            left: `${leftP}%`,
            top: `${topP}%`,
            transform: "translateZ(0)",
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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
        className={`pointer-events-auto px-4 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border transition-all cursor-grab active:cursor-grabbing shadow-2xl flex items-center gap-2 group ${
          isDraggingCaption
            ? "border-amber-400 ring-2 ring-amber-400/60 scale-105"
            : "border-white/20 hover:border-amber-400/80 hover:bg-black/90 hover:scale-102"
        }`}
      >
        <Move className="w-3.5 h-3.5 text-gray-400 group-hover:text-amber-400 transition-colors pointer-events-none" />
        <span
          className={`text-sm tracking-wider uppercase font-black text-center pointer-events-none ${
            selectedEffectId === "capcut_yellow"
              ? "text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              : selectedEffectId === "clean_white"
              ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
              : selectedEffectId === "neon_cyan"
              ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              : selectedEffectId === "emerald_green"
              ? "text-emerald-300 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]"
              : selectedEffectId === "fire_red"
              ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]"
              : selectedEffectId === "sigma_pink"
              ? "text-pink-400 drop-shadow-[0_0_12px_rgba(236,72,153,0.8)]"
              : "text-yellow-300"
          }`}
        >
          VIRAL CAPTION
        </span>
      </div>
    </div>
  );
};

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  activeVideoUrl,
  ytUrl = "",
  loadingPreview = false,
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
  startTs = "",
  setStartTs,
  endTs = "",
  setEndTs,
  onCancel,
  gameplayBgVideo = "",
}) => {
  const youtubeId = extractYouTubeId(ytUrl);
  const posterUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : "";
  const hasMedia = Boolean(activeVideoUrl || youtubeId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Playback & Scrubber States
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
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

  // Synchronize play/pause state across all video elements in the preview
  useEffect(() => {
    const vids = containerRef.current?.querySelectorAll("video") || [];
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
        if (currentTime > 0 && Math.abs((v.currentTime || 0) - currentTime) > 0.5) {
          try {
            v.currentTime = currentTime;
          } catch {}
        }
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

  // Synchronized seek on active video elements within the phone container
  const seekAllVideos = (timeInSeconds: number) => {
    const vids = containerRef.current?.querySelectorAll("video") || [];
    vids.forEach((vid) => {
      try {
        vid.currentTime = Math.max(0, Math.min(timeInSeconds, vid.duration || duration || 3600));
      } catch {}
    });
    setCurrentTime(timeInSeconds);
  };

  const togglePlayAll = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    const vids = containerRef.current?.querySelectorAll("video") || [];
    vids.forEach((vid) => {
      if (nextState) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  };

  const seekRelative = (deltaSeconds: number) => {
    const maxDur = duration > 0 ? duration : 3600;
    const target = Math.max(0, Math.min(maxDur, currentTime + deltaSeconds));
    seekAllVideos(target);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.duration && (!duration || Math.abs(duration - v.duration) > 1)) {
      setDuration(v.duration);
    }
    const now = Date.now();
    if (now - lastUpdateTimeRef.current > 150) {
      lastUpdateTimeRef.current = now;
      setCurrentTime(v.currentTime || 0);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const target = e.currentTarget;
    if (target.duration && !isNaN(target.duration)) {
      setDuration(target.duration);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0a0a0a] select-none relative overflow-y-auto">
      {/* Background Ambient Glow */}
      <div className="absolute w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* 9:16 Smartphone Mockup */}
      <div className="relative w-[340px] h-[600px] bg-black rounded-[48px] p-3 shadow-[0_0_60px_rgba(0,0,0,0.8)] border-[6px] border-[#222] ring-1 ring-white/10 flex flex-col z-10">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-4 bg-[#111] rounded-full z-40 flex items-center justify-center shadow-inner border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1c1c1e] mr-2" />
          <div className="w-10 h-1.5 rounded-full bg-[#1c1c1e]" />
        </div>

        {/* Screen Viewport */}
        <div className="relative flex-1 bg-[#111] rounded-[38px] overflow-hidden flex items-center justify-center border border-white/5">
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
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-white">Loading YouTube Preview...</p>
              <p className="text-[10px] text-gray-400">Fetching video stream & auto-captions</p>
            </div>
          ) : layout === "custom_split" ? (
            /* Custom Split Screen Preview (Top & Bottom Crop Boxes) */
            <div className="w-full h-full flex flex-col relative select-none bg-black">
              {/* HUD Badge */}
              <div className="absolute top-10 left-3 z-30 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Custom Split (9:16)
              </div>

              {/* Top Viewport */}
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

              {/* Bottom Viewport */}
              <div className="w-full h-1/2 relative overflow-hidden">
                <CroppedVideo
                  src={activeVideoUrl}
                  youtubeId={youtubeId}
                  crop={cropBottom}
                  isMuted={isMuted}
                  label="Bottom Crop (Cyan)"
                />
              </div>

              {/* Video Controls Overlay */}
              {hasMedia && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayAll();
                    }}
                    className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
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
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
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
          ) : layout === "gameplay_bg" ? (
            /* Satisfying Gameplay Split (Speaker Top, Gameplay Bottom) */
            <div className="w-full h-full flex flex-col relative select-none bg-black">
              {/* HUD Badge */}
              <div className="absolute top-10 left-3 z-30 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Gameplay Split (9:16)
              </div>

              {/* Speaker Top Viewport */}
              <div className="w-full h-1/2 relative overflow-hidden border-b-2 border-amber-400/30">
                {activeVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={activeVideoUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onCanPlay={(e) => {
                      if (isPlaying) e.currentTarget.play().catch(() => {});
                    }}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : youtubeId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                    title="YouTube Speaker Preview"
                    className="w-full h-full object-cover pointer-events-none scale-125"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-bold">
                    Speaker Video
                  </div>
                )}
              </div>

              {/* Gameplay Bottom Viewport */}
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
                    [ Satisfying Gameplay ]
                  </div>
                )}
              </div>

              {/* Video Controls Overlay */}
              {activeVideoUrl && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayAll();
                    }}
                    className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
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
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
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
          ) : (
            /* Standard 9:16 Vertical Crop / Blur / Fit Viewports */
            <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-black select-none">
              {activeVideoUrl ? (
                layout === "landscape_blur" ? (
                  /* 2. Landscape + Blurred Canvas (9:16) */
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
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
                      onCanPlay={(e) => {
                        if (isPlaying) e.currentTarget.play().catch(() => {});
                      }}
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 flex items-center gap-1 shadow-lg">
                      Blurred Canvas (9:16)
                    </div>
                  </div>
                ) : layout === "landscape_fit" ? (
                  /* 3. Landscape Fit / Letterbox (9:16) */
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
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
                      onCanPlay={(e) => {
                        if (isPlaying) e.currentTarget.play().catch(() => {});
                      }}
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 flex items-center gap-1 shadow-lg">
                      Letterbox (9:16)
                    </div>
                  </div>
                ) : (
                  /* 1. Auto Face-Tracking (9:16) - Full Vertical Cover Crop */
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
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
                      onCanPlay={(e) => {
                        if (isPlaying) e.currentTarget.play().catch(() => {});
                      }}
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      9:16 Face Tracking Active
                    </div>
                  </div>
                )
              ) : youtubeId ? (
                /* Fallback for YouTube Stream before stream slicing is cached */
                layout === "landscape_blur" ? (
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                      title="YouTube Blur Background"
                      className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-150 opacity-60 pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                      title="YouTube Foreground"
                      className="w-full h-[56.25%] object-contain relative z-10 pointer-events-none shadow-2xl"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 flex items-center gap-1 shadow-lg">
                      🌫️ Blurred Canvas (9:16)
                    </div>
                  </div>
                ) : layout === "landscape_fit" ? (
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                      title="YouTube Letterbox"
                      className="w-full h-[56.25%] object-contain relative z-10 pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 flex items-center gap-1 shadow-lg">
                      📺 Letterbox (9:16)
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                      title="YouTube 9:16 Face Tracking Preview"
                      className="w-full h-full object-cover pointer-events-none scale-175"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                    <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 text-[9px] font-bold text-amber-400 flex items-center gap-1 shadow-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      🎯 9:16 Face Tracking Active
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center text-gray-500">
                  <div className="w-12 h-12 rounded-full border border-dashed border-gray-600 flex items-center justify-center mx-auto mb-2 text-gray-400">
                    9:16
                  </div>
                  <p className="text-xs font-semibold">Video Preview</p>
                  <p className="text-[10px] text-gray-600 mt-1">Select a video to see live AI framing</p>
                </div>
              )}

              {/* Video Controls Overlay */}
              {hasMedia && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayAll();
                    }}
                    className="p-1.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/20 hover:bg-black transition-colors cursor-pointer shadow-lg"
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
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
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
      </div>

      {/* Interactive Mobile Playback & Timestamp Dock */}
      {hasMedia && (
        <div className="w-[340px] mt-4 p-3.5 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl space-y-2.5 z-20 animate-fadeIn">
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
            onChange={(e) => seekAllVideos(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-black/60 rounded-lg cursor-pointer"
          />

          {/* Transport Buttons & Quick Scene Jumps */}
          <div className="flex items-center justify-center gap-2 pt-1">
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

          {/* Quick Mark Start / End Timestamps with Active Highlighting & Reset */}
          {(setStartTs || setEndTs) && (
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clip Time Bounds</span>
                {(startTs || endTs) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (setStartTs) setStartTs("");
                      if (setEndTs) setEndTs("");
                    }}
                    className="text-[9px] text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                  >
                    Clear Bounds
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {setStartTs && (
                  <button
                    type="button"
                    onClick={() => {
                      const formatted = formatTime(currentTime);
                      setStartTs(formatted);
                      if (setDurationMode) setDurationMode("custom");
                    }}
                    title={`Click to set Start timestamp to current playback time (${formatTime(currentTime)})`}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      startTs
                        ? "bg-amber-400/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/30"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                    }`}
                  >
                    <Pin className={`w-3 h-3 ${startTs ? "text-amber-400" : "text-gray-400"}`} />
                    <span>Start: {startTs || "00:00"}</span>
                  </button>
                )}
                {setEndTs && (
                  <button
                    type="button"
                    onClick={() => {
                      const formatted = formatTime(currentTime);
                      setEndTs(formatted);
                      if (setDurationMode) setDurationMode("custom");
                    }}
                    title={`Click to set End timestamp to current playback time (${formatTime(currentTime)})`}
                    className={`flex-1 py-1.5 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                      endTs
                        ? "bg-cyan-400/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/30"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-300 hover:text-white"
                    }`}
                  >
                    <Flag className={`w-3 h-3 ${endTs ? "text-cyan-400" : "text-gray-400"}`} />
                    <span>End: {endTs || (duration > 0 ? formatTime(duration) : (mediaDuration && mediaDuration > 0 ? formatTime(mediaDuration) : "00:00"))}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
