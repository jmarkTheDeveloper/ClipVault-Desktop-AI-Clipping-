import os
import sys
import re
import json
import shutil
import tempfile
import subprocess
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any
from urllib.parse import urlparse, parse_qs
import builtins

os.environ["PYTHONIOENCODING"] = "utf-8"

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

_original_builtin_print = builtins.print
def _safe_system_print(*args, **kwargs):
    try:
        _original_builtin_print(*args, **kwargs)
    except Exception:
        try:
            cleaned = [str(a).encode('ascii', errors='backslashreplace').decode('ascii') for a in args]
            _original_builtin_print(*cleaned, **kwargs)
        except Exception:
            pass
builtins.print = _safe_system_print

import yt_dlp
import imageio_ffmpeg

from config import TEMP_DIR, YOUTUBE_COOKIES_CONTENT, YOUTUBE_USER_AGENT


# Shared cross-request cache so /api/video_info preview extraction is immediately reused by compilation
GLOBAL_YT_INFO_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


class YouTubeDownloader:
    """
    High-performance YouTube downloader and stream extractor.
    Supports instant native subtitle extraction, multi-threaded audio downloading,
    and smart slice-only video range extraction.
    """
    def __init__(self, temp_dir: Path = TEMP_DIR):
        self.temp_dir = Path(temp_dir).resolve()
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self._stream_cache = {}

    @classmethod
    def cache_video_info(cls, video_id: str, info: Dict[str, Any]):
        if video_id and info and info.get("formats"):
            import time
            formats = info.get("formats") or []
            new_max_h = max(((f.get("height") or 0) for f in formats), default=0)
            existing = GLOBAL_YT_INFO_CACHE.get(video_id)
            if existing:
                old_formats = (existing[1] or {}).get("formats") or []
                old_max_h = max(((f.get("height") or 0) for f in old_formats), default=0)
                if old_max_h > new_max_h:
                    return
            GLOBAL_YT_INFO_CACHE[video_id] = (time.time(), info)

    @classmethod
    def get_cached_video_info(cls, video_id: str, max_age_sec: float = 1800.0, min_height: int = 0) -> Optional[Dict[str, Any]]:
        if not video_id:
            return None
        entry = GLOBAL_YT_INFO_CACHE.get(video_id)
        if not entry:
            return None
        import time
        ts, info = entry
        if (time.time() - ts) > max_age_sec:
            GLOBAL_YT_INFO_CACHE.pop(video_id, None)
            return None
        if min_height > 0 and info:
            formats = info.get("formats") or []
            max_h = max(((f.get("height") or 0) for f in formats), default=0)
            if max_h < min_height:
                return None
        return info

    @staticmethod
    def auto_update_ytdlp_background():
        """
        Non-blocking background worker that checks PyPI / GitHub for yt-dlp updates.
        Ensures YouTube JS extraction scripts and anti-bot bypasses are hot-patched automatically.
        """
        def _update():
            try:
                print(" [YouTube Security Engine]: Checking for yt-dlp extraction hotfixes...")
                if hasattr(yt_dlp, 'update') and hasattr(yt_dlp.update, 'update_self'):
                    yt_dlp.update.update_self()
                else:
                    subprocess.run(
                        [sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp", "--no-warn-script-location"],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                print(" [YouTube Security Engine]: yt-dlp extraction rules are up to date.")
            except Exception as e:
                print(f"ℹ [YouTube Security Engine]: Silent update check complete: {e}")

        import threading
        t = threading.Thread(target=_update, daemon=True, name="yt_dlp_auto_updater")
        t.start()

    @staticmethod
    def get_video_id(url: str) -> Optional[str]:
        if not url:
            return None
        # Detect private playlists (Liked Videos list=LL, Watch Later list=WL)
        is_liked = bool(re.search(r'[?&]list=(?:LL|WL|LM|FL)(?:&|$)', url, re.IGNORECASE))
        m = re.search(r'(?:v=|\/|youtu\.be\/)([0-9A-Za-z_-]{11})', url)
        if is_liked and not m:
            raise ValueError("Error: Liked Videos playlist link detected (list=LL). YouTube blocks automated tools from accessing private playlists. Please use a direct public video link.")
        if m:
            return m.group(1)
        if 'youtu.be' in url:
            return url.split('/')[-1].split('?')[0]
        if 'youtube.com' in url:
            return parse_qs(urlparse(url).query).get('v', [None])[0]
        return None

    def _get_base_opts(self) -> Dict[str, Any]:
        """Returns standard resilient yt-dlp options with JS runtime for full 4K/1080p adaptive manifest extraction."""
        node_path = shutil.which('node') or (r'C:\Program Files\nodejs\node.exe' if os.path.exists(r'C:\Program Files\nodejs\node.exe') else None)

        js_runtimes = {}
        if node_path:
            js_runtimes['node'] = {'path': node_path}

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

        try:
            from yt_dlp.postprocessor.ffmpeg import FFmpegPostProcessor
            FFmpegPostProcessor._ffmpeg_location.set(ffmpeg_bin)
        except Exception:
            pass

        # CRITICAL: Do NOT set 'player_skip': ['webpage', 'configs'] or legacy 'tv'/'mweb' client lists!
        # Skipping webpage/configs prevented yt-dlp's JS runtime from deciphering adaptive DASH/HLS streams,
        # which caused YouTube to return ONLY itag 18 (640x360 @ 294 kbps) instead of 3840x2160 (4K) / 1080p!
        opts = {
            'geo_bypass': True,
            'nocheckcertificate': True,
            'ignoreerrors': False,
            'quiet': True,
            'no_warnings': True,
            'retries': 10,
            'extractor_retries': 10,
            'http_chunk_size': 10485760,
            'concurrent_fragment_downloads': 8,
            'buffersize': 4194304,
            'socket_timeout': 25,
            'ffmpeg_location': ffmpeg_bin,
            'js_runtimes': js_runtimes,
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
        """Fetches video metadata (title, duration, thumbnail) using cached info or multi-client fallback."""
        video_id = self.get_video_id(url)
        cached = self.get_cached_video_info(video_id) if video_id else None
        if cached:
            return cached

        opts = self._get_base_opts()
        opts['skip_download'] = True
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False) or {}
                if video_id and info:
                    self.cache_video_info(video_id, info)
                return info
        except Exception as e:
            print(f"    [YouTubeDownloader] get_video_info fallback notice: {e}")
            return {"title": "YouTube Video", "duration": 0.0}

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
            'socket_timeout': 8,
            'retries': 2,
            'extractor_retries': 2,
            'outtmpl': (self.temp_dir / f'subs_{video_id}.%(ext)s').as_posix(),
        })

        try:
            print(f" Probing YouTube for instant native captions ({target_langs[0]})...")
            with yt_dlp.YoutubeDL(opts) as ydl:
                try:
                    ydl.extract_info(url, download=True)
                except Exception as dl_err:
                    print(f"Native subtitle probe note: {dl_err}")

            # Look for written json3 subtitle file
            sub_files = list(self.temp_dir.glob(f'*{video_id}*.json3')) + list(Path('temp').resolve().glob(f'*{video_id}*.json3'))
            if not sub_files:
                # Try vtt as fallback
                sub_files = list(self.temp_dir.glob(f'*{video_id}*.vtt')) + list(Path('temp').resolve().glob(f'*{video_id}*.vtt'))

            if not sub_files:
                print("ℹ No native captions found on YouTube for this video. Will use fast audio Whisper.")
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
                    print(f" Loaded instant YouTube native captions in 0.5s ({len(words)} words, {len(segments)} segments)!")
                    return words, full_text, segments

            return None

        except Exception as e:
            print(f" Native caption extraction note: {e}")
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

        audio_spec = 'bestaudio[language_preference>=0][ext=m4a]/bestaudio[language_preference>=0]/bestaudio[format_note*=original]/bestaudio[language=en]/bestaudio[ext=m4a]/bestaudio/best'
        opts = self._get_base_opts()
        opts.update({
            'format': audio_spec,
            'outtmpl': (self.temp_dir / f'audio_{video_id}.%(ext)s').as_posix(),
        })

        print(f" Downloading lightweight audio stream for fast AI transcription...")
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True) or {}

        audio_files = list(self.temp_dir.glob(f'audio_{video_id}.*'))
        if not audio_files:
            raise FileNotFoundError("Failed to download audio stream.")

        audio_path = audio_files[0]
        title = info.get('title', 'YouTube Video')
        duration = float(info.get('duration', 0.0))
        print(f" Audio stream downloaded: {audio_path.name} ({duration:.1f}s)")
        return audio_path, title, duration

    def _download_hls_fmp4_range(
        self,
        m3u8_url: str,
        headers: Optional[Dict[str, str]],
        start_sec: float,
        end_sec: float,
        out_file: Path,
    ) -> Tuple[float, int]:
        """
        Downloads ONLY the initialization header (#EXT-X-MAP) and exact #EXTINF media segments
        covering [start_sec, end_sec] from a YouTube HLS (m3u8_native) stream in parallel.
        Bypasses YouTube's single-stream HTTP throttling (ratebypass=yes) and completes 4K slices in ~3-4s.
        Returns (first_segment_start_sec, total_bytes_downloaded).
        """
        import urllib.request
        import concurrent.futures

        default_ua = YOUTUBE_USER_AGENT or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        req_headers = dict(headers or {})
        if "User-Agent" not in req_headers and "user-agent" not in req_headers:
            req_headers["User-Agent"] = default_ua

        req = urllib.request.Request(m3u8_url, headers=req_headers)
        with urllib.request.urlopen(req, timeout=12) as resp:
            playlist_text = resp.read().decode("utf-8", errors="ignore")

        init_uri = None
        m_map = re.search(r'#EXT-X-MAP:URI="([^"]+)"', playlist_text)
        if m_map:
            init_uri = m_map.group(1)

        pad_start = max(0.0, start_sec - 1.5)
        pad_end = end_sec + 4.5
        segs: List[Tuple[float, float, str]] = []
        cur_t = 0.0
        lines = [ln.strip() for ln in playlist_text.splitlines() if ln.strip()]
        for idx, ln in enumerate(lines):
            if ln.startswith("#EXTINF:"):
                try:
                    dur = float(ln.split(":", 1)[1].split(",", 1)[0])
                except Exception:
                    dur = 5.0
                seg_url = lines[idx + 1] if (idx + 1) < len(lines) else ""
                if seg_url and not seg_url.startswith("#"):
                    if (cur_t + dur) >= pad_start and cur_t <= pad_end:
                        segs.append((cur_t, dur, seg_url))
                cur_t += dur

        if not segs:
            raise RuntimeError("No matching #EXTINF segments found in HLS manifest for requested range.")

        urls_to_dl = ([init_uri] if init_uri else []) + [s[2] for s in segs]

        def _fetch_chunk(u: str) -> bytes:
            last_err = None
            for _ in range(3):
                try:
                    r = urllib.request.Request(u, headers=req_headers)
                    with urllib.request.urlopen(r, timeout=15) as res:
                        return res.read()
                except Exception as e:
                    last_err = e
            raise RuntimeError(f"Segment fetch failed: {last_err}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            chunks = list(pool.map(_fetch_chunk, urls_to_dl))

        total_bytes = 0
        with open(out_file, "wb") as f_out:
            for c in chunks:
                f_out.write(c)
                total_bytes += len(c)

        return segs[0][0], total_bytes

    def download_slice(self, url: str, start_sec: float, end_sec: float, quality: str = "1080p", output_path: Optional[Path] = None, progress_callback: Optional[Any] = None) -> Path:
        """
        Downloads ONLY the targeted [start_sec, end_sec] interval from YouTube in true HD / 4K.
        Uses parallel unthrottled HLS fMP4 segment extraction or direct HTTP range seeking (completes in 3-8 seconds).
        """
        video_id = self.get_video_id(url) or "clip_slice"
        if output_path is None:
            slice_name = f"slice_{video_id}_{int(start_sec)}_{int(end_sec)}.mp4"
            output_path = self.temp_dir / slice_name

        temp_slice = self.temp_dir / f"tmp_{output_path.name}"
        if temp_slice.exists():
            try: temp_slice.unlink()
            except Exception: pass

        print(f"    [YouTubeDownloader] Fast-slicing stream ({start_sec:.1f}s - {end_sec:.1f}s, Quality: {quality})...")
        if progress_callback:
            progress_callback("Connecting to HD/4K stream...", 18)

        # Step 1: Check in-memory cache or extract direct CDN URLs without downloading
        try:
            cache_key = f"{video_id}_{quality.lower()}"
            cached_stream = self._stream_cache.get(cache_key)
            video_url = None
            audio_url = None
            video_headers = None
            audio_headers = None

            if cached_stream:
                video_url, audio_url, video_headers, audio_headers = cached_stream
                import time
                now_ts = int(time.time())
                exp_match = re.search(r'(?:[?&]expire=|/expire/)(\d+)', video_url or '')
                if exp_match and int(exp_match.group(1)) < (now_ts + 90):
                    print(f"    [YouTubeDownloader] Cached stream CDN URLs for {video_id} have expired. Refreshing...")
                    cached_stream = None
                    self._stream_cache.pop(cache_key, None)
                else:
                    print(f"    [YouTubeDownloader] Reusing cached stream CDN URLs for {video_id}")
            
            if not cached_stream:
                # Require min_height=720 from cache so a stale 360p metadata probe never blocks 4K/1080p slicing
                info = self.get_cached_video_info(video_id, min_height=720)
                if not info:
                    opts = self._get_base_opts()
                    opts.update({'skip_download': True})

                    with yt_dlp.YoutubeDL(opts) as ydl:
                        info = ydl.extract_info(url, download=False)
                        if info:
                            self.cache_video_info(video_id, info)

                formats = info.get("formats", []) if info else []

                # Always supersample from up to 4K (2160p) when slicing so 9:16 vertical crops
                # retain genuine native 1080x1920 / 2160x3840 optical detail without digital zoom blur.
                q_low = str(quality or "1080p").lower().strip()
                if "8k" in q_low or "4320" in q_low:
                    target_h = 4320
                else:
                    target_h = 2160
                
                def is_within_target(f):
                    h, w = f.get("height") or 0, f.get("width") or 0
                    if not h and not w:
                        return False
                    shorter_dim = min(h, w) if (h > 0 and w > 0) else (h or w)
                    return shorter_dim <= (target_h + 120)

                def is_direct_http(f):
                    proto = str(f.get("protocol") or "").lower()
                    u = str(f.get("url") or "").lower()
                    return "m3u8" not in proto and "m3u8" not in u

                def has_ratebypass(f):
                    u = str(f.get("url") or "").lower()
                    return "ratebypass=yes" in u or "/ratebypass/yes" in u

                video_candidates = [
                    f for f in formats 
                    if f.get("vcodec") != "none" and f.get("url") and is_within_target(f)
                ]
                if not video_candidates:
                    video_candidates = [
                        f for f in formats 
                        if f.get("vcodec") != "none" and f.get("url") and ((f.get("height") or 0) > 0)
                    ]
                if not video_candidates:
                    video_candidates = [f for f in formats if f.get("vcodec") != "none" and f.get("url")]

                if video_candidates:
                    # Sort highest resolution first, then unthrottled (ratebypass=yes) streams so 4K slices download in ~3s
                    video_candidates.sort(
                        key=lambda f: (
                            (f.get("height") or 0) * (f.get("width") or 0),
                            f.get("height") or 0,
                            1 if has_ratebypass(f) else 0,
                            1 if is_direct_http(f) else 0,
                            f.get("tbr") or 0
                        ),
                        reverse=True
                    )
                    best_vid = video_candidates[0]
                    best_h = best_vid.get("height") or 0
                    best_w = best_vid.get("width") or 0
                    max_avail_h = max(((f.get("height") or 0) for f in formats), default=0)
                    print(f"    [YouTubeDownloader] Selected source stream: {best_w}x{best_h} (max available: {max_avail_h}p, vcodec={best_vid.get('vcodec')}, proto={best_vid.get('protocol')}, ratebypass={has_ratebypass(best_vid)})")
                    if best_h > 0 and best_h < 720 and max_avail_h >= 720:
                        print(f"    [YouTubeDownloader] Bypassing low-res ({best_h}p) direct candidate in favor of high-res ({max_avail_h}p) yt-dlp stream...")
                        video_url = None
                    else:
                        video_url = best_vid.get("url")
                        video_headers = best_vid.get("http_headers") or {}
                        if best_vid.get("acodec") and best_vid.get("acodec") != "none":
                            audio_url = video_url
                            audio_headers = video_headers

                # 2. Look for best dedicated audio format (prioritize original/default language + ratebypass=yes)
                def _audio_score(f):
                    lang = str(f.get("language") or "").lower()
                    note = str(f.get("format_note") or "").lower()
                    url_str = str(f.get("url") or "").lower()
                    lang_pref = f.get("language_preference")
                    if lang_pref is None:
                        lang_pref = 0
                    is_original = 1 if (lang_pref > 0 or "original" in note or "default" in note) else 0
                    is_not_dubbed = 1 if ("dubbed" not in note and "dubbed" not in url_str) else 0
                    is_english = 1 if (lang in ("en", "eng", "en-us", "en-gb") or "english" in note) else 0
                    unthrottled = 1 if has_ratebypass(f) else 0
                    is_audio_only = 1 if f.get("vcodec") == "none" else 0
                    bitrate = f.get("abr") or f.get("tbr") or 0
                    return (is_original, is_not_dubbed, lang_pref, is_english, unthrottled, is_audio_only, bitrate)

                audio_candidates = [
                    f for f in formats 
                    if (f.get("acodec") and f.get("acodec") != "none" or "sgoap" in str(f.get("url") or "") or f.get("format_id", "").startswith(("233", "234", "140", "251")))
                    and f.get("vcodec") in (None, "none") and f.get("url")
                ]
                if not audio_candidates:
                    audio_candidates = [
                        f for f in formats 
                        if f.get("acodec") and f.get("acodec") != "none" and f.get("url")
                    ]
                if audio_candidates:
                    audio_candidates.sort(key=_audio_score, reverse=True)
                    best_aud = audio_candidates[0]
                    audio_url = best_aud.get("url")
                    audio_headers = best_aud.get("http_headers") or {}

                if video_url:
                    if len(self._stream_cache) >= 16:
                        try:
                            self._stream_cache.pop(next(iter(self._stream_cache)), None)
                        except (StopIteration, RuntimeError):
                            pass
                    self._stream_cache[cache_key] = (video_url, audio_url, video_headers, audio_headers)

            if video_url:
                ffmpeg_bin = imageio_ffmpeg.get_ffmpeg_exe()
                duration_sec = max(1.0, end_sec - start_sec)
                is_hls_v = "m3u8" in str(video_url).lower()
                is_hls_a = bool(audio_url and "m3u8" in str(audio_url).lower())

                # Fast Path A: Parallel HLS fMP4 segment range extraction (unthrottled ratebypass=yes 4K/1080p)
                if is_hls_v:
                    temp_v_seg = self.temp_dir / f"seg_v_{video_id}_{int(start_sec)}_{int(end_sec)}.mp4"
                    temp_a_seg = self.temp_dir / f"seg_a_{video_id}_{int(start_sec)}_{int(end_sec)}.mp4"
                    try:
                        import time as _t
                        t_hls = _t.time()
                        if progress_callback:
                            progress_callback("Downloading unthrottled 4K/HD segments...", 24)
                        v_seg_start, v_bytes = self._download_hls_fmp4_range(video_url, video_headers, start_sec, end_sec, temp_v_seg)
                        a_seg_start = v_seg_start
                        a_bytes = 0
                        if audio_url and audio_url != video_url and is_hls_a:
                            a_seg_start, a_bytes = self._download_hls_fmp4_range(audio_url, audio_headers, start_sec, end_sec, temp_a_seg)
                        print(
                            f"    [YouTubeDownloader] Parallel HLS segments fetched: "
                            f"video={v_bytes / (1024*1024):.2f} MB, audio={a_bytes / (1024*1024):.2f} MB in {_t.time() - t_hls:.2f}s"
                        )
                        v_local_ss = max(0.0, start_sec - v_seg_start)
                        a_local_ss = max(0.0, start_sec - a_seg_start)
                        hls_cmd = [
                            ffmpeg_bin,
                            "-y",
                            "-loglevel", "error",
                            "-ss", f"{v_local_ss:.3f}",
                            "-i", str(temp_v_seg),
                        ]
                        if temp_a_seg.exists() and temp_a_seg.stat().st_size > 1024:
                            hls_cmd.extend([
                                "-ss", f"{a_local_ss:.3f}",
                                "-i", str(temp_a_seg),
                                "-t", f"{duration_sec:.3f}",
                                "-map", "0:v:0",
                                "-map", "1:a:0",
                            ])
                        else:
                            hls_cmd.extend([
                                "-t", f"{duration_sec:.3f}",
                                "-map", "0:v:0",
                                "-map", "0:a:0?",
                            ])
                        hls_cmd.extend([
                            "-c:v", "libx264",
                            "-preset", "ultrafast",
                            "-crf", "10",
                            "-c:a", "aac",
                            "-b:a", "320k",
                            "-avoid_negative_ts", "make_zero",
                            str(temp_slice),
                        ])
                        proc = subprocess.run(hls_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=90)
                        if proc.returncode == 0 and temp_slice.exists() and temp_slice.stat().st_size > 10240:
                            if output_path.exists():
                                try: output_path.unlink()
                                except Exception: pass
                            shutil.move(str(temp_slice), str(output_path))
                            print(f"    [YouTubeDownloader] 4K/HD HLS slice extracted: {output_path.name} ({round(output_path.stat().st_size / (1024*1024), 2)} MB)")
                            return output_path
                        else:
                            err_msg = proc.stderr.decode('utf-8', errors='ignore')[-300:] if proc.stderr else "Unknown error"
                            print(f"    [YouTubeDownloader] Local HLS mux warning: {err_msg}")
                    except Exception as hls_err:
                        print(f"    [YouTubeDownloader] Parallel HLS segment slice note: {hls_err}")
                    finally:
                        for p_tmp in (temp_v_seg, temp_a_seg):
                            if p_tmp.exists():
                                try: p_tmp.unlink()
                                except Exception: pass

                # Fast Path B: Direct HTTP range seeking with ffmpeg
                default_ua = YOUTUBE_USER_AGENT or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

                def _fmt_headers(hdrs):
                    h = dict(hdrs or {})
                    if "User-Agent" not in h and "user-agent" not in h:
                        h["User-Agent"] = default_ua
                    return "".join(f"{k}: {v}\r\n" for k, v in h.items())

                v_hdrs = _fmt_headers(video_headers)
                a_hdrs = _fmt_headers(audio_headers)

                http_options = [
                    "-reconnect", "1",
                    "-reconnect_at_eof", "1",
                    "-reconnect_streamed", "1",
                    "-reconnect_delay_max", "2",
                    "-timeout", "10000000",
                ]

                cmd = [
                    ffmpeg_bin,
                    "-y",
                    "-loglevel", "error",
                    *http_options,
                    "-headers", v_hdrs,
                    "-ss", str(max(0.0, start_sec)),
                    "-i", video_url,
                ]
                if audio_url and audio_url != video_url:
                    cmd.extend([
                        *http_options,
                        "-headers", a_hdrs,
                        "-ss", str(max(0.0, start_sec)),
                        "-i", audio_url,
                        "-t", str(duration_sec),
                        "-map", "0:v:0",
                        "-map", "1:a:0",
                    ])
                elif audio_url and audio_url == video_url:
                    cmd.extend([
                        "-t", str(duration_sec),
                        "-map", "0:v:0",
                        "-map", "0:a:0?",
                    ])
                else:
                    cmd.extend([
                        "-t", str(duration_sec),
                        "-map", "0:v:0",
                        "-map", "0:a:0?",
                    ])

                # Visually lossless master slice encoding (CRF 10, ultrafast preset for instant slicing)
                cmd.extend([
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-crf", "10",
                    "-sws_flags", "lanczos+accurate_rnd",
                    "-c:a", "aac",
                    "-b:a", "320k",
                    "-avoid_negative_ts", "make_zero",
                    str(temp_slice)
                ])

                print(f"    [YouTubeDownloader] Running direct HTTP range slice with ffmpeg ({duration_sec:.1f}s)...")
                slice_timeout = min(75, max(30, int(duration_sec * 0.9)))
                proc = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=slice_timeout)
                if proc.returncode == 0 and temp_slice.exists() and temp_slice.stat().st_size > 10240:
                    if output_path.exists():
                        try: output_path.unlink()
                        except Exception: pass
                    shutil.move(str(temp_slice), str(output_path))
                    print(f"    [YouTubeDownloader] Fast slice extracted: {output_path.name} ({round(output_path.stat().st_size / (1024*1024), 2)} MB)")
                    return output_path
                else:
                    err_msg = proc.stderr.decode('utf-8', errors='ignore')[-300:] if proc.stderr else "Unknown error"
                    print(f"    [YouTubeDownloader] Direct stream slice warning: {err_msg}")
        except Exception as fast_err:
            print(f"    [YouTubeDownloader] Direct fast slicing note: {fast_err}. Falling back to standard slice downloader...")

        # Fallback to standard yt-dlp downloader if direct range stream extraction was blocked
        q_low = str(quality or "1080p").lower().strip()
        audio_spec = 'bestaudio[language_preference>=0]/bestaudio[format_note*=original]/bestaudio[language=en]/bestaudio'
        if "8k" in q_low or "4320" in q_low:
            format_str = f'bestvideo[height<=4320]+{audio_spec}/bestvideo+bestaudio/best[height<=4320]/best'
        elif q_low in ("4k", "2160p", "1440p", "2k", "1080p", "source", "original"):
            format_str = f'bestvideo[height<=2160]+{audio_spec}/bestvideo+bestaudio/best[height<=2160]/best'
        else:
            format_str = f'bestvideo[height<=1440]+{audio_spec}/bestvideo+bestaudio/best[height<=1440]/best'

        def ytdl_progress(d):
            if d.get('status') == 'downloading' and progress_callback:
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                if total > 0:
                    pct = int((downloaded / total) * 100)
                    mapped_pct = min(34, 18 + int(pct * 0.16))
                    speed = d.get('speed')
                    speed_str = f"({speed / 1048576:.1f} MB/s)" if speed else ""
                    progress_callback(f"Downloading targeted video slice {pct}% {speed_str}...", mapped_pct)
                else:
                    progress_callback("Downloading targeted video slice from YouTube...", 22)

        fallback_opts = self._get_base_opts()
        fallback_opts.update({
            'format': format_str,
            'outtmpl': output_path.with_suffix('').as_posix() + '.%(ext)s',
            'merge_output_format': 'mp4',
            'download_ranges': yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)]),
            'force_keyframes_at_cuts': False,
            'concurrent_fragment_downloads': 4,
            'socket_timeout': 15,
            'retries': 3,
            'progress_hooks': [ytdl_progress] if progress_callback else [],
        })

        print(f"    [YouTubeDownloader] Downloading targeted stream slice via yt-dlp ({start_sec:.1f}s - {end_sec:.1f}s, Quality: {quality})...")
        if progress_callback:
            progress_callback(f"Downloading targeted stream slice ({start_sec:.0f}s-{end_sec:.0f}s, {quality})...", 20)

        import concurrent.futures
        def _exec_slice_download():
            with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                ydl.extract_info(url, download=True)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            fut = executor.submit(_exec_slice_download)
            try:
                fut.result(timeout=180)
            except Exception as dl_timeout_err:
                print(f"    [YouTubeDownloader] Standard yt-dlp slice download notice: {dl_timeout_err}")
                raise RuntimeError(f"Targeted slice download timed out or failed: {dl_timeout_err}")

        def _is_valid_video_file(p: Path) -> bool:
            if not p.exists() or p.stat().st_size < 10240:
                return False
            try:
                from moviepy.video.io.ffmpeg_reader import ffmpeg_parse_infos
                infos = ffmpeg_parse_infos(str(p))
                return bool(infos.get('video_found') and infos.get('video_fps'))
            except Exception:
                return False

        if not _is_valid_video_file(output_path):
            candidates = [c for c in self.temp_dir.glob(f"{output_path.stem}.*") if _is_valid_video_file(c)]
            if candidates:
                output_path = candidates[0]
            else:
                mp4_target = output_path.with_suffix('.mp4')
                if _is_valid_video_file(mp4_target):
                    output_path = mp4_target
                else:
                    raise FileNotFoundError(f"Failed to extract valid video slice from {start_sec}s to {end_sec}s")

        print(f" Slice downloaded: {output_path.name} ({round(output_path.stat().st_size / (1024*1024), 2)} MB)")
        return output_path

    def download(self, url: str, quality: str = "720p", custom_range: Optional[List[float]] = None, progress_callback: Optional[Any] = None, **kwargs) -> Tuple[Path, Optional[Path], str, float]:
        """
        Full-video or fast custom-range stream downloader.
        """
        video_id = self.get_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL provided.")

        if custom_range:
            start_sec, end_sec = custom_range
            print(f" Fast direct slice download for range [{start_sec}s - {end_sec}s]...")
            slice_path = self.download_slice(url, start_sec, end_sec, quality=quality, progress_callback=progress_callback)
            info = self.get_video_info(url)
            return slice_path, None, info.get('title', 'YouTube Video'), max(1.0, end_sec - start_sec)

        q_low = str(quality or "1080p").lower().strip()
        audio_spec = 'bestaudio[language_preference>=0]/bestaudio[format_note*=original]/bestaudio[language=en]/bestaudio'
        if "8k" in q_low or "4320" in q_low:
            format_str = f'bestvideo[height<=4320]+{audio_spec}/bestvideo+bestaudio/best[height<=4320]/best'
        elif q_low in ("4k", "2160p", "1440p", "2k", "1080p", "source", "original"):
            format_str = f'bestvideo[height<=2160]+{audio_spec}/bestvideo+bestaudio/best[height<=2160]/best'
        else:
            format_str = f'bestvideo[height<=1440]+{audio_spec}/bestvideo+bestaudio/best[height<=1440]/best'

        def ytdl_dl_progress(d):
            if d.get('status') == 'downloading' and progress_callback:
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate', 0)
                if total > 0:
                    pct = int((downloaded / total) * 100)
                    mapped_pct = min(40, 20 + int(pct * 0.20))
                    speed = d.get('speed')
                    speed_str = f"({speed / 1048576:.1f} MB/s)" if speed else ""
                    progress_callback(f"Downloading source video {pct}% {speed_str}...", mapped_pct)
                else:
                    progress_callback("Downloading source video...", 25)

        opts = self._get_base_opts()
        opts.update({
            'format': format_str,
            'outtmpl': (self.temp_dir / f'{video_id}.%(ext)s').as_posix(),
            'merge_output_format': 'mp4',
            'progress_hooks': [ytdl_dl_progress] if progress_callback else [],
        })

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