import React from "react";
import { Check } from "lucide-react";

export interface SubtitlePresetItem {
  id: string;
  name: string;
  badge: string;
  color: string;
  desc: string;
}

export const SUBTITLE_PRESETS: SubtitlePresetItem[] = [
  {
    id: "opus_green",
    name: "Viral Neon",
    badge: "VIRAL",
    color: "#00FF66",
    desc: "Diffuse white glow + radiant neon green bloom with dark ambient backing",
  },
  {
    id: "capcut_neon_red",
    name: "Pop Emoji",
    badge: "EMOJI",
    color: "#FF3C30",
    desc: "Radiant neon red glow with floating 3D emoji centered above active phrase",
  },
  {
    id: "capcut_yellow",
    name: "Golden Stack",
    badge: "STACKED",
    color: "#FFE600",
    desc: "Stacked 2-line glow: gold yellow top line + crisp white bottom line",
  },
  {
    id: "capcut_bold_green",
    name: "Bold Outline",
    badge: "OUTLINE",
    color: "#00FF66",
    desc: "Chunky Montserrat Black lime text with heavy rounded solid black outline",
  },
  {
    id: "neon_cyan",
    name: "Electric Cyan",
    badge: "CYBER",
    color: "#00F0FF",
    desc: "High-contrast electric cyan glow with ambient backing",
  },
  {
    id: "hormozi_bold",
    name: "Hormozi Punch",
    badge: "HOOK",
    color: "#FFB800",
    desc: "Bold Anton heavy block typography with high-contrast black border",
  },
  {
    id: "clean_white",
    name: "Clean White",
    badge: "MINIMAL",
    color: "#FFFFFF",
    desc: "Crisp white font with subtle cinematic drop shadow",
  },
];

export const SubtitlePreviewSnippet: React.FC<{ styleId: string; compact?: boolean }> = ({
  styleId,
  compact = false,
}) => {
  switch (styleId) {
    case "opus_green":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wide uppercase select-none ${
            compact ? "text-[11px]" : "text-xs sm:text-[13px]"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span
            className="text-white"
            style={{
              textShadow: "0 0 6px rgba(255,255,255,0.7), 0 0 12px rgba(255,255,255,0.4)",
            }}
          >
            THE
          </span>
          <span
            className="text-[#00FF66]"
            style={{
              textShadow: "0 0 8px #00FF66, 0 0 18px rgba(0,255,102,0.85), 0 0 28px rgba(0,255,102,0.5)",
            }}
          >
            QUICK
          </span>
        </div>
      );

    case "capcut_neon_red":
      return (
        <div
          className={`flex flex-col items-center justify-center select-none font-black tracking-wider uppercase leading-tight ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className={`${compact ? "text-xs" : "text-sm"} leading-none mb-0.5 filter drop-shadow`}>
            🤩
          </span>
          <span
            className="text-[#FF3C30]"
            style={{
              textShadow: "0 0 8px #FF3C30, 0 0 20px rgba(255,60,48,0.85), 0 0 30px rgba(255,60,48,0.4)",
            }}
          >
            EMOJI
          </span>
        </div>
      );

    case "capcut_yellow":
      return (
        <div
          className={`flex flex-col items-center justify-center select-none font-black tracking-wide uppercase leading-tight ${
            compact ? "text-[9.5px]" : "text-[11px]"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span
            className="text-[#FFE600]"
            style={{
              textShadow: "0 0 8px #FFE600, 0 0 16px rgba(255,230,0,0.8)",
            }}
          >
            THE
          </span>
          <span
            className="text-white"
            style={{
              textShadow: "0 0 6px rgba(255,255,255,0.8)",
            }}
          >
            QUICK
          </span>
        </div>
      );

    case "capcut_bold_green":
      return (
        <div
          className={`flex items-center justify-center select-none font-black lowercase tracking-tight ${
            compact ? "text-xs" : "text-sm"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span
            className="text-[#00FF66] font-extrabold"
            style={{
              WebkitTextStroke: "1.2px #000000",
              textShadow:
                "-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
            }}
          >
            brown
          </span>
        </div>
      );

    case "neon_cyan":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wide uppercase select-none ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span
            className="text-[#00F0FF]"
            style={{
              textShadow: "0 0 8px #00F0FF, 0 0 18px rgba(0,240,255,0.85)",
            }}
          >
            ELECTRIC
          </span>
          <span
            className="text-white text-[9px]"
            style={{
              textShadow: "0 0 6px rgba(255,255,255,0.7)",
            }}
          >
            CYAN
          </span>
        </div>
      );

    case "hormozi_bold":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wider uppercase select-none ${
            compact ? "text-[10px]" : "text-[11.5px]"
          }`}
          style={{ fontFamily: "'Anton', 'Impact', sans-serif" }}
        >
          <span
            className="text-[#FFD700]"
            style={{
              WebkitTextStroke: "1px #000000",
              textShadow:
                "-1.2px -1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px 1.2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
            }}
          >
            HORMOZI
          </span>
          <span
            className="text-white text-[9px]"
            style={{
              WebkitTextStroke: "0.8px #000000",
              textShadow:
                "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            BOLD
          </span>
        </div>
      );

    case "clean_white":
    default:
      return (
        <div
          className={`flex items-center justify-center gap-1 font-extrabold tracking-wider uppercase select-none ${
            compact ? "text-[10.5px]" : "text-xs"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <span
            className="text-white"
            style={{
              textShadow: "0 2px 5px rgba(0,0,0,0.95)",
            }}
          >
            CLEAN WHITE
          </span>
        </div>
      );
  }
};

interface SubtitleStyleCardProps {
  preset: SubtitlePresetItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  compact?: boolean;
}

export const SubtitleStyleCard: React.FC<SubtitleStyleCardProps> = ({
  preset,
  isSelected,
  onSelect,
  compact = false,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(preset.id)}
      className={`group relative flex flex-col items-center justify-between rounded-xl border transition-all duration-200 cursor-pointer select-none text-left ${
        compact
          ? "p-2 min-h-[66px]"
          : "p-3 min-h-[76px] sm:min-h-[82px]"
      } ${
        isSelected
          ? "bg-[#00e676]/10 border-[#00e676] ring-1 ring-[#00e676]/40 shadow-[0_0_16px_rgba(0,230,118,0.22)]"
          : "bg-[#0E1015] border-white/[0.08] hover:border-white/[0.22] hover:bg-[#151720]"
      }`}
    >
      {/* Visual Rendered Subtitle Preview */}
      <div className="flex-1 flex items-center justify-center w-full py-1">
        <SubtitlePreviewSnippet styleId={preset.id} compact={compact} />
      </div>

      {/* Clean Style Label & Badge */}
      <div className="w-full flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span
          className={`text-[9.5px] font-bold tracking-tight truncate transition-colors ${
            isSelected
              ? "text-[#00e676]"
              : "text-gray-400 group-hover:text-gray-200"
          }`}
        >
          {preset.name}
        </span>
        <span
          className={`text-[7.5px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ${
            isSelected
              ? "bg-[#00e676]/20 text-[#00e676]"
              : "bg-white/[0.05] text-gray-400"
          }`}
        >
          {preset.badge}
        </span>
      </div>

      {/* Active Checkmark Pill */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#00e676] text-black flex items-center justify-center shadow-md">
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </div>
      )}
    </button>
  );
};
