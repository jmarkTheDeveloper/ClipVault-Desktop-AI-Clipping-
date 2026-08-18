import React, { createContext, useContext } from 'react';
import type { VideoClip, AudioClip, TextClip, EditorState, SelectedType } from '../../../utils/types';
import { useEditorState } from './useEditorState';

export interface EditorContextType {
  // Layout & UI State
  layoutMode: string;
  setLayoutMode: (mode: string) => void;
  showCropBoxes: boolean;
  setShowCropBoxes: (show: boolean) => void;
  isFullScreen: boolean;
  setIsFullScreen: (full: boolean) => void;
  videoTrackExpanded: boolean;
  setVideoTrackExpanded: (exp: boolean) => void;
  previewDevice: "phone" | "tablet" | "laptop";
  setPreviewDevice: (dev: "phone" | "tablet" | "laptop") => void;
  showDevicePreview: boolean;
  setShowDevicePreview: (show: boolean) => void;
  activeLeftTab: string;
  setActiveLeftTab: (tab: string) => void;
  activeRightTab: string;
  setActiveRightTab: (tab: string) => void;

  // Timeline State
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  totalDuration: number;
  hoverTime: number | null;
  setHoverTime: (time: number | null) => void;

  // History State
  history: EditorState[];
  histIdx: number;
  currentState: EditorState;
  undo: () => void;
  redo: () => void;
  
  // Selection State
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  selectedType: SelectedType;
  setSelectedType: (type: SelectedType) => void;
  
  // Mutators
  updateVideoClip: (id: number, updates: Partial<VideoClip>, transient?: boolean) => void;
  updateAudioClip: (id: number, updates: Partial<AudioClip>, transient?: boolean) => void;
  updateTextClip: (id: number, updates: Partial<TextClip>, transient?: boolean) => void;
  addVideoClip: (mediaId: number | any) => void;
  addAudioClip: (mediaId: number | any) => void;
  addTextClip: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;

  // Refs
  totalDurRef: React.MutableRefObject<number>;
  pxPerSecRef: React.MutableRefObject<number>;
  dragState: React.MutableRefObject<any>;

  // Zoom & Scale State
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  pxPerSec: number;

  // Additional props used across components
  [key: string]: any;
}

export const EditorContext = createContext<EditorContextType | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const state = useEditorState();
  return <EditorContext.Provider value={state}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used within EditorProvider");
  return ctx;
}
