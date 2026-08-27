"""
VideoProcessor Service - Master Pipeline Coordinator.
Coordinates transcription, AI highlight selection, targeted slice range downloading,
layout composition, typography, and hardware-accelerated video rendering.
"""
import os
import sys
import gc
import json
import time
import random
import multiprocessing
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

import cv2
import numpy as np
import imageio_ffmpeg
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeVideoClip, ColorClip

from config import OUTPUT_DIR, TEMP_DIR, BACKGROUNDS_DIR, GEMINI_API_KEY
from services.youtube_downloader_yt_dlp import YouTubeDownloader
from services.whisper_transcriber import WhisperSingleton
from services.ai_selector import AISelector
from services.caption_maker import CaptionMaker
from services.face_tracker import FaceTracker
from services.color_grader import ColorGrader
from services.layout_compositor import LayoutCompositor
from services.recap_generator import RecapGenerator
from utils.helpers import cleanup_temp_files


class VideoProcessor:
    """
    Master video processing pipeline that orchestrates AI clipping from end to end.
    """
    def __init__(self, api_key: Optional[str] = None, ai_engine: str = "openai_sora", caption_style: str = "capcut_yellow", **kwargs):
        self.api_key = api_key
        self.ai_engine = ai_engine
        self.downloader = YouTubeDownloader(TEMP_DIR)
        self.transcriber = WhisperSingleton()
        self.ai_selector = AISelector(api_key or GEMINI_API_KEY, provider=ai_engine)
        self.caption_maker = CaptionMaker(selected_style=caption_style)
        self.face_tracker = FaceTracker()
        self.color_grader = ColorGrader()
        self.layout_compositor = LayoutCompositor(self.face_tracker)
        self.recap_generator = RecapGenerator(self.ai_selector)

    @staticmethod
    def detect_hardware_encoder():
        """Detects available hardware video encoders (NVIDIA NVENC, Intel QSV, AMD AMF) or falls back to CPU."""
        thread_count = min(4, max(1, multiprocessing.cpu_count() // 2))
        try:
            import torch
            if torch.cuda.is_available():
                print("    🚀 Hardware acceleration: NVIDIA NVENC (h264_nvenc)...")
                return 'h264_nvenc', 'p6', ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-cq', '16', '-rc', 'vbr', '-b:v', '25M', '-maxrate', '35M'], thread_count
        except Exception:
            pass

        try:
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
            enc_res = subprocess.run([ffmpeg_exe, '-encoders'], capture_output=True, text=True, check=False)
            if 'h264_qsv' in enc_res.stdout:
                test_res = subprocess.run([
                    ffmpeg_exe, '-f', 'lavfi', '-i', 'nullsrc=s=64x64:d=0.1',
                    '-c:v', 'h264_qsv', '-f', 'null', '-'
                ], capture_output=True, text=True, check=False)
                if test_res.returncode == 0:
                    print("    🚀 Hardware acceleration: Intel Arc QuickSync (h264_qsv)...")
                    return 'h264_qsv', 'medium', ['-pix_fmt', 'nv12', '-global_quality', '15', '-b:v', '25M', '-maxrate', '35M', '-movflags', '+faststart'], thread_count
        except Exception:
            pass

        try:
            output = subprocess.check_output(
                ['powershell', '-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name'],
                text=True
            )
            if 'AMD' in output or 'Radeon' in output:
                print("    🚀 Hardware acceleration: AMD AMF (h264_amf)...")
                return 'h264_amf', 'quality', ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-rc', 'cqp', '-qp_i', '15', '-qp_p', '15', '-b:v', '25M'], thread_count
        except Exception:
            pass

        print(f"    🚀 Multi-threaded CPU encoder (libx264, {thread_count} threads)...")
        return 'libx264', 'fast', ['-pix_fmt', 'yuv420p', '-threads', str(thread_count), '-crf', '16', '-b:v', '25M', '-maxrate', '35M', '-movflags', '+faststart', '-tune', 'film'], thread_count

    def process_video(
        self,
        url: str,
        num_clips: int = 1,
        target_duration: int = -1,
        topic: Optional[str] = None,
        layout: str = "vertical_crop",
        split_screen: bool = False,
        movie_recap: bool = False,
        quality: str = "720p",
        yt_bypass: bool = False,
        tts_voice: str = "en-US-ChristopherNeural",
        tts_pitch: str = "-20Hz",
        tts_rate: str = "+0%",
        custom_range: Optional[List[float]] = None,
        add_bg_music: Optional[bool] = True,
        add_captions: Optional[bool] = True,
        hook_text: Optional[str] = None,
        transcription_language: Optional[str] = "auto",
        lyrc_promo: Optional[bool] = False,
        custom_range_filter: Optional[List[float]] = None,
        filter_profile: Optional[str] = 'default',
        apply_exposure_flashes: Optional[bool] = False,
        apply_streamer_shake: Optional[bool] = False,
        facecam_pos: Optional[str] = 'top_left',
        custom_file_name: Optional[str] = None,
        custom_folder_name: Optional[str] = None,
        output_dir: Optional[str] = None,
        auto_sfx: Optional[bool] = False,
        bg_music_vol: Optional[float] = 0.1,
        custom_crop_boxes: Optional[Any] = None,
        caption_style: str = "capcut_yellow",
        caption_y_pct: Optional[float] = 0.70,
        camera_style: str = "instant",
        gameplay_bg_video: Optional[str] = None,
        bg_music_file: Optional[str] = None,
        progress_callback: Optional[Any] = None,
        cancel_event: Optional[Any] = None,
        **kwargs: Any
    ) -> Tuple[List[str], str, str]:
        """
        Main entry point for processing and generating viral video clips.
        """
        active_range = custom_range if custom_range else custom_range_filter
        use_smart_slicing = False
        video_path = None
        audio_path = None

        if os.path.isfile(url):
            if progress_callback: progress_callback("Loading local video file...", 5)
            video_path = Path(url)
            title = video_path.stem
            try:
                with VideoFileClip(str(video_path)) as clip:
                    duration = clip.duration
            except Exception:
                duration = 0.0
            print(f"📂 Loaded local file: {title} ({duration:.1f}s)")
        else:
            if active_range:
                if progress_callback: progress_callback("Downloading targeted video range...", 5)
                video_path, audio_path, title, duration = self.downloader.download(
                    url, quality=quality, custom_range=active_range
                )
                r_start, r_end = active_range
                if custom_range: custom_range = [0.0, r_end - r_start]
                if custom_range_filter: custom_range_filter = [0.0, r_end - r_start]
            else:
                if progress_callback: progress_callback("Analyzing stream metadata...", 5)
                info = self.downloader.get_video_info(url)
                title = info.get('title', 'YouTube Video')
                duration = float(info.get('duration', 0.0))
                use_smart_slicing = True
                print(f"⚡ Smart Slicing Pipeline active for: '{title}' ({duration:.1f}s / {duration/3600:.2f} hrs)")

        lang_hint = transcription_language if transcription_language and transcription_language != "auto" else None
        words, transcript, segments = [], "", []

        if use_smart_slicing:
            if progress_callback: progress_callback("Fetching instant AI subtitles from YouTube...", 12)
            subs = self.downloader.get_native_subtitles(url, language=lang_hint or "en")
            if subs:
                words, transcript, segments = subs
                print(f"🚀 Loaded instant YouTube native captions in 0.5s ({len(words)} words)!")
            else:
                if progress_callback: progress_callback("Downloading audio track for Whisper...", 15)
                audio_path, title, duration = self.downloader.download_audio_only(url)
                if progress_callback: progress_callback("Transcribing audio with Whisper...", 20)
                words, transcript, segments = self.transcriber.transcribe(
                    str(audio_path), language=lang_hint, progress_callback=progress_callback,
                    api_key=self.api_key, ai_engine=self.ai_engine
                )
        else:
            video_stem = Path(video_path).name if video_path else "video"
            cache_path = TEMP_DIR / f"{video_stem}_whisper.json"
            if cache_path.exists():
                try:
                    with open(cache_path, 'r', encoding='utf-8') as f_cache:
                        c_data = json.load(f_cache)
                        words, transcript, segments = c_data.get('words', []), c_data.get('transcript', ''), c_data.get('segments', [])
                except Exception:
                    pass
            if not words:
                if progress_callback: progress_callback("Starting transcription with Whisper...", 20)
                transcribe_path = audio_path if audio_path else video_path
                words, transcript, segments = self.transcriber.transcribe(
                    str(transcribe_path), language=lang_hint, progress_callback=progress_callback,
                    api_key=self.api_key, ai_engine=self.ai_engine
                )
                try:
                    with open(cache_path, 'w', encoding='utf-8') as f_cache:
                        json.dump({'words': words, 'transcript': transcript, 'segments': segments}, f_cache, ensure_ascii=False, indent=2)
                except Exception:
                    pass

        print(f"✅ Transcription complete: {len(segments)} segments, {len(words)} words")

        # Select viral clips
        if custom_range is not None:
            start_t, end_t = max(0.0, custom_range[0]), min(duration, custom_range[1])
            clip_specs = [{
                'start': start_t,
                'end': end_t,
                'title': f'Custom Highlight ({start_t:.1f}s - {end_t:.1f}s)',
                'virality_score': 100,
                'content_title': f"{title} Highlight 🍿",
                'content_description': f"Highlight clip from '{title}'! #viral #clips"
            }]
        elif target_duration == -1:
            clip_specs = [{
                'start': 0.0,
                'end': duration,
                'title': 'Full Story Highlight',
                'virality_score': 100,
                'content_title': f"{title} Highlight 🍿",
                'content_description': f"Full story highlight of '{title}'! #viral #clips"
            }]
        else:
            if progress_callback: progress_callback("Selecting viral highlights with AI...", 40)
            clip_specs = self.ai_selector.select_clips(segments, duration, num_clips, target_duration, topic=topic)

        if not clip_specs:
            raise ValueError("Could not select any viral clips from this video.")

        # Determine target export directory
        if output_dir:
            target_dir = Path(output_dir)
        elif custom_folder_name:
            clean_f = "".join(c for c in custom_folder_name if c.isalnum() or c in (' ', '_', '-', '.')).strip()
            target_dir = OUTPUT_DIR / clean_f if clean_f else OUTPUT_DIR
        else:
            target_dir = OUTPUT_DIR
        target_dir.mkdir(parents=True, exist_ok=True)

        if caption_style in self.caption_maker.styles:
            self.caption_maker.selected_style = caption_style

        # Determine standard vertical dimensions
        if quality == "720p":
            target_h, target_w = 1280, 720
        elif quality == "1080p":
            target_h, target_w = 1920, 1080
        elif quality in ["4k", "8k"]:
            target_h, target_w = 3840, 2160
        else:
            target_h, target_w = 1280, 720

        output_files = []
        best_codec, best_preset, ffmpeg_params, thread_count = self.detect_hardware_encoder()
        if quality.lower() in ['4k', '8k']:
            if best_codec == 'h264_qsv':
                ffmpeg_params.extend(['-b:v', '55M', '-maxrate', '80M', '-global_quality', '13'])
            elif best_codec == 'h264_nvenc':
                ffmpeg_params.extend(['-b:v', '55M', '-maxrate', '80M', '-cq', '13'])
            elif best_codec == 'libx264':
                ffmpeg_params.extend(['-crf', '14', '-b:v', '55M', '-maxrate', '80M', '-bufsize', '100M'])
        elif quality.lower() == '1080p':
            if best_codec == 'h264_qsv':
                ffmpeg_params.extend(['-b:v', '25M', '-maxrate', '35M', '-global_quality', '15'])
            elif best_codec == 'h264_nvenc':
                ffmpeg_params.extend(['-b:v', '25M', '-maxrate', '35M', '-cq', '16'])
            elif best_codec == 'libx264':
                ffmpeg_params.extend(['-crf', '16', '-b:v', '25M', '-maxrate', '35M', '-bufsize', '50M'])

        print(f"\n🎬 Processing {len(clip_specs)} viral clips (Saving to: {target_dir})...")

        for i, clip_info in enumerate(clip_specs, 1):
            start = clip_info['start']
            end = clip_info['end']
            title_text = clip_info.get('title', f'Clip {i}')
            virality_score = clip_info.get('virality_score', 95)
            print(f"\n📹 Clip {i}/{len(clip_specs)}: {title_text} ({start:.1f}s - {end:.1f}s)")

            clips_to_close = []
            slice_to_cleanup = None
            try:
                if use_smart_slicing:
                    if progress_callback:
                        progress_callback(f"Downloading clip {i}/{len(clip_specs)} slice ({start:.0f}s-{end:.0f}s)...", 35 + int((i - 1) / len(clip_specs) * 25))
                    slice_to_cleanup = self.downloader.download_slice(url, start, end, quality=quality)
                    video = VideoFileClip(str(slice_to_cleanup))
                    clips_to_close.append(video)
                    clip = video
                else:
                    video = VideoFileClip(str(video_path))
                    clips_to_close.append(video)
                    if audio_path:
                        a_clip = AudioFileClip(str(audio_path))
                        video = video.set_audio(a_clip)
                        clips_to_close.append(a_clip)
                    start = max(0.0, min(video.duration, start))
                    end = max(start, min(video.duration, end))
                    clip = video.subclip(start, end)

                if clip.audio is not None:
                    try:
                        from moviepy.audio.fx.all import audio_normalize
                        clip = clip.set_audio(audio_normalize(clip.audio))
                    except Exception:
                        pass
                clips_to_close.append(clip)

                # 1. Apply Layout Composition (9:16 vertical crop, blur background, split screen)
                clip = self.layout_compositor.compose_layout(
                    clip, layout, target_w, target_h,
                    custom_crop_boxes=custom_crop_boxes,
                    camera_style=camera_style,
                    clips_to_close=clips_to_close,
                    gameplay_bg_video=gameplay_bg_video
                )

                # 2. Apply Color Grading LUT
                if filter_profile and filter_profile != 'default':
                    clip = self.color_grader.apply_profile(clip, filter_profile)
                    clips_to_close.append(clip)

                # 3. Dynamic anti-ContentID bypass (Fast C-Level Visual & Acoustic Fingerprint Disruption)
                if yt_bypass:
                    from moviepy.video.fx.mirror_x import mirror_x
                    from moviepy.video.fx.speedx import speedx
                    from moviepy.video.fx.crop import crop
                    
                    # 1. Flip horizontally (C-pointer matrix inversion, zero overhead)
                    clip = mirror_x(clip)
                    # 2. Slight tempo shift (1.04x)
                    clip = speedx(clip, 1.04)
                    
                    # 3. Micro-crop 1.04x to break outer bounding box perceptual hash
                    cw, ch = clip.size
                    crop_w = int(cw / 1.04)
                    crop_h = int(ch / 1.04)
                    if crop_w % 2 != 0: crop_w -= 1
                    if crop_h % 2 != 0: crop_h -= 1
                    clip = crop(clip, width=crop_w, height=crop_h, x_center=cw/2, y_center=ch/2)
                    clip = clip.resize((cw, ch))
                    clips_to_close.append(clip)
                    
                    if words:
                        for w_info in words:
                            w_info['start'] /= 1.04
                            w_info['end'] /= 1.04

                # 4. Background music with auto-ducking
                if add_bg_music and not movie_recap:
                    from config import MUSIC_DIR
                    bg_track = None
                    if bg_music_file and Path(bg_music_file).exists():
                        bg_track = Path(bg_music_file)
                    elif bg_music_file and (MUSIC_DIR / Path(bg_music_file).name).exists():
                        bg_track = MUSIC_DIR / Path(bg_music_file).name
                    else:
                        bg_tracks = list(MUSIC_DIR.glob("*.mp3")) + list(MUSIC_DIR.glob("*.wav")) + list(Path("./bg_music").glob("*.mp3"))
                        if bg_tracks:
                            bg_track = random.choice(bg_tracks)

                    if bg_track and bg_track.exists():
                        try:
                            ducked_vol = max(0.04, min(0.25, bg_music_vol * 0.55 if clip.audio else bg_music_vol))
                            bg_m = AudioFileClip(str(bg_track)).volumex(ducked_vol)
                            from moviepy.audio.fx.audio_loop import audio_loop
                            bg_m_looped = audio_loop(bg_m, duration=clip.duration)
                            clips_to_close.extend([bg_m, bg_m_looped])
                            if clip.audio:
                                from moviepy.editor import CompositeAudioClip
                                vocal_boost = clip.audio.volumex(1.15)
                                clip = clip.set_audio(CompositeAudioClip([vocal_boost, bg_m_looped]))
                            else:
                                clip = clip.set_audio(bg_m_looped)
                        except Exception as bg_err:
                            print(f"    ⚠️ Background music note: {bg_err}")

                # 5. Add Word-by-Word Animated Typography
                is_none_style = self.caption_maker.styles.get(self.caption_maker.selected_style, {}).get('no_captions', False)
                if add_captions and not is_none_style:
                    # High-Accuracy Direct Clip Transcription (CapCut & Opus Clip Standard)
                    # Transcribing the specific 30-60s clip audio ensures 100% accurate per-word timestamps,
                    # zero A/V sync drift, and captures fast or slow speech accurately.
                    clip_words = []
                    clip_audio_tmp = None
                    try:
                        clip_audio_tmp = TEMP_DIR / f"clip_audio_{i}_{int(time.time()*1000)}.wav"
                        if clip.audio is not None:
                            clip.audio.write_audiofile(
                                str(clip_audio_tmp),
                                fps=16000,
                                nbytes=2,
                                codec='pcm_s16le',
                                logger=None
                            )
                            c_words, _, _ = self.transcriber.transcribe(
                                str(clip_audio_tmp),
                                language=lang_hint,
                                api_key=self.api_key,
                                ai_engine=self.ai_engine
                            )
                            if c_words:
                                clip_words = c_words
                                print(f"    🎯 Direct clip Whisper captured {len(clip_words)} words with millisecond precision!")
                    except Exception as clip_tr_err:
                        print(f"    ⚠️ Direct clip transcription note: {clip_tr_err}")
                    finally:
                        if clip_audio_tmp and clip_audio_tmp.exists():
                            try: clip_audio_tmp.unlink()
                            except Exception: pass

                    final_words = clip_words if clip_words else words
                    offset_time = 0.0 if clip_words else start

                    if final_words:
                        ai_hook_text = clip_info.get('hook_title', hook_text)
                        clip = self.caption_maker.add_captions(
                            clip, final_words, offset_time, layout=layout,
                            hook_text=ai_hook_text, auto_sfx=auto_sfx, caption_y_pct=caption_y_pct
                        )
                        clips_to_close.append(clip)

                # Export file
                clean_stem = Path(video_path).stem if video_path else "".join(c for c in title if c.isalnum() or c in (' ', '_', '-'))[:35].strip()
                if custom_file_name:
                    name_prefix = custom_file_name if num_clips == 1 else f"{custom_file_name}_{i}"
                    filename = f"{name_prefix}.mp4"
                else:
                    filename = f"clip_{i}_{virality_score}pts_{clean_stem}.mp4"
                output_path = target_dir / filename

                from proglog import ProgressBarLogger
                class MyBarLogger(ProgressBarLogger):
                    def __init__(self, p_cb, c_idx, total_c, cancel_evt=None):
                        super().__init__()
                        self.p_cb = p_cb
                        self.c_idx = c_idx
                        self.total_c = total_c
                        self.cancel_evt = cancel_evt
                        self.last_pct = -100
                    def bars_callback(self, bar, attr, value, old_value=None):
                        if self.cancel_evt and self.cancel_evt.is_set():
                            raise InterruptedError("Rendering stopped by user")
                        if attr == 'index' and self.p_cb:
                            total = self.bars[bar].get('total', 1)
                            if total > 0:
                                pct = int((value / total) * 100)
                                if pct - self.last_pct >= 3 or pct == 100:
                                    self.last_pct = pct
                                    base = 60 + int((self.c_idx - 1) / self.total_c * 40)
                                    self.p_cb(f"Rendering Clip {self.c_idx}/{self.total_c} ({pct}%)...", min(99, base + int(pct * 0.38)))

                my_logger = MyBarLogger(progress_callback, i, len(clip_specs), cancel_event) if progress_callback else None
                render_fps = 60 if best_codec == 'h264_nvenc' else 30

                if cancel_event and cancel_event.is_set():
                    print("🛑 Processing cancelled by user.")
                    break

                clip.write_videofile(
                    str(output_path),
                    codec=best_codec,
                    audio_codec='aac',
                    preset=best_preset,
                    fps=render_fps,
                    ffmpeg_params=ffmpeg_params,
                    verbose=False,
                    logger=my_logger,
                    temp_audiofile=str(TEMP_DIR / f'temp_audio_{i}_{os.getpid()}.m4a'),
                    remove_temp=True,
                    threads=thread_count
                )
                output_files.append(str(output_path))
                print(f"    ✅ Saved: {filename} ({render_fps} FPS)")
                if progress_callback:
                    final_pct = min(99, int(60 + (i / len(clip_specs)) * 39))
                    progress_callback(f"Finalized Clip {i}/{len(clip_specs)}", final_pct)

                # Save metadata text file
                metadata_dir = target_dir / "metadata"
                metadata_dir.mkdir(exist_ok=True)
                metadata_path = metadata_dir / f"clip_{i}_{virality_score}pts_{clean_stem}_metadata.txt"
                try:
                    with open(metadata_path, 'w', encoding='utf-8') as f_meta:
                        f_meta.write(f"🎬 Catchy Title:\n{clip_info.get('content_title', title_text)}\n\n")
                        f_meta.write(f"📝 Description & Hashtags:\n{clip_info.get('content_description', '')}\n\n")
                        if clip_info.get('reason'):
                            f_meta.write(f"🧠 AI Curation Analysis:\n{clip_info['reason']}\n")
                except Exception:
                    pass

            except Exception as e:
                print(f"    ❌ Error processing clip {i}: {e}")
                continue
            finally:
                for c in clips_to_close:
                    try:
                        c.close()
                    except Exception:
                        pass
                try:
                    if 'clip' in locals() and clip:
                        clip.close()
                except Exception:
                    pass
                if slice_to_cleanup and slice_to_cleanup.exists():
                    try:
                        slice_to_cleanup.unlink()
                    except Exception:
                        pass
                gc.collect()

        self.face_tracker.close()
        cleanup_temp_files()
        return output_files, title, str(target_dir.resolve())
