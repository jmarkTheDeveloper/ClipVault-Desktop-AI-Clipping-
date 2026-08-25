"""
Configuration for the YouTube Viral Clipper application.

This module loads environment variables and sets up default configurations
for the application. It includes settings for API keys, directories,
and model configurations.
"""
import os
import shutil
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Ensure standard ffmpeg.exe exists and is in system PATH for yt-dlp partial slicing
try:
    import imageio_ffmpeg
    img_exe = imageio_ffmpeg.get_ffmpeg_exe()
    img_dir = os.path.dirname(img_exe)
    std_exe = os.path.join(img_dir, 'ffmpeg.exe')
    if not os.path.exists(std_exe):
        try: shutil.copy2(img_exe, std_exe)
        except Exception: pass
    if img_dir not in os.environ.get('PATH', ''):
        os.environ['PATH'] = img_dir + os.pathsep + os.environ.get('PATH', '')
except Exception as _ffmpeg_setup_err:
    pass

BASE_DIR = Path(__file__).resolve().parent
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')
OUTPUT_DIR = Path(os.getenv('OUTPUT_DIR', str(BASE_DIR / 'clips'))).resolve()
TEMP_DIR = Path(os.getenv('TEMP_DIR', str(BASE_DIR / 'temp'))).resolve()
# Whisper model size (options: tiny, base, small, medium, large-v2)
# Using base model for ultra-fast CPU transcription with great accuracy
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'base')
YOUTUBE_USER_AGENT = os.getenv('YOUTUBE_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
YOUTUBE_COOKIES_CONTENT = os.getenv('YOUTUBE_COOKIES_CONTENT', '')

BACKGROUNDS_DIR = Path(os.getenv('BACKGROUNDS_DIR', str(BASE_DIR / 'backgrounds'))).resolve()
MUSIC_DIR = Path(os.getenv('MUSIC_DIR', str(BASE_DIR / 'music'))).resolve()
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')

# Create directories
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
BACKGROUNDS_DIR.mkdir(parents=True, exist_ok=True)
MUSIC_DIR.mkdir(parents=True, exist_ok=True)

if "YOUR_API_KEY_HERE" in GEMINI_API_KEY:
    print("⚠️ WARNING: Please replace 'YOUR_API_KEY_HERE' with your actual Google AI Studio API key in your .env file.")
