import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# Replace pytube with pytubefix
from pytubefix import YouTube
from pytubefix.exceptions import PytubeFixError

from config import TEMP_DIR, YOUTUBE_USER_AGENT


class YouTubeDownloader:
    """
    Handles the downloading of YouTube videos.

    This class uses the pytubefix library to download a YouTube video
    and prepares it for further processing.
    """
    def __init__(self, temp_dir=TEMP_DIR):
        """
        Initializes the YouTubeDownloader.

        Args:
            temp_dir (Path, optional): The directory to save temporary files.
                                       Defaults to TEMP_DIR from config.
        """
        self.temp_dir = temp_dir
        
    def _sanitize_filename(self, filename):
        """
        Sanitizes a filename by removing invalid characters.

        Args:
            filename (str): The filename to sanitize.

        Returns:
            str: The sanitized filename.
        """
        if not filename:
            return "unknown_title"
            
        # Replace characters that are problematic in filenames
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            filename = filename.replace(char, '_')
            
        # Limit filename length to avoid path too long errors
        if len(filename) > 100:
            filename = filename[:97] + '...'
            
        return filename

    @staticmethod
    def get_video_id(url):
        """
        Extracts the video ID from a YouTube URL.

        Args:
            url (str): The YouTube URL.

        Returns:
            str: The video ID, or None if not found.
        """
        if 'youtu.be' in url:
            return url.split('/')[-1].split('?')[0]
        if 'youtube.com' in url:
            return parse_qs(urlparse(url).query).get('v', [None])[0]
        return None
    def download(self, url, quality="720p", custom_range=None):
        """
        Downloads a YouTube video from the given URL using high-quality yt-dlp.
        """
        print(f"🔗 Processing YouTube URL: {url} (Quality preset: {quality})")
        video_id = self.get_video_id(url)
        if not video_id:
            raise ValueError("Invalid YouTube URL provided.")
        print(f"✅ Extracted video ID: {video_id}")

        # Ensure temp directory exists
        os.makedirs(self.temp_dir, exist_ok=True)
        
        try:
            print("🚀 Using high-resolution yt-dlp downloader engine...")
            from services.youtube_downloader_yt_dlp import YouTubeDownloader as YtDlpDownloader
            downloader = YtDlpDownloader(temp_dir=self.temp_dir)
            video_path, title, duration = downloader.download(url, quality=quality, custom_range=custom_range)
            print(f"✅ Download completed successfully in native resolution ({title})!")
            return Path(video_path), None, title, duration
        except Exception as yt_err:
            print(f"⚠️ yt-dlp encountered an error: {yt_err}. Trying secondary pytubefix fallback...")
            
            try:
                if quality == "720p":
                    raise ValueError("Fast 720p download requested. Skipping high-res adaptive streams.")

                # Try downloading high-res adaptive streams (capped at 1080p)
                # Determine max resolution based on requested quality
                max_res = 1080
                if quality.lower() == "4k":
                    max_res = 2160
                elif quality.lower() == "8k":
                    max_res = 4320
                    
                print(f"⏳ Selecting best quality adaptive video stream (max {max_res}p)...")
                video_streams = (
                    yt.streams
                    .filter(only_video=True, file_extension='mp4')
                    .order_by('resolution')
                    .desc()
                )
                
                # Find the best stream that is <= max_res
                video_stream = None
                for s in video_streams:
                    if s.resolution:
                        try:
                            res_val = int(s.resolution.replace('p', ''))
                            if res_val <= max_res:
                                video_stream = s
                                break
                        except ValueError:
                            continue
                            
                if not video_stream:
                    video_stream = video_streams.first()
                
                print("⏳ Selecting best quality audio stream...")
                audio_stream = (
                    yt.streams
                    .filter(only_audio=True, file_extension='mp4')
                    .order_by('abr')
                    .desc()
                    .first()
                )
                if not audio_stream:
                    # Fallback to any audio stream if no mp4 format is available
                    audio_stream = (
                        yt.streams
                        .filter(only_audio=True)
                        .order_by('abr')
                        .desc()
                        .first()
                    )
                
                if video_stream and audio_stream:
                    print(f"Selected video stream: {video_stream.resolution}, {video_stream.mime_type}")
                    print(f"Selected audio stream: {audio_stream.abr}, {audio_stream.mime_type}")
                    
                    video_filename = f"{video_id}_video.mp4"
                    # Determine extension dynamically to prevent container header mismatches
                    audio_ext = 'm4a' if audio_stream.subtype == 'mp4' else audio_stream.subtype
                    audio_filename = f"{video_id}_audio.{audio_ext}"
                    
                    video_path = os.path.join(output_path, video_filename)
                    audio_path = os.path.join(output_path, audio_filename)
                    
                    # Delete existing temp files of the same video to prevent container codec conflicts
                    if os.path.exists(video_path):
                        try: os.remove(video_path)
                        except: pass
                    if os.path.exists(audio_path):
                        try: os.remove(audio_path)
                        except: pass
                    
                    print(f"⏳ Downloading video stream ({video_stream.filesize/(1024*1024):.1f} MB)...")
                    video_path = video_stream.download(output_path=output_path, filename=video_filename)
                    
                    print(f"⏳ Downloading audio stream ({audio_stream.filesize/(1024*1024):.1f} MB)...")
                    audio_path = audio_stream.download(output_path=output_path, filename=audio_filename)
                    
                    # Verify both files exist and have content
                    if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
                        raise FileNotFoundError(f"Downloaded video stream file is missing or empty: {video_path}")
                    if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
                        raise FileNotFoundError(f"Downloaded audio stream file is missing or empty: {audio_path}")
                    
                    print("✅ High-quality video and audio download complete!")
                    return Path(video_path), Path(audio_path), title, duration
                else:
                    raise ValueError("No adaptive video/audio stream combination found")
            except Exception as e:
                print(f"⚠️ High-quality adaptive download failed or unavailable ({e}). Falling back to progressive stream...")
                
                # First try to get progressive stream (combined audio and video)
                stream = (
                    yt.streams
                    .filter(progressive=True, file_extension='mp4')
                    .order_by('resolution')
                    .desc()
                    .first()
                )
                
                # If no suitable progressive stream is found, try any stream
                if not stream:
                    print("⚠️ No progressive stream found, trying any stream")
                    stream = (
                        yt.streams
                        .filter(file_extension='mp4')
                        .order_by('resolution')
                        .desc()
                        .first()
                    )
                
                if not stream:
                    raise ValueError("No suitable video stream found")
                
                print(f"Selected progressive stream: {stream.resolution}, {stream.mime_type}")
                print(f"Stream itag: {stream.itag}, File size: {stream.filesize/(1024*1024):.1f} MB")
                print(f"⏳ Starting download (this may take a while)...")
                
                video_path = stream.download(output_path=output_path, filename=output_filename)
                
                # Verify the file exists and has content
                if not os.path.exists(video_path) or os.path.getsize(video_path) == 0:
                    raise FileNotFoundError(f"Downloaded file is missing or empty: {video_path}")
                
                file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
                print(f"✅ Download complete! File size: {file_size_mb:.2f} MB")
                
                return Path(video_path), None, title, duration
            
        except Exception as e:
            print(f"⚠️ Primary pytubefix download failed or blocked: {str(e)}")
            print("🚀 Attempting fallback download using yt-dlp...")
            try:
                from services.youtube_downloader_yt_dlp import YouTubeDownloader as FallbackDownloader
                fallback = FallbackDownloader(temp_dir=self.temp_dir)
                video_path, title, duration = fallback.download(url, quality=quality)
                print("✅ Fallback download using yt-dlp completed successfully!")
                return Path(video_path), None, title, duration
            except Exception as fallback_err:
                print(f"❌ Fallback yt-dlp download also failed: {fallback_err}")
                raise Exception(f"Failed to download video using both pytubefix and yt-dlp.\nOriginal error: {str(e)}\nFallback error: {fallback_err}")
