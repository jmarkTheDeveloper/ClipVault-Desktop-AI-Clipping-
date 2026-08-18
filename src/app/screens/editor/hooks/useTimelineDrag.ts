import { useEffect } from 'react';
import { useEditor } from './EditorContext';

export function useTimelineDrag() {
  const { 
    dragState, pxPerSecRef, 
    updateVideoClip, updateAudioClip, updateTextClip, 
    currentState 
  } = useEditor();

  const { clips, audioClips, textClips } = currentState || {};

  useEffect(() => {
    let pendingEvent: MouseEvent | null = null;
    let rafId: number | null = null;

    const processDrag = () => {
      if (!pendingEvent) return;
      const e = pendingEvent;
      pendingEvent = null;
      rafId = null;

      if (!dragState?.current) return;
      const state = dragState.current;
      if (!state.type) return;
      const scale = pxPerSecRef?.current || 60;
      const dx = (e.clientX - state.startX) / scale;

      let setter: any;
      if (state.clipType === "video") setter = updateVideoClip;
      else if (state.clipType === "audio") setter = updateAudioClip;
      else if (state.clipType === "text") setter = updateTextClip;
      if (!setter) return;

      if (state.type === "move") {
        const dy = e.clientY - state.startY;
        const deltaTrack = Math.round(dy / 44);
        const newTrack = Math.max(0, state.origTrack + deltaTrack);
        const desiredStart = Math.max(0, state.origStart + dx);
        setter(state.clipId, { startTime: desiredStart, track: newTrack }, true);
      } else if (state.type === "trim-L") {
        let newStart = Math.max(0, state.origStart + dx);
        let newDur = Math.max(0.2, state.origDur - (newStart - state.origStart));
        setter(state.clipId, { startTime: newStart, duration: newDur }, true);
      } else if (state.type === "trim-R") {
        const newDur = Math.max(0.2, state.origDur + dx);
        setter(state.clipId, { duration: newDur }, true);
      }
    };

    const onGlobalMouseMove = (e: MouseEvent) => {
      if (!dragState?.current?.type) return;
      pendingEvent = e;
      if (!rafId) {
        rafId = requestAnimationFrame(processDrag);
      }
    };

    const resetDrag = () => {
      if (dragState?.current) {
        dragState.current = { type: null, clipId: -1, clipType: null, startX: 0, startY: 0, origStart: 0, origDur: 0, origTrack: 0 };
      }
    };

    window.addEventListener("mousemove", onGlobalMouseMove);
    window.addEventListener("mouseup", resetDrag);
    window.addEventListener("pointerup", resetDrag);
    window.addEventListener("blur", resetDrag);
    document.addEventListener("mouseleave", resetDrag);
    return () => {
      window.removeEventListener("mousemove", onGlobalMouseMove);
      window.removeEventListener("mouseup", resetDrag);
      window.removeEventListener("pointerup", resetDrag);
      window.removeEventListener("blur", resetDrag);
      document.removeEventListener("mouseleave", resetDrag);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [dragState, pxPerSecRef, updateVideoClip, updateAudioClip, updateTextClip, clips, audioClips, textClips]);
}

