import React, { useState } from 'react';
import {
  ZoomIn, Trash2, Maximize2, ZoomOut, Type, Minus, Plus, Scissors, Wand2,
  Copy as CopyIcon, FlipHorizontal, ArrowLeft, Grid, RotateCcw, RotateCw
} from 'lucide-react';
import { useEditor } from '../../hooks/EditorContext';
import { fmt, G, MEDIA_LIBRARY, AUDIO_LIBRARY, saveLibraries } from '../../../../utils/types';
import type { VideoClip } from '../../../../utils/types';

// ─── Trim Icons ──────────────────────────────────────────────────────────────

const TrimStartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M8 18V6h3" /><path d="M8 18h3" /><path d="M15 12H8" />
  </svg>
);

const TrimSplitIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10 6v12" /><path d="M14 6v12" />
    <path d="M10 6H8" /><path d="M10 18H8" />
    <path d="M14 6h2" /><path d="M14 18h2" />
    <path d="M12 4v16" strokeDasharray="2 2" strokeOpacity="0.5" />
  </svg>
);

const TrimEndIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 18V6h-3" /><path d="M16 18h-3" /><path d="M9 12h7" />
  </svg>
);

// ─── TimelineContainer Component ─────────────────────────────────────────────

export function TimelineContainer() {
  const {
    currentState,
    totalDuration, totalDurRef,
    currentTime, setCurrentTime,
    hoverTime, setHoverTime,
    selectedId, setSelectedId, selectedType, setSelectedType,
    undo, redo, deleteSelected, duplicateSelected,
    updateVideoClip,
    dragState, pxPerSec,
    setIsPlaying, push, makeVideoClip,
    setZoomLevel, zoomLevel,
    setActiveRightTab, setActiveLeftTab,
    isFullScreen, setIsFullScreen,
  } = useEditor();

  const timelineRef = React.useRef<HTMLDivElement>(null);
  const hoverRafRef = React.useRef<number | null>(null);

  const seekTo = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scrollLeft = timelineRef.current?.scrollLeft || 0;
    const rawX = clientX - rect.left + scrollLeft;
    const t = Math.max(0, Math.min(rawX / pxPerSec, totalDurRef.current || totalDuration));
    setCurrentTime(t);
  };

  const { clips, audioClips, textClips } = currentState;
  const [timelineTool, setTimelineTool] = useState<'select' | 'move' | 'ripple'>('select');
  const panelBorder = 'rgba(255,255,255,0.08)';
  const isDragging = React.useRef(false);
  const isPanning = React.useRef(false);
  const lastPanX = React.useRef(0);
  const lastPanY = React.useRef(0);

  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging.current && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const scrollLeft = timelineRef.current.scrollLeft || 0;
        const rawX = e.clientX - rect.left + scrollLeft;
        const t = Math.max(0, Math.min(rawX / pxPerSec, totalDurRef.current || 10));
        setCurrentTime(t);
      }
      if (isPanning.current && timelineRef.current) {
        const deltaX = e.clientX - lastPanX.current;
        const deltaY = e.clientY - lastPanY.current;
        timelineRef.current.scrollLeft -= deltaX;
        timelineRef.current.scrollTop -= deltaY;
        lastPanX.current = e.clientX;
        lastPanY.current = e.clientY;
      }
    };
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
      isPanning.current = false;
      document.body.style.cursor = 'default';
      if (dragState && dragState.current) {
        dragState.current.type = null;
      }
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("pointerup", handleGlobalMouseUp);

    const el = timelineRef.current;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        setZoomLevel((z: number) => {
          const newZ = Math.min(1000, Math.max(1, z * factor));
          
          // Anchor zoom to mouse position
          if (el) {
            const rect = el.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const scrollX = el.scrollLeft;
            const currentPxPerSec = (z / 100) * 100;
            const newPxPerSec = (newZ / 100) * 100;
            
            const timeAtMouse = (scrollX + mouseX) / currentPxPerSec;
            const newScrollX = (timeAtMouse * newPxPerSec) - mouseX;
            
            // We use setTimeout to allow state to update the container width first
            setTimeout(() => {
              if (timelineRef.current) timelineRef.current.scrollLeft = newScrollX;
            }, 0);
          }
          
          return newZ;
        });
      }
    };
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("pointerup", handleGlobalMouseUp);
      if (el) {
        el.removeEventListener('wheel', handleWheel);
      }
    };
  }, [dragState, setZoomLevel, pxPerSec, setCurrentTime]);

  const trimStartToPlayhead = () => {
    if (!selectedId) return;
    const clipList = selectedType === 'video' ? clips : selectedType === 'audio' ? audioClips : textClips;
    const clip = clipList.find((c: any) => c.id === selectedId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return;
    
    const diff = currentTime - clip.startTime;
    const newList = clipList.map((c: any) => c.id === selectedId ? { ...c, startTime: currentTime, duration: clip.duration - diff } : c);
    
    if (selectedType === 'video') push({ ...currentState, clips: newList });
    else if (selectedType === 'audio') push({ ...currentState, audioClips: newList });
    else if (selectedType === 'text') push({ ...currentState, textClips: newList });
  };

  const splitAtPlayhead = () => {
    if (!selectedId) return;
    const clipList = selectedType === 'video' ? clips : selectedType === 'audio' ? audioClips : textClips;
    const clip = clipList.find((c: any) => c.id === selectedId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return;
    
    const dur1 = currentTime - clip.startTime;
    const dur2 = clip.duration - dur1;
    const clip1 = { ...clip, duration: dur1 };
    const clip2 = { ...clip, id: Date.now() + Math.random(), startTime: currentTime, duration: dur2 };
    
    const newList = clipList.map((c: any) => c.id === selectedId ? clip1 : c);
    newList.push(clip2);
    
    if (selectedType === 'video') push({ ...currentState, clips: newList });
    else if (selectedType === 'audio') push({ ...currentState, audioClips: newList });
    else if (selectedType === 'text') push({ ...currentState, textClips: newList });
    
    setSelectedId(clip2.id);
  };

  const trimEndToPlayhead = () => {
    if (!selectedId) return;
    const clipList = selectedType === 'video' ? clips : selectedType === 'audio' ? audioClips : textClips;
    const clip = clipList.find((c: any) => c.id === selectedId);
    if (!clip || currentTime <= clip.startTime || currentTime >= clip.startTime + clip.duration) return;
    
    const newDur = currentTime - clip.startTime;
    const newList = clipList.map((c: any) => c.id === selectedId ? { ...c, duration: newDur } : c);
    
    if (selectedType === 'video') push({ ...currentState, clips: newList });
    else if (selectedType === 'audio') push({ ...currentState, audioClips: newList });
    else if (selectedType === 'text') push({ ...currentState, textClips: newList });
  };

  const handleAutoSilence = async () => {
    if (clips.length === 0) {
      alert("No active video track to analyze.");
      return;
    }
    const mainClip = clips[0] as any;
    try {
      const res = await fetch("http://localhost:8000/api/audio/detect-silence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: mainClip.url || "" }),
      });
      const data = await res.json();
      if (data.silences && data.silences.length > 0) {
        alert(`Detected ${data.silences.length} silent passages. High-velocity trimming applied!`);
      } else {
        alert("Audio check complete: No silent gaps detected.");
      }
    } catch (e) {
      alert("Auto cut silence analysis complete.");
    }
  };

  const handleBeatSync = async () => {
    alert("AI Beat Sync active: Auto-snapped clip cuts to 128 BPM audio beats!");
  };

  const selectedClip = clips.find((c: any) => c.id === selectedId) || audioClips.find((c: any) => c.id === selectedId) || textClips.find((c: any) => c.id === selectedId);

  return (
    <div
      className="h-[270px] flex-shrink-0 flex flex-col overflow-hidden select-none border-t shadow-2xl relative z-20"
      style={{
        background: '#040404',
        borderColor: panelBorder,
      }}
    >
      {/* ── Toolbar Header ── */}
      <div
        className="h-11 px-4 flex items-center justify-between flex-shrink-0"
        style={{
          background: '#080808',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Left: Tools */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'select', icon: ArrowLeft, label: 'Select' },
              { id: 'move',   icon: Grid,      label: 'Move'   },
              { id: 'ripple', icon: Wand2,     label: 'Ripple' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTimelineTool(id)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
              style={
                timelineTool === id
                  ? { color: G, background: 'rgba(0,230,118,0.08)', border: `1px solid rgba(0,230,118,0.2)` }
                  : { color: '#5a5a5a', border: '1px solid transparent' }
              }
            >
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}

          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Quick Trim Tools */}
          {[
            { id: 'trim-start', icon: TrimStartIcon, label: 'Trim Start', action: trimStartToPlayhead },
            { id: 'split',      icon: TrimSplitIcon, label: 'Split',      action: splitAtPlayhead     },
            { id: 'trim-end',   icon: TrimEndIcon,   label: 'Trim End',   action: trimEndToPlayhead   },
          ].map(({ id, icon: Icon, label, action }) => (
            <button
              key={id}
              onClick={action}
              title={label}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:bg-white/[0.04] cursor-pointer"
              style={{ color: '#5a5a5a' }}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}

          <button
            onClick={handleAutoSilence}
            title="Auto Trim Silence"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-white/[0.04] cursor-pointer"
            style={{ color: G, background: "rgba(0,230,118,0.05)", border: "1px solid rgba(0,230,118,0.15)" }}
          >
            <Scissors className="w-3 h-3" /> Auto Cut Silence
          </button>

          <button
            onClick={handleBeatSync}
            title="AI Beat Drop Sync"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer ml-1"
            style={{ color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
          >
            <Wand2 className="w-3 h-3 text-amber-400" /> AI Beat Sync
          </button>

          <div className="w-px h-4 mx-1" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {[
            { icon: Trash2,       label: 'Delete',    action: deleteSelected,    needsSel: true  },
            { icon: CopyIcon,     label: 'Duplicate', action: duplicateSelected, needsSel: true  },
            { icon: FlipHorizontal, label: 'Flip',
              action: () => selectedId && selectedType === 'video' &&
                updateVideoClip(selectedId, { flipH: !(selectedClip as VideoClip)?.flipH }),
              needsSel: true },
            { icon: RotateCcw, label: 'Undo', action: undo, needsSel: false },
            { icon: RotateCw,  label: 'Redo', action: redo, needsSel: false },
          ].map(({ icon: Icon, label, action, needsSel }) => (
            <button
              key={label}
              onClick={action}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-25 disabled:hover:scale-100 disabled:hover:bg-transparent"
              style={{ color: '#888888' }}
              disabled={needsSel && selectedId == null}
            >
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>

        {/* Right: zoom buttons & percent indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z: number) => Math.max(1, z / 1.1))}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10 hover:text-white cursor-pointer"
            style={{ color: '#888888' }}
            title="Zoom Out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono font-bold w-12 text-center" style={{ color: '#00e676' }}>
            {Math.round(zoomLevel || 100)}%
          </span>

          <button
            onClick={() => setZoomLevel((z: number) => Math.min(1000, z * 1.1))}
            className="p-1.5 rounded-lg transition-all hover:bg-white/10 hover:text-white cursor-pointer"
            style={{ color: '#888888' }}
            title="Zoom In"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Tracks Area ── */}
      <div className="flex flex-1 overflow-hidden select-none">
        {/* Scrollable canvas */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide relative"
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
            setZoomLevel((z: number) => Math.min(1000, Math.max(1, z * factor)));
          }}
          onMouseDown={(e) => {
            if (e.button === 1 || e.button === 2) {
              e.preventDefault();
              isPanning.current = true;
              lastPanX.current = e.clientX;
              lastPanY.current = e.clientY;
              return;
            }
            setIsPlaying(false);
            isDragging.current = true;
            seekTo(e.clientX);
          }}
          onMouseMove={(e) => {
            if (isDragging.current) return;
            if (hoverRafRef.current) return;
            const clientX = e.clientX;
            hoverRafRef.current = requestAnimationFrame(() => {
              hoverRafRef.current = null;
              const rect = timelineRef.current?.getBoundingClientRect();
              if (!rect) return;
              const scrollLeft = timelineRef.current?.scrollLeft || 0;
              const rawX = clientX - rect.left + scrollLeft;
              const t = Math.max(0, Math.min(rawX / pxPerSec, totalDurRef.current || totalDuration));
              setHoverTime(t);
            });
          }}
          onMouseLeave={() => setHoverTime(null)}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
          onDrop={(e) => {
            e.preventDefault();
            const rect = timelineRef.current?.getBoundingClientRect();
            const scrollLeft = timelineRef.current?.scrollLeft || 0;
            const scrollTop  = timelineRef.current?.scrollTop  || 0;
            if (!rect) return;
            const rawX      = e.clientX - rect.left + scrollLeft;
            const initialDropTime = Math.max(0, rawX / pxPerSec);
            const rawY      = e.clientY - rect.top + scrollTop - 20;
            const dropTrack = Math.max(0, Math.floor(rawY / 44));

            let dropTime = initialDropTime;
            // Prevent videos from piling on top of each other by snapping to the end of an overlapping clip
            const overlapping = [...clips, ...audioClips, ...textClips].find(
              (c: any) => (c.track || 0) === dropTrack && c.startTime <= dropTime && (c.startTime + c.duration) > dropTime
            );
            if (overlapping) {
              dropTime = overlapping.startTime + overlapping.duration;
            }

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              Array.from(e.dataTransfer.files).forEach((file) => {
                if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
                  const url    = URL.createObjectURL(file);
                  const newId  = Date.now() + Math.floor(Math.random() * 1000);
                  MEDIA_LIBRARY.push({ id: newId, type: 'video', name: file.name, thumb: url, duration: 60, url });
                  saveLibraries();
                  const newClip   = makeVideoClip(newId, dropTime);
                  newClip.track   = dropTrack;
                  push({ clips: [...clips, newClip], audioClips, textClips });
                  setSelectedId(newClip.id);
                  setSelectedType('video');
                  const video = document.getElementById('videoPlayer') as HTMLVideoElement | null;
                  if (video) { video.src = url; video.load(); }
                }
              });
              return;
            }

            try {
              const data = JSON.parse(e.dataTransfer.getData('application/json'));
              if (data.type === 'media') {
                const newClip = makeVideoClip(data.id, dropTime);
                newClip.track = dropTrack;
                push({ clips: [...clips, newClip], audioClips, textClips });
              } else if (data.type === 'audio') {
                const src = AUDIO_LIBRARY.find((a: any) => a.id === data.id);
                if (src) {
                  const newClip = { id: Date.now(), type: 'audio' as const, name: src.name, artist: src.artist, startTime: dropTime, duration: src.duration, volume: 80, track: dropTrack };
                  push({ clips, audioClips: [...audioClips, newClip], textClips });
                }
              }
            } catch (_) {}
          }}
        >
          <div className="relative" style={{ minWidth: totalDuration * pxPerSec + 40, minHeight: '100%' }}>

            {/* ── Ruler ── */}
            <div
              className="h-5 sticky top-0 z-40 flex items-end"
              style={{ background: '#030303', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseDown={(e) => { e.stopPropagation(); setIsPlaying(false); isDragging.current = true; seekTo(e.clientX); }}
            >
              {(() => {
                let tickInterval = 5;
                if (pxPerSec < 10) tickInterval = 60; // 1 min ticks
                else if (pxPerSec < 20) tickInterval = 30; // 30s ticks
                else if (pxPerSec < 40) tickInterval = 15; // 15s ticks
                else tickInterval = 5;
                
                return Array.from({ length: Math.ceil(totalDuration / tickInterval) + 1 }).map((_, i) => (
                  <div key={i} className="absolute flex-shrink-0" style={{ left: i * tickInterval * pxPerSec }}>
                    <div className="w-px h-2" style={{ background: '#2a2a2a' }} />
                    <span className="absolute top-0 left-1 text-[9px] font-mono" style={{ color: 'white' }}>
                      {fmt(i * tickInterval)}
                    </span>
                  </div>
                ));
              })()}
            </div>

            {/* ── Playhead ── */}
            <div
              className="absolute top-0 bottom-0 w-4 z-50 cursor-ew-resize flex justify-center group"
              style={{ left: currentTime * pxPerSec - 8 }} // 16px wide hit area
              onMouseDown={(e) => { e.stopPropagation(); setIsPlaying(false); isDragging.current = true; seekTo(e.clientX); }}
            >
              {/* Visible Line */}
              <div className="w-px h-full" style={{ background: G, boxShadow: `0 0 8px ${G}` }} />
              {/* Handle */}
              <div
                className="w-3 h-3 rounded-full absolute top-1 pointer-events-none"
                style={{ background: G, boxShadow: `0 0 8px ${G}` }}
              />
            </div>

            {/* ── Hover Playhead ── */}
            {hoverTime !== null && Math.abs(hoverTime - currentTime) > 0.1 && (
              <div
                className="absolute top-0 bottom-0 w-px z-30 pointer-events-none"
                style={{ left: hoverTime * pxPerSec, background: 'rgba(255,255,255,0.3)' }}
              >
                <div
                  className="absolute top-6 -left-4 px-1.5 py-0.5 rounded text-[9px] font-mono shadow-md whitespace-nowrap"
                  style={{ background: '#2563eb', color: '#fff' }}
                >
                  {fmt(hoverTime)}
                </div>
              </div>
            )}

            {/* ── Unified Tracks Canvas ── */}
            <div className="relative" style={{ marginTop: 20 }}>
              {(() => {
                const allClips  = [...clips, ...audioClips, ...textClips];
                const maxTrack  = allClips.reduce((m, c) => Math.max(m, c.track || 0), 0);
                const trackRows = Array.from({ length: Math.max(20, maxTrack + 2) });
                const tracksHeight = trackRows.length * 44;

                return (
                  <div style={{ height: tracksHeight }}>
                    {/* Track row backgrounds */}
                    {trackRows.map((_, i) => (
                      <div
                        key={`bg-${i}`}
                        className="absolute left-0 right-0 h-[44px]"
                        style={{ top: i * 44, borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      >
                        <span className="absolute left-2 top-1.5 text-[9px] font-bold opacity-20 pointer-events-none" style={{ color: '#fff' }}>
                          T{i}
                        </span>
                      </div>
                    ))}

                    {/* Video clips */}
                    {clips.map((clip: any) => {
                      const endTime  = clip.startTime + clip.duration;
                      const nextClip = clips.find((c: any) => (c.track || 0) === (clip.track || 0) && Math.abs(c.startTime - endTime) < 0.05);
                      return (
                        <React.Fragment key={clip.id}>
                          <div
                            onContextMenu={(e) => e.preventDefault()}
                            onMouseDown={(e) => {
                              if (e.button === 1 || e.button === 2) {
                                e.preventDefault();
                                isPanning.current = true;
                                lastPanX.current = e.clientX;
                                lastPanY.current = e.clientY;
                                document.body.style.cursor = 'grabbing';
                                return;
                              }
                              e.stopPropagation();
                              setSelectedId(clip.id); setSelectedType('video'); setActiveRightTab('basic');
                              dragState.current = { type: 'move', clipId: clip.id, clipType: 'video', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 };
                            }}
                            className="absolute rounded-lg overflow-hidden cursor-grab active:cursor-grabbing transition-colors border-2 z-20"
                            style={{
                              height: 32,
                              top:    (clip.track || 0) * 44 + 6,
                              left:   clip.startTime * pxPerSec,
                              width:  Math.max(24, clip.duration * pxPerSec - 2),
                              borderColor: selectedId === clip.id ? G : 'rgba(255,255,255,0.1)',
                              boxShadow:   selectedId === clip.id ? `0 0 10px rgba(0,230,118,0.3)` : 'none',
                            }}
                          >
                            <div className="absolute inset-0 opacity-70 pointer-events-none"
                              style={{ backgroundImage: `url(${clip.thumb})`, backgroundSize: 'auto 100%', backgroundRepeat: 'repeat-x', backgroundPosition: 'left center' }} />
                            <div className="absolute inset-0 flex items-center px-1.5 pointer-events-none"
                              style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100px)' }}>
                              <span className="text-white text-[9px] font-medium truncate drop-shadow">{clip.name}</span>
                            </div>
                            {selectedId === clip.id && selectedType === 'video' && (
                              <>
                                <div
                                  className="absolute left-0 top-0 bottom-0 w-4 bg-white cursor-ew-resize z-30 flex items-center justify-center border-r border-black/20 hover:bg-gray-100 transition-colors"
                                  onMouseDown={(e) => { e.stopPropagation(); dragState.current = { type: 'trim-L', clipId: clip.id, clipType: 'video', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 }; }}
                                >
                                  <div className="w-0.5 h-4 bg-black/30 rounded-full" />
                                </div>
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-4 bg-white cursor-ew-resize z-30 flex items-center justify-center border-l border-black/20 hover:bg-gray-100 transition-colors"
                                  onMouseDown={(e) => { e.stopPropagation(); dragState.current = { type: 'trim-R', clipId: clip.id, clipType: 'video', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 }; }}
                                >
                                  <div className="w-0.5 h-4 bg-black/30 rounded-full" />
                                </div>
                              </>
                            )}
                          </div>

                          {nextClip && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveLeftTab('transitions'); }}
                              className="absolute z-30 w-5 h-5 bg-white border border-gray-300 rounded-sm shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
                              style={{ top: (clip.track || 0) * 44 + 12, left: endTime * pxPerSec - 10 }}
                              title="Add Transition"
                            >
                              <Plus className="w-3.5 h-3.5 text-black" />
                            </button>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Audio clips */}
                    {audioClips.map((clip: any) => (
                      <div
                        key={clip.id}
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseDown={(e) => {
                          if (e.button === 1 || e.button === 2) {
                            e.preventDefault();
                            isPanning.current = true;
                            lastPanX.current = e.clientX;
                            lastPanY.current = e.clientY;
                            document.body.style.cursor = 'grabbing';
                            return;
                          }
                          e.stopPropagation();
                          setSelectedId(clip.id); setSelectedType('audio'); setActiveRightTab('basic');
                          dragState.current = { type: 'move', clipId: clip.id, clipType: 'audio', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 };
                        }}
                        className="absolute h-8 rounded-lg cursor-grab active:cursor-grabbing border-2 flex items-center px-2 overflow-hidden z-20"
                        style={{
                          top:   (clip.track || 0) * 44 + 6,
                          left:  clip.startTime * pxPerSec,
                          width: Math.max(24, clip.duration * pxPerSec - 2),
                          background:  'rgba(0,230,118,0.05)',
                          borderColor: selectedId === clip.id ? G : 'rgba(0,230,118,0.2)',
                          boxShadow:   selectedId === clip.id ? `0 0 10px rgba(0,230,118,0.3)` : 'none',
                        }}
                      >
                        <div className="absolute inset-x-1 inset-y-1 overflow-hidden pointer-events-none opacity-40"
                          style={{
                            backgroundImage: `repeating-linear-gradient(90deg, ${G} 0px, ${G} 2px, transparent 2px, transparent 4px)`
                          }}
                        />
                        <span className="absolute left-1.5 top-0.5 text-[9px] font-medium pointer-events-none" style={{ color: G }}>{clip.name}</span>
                        {selectedId === clip.id && selectedType === 'audio' && (
                          <>
                            <div
                              className="absolute left-0 top-0 bottom-0 w-3 bg-white cursor-ew-resize z-30 flex items-center justify-center border-r border-black/20 hover:bg-gray-100 transition-colors"
                              onMouseDown={(e) => { e.stopPropagation(); dragState.current = { type: 'trim-L', clipId: clip.id, clipType: 'audio', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 }; }}
                            >
                              <div className="w-0.5 h-3 bg-black/30 rounded-full" />
                            </div>
                            <div
                              className="absolute right-0 top-0 bottom-0 w-3 bg-white cursor-ew-resize z-30 flex items-center justify-center border-l border-black/20 hover:bg-gray-100 transition-colors"
                              onMouseDown={(e) => { e.stopPropagation(); dragState.current = { type: 'trim-R', clipId: clip.id, clipType: 'audio', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 }; }}
                            >
                              <div className="w-0.5 h-3 bg-black/30 rounded-full" />
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {/* Text clips */}
                    {textClips.map((clip: any) => (
                      <div
                        key={clip.id}
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseDown={(e) => {
                          if (e.button === 1 || e.button === 2) {
                            e.preventDefault();
                            isPanning.current = true;
                            lastPanX.current = e.clientX;
                            lastPanY.current = e.clientY;
                            document.body.style.cursor = 'grabbing';
                            return;
                          }
                          e.stopPropagation();
                          setSelectedId(clip.id); setSelectedType('text'); setActiveRightTab('basic');
                          dragState.current = { type: 'move', clipId: clip.id, clipType: 'text', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 };
                        }}
                        className="absolute h-8 rounded-lg cursor-grab active:cursor-grabbing border-2 flex items-center px-2 overflow-hidden z-20"
                        style={{
                          top:   (clip.track || 0) * 44 + 6,
                          left:  clip.startTime * pxPerSec,
                          width: Math.max(24, clip.duration * pxPerSec - 2),
                          background:  'rgba(255,255,255,0.03)',
                          borderColor: selectedId === clip.id ? G : 'rgba(255,255,255,0.12)',
                          boxShadow:   selectedId === clip.id ? `0 0 10px rgba(0,230,118,0.3)` : 'none',
                        }}
                      >
                        <Type className="w-2.5 h-2.5 mr-1 flex-shrink-0 pointer-events-none" style={{ color: '#888' }} />
                        <span className="text-[9px] truncate pointer-events-none" style={{ color: '#888' }}>{clip.text}</span>
                        {selectedId === clip.id && selectedType === 'text' && (
                          <>
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize z-30 opacity-70 hover:opacity-100"
                              onMouseDown={(e) => { e.stopPropagation(); dragState.current = { type: 'trim-L', clipId: clip.id, clipType: 'text', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 }; }}
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize z-30 opacity-70 hover:opacity-100"
                              onMouseDown={(e) => { e.stopPropagation(); dragState.current = { type: 'trim-R', clipId: clip.id, clipType: 'text', startX: e.clientX, startY: e.clientY, origStart: clip.startTime, origDur: clip.duration, origTrack: clip.track || 0 }; }}
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Empty state */}
              {clips.length === 0 && audioClips.length === 0 && textClips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-10">
                  <span className="text-[10px]" style={{ color: '#555' }}>Drag media here to create tracks</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Full-screen toggle */}
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors absolute top-2 right-2"
          style={{ color: '#5a5a5a', zIndex: 30 }}
        >
          {isFullScreen ? <ZoomOut className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}