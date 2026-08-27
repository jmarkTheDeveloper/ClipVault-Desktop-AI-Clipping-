"""
Configuration for the ClipVault AI application.

This module loads environment variables and sets up default configurations
for the application. It includes settings for API keys, directories,
and model configurations.
"""
import os
import sys
import shutil
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Packaged exe detection ──────────────────────────────────────────────────
# When Electron launches the bundled engine_server.exe it sets CLIPVAULT_ENGINE_DATA
# to a writable AppData path. In dev mode this env var is absent.
_ENGINE_DATA_ENV = os.getenv('CLIPVAULT_ENGINE_DATA', '')

# PyInstaller sets sys._MEIPASS to the temp-extracted bundle path.
# Use that as the read-only source root; user data goes to AppData.
_IS_PACKAGED = getattr(sys, '_MEIPASS', None) is not None

if _IS_PACKAGED and _ENGINE_DATA_ENV:
    # Production: read-only bundle at sys._MEIPASS, writable user data at AppData
    BASE_DIR = Path(sys._MEIPASS)
    _USER_DATA_DIR = Path(_ENGINE_DATA_ENV)
else:
    # Development: everything lives in the engine/ source folder
    BASE_DIR = Path(__file__).resolve().parent
    _USER_DATA_DIR = BASE_DIR

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

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')

# Writable paths — always go to user data dir in production
OUTPUT_DIR    = Path(os.getenv('OUTPUT_DIR',    str(_USER_DATA_DIR / 'clips'))).resolve()
TEMP_DIR      = Path(os.getenv('TEMP_DIR',      str(_USER_DATA_DIR / 'temp'))).resolve()
BACKGROUNDS_DIR = Path(os.getenv('BACKGROUNDS_DIR', str(_USER_DATA_DIR / 'backgrounds'))).resolve()
MUSIC_DIR     = Path(os.getenv('MUSIC_DIR',     str(_USER_DATA_DIR / 'music'))).resolve()

# Model / behaviour settings
WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'small')
YOUTUBE_USER_AGENT = os.getenv('YOUTUBE_USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
YOUTUBE_COOKIES_CONTENT = os.getenv('YOUTUBE_COOKIES_CONTENT', '')
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET', '')

# Create directories
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
BACKGROUNDS_DIR.mkdir(parents=True, exist_ok=True)
MUSIC_DIR.mkdir(parents=True, exist_ok=True)

if "YOUR_API_KEY_HERE" in GEMINI_API_KEY:
    print("[WARNING] Please set your actual API key in the app's Engine Settings.")

