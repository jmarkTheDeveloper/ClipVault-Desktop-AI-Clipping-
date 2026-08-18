import { useState, useRef, useEffect } from 'react';
import type { VideoClip, AudioClip, TextClip, EditorState, SelectedType } from '../../../utils/types';
import { INITIAL_STATE, makeVideoClip, makeAudioClip, makeTextClip } from '../../../utils/types';
import type { EditorContextType } from './EditorContext';

export function useEditorState(): EditorContextType {
  const [layoutMode, setLayoutMode] = useState("split");
  const [showCropBoxes, setShowCropBoxes] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [videoTrackExpanded, setVideoTrackExpanded] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<"phone" | "tablet" | "laptop">("phone");
  const [showDevicePreview, setShowDevicePreview] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState("media");
  const [activeRightTab, setActiveRightTab] = useState("basic");

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  const [editorHistory, setEditorHistory] = useState<{ stack: EditorState[]; index: number }>({
    stack: [INITIAL_STATE],
    index: 0,
  });

  const currentState = editorHistory.stack[editorHistory.index] || INITIAL_STATE;
  const { clips, audioClips, textClips } = currentState;
  const totalDuration = Math.max(10, ...clips.map(c => c.startTime + c.duration), ...audioClips.map(c => c.startTime + c.duration), ...textClips.map(c => c.startTime + c.duration));

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedType>(null);

  const pxPerSec = Math.max(0.1, (zoomLevel / 100) * 60);
  const totalDurRef = useRef(totalDuration);
  useEffect(() => { totalDurRef.current = totalDuration; }, [totalDuration]);
  const pxPerSecRef = useRef(pxPerSec);
  useEffect(() => { pxPerSecRef.current = pxPerSec; }, [pxPerSec]);
  const dragState = useRef<{ type: "move" | "trim-L" | "trim-R" | null; clipId: number; clipType: SelectedType; startX: number; startY: number; origStart: number; origDur: number; origTrack: number }>({ type: null, clipId: -1, clipType: null, startX: 0, startY: 0, origStart: 0, origDur: 0, origTrack: 0 });

  // PUSH STATE WITH SINGLE ATOMIC UPDATE (Prevents state batching delays)
  const pushState = (newState: EditorState) => {
    setEditorHistory((prev) => {
      const nextStack = prev.stack.slice(0, prev.index + 1);
      nextStack.push(newState);
      const capped = nextStack.slice(Math.max(0, nextStack.length - 25));
      return {
        stack: capped,
        index: capped.length - 1,
      };
    });
  };

  // TRANSIENT STATE UPDATE
  const updateStateTransient = (newState: EditorState) => {
    setEditorHistory((prev) => {
      const copy = [...prev.stack];
      copy[prev.index] = newState;
      return { ...prev, stack: copy };
    });
  };

  const undo = () => { setEditorHistory((prev) => ({ ...prev, index: Math.max(0, prev.index - 1) })); };
  const redo = () => { setEditorHistory((prev) => ({ ...prev, index: Math.min(prev.stack.length - 1, prev.index + 1) })); };

  const updateVideoClip = (id: number, updates: Partial<VideoClip>, transient = false) => {
    const nextState = {
      ...currentState,
      clips: currentState.clips.map(c => c.id === id ? { ...c, ...updates } : c)
    };
    if (transient) updateStateTransient(nextState);
    else pushState(nextState);
  };

  const updateAudioClip = (id: number, updates: Partial<AudioClip>, transient = false) => {
    const nextState = {
      ...currentState,
      audioClips: currentState.audioClips.map(c => c.id === id ? { ...c, ...updates } : c)
    };
    if (transient) updateStateTransient(nextState);
    else pushState(nextState);
  };

  const updateTextClip = (id: number, updates: Partial<TextClip>, transient = false) => {
    const nextState = {
      ...currentState,
      textClips: currentState.textClips.map(c => c.id === id ? { ...c, ...updates } : c)
    };
    if (transient) updateStateTransient(nextState);
    else pushState(nextState);
  };

  const addVideoClip = (mediaId: number | any) => {
    const nc = makeVideoClip(mediaId, currentTime);
    pushState({
      ...currentState,
      clips: [...currentState.clips, nc]
    });
    setSelectedId(nc.id);
    setSelectedType("video");
  };

  const addAudioClip = (mediaId: number | any) => {
    const nc = makeAudioClip(currentTime, mediaId);
    pushState({
      ...currentState,
      audioClips: [...currentState.audioClips, nc]
    });
    setSelectedId(nc.id);
    setSelectedType("audio");
  };

  const addTextClip = () => {
    const nc = makeTextClip(currentTime);
    pushState({ ...currentState, textClips: [...currentState.textClips, nc] });
    setSelectedId(nc.id);
    setSelectedType("text");
    setActiveRightTab("Basic");
  };

  const deleteSelected = () => {
    if (!selectedId || !selectedType) return;
    if (selectedType === "video") pushState({ ...currentState, clips: currentState.clips.filter(c => c.id !== selectedId) });
    if (selectedType === "audio") pushState({ ...currentState, audioClips: currentState.audioClips.filter(c => c.id !== selectedId) });
    if (selectedType === "text") pushState({ ...currentState, textClips: currentState.textClips.filter(c => c.id !== selectedId) });
    setSelectedId(null);
    setSelectedType(null);
  };

  const duplicateSelected = () => {
    if (!selectedId || !selectedType) return;
    let newId = Date.now();
    if (selectedType === "video") {
      const c = currentState.clips.find(c => c.id === selectedId);
      if (c) pushState({ ...currentState, clips: [...currentState.clips, { ...c, id: newId, track: (c.track||0)+1 }] });
    }
    if (selectedType === "audio") {
      const c = currentState.audioClips.find(c => c.id === selectedId);
      if (c) pushState({ ...currentState, audioClips: [...currentState.audioClips, { ...c, id: newId, track: (c.track||0)+1 }] });
    }
    if (selectedType === "text") {
      const c = currentState.textClips.find(c => c.id === selectedId);
      if (c) pushState({ ...currentState, textClips: [...currentState.textClips, { ...c, id: newId, track: (c.track||0)+1 }] });
    }
    setSelectedId(newId);
  };

  return {
    layoutMode, setLayoutMode,
    showCropBoxes, setShowCropBoxes,
    isFullScreen, setIsFullScreen,
    videoTrackExpanded, setVideoTrackExpanded,
    previewDevice, setPreviewDevice,
    showDevicePreview, setShowDevicePreview,
    activeLeftTab, setActiveLeftTab,
    activeRightTab, setActiveRightTab,

    currentTime, setCurrentTime,
    isPlaying, setIsPlaying,
    totalDuration,
    hoverTime, setHoverTime,

    history: editorHistory.stack, histIdx: editorHistory.index, currentState,
    undo, redo,

    selectedId, setSelectedId,
    selectedType, setSelectedType,

    updateVideoClip, updateAudioClip, updateTextClip,
    addVideoClip, addAudioClip, addTextClip,
    deleteSelected, duplicateSelected,

    totalDurRef, pxPerSecRef, dragState,
    zoomLevel, setZoomLevel,
    pxPerSec: pxPerSec,
    push: pushState,
    makeVideoClip,
  };
}
