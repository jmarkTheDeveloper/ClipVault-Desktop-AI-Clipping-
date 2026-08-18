import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import yt_dlp
import imageio_ffmpeg

from config import TEMP_DIR, YOUTUBE_COOKIES_CONTENT, YOUTUBE_USER_AGENT


class YouTubeDownloader:
    def __init__(self, temp_dir=TEMP_DIR):
        self.temp_dir = temp_dir

    @staticmethod
    def get_video_id(url):
        if 'youtu.be' in url:
            return url.split('/')[-1].split('?')[0]
        if 'youtube.com' in url:
            return parse_qs(urlparse(url).query).get('v', [None])[0]
        return None

    def download(self, url, quality="720p", custom_range=None):
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

        import shutil
        node_path = shutil.which('node')
        if not node_path and os.path.exists(r'C:\Program Files\nodejs\node.exe'):
            node_path = r'C:\Program Files\nodejs\node.exe'

        js_runtimes = {'node': {}}
        if node_path:
            js_runtimes['node']['path'] = node_path

        opts = {
            'format': format_str,
            'outtmpl': os.path.join(self.temp_dir, '%(id)s.%(ext)s'),
            'merge_output_format': 'mp4',
            'geo_bypass': True,
            'nocheckcertificate': True,
            'ignoreerrors': False,
            'quiet': True,
            'no_warnings': False,
            'retries': 10,
            'extractor_retries': 10,
            'user_agent': YOUTUBE_USER_AGENT,
            'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
            'js_runtimes': js_runtimes
        }
        
        if custom_range:
            start_sec, end_sec = custom_range
            opts['download_ranges'] = yt_dlp.utils.download_range_func(None, [(start_sec, end_sec)])
            opts['force_keyframes_at_cuts'] = True

        cookie_file_path = None
        if YOUTUBE_COOKIES_CONTENT and "PASTE" not in YOUTUBE_COOKIES_CONTENT:
            print("Authentication cookies found. Applying them to the download request.")
            with tempfile.NamedTemporaryFile(mode='w+', delete=False, dir=self.temp_dir, suffix='.txt') as cookie_file:
                cookie_file.write(YOUTUBE_COOKIES_CONTENT)
                cookie_file_path = cookie_file.name
            opts['cookiefile'] = cookie_file_path
        else:
            print("Warning: No cookies provided. The download may be blocked by YouTube for certain videos.")

        # Clean up any existing files for this video ID to prevent loading corrupted files from previous crashes
        for old_file in self.temp_dir.glob(f'{video_id}.*'):
            try:
                os.remove(old_file)
            except Exception:
                pass

        try:
            print("DEBUG: yt-dlp opts =", opts)
            with yt_dlp.YoutubeDL(opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=True)
                except yt_dlp.utils.DownloadError as e:
                    print(f"First download attempt failed: {str(e)}")
                    print("Trying alternative download method...")
                    # Try with different format options
                    opts['format'] = 'bestvideo+bestaudio/best'
                    with yt_dlp.YoutubeDL(opts) as ydl2:
                        info = ydl2.extract_info(url, download=True)
        except Exception as e:
            raise Exception(f"Failed to download video: {str(e)}")
        finally:
            if cookie_file_path and os.path.exists(cookie_file_path):
                os.remove(cookie_file_path)

        video_path = next(self.temp_dir.glob(f'{video_id}.mp4'), None)
        if not video_path:
            # Try to find any video file with the video_id prefix
            video_path = next(self.temp_dir.glob(f'{video_id}.*'), None)
            if not video_path:
                raise FileNotFoundError("Failed to download the video file.")

        return video_path, info.get('title', 'N/A'), info.get('duration', 0)