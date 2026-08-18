import { useEffect } from 'react';
import { useEditor } from './EditorContext';

export function usePlayback() {
  const { isPlaying, setIsPlaying, setCurrentTime, currentTime, totalDurRef, currentState } = useEditor();

  // Stop playback instantly if all media is deleted
  useEffect(() => {
    const hasMedia = (currentState?.clips?.length || 0) > 0 || (currentState?.audioClips?.length || 0) > 0 || (currentState?.textClips?.length || 0) > 0;
    if (!hasMedia && isPlaying) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [currentState, isPlaying, setIsPlaying, setCurrentTime]);

  // Sync video current time when paused or scrubbed
  useEffect(() => {
    if (!isPlaying) {
      const videos = document.querySelectorAll<HTMLVideoElement>("video");
      videos.forEach(v => {
        if (v.readyState >= 1) { // HAVE_METADATA
          if (Math.abs(v.currentTime - currentTime) > 0.1) {
            v.currentTime = currentTime;
          }
        }
      });
    }
  }, [currentTime, isPlaying]);

  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();
    const getVideos = () => document.querySelectorAll<HTMLVideoElement>("video");

    if (isPlaying) {
      getVideos().forEach(v => v.play().catch(() => {}));

      let accumulatedDelta = 0;
      let lastReactUpdate = performance.now();

      const updateLoop = (time: number) => {
        const delta = Math.min((time - lastTime) / 1000, 0.1);
        lastTime = time;
        accumulatedDelta += delta;

        if (time - lastReactUpdate > 50) {
          setCurrentTime((prev) => {
            let nextTime = prev + accumulatedDelta;
            const maxDur = (totalDurRef?.current || 60) - 5; // Remove timeline buffer
            if (nextTime >= maxDur) {
              setIsPlaying(false);
              nextTime = maxDur;
              getVideos().forEach(v => {
                v.pause();
                v.currentTime = maxDur;
              });
            }
            return nextTime;
          });
          accumulatedDelta = 0;
          lastReactUpdate = time;
        }

        rafId = requestAnimationFrame(updateLoop);
      };
      rafId = requestAnimationFrame(updateLoop);
    } else {
      getVideos().forEach(v => v.pause());
    }
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);
}

