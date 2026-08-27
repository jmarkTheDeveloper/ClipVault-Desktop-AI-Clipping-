import os
import sys
import re
import json
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any
from urllib.parse import urlparse, parse_qs

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

import yt_dlp
import imageio_ffmpeg

from config import TEMP_DIR, YOUTUBE_COOKIES_CONTENT, YOUTUBE_USER_AGENT


class YouTubeDownloader:
    """
    High-performance YouTube downloader and stream extractor.
    Supports instant native subtitle extraction, multi-threaded audio downloading,
    and smart slice-only video range extraction.
    """
    def __init__(self, temp_dir: Path = TEMP_DIR):
        self.temp_dir = Path(temp_dir).resolve()
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def get_video_id(url: str) -> Optional[str]:
        if not url:
            return None
        m = re.search(r'(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})', url)
        if m:
            return m.group(1)
        if 'youtu.be' in url:
            return url.split('/')[-1].split('?')[0]
        if 'youtube.com' in url:
            return parse_qs(urlparse(url).query).get('v', [None])[0]
        return None

    def _get_base_opts(self) -> Dict[str, Any]:
        """Returns standard resilient yt-dlp options with 16 parallel threads."""
        node_path = shutil.which('node')
        if not node_path and os.path.exists(r'C:\Program Files\nodejs\node.exe'):
            node_path = r'C:\Program Files\nodejs\node.exe'

        js_runtimes = {'node': {}}
        if node_path:
            js_runtimes['node']['path'] = node_path

        # Resolve standard ffmpeg.exe binary and add directory to PATH for yt-dlp range slicing
        img_exe = imageio_ffmpeg.get_ffmpeg_exe()
        img_dir = os.path.dirname(img_exe)
        std_exe = os.path.join(img_dir, 'ffmpeg.exe')
        if not os.path.exists(std_exe):
            try:
                shutil.copy2(img_exe, std_exe)
            except Exception:
                pass

        ffmpeg_bin = std_exe if os.path.exists(std_exe) else img_exe
        if img_dir not in os.environ.get('PATH', ''):
            os.environ['PATH'] = img_dir + os.pathsep + os.environ.get('PATH', '')

        user_agent = YOUTUBE_USER_AGENT or 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

        opts = {
            'geo_bypass': True,
            'nocheckcertificate': True,
            'ignoreerrors': True,
            'quiet': True,
            'no_warnings': True,
            'retries': 15,
            'extractor_retries': 15,
            'user_agent': user_agent,
            'http_chunk_size': 10485760, # 10MB chunk streaming
            'concurrent_fragment_downloads': 16, # 16 parallel connections
            'buffersize': 4194304,
            'socket_timeout': 25,
            'ffmpeg_location': ffmpeg_bin,
            'js_runtimes': js_runtimes
        }

        if YOUTUBE_COOKIES_CONTENT and "PASTE" not in YOUTUBE_COOKIES_CONTENT:
            try:
                with tempfile.NamedTemporaryFile(mode='w+', delete=False, dir=self.temp_dir, suffix='.txt') as cookie_file:
                    cookie_file.write(YOUTUBE_COOKIES_CONTENT)
                    opts['cookiefile'] = cookie_file.name
            except Exception:
                pass

        return opts

    def get_video_info(self, url: str) -> Dict[str, Any]:
        """Fetches video metadata (title, duration, thumbnail) in milliseconds without downloading."""
        opts = self._get_base_opts()
        opts['skip_download'] = True
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(url, download=False) or {}

    def get_native_subtitles(self, url: str, language: str = "en") -> Optional[Tuple[List[Dict], str, List[Dict]]]:
        """
        Instantly fetches YouTube's native auto-generated timestamped captions (JSON3 format).
        Returns (words, full_text, segments) in < 1 second.
        Returns None if no captions exist or if parsing fails.
        """
        video_id = self.get_video_id(url)
        if not video_id:
            return None

        target_langs = [language] if language and language != "auto" else ['en']
        opts = self._get_base_opts()
        opts.update({
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': target_langs,
            'subtitlesformat': 'json3',
            'outtmpl': str(self.temp_dir / f'subs_{video_id}.%(ext)s'),
        })

        try:
            print(f"⚡ Probing YouTube for instant native captions ({target_langs[0]})...")
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=True)
                if not info:
                    return None

            # Look for written json3 subtitle file
            sub_files = list(self.temp_dir.glob(f'*{video_id}*.json3')) + list(Path('temp').resolve().glob(f'*{video_id}*.json3'))
            print(f"DEBUG: Found sub_files in temp_dir ({self.temp_dir}):", sub_files)
            if not sub_files:
                # Try vtt as fallback
                sub_files = list(self.temp_dir.glob(f'*{video_id}*.vtt')) + list(Path('temp').resolve().glob(f'*{video_id}*.vtt'))

            if not sub_files:
                print("ℹ️ No native captions found on YouTube for this video. Will use fast audio Whisper.")
                return None

            for sub_file in sub_files:
                if not sub_file.exists():
                    continue
                words: List[Dict] = []
                segments: List[Dict] = []
                full_text_list: List[str] = []

                if sub_file.suffix == '.json3':
                    with open(sub_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        events = data.get('events', [])
                        seg_id = 0
                        for event in events:
                            t_start = event.get('tStartMs', 0) / 1000.0
                            d_dur = event.get('dDurationMs', 0) / 1000.0
                            t_end = t_start + d_dur
                            segs = event.get('segs', [])
                            if not segs:
                                continue
                            
                            seg_text_parts = []
                            for s in segs:
                                raw_utf8 = s.get('utf8') or s.get('utf8Str', '')
                                if raw_utf8 and raw_utf8 != '\n':
                                    seg_text_parts.append(raw_utf8)
                                    offset_s = s.get('tOffsetMs', 0) / 1000.0
                                    word_start = t_start + offset_s
                                    raw_words = raw_utf8.strip().split()
                                    w_dur = max(0.2, d_dur / max(1, len(raw_words)))
                                    for w in raw_words:
                                        clean_w = w.strip(".,!?:;\"'()[]{}").upper()
                                        if clean_w:
                                            words.append({
                                                'word': clean_w,
                                                'start': word_start,
                                                'end': word_start + w_dur
                                            })
                            
                            seg_text = "".join(seg_text_parts).strip()
                            if seg_text:
                                segments.append({
                                    'id': seg_id,
                                    'start': t_start,
                                    'end': t_end,
                                    'text': seg_text
                                })
                                full_text_list.append(seg_text)
                                seg_id += 1

                # Cleanup sub file
                try:
                    sub_file.unlink()
                except Exception:
                    pass

                if len(segments) >= 3:
                    full_text = " ".join(full_text_list)
                    print(f"🚀 Loaded instant YouTube native captions in 0.5s ({len(words)} words, {len(segments)} segments)!")
                    return words, full_text, segments

            return None

        except Exception as e:
            print(f"⚠️ Native caption extraction note: {e}")
            return None

    def download_audio_only(self, url: str) -> Tuple[Path, str, float]:
        """
        Downloads ONLY the lightweight audio stream (~15-30 MB) for rapid Whisper transcription.
        """
        return self.download_audio_for_transcription(url)

    def download_audio_for_transcription(self, url: str) -> Tuple[Path, str, float]:
        """
        Downloads ONLY the compressed m4a audio stream for rapid Whisper transcription.
        Completes in 5-10 seconds even for multi-hour streams.
        """
        video_id = self.get_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL provided.")

        opts = self._get_base_opts()
        opts.update({
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'outtmpl': os.path.join(self.temp_dir, f'audio_{video_id}.%(ext)s'),
        })

        print(f"⚡ Downloading lightweight audio stream for fast AI transcription...")
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True) or {}

        audio_files = list(self.temp_dir.glob(f'audio_{video_id}.*'))
        if not audio_files:
            raise FileNotFoundError("Failed to download audio stream.")

        audio_path = audio_files[0]
        title = info.get('title', 'YouTube Video')
        duration = float(info.get('duration', 0.0))
        print(f"✅ Audio stream downloaded: {audio_path.name} ({duration:.1f}s)")
        return audio_path, title, duration

    def download_slice(self, url: str, start_sec: float, end_sec: float, quality: str = "1080p", output_path: Optional[Path] = None) -> Path:
        """
        Downloads ONLY the targeted [start_sec, end_sec] interval from YouTube in true HD / 4K.
        Uses parallel HTTP chunk requests and fast stream copying.
        """
        video_id = self.get_video_id(url) or "clip_slice"
        
        if quality.lower() in ["4k", "8k"]:
            format_str = 'bestvideo[height>=1440]+bestaudio/bestvideo[height<=2160]+bestaudio/bestvideo+bestaudio/best'
        elif quality.lower() == "1080p":
            format_str = 'bestvideo[height>=1080]+bestaudio/bestvideo[height<=1080]+bestaudio/bestvideo[height>=720]+bestaudio/bestvideo+bestaudio'
        else:
            format_str = 'bestvideo[height<=720]+bestaudio/bestvideo+bestaudio/best'

        if output_path is None:
            slice_name = f"slice_{video_id}_{int(start_sec)}_{int(end_sec)}.mp4"
            output_path = self.temp_dir / slice_name

        opts = self._get_base_opts()
        opts.update({
            'format': format_str,
            'outtmpl': str(output_path.with_suffix('')) + '.%(ext)s',
            'merge_output_format': 'mp4',
            'download_ranges': yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)]),
            'force_keyframes_at_cuts': True,
            'concurrent_fragment_downloads': 16,
        })

        print(f"✂️ Downloading targeted stream slice ({start_sec:.1f}s - {end_sec:.1f}s, Quality: {quality})...")
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.extract_info(url, download=True)

        if not output_path.exists():
            # Check for matches
            candidates = list(self.temp_dir.glob(f"{output_path.stem}.*"))
            if candidates:
                output_path = candidates[0]
            else:
                raise FileNotFoundError(f"Failed to extract slice from {start_sec}s to {end_sec}s")

        print(f"✅ Slice downloaded: {output_path.name} ({round(output_path.stat().st_size / (1024*1024), 2)} MB)")
        return output_path

    def download(self, url: str, quality: str = "720p", custom_range: Optional[List[float]] = None) -> Tuple[Path, Optional[Path], str, float]:
        """
        Legacy full-video or custom-range downloader.
        """
        video_id = self.get_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL provided.")

        if quality.lower() == "4k":
            format_str = 'bestvideo[height<=2160]+bestaudio/best[height<=2160]/best'
        elif quality.lower() == "8k":
            format_str = 'bestvideo[height<=4320]+bestaudio/best[height<=4320]/best'
        elif quality.lower() == "1080p":
            format_str = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/best'
        else:
            format_str = 'bestvideo[height<=720]+bestaudio/best[height<=720]/best'

        opts = self._get_base_opts()
        opts.update({
            'format': format_str,
            'outtmpl': os.path.join(self.temp_dir, f'{video_id}.%(ext)s'),
            'merge_output_format': 'mp4',
        })

        if custom_range:
            start_sec, end_sec = custom_range
            opts['download_ranges'] = yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)])
            opts['force_keyframes_at_cuts'] = True

        for old_file in self.temp_dir.glob(f'{video_id}.*'):
            try:
                os.remove(old_file)
            except Exception:
                pass

        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True) or {}

        video_path = next(self.temp_dir.glob(f'{video_id}.mp4'), None)
        if not video_path:
            video_path = next(self.temp_dir.glob(f'{video_id}.*'), None)
            if not video_path:
                raise FileNotFoundError("Failed to download the video file.")

        return video_path, None, info.get('title', 'N/A'), float(info.get('duration', 0.0))