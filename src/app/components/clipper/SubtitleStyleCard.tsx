import React, { useState, useEffect } from "react";
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
  {
    id: "capcut_banner",
    name: "Dark Banner",
    badge: "BANNER",
    color: "#FFE600",
    desc: "High-contrast rounded black backdrop pill with gold karaoke word highlight",
  },
  {
    id: "glitch_purple",
    name: "Cyber Violet",
    badge: "GLITCH",
    color: "#D946EF",
    desc: "Electric neon violet & magenta bloom glow for gaming & futuristic reels",
  },
  {
    id: "fire_orange",
    name: "Flame Punch",
    badge: "HEAT",
    color: "#FF5722",
    desc: "Blazing sunset flame orange glow for intense reaction & workout shorts",
  },
  {
    id: "ocean_blue",
    name: "Ocean Wave",
    badge: "AQUA",
    color: "#00A3FF",
    desc: "Deep aquatic royal blue glow for podcast storytelling & commentary",
  },
  {
    id: "beast_yellow",
    name: "Thunder Beast",
    badge: "BEAST",
    color: "#FFDE00",
    desc: "Explosive ultra-bold all-caps yellow with thick black stroke and punch",
  },
  {
    id: "purple_box",
    name: "Purple Box",
    badge: "BOX",
    color: "#8B5CF6",
    desc: "Stacked 2-line text with vibrant purple pill badge around the active word",
  },
  {
    id: "duo_lime",
    name: "Lime Duo",
    badge: "DUO",
    color: "#A3E635",
    desc: "Punchy two-word high-contrast layout with neon lime active highlight",
  },
  {
    id: "single_word",
    name: "Single Pop",
    badge: "POP",
    color: "#FFFFFF",
    desc: "Single word minimal lowercase pop with cinematic drop shadow",
  },
];

