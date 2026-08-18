import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { Crop, LayoutTemplate, Smartphone, Tablet, Laptop, SkipBack, Play, Pause, SkipForward, Trash2, ZoomOut, Maximize2 } from 'lucide-react';
import { useEditor } from '../hooks/EditorContext';
import { useAudioSync } from '../hooks/useAudioSync';
import { buildFilterCSS, buildTransformCSS, G, fmt } from '../../../utils/types';
import type { VideoClip, TextClip, CropBox } from '../../../utils/types';

export function PreviewPlayer() {
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
    updateTextClip,
    selectedId,
  } = useEditor();

  const STAGE_W = layoutMode === "vertical" ? 720 : 1280;
  const STAGE_H = layoutMode === "vertical" ? 1280 : 720;

  const hasMedia = (currentState?.clips?.length || 0) > 0 || (currentState?.audioClips?.length || 0) > 0 || (currentState?.textClips?.length || 0) > 0;

  const [viewportSize, setViewportSize] = useState({ w: 800, h: 450 });
  const viewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        setViewportSize({ w: entries[0].contentRect.width, h: entries[0].contentRect.height });
      }
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate the scale required to fit the Fixed Stage into the Viewport
  const stageScale = Math.min(
    (viewportSize.w - 32) / STAGE_W, // 32px for padding margin
    (viewportSize.h - 32) / STAGE_H
  );

  const activeVideoClips = useAudioSync();
  const activeVideoClip = activeVideoClips[0] || (currentState?.clips ? currentState.clips.find((c: any) => c.id === selectedId) || currentState.clips[0] : undefined);
  
  // Default crop boxes based on Fixed Stage Resolution
  const topCrop = activeVideoClip?.cropTop ?? { x: STAGE_W * 0.1, y: STAGE_H * 0.1, width: STAGE_W * 0.4, height: STAGE_H * 0.4 };
  const middleCrop = activeVideoClip?.cropMiddle ?? { x: STAGE_W * 0.5, y: STAGE_H * 0.1, width: STAGE_W * 0.4, height: STAGE_H * 0.4 };
  const bottomCrop = activeVideoClip?.cropBottom ?? { x: STAGE_W * 0.3, y: STAGE_H * 0.5, width: STAGE_W * 0.4, height: STAGE_H * 0.4 };

  const getDeviceSize = () => {
    if (!showDevicePreview) return { width: undefined, height: undefined };
    if (previewDevice === "tablet") return { width: 280, height: 350 };
    if (previewDevice === "laptop") return { width: 340, height: 220 };
    return { width: 210, height: 370 };
  };

  const getVideoSrc = (clip: any) => {
    if (!clip || !clip.url) return "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
    return clip.url;
  };

  const deviceSize = getDeviceSize();

  // Renders a sliced video fragment for the crop engine
  const renderSlicedVideo = (clip: VideoClip, crop: CropBox, heightPercent: string) => {
    const TW = deviceSize.width || 210;
    const TH = (deviceSize.height || 370) * (parseFloat(heightPercent) / 100);
    
    // Safety check to prevent divide by zero
    const safeCropW = Math.max(1, crop.width || 1);
    const safeCropH = Math.max(1, crop.height || 1);
    
    const scale = Math.max(TW / safeCropW, TH / safeCropH);
    const offsetX = (TW - safeCropW * scale) / 2;
    const offsetY = (TH - safeCropH * scale) / 2;

    const translateX = offsetX - (crop.x || 0) * scale;
    const translateY = offsetY - (crop.y || 0) * scale;

    return (
      <div className="relative overflow-hidden" style={{ width: '100%', height: heightPercent, borderBottom: '1px solid #111' }}>
          <div style={{
          position: 'absolute',
          width: `${STAGE_W}px`,
          height: `${STAGE_H}px`,
          transformOrigin: '0 0',
          transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`
        }}>
          <video 
            id={`videoPlayer_${clip.id}`}
            src={getVideoSrc(clip)}
            className="w-full h-full object-cover"
            playsInline
            preload="auto"
            style={{
              filter: buildFilterCSS(clip), 
              transform: buildTransformCSS(clip),
              opacity: (clip.opacity ?? 100) / 100,
              mixBlendMode: (clip.blendMode as any) || 'normal'
            }}
          />
        </div>
      </div>
    );
  };

  // Maps CSS animation classes based on TextClip properties and relative time
  const getTextAnimationClass = (clip: TextClip) => {
    const elapsed = currentTime - clip.startTime;
    const remaining = (clip.startTime + clip.duration) - currentTime;
    
    let animClass = "";
    if (elapsed < 0.5) { // In-animation (first 0.5s)
      if (clip.animIn === "Fade In") animClass = "animate-fadeIn";
      if (clip.animIn === "Zoom In") animClass = "animate-zoomIn";
      if (clip.animIn === "Slide Left") animClass = "animate-slideLeft";
      if (clip.animIn === "Bounce") animClass = "animate-bounceIn";
      if (clip.animIn === "Rotate In") animClass = "animate-rotateIn";
    } else if (remaining < 0.5) { // Out-animation (last 0.5s)
      if (clip.animOut === "Fade Out") animClass = "animate-fadeOut";
      if (clip.animOut === "Zoom Out") animClass = "animate-zoomOut";
      if (clip.animOut === "Slide Right") animClass = "animate-slideRight";
      if (clip.animOut === "Shrink") animClass = "animate-shrinkOut";
    }
    return animClass;
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100] bg-black' : ''}`}>
      {/* Top Controls Row */}
      {!isFullScreen && (
        <div className="h-12 flex items-center justify-between px-6 flex-shrink-0" style={{ background: "#030303", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <button onClick={() => setShowCropBoxes(!showCropBoxes)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer hover:bg-white/10 hover:text-white"
              style={{ background: showCropBoxes ? "rgba(0,230,118,0.12)" : "rgba(0,0,0,0.7)", color: showCropBoxes ? G : "#888", border: `1px solid ${showCropBoxes ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.1)"}` }}>
              <Crop className="w-3.5 h-3.5" /> {showCropBoxes ? "Hide Crops" : "Show Crops"}
            </button>
          </div>
          <div className="flex items-center gap-2 relative">
            <button onClick={() => setShowLayoutPanel(!showLayoutPanel)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: showLayoutPanel ? "rgba(0,230,118,0.12)" : "rgba(0,0,0,0.7)", color: showLayoutPanel ? G : "#aaa", border: `1px solid ${showLayoutPanel ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.1)"}` }}>
              <LayoutTemplate className="w-3.5 h-3.5" /> Layout: <span className="capitalize">{layoutMode}</span>
            </button>
            <button onClick={() => setShowDevicePreview(!showDevicePreview)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: showDevicePreview ? "rgba(0,230,118,0.12)" : "rgba(0,0,0,0.7)", color: showDevicePreview ? G : "#aaa", border: `1px solid ${showDevicePreview ? "rgba(0,230,118,0.35)" : "rgba(255,255,255,0.1)"}` }}>
              <Smartphone className="w-3.5 h-3.5" /> Device View: <span className="capitalize">{showDevicePreview ? "On" : "Off"}</span>
            </button>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {['phone', 'tablet', 'laptop'].map(d => (
                <button key={d} onClick={() => { setShowDevicePreview(true); setPreviewDevice(d as any); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold ${showDevicePreview && previewDevice === d ? "bg-[#00e676]/20 text-[#00e676]" : "text-gray-400 hover:text-white"}`}>
                  {d === 'phone' && <Smartphone className="w-3 h-3" />}
                  {d === 'tablet' && <Tablet className="w-3 h-3" />}
                  {d === 'laptop' && <Laptop className="w-3 h-3" />}
                  <span className="capitalize">{d}</span>
                </button>
              ))}
            </div>
            {showLayoutPanel && (
              <div className="absolute top-10 right-0 rounded-xl p-1.5 shadow-2xl z-50 bg-[#0a0a0a] border border-white/10 min-w-[160px]">
                {[{ id: "vertical", label: "Vertical (9:16)" }, { id: "split", label: "Split Screen" }, { id: "trio", label: "Trio (3 panels)" }, { id: "spotlight", label: "Spotlight" }, { id: "centered", label: "Centered" }].map(m => (
                  <button key={m.id} onClick={() => { setLayoutMode(m.id); setShowLayoutPanel(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-white/5" style={{ color: layoutMode === m.id ? G : "#ccc" }}>{m.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Preview Area */}
      <div className={`flex-1 relative flex items-center justify-center p-6 bg-[#040404] gap-6 overflow-hidden ${isFullScreen ? 'p-0' : ''}`}>
          
          {/* DEVICE PREVIEW ENGINE (CROP ENGINE EXECUTION) */}
          {showDevicePreview && !isFullScreen && (
            <div className="flex flex-col items-center justify-center flex-shrink-0 z-20 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-gray-200">
                <Smartphone className="w-3.5 h-3.5 text-[#00e676]" />
                <span className="capitalize">{previewDevice} Result View</span>
              </div>
              <div className="relative flex flex-col items-center justify-center overflow-hidden bg-[#0c0c0c] border-[4px] border-[#00e676]/50 shadow-[0_0_50px_rgba(0,230,118,0.3)]"
                style={{ width: deviceSize.width || 250, height: deviceSize.height || 480, borderRadius: previewDevice === "laptop" ? 18 : 36 }}>
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-50 flex items-center justify-center pointer-events-none">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/30 mr-1.5" /><div className="w-6 h-1 rounded-full bg-white/20" />
                </div>
                
                {activeVideoClip ? (
                  <div className="w-full h-full relative flex flex-col">
                    {layoutMode === "split" ? (
                      <>
                        {renderSlicedVideo(activeVideoClip, topCrop, "50%")}
                        {renderSlicedVideo(activeVideoClip, bottomCrop, "50%")}
                      </>
                    ) : layoutMode === "trio" ? (
                      <>
                        {renderSlicedVideo(activeVideoClip, topCrop, "33.33%")}
                        {renderSlicedVideo(activeVideoClip, middleCrop, "33.33%")}
                        {renderSlicedVideo(activeVideoClip, bottomCrop, "33.33%")}
                      </>
                    ) : (
                      renderSlicedVideo(activeVideoClip, topCrop, "100%")
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6"><p className="text-xs font-bold text-gray-400">No Video</p></div>
                )}
              </div>
            </div>
          )}

          {/* VIEWPORT & FIXED RESOLUTION STAGE */}
          <div ref={viewportRef} className="flex-1 h-full relative flex items-center justify-center overflow-hidden rounded-2xl bg-[#080808]">
            <div 
              className="relative bg-black shadow-2xl ring-1 ring-white/10"
              style={{
                width: `${STAGE_W}px`,
                height: `${STAGE_H}px`,
                transform: `scale(${stageScale})`,
                transformOrigin: 'center center'
              }}
            >
              {activeVideoClip ? (
                <>
                  <video
                    id={`videoPlayer_main_${activeVideoClip.id}`}
                    src={getVideoSrc(activeVideoClip)}
                    className="absolute inset-0 w-full h-full object-cover"
                    preload="auto"
                    playsInline
                    style={{ 
                      filter: buildFilterCSS(activeVideoClip), 
                      transform: buildTransformCSS(activeVideoClip), 
                      opacity: (activeVideoClip.opacity ?? 100) / 100,
                      mixBlendMode: (activeVideoClip.blendMode as any) || 'normal'
                    }}
                  />
                  
                  {/* DUAL STREAM AUDIO SUPPORT */}
                  {activeVideoClip.audioUrl && (
                    <audio
                      id={`audioPlayer_${activeVideoClip.id}`}
                      src={activeVideoClip.audioUrl}
                      preload="auto"
                      playsInline
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center w-full h-full"><p className="text-2xl font-bold text-gray-500">Drag media onto timeline</p></div>
              )}

              {/* TEXT ENGINE OVERLAYS */}
              {activeTextClips.map(tc => (
                <div key={tc.id} className={`absolute ${getTextAnimationClass(tc)}`}
                  style={{
                    left: `${tc.x}%`,
                    top: `${tc.y}%`,
                    transform: 'translate(-50%, -50%)',
                    color: tc.color,
                    fontSize: `${tc.fontSize * 2}px`, // Scaled for 720p/1080p canvas
                    fontFamily: tc.fontFamily,
                    fontWeight: tc.fontWeight,
                    fontStyle: tc.fontStyle,
                    textShadow: '0 8px 24px rgba(0,0,0,0.8)',
                    zIndex: 40,
                    cursor: 'text'
                  }}>
                  <span 
                    contentEditable 
                    suppressContentEditableWarning 
                    onBlur={(e) => updateTextClip(tc.id, { text: e.currentTarget.innerText || "New Text" })}
                    className="outline-none min-w-[20px] inline-block"
                  >
                    {tc.text}
                  </span>
                </div>
              ))}
              
              {/* CROP BOXES (INTERACTIVE) */}
              {showCropBoxes && !isFullScreen && activeVideoClip && (
                <>
                  <Rnd bounds="parent" lockAspectRatio={layoutMode === "vertical" ? 9/16 : false}
                    size={{ width: topCrop.width, height: topCrop.height }} position={{ x: topCrop.x, y: topCrop.y }}
                    onDragStop={(e, d) => updateVideoClip(activeVideoClip.id, { cropTop: { ...topCrop, x: d.x, y: d.y } })}
                    onResizeStop={(e, dir, ref, delta, pos) => updateVideoClip(activeVideoClip.id, { cropTop: { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), ...pos } })}
                    className="border-[4px] border-[#00e676] bg-[#00e676]/20 z-50 shadow-[0_0_20px_rgba(0,230,118,0.4)]">
                      <div className="absolute top-0 bg-[#00e676] text-black text-sm px-2 py-0.5 font-bold">TOP CROP</div>
                  </Rnd>
                  
                  {layoutMode === "trio" && (
                    <Rnd bounds="parent" size={{ width: middleCrop.width, height: middleCrop.height }} position={{ x: middleCrop.x, y: middleCrop.y }}
                      onDragStop={(e, d) => updateVideoClip(activeVideoClip.id, { cropMiddle: { ...middleCrop, x: d.x, y: d.y } })}
                      onResizeStop={(e, dir, ref, delta, pos) => updateVideoClip(activeVideoClip.id, { cropMiddle: { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), ...pos } })}
                      className="border-[4px] border-blue-400 bg-blue-400/20 z-50 shadow-[0_0_20px_rgba(96,165,250,0.4)]">
                        <div className="absolute top-0 bg-blue-400 text-black text-sm px-2 py-0.5 font-bold">MIDDLE CROP</div>
                    </Rnd>
                  )}
                  
                  {(layoutMode === "split" || layoutMode === "trio") && (
                    <Rnd bounds="parent" size={{ width: bottomCrop.width, height: bottomCrop.height }} position={{ x: bottomCrop.x, y: bottomCrop.y }}
                      onDragStop={(e, d) => updateVideoClip(activeVideoClip.id, { cropBottom: { ...bottomCrop, x: d.x, y: d.y } })}
                      onResizeStop={(e, dir, ref, delta, pos) => updateVideoClip(activeVideoClip.id, { cropBottom: { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height), ...pos } })}
                      className="border-[4px] border-purple-400 bg-purple-400/20 z-50 shadow-[0_0_20px_rgba(192,132,252,0.4)]">
                        <div className="absolute top-0 bg-purple-400 text-black text-sm px-2 py-0.5 font-bold">BOTTOM CROP</div>
                    </Rnd>
                  )}
                </>
              )}
            </div>
          </div>
      </div>

      {/* Playback bar */}
      <div className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-50" style={{ background: "rgba(8,8,8,0.95)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentTime(0)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-[#5a5a5a]"><SkipBack className="w-4 h-4" /></button>
          <button 
            onClick={() => hasMedia && setIsPlaying(!isPlaying)} 
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasMedia ? 'bg-[#00e676]/10 border border-[#00e676]/20' : 'bg-white/5 border border-white/5 opacity-50 cursor-not-allowed'}`}
          >
            {isPlaying ? <Pause className="w-4 h-4" style={{ color: hasMedia ? G : '#888' }} /> : <Play className="w-4 h-4 fill-current ml-0.5" style={{ color: hasMedia ? G : '#888' }} />}
          </button>
          <button onClick={() => setCurrentTime(totalDuration)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-[#5a5a5a]"><SkipForward className="w-4 h-4" /></button>
          <span className="text-xs font-mono ml-2 text-[#5a5a5a]">{fmt(currentTime)} / {fmt(totalDuration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsFullScreen(!isFullScreen)} className={`p-1.5 rounded-lg transition-colors ${isFullScreen ? 'bg-[#00e676]/20 text-[#00e676]' : 'hover:bg-white/[0.05] text-[#5a5a5a]'}`}>
            {isFullScreen ? <ZoomOut className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
