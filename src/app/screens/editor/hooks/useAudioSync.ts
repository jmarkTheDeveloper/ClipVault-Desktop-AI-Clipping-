import { useEffect, useMemo, useRef } from 'react';
import { useEditor } from './EditorContext';
import type { VideoClip } from '../../../utils/types';

export function useAudioSync() {
  const { currentState, currentTime, isPlaying } = useEditor();
  const { clips } = currentState;

  const activeVideoClips = useMemo(() => {
    return clips.filter(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration) as VideoClip[];
  }, [clips, currentTime]);

  // Store GainNodes per audio element to avoid recreating them
  const gainNodesRef = useRef<{ [id: string]: { ctx: AudioContext, source: MediaElementAudioSourceNode, gainNode: GainNode } }>({});

  useEffect(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>("video[id^='videoPlayer_']");
    const audios = document.querySelectorAll<HTMLAudioElement>("audio[id^='audioPlayer_']");
    
    // Process Videos (Mute them if audio exists)
    videos.forEach(video => {
      const clipId = Number(video.id.split('_').pop());
      const clip = activeVideoClips.find(c => c.id === clipId);

      if (!clip) {
        video.muted = true;
      } else {
        if (clip.audioUrl) {
          video.muted = true;
        } else {
          video.muted = false;
          const targetVol = typeof (clip as any).volume === 'number' ? (clip as any).volume / 100 : 1.0;
          video.volume = Math.min(1.0, Math.max(0, targetVol));
        }
      }
    });

    // Process Audios (Apply GainNode for 1000% volume)
    audios.forEach(audio => {
      const clipId = Number(audio.id.split('_').pop());
      const clip = activeVideoClips.find(c => c.id === clipId);

      if (!clip) {
        audio.muted = true;
      } else {
        audio.muted = false;
        const targetVol = typeof (clip as any).volume === 'number' ? (clip as any).volume / 100 : 1.0;
        
        try {
          if (!gainNodesRef.current[audio.id]) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            const source = ctx.createMediaElementSource(audio);
            const gainNode = ctx.createGain();
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            gainNodesRef.current[audio.id] = { ctx, source, gainNode };
          }
          
          if (gainNodesRef.current[audio.id]) {
            gainNodesRef.current[audio.id].gainNode.gain.value = targetVol;
            // Native audio volume must stay at 1.0 because GainNode amplifies the base signal
            audio.volume = 1.0;
          }
        } catch (e) {
          // Fallback to normal volume if Web Audio API fails (e.g. CORS)
          audio.volume = Math.min(1.0, Math.max(0, targetVol));
        }
      }
    });
  }, [activeVideoClips]);

  useEffect(() => {
    const videos = document.querySelectorAll<HTMLVideoElement>("video[id^='videoPlayer_']");
    const audios = document.querySelectorAll<HTMLAudioElement>("audio[id^='audioPlayer_']");
    
    const syncMedia = (media: HTMLMediaElement, prefix: string) => {
      const clipId = Number(media.id.split('_').pop());
      const clip = activeVideoClips.find(c => c.id === clipId);
      if (clip) {
        const expectedTime = Math.max(0, currentTime - clip.startTime);
        if (isPlaying) {
          if (media.paused) {
            media.play().catch(() => {});
          }
          if (prefix === 'audio' && gainNodesRef.current[media.id]) {
            if (gainNodesRef.current[media.id].ctx.state === 'suspended') {
              gainNodesRef.current[media.id].ctx.resume();
            }
          }
          if (Math.abs(media.currentTime - expectedTime) > 1.5) {
            media.currentTime = expectedTime;
          }
        } else {
          if (Math.abs(media.currentTime - expectedTime) > 0.05) {
            media.currentTime = expectedTime;
          }
          if (!media.paused) {
             media.pause();
          }
        }
      } else {
         if (!media.paused) media.pause();
      }
    };

    videos.forEach(v => syncMedia(v, 'video'));
    audios.forEach(a => syncMedia(a, 'audio'));
  }, [currentTime, activeVideoClips, isPlaying]);

  return activeVideoClips;
}