export const SubtitlePreviewSnippet: React.FC<{
  styleId: string;
  compact?: boolean;
  isHovered?: boolean;
}> = ({ styleId, compact = false, isHovered = false }) => {
  const [animStep, setAnimStep] = useState(0);

  useEffect(() => {
    if (!isHovered) {
      setAnimStep(0);
      return;
    }
    const interval = setInterval(() => {
      setAnimStep((prev) => (prev + 1) % 3);
    }, 600);
    return () => clearInterval(interval);
  }, [isHovered]);

  const fontSans = { fontFamily: "'Montserrat', sans-serif" };
  const fontAnton = { fontFamily: "'Anton', 'Impact', sans-serif" };

  switch (styleId) {
    case "opus_green":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wide uppercase select-none transition-transform duration-200 ${
            compact ? "text-[11px]" : "text-xs sm:text-[13px]"
          }`}
          style={fontSans}
        >
          <span
            className={`transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-110 text-[#00FF66]" : "text-white"
            }`}
            style={{
              textShadow:
                isHovered && animStep === 0
                  ? "0 0 10px #00FF66, 0 0 20px rgba(0,255,102,0.9)"
                  : "0 0 6px rgba(255,255,255,0.7)",
            }}
          >
            THE
          </span>
          <span
            className={`transition-all duration-200 ${
              isHovered && animStep === 1
                ? "scale-115 text-white"
                : "text-[#00FF66]"
            }`}
            style={{
              textShadow:
                isHovered && animStep === 1
                  ? "0 0 12px #fff, 0 0 24px rgba(255,255,255,0.9)"
                  : "0 0 8px #00FF66, 0 0 18px rgba(0,255,102,0.85), 0 0 28px rgba(0,255,102,0.5)",
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
          style={fontSans}
        >
          <span
            className={`leading-none mb-0.5 filter drop-shadow transition-transform duration-200 ${
              compact ? "text-xs" : "text-sm"
            } ${isHovered ? "animate-bounce scale-125" : ""}`}
          >
            🤩
          </span>
          <span
            className={`text-[#FF3C30] transition-all duration-200 ${
              isHovered ? "scale-110" : ""
            }`}
            style={{
              textShadow:
                isHovered
                  ? "0 0 14px #FF3C30, 0 0 28px rgba(255,60,48,0.95), 0 0 38px #FF3C30"
                  : "0 0 8px #FF3C30, 0 0 20px rgba(255,60,48,0.85)",
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
          style={fontSans}
        >
          <span
            className={`text-[#FFE600] transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115 text-white" : ""
            }`}
            style={{
              textShadow:
                isHovered && animStep === 0
                  ? "0 0 12px #fff, 0 0 20px rgba(255,255,255,0.9)"
                  : "0 0 8px #FFE600, 0 0 16px rgba(255,230,0,0.8)",
            }}
          >
            THE
          </span>
          <span
            className={`text-white transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115 text-[#FFE600]" : ""
            }`}
            style={{
              textShadow:
                isHovered && animStep === 1
                  ? "0 0 12px #FFE600, 0 0 20px rgba(255,230,0,0.9)"
                  : "0 0 6px rgba(255,255,255,0.8)",
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
          style={fontSans}
        >
          <span
            className={`text-[#00FF66] font-extrabold transition-all duration-200 ${
              isHovered ? "scale-115" : ""
            }`}
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
          style={fontSans}
        >
          <span
            className={`text-[#00F0FF] transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115" : ""
            }`}
            style={{
              textShadow: "0 0 8px #00F0FF, 0 0 18px rgba(0,240,255,0.85)",
            }}
          >
            ELECTRIC
          </span>
          <span
            className={`text-white text-[9px] transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115 text-[#00F0FF]" : ""
            }`}
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
          style={fontAnton}
        >
          <span
            className={`text-[#FFD700] transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115" : ""
            }`}
            style={{
              WebkitTextStroke: "1px #000000",
              textShadow:
                "-1.2px -1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px 1.2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
            }}
          >
            HORMOZI
          </span>
          <span
            className={`text-white text-[9px] transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115" : ""
            }`}
            style={{
              WebkitTextStroke: "0.8px #000000",
              textShadow:
                "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            PUNCH
          </span>
        </div>
      );

    case "clean_white":
      return (
        <div
          className={`flex flex-col items-center justify-center w-full text-center font-black tracking-wider uppercase select-none leading-tight gap-0.5 ${
            compact ? "text-[10px]" : "text-[11.5px]"
          }`}
          style={fontSans}
        >
          <span
            className={`transition-all duration-200 block text-center w-full ${
              isHovered && animStep === 0
                ? "scale-115 text-white drop-shadow-[0_0_10px_rgba(255,255,255,1)]"
                : isHovered
                ? "text-white/50"
                : "text-white"
            }`}
            style={{
              textShadow:
                isHovered && animStep === 0
                  ? "0 0 12px rgba(255,255,255,1), 0 2px 6px rgba(0,0,0,0.95)"
                  : "0 2px 5px rgba(0,0,0,0.95)",
            }}
          >
            CLEAN
          </span>
          <span
            className={`transition-all duration-200 block text-center w-full ${
              isHovered && animStep === 1
                ? "scale-115 text-white drop-shadow-[0_0_10px_rgba(255,255,255,1)]"
                : isHovered
                ? "text-white/50"
                : "text-white"
            }`}
            style={{
              textShadow:
                isHovered && animStep === 1
                  ? "0 0 12px rgba(255,255,255,1), 0 2px 6px rgba(0,0,0,0.95)"
                  : "0 2px 5px rgba(0,0,0,0.95)",
            }}
          >
            WHITE
          </span>
        </div>
      );

    case "capcut_banner":
      return (
        <div className="flex items-center justify-center select-none px-2 py-0.5 rounded-md bg-black/80 border border-white/10 shadow-sm" style={fontAnton}>
          <span
            className={`text-white mr-1 text-[10px] font-black transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-110 text-yellow-300" : ""
            }`}
          >
            DARK
          </span>
          <span
            className={`px-1 py-0.2 rounded font-black text-[10px] transition-all duration-200 ${
              isHovered && animStep === 1 ? "bg-white text-black scale-110" : "bg-[#FFE600] text-black"
            }`}
          >
            BANNER
          </span>
        </div>
      );

    case "glitch_purple":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wide uppercase select-none ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={fontSans}
        >
          <span
            className={`text-white transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115 text-[#D946EF]" : ""
            }`}
            style={{
              textShadow: "0 0 6px rgba(255,255,255,0.7)",
            }}
          >
            CYBER
          </span>
          <span
            className={`text-[#D946EF] transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115 text-white" : ""
            }`}
            style={{
              textShadow: "0 0 10px #D946EF, 0 0 22px rgba(217,70,239,0.85)",
            }}
          >
            VIOLET
          </span>
        </div>
      );

    case "fire_orange":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wide uppercase select-none ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={fontSans}
        >
          <span
            className={`text-[#FFE600] transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115 text-white" : ""
            }`}
            style={{
              textShadow: "0 0 8px #FFE600, 0 0 16px rgba(255,230,0,0.8)",
            }}
          >
            FLAME
          </span>
          <span
            className={`text-[#FF5722] transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115 text-[#FFE600]" : ""
            }`}
            style={{
              textShadow: "0 0 10px #FF5722, 0 0 24px rgba(255,87,34,0.9)",
            }}
          >
            PUNCH
          </span>
        </div>
      );

    case "ocean_blue":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-wide uppercase select-none ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={fontSans}
        >
          <span
            className={`text-white transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115 text-[#00A3FF]" : ""
            }`}
            style={{
              textShadow: "0 0 6px rgba(255,255,255,0.7)",
            }}
          >
            OCEAN
          </span>
          <span
            className={`text-[#00A3FF] transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115 text-white" : ""
            }`}
            style={{
              textShadow: "0 0 10px #00A3FF, 0 0 22px rgba(0,163,255,0.85)",
            }}
          >
            WAVE
          </span>
        </div>
      );

    case "beast_yellow":
      return (
        <div
          className={`flex items-center justify-center gap-1 font-black tracking-tight uppercase select-none ${
            compact ? "text-[10px]" : "text-xs"
          }`}
          style={fontSans}
        >
          <span
            className={`text-white transition-all duration-200 ${
              isHovered && animStep === 0 ? "scale-115 text-[#FFDE00]" : ""
            }`}
            style={{
              WebkitTextStroke: "1px #000000",
              textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            THUNDER
          </span>
          <span
            className={`text-[#FFDE00] transition-all duration-200 ${
              isHovered && animStep === 1 ? "scale-115 text-white" : ""
            }`}
            style={{
              WebkitTextStroke: "1.2px #000000",
              textShadow: "-1.2px -1.2px 0 #000, 1.2px -1.2px 0 #000, -1.2px 1.2px 0 #000, 1.2px 1.2px 0 #000",
            }}
          >
            BEAST
          </span>
        </div>
      );

    case "purple_box":
      return (
        <div
          className={`flex flex-col items-center justify-center w-full text-center select-none font-black tracking-wide uppercase leading-tight ${
            compact ? "text-[8.5px]" : "text-[10px]"
          }`}
          style={fontSans}
        >
          <span
            className={`transition-all duration-200 drop-shadow-md text-center w-full ${
              isHovered && animStep === 0 ? "scale-110 text-[#C4B5FD]" : "text-white"
            }`}
            style={{
              WebkitTextStroke: "0.8px #000",
              textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            THE QUICK
          </span>
          <div className="flex items-center justify-center gap-1 mt-0.5 w-full">
            <span
              className={`transition-all duration-200 drop-shadow-md ${
                isHovered && animStep === 1 ? "scale-110 text-[#C4B5FD]" : "text-white"
              }`}
              style={{
                WebkitTextStroke: "0.8px #000",
                textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
              }}
            >
              BROWN
            </span>
            <span
              className={`bg-[#8B5CF6] text-white px-1.5 py-0.5 rounded-[4px] shadow-lg transition-transform duration-200 ${
                isHovered && animStep === 2
                  ? "scale-115 shadow-[0_0_12px_#8B5CF6]"
                  : isHovered
                  ? "scale-105"
                  : ""
              }`}
              style={{
                WebkitTextStroke: "0.6px #000",
                textShadow: "-0.8px -0.8px 0 #000, 0.8px -0.8px 0 #000, -0.8px 0.8px 0 #000, 0.8px 0.8px 0 #000",
              }}
            >
              FOX
            </span>
          </div>
        </div>
      );

    case "duo_lime":
      return (
        <div
          className={`flex items-center justify-center w-full text-center gap-1.5 select-none font-black tracking-tight uppercase ${
            compact ? "text-[11px]" : "text-[13px]"
          }`}
          style={fontSans}
        >
          <span
            className={`transition-all duration-200 ${
              isHovered && animStep === 0
                ? "scale-115 text-[#A3E635]"
                : "text-white"
            }`}
            style={{
              WebkitTextStroke: "1px #000",
              textShadow:
                isHovered && animStep === 0
                  ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px rgba(163,230,53,0.8)"
                  : "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.8)",
            }}
          >
            BROWN
          </span>
          <span
            className={`transition-all duration-200 ${
              isHovered && animStep === 1
                ? "scale-115 text-[#A3E635]"
                : isHovered && animStep === 0
                ? "text-white"
                : "text-[#A3E635]"
            }`}
            style={{
              WebkitTextStroke: "1px #000",
              textShadow:
                isHovered && animStep === 1
                  ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 14px rgba(163,230,53,0.9)"
                  : "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 10px rgba(163,230,53,0.5)",
            }}
          >
            FOX
          </span>
        </div>
      );

    case "single_word": {
      const words = ["quick", "brown", "fox"];
      const currentWord = isHovered ? words[animStep % words.length] : "fox";
      return (
        <div
          className={`flex items-center justify-center w-full text-center select-none font-black lowercase tracking-tight ${
            compact ? "text-[12px]" : "text-[15px]"
          }`}
          style={fontSans}
        >
          <span
            key={currentWord}
            className={`text-white transition-all duration-200 ${
              isHovered ? "scale-115 text-emerald-300 drop-shadow-[0_0_10px_rgba(0,230,118,0.8)]" : ""
            }`}
            style={{
              WebkitTextStroke: "0.8px #000",
              textShadow: "0 2px 8px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            }}
          >
            {currentWord}
          </span>
        </div>
      );
    }

    default:
      return null;
  }
};

interface SubtitleStyleCardProps {
  preset: SubtitlePresetItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
  compact?: boolean;
}

export const SubtitleStyleCard: React.FC<SubtitleStyleCardProps> = ({
  preset,
  isSelected,
  onSelect,
  onHover,
  compact = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(preset.id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null);
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(preset.id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex flex-col items-center justify-between rounded-xl border transition-all duration-200 cursor-pointer select-none text-left ${
        compact ? "p-2 min-h-[68px]" : "p-3 min-h-[78px] sm:min-h-[84px]"
      } ${
        isSelected
          ? "bg-[#00e676]/10 border-[#00e676] ring-1 ring-[#00e676]/40 shadow-[0_0_16px_rgba(0,230,118,0.22)]"
          : isHovered
          ? "bg-[#151720] border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] scale-[1.02]"
          : "bg-[#0E1015] border-white/[0.08] hover:border-white/[0.22] hover:bg-[#151720]"
      }`}
    >
      {/* Visual Rendered Subtitle Preview with Live Karaoke Animation on Hover */}
      <div className="flex-1 flex items-center justify-center w-full py-1">
        <SubtitlePreviewSnippet styleId={preset.id} compact={compact} isHovered={isHovered} />
      </div>

      {/* Clean Style Label & Badge */}
      <div className="w-full flex items-center justify-between pt-1 border-t border-white/[0.04]">
        <span
          className={`text-[9.5px] font-bold tracking-tight truncate transition-colors ${
            isSelected
              ? "text-[#00e676]"
              : isHovered
              ? "text-white"
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

      {/* Live Hover Pulse Indicator */}
      {isHovered && !isSelected && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF] animate-ping" />
      )}
    </button>
  );
};
