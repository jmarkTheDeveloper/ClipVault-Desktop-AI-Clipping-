import os
import random
from pathlib import Path
from moviepy.editor import VideoFileClip, concatenate_videoclips, ColorClip, CompositeVideoClip, AudioFileClip, CompositeAudioClip

from config import OUTPUT_DIR, TEMP_DIR, GEMINI_API_KEY, BACKGROUNDS_DIR
from services.youtube_downloader import YouTubeDownloader
from services.whisper_transcriber import WhisperSingleton
from services.ai_selector import AISelector
from services.face_tracker import FaceTracker
from services.caption_maker import CaptionMaker
from utils.helpers import generate_random_clips, cleanup_temp_files


class VideoProcessor:
    """
    Orchestrates the entire video processing pipeline.

    This class initializes and manages all the services required for
    downloading, transcribing, selecting clips, tracking faces, and
    adding captions to a YouTube video.
    """
    def __init__(self, caption_style='clean_white', ai_engine='openai_sora'):
        """
        Initializes the VideoProcessor with a specific caption style.

        Args:
            caption_style (str, optional): The style of captions to use.
                                            Defaults to 'clean_white'.
            ai_engine (str, optional): AI engine to use.
        """
        self.ai_engine = ai_engine
        self.downloader = YouTubeDownloader()
        self.transcriber = WhisperSingleton()
        self.ai_selector = AISelector(api_key=GEMINI_API_KEY, provider=self.ai_engine)
        self.face_tracker = FaceTracker()
        self.caption_maker = CaptionMaker(caption_style)

    def detect_beats(self, audio_clip, duration, num_cuts=8):
        """
        Analyzes the audio amplitude envelope of the music track to find
        the exact timestamps of the strongest volume peaks (drum drops / beats).
        """
        try:
            import numpy as np
            fps = 100
            snd = audio_clip.to_soundarray(fps=fps)
            if len(snd.shape) > 1:
                envelope = np.abs(snd).mean(axis=1)
            else:
                envelope = np.abs(snd)
            
            # Find peaks using a sliding window
            peaks = []
            window_size = int(fps * 0.8) # 0.8 seconds minimum spacing between cuts
            for i in range(window_size, len(envelope) - window_size):
                val = envelope[i]
                if val > 0.02 and val == np.max(envelope[i - window_size : i + window_size]):
                    peaks.append(i / fps)
            
            # Sort peaks by volume to get the strongest beat drops
            peaks = sorted(peaks, key=lambda t: envelope[int(t * fps)], reverse=True)
            # Pick the top strongest drops and sort chronologically
            selected_beats = sorted(peaks[:num_cuts])
            if len(selected_beats) >= 3:
                return selected_beats
        except Exception as beat_err:
            print(f"    ⚠️ Beat detection failed: {beat_err}")
            
        # Fallback: distribute cuts evenly
        return [float(i * (duration / (num_cuts + 1))) for i in range(1, num_cuts + 1)]

    def detect_reaction_peaks(self, audio_clip, duration):
        """
        Analyzes audio volume spikes (screams/laughs) to find intervals where
        the volume is significantly higher than the local average.
        """
        try:
            import numpy as np
            fps = 20
            snd = audio_clip.to_soundarray(fps=fps)
            if len(snd.shape) > 1:
                envelope = np.abs(snd).mean(axis=1)
            else:
                envelope = np.abs(snd)
                
            window = int(fps * 0.5)
            smoothed = np.convolve(envelope, np.ones(window)/window, mode='same')
            
            mean_vol = np.mean(smoothed)
            std_vol = np.std(smoothed)
            
            threshold = max(0.12, mean_vol + 1.8 * std_vol)
            
            peaks = []
            in_peak = False
            peak_start = 0.0
            
            for i, val in enumerate(smoothed):
                t = i / fps
                if val >= threshold:
                    if not in_peak:
                        in_peak = True
                        peak_start = max(0.0, t - 0.2)
                else:
                    if in_peak:
                        in_peak = False
                        if t - peak_start >= 0.5:
                            peaks.append((peak_start, min(duration, t + 0.5)))
                            
            if in_peak:
                peaks.append((peak_start, duration))
                
            return peaks
        except Exception as e:
            print(f"    ⚠️ Reaction detection failed: {e}")
            return []

    def correct_transcription_vocabulary(self, words, transcript, segments):
        """
        Applies a word-mapping corrections vocabulary to fix misheard words/accent typos.
        """
        corrections = {
            "CEASAR": "SCISSOR",
            "CAESAR": "SCISSOR",
            "CEASARS": "SCISSORS",
            "CAESARS": "SCISSORS",
            "CASE OH": "CASEOH",
            "CASEOH'S": "CASEOH'S",
        }
        
        # 1. Correct words list
        for w in words:
            clean_word = "".join(char for char in w['word'] if char.isalnum() or char == "'").upper()
            if clean_word in corrections:
                replacement = corrections[clean_word]
                prefix = ""
                suffix = ""
                orig = w['word']
                for char in orig:
                    if not char.isalnum() and char != "'":
                        prefix += char
                    else:
                        break
                for char in reversed(orig):
                    if not char.isalnum() and char != "'":
                        suffix = char + suffix
                    else:
                        break
                w['word'] = f"{prefix}{replacement}{suffix}"
                
        # 2. Correct segments list text
        import re
        for seg in segments:
            for clean_word, replacement in corrections.items():
                pattern = re.compile(rf'\b{clean_word}\b', re.IGNORECASE)
                seg['text'] = pattern.sub(lambda match: replacement.title() if match.group(0).istitle() else (replacement.upper() if match.group(0).isupper() else replacement.lower()), seg['text'])
                
        # 3. Correct transcript string
        for clean_word, replacement in corrections.items():
            pattern = re.compile(rf'\b{clean_word}\b', re.IGNORECASE)
            transcript = pattern.sub(lambda match: replacement.title() if match.group(0).istitle() else (replacement.upper() if match.group(0).isupper() else replacement.lower()), transcript)
            
        return words, transcript, segments

    def process_video(self, url, num_clips, target_duration, topic=None, layout="vertical_crop", split_screen=False, movie_recap=False, quality="720p", yt_bypass=False, tts_voice="en-US-ChristopherNeural", tts_pitch="-20Hz", tts_rate="+0%", custom_range=None, add_bg_music=True, add_captions=True, hook_text=None, lyrc_promo=False, custom_range_filter=None, filter_profile='default', apply_exposure_flashes=False, apply_streamer_shake=False, facecam_pos='top_left', custom_file_name=None, auto_sfx=False, bg_music_vol=0.1, custom_crop_boxes=None, camera_style="smooth", transcription_language="auto", caption_y_pct=0.70, caption_style="capcut_yellow", custom_folder_name=None, output_dir=None, progress_callback=None):
        """
        Processes a YouTube video to generate viral clips.

        Args:
            url (str): The URL of the YouTube video.
            num_clips (int): The number of clips to generate.
            target_duration (int): The target duration of each clip.
            topic (str, optional): A specific topic or keyword to prioritize.
            layout (str, optional): The video layout ('vertical_crop' or 'landscape_fit').
                                    Defaults to 'vertical_crop'.
            split_screen (bool, optional): Whether to overlay a background video at the bottom.
                                           Defaults to False.
            movie_recap (bool, optional): Whether to generate an AI narration/voiceover explaining the scene.
                                          Defaults to False.
            quality (str, optional): The quality preset ('720p' or '1080p').
                                     Defaults to '720p'.

        Returns:
            tuple: A tuple containing a list of output file paths and the
                   title of the video.
        """
        active_range = None
        if os.path.isfile(url):
            if progress_callback: progress_callback("Loading local video...", 5)
            print(f"📂 Detected local file: {url}")
            video_path = Path(url)
            audio_path = None
            title = video_path.stem
            try:
                from moviepy.editor import VideoFileClip
                with VideoFileClip(str(video_path)) as clip:
                    duration = clip.duration
            except Exception as e:
                print(f"⚠️ Could not get duration from MoviePy: {e}")
                duration = 0
            print(f"✅ Loaded local file: {title} ({duration:.1f}s)")
        else:
            if progress_callback: progress_callback("Downloading video...", 5)
            print("📥 Downloading video...")
            
            # Pre-crop the video if a custom range is specified to save massive amounts of time
            active_range = custom_range if custom_range else custom_range_filter
            
            video_path, audio_path, title, duration = self.downloader.download(
                url, quality=quality, custom_range=active_range
            )
            print(f"✅ Download complete: {title} ({duration:.1f}s)")

        # If the video was pre-cropped by the downloader, shift timestamps to 0 to avoid double-cropping
        if active_range:
            r_start, r_end = active_range
            clip_len = r_end - r_start
            if custom_range:
                custom_range = [0.0, clip_len]
            if custom_range_filter:
                custom_range_filter = [0.0, clip_len]

        # (Global audio normalization has been removed to prevent ffmpeg from corrupting YouTube DASH MP4 headers. 
        #  We will normalize the audio natively using MoviePy later during the final clip construction.)

        # Determine language hint (force Chinese transcription if title contains Chinese characters)
        def contains_chinese(text):
            if not text:
                return False
            return any('\u4e00' <= char <= '\u9fff' for char in text)
            
        lang_hint = transcription_language if transcription_language and transcription_language != "auto" else None
        if not lang_hint and contains_chinese(title):
            lang_hint = "zh"
        
        import json
        video_stem = Path(video_path).name
        cache_path = TEMP_DIR / f"{video_stem}_whisper.json"
        
        if cache_path.exists():
            print("💾 Found cached Whisper transcription on disk. Skipping transcribing phase...")
            try:
                with open(cache_path, 'r', encoding='utf-8') as f_cache:
                    cache_data = json.load(f_cache)
                    words = cache_data.get('words', [])
                    transcript = cache_data.get('transcript', '')
                    segments = cache_data.get('segments', [])
                    
                if not words:
                    raise ValueError("Cached transcription is empty.")
            except Exception as e:
                print(f"⚠️ Could not load transcript cache ({e}). Re-transcribing...")
                transcribe_path = audio_path if audio_path else video_path
                words, transcript, segments = self.transcriber.transcribe(transcribe_path, language=lang_hint)
        else:
            if progress_callback: progress_callback("Starting transcription with Whisper...", 20)
            print("🎵 Starting transcription with Whisper...")
            transcribe_path = audio_path if audio_path else video_path
            words, transcript, segments = self.transcriber.transcribe(transcribe_path, language=lang_hint)
            try:
                cache_data = {
                    'words': words,
                    'transcript': transcript,
                    'segments': segments
                }
                with open(cache_path, 'w', encoding='utf-8') as f_cache:
                    json.dump(cache_data, f_cache, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"⚠️ Could not write transcript cache: {e}")
        print(f"✅ Transcription processing complete")
        
        if progress_callback: progress_callback("Applying smart transcription corrections...", 35)
        # Apply custom word-mapping corrections vocabulary to fix accent mishearings (e.g. Ceasar -> Scissor)
        words, transcript, segments = self.correct_transcription_vocabulary(words, transcript, segments)

        # Apply custom range filter to transcription segments if provided
        if custom_range_filter is not None:
            r_start, r_end = custom_range_filter
            print(f"📐 Restricting highlight search to custom range: {r_start:.1f}s to {r_end:.1f}s...")
            segments = [seg for seg in segments if seg['start'] >= r_start and seg['end'] <= r_end]
            # Also scale down virtual video duration for AI context purposes
            duration = r_end - r_start

        # Phase 1: Global Video Inspection (for Recaps)
        global_analysis = ""
        if movie_recap:
            print("\n🔍 Phase 1: Performing Global Video Inspection...")
            try:
                inspect_frames = []
                num_inspect = 8
                import numpy as np
                inspect_offsets = np.linspace(0.1, 0.9, num_inspect)
                
                with VideoFileClip(str(video_path)) as video:
                    for offset in inspect_offsets:
                        t_frame = duration * offset
                        frame_rgb = video.get_frame(t_frame)
                        from PIL import Image
                        pil_img = Image.fromarray(frame_rgb)
                        pil_img.thumbnail((512, 512))
                        inspect_frames.append(pil_img)
                        
                global_analysis = self.ai_selector.inspect_video_content(inspect_frames, title)
                print("✅ Video Inspection Report:")
                print(global_analysis)
                print()
            except Exception as inspect_err:
                print(f"⚠️ Video inspection failed: {inspect_err}. Continuing with standard script generation.")

        if custom_range is not None:
            start_time, end_time = custom_range
            # Ensure boundaries are within video duration
            start_time = max(0.0, min(duration, start_time))
            end_time = max(start_time, min(duration, end_time))
            clip_dur = end_time - start_time
            
            print(f"🎬 Custom Range selected. Slicing from {start_time:.1f}s to {end_time:.1f}s...")
            clip_specs = [{
                'start': start_time,
                'end': end_time,
                'title': f'Custom Range recap ({start_time:.1f}s - {end_time:.1f}s)',
                'virality_score': 100,
                'hook_type': 'recap',
                'duration': clip_dur,
                'content_title': f"{title} Highlight Explained 🍿",
                'content_description': f"Here is the recap of '{title}' custom scene! #recap #movie #cinema #explained"
            }]
            print(f"✅ Generated custom range spec ({clip_dur:.1f}s)")
        elif target_duration == -1:
            print("🎬 Entire Video selected. Creating one single recap clip of the full duration...")
            clip_specs = [{
                'start': 0.0,
                'end': duration,
                'title': 'Full Story Recap',
                'virality_score': 100,
                'hook_type': 'recap',
                'duration': duration,
                'content_title': f"{title} Explained 🍿",
                'content_description': f"Here is the complete story recap of '{title}'! #recap #movie #cinema #explained"
            }]
            print(f"✅ Generated full video spec ({duration:.1f}s)")
        elif lyrc_promo:
            print("🧠 Using AI to select the best visual highlights for a fast-paced montage...")
            montage_segments = self.ai_selector.select_montage_clips(
                segments, duration, target_duration=target_duration
            )
            clip_specs = [{
                'start': montage_segments[0]['start'] if montage_segments else 0.0,
                'end': montage_segments[-1]['end'] if montage_segments else duration,
                'title': f'Viral Promo Montage (Lyrc Style)',
                'virality_score': 98,
                'hook_type': 'montage',
                'duration': target_duration,
                'montage_segments': montage_segments,
                'content_title': f"This edit is absolute fire! 🎧🔥",
                'content_description': f"Check out this visual compilation! #promo #music #edit #fire"
            }]
            print(f"✅ Generated montage spec with {len(montage_segments)} visual scene cuts")
        elif not segments:
            print("❌ Transcription failed. Using random clips.")
            print("🎲 Generating random clips...")
            clip_specs = generate_random_clips(duration, num_clips, max(5, target_duration - 5), target_duration + 5)
            print(f"✅ Generated {len(clip_specs)} random clips")
        else:
            if progress_callback: progress_callback("Using AI to select the most viral clips...", 40)
            print("🧠 Using AI to select the most viral clips...")
            clip_specs = self.ai_selector.select_clips(
                segments, duration, num_clips, target_duration, topic=topic
            )
            print(f"✅ AI selected {len(clip_specs)} viral clips")

        if not clip_specs:
            raise ValueError("Could not select any clips from the video.")

        output_files = []
        if caption_style and caption_style in self.caption_maker.styles:
            self.caption_maker.selected_style = caption_style

        # Determine target export directory
        if output_dir:
            target_dir = Path(output_dir)
        elif custom_folder_name:
            clean_folder = "".join(c for c in custom_folder_name if c.isalnum() or c in (' ', '_', '-', '.')).strip()
            target_dir = OUTPUT_DIR / clean_folder if clean_folder else OUTPUT_DIR
        else:
            target_dir = OUTPUT_DIR
        target_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n🎬 Processing {len(clip_specs)} viral clips (Saved to: {target_dir}, Caption style: {self.caption_maker.selected_style}, y_pct: {caption_y_pct})...")

        for i, clip_info in enumerate(clip_specs, 1):
            start = clip_info['start']
            end = clip_info['end']
            title_text = clip_info.get('title', f'Clip {i}')
            virality_score = clip_info.get('virality_score', 0)

            print(f"\n📹 Clip {i}/{len(clip_specs)}: {title_text}")
            print(f"    ⭐ Virality Score: {virality_score}/100")
            print(f"    ⏱️  Time: {start:.1f}s to {end:.1f}s")
            print(f"    🎨 Caption Style: {self.caption_maker.styles[self.caption_maker.selected_style]['name']}")

            clips_to_close = []
            try:
                with VideoFileClip(str(video_path)) as video:

                    # Bind audio track on-the-fly for adaptive downloads
                    if audio_path:
                        audio_clip = AudioFileClip(str(audio_path))
                        video = video.set_audio(audio_clip)
                        clips_to_close.append(audio_clip)
                        clips_to_close.append(video)

                    # Sync video and audio durations to prevent out-of-bounds frame access crashes
                    # Subtracting 0.5 seconds buffer prevents container duration mismatches where audio packets end early
                    if video.audio is not None:
                        safe_duration = max(1.0, min(video.duration, video.audio.duration) - 0.5)
                        print(f"    📏 Adjusting source video duration from {video.duration:.2f}s to safe audio limit: {safe_duration:.2f}s")
                        video = video.subclip(0, safe_duration)
                        clips_to_close.append(video)
                        
                    # Clamp clip boundaries to the source video's safe duration
                    start = max(0.0, min(video.duration, start))
                    end = max(start, min(video.duration, end))

                    # Create the subclip or generate the AI movie recap narration
                    if movie_recap:
                        print("    🎙️  Generating AI Movie Summarizer script...")
                        # Extract the text of this clip segment
                        # Extract the text and segment timestamps of this clip segment (relative to clip start)
                        clip_segments = [seg for seg in segments if seg['start'] >= start and seg['end'] <= end]
                        clip_text_parts = []
                        for seg in clip_segments:
                            start_rel = max(0.0, seg['start'] - start)
                            end_rel = min(end - start, seg['end'] - start)
                            clip_text_parts.append(f"[{start_rel:.1f}s - {end_rel:.1f}s]: {seg['text']}")
                        clip_text = "\n".join(clip_text_parts) if clip_text_parts else "No spoken dialogue in this segment."
                        
                        # Extract frames from the clip dynamically based on clip duration
                        visual_frames = []
                        try:
                            clip_dur = end - start
                            if clip_dur <= 30:
                                num_frames = 3
                            elif clip_dur <= 60:
                                num_frames = 6
                            else:
                                # Sample 1 frame every 12 seconds of duration, up to 80 frames maximum
                                num_frames = min(80, max(8, int(clip_dur / 12)))
                                
                            print(f"    🎨 Extracting {num_frames} visual frames for multimodal AI sight...")
                            import numpy as np
                            sample_offsets = np.linspace(0.1, 0.9, num_frames)
                            for offset in sample_offsets:
                                t_frame = start + clip_dur * offset
                                # Get frame in RGB format
                                frame_rgb = video.get_frame(t_frame)
                                from PIL import Image
                                pil_img = Image.fromarray(frame_rgb)
                                # Resize image to 512px max dimension to speed up API transfer
                                pil_img.thumbnail((512, 512))
                                visual_frames.append(pil_img)
                            print(f"    ✅ Extracted {len(visual_frames)} frames successfully")
                        except Exception as frame_err:
                            print(f"    ⚠️ Could not extract frames for AI sight: {frame_err}")

                        script_cache_path = TEMP_DIR / f"{video_stem}_recap_{start:.1f}_{end:.1f}.txt"
                        if script_cache_path.exists():
                            print("    💾 Found cached Gemini recap script on disk. Skipping script generation...")
                            try:
                                with open(script_cache_path, 'r', encoding='utf-8') as f_script:
                                    recap_script_raw = f_script.read()
                            except Exception as e:
                                print(f"    ⚠️ Could not load script cache: {e}. Re-generating...")
                                recap_script_raw = self.ai_selector.generate_recap_script(
                                    clip_text, 
                                    end - start, 
                                    visual_frames=visual_frames, 
                                    video_title=title,
                                    global_analysis=global_analysis
                                )
                        else:
                            recap_script_raw = self.ai_selector.generate_recap_script(
                                clip_text, 
                                end - start, 
                                visual_frames=visual_frames, 
                                video_title=title,
                                global_analysis=global_analysis
                            )
                            try:
                                with open(script_cache_path, 'w', encoding='utf-8') as f_script:
                                    f_script.write(recap_script_raw)
                            except Exception as e:
                                print(f"    ⚠️ Could not write script cache: {e}")
                        
                        # Parse the scene list from raw JSON response
                        recap_scenes = []
                        try:
                            import json
                            import re
                            cleaned_response = recap_script_raw.strip()
                            json_match = re.search(r'\{.*\}|\[.*\]', cleaned_response, re.DOTALL)
                            if json_match:
                                parsed = json.loads(json_match.group(0))
                                if isinstance(parsed, dict) and 'scenes' in parsed:
                                    recap_scenes = parsed['scenes']
                                elif isinstance(parsed, list):
                                    recap_scenes = parsed
                            
                            if not recap_scenes or not isinstance(recap_scenes, list):
                                raise ValueError("Invalid scenes list format")
                                
                            # Sort recap_scenes chronologically by start time to make timeline queuing perfect
                            if all(isinstance(s, dict) for s in recap_scenes):
                                try:
                                    recap_scenes.sort(key=lambda x: float(x.get('start', 0.0)))
                                except Exception as sort_err:
                                    print(f"    ⚠️ Could not sort recap scenes: {sort_err}")
                        except Exception as parse_err:
                            print(f"    ⚠️ Failed to parse scene JSON ({parse_err}). Falling back to single-track recap.")
                            
                            # Try to extract only the narration fields from the raw text via regex
                            import re
                            # Match narration keys and extract string contents (supporting escaped characters)
                            narrations = re.findall(r'"narration"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', cleaned_response)
                            if narrations:
                                import codecs
                                try:
                                    fallback_text = " ".join([codecs.escape_decode(bytes(n, "utf-8"))[0].decode("utf-8") for n in narrations])
                                except Exception:
                                    fallback_text = " ".join(narrations)
                            else:
                                fallback_text = recap_script_raw
                                
                            # Clean out any remaining JSON structural clutter and backslashes
                            fallback_text = re.sub(r'["\{\}\[\]\\]', '', fallback_text)
                            fallback_text = re.sub(r'\b(scenes|start|end|narration)\b', '', fallback_text, flags=re.IGNORECASE)
                            fallback_text = re.sub(r'\s+', ' ', fallback_text).strip()
                            
                            # Fallback: create a single scene covering the entire duration
                            recap_scenes = [{
                                'start': start,
                                'end': end,
                                'narration': fallback_text
                            }]

                        # Set up clip boundaries
                        clip_dur = end - start
                        clip = video.subclip(start, end)
                        if clip.audio:
                            try:
                                from moviepy.audio.fx.all import audio_normalize
                                clip = clip.set_audio(audio_normalize(clip.audio))
                            except Exception as norm_err:
                                print(f"    ⚠️ Failed to normalize clip audio natively: {norm_err}")
                        clips_to_close.append(clip)
                        
                        # Generate TTS audio for each scene block
                        print(f"    🔊 Generating Segmented Text-to-Speech voiceovers ({tts_voice})...")
                        voiceover_clips = []
                        all_tts_words = []
                        last_voiceover_end = 0.0
                        
                        for idx, scene in enumerate(recap_scenes):
                            if isinstance(scene, str):
                                # If it's a list of strings, reconstruct start/end based on simple segment distribution
                                segment_dur = clip_dur / len(recap_scenes)
                                scene_text = scene
                                relative_start = idx * segment_dur
                                scene_end = relative_start + segment_dur
                            elif isinstance(scene, dict):
                                scene_start = scene.get('start', 0.0)
                                scene_end = scene.get('end', end)
                                scene_text = scene.get('narration', '')
                                
                                # Convert absolute scene timestamps to relative clip offsets
                                if scene_start >= start:
                                    relative_start = scene_start - start
                                else:
                                    relative_start = scene_start
                            else:
                                continue
                                
                            # Prevent overlapping narration tracks by starting the next scene after the previous finishes
                            relative_start = max(last_voiceover_end, relative_start)
                                
                            # Clamp relative start to avoid out of bounds exceptions
                            relative_start = max(0.0, min(clip_dur - 1.0, relative_start))
                            
                            # Clean any residual double quotes, curly brackets, brackets, or backslashes to prevent literal speech issues
                            import re
                            scene_text = re.sub(r'["\{\}\[\]\\]', '', scene_text)
                            scene_text = re.sub(r'\s+', ' ', scene_text).strip()
                            
                            if not scene_text:
                                continue
                                
                            # Sanitize parameters to create a safe unique filename for caching
                            voice_safe = re.sub(r'[^a-zA-Z0-9]', '', tts_voice)
                            pitch_safe = re.sub(r'[^a-zA-Z0-9\-+]', '', tts_pitch)
                            rate_safe = re.sub(r'[^a-zA-Z0-9\-+]', '', tts_rate)
                            scene_tts_filename = f"{video_stem}_recap_{i}_{idx}_{voice_safe}_{pitch_safe}_{rate_safe}.mp3"
                            scene_tts_path = TEMP_DIR / scene_tts_filename
                            
                            if scene_tts_path.exists():
                                print(f"    💾 Found cached voiceover for scene {idx}. Reusing...")
                            else:
                                try:
                                    import asyncio
                                    import edge_tts
                                    async def generate_voice():
                                        communicate = edge_tts.Communicate(scene_text, tts_voice, pitch=tts_pitch, rate=tts_rate)
                                        await communicate.save(str(scene_tts_path))
                                    asyncio.run(generate_voice())
                                except Exception as tts_err:
                                    print(f"    ⚠️ edge-tts failed for block {idx} ({tts_err}). Falling back to robotic gTTS...")
                                    from gtts import gTTS
                                    tts = gTTS(text=scene_text, lang='en')
                                    tts.save(str(scene_tts_path))
                                
                            scene_audio = AudioFileClip(str(scene_tts_path))
                            clips_to_close.append(scene_audio)
                            
                            # Position this voiceover segment in the clip timeline
                            scene_audio_positioned = scene_audio.set_start(relative_start)
                            clips_to_close.append(scene_audio_positioned)
                            voiceover_clips.append(scene_audio_positioned)
                            
                            # Update the end of the previous voiceover to prevent overlapping
                            last_voiceover_end = relative_start + scene_audio.duration
                            
                            # Transcribe this specific block and shift the timestamps to align on the timeline
                            try:
                                scene_words, _, _ = self.transcriber.transcribe(str(scene_tts_path))
                                for w in scene_words:
                                    all_tts_words.append({
                                        'word': w['word'],
                                        'start': relative_start + w['start'],
                                        'end': relative_start + w['end']
                                    })
                            except Exception as trans_err:
                                print(f"    ⚠️ Transcription warning for scene {idx}: {trans_err}")
                        
                        words = all_tts_words
                        
                        # Blend the original video audio (constant ducking to prevent MoviePy subclip glitches) with the TTS voiceovers
                        if clip.audio and voiceover_clips:
                            # Filter out voiceover clips that start beyond the clip duration
                            voiceover_clips = [v for v in voiceover_clips if v.start < clip.duration]
                            
                            # Keep original audio at a constant low background level
                            # We don't want it overpowering the voiceover
                            bg_audio = clip.audio.volumex(min(0.2, bg_music_vol))
                            clips_to_close.append(bg_audio)
                            
                            # Layer the voiceover clips on top
                            from moviepy.editor import CompositeAudioClip
                            final_audio = CompositeAudioClip([bg_audio] + voiceover_clips)
                            clips_to_close.append(final_audio)
                            clip = clip.set_audio(final_audio)
                        elif voiceover_clips:
                            from moviepy.editor import CompositeAudioClip
                            final_audio = CompositeAudioClip(voiceover_clips)
                            clips_to_close.append(final_audio)
                            clip = clip.set_audio(final_audio)
                            
                        # Reset start to 0 for caption placement, since captions match the voiceover starting at 0
                        start = 0

                        # Check for custom ambient background music for recaps (suspense / horror pads)
                        bg_music_dir = Path("./bg_music")
                        bg_music_dir.mkdir(exist_ok=True)
                        bg_music_files = list(bg_music_dir.glob("*.mp3")) + list(bg_music_dir.glob("*.wav"))
                        
                        if add_bg_music and bg_music_files:
                            bg_music_file = random.choice(bg_music_files)
                            print(f"    🎵 Adding ambient background music: {bg_music_file.name}")
                            try:
                                bg_music = AudioFileClip(str(bg_music_file)).volumex(bg_music_vol * 0.4) # soften volume for recaps
                                
                                # Loop the music to match the clip duration
                                from moviepy.audio.fx.audio_loop import audio_loop
                                bg_music_looped = audio_loop(bg_music, duration=clip.duration)
                                
                                clips_to_close.append(bg_music)
                                clips_to_close.append(bg_music_looped)
                                
                                # Layer the looped background music into the final clip audio
                                if clip.audio:
                                    clip_with_bg = CompositeAudioClip([clip.audio, bg_music_looped])
                                    clip = clip.set_audio(clip_with_bg)
                                    clips_to_close.append(clip_with_bg)
                                else:
                                    clip = clip.set_audio(bg_music_looped)
                                print("    ✅ Ambient background music blended successfully")
                            except Exception as bg_err:
                                print(f"    ⚠️ Failed to apply background music: {bg_err}")
                            

                    else:
                        if lyrc_promo and 'montage_segments' in clip_info:
                            print("    🎬 Preparing visual montage cuts synchronized with music beats...")
                            
                            # 1. Prepare continuous audio track first to run beat detection
                            bg_music_dir = Path("./bg_music")
                            bg_music_files = list(bg_music_dir.glob("*.mp3")) + list(bg_music_dir.glob("*.wav"))
                            target_montage_dur = len(clip_info['montage_segments']) * 2.0
                            
                            if add_bg_music and bg_music_files:
                                bg_music_file = random.choice(bg_music_files)
                                print(f"    🎵 Loading background music for beat detection: {bg_music_file.name}")
                                try:
                                    bg_audio = AudioFileClip(str(bg_music_file)).volumex(min(1.0, bg_music_vol * 3.5))
                                    from moviepy.audio.fx.audio_loop import audio_loop
                                    continuous_audio = audio_loop(bg_audio, duration=target_montage_dur)
                                    clips_to_close.extend([bg_audio, continuous_audio])
                                except Exception as audio_err:
                                    print(f"    ⚠️ Failed to load high-energy music: {audio_err}")
                                    bg_audio_path = audio_path if audio_path else video_path
                                    continuous_audio = AudioFileClip(str(bg_audio_path)).subclip(start, min(duration, start + target_montage_dur))
                                    try:
                                        from moviepy.audio.fx.all import audio_normalize
                                        continuous_audio = audio_normalize(continuous_audio)
                                    except Exception: pass
                                    clips_to_close.append(continuous_audio)
                            else:
                                bg_audio_path = audio_path if audio_path else video_path
                                continuous_audio = AudioFileClip(str(bg_audio_path)).subclip(start, min(duration, start + target_montage_dur))
                                try:
                                    from moviepy.audio.fx.all import audio_normalize
                                    continuous_audio = audio_normalize(continuous_audio)
                                except Exception: pass
                                clips_to_close.append(continuous_audio)
                                
                            # 2. Detect drum beats / drops on the continuous audio track
                            print("    🥁 Analyzing music track to detect beat drops...")
                            num_cuts = len(clip_info['montage_segments'])
                            beat_timestamps = self.detect_beats(continuous_audio, continuous_audio.duration, num_cuts=num_cuts)
                            print(f"    ✅ Detected {len(beat_timestamps)} strong beats: {[f'{t:.2f}s' for t in beat_timestamps]}")
                            
                            # Construct visual cut points on the timeline
                            cut_points = [0.0] + beat_timestamps + [continuous_audio.duration]
                            
                            # 3. Slice and speed-ramp visual clips to sync with beat intervals
                            subclips = []
                            for seg_idx, seg in enumerate(clip_info['montage_segments']):
                                seg_start = seg['start']
                                seg_end = seg['end']
                                
                                # Target duration of this visual segment in the timeline
                                target_seg_dur = cut_points[seg_idx + 1] - cut_points[seg_idx]
                                
                                # Crop a source visual clip slightly longer (e.g. target_seg_dur * 1.5) to allow speed ramping
                                subclip = video.subclip(seg_start, min(duration, seg_start + target_seg_dur * 1.5))
                                
                                # Apply CapCut Velocity speed ramp synchronized to beat duration
                                try:
                                    from moviepy.video.fx.speedx import speedx
                                    ramp_start_dur = min(subclip.duration, 0.4)
                                    part1 = subclip.subclip(0.0, ramp_start_dur)
                                    part1_speed = speedx(part1, 2.5)
                                    part1_played = ramp_start_dur / 2.5
                                    
                                    remaining_target = target_seg_dur - part1_played
                                    if remaining_target > 0.05 and subclip.duration > ramp_start_dur:
                                        part2 = subclip.subclip(ramp_start_dur, subclip.duration)
                                        # Calculate exact speed multiplier to fit the remaining beat duration
                                        speed_mult = max(0.2, part2.duration / remaining_target)
                                        part2_speed = speedx(part2, speed_mult)
                                        part2_speed.duration = remaining_target
                                        
                                        subclip_ramped = concatenate_videoclips([part1_speed, part2_speed], method="compose")
                                        clips_to_close.extend([part1_speed, part2_speed, subclip_ramped])
                                        subclip = subclip_ramped
                                    else:
                                        clips_to_close.append(part1_speed)
                                        subclip = part1_speed
                                        subclip.duration = target_seg_dur
                                except Exception as ramp_err:
                                    print(f"    ⚠️ Failed to apply velocity speed ramp: {ramp_err}")
                                    subclip.duration = target_seg_dur
                                
                                # Apply white exposure beat flash at start of subclip if configured
                                if apply_exposure_flashes:
                                    try:
                                        flash_dur = 0.12
                                        white_flash = ColorClip(size=video.size, color=(255, 255, 255), duration=flash_dur)
                                        white_flash = white_flash.fadeout(flash_dur)
                                        
                                        subclip_flashed = CompositeVideoClip([subclip, white_flash.set_start(0.0)])
                                        subclip_flashed.duration = subclip.duration
                                        
                                        clips_to_close.append(white_flash)
                                        clips_to_close.append(subclip_flashed)
                                        subclip = subclip_flashed
                                    except Exception as flash_err:
                                        print(f"    ⚠️ Failed to apply exposure flash: {flash_err}")
                                        
                                subclips.append(subclip)
                                clips_to_close.append(subclip)
                            
                            clip = concatenate_videoclips(subclips, method="compose")
                            clips_to_close.append(clip)
                            clip = clip.set_audio(continuous_audio)
                        else:
                            clip = video.subclip(start, end)
                            if clip.audio:
                                try:
                                    from moviepy.audio.fx.all import audio_normalize
                                    clip = clip.set_audio(audio_normalize(clip.audio))
                                except Exception as norm_err:
                                    print(f"    ⚠️ Failed to normalize clip audio natively: {norm_err}")
                            clips_to_close.append(clip)

                    if filter_profile and filter_profile != 'default':
                        try:
                            print(f"    🎨 Applying cinematic color grade profile: '{filter_profile}' (LUT optimized)...")
                            import numpy as np
                            
                            if filter_profile == 'manga_ink':
                                lut_manga = np.clip(128.0 + 2.2 * (np.arange(256) - 128.0), 0, 255).astype(np.uint8)
                                def color_grade(image):
                                    gray = (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]).astype(np.uint8)
                                    manga_gray = lut_manga[gray]
                                    graded = np.empty_like(image)
                                    graded[:, :, 0] = np.clip(manga_gray * 1.12, 0, 255).astype(np.uint8)
                                    graded[:, :, 1] = np.clip(manga_gray * 0.90, 0, 255).astype(np.uint8)
                                    graded[:, :, 2] = np.clip(manga_gray * 0.96, 0, 255).astype(np.uint8)
                                    return graded
                                    
                            elif filter_profile == 'dark_cyberpunk':
                                lut_r = np.clip(128.0 + 1.35 * (np.arange(256) * 0.72 - 128.0), 0, 255).astype(np.uint8)
                                lut_g = np.clip(128.0 + 1.35 * (np.arange(256) * 0.95 - 128.0), 0, 255).astype(np.uint8)
                                lut_b = np.clip(128.0 + 1.35 * (np.arange(256) * 1.32 - 128.0), 0, 255).astype(np.uint8)
                                def color_grade(image):
                                    graded = np.empty_like(image)
                                    graded[:, :, 0] = lut_r[image[:, :, 0]]
                                    graded[:, :, 1] = lut_g[image[:, :, 1]]
                                    graded[:, :, 2] = lut_b[image[:, :, 2]]
                                    return graded
                                    
                            elif filter_profile == 'sunset_gold':
                                lut_r = np.clip(128.0 + 1.15 * (np.arange(256) * 1.25 - 128.0), 0, 255).astype(np.uint8)
                                lut_g = np.clip(128.0 + 1.15 * (np.arange(256) * 1.06 - 128.0), 0, 255).astype(np.uint8)
                                lut_b = np.clip(128.0 + 1.15 * (np.arange(256) * 0.78 - 128.0), 0, 255).astype(np.uint8)
                                def color_grade(image):
                                    graded = np.empty_like(image)
                                    graded[:, :, 0] = lut_r[image[:, :, 0]]
                                    graded[:, :, 1] = lut_g[image[:, :, 1]]
                                    graded[:, :, 2] = lut_b[image[:, :, 2]]
                                    return graded
                                    
                            elif filter_profile == 'sigma_hdr':
                                def color_grade(image):
                                    import cv2
                                    blurred = cv2.GaussianBlur(image, (0, 0), 2.0)
                                    sharpened = cv2.addWeighted(image, 1.5, blurred, -0.5, 0)
                                    hsv = cv2.cvtColor(sharpened, cv2.COLOR_RGB2HSV).astype(np.float32)
                                    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.35, 0, 255)
                                    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * 1.05, 0, 255)
                                    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
                                    
                            else:
                                lut_r = np.clip(128.0 + 1.2 * (np.arange(256) * 0.88 - 128.0), 0, 255).astype(np.uint8)
                                lut_g = np.clip(128.0 + 1.2 * (np.arange(256) * 1.02 - 128.0), 0, 255).astype(np.uint8)
                                lut_b = np.clip(128.0 + 1.2 * (np.arange(256) * 1.12 - 128.0), 0, 255).astype(np.uint8)
                                def color_grade(image):
                                    graded = np.empty_like(image)
                                    graded[:, :, 0] = lut_r[image[:, :, 0]]
                                    graded[:, :, 1] = lut_g[image[:, :, 1]]
                                    graded[:, :, 2] = lut_b[image[:, :, 2]]
                                    return graded
                                    
                            clip = clip.fl_image(color_grade)
                            clips_to_close.append(clip)
                        except Exception as grade_err:
                            print(f"    ⚠️ Failed to apply cinematic color grade: {grade_err}")

                    # Determine target dimensions based on layout choice
                    if layout == "landscape":
                        target_width = video.w
                        target_height = video.h
                        # Force even dimensions for H.264 encoder compatibility
                        if target_width % 2 != 0:
                            target_width -= 1
                        if target_height % 2 != 0:
                            target_height -= 1
                    else:
                        # Determine standard vertical dimensions based on chosen quality preset
                        if quality == "720p":
                            target_height = 1280
                        elif quality == "1080p":
                            target_height = 1920
                        elif quality in ["4k", "8k"]:
                            target_height = 3840
                        else:
                            target_height = 1280 if video.h <= 720 else 1920

                        target_width = int(target_height * 9 / 16)
                        # Ensure both are divisible by 2
                        if target_width % 2 != 0:
                            target_width -= 1
                        if target_height % 2 != 0:
                            target_height -= 1

                    if layout == "gameplay_bg":
                        print("    🎮 Replacing visual stream with satisfying gameplay background...")
                        bg_files = list(BACKGROUNDS_DIR.glob("*.mp4"))
                        if bg_files:
                            bg_file = random.choice(bg_files)
                            print(f"    🎮 Loading gameplay background: {bg_file.name}")
                            try:
                                bg_video = VideoFileClip(str(bg_file))
                                clips_to_close.append(bg_video)
                                
                                bg_video_muted = bg_video.without_audio()
                                clips_to_close.append(bg_video_muted)
                                
                                if bg_video_muted.duration > clip.duration:
                                    max_start = max(0.0, bg_video_muted.duration - clip.duration - 2.0)
                                    start_bg = random.uniform(0.0, max_start)
                                    gameplay_clip = bg_video_muted.subclip(start_bg, start_bg + clip.duration)
                                    clips_to_close.append(gameplay_clip)
                                else:
                                    gameplay_clip = bg_video_muted
                                    
                                bg_crop_width = int(gameplay_clip.h * 9 / 16)
                                if bg_crop_width % 2 != 0:
                                    bg_crop_width -= 1
                                bg_left = max(0, min(gameplay_clip.w - bg_crop_width, gameplay_clip.w // 2 - bg_crop_width // 2))
                                gameplay_clip = gameplay_clip.crop(x1=bg_left, width=bg_crop_width)
                                clips_to_close.append(gameplay_clip)
                                
                                gameplay_clip = gameplay_clip.resize((target_width, target_height))
                                clips_to_close.append(gameplay_clip)
                                
                                if clip.audio is not None:
                                    gameplay_clip = gameplay_clip.set_audio(clip.audio)
                                    
                                clip = gameplay_clip
                            except Exception as gameplay_err:
                                print(f"    ⚠️ Failed to apply gameplay background: {gameplay_err}. Falling back to default visuals.")
                        else:
                            print("    ⚠️ No satisfying gameplay videos found in satisfying_bg folder! Falling back to original visuals.")

                    if layout == "streamer_cam":
                        print(f"    📷 Auto-locating streamer facecam from {facecam_pos} corner...")
                        try:
                            # 1. Scan the first 30 frames to locate the streamer's face
                            W, H = clip.w, clip.h
                            face_x, face_y = None, None
                            face_coords = []
                            
                            if facecam_pos == "top_right":
                                quad_x1, quad_y1, quad_x2, quad_y2 = W // 2, 0, W, H // 2
                            elif facecam_pos == "bottom_left":
                                quad_x1, quad_y1, quad_x2, quad_y2 = 0, H // 2, W // 2, H
                            elif facecam_pos == "bottom_right":
                                quad_x1, quad_y1, quad_x2, quad_y2 = W // 2, H // 2, W, H
                            else: # top_left
                                quad_x1, quad_y1, quad_x2, quad_y2 = 0, 0, W // 2, H // 2
                                
                            step = max(0.1, clip.duration / 30.0)
                            for frame_idx in range(30):
                                t = frame_idx * step
                                if t >= clip.duration:
                                    break
                                frame = clip.get_frame(t)
                                quad_frame = frame[quad_y1:quad_y2, quad_x1:quad_x2]
                                
                                detected = self.face_tracker.detect_faces_in_frame(quad_frame)
                                if detected:
                                    largest = max(detected, key=lambda f: f['area'])
                                    global_x = quad_x1 + largest['center_x']
                                    global_y = quad_y1 + largest['center_y']
                                    face_coords.append((global_x, global_y))
                                    
                            if face_coords:
                                face_coords = np.array(face_coords)
                                face_x = int(np.median(face_coords[:, 0]))
                                face_y = int(np.median(face_coords[:, 1]))
                                print(f"    🎯 Streamer face successfully detected at (x: {face_x}, y: {face_y})")
                                
                            # 2. Determine crop dimensions matching 9:8 aspect ratio for top half
                            crop_h = int(H * 0.45)
                            crop_w = int(crop_h * 9 / 8)
                            
                            if crop_w > W or crop_h > H:
                                scale = min(W / crop_w, H / crop_h)
                                crop_w = int(crop_w * scale)
                                crop_h = int(crop_h * scale)
                                
                            if crop_w % 2 != 0:
                                crop_w -= 1
                            if crop_h % 2 != 0:
                                crop_h -= 1
                                
                            if face_x is not None and face_y is not None:
                                x1 = max(0, min(W - crop_w, face_x - crop_w // 2))
                                y1 = max(0, min(H - crop_h, face_y - crop_h // 2))
                            else:
                                print("    ⚠️ Streamer face not detected. Falling back to default corner crop.")
                                if facecam_pos == "top_right":
                                    x1, y1 = W - crop_w, 0
                                elif facecam_pos == "bottom_left":
                                    x1, y1 = 0, H - crop_h
                                elif facecam_pos == "bottom_right":
                                    x1, y1 = W - crop_w, H - crop_h
                                else: # top_left
                                    x1, y1 = 0, 0
                                    
                            x2, y2 = x1 + crop_w, y1 + crop_h
                            
                            face_cam = clip.crop(x1=x1, y1=y1, x2=x2, y2=y2)
                            top_half = face_cam.resize((target_width, target_height // 2))
                            clips_to_close.append(face_cam)
                            clips_to_close.append(top_half)
                            
                            # 3. Determine crop dimensions matching 9:8 aspect ratio for bottom half (gameplay)
                            gameplay_h = H
                            gameplay_w = int(H * 9 / 8)
                            if gameplay_w > W:
                                gameplay_w = W
                                gameplay_h = int(W * 8 / 9)
                                
                            if gameplay_w % 2 != 0:
                                gameplay_w -= 1
                            if gameplay_h % 2 != 0:
                                gameplay_h -= 1
                                
                            game_x1 = max(0, min(W - gameplay_w, W // 2 - gameplay_w // 2))
                            game_y1 = max(0, min(H - gameplay_h, H // 2 - gameplay_h // 2))
                            
                            game_clip = clip.crop(x1=game_x1, y1=game_y1, width=gameplay_w, height=gameplay_h)
                            bottom_half = game_clip.resize((target_width, target_height // 2))
                            clips_to_close.extend([game_clip, bottom_half])
                            
                            clip = CompositeVideoClip([
                                top_half.set_position((0, 0)),
                                bottom_half.set_position((0, target_height // 2))
                            ], size=(target_width, target_height))
                            clips_to_close.append(clip)
                        except Exception as cam_err:
                            print(f"    ⚠️ Failed to apply facecam split-screen: {cam_err}. Falling back to default layout.")

                    if layout == "custom_split":
                        print("    ✂️ Applying manual custom split using user-provided coordinates...")
                        try:
                            if not custom_crop_boxes or len(custom_crop_boxes) < 2:
                                raise ValueError("Missing custom crop coordinates for split screen.")
                                
                            W, H = clip.w, clip.h
                            box1 = custom_crop_boxes.get('top', {})
                            box2 = custom_crop_boxes.get('bottom', {})
                            
                            x1, y1, w1, h1 = float(box1.get('x', 0)), float(box1.get('y', 0)), float(box1.get('width', 100)), float(box1.get('height', 100))
                            x2, y2, w2, h2 = float(box2.get('x', 0)), float(box2.get('y', 50)), float(box2.get('width', 100)), float(box2.get('height', 50))
                            
                            # Convert percentages to absolute pixels
                            crop1 = clip.crop(
                                x1=int(x1 * W / 100), 
                                y1=int(y1 * H / 100), 
                                width=int(w1 * W / 100), 
                                height=int(h1 * H / 100)
                            )
                            # Helper to resize without stretching (letterbox)
                            def letterbox(c, max_w, max_h):
                                ratio = min(max_w / float(c.w), max_h / float(c.h))
                                resized = c.resize(ratio)
                                return CompositeVideoClip([resized.set_position("center")], size=(max_w, max_h)).set_duration(c.duration)
                                
                            top_half = letterbox(crop1, target_width, target_height // 2)
                            clips_to_close.extend([crop1, top_half])
                            
                            crop2 = clip.crop(
                                x1=int(x2 * W / 100), 
                                y1=int(y2 * H / 100), 
                                width=int(w2 * W / 100), 
                                height=int(h2 * H / 100)
                            )
                            bottom_half = letterbox(crop2, target_width, target_height // 2)
                            clips_to_close.extend([crop2, bottom_half])
                            
                            clip = CompositeVideoClip([
                                top_half.set_position((0, 0)),
                                bottom_half.set_position((0, target_height // 2))
                            ], size=(target_width, target_height))
                            clips_to_close.append(clip)
                            active_split_screen = True
                        except Exception as custom_err:
                            print(f"    ⚠️ Failed to apply custom split-screen: {custom_err}. Falling back to default layout.")

                    if layout == "podcast_split":
                        print("    🎙️ Auto-locating podcast speakers for split-screen...")
                        try:
                            W, H = clip.w, clip.h
                            left_coords = []
                            right_coords = []
                            
                            # Scan first 30 frames to locate left and right speakers
                            step = max(0.1, clip.duration / 30.0)
                            for frame_idx in range(30):
                                t = frame_idx * step
                                if t >= clip.duration:
                                    break
                                frame = clip.get_frame(t)
                                
                                detected = self.face_tracker.detect_faces_in_frame(frame)
                                if detected:
                                    for face in detected:
                                        cx = face['center_x']
                                        cy = face['center_y']
                                        if cx < W // 2:
                                            left_coords.append((cx, cy))
                                        else:
                                            right_coords.append((cx, cy))
                                            
                            left_x, left_y = None, None
                            if left_coords:
                                left_coords = np.array(left_coords)
                                left_x = int(np.median(left_coords[:, 0]))
                                left_y = int(np.median(left_coords[:, 1]))
                                print(f"    🎯 Left speaker auto-located at (x: {left_x}, y: {left_y})")
                                
                            right_x, right_y = None, None
                            if right_coords:
                                right_coords = np.array(right_coords)
                                right_x = int(np.median(right_coords[:, 0]))
                                right_y = int(np.median(right_coords[:, 1]))
                                print(f"    🎯 Right speaker auto-located at (x: {right_x}, y: {right_y})")
                                
                            crop_h = H
                            crop_w = int(H * 9 / 8)
                            if crop_w > W // 2:
                                crop_w = W // 2
                                crop_h = int(crop_w * 8 / 9)
                                
                            if crop_w % 2 != 0:
                                crop_w -= 1
                            if crop_h % 2 != 0:
                                crop_h -= 1
                                
                            # 1. Crop Left Speaker -> TOP HALF
                            if left_x is not None and left_y is not None:
                                x1_L = max(0, min(W // 2 - crop_w, left_x - crop_w // 2))
                                y1_L = max(0, min(H - crop_h, left_y - crop_h // 2))
                            else:
                                print("    ⚠️ Left speaker face not detected. Using default left crop.")
                                x1_L = max(0, W // 4 - crop_w // 2)
                                y1_L = H // 2 - crop_h // 2
                            x2_L, y2_L = x1_L + crop_w, y1_L + crop_h
                            
                            left_clip = clip.crop(x1=x1_L, y1=y1_L, x2=x2_L, y2=y2_L)
                            top_half = left_clip.resize((target_width, target_height // 2))
                            clips_to_close.extend([left_clip, top_half])
                            
                            # 2. Crop Right Speaker -> BOTTOM HALF
                            if right_x is not None and right_y is not None:
                                x1_R = max(W // 2, min(W - crop_w, right_x - crop_w // 2))
                                y1_R = max(0, min(H - crop_h, right_y - crop_h // 2))
                            else:
                                print("    ⚠️ Right speaker face not detected. Using default right crop.")
                                x1_R = max(W // 2, 3 * W // 4 - crop_w // 2)
                                y1_R = H // 2 - crop_h // 2
                            x2_R, y2_R = x1_R + crop_w, y1_R + crop_h
                            
                            right_clip = clip.crop(x1=x1_R, y1=y1_R, x2=x2_R, y2=y2_R)
                            bottom_half = right_clip.resize((target_width, target_height // 2))
                            clips_to_close.extend([right_clip, bottom_half])
                            
                            # 3. Stack them vertically
                            clip = CompositeVideoClip([
                                top_half.set_position((0, 0)),
                                bottom_half.set_position((0, target_height // 2))
                            ], size=(target_width, target_height))
                            clips_to_close.append(clip)
                        except Exception as pod_err:
                            print(f"    ⚠️ Failed to apply podcast split-screen: {pod_err}. Falling back to default layout.")

                    # Check for split screen background video
                    bg_files = list(BACKGROUNDS_DIR.glob("*.mp4"))
                    active_split_screen = split_screen and len(bg_files) > 0
                    if split_screen and not active_split_screen:
                        print("    ⚠️ No background .mp4 files found in 'backgrounds/' directory!")
                        print("    ⚠️ Split-screen disabled; falling back to selected layout.")

                    if active_split_screen:
                        print("    🛡️ Split-Screen layout enabled (Anti-Copyright Mode)...")
                        bg_file = random.choice(bg_files)
                        print(f"    🎮 Using background video: {bg_file.name}")
                        
                        try:
                            bg_video = VideoFileClip(str(bg_file))
                            clips_to_close.append(bg_video)
                            
                            # 1. Prepare top half (original clip cropped to 9:8 ratio)
                            target_crop_width = int(clip.h * 9 / 8)
                            if target_crop_width % 2 != 0:
                                target_crop_width -= 1
                            
                            if layout == "vertical_crop":
                                print(f"    🎯 Applying intelligent face tracking on split-screen top-half (9:8 ratio)...")
                                top_half = self.face_tracker.track_and_crop(clip, crop_ratio=9/8, camera_style=camera_style)
                            else:
                                center_x = clip.w // 2
                                left = max(0, min(clip.w - target_crop_width, center_x - target_crop_width // 2))
                                top_half = clip.crop(x1=left, width=target_crop_width)
                                
                            top_half = top_half.resize((target_width, target_height // 2))
                            clips_to_close.append(top_half)
                            
                            # 2. Prepare bottom half (background gameplay clip)
                            bg_video_muted = bg_video.without_audio()
                            clips_to_close.append(bg_video_muted)
                            if bg_video_muted.duration > clip.duration:
                                max_start = max(0.0, bg_video_muted.duration - clip.duration - 2.0)
                                start_bg = random.uniform(0.0, max_start)
                                bottom_half = bg_video_muted.subclip(start_bg, start_bg + clip.duration)
                            else:
                                bottom_half = bg_video_muted
                                
                            bg_crop_width = int(bottom_half.h * 9 / 8)
                            if bg_crop_width % 2 != 0:
                                bg_crop_width -= 1
                            bg_left = max(0, min(bottom_half.w - bg_crop_width, bottom_half.w // 2 - bg_crop_width // 2))
                            bottom_half = bottom_half.crop(x1=bg_left, width=bg_crop_width)
                            bottom_half = bottom_half.resize((target_width, target_height // 2))
                            clips_to_close.append(bottom_half)
                            
                            # 3. Combine them vertically
                            clip = CompositeVideoClip([
                                top_half.set_position((0, 0)),
                                bottom_half.set_position((0, target_height // 2))
                            ], size=(target_width, target_height))
                            
                        except Exception as e:
                            print(f"    ⚠️ Failed to apply split-screen: {e}. Falling back to default layout.")
                            active_split_screen = False

                    # If split screen wasn't applied, run standard layout
                    if not active_split_screen and layout not in ["gameplay_bg", "streamer_cam", "podcast_split", "custom_split"]:
                        if layout == "vertical_crop":
                            if custom_crop_boxes and len(custom_crop_boxes) > 0:
                                print(f"    📐 Using custom crop coordinates from UI...")
                                box = custom_crop_boxes[0]
                                W, H = clip.size
                                x_pct, y_pct = float(box.get('x', 0)), float(box.get('y', 0))
                                w_pct, h_pct = float(box.get('width', 100)), float(box.get('height', 100))
                                
                                crop_x = max(0, int((x_pct / 100.0) * W))
                                crop_y = max(0, int((y_pct / 100.0) * H))
                                crop_w = min(W - crop_x, int((w_pct / 100.0) * W))
                                crop_h = min(H - crop_y, int((h_pct / 100.0) * H))
                                
                                clip = clip.crop(x1=crop_x, y1=crop_y, width=crop_w, height=crop_h)
                                clips_to_close.append(clip)
                                
                                print(f"    📐 Ensuring vertical 9:16 aspect ratio ({target_width}x{target_height})...")
                                clip = letterbox(clip, target_width, target_height)
                                clips_to_close.append(clip)
                            else:
                                print(f"    🎯 Applying intelligent face tracking...")
                                print(f"    ⏳ Analyzing frames for face detection...")
                                try:
                                    clip = self.face_tracker.track_and_crop(clip, camera_style=camera_style)
                                    clips_to_close.append(clip)
                                    print(f"    ✅ Face tracking and cropping complete")
                                except Exception as e:
                                    print(f"    ⚠️ Face tracking failed: {e}")
                                
                                print(f"    📐 Resizing clip to vertical resolution ({target_width}x{target_height})...")
                                clip = clip.resize((target_width, target_height))
                                clips_to_close.append(clip)
                        elif layout == "landscape":
                            print(f"    📐 Keeping original landscape resolution ({target_width}x{target_height})...")
                            clip = clip.resize((target_width, target_height))
                            clips_to_close.append(clip)
                        elif layout == "landscape_blur":
                            print(f"    📐 Fitting landscape video with blurred background inside vertical canvas ({target_width}x{target_height})...")
                            import cv2
                            
                            # 1. Prepare blurred background (highly optimized low-res blur scaling - 20x faster!)
                            # Downscale first to make OpenCV Gaussian blur calculations extremely fast (almost instant)
                            bg_low = clip.resize(height=target_height // 10)
                            clips_to_close.append(bg_low)
                            
                            # Crop low-res to aspect ratio
                            bg_low = bg_low.crop(x_center=bg_low.w//2, y_center=bg_low.h//2, width=target_width // 10, height=target_height // 10)
                            clips_to_close.append(bg_low)
                            
                            # Apply a fast, small-kernel Gaussian blur to the tiny image
                            bg_blurred_low = bg_low.fl_image(lambda img: cv2.GaussianBlur(img, (9, 9), 0))
                            clips_to_close.append(bg_blurred_low)
                            
                            # Scale the blurred background back up to target canvas (bilinear scaling makes the blur look perfectly soft!)
                            bg = bg_blurred_low.resize((target_width, target_height))
                            clips_to_close.append(bg)
                            
                            # 2. Prepare foreground
                            fg = clip.resize(width=target_width)
                            clips_to_close.append(fg)
                            
                            # 3. Combine them
                            clip = CompositeVideoClip([bg, fg.set_position("center")])
                            clips_to_close.append(clip)
                        else: # landscape_fit
                            print(f"    📐 Fitting landscape video inside vertical canvas ({target_width}x{target_height})...")
                            # Resize horizontal video to fit width of vertical canvas
                            clip = clip.resize(width=target_width)
                            clips_to_close.append(clip)
                            
                            # Create black background clip
                            bg = ColorClip(size=(target_width, target_height), color=(0, 0, 0), duration=clip.duration)
                            clips_to_close.append(bg)
                            
                            # Position it in the center of the vertical canvas
                            clip = CompositeVideoClip([bg, clip.set_position("center")])
                            clips_to_close.append(clip)
                            
                    # Apply Streamer Loudness Shake & Zoom reaction filter
                    if apply_streamer_shake and clip.audio is not None:
                        reaction_peaks = self.detect_reaction_peaks(clip.audio, clip.duration)
                        if reaction_peaks:
                            print(f"    💥 Streamer reaction spikes detected! Adding earthquake zoom-shaking to {len(reaction_peaks)} scenes...")
                            def shake_filter(get_frame, t):
                                frame = get_frame(t)
                                is_peak = False
                                for p_start, p_end in reaction_peaks:
                                    if p_start <= t <= p_end:
                                        is_peak = True
                                        break
                                if not is_peak:
                                    return frame
                                
                                import cv2
                                import random
                                zoom_factor = 1.22
                                sz_y, sz_x = frame.shape[:2]
                                new_x = int(sz_x * zoom_factor)
                                new_y = int(sz_y * zoom_factor)
                                zoomed = cv2.resize(frame, (new_x, new_y))
                                
                                start_x = (new_x - sz_x) // 2
                                start_y = (new_y - sz_y) // 2
                                
                                shake_intensity = 12
                                dx = random.randint(-shake_intensity, shake_intensity)
                                dy = random.randint(-shake_intensity, shake_intensity)
                                
                                crop_x = max(0, min(new_x - sz_x, start_x + dx))
                                crop_y = max(0, min(new_y - sz_y, start_y + dy))
                                return zoomed[crop_y : crop_y + sz_y, crop_x : crop_x + sz_x]
                                
                            clip = clip.fl(shake_filter)
                            clips_to_close.append(clip)
                            
                    # Apply Dynamic Retention Micro-Zooms (Subtle 1.06x punch-in every 4.5s)
                    if layout in ["vertical_crop", "landscape_blur"] and not movie_recap:
                        try:
                            import cv2
                            def retention_zoom_filter(gf, t):
                                frame = gf(t)
                                # Periodic 4-second cycle with 0.8s micro-zoom pulse
                                cycle = t % 4.5
                                if 2.0 <= cycle <= 3.2:
                                    zoom = 1.06
                                    h, w = frame.shape[:2]
                                    zh, zw = int(h * zoom), int(w * zoom)
                                    zoomed = cv2.resize(frame, (zw, zh))
                                    sy = (zh - h) // 2
                                    sx = (zw - w) // 2
                                    return zoomed[sy:sy+h, sx:sx+w]
                                return frame
                            
                            clip = clip.fl(retention_zoom_filter)
                            clips_to_close.append(clip)
                        except Exception as zoom_err:
                            print(f"    ⚠️ Micro-zoom skipped: {zoom_err}")
                    if yt_bypass:
                        print("    ⚡ Applying Supreme Copyright Bypass (1.06x speedup + horizontal mirroring)...")
                        from moviepy.video.fx.mirror_x import mirror_x
                        from moviepy.video.fx.speedx import speedx
                        
                        # Apply horizontal mirroring
                        clip = mirror_x(clip)
                        clips_to_close.append(clip)
                        
                        # Apply 6% speedup to alter audio spectrograph and video frame rate fingerprints
                        clip = speedx(clip, 1.06)
                        clips_to_close.append(clip)
                        
                        # Scale word timestamps down by 1.06 to keep subtitles perfectly in sync with the sped up audio
                        if words:
                            for w_info in words:
                                w_info['start'] /= 1.06
                                w_info['end'] /= 1.06

                    # Check for custom background music for standard clips with SMART AUDIO AUTO-DUCKING
                    if add_bg_music and not movie_recap and not (lyrc_promo and 'montage_segments' in clip_info):
                        bg_music_dir = Path("./bg_music")
                        if bg_music_dir.exists():
                            bg_music_files = list(bg_music_dir.glob("*.mp3")) + list(bg_music_dir.glob("*.wav"))
                            if bg_music_files:
                                bg_music_file = random.choice(bg_music_files)
                                print(f"    🎵 Adding smart-ducked background music: {bg_music_file.name}")
                                try:
                                    from moviepy.audio.io.AudioFileClip import AudioFileClip
                                    # Auto-ducking: calculate optimal vocal clarity volume level
                                    ducked_vol = max(0.04, min(0.15, bg_music_vol * 0.55 if clip.audio else bg_music_vol))
                                    bg_music = AudioFileClip(str(bg_music_file)).volumex(ducked_vol)
                                    from moviepy.audio.fx.audio_loop import audio_loop
                                    bg_music_looped = audio_loop(bg_music, duration=clip.duration)
                                    clips_to_close.extend([bg_music, bg_music_looped])
                                    
                                    if clip.audio:
                                        from moviepy.editor import CompositeAudioClip
                                        # Boost vocal dialogue slightly while keeping background music harmoniously ducked
                                        vocal_audio = clip.audio.volumex(1.15)
                                        clip_with_bg = CompositeAudioClip([vocal_audio, bg_music_looped])
                                        clip = clip.set_audio(clip_with_bg)
                                        clips_to_close.extend([vocal_audio, clip_with_bg])
                                    else:
                                        clip = clip.set_audio(bg_music_looped)
                                except Exception as e:
                                    print(f"    ⚠️ Warning: Could not add background music: {e}")

                    # Add bouncy captions if words are present and captions are enabled
                    is_none_style = self.caption_maker.styles.get(self.caption_maker.selected_style, {}).get('no_captions', False)
                    if add_captions and not is_none_style and words:
                        print(f"    📝 Adding word-by-word captions (vertical position: {caption_y_pct})...")
                        ai_hook_text = clip_info.get('hook_title', hook_text)
                        clip = self.caption_maker.add_captions(clip, words, start, layout=layout, movie_recap=movie_recap, hook_text=ai_hook_text, auto_sfx=auto_sfx, caption_y_pct=caption_y_pct)
                        clips_to_close.append(clip)

                    # Apply white exposure beat flash at start of standard clip if configured and not in montage mode
                    if apply_exposure_flashes and not (lyrc_promo and 'montage_segments' in clip_info):
                        try:
                            print("    ⚡ Applying start-of-clip exposure flash transition...")
                            flash_dur = 0.12
                            white_flash = ColorClip(size=clip.size, color=(255, 255, 255), duration=flash_dur)
                            white_flash = white_flash.fadeout(flash_dur)
                            
                            clip_flashed = CompositeVideoClip([clip, white_flash.set_start(0.0)])
                            clip_flashed.duration = clip.duration
                            
                            clips_to_close.append(white_flash)
                            clips_to_close.append(clip_flashed)
                            clip = clip_flashed
                        except Exception as flash_err:
                            print(f"    ⚠️ Failed to apply start-of-clip exposure flash: {flash_err}")

                    # Ensure clip audio does not exceed clip duration to prevent out-of-bounds rendering crashes
                    if clip.audio is not None:
                        try:
                            clip.audio = clip.audio.subclip(0, min(clip.audio.duration, clip.duration))
                            clips_to_close.append(clip.audio)
                        except Exception as audio_sync_err:
                            print(f"    ⚠️ Warning: Could not sync audio boundaries: {audio_sync_err}")

                    if custom_file_name:
                        # Append the clip index if there are multiple clips to prevent overwriting
                        name_prefix = custom_file_name if num_clips == 1 else f"{custom_file_name}_{i}"
                        filename = f"{name_prefix}.mp4"
                    else:
                        filename = f"clip_{i}_{virality_score}pts_{Path(video_path).stem}.mp4"
                    output_path = target_dir / filename

                    import multiprocessing
                    thread_count = max(1, multiprocessing.cpu_count() - 2)
                    
                    try:
                        import torch
                        has_cuda = torch.cuda.is_available()
                    except ImportError:
                        has_cuda = False
                        
                    has_amd = False
                    if not has_cuda:
                        try:
                            import subprocess
                            output = subprocess.check_output(
                                ['powershell', '-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name'],
                                text=True
                            )
                            if 'AMD' in output or 'Radeon' in output:
                                has_amd = True
                        except Exception:
                            pass

                    if has_cuda:
                        best_codec = 'h264_nvenc'
                        best_preset = 'p6' # high quality preset for nvenc
                        print(f"    🚀 Encoding with ultra-fast GPU encoder ({best_codec}, preset: {best_preset})...")
                        ffmpeg_params = ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-cq', '19', '-rc', 'vbr', '-b:v', '0']
                    elif has_amd:
                        best_codec = 'h264_amf'
                        best_preset = 'quality' # high quality preset for amf
                        print(f"    🚀 Encoding with AMD hardware acceleration ({best_codec})...")
                        ffmpeg_params = ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-rc', 'cqp', '-qp_i', '18', '-qp_p', '18']
                    else:
                        best_codec = 'libx264'
                        best_preset = 'veryfast'
                        print(f"    🚀 Encoding with crystal-clear CPU encoder ({best_codec}, preset: {best_preset}, {thread_count} threads)...")
                        ffmpeg_params = ['-pix_fmt', 'yuv420p', '-threads', str(thread_count), '-movflags', '+faststart', '-tune', 'film']
                        if quality.lower() in ['4k', '8k']:
                            ffmpeg_params.extend(['-crf', '16', '-b:v', '45M', '-maxrate', '65M', '-bufsize', '90M'])
                        elif quality.lower() == '1080p':
                            ffmpeg_params.extend(['-crf', '17', '-b:v', '18M', '-maxrate', '28M', '-bufsize', '40M'])
                        else: # 720p
                            ffmpeg_params.extend(['-crf', '19', '-b:v', '8M', '-maxrate', '12M', '-bufsize', '16M'])
                    
                    from proglog import ProgressBarLogger
                    class MyBarLogger(ProgressBarLogger):
                        def __init__(self, p_callback, c_idx, total_c):
                            super().__init__()
                            self.p_callback = p_callback
                            self.c_idx = c_idx
                            self.total_c = total_c
                            self.last_pct = -100
                            self.current_bar = None
                            
                        def bars_callback(self, bar, attr, value, old_value=None):
                            if attr == 'index' and self.p_callback:
                                if self.current_bar != bar:
                                    self.current_bar = bar
                                    self.last_pct = -100
                                    
                                total = self.bars[bar].get('total', 1)
                                if total > 0:
                                    pct = int((value / total) * 100)
                                    if pct - self.last_pct >= 2 or pct == 100:
                                        self.last_pct = pct
                                        bar_name = "Audio" if "chunk" in bar.lower() else "Video"
                                        
                                        base = 60 + int((self.c_idx - 1) / self.total_c * 40)
                                        if bar_name == "Audio":
                                            clip_prog = int((pct / 100) * 5)
                                        else:
                                            clip_prog = 5 + int((pct / 100) * 35)
                                            
                                        self.p_callback(f"Rendering {bar_name} {self.c_idx}/{self.total_c} - {pct}%", min(99, base + clip_prog))
                                        
                    my_logger = MyBarLogger(progress_callback, i, len(clip_specs)) if progress_callback else None
                    
                    render_fps = 60 if has_cuda else 30
                    clip.write_videofile(
                        str(output_path),
                        codec=best_codec,
                        audio_codec='aac',
                        preset=best_preset,
                        fps=render_fps,
                        ffmpeg_params=ffmpeg_params,
                        verbose=False,  
                        logger=my_logger,
                        temp_audiofile=str(TEMP_DIR / f'temp_audio_{i}.m4a'),
                        remove_temp=True,
                        threads=thread_count
                    )
                    print(f"    ✅ Video encoding complete ({render_fps} FPS)")
                    output_files.append(str(output_path))
                    print(f"    ✅ Saved: {filename}")
                    
                    # Force Python memory cleanup immediately to keep PC memory light and fast
                    import gc
                    try:
                        clip.close()
                    except Exception:
                        pass
                    gc.collect()
                    
                    # Save title and description metadata file in a dedicated subfolder
                    metadata_dir = target_dir / "metadata"
                    metadata_dir.mkdir(exist_ok=True)
                    
                    metadata_filename = f"clip_{i}_{virality_score}pts_{Path(video_path).stem}_metadata.txt"
                    metadata_path = metadata_dir / metadata_filename
                    try:
                        content_title = clip_info.get('content_title', '')
                        content_description = clip_info.get('content_description', '')
                        reason = clip_info.get('reason', '')
                        with open(metadata_path, 'w', encoding='utf-8') as f_meta:
                            f_meta.write(f"==================================================\n")
                            f_meta.write(f"🎬 Catchy Title:\n{content_title}\n")
                            f_meta.write(f"==================================================\n\n")
                            f_meta.write(f"📝 Description & Hashtags:\n{content_description}\n")
                            f_meta.write(f"==================================================\n\n")
                            if reason:
                                f_meta.write(f"🧠 AI Curation Analysis:\n{reason}\n")
                                f_meta.write(f"==================================================\n")
                        print(f"    📄 Saved metadata: metadata/{metadata_filename}")
                    except Exception as e:
                        print(f"    ⚠️ Could not save metadata file: {e}")
                    
            except Exception as e:
                print(f"    ❌ Error processing clip {i}: {e}")
                continue
            finally:
                # Release all intermediate clips and audio tracks to prevent RAM memory leaks and file lockouts
                # Removed explicit c.close() loop because it is notorious for causing deadlocks in MoviePy on Windows.
                # Python's GC will handle it.
                pass
                import gc
                gc.collect()
        
        self.face_tracker.close()
        cleanup_temp_files()

        return output_files, title, str(target_dir.resolve())
