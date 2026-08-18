import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { Crop, LayoutTemplate, Smartphone, Tablet, Laptop, SkipBack, Play, Pause, SkipForward, Trash2, ZoomOut, Maximize2 } from 'lucide-react';
import { useEditor } from '../hooks/EditorContext';
import { useAudioSync } from '../hooks/useAudioSync';
import { buildFilterCSS, buildTransformCSS, MEDIA_LIBRARY, G, fmt } from '../../../utils/types';

export function PreviewPlayer({ drawFrame }: { drawFrame: () => void }) {
  const {
    currentState,
    showCropBoxes, setShowCropBoxes,
    layoutMode, setLayoutMode,
    showDevicePreview, setShowDevicePreview,
    previewDevice, setPreviewDevice,
    isFullScreen, setIsFullScreen,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    totalDuration,
    updateVideoClip,
    selectedId,
    deleteSelected,
  } = useEditor();

  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const activeVideoClips = useAudioSync();
  const activeVideoClip = activeVideoClips[0] || (currentState?.clips ? currentState.clips.find((c: any) => c.id === selectedId) || currentState.clips[0] : undefined);
  const topCrop = activeVideoClip?.cropTop ?? { x: 20, y: 10, width: 200, height: 200 };
  const middleCrop = activeVideoClip?.cropMiddle ?? { x: 20, y: 130, width: 200, height: 200 };
  const bottomCrop = activeVideoClip?.cropBottom ?? { x: 20, y: 250, width: 200, height: 200 };

  const panelBg = "rgba(8,8,8,0.95)";
  const panelBorder = "rgba(255,255,255,0.06)";

  const getDeviceSize = () => {
    if (!showDevicePreview) return { width: undefined, height: undefined };
    if (previewDevice === "tablet") return { width: 280, height: 350 };
    if (previewDevice === "laptop") return { width: 340, height: 220 };
    return { width: 210, height: 370 }; // phone default: 100% fits within canvas height
  };

  const getVideoSrc = (clip: any) => {
    if (!clip || !clip.url) return "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    
    return clip.url;
  };

  const deviceSize = getDeviceSize();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Controls Row */}
      <div
        className="h-12 flex items-center justify-between px-6 flex-shrink-0"
        style={{ background: "#030303", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* Left side: Hide Crops */}
        <div>
          <button
            onClick={() => setShowCropBoxes(!showCropBoxes)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
            style={{
              background: showCropBoxes ? "rgba(0,230,118,0.12)" : "rgba(0,0,0,0.7)",
              color: showCropBoxes ? G : "#888",
              border: `1px solid ${showCropBoxes ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <Crop className="w-3.5 h-3.5" />
            {showCropBoxes ? "Hide Crops" : "Show Crops"}
          </button>
        </div>

        {/* Right side: Layout & Device Preview Switcher */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowLayoutPanel(!showLayoutPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
            style={{
              background: showLayoutPanel ? "rgba(0,230,118,0.12)" : "rgba(0,0,0,0.7)",
              color: showLayoutPanel ? G : "#aaa",
              border: `1px solid ${showLayoutPanel ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
            Layout: <span className="capitalize">{layoutMode}</span>
          </button>

          {/* Device Toggle Button */}
          <button
            onClick={() => setShowDevicePreview(!showDevicePreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
            style={{
              background: showDevicePreview ? "rgba(0,230,118,0.12)" : "rgba(0,0,0,0.7)",
              color: showDevicePreview ? G : "#aaa",
              border: `1px solid ${showDevicePreview ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.1)"}`,
              backdropFilter: "blur(8px)",
            }}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Device View: <span className="capitalize">{showDevicePreview ? "On" : "Off"}</span>
          </button>

          {/* Device Type Selector (Phone, Tablet, Laptop) - Always Interactive */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              onClick={() => {
                setShowDevicePreview(true);
                setPreviewDevice("phone");
              }}
              title="Phone Mockup (9:16)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                showDevicePreview && previewDevice === "phone"
                  ? "bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 shadow-[0_0_10px_rgba(0,230,118,0.3)]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Smartphone className="w-3 h-3" /> Phone
            </button>
            <button
              onClick={() => {
                setShowDevicePreview(true);
                setPreviewDevice("tablet");
              }}
              title="Tablet Mockup (4:3)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                showDevicePreview && previewDevice === "tablet"
                  ? "bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 shadow-[0_0_10px_rgba(0,230,118,0.3)]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Tablet className="w-3 h-3" /> Tablet
            </button>
            <button
              onClick={() => {
                setShowDevicePreview(true);
                setPreviewDevice("laptop");
              }}
              title="Laptop Mockup (16:9)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                showDevicePreview && previewDevice === "laptop"
                  ? "bg-[#00e676]/20 text-[#00e676] border border-[#00e676]/40 shadow-[0_0_10px_rgba(0,230,118,0.3)]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Laptop className="w-3 h-3" /> Laptop
            </button>
          </div>

          {showLayoutPanel && (
            <div
              className="absolute top-10 right-0 rounded-xl p-1.5 shadow-2xl z-50"
              style={{
                background: "rgba(10,10,10,0.97)",
                border: "1px solid rgba(255,255,255,0.09)",
                backdropFilter: "blur(12px)",
                minWidth: 160,
              }}
            >
              {[
                { id: "vertical", label: "Vertical (9:16)" },
                { id: "split", label: "Split Screen" },
                { id: "trio", label: "Trio (3 panels)" },
                { id: "spotlight", label: "Spotlight" },
                { id: "centered", label: "Centered" },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setLayoutMode(m.id);
                    setShowLayoutPanel(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs transition-colors hover:bg-white/5"
                  style={{ color: layoutMode === m.id ? G : "#ccc" }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-[#040404] gap-6 overflow-hidden">
          {/* FIXED LEFT SIDE: High-Contrast Device Result View (Phone / Tablet / Laptop Mockup) */}
          {showDevicePreview && (
            <div className="flex flex-col items-center justify-center flex-shrink-0 z-20 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-200 shadow-md">
                <Smartphone className="w-3.5 h-3.5 text-[#00e676]" />
                <span className="capitalize">{previewDevice} Result View</span>
              </div>

              <div
                className="relative flex flex-col items-center justify-center overflow-hidden transition-all duration-300 shadow-[0_0_50px_rgba(0,230,118,0.3)]"
                style={{
                  width: deviceSize.width || 250,
                  height: deviceSize.height || 480,
                  borderRadius: previewDevice === "laptop" ? 18 : 36,
                  background: "#0c0c0c",
                  border: "4px solid rgba(0,230,118,0.5)",
                }}
              >
                {/* Device Camera Notch / Speaker Grill */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-50 flex items-center justify-center border border-white/20 shadow-md pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30 mr-1.5" />
                  <div className="w-6 h-1 rounded-full bg-white/20" />
                </div>

                {/* Device Screen Live Mirror Output */}
                {activeVideoClip ? (
                  <video
                    id={`videoPlayer_${activeVideoClip.id}`}
                    src={getVideoSrc(activeVideoClip)}
                    className="w-full h-full object-cover"
                    preload="auto"
                    playsInline
                    style={{
                      filter: buildFilterCSS(activeVideoClip),
                      transform: buildTransformCSS(activeVideoClip),
                      opacity: activeVideoClip.opacity / 100,
                    }}
                  />
                ) : (
                  <div className="text-center p-6">
                    <p className="text-xs font-bold text-gray-400 mb-1">No Video Selected</p>
                    <p className="text-[10px] text-gray-500">Live device output result</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MAIN RIGHT STAGE: Full Video Container & Real-Time Editor Stage */}
          <div
            className="flex-1 h-full relative flex items-center justify-center shadow-2xl overflow-hidden rounded-2xl"
            style={{
              background: "#080808",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {activeVideoClip ? (
              <video
                id={`videoPlayer_main_${activeVideoClip.id}`}
                src={getVideoSrc(activeVideoClip)}
                className="w-full h-full object-cover"
                preload="auto"
                playsInline
                style={{
                  filter: buildFilterCSS(activeVideoClip),
                  transform: buildTransformCSS(activeVideoClip),
                  opacity: activeVideoClip.opacity / 100,
                }}
              />
            ) : (
              <div className="text-center p-6">
                <p className="text-xs text-gray-500 mb-1">No Video Selected</p>
                <p className="text-[10px] text-gray-600">Drag media onto the timeline to preview and edit</p>
              </div>
            )}

            {/* Top Crop */}
            {showCropBoxes && (
              <Rnd
                key={isFullScreen ? "fs" : "inline"}
                disableDragging={false}
                enableResizing={true}
                dragAxis="both"
                bounds="parent"
                lockAspectRatio={layoutMode === "vertical" ? 9 / 16 : false}
                size={{ width: topCrop.width, height: topCrop.height }}
                position={{ x: topCrop.x, y: topCrop.y }}
                onDragStop={(e, d) =>
                  activeVideoClip &&
                  updateVideoClip(activeVideoClip.id, { cropTop: { ...topCrop, x: d.x, y: d.y } })
                }
                onResizeStop={(e, dir, ref, delta, pos) =>
                  activeVideoClip &&
                  updateVideoClip(activeVideoClip.id, {
                    cropTop: { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), ...pos },
                  })
                }
                className="border-2 border-[#00e676] bg-[#00e676]/20 z-50 shadow-[0_0_15px_rgba(0,230,118,0.5)]"
              >
                <div className="absolute top-0 left-0 bg-[#00e676] text-black text-[10px] px-1 font-bold">
                  TOP CROP
                </div>
              </Rnd>
            )}

            {/* Middle Crop */}
            {showCropBoxes && layoutMode === "trio" && (
              <Rnd
                key={isFullScreen ? "fs" : "inline"}
                bounds="parent"
                size={{ width: middleCrop.width, height: middleCrop.height }}
                position={{ x: middleCrop.x, y: middleCrop.y }}
                onDragStop={(e, d) =>
                  activeVideoClip &&
                  updateVideoClip(activeVideoClip.id, { cropMiddle: { ...middleCrop, x: d.x, y: d.y } })
                }
                onResizeStop={(_e, _dir, ref, _delta, pos) =>
                  activeVideoClip &&
                  updateVideoClip(activeVideoClip.id, {
                    cropMiddle: { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), ...pos },
                  })
                }
                className="border-2 border-amber-400 bg-amber-400/20 z-50 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
              >
                <div className="absolute top-0 left-0 bg-amber-400 text-black text-[10px] px-1 font-bold">
                  MIDDLE CROP
                </div>
              </Rnd>
            )}

            {/* Bottom Crop */}
            {showCropBoxes && (layoutMode === "split" || layoutMode === "trio") && (
              <Rnd
                key={isFullScreen ? "fs" : "inline"}
                bounds="parent"
                size={{ width: bottomCrop.width, height: bottomCrop.height }}
                position={{ x: bottomCrop.x, y: bottomCrop.y }}
                onDragStop={(e, d) =>
                  activeVideoClip &&
                  updateVideoClip(activeVideoClip.id, { cropBottom: { ...bottomCrop, x: d.x, y: d.y } })
                }
                onResizeStop={(e, dir, ref, delta, pos) =>
                  activeVideoClip &&
                  updateVideoClip(activeVideoClip.id, {
                    cropBottom: { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), ...pos },
                  })
                }
                className="border-2 border-purple-500 bg-purple-500/20 z-50 shadow-[0_0_15px_rgba(168,85,247,0.5)]"
              >
                <div className="absolute top-0 left-0 bg-purple-500 text-white text-[10px] px-1 font-bold">
                  BOTTOM CROP
                </div>
              </Rnd>
            )}
          </div>
        </div>

      {/* Playback bar */}
      <div
        className="h-12 flex items-center justify-between px-4 flex-shrink-0"
        style={{ background: panelBg, borderTop: `1px solid ${panelBorder}` }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTime(0)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
            style={{ color: "#5a5a5a" }}
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.2)" }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" style={{ color: G }} />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" style={{ color: G }} />
            )}
          </button>
          <button
            onClick={() => setCurrentTime(totalDuration)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
            style={{ color: "#5a5a5a" }}
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono ml-2" style={{ color: "#5a5a5a" }}>
            {fmt(currentTime)} / {fmt(totalDuration)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
            style={{ color: "#5a5a5a" }}
          >
            {isFullScreen ? <ZoomOut className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
