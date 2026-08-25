"""
RecapGenerator Service - AI Multimodal Sight & TTS Voiceover Narration.
Extracts visual keyframes from video scenes, prompts Gemini for cinematic storytelling recaps,
and generates segmented text-to-speech voiceovers with Edge-TTS.
"""
import os
import re
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Tuple

import edge_tts
import numpy as np
from PIL import Image
from moviepy.editor import AudioFileClip, concatenate_audioclips

from config import TEMP_DIR


class RecapGenerator:
    """
    Manages multimodal video analysis and automated story narration synthesis.
    """
    def __init__(self, ai_selector=None):
        self.ai_selector = ai_selector

    @staticmethod
    def extract_visual_frames(video, start: float, end: float, max_frames: int = 6) -> List[Image.Image]:
        """Extracts evenly spaced RGB frames from a video interval for multimodal AI sight."""
        duration = end - start
        if duration <= 30:
            num_frames = min(3, max_frames)
        elif duration <= 60:
            num_frames = min(6, max_frames)
        else:
            num_frames = min(max_frames, max(6, int(duration / 15)))

        sample_offsets = np.linspace(0.1, 0.9, num_frames)
        visual_frames = []
        for offset in sample_offsets:
            t_frame = start + duration * offset
            try:
                frame_rgb = video.get_frame(t_frame)
                pil_img = Image.fromarray(frame_rgb)
                pil_img.thumbnail((512, 512))
                visual_frames.append(pil_img)
            except Exception:
                pass
        return visual_frames

    async def _generate_single_tts(self, text: str, voice: str, pitch: str, rate: str, output_path: str):
        """Generates TTS audio file using Edge-TTS."""
        communicate = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate)
        await communicate.save(output_path)

    def generate_scene_voiceovers(
        self,
        recap_scenes: List[Dict[str, Any]],
        clip_duration: float,
        tts_voice: str = "en-US-ChristopherNeural",
        tts_pitch: str = "-20Hz",
        tts_rate: str = "+0%"
    ) -> Tuple[Any, List[Dict[str, Any]], List[Any]]:
        """
        Generates timed voiceover audio tracks for each scene block and maps precise word timestamps.
        """
        voiceover_clips = []
        all_tts_words = []
        last_voiceover_end = 0.0

        for idx, scene in enumerate(recap_scenes):
            scene_text = scene.get('narration', '') if isinstance(scene, dict) else str(scene)
            if not scene_text.strip():
                continue

            scene_start = scene.get('start', 0.0) if isinstance(scene, dict) else (idx * (clip_duration / len(recap_scenes)))
            temp_tts_path = str(TEMP_DIR / f'tts_scene_{idx}_{os.getpid()}.mp3')

            try:
                # Run async TTS generator synchronously
                asyncio.run(self._generate_single_tts(scene_text, tts_voice, tts_pitch, tts_rate, temp_tts_path))

                scene_audio = AudioFileClip(temp_tts_path)
                target_start = max(last_voiceover_end, scene_start)
                scene_audio_timed = scene_audio.set_start(target_start)
                voiceover_clips.append(scene_audio_timed)

                # Estimate word timestamps for animated subtitles
                scene_words = [w.strip().upper() for w in re.findall(r'\b[\w\']+\b', scene_text)]
                if scene_words and scene_audio.duration > 0:
                    word_dur = scene_audio.duration / len(scene_words)
                    for w_i, word in enumerate(scene_words):
                        w_start = target_start + (w_i * word_dur)
                        w_end = w_start + word_dur
                        all_tts_words.append({
                            'word': word,
                            'start': w_start,
                            'end': w_end
                        })

                last_voiceover_end = target_start + scene_audio.duration
            except Exception as tts_err:
                print(f"    ⚠️ Failed to generate TTS for scene {idx}: {tts_err}")

        return voiceover_clips, all_tts_words
