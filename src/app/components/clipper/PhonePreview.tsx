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
  Repeat,
} from "lucide-react";
import type { CropBox, CustomSegment } from "./types";
import { extractYouTubeId, parseTimestampToSec } from "./types";
import { AskStudioPanel } from "./AskStudioPanel";

interface PhonePreviewProps {
  activeVideoUrl: string;
  ytUrl?: string;
  localFilePath?: string;
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
  onPlaySegment?: (seg: CustomSegment) => void;
  isPreviewingEffect?: boolean;
  hoveredEffectName?: string;
  onOpenEngineSettings?: () => void;
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
  isPreviewingEffect?: boolean;
  hoveredEffectName?: string;
}> = ({
  addCaptions,
  captionYPct,
  selectedEffectId,
  isDraggingCaption,
  startCaptionDrag,
  isPreviewingEffect = false,
  hoveredEffectName = "",
}) => {
  if (!addCaptions) return null;

  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimStep((prev) => (prev + 1) % 3);
    }, 650);
    return () => clearInterval(interval);
  }, []);

  const fontSans = { fontFamily: "'Montserrat', sans-serif" };
  const fontAnton = { fontFamily: "'Anton', 'Impact', sans-serif" };

  const renderPresetPreview = () => {
    switch (selectedEffectId) {
      case "opus_green":
      case "emerald_green":
        return (
          <div className="flex items-center gap-1.5 pointer-events-none tracking-wide uppercase font-black text-sm" style={fontSans}>
            <span
              className={`transition-all duration-200 px-0.5 ${animStep === 0 ? "scale-110 text-[#00FF66]" : "text-white"}`}
              style={{
                textShadow:
                  animStep === 0
                    ? "0 0 10px #00FF66, 0 0 20px rgba(0,255,102,0.9)"
                    : "0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.5)",
              }}
            >
              THE
            </span>
            <span
              className={`transition-all duration-200 px-0.5 ${animStep === 1 ? "scale-115 text-white" : "text-[#00FF66]"}`}
              style={{
                textShadow:
                  animStep === 1
                    ? "0 0 12px #fff, 0 0 24px rgba(255,255,255,0.9)"
                    : "0 0 10px #00FF66, 0 0 22px rgba(0,255,102,0.85)",
              }}
            >
              QUICK
            </span>
          </div>
        );
      case "capcut_neon_red":
        return (
          <div className="flex flex-col items-center pointer-events-none tracking-wide uppercase font-black text-sm" style={fontSans}>
            <span className={`text-base leading-none mb-0.5 transition-transform duration-200 ${animStep === 0 ? "scale-125 animate-bounce" : "scale-100"}`}>🤩</span>
            <span
              className={`text-[#FF3C30] px-1.5 transition-transform duration-200 ${animStep === 1 ? "scale-110" : ""}`}
              style={{
                textShadow: "0 0 10px #FF3C30, 0 0 24px rgba(255,60,48,0.85)",
              }}
            >
              EMOJI
            </span>
          </div>
        );
      case "capcut_yellow":
        return (
          <div className="flex flex-col items-center pointer-events-none tracking-wide uppercase font-black text-xs leading-tight" style={fontSans}>
            <span
              className={`transition-all duration-200 ${animStep === 0 ? "scale-115 text-white" : "text-[#FFE600]"}`}
              style={{
                textShadow:
                  animStep === 0
                    ? "0 0 10px #fff, 0 0 20px rgba(255,255,255,0.9)"
                    : "0 0 8px #FFE600, 0 0 18px rgba(255,230,0,0.8)",
              }}
            >
              THE
            </span>
            <span
              className={`transition-all duration-200 ${animStep === 1 ? "scale-115 text-[#FFE600]" : "text-white"}`}
              style={{
                textShadow:
                  animStep === 1
                    ? "0 0 10px #FFE600, 0 0 20px rgba(255,230,0,0.8)"
                    : "0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.5)",
              }}
            >
              QUICK
            </span>
          </div>
        );
      case "capcut_bold_green":
        return (
          <div className="flex items-center pointer-events-none font-black text-sm lowercase tracking-tight" style={fontSans}>
            <span
              className={`text-[#00FF66] transition-transform duration-200 ${animStep === 0 ? "scale-110" : ""}`}
              style={{
                WebkitTextStroke: "1.5px #000000",
                textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
              }}
            >
              brown
            </span>
          </div>
        );
      case "neon_cyan":
        return (
          <div className="flex items-center gap-1.5 pointer-events-none tracking-wide uppercase font-black text-sm" style={fontSans}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-white" : "text-[#00F0FF]"}`}
              style={{
                textShadow:
                  animStep === 0
                    ? "0 0 10px #fff, 0 0 20px rgba(255,255,255,0.9)"
                    : "0 0 10px #00F0FF, 0 0 22px rgba(0,240,255,0.8)",
              }}
            >
              ELECTRIC
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-[#00F0FF]" : "text-white"}`}
              style={{
                textShadow:
                  animStep === 1
                    ? "0 0 10px #00F0FF, 0 0 22px rgba(0,240,255,0.8)"
                    : "0 0 8px rgba(255,255,255,0.8)",
              }}
            >
              CYAN
            </span>
          </div>
        );
      case "hormozi_bold":
        return (
          <div className="flex items-center gap-1 pointer-events-none tracking-wider uppercase font-black text-sm" style={fontAnton}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-white" : "text-[#FFD700]"}`}
              style={{
                WebkitTextStroke: "1.2px #000000",
                textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
              }}
            >
              HORMOZI
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-[#FFD700]" : "text-white"}`}
              style={{
                WebkitTextStroke: "1px #000000",
                textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
              }}
            >
              PUNCH
            </span>
          </div>
        );
      case "clean_white":
        return (
          <div className="flex items-center justify-center gap-1.5 pointer-events-none tracking-wider uppercase font-black text-sm" style={fontSans}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)]" : "text-white/60"}`}
              style={{
                textShadow: animStep === 0
                  ? "0 0 14px rgba(255,255,255,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000"
                  : "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
              }}
            >
              CLEAN
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-white drop-shadow-[0_0_12px_rgba(255,255,255,1)]" : "text-white/60"}`}
              style={{
                textShadow: animStep === 1
                  ? "0 0 14px rgba(255,255,255,1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000"
                  : "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
              }}
            >
              WHITE
            </span>
          </div>
        );
      case "capcut_banner":
        return (
          <div className="flex items-center gap-1 pointer-events-none px-2 py-0.5 rounded-lg bg-black/85 border border-white/20 shadow-md select-none" style={fontAnton}>
            <span
              className={`text-white px-1 text-xs font-black transition-all duration-200 ${animStep === 0 ? "scale-110 text-yellow-300" : ""}`}
            >
              DARK
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-black transition-all duration-200 ${animStep === 1 ? "bg-white text-black scale-110" : "bg-[#FFE600] text-black"}`}
            >
              BANNER
            </span>
          </div>
        );
      case "glitch_purple":
        return (
          <div className="flex items-center gap-1.5 pointer-events-none tracking-wide uppercase font-black text-sm" style={fontSans}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-[#D946EF]" : "text-white"}`}
              style={{
                textShadow:
                  animStep === 0
                    ? "0 0 10px #D946EF, 0 0 22px rgba(217,70,239,0.85)"
                    : "0 0 8px rgba(255,255,255,0.7)",
              }}
            >
              CYBER
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-white" : "text-[#D946EF]"}`}
              style={{
                textShadow:
                  animStep === 1
                    ? "0 0 10px #fff, 0 0 20px rgba(255,255,255,0.9)"
                    : "0 0 10px #D946EF, 0 0 24px rgba(217,70,239,0.9)",
              }}
            >
              VIOLET
            </span>
          </div>
        );
      case "fire_orange":
        return (
          <div className="flex items-center gap-1.5 pointer-events-none tracking-wide uppercase font-black text-sm" style={fontSans}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-white" : "text-[#FFE600]"}`}
              style={{
                textShadow:
                  animStep === 0
                    ? "0 0 10px #fff, 0 0 20px rgba(255,255,255,0.9)"
                    : "0 0 10px #FFE600, 0 0 20px rgba(255,230,0,0.8)",
              }}
            >
              FLAME
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-[#FFE600]" : "text-[#FF5722]"}`}
              style={{
                textShadow:
                  animStep === 1
                    ? "0 0 10px #FFE600, 0 0 20px rgba(255,230,0,0.8)"
                    : "0 0 12px #FF5722, 0 0 24px rgba(255,87,34,0.9)",
              }}
            >
              PUNCH
            </span>
          </div>
        );
      case "ocean_blue":
        return (
          <div className="flex items-center gap-1.5 pointer-events-none tracking-wide uppercase font-black text-sm" style={fontSans}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-[#00A3FF]" : "text-white"}`}
              style={{
                textShadow:
                  animStep === 0
                    ? "0 0 10px #00A3FF, 0 0 22px rgba(0,163,255,0.85)"
                    : "0 0 8px rgba(255,255,255,0.7)",
              }}
            >
              OCEAN
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-white" : "text-[#00A3FF]"}`}
              style={{
                textShadow:
                  animStep === 1
                    ? "0 0 10px #fff, 0 0 20px rgba(255,255,255,0.9)"
                    : "0 0 10px #00A3FF, 0 0 24px rgba(0,163,255,0.9)",
              }}
            >
              WAVE
            </span>
          </div>
        );
      case "beast_yellow":
        return (
          <div className="flex items-center gap-1 pointer-events-none tracking-tight uppercase font-black text-sm" style={fontSans}>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 0 ? "scale-115 text-[#FFDE00]" : "text-white"}`}
              style={{
                WebkitTextStroke: "1.2px #000000",
                textShadow: "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000",
              }}
            >
              THUNDER
            </span>
            <span
              className={`px-1 transition-all duration-200 ${animStep === 1 ? "scale-115 text-white" : "text-[#FFDE00]"}`}
              style={{
                WebkitTextStroke: "1.5px #000000",
                textShadow: "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 4px 8px rgba(0,0,0,0.9)",
              }}
            >
              BEAST
            </span>
          </div>
        );
      case "purple_box":
        return (
          <div className="flex flex-col items-center pointer-events-none tracking-wide uppercase font-black text-xs leading-tight" style={fontSans}>
            <span
              className={`drop-shadow-md transition-all duration-200 ${
                animStep === 0 ? "scale-110 text-[#C4B5FD]" : "text-white"
              }`}
              style={{
                WebkitTextStroke: "1px #000",
                textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
              }}
            >
              THE QUICK
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`drop-shadow-md transition-all duration-200 ${
                  animStep === 1 ? "scale-110 text-[#C4B5FD]" : "text-white"
                }`}
                style={{
                  WebkitTextStroke: "1px #000",
                  textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                }}
              >
                BROWN
              </span>
              <span
                className={`bg-[#8B5CF6] text-white px-2 py-0.5 rounded-[5px] shadow-lg transition-transform duration-200 ${
                  animStep === 2
                    ? "scale-120 shadow-[0_0_16px_#8B5CF6]"
                    : "scale-100"
                }`}
                style={{
                  WebkitTextStroke: "0.8px #000",
                  textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                }}
              >
                FOX
              </span>
            </div>
          </div>
        );
      case "duo_lime":
        return (
          <div className="flex items-center gap-2 pointer-events-none tracking-tight uppercase font-black text-sm" style={fontSans}>
            <span
              className={`transition-all duration-200 ${
                animStep === 0 ? "scale-115 text-[#A3E635]" : "text-white"
              }`}
              style={{
                WebkitTextStroke: "1.2px #000",
                textShadow:
                  animStep === 0
                    ? "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 12px rgba(163,230,53,0.8)"
                    : "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 3px 6px rgba(0,0,0,0.8)",
              }}
            >
              BROWN
            </span>
            <span
              className={`transition-all duration-200 ${
                animStep === 1
                  ? "scale-115 text-[#A3E635]"
                  : animStep === 0
                  ? "text-white"
                  : "text-[#A3E635]"
              }`}
              style={{
                WebkitTextStroke: "1.2px #000",
                textShadow:
                  animStep === 1
                    ? "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 14px rgba(163,230,53,0.9)"
                    : "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 0 12px rgba(163,230,53,0.6)",
              }}
            >
              FOX
            </span>
          </div>
        );
      case "single_word": {
        const words = ["quick", "brown", "fox"];
        const currentWord = words[animStep % words.length];
        return (
          <div className="flex items-center pointer-events-none lowercase font-black text-base" style={fontSans}>
            <span
              key={currentWord}
              className="text-white transition-all duration-200 scale-115 text-emerald-300 drop-shadow-[0_0_10px_rgba(0,230,118,0.8)]"
              style={{
                WebkitTextStroke: "1px #000",
                textShadow: "0 3px 10px rgba(0,0,0,0.9), -1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000",
              }}
            >
              {currentWord}
            </span>
          </div>
        );
      }
      default:
        return (
          <div className="flex items-center gap-1 pointer-events-none tracking-wider uppercase font-black text-sm">
            <span
              className="text-white px-1"
              style={{
                textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
              }}
            >
              CAPTION
            </span>
          </div>
        );
    }
  };

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
        className={`pointer-events-auto px-4 py-2 rounded-2xl bg-black/85 backdrop-blur-md border transition-all cursor-grab active:cursor-grabbing shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center gap-2 group relative ${
          isDraggingCaption
            ? "border-amber-400 ring-2 ring-amber-400/60 scale-105"
            : isPreviewingEffect
            ? "border-emerald-400 ring-2 ring-emerald-400/80 scale-110 bg-black/95 shadow-[0_0_30px_rgba(0,255,102,0.45)]"
            : "border-white/20 hover:border-amber-400/80 hover:bg-black/95 hover:scale-102"
        }`}
      >
        {isPreviewingEffect && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black tracking-wider uppercase shadow-xl border border-emerald-300 pointer-events-none animate-bounce whitespace-nowrap z-40">
            <span>✨ LIVE PREVIEW</span>
            {hoveredEffectName && <span className="opacity-90">• {hoveredEffectName}</span>}
          </div>
        )}
        <Move className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition-colors pointer-events-none shrink-0" />
        {renderPresetPreview()}
      </div>
    </div>
  );
};

export const PhonePreview: React.FC<PhonePreviewProps> = ({
  activeVideoUrl,
  ytUrl = "",
  localFilePath = "",
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
  onPlaySegment,
  isPreviewingEffect = false,
  hoveredEffectName = "",
  onOpenEngineSettings,
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
  const [loopSegment, setLoopSegment] = useState(true);

  // Ask Studio Assistant State
  const [isAskStudioOpen, setIsAskStudioOpen] = useState(false);

  const handleAskStudioSeek = (sec: number) => {
    if (videoRef?.current) {
      videoRef.current.currentTime = sec;
    }
    setCurrentTime(sec);
  };

  const handleAskStudioSetClipBounds = (startSec: number, endSec: number) => {
    const startFormatted = formatTime(startSec);
    const endFormatted = formatTime(endSec);
    if (setStartTs) setStartTs(startFormatted);
    if (setEndTs) setEndTs(endFormatted);
    if (setDurationMode) setDurationMode("custom");
    if (setCustomSegments) {
      setCustomSegments((prev) =>
        prev.map((s) =>
          s.id === activeSegmentId ? { ...s, start: startFormatted, end: endFormatted } : s
        )
      );
    }
    if (videoRef?.current) {
      videoRef.current.currentTime = startSec;
    }
    setCurrentTime(startSec);
  };

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

  // Listen to global seek & play events (e.g. triggered when clicking a segment in SetupSidebar)
  useEffect(() => {
    const handleSeekAndPlay = (e: any) => {
      const detail = e.detail;
      if (detail && typeof detail.time === "number") {
        commitSeek(detail.time);
        if (detail.autoPlay) {
          setIsPlaying(true);
          const allVideos = containerRef.current?.querySelectorAll("video") || document.querySelectorAll("video");
          allVideos.forEach((vid) => {
            try {
              vid.currentTime = detail.time;
              vid.play().catch(() => {});
            } catch {}
          });
        }
      }
    };

    window.addEventListener("clipvault-seek-and-play", handleSeekAndPlay);
    return () => {
      window.removeEventListener("clipvault-seek-and-play", handleSeekAndPlay);
    };
  }, [duration, mediaDuration]);

  const handlePlayActiveSegment = (seg?: CustomSegment) => {
    const targetSeg =
      seg ||
      customSegments?.find((s) => s.id === activeSegmentId) || {
        id: activeSegmentId || "1",
        start: startTs || "0:00",
        end: endTs || "",
      };
    if (setActiveSegmentId && targetSeg.id) {
      setActiveSegmentId(targetSeg.id);
    }
    const startSec = parseTimestampToSec(targetSeg.start || "0:00");
    commitSeek(startSec);
    setIsPlaying(true);
    const allVideos = containerRef.current?.querySelectorAll("video") || document.querySelectorAll("video");
    allVideos.forEach((vid) => {
      try {
        vid.currentTime = startSec;
        vid.play().catch(() => {});
      } catch {}
    });
    if (onPlaySegment) {
      onPlaySegment(targetSeg);
    }
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

    // Segment preview looping if custom duration mode and loopSegment is active
    if (durationMode === "custom" && loopSegment) {
      const activeSeg = customSegments?.find((s) => s.id === activeSegmentId);
      if (activeSeg && activeSeg.start && activeSeg.end) {
        const startSec = parseTimestampToSec(activeSeg.start);
        const endSec = parseTimestampToSec(activeSeg.end);
        if (endSec > startSec && v.currentTime >= endSec) {
          commitSeek(startSec);
          const allVideos = containerRef.current?.querySelectorAll("video") || document.querySelectorAll("video");
          allVideos.forEach((vid) => {
            try {
              vid.currentTime = startSec;
              vid.play().catch(() => {});
            } catch {}
          });
          return;
        }
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
      <div id="tour-step-phone-preview" className="relative w-[400px] h-[780px] max-h-[88vh] bg-black rounded-[54px] p-3.5 shadow-[0_0_90px_rgba(0,0,0,0.9)] border-[8px] border-[#222] ring-1 ring-white/15 flex flex-col z-10">
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
              {layout === "podcast_split" || layout === "auto_split" ? (
                /* Dual-Speaker Split (Speaker 1 Top, Speaker 2 Bottom) */
                <div className="w-full h-full flex flex-col relative select-none bg-black pointer-events-none">
                  <div className="absolute top-10 left-3 z-30 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-[#00FF66]/40 text-[9px] font-bold text-[#00FF66] flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                    {layout === "auto_split" ? "Auto-Detect Dual Speaker (9:16)" : "Dual-Speaker Split (9:16)"}
                  </div>

                  {/* Top Speaker: Host (left-biased framing) */}
                  <div className="w-full h-1/2 relative overflow-hidden bg-black">
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
                      style={{ objectPosition: "28% 38%" }}
                    />
                    <div className="absolute bottom-2 left-2 z-20 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[8px] font-bold text-gray-300 border border-white/10">
                      Speaker 1 (Host)
                    </div>
                  </div>

                  {/* Horizontal Divider Seam (Opus style) */}
                  <div className="w-full h-1 bg-[#121218] border-y border-white/10 relative z-20 shrink-0" />

                  {/* Bottom Speaker: Guest (right-biased framing) */}
                  <div className="w-full h-1/2 relative overflow-hidden bg-black">
                    <video
                      src={activeVideoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover pointer-events-none"
                      style={{ objectPosition: "72% 38%" }}
                      ref={(el) => {
                        if (el && videoRef.current) {
                          if (Math.abs(el.currentTime - videoRef.current.currentTime) > 0.25) {
                            el.currentTime = videoRef.current.currentTime;
                          }
                          if (videoRef.current.paused && !el.paused) el.pause();
                          else if (!videoRef.current.paused && el.paused) el.play().catch(() => {});
                        }
                      }}
                    />
                    <div className="absolute bottom-2 left-2 z-20 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[8px] font-bold text-gray-300 border border-white/10">
                      Speaker 2 (Guest)
                    </div>
                  </div>
                </div>
              ) : layout === "custom_split" ? (
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
              ) : layout === "square_blur" ? (
                /* Square Focus + Blurred Canvas (Shorts / Pawn Stars Style) */
                <div className="w-full h-full relative overflow-hidden bg-black flex flex-col items-center justify-center pointer-events-none">
                  <video
                    src={activeVideoUrl}
                    className="absolute inset-0 w-full h-full object-cover filter blur-2xl scale-125 opacity-65 pointer-events-none"
                    autoPlay
                    loop
                    muted={true}
                    playsInline
                  />
                  {/* Elevated Square Focus Frame (58% height, matching Pawn Stars / YouTube Shorts style) */}
                  <div className="relative z-10 w-full aspect-[1/1.1] max-h-[60%] overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border-y border-white/10 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={activeVideoUrl}
                      poster={posterUrl || undefined}
                      className="w-full h-full object-cover pointer-events-none"
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
                  </div>
                  <div className="absolute top-10 left-3 z-20 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/40 text-[9px] font-bold text-emerald-400 flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Square Focus + Blur (Shorts)
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
                isPreviewingEffect={isPreviewingEffect}
                hoveredEffectName={hoveredEffectName}
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

                <div className="w-px h-4 bg-white/15 mx-0.5 shrink-0" />

                {/* Segment Looping Toggle */}
                <button
                  type="button"
                  onClick={() => setLoopSegment(!loopSegment)}
                  className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                    loopSegment
                      ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                      : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                  title={loopSegment ? "Segment Looping: ON (auto-replays from start when reaching end time)" : "Segment Looping: OFF"}
                >
                  <Repeat className="w-3 h-3" />
                  <span className="hidden sm:inline">Loop</span>
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePlayActiveSegment()}
                        className="text-[9.5px] text-amber-400 hover:text-amber-300 font-extrabold flex items-center gap-1 bg-amber-400/15 hover:bg-amber-400/25 px-2 py-0.5 rounded-md border border-amber-400/30 transition-all cursor-pointer shadow-sm"
                        title="Play active segment from start in preview"
                      >
                        <Play className="w-2.5 h-2.5 fill-amber-400" />
                        <span>Play Segment</span>
                      </button>
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
                              handlePlayActiveSegment(seg);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                              isSel
                                ? "bg-amber-400 text-black border-amber-400 shadow-sm"
                                : "bg-white/5 text-gray-400 border-white/10 hover:text-white"
                            }`}
                          >
                            <Play className={`w-2 h-2 ${isSel ? "fill-black text-black" : "fill-gray-400 text-gray-400"}`} />
                            <span>Clip #{idx + 1} {seg.start ? `(${seg.start}${seg.end ? `-${seg.end}` : ""})` : ""}</span>
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

      {/* Ask Studio AI Video Assistant Panel */}
      <AskStudioPanel
        isOpen={isAskStudioOpen}
        onOpen={() => setIsAskStudioOpen(true)}
        onClose={() => setIsAskStudioOpen(false)}
        ytUrl={ytUrl}
        activeVideoUrl={activeVideoUrl}
        localFilePath={localFilePath}
        currentTime={currentTime}
        onSeek={handleAskStudioSeek}
        onSetClipBounds={handleAskStudioSetClipBounds}
        onOpenEngineSettings={onOpenEngineSettings}
      />
    </div>
  );
};
