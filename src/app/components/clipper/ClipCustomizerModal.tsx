import React, { useState } from "react";
import { X, Sparkles, Sliders, Type, Play, Check, RefreshCw, Zap, MoveVertical, Eye, Layers } from "lucide-react";
import type { ClipMetadata } from "./types";

interface ClipCustomizerModalProps {
  clip: ClipMetadata | null;
  isOpen: boolean;
  onClose: () => void;
  onClipUpdated?: (updatedClip: ClipMetadata) => void;
}

const CAPTION_PRESETS = [
  { id: "capcut_yellow", name: "Viral Yellow", color: "#FFE600", bg: "bg-amber-400/20 text-amber-300 border-amber-400/40" },
  { id: "opus_green", name: "Neon Emerald", color: "#00FF66", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" },
  { id: "neon_cyan", name: "Electric Cyan", color: "#00F0FF", bg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40" },
  { id: "fire_red", name: "Fire Red", color: "#FF3C3C", bg: "bg-red-500/20 text-red-300 border-red-400/40" },
  { id: "sigma_pink", name: "Sigma Pink", color: "#FF4D94", bg: "bg-pink-500/20 text-pink-300 border-pink-400/40" },
  { id: "capcut_banner", name: "Black Banner", color: "#FFFFFF", bg: "bg-white/10 text-white border-white/20" },
  { id: "clean_white", name: "Clean White", color: "#FFFFFF", bg: "bg-gray-500/20 text-gray-200 border-gray-400/40" },
];

export const ClipCustomizerModal: React.FC<ClipCustomizerModalProps> = ({
  clip,
  isOpen,
  onClose,
  onClipUpdated,
}) => {
  if (!isOpen || !clip) return null;

  const initialWords = React.useMemo(() => {
    const rawText = clip.title || "VIRAL VIDEO HIGHLIGHT";
    return rawText.split(/\s+/).map((w, idx) => ({
      id: idx,
      word: w.toUpperCase(),
      start: idx * 0.4,
      end: (idx + 1) * 0.4,
    }));
  }, [clip]);

  const [words, setWords] = useState(initialWords);
  const [selectedStyle, setSelectedStyle] = useState<string>("capcut_yellow");
  const [captionYPct, setCaptionYPct] = useState<number>(0.63);
  const [dynamicPunchIn, setDynamicPunchIn] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<string>("");
  const [previewSrc, setPreviewSrc] = useState<string>(
    clip.url || (clip.path ? `local:///${clip.path}` : "")
  );

  const handleWordChange = (idx: number, newWord: string) => {
    const updated = [...words];
    updated[idx].word = newWord.toUpperCase();
    setWords(updated);
  };

  const handleReRender = async () => {
    if (!clip.path) return;
    setIsRendering(true);
    setRenderProgress("Applying custom captions and rendering video...");

    try {
      const resp = await fetch("http://127.0.0.1:8000/api/re_render_clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clip_path: clip.path,
          words: words.map((w) => ({ word: w.word, start: w.start, end: w.end })),
          caption_style: selectedStyle,
          caption_y_pct: captionYPct,
          dynamic_punch_in: dynamicPunchIn,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Server returned status ${resp.status}`);
      }

      const data = await resp.json();
      if (data.status === "success" && data.path) {
        const newLocalSrc = `local:///${data.path}?t=${Date.now()}`;
        setPreviewSrc(newLocalSrc);
        const updatedMetadata: ClipMetadata = {
          ...clip,
          path: data.path,
          filename: data.filename,
          size_mb: data.size_mb,
          url: newLocalSrc,
        };
        if (onClipUpdated) {
          onClipUpdated(updatedMetadata);
        }
        setRenderProgress("🎉 Clip successfully updated!");
        setTimeout(() => {
          setIsRendering(false);
          setRenderProgress("");
        }, 1500);
      }
    } catch (err: any) {
      console.error("Re-render error:", err);
      setRenderProgress(`❌ Re-render failed: ${err.message || "Error"}`);
      setTimeout(() => setIsRendering(false), 3000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f11] border border-white/15 rounded-3xl p-6 max-w-5xl w-full flex flex-col lg:flex-row gap-6 shadow-2xl relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 9:16 Video Player Preview */}
        <div className="w-full lg:w-80 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-inner shrink-0 relative flex items-center justify-center">
          <video
            key={previewSrc}
            src={previewSrc}
            autoPlay
            loop
            controls
            playsInline
            className="w-full h-full object-contain bg-black"
          />

          {isRendering && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-bold text-white leading-relaxed">{renderProgress}</p>
            </div>
          )}
        </div>

        {/* Editor Controls & Transcript Inspector */}
        <div className="flex-1 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Live Caption & Framing Studio
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">Customize Clip #{clip.id || 1}</h2>
            <p className="text-xs text-gray-400">
              Click any word below to correct typos or slang, pick a high-impact style, and re-bake instantly.
            </p>

            {/* 1. Click-to-Edit Words */}
            <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-amber-400" /> Click to Edit Words in Transcript:
                </label>
                <span className="text-[10px] text-gray-400 font-mono">{words.length} words</span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {words.map((w, idx) => (
                  <div key={w.id} className="relative group">
                    <input
                      type="text"
                      value={w.word}
                      onChange={(e) => handleWordChange(idx, e.target.value)}
                      className="px-2.5 py-1 text-xs font-black rounded-lg bg-black/60 border border-white/20 text-amber-300 hover:border-amber-400 focus:border-amber-400 focus:bg-black focus:outline-none transition-all w-24 text-center font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Caption Style Presets */}
            <div className="mt-4 space-y-2">
              <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Viral Caption Style:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {CAPTION_PRESETS.map((preset) => {
                  const isSelected = selectedStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setSelectedStyle(preset.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border text-center transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? `${preset.bg} ring-2 ring-amber-400/50 scale-[1.02]`
                          : "bg-black/40 border-white/10 text-gray-400 hover:text-white hover:border-white/25"
                      }`}
                    >
                      <span className="truncate">{preset.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 ml-1.5"
                        style={{ backgroundColor: preset.color }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Framing & Position Controls */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vertical Position Slider */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                    <MoveVertical className="w-3.5 h-3.5 text-amber-400" /> Vertical Position:
                  </label>
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    {Math.round(captionYPct * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.45}
                  max={0.80}
                  step={0.01}
                  value={captionYPct}
                  onChange={(e) => setCaptionYPct(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>Chest (45%)</span>
                  <span>Eye Level (63%)</span>
                  <span>Bottom (80%)</span>
                </div>
              </div>

              {/* Dynamic Zoom Punch-in Toggle */}
              <div
                onClick={() => setDynamicPunchIn(!dynamicPunchIn)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  dynamicPunchIn
                    ? "bg-amber-400/10 border-amber-400/40 text-white"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Energy Punch-Ins (1.12x)
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Automatically zoom on punchlines for TikTok retention
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    dynamicPunchIn
                      ? "bg-amber-400 border-amber-400 text-black font-bold"
                      : "border-white/20 bg-black/40"
                  }`}
                >
                  {dynamicPunchIn && <Check className="w-3.5 h-3.5" />}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleReRender}
              disabled={isRendering}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isRendering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rendering Updates...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Re-Render & Apply Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
