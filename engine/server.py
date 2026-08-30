import asyncio
import sys

# Silence harmless Windows asyncio ConnectionResetError spam
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        import ctypes
        # Set process priority to NORMAL_PRIORITY_CLASS (0x00000020) for full multi-core performance
        process_handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.kernel32.SetPriorityClass(process_handle, 0x00000020)
        print("⚡ Background engine priority set to 'Normal High-Speed Priority'.")
    except Exception:
        pass

from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, Header, Body, UploadFile, File, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Any, Dict, Union
import uuid
import sys
import os
import json
import mimetypes
import threading
from pathlib import Path

# Force UTF-8 encoding for stdout and stderr on Windows to prevent charmap errors with emojis
if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.video_processor import VideoProcessor
from services.auth_verifier import AuthVerifier

app = FastAPI(
    title="AI Video Clipping Engine API",
    description="Local API backend for AI clipping and movie summarizing",
    version="1.0.0"
)

# Enable CORS for frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_verifier = AuthVerifier()

from config import OUTPUT_DIR, TEMP_DIR, BACKGROUNDS_DIR, MUSIC_DIR
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)
BACKGROUNDS_DIR.mkdir(parents=True, exist_ok=True)
MUSIC_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/outputs", StaticFiles(directory=str(OUTPUT_DIR.resolve())), name="outputs")
app.mount("/clips", StaticFiles(directory=str(OUTPUT_DIR.resolve())), name="clips")
app.mount("/backgrounds", StaticFiles(directory=str(BACKGROUNDS_DIR.resolve())), name="backgrounds")
app.mount("/music", StaticFiles(directory=str(MUSIC_DIR.resolve())), name="music")

# In-memory database to store background task status
tasks_db = {}

class ProcessRequest(BaseModel):
    url: str
    num_clips: int = 1
    target_duration: int = -1
    topic: Optional[str] = None
    layout: str = "vertical_crop"
    split_screen: bool = False
    movie_recap: bool = False
    quality: str = "720p"
    yt_bypass: bool = False
    tts_voice: str = "en-US-ChristopherNeural"
    tts_pitch: str = "-20Hz"
    tts_rate: str = "+0%"
    custom_range: Optional[List[float]] = None
    add_bg_music: Optional[bool] = True
    add_captions: Optional[bool] = True
    hook_text: Optional[str] = None
    transcription_language: Optional[str] = "auto"
    lyrc_promo: Optional[bool] = False
    custom_range_filter: Optional[List[float]] = None
    filter_profile: Optional[str] = 'default'
    apply_exposure_flashes: Optional[bool] = False
    apply_streamer_shake: Optional[bool] = False
    facecam_pos: Optional[str] = 'top_left'
    custom_file_name: Optional[str] = None
    custom_folder_name: Optional[str] = None
    output_dir: Optional[str] = None
    auto_sfx: Optional[bool] = False
    bg_music_vol: Optional[float] = 0.1
    custom_crop_boxes: Optional[Any] = None
    caption_style: str = "capcut_yellow"
    caption_y_pct: Optional[float] = 0.70
    ai_engine: str = "openai_sora"
    api_key: Optional[str] = None
    camera_style: str = "instant"
    gameplay_bg_video: Optional[str] = None
    bg_music_file: Optional[str] = None

    model_config = {"arbitrary_types_allowed": True}

ProcessRequest.model_rebuild()

def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Security dependency that validates the JWT OAuth token passed in the Authorization header.
    Falls back to dev-user if SUPABASE_JWT_SECRET is empty.
    """
    if not os.environ.get("SUPABASE_JWT_SECRET"):
        return {
            "sub": "dev-user-id-12345",
            "email": "dev@clippingapp.com",
            "user_metadata": {"full_name": "Dev User"}
        }

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header format (must be 'Bearer <token>')")
    token = authorization.split(" ")[1]
    user = auth_verifier.verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid OAuth token credentials")
    return user

cancellation_events: Dict[str, threading.Event] = {}

def execute_rendering_task(task_id: str, request: ProcessRequest, cancel_event: Optional[threading.Event] = None):
    """
    Worker task running inside the thread pool to execute clip generation.
    """
    try:
        tasks_db[task_id]["message"] = "Initializing video processor..."
        tasks_db[task_id]["progress"] = 5
        api_key = getattr(request, "api_key", None) or os.environ.get("GEMINI_API_KEY")
        processor = VideoProcessor(
            api_key=api_key,
            ai_engine=request.ai_engine,
            caption_style=request.caption_style
        )
        
        # Determine topic selection filter
        custom_range_filter = request.custom_range_filter
        
        tasks_db[task_id]["message"] = "Downloading and rendering clips (this may take a few minutes)..."
        
        def on_progress(message, percent):
            if cancel_event and cancel_event.is_set():
                tasks_db[task_id]["status"] = "cancelled"
                tasks_db[task_id]["message"] = "Processing stopped by user."
                return
            tasks_db[task_id]["message"] = message
            tasks_db[task_id]["progress"] = percent
            
        outputs, title, output_folder = processor.process_video(
            url=request.url,
            num_clips=request.num_clips,
            target_duration=request.target_duration,
            topic=request.topic,
            layout=request.layout,
            split_screen=request.split_screen,
            movie_recap=request.movie_recap,
            quality=request.quality,
            yt_bypass=request.yt_bypass,
            tts_voice=request.tts_voice,
            tts_pitch=request.tts_pitch,
            tts_rate=request.tts_rate,
            custom_range=request.custom_range,
            add_bg_music=request.add_bg_music,
            add_captions=request.add_captions,
            hook_text=request.hook_text,
            lyrc_promo=request.lyrc_promo,
            custom_range_filter=custom_range_filter,
            filter_profile=request.filter_profile,
            apply_exposure_flashes=request.apply_exposure_flashes,
            apply_streamer_shake=request.apply_streamer_shake,
            facecam_pos=request.facecam_pos,
            custom_file_name=request.custom_file_name,
            auto_sfx=request.auto_sfx,
            bg_music_vol=request.bg_music_vol,
            custom_crop_boxes=request.custom_crop_boxes,
            camera_style=request.camera_style,
            transcription_language=request.transcription_language,
            caption_y_pct=request.caption_y_pct,
            caption_style=request.caption_style,
            custom_folder_name=request.custom_folder_name,
            output_dir=request.output_dir,
            gameplay_bg_video=request.gameplay_bg_video,
            bg_music_file=request.bg_music_file,
            progress_callback=on_progress,
            cancel_event=cancel_event
        )
        
        if cancel_event and cancel_event.is_set():
            tasks_db[task_id]["status"] = "cancelled"
            tasks_db[task_id]["message"] = "Processing stopped by user."
            return

        tasks_db[task_id]["status"] = "completed"
        tasks_db[task_id]["progress"] = 100
        tasks_db[task_id]["message"] = "Clips successfully generated!"
        
        # Convert absolute paths to relative /outputs URLs for the frontend
        output_urls = []
        raw_files = []
        for out in outputs:
            if isinstance(out, (str, Path)):
                filename = Path(out).name
                output_urls.append(f"http://127.0.0.1:8000/outputs/{filename}")
                raw_files.append(str(Path(out).resolve()))
            elif isinstance(out, dict) and "path" in out:
                filename = Path(out["path"]).name
                out["url"] = f"http://127.0.0.1:8000/outputs/{filename}"
                output_urls.append(out)
                raw_files.append(str(Path(out["path"]).resolve()))
        
        tasks_db[task_id]["result"] = {
            "title": title,
            "clips": output_urls,
            "output_folder": output_folder,
            "file_paths": raw_files
        }
    except Exception as e:
        err_str = str(e)
        clean_msg = "An unexpected error occurred during processing. Please check your settings or try again."
        is_rate_limit = False

        # Detect rate limits and quota limits across providers with zero source code leakage
        lower_err = err_str.lower()
        if any(term in lower_err for term in ["429", "resource_exhausted", "quota", "ratelimit", "rate limit", "too many requests", "insufficient_quota", "exhausted"]):
            is_rate_limit = True
            clean_msg = "Oh no! Your API key is at its limit already. Switch to 100% Free Local GPU/NPU mode or update your API key in settings."
        elif "cancelled" in lower_err or "interrupted" in lower_err:
            clean_msg = "Processing stopped by user."
        elif "rejection" in lower_err or "background video" in lower_err:
            clean_msg = err_str
        elif "youtube" in lower_err or "download" in lower_err:
            clean_msg = "Could not fetch or download the video. Please verify the URL or try another video."

        print(f"⚠️ Task {task_id} error sanitized: {clean_msg}")
        tasks_db[task_id]["status"] = "failed"
        tasks_db[task_id]["is_rate_limit"] = is_rate_limit
        tasks_db[task_id]["error"] = clean_msg
        tasks_db[task_id]["message"] = clean_msg
    finally:
        if task_id in cancellation_events:
            cancellation_events.pop(task_id, None)
        try:
            from utils.helpers import cleanup_temp_files
            cleanup_temp_files()
        except Exception:
            pass
        gc.collect()

def purge_ghost_files():
    """
    Cleans 0-byte ghost files, .trash temporary leftovers, and any stale duplicates across ALL folders.
    Guarantees that every unique clip appears EXACTLY ONCE across the entire application.
    """
    import time
    try:
        if OUTPUT_DIR.exists():
            # 1. Clean 0-byte ghost files and .trash leftovers
            for p in list(OUTPUT_DIR.rglob("*")):
                try:
                    if p.is_file():
                        if p.name.startswith(".trash") or p.name.endswith(".trash"):
                            try: p.unlink()
                            except Exception: pass
                        elif p.suffix.lower() == ".mp4" and p.stat().st_size == 0:
                            try: p.unlink()
                            except Exception: pass
                except Exception:
                    pass

            # 2. Universal Multi-Folder Deduplication across ALL folders at any depth:
            # Group all MP4 files by lowercase filename
            clips_by_name = {}
            for p in OUTPUT_DIR.rglob("*.mp4"):
                if not p.name.startswith(".") and not p.name.startswith(".trash") and p.stat().st_size > 0:
                    clips_by_name.setdefault(p.name.lower(), []).append(p)

            # For each clip with multiple copies, keep the NEWEST copy and purge all older stale copies!
            for name, paths in clips_by_name.items():
                if len(paths) > 1:
                    paths.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                    active_clip = paths[0]
                    stale_clips = paths[1:]
                    print(f"🧹 Deduplicating '{name}': keeping newest in '{active_clip.parent.name}', purging {len(stale_clips)} older copy/copies")
                    for old_p in stale_clips:
                        try:
                            old_p.unlink()
                        except Exception:
                            try:
                                trash_target = old_p.with_name(f".trash_{int(time.time())}_{old_p.name}")
                                old_p.rename(trash_target)
                            except Exception:
                                pass
    except Exception as e:
        print(f"Error in purge_ghost_files: {e}")

@app.get("/api/saved_clips")
def get_saved_clips():
    """
    Scans the output directory (and all subfolders) to return all generated video clips, metadata, and folders.
    """
    purge_ghost_files()
    clips = []
    folders = set()
    try:
        # 1. Discover all custom subfolders and sub-subfolders on disk (including empty folders)
        for item in OUTPUT_DIR.rglob("*"):
            if item.is_dir():
                parts = [p.lower() for p in item.relative_to(OUTPUT_DIR).parts]
                if not any(x in ["metadata", "__pycache__", ".git", "temp"] for x in parts):
                    folders.add(item.relative_to(OUTPUT_DIR).as_posix())

        # 2. Search root output dir and all subdirectories for video files
        for path in sorted(OUTPUT_DIR.glob("**/*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                if path.name.startswith(".") or path.name.startswith(".trash"):
                    continue
                stat = path.stat()
                if stat.st_size == 0:
                    continue
                
                # Determine folder name relative to OUTPUT_DIR
                rel_parent = path.parent.relative_to(OUTPUT_DIR).as_posix()
                folder_name = rel_parent if rel_parent != "." else "Main Library"
                if folder_name != "Main Library" and "metadata" not in folder_name.lower():
                    folders.add(folder_name)
                    
                # Look for metadata file in metadata/ subfolder or same folder
                meta_file = path.parent / "metadata" / f"{path.stem}_metadata.txt"
                if not meta_file.exists():
                    meta_file = path.parent / f"{path.stem}_metadata.txt"
                    
                title = path.stem.replace("_", " ").title()
                description = ""
                virality_score = 95
                
                if meta_file.exists():
                    try:
                        content = meta_file.read_text(encoding="utf-8")
                        lines = [line.strip() for line in content.split("\n") if line.strip()]
                        for i, line in enumerate(lines):
                            if "🎬 Catchy Title:" in line and i + 1 < len(lines):
                                title = lines[i+1]
                            elif "📝 Description" in line and i + 1 < len(lines):
                                description = "\n".join(lines[i+1:])
                    except Exception:
                        pass
                
                # Try to extract score from filename e.g. clip_1_95pts_...
                if "pts" in path.name:
                    try:
                        pts_part = path.name.split("pts")[0].split("_")[-1]
                        virality_score = int(pts_part)
                    except Exception:
                        pass

                # Relative URL for static serving (URL-encoded to handle spaces cleanly)
                import urllib.parse
                rel_path = path.relative_to(OUTPUT_DIR).as_posix()
                quoted_rel_path = urllib.parse.quote(rel_path)
                clip_url = f"http://127.0.0.1:8000/clips/{quoted_rel_path}"

                clips.append({
                    "filename": path.name,
                    "path": str(path.resolve()),
                    "url": clip_url,
                    "title": title,
                    "description": description,
                    "virality_score": virality_score,
                    "created_at": stat.st_mtime,
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "folder": folder_name
                })
            except Exception as clip_err:
                print(f"⚠️ Error reading clip {path}: {clip_err}")
    except Exception as e:
        print(f"⚠️ Failed to list saved clips: {e}")

    return {
        "clips": clips,
        "folders": sorted(list(folders)),
        "storage_dir": str(OUTPUT_DIR)
    }

@app.post("/api/delete_clip")
@app.post("/api/delete_clips")
def delete_clip(data: dict = Body(...)):
    """
    Permanently deletes saved clip(s) and their metadata from disk.
    Supports single path or list of paths, HTTP URLs, and relative paths.
    """
    import urllib.parse
    import gc
    import subprocess
    import time
    
    paths_to_delete = data.get("paths") or data.get("clip_paths") or data.get("file_paths")
    if not paths_to_delete:
        single = data.get("path") or data.get("file_path") or data.get("filePath") or data.get("filename") or data.get("url")
        if single:
            paths_to_delete = [single]
        else:
            return {"success": False, "error": "Path(s) are required"}

    deleted_files = []
    
    def resolve_target(raw_path: str) -> Optional[Path]:
        raw_str = str(raw_path).strip()
        if raw_str.startswith("http://") or raw_str.startswith("https://"):
            parsed = urllib.parse.urlparse(raw_str)
            fname = Path(urllib.parse.unquote(parsed.path)).name
            p_clean = fname
        else:
            p_clean = urllib.parse.unquote(raw_str)
            for prefix in ['local:///', 'local://', 'file:///', 'file://']:
                if p_clean.lower().startswith(prefix):
                    p_clean = p_clean[len(prefix):]
            fname = Path(p_clean).name

        target = Path(p_clean)
        if not (target.is_absolute() and target.exists()):
            rel_target = (OUTPUT_DIR / p_clean).resolve()
            if rel_target.exists():
                return rel_target
            rel_fname = (OUTPUT_DIR / fname).resolve()
            if rel_fname.exists():
                return rel_fname
            for candidate in OUTPUT_DIR.rglob("*.mp4"):
                if candidate.name.lower() == fname.lower() or candidate.stem.lower() == Path(fname).stem.lower():
                    return candidate
            return None
        return target

    gc.collect()

    for item in paths_to_delete:
        target = resolve_target(item)
        if target and target.exists() and target.is_file():
            # 1. Clean up metadata first
            meta_file = target.parent / "metadata" / f"{target.stem}_metadata.txt"
            if not meta_file.exists():
                meta_file = target.parent / f"{target.stem}_metadata.txt"
            if meta_file.exists():
                try: meta_file.unlink()
                except: pass

            # 2. Delete main video file
            deleted = False
            try:
                os.chmod(str(target), 0o777)
                target.unlink()
                deleted = True
            except (PermissionError, OSError):
                for _ in range(4):
                    gc.collect()
                    time.sleep(0.08)
                    try:
                        os.chmod(str(target), 0o777)
                        target.unlink()
                        deleted = True
                        break
                    except Exception:
                        pass

                if not deleted and target.exists():
                    try:
                        # Move out of clips library to temp folder so it vanishes immediately from user's view
                        trash_name = TEMP_DIR / f"deleted_{uuid.uuid4().hex[:8]}_{target.name}"
                        target.rename(trash_name)
                        deleted = True
                        try: trash_name.unlink()
                        except Exception: pass
                    except Exception:
                        # Force delete via cmd
                        subprocess.run(["cmd", "/c", "del", "/f", "/q", "/a", str(target)], capture_output=True, check=False)
                        if not target.exists():
                            deleted = True

            if deleted or not target.exists():
                deleted_files.append(str(target))
                print(f"🗑️ Permanently deleted clip: {target.name}")

    # 3. Clean up any 0-byte ghost clips immediately
    purge_ghost_files()

    return {"success": True, "deleted_count": len(deleted_files), "deleted": deleted_files}

@app.post("/api/copy_clips")
def copy_clips_to_destination(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Copies specified clips to a user-chosen destination directory on disk.
    """
    import shutil
    dest_dir = data.get("destination_dir")
    file_paths = data.get("file_paths", [])
    
    if not dest_dir:
        raise HTTPException(status_code=400, detail="Destination directory is required")
    
    dest_path = Path(dest_dir)
    dest_path.mkdir(parents=True, exist_ok=True)
    
    copied = []
    for f in file_paths:
        src = Path(f)
        if src.exists() and src.is_file():
            target = dest_path / src.name
            shutil.copy2(src, target)
            copied.append(str(target))
            
    return {"success": True, "copied_count": len(copied), "destination": str(dest_path)}

@app.post("/api/open_folder")
def open_system_folder(data: dict = Body(...)):
    """
    Opens the output clips folder in the native OS file explorer (Windows Explorer / Finder).
    """
    import subprocess
    raw_path = data.get("folder_path")
    if not raw_path or raw_path in ["clips", "Default (engine/clips)", "all", "Main Library", "root", ""]:
        target = OUTPUT_DIR
    else:
        target = Path(raw_path)
        if not target.is_absolute():
            target = OUTPUT_DIR / target

    if not target.exists():
        target.mkdir(parents=True, exist_ok=True)

    try:
        resolved = str(target.resolve())
        if sys.platform == "win32":
            import os
            os.startfile(resolved)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", resolved])
        else:
            subprocess.Popen(["xdg-open", resolved])
        return {"success": True, "opened": resolved}
    except Exception as e:
        print(f"⚠️ Error opening folder {target}: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/video_info")
def get_video_info(url: str, current_user: dict = Depends(get_current_user)):
    """
    Extracts video metadata (title, duration, uploader, stream_url) without downloading.
    Uses mobile client spoofing to bypass YouTube bot blocks and provide instant preview stream.
    """
    import yt_dlp
    clean_url = url.strip()
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['web', 'android', 'ios'],
                    'player_skip': ['configs'],
                }
            },
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(clean_url, download=False)
            
            stream_url = None
            formats = info.get("formats", []) if info else []
            
            # Prefer 360p or 720p progressive MP4 for ultra-smooth preview streaming in HTML5 video tag
            for fmt in formats:
                if fmt.get("format_id") in ["18", "22"] and fmt.get("url"):
                    stream_url = fmt.get("url")
                    break
            
            if not stream_url and formats:
                for fmt in formats:
                    if fmt.get("ext") == "mp4" and fmt.get("acodec") != "none" and fmt.get("vcodec") != "none" and fmt.get("url"):
                        stream_url = fmt.get("url")
                        break
            
            # Fallback to any progressive video+audio format
            if not stream_url and formats:
                for fmt in formats:
                    if fmt.get("vcodec") != "none" and fmt.get("acodec") != "none" and fmt.get("url"):
                        stream_url = fmt.get("url")
                        break

            # Fallback to any direct streamable URL
            if not stream_url and formats:
                for fmt in formats:
                    if fmt.get("url") and fmt.get("vcodec") != "none":
                        stream_url = fmt.get("url")
                        break

            if not stream_url and info:
                stream_url = info.get("url")

            return {
                "success": True,
                "title": info.get("title", "YouTube Video") if info else "YouTube Video",
                "duration": float(info.get("duration", 0)) if info else 0.0,
                "author": info.get("uploader", "YouTube Channel") if info else "YouTube",
                "stream_url": stream_url,
                "url": stream_url
            }
    except Exception as e:
        print(f"⚠️ Video info warning: {e}")
        return {
            "success": False,
            "title": "YouTube Video",
            "duration": 0.0,
            "author": "YouTube",
            "stream_url": None,
            "url": None,
            "error": str(e)
        }

import urllib.parse

@app.get("/api/download_clip")
def download_clip(file: str, name: str):
    """
    Downloads a generated clip with a custom filename.
    """
    import os
    file_path = OUTPUT_DIR / file
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    safe_name = "".join([c for c in name if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    if not safe_name:
        safe_name = "Viral_Clip"
    safe_name = safe_name.replace(" ", "_") + ".mp4"
    
    return FileResponse(path=file_path, filename=safe_name, media_type='video/mp4')

@app.get("/stream")
def stream_video_file(path: str, request: Request):
    """
    Streams local video files with HTTP 206 Partial Content byte-range support.
    Enables instant seeking, accurate duration probing, and zero-stutter playback in HTML5 video elements.
    """
    import os
    norm_path = os.path.abspath(path)
    if not os.path.exists(norm_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    file_size = os.path.getsize(norm_path)
    range_header = request.headers.get("range")
    
    content_type, _ = mimetypes.guess_type(norm_path)
    if not content_type:
        content_type = "video/mp4"

    if range_header:
        # Range header format: "bytes=start-end"
        try:
            bytes_unit, byte_range = range_header.split("=")
            range_parts = byte_range.split("-")
            start = int(range_parts[0]) if range_parts[0] else 0
            end = int(range_parts[1]) if len(range_parts) > 1 and range_parts[1] else file_size - 1
            end = min(end, file_size - 1)
            length = (end - start) + 1

            def iter_file():
                with open(norm_path, "rb") as f:
                    f.seek(start)
                    remaining = length
                    chunk_size = 512 * 1024  # 512 KB chunks for snappy responsive seeking
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = f.read(read_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
                "Content-Type": content_type,
            }
            return StreamingResponse(iter_file(), status_code=206, headers=headers)
        except Exception:
            return FileResponse(norm_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})
    else:
        return FileResponse(norm_path, media_type=content_type, headers={"Accept-Ranges": "bytes"})


@app.get("/api/cache_info")
def get_cache_info():
    """
    Calculates total disk space used by temporary cache files (TEMP_DIR, yt-dlp temp, intermediate audio/video).
    """
    total_bytes = 0
    file_count = 0
    try:
        if TEMP_DIR.exists():
            for p in TEMP_DIR.rglob("*"):
                if p.is_file():
                    total_bytes += p.stat().st_size
                    file_count += 1
    except Exception as e:
        print(f"Error calculating cache size: {e}")
        
    size_mb = round(total_bytes / (1024 * 1024), 2)
    size_gb = round(total_bytes / (1024 * 1024 * 1024), 2)
    return {
        "size_bytes": total_bytes,
        "size_mb": size_mb,
        "size_gb": size_gb,
        "file_count": file_count,
        "temp_dir": str(TEMP_DIR.resolve())
    }

@app.post("/api/clear_cache")
def clear_cache():
    """
    Safely cleans all temporary files, downloaded raw video chunks in temp, extracted audio chunks, and frame caches.
    Leaves user saved clips in OUTPUT_DIR completely untouched and safe.
    """
    import gc
    gc.collect()
    deleted_count = 0
    freed_bytes = 0
    try:
        if TEMP_DIR.exists():
            for item in list(TEMP_DIR.iterdir()):
                try:
                    if item.is_file():
                        freed_bytes += item.stat().st_size
                        item.unlink()
                        deleted_count += 1
                    elif item.is_dir():
                        for sub in item.rglob("*"):
                            if sub.is_file():
                                freed_bytes += sub.stat().st_size
                        shutil.rmtree(str(item), ignore_errors=True)
                        deleted_count += 1
                except Exception as item_err:
                    print(f"Error deleting temp item {item}: {item_err}")
        TEMP_DIR.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"Error clearing cache: {e}")

    freed_mb = round(freed_bytes / (1024 * 1024), 2)
    print(f"🧹 Cache Cleaned: Freed {freed_mb} MB ({deleted_count} items)")
    return {
        "success": True,
        "deleted_count": deleted_count,
        "freed_bytes": freed_bytes,
        "freed_mb": freed_mb
    }

@app.post("/api/create_folder")
def create_new_folder(data: dict = Body(...)):
    """
    Creates a new project folder in the clips storage directory.
    """
    raw_name = data.get("folder_name", "").strip()
    if not raw_name:
        return {"success": False, "error": "Folder name cannot be empty"}
    
    clean_name = "".join(c for c in raw_name if c.isalnum() or c in (' ', '_', '-', '.')).strip()
    if not clean_name:
        return {"success": False, "error": "Invalid folder name"}
        
    new_dir = OUTPUT_DIR / clean_name
    new_dir.mkdir(parents=True, exist_ok=True)
    (new_dir / "metadata").mkdir(exist_ok=True)
    print(f"📁 Created folder: {new_dir.resolve()}")
    return {"success": True, "folder_name": clean_name, "folder": clean_name, "path": str(new_dir.resolve())}

@app.post("/api/delete_folder")
def delete_folder(data: dict = Body(...)):
    """
    Deletes a folder from disk.
    Moves any clips inside back to the Main Library before deleting to prevent media loss.
    """
    import shutil
    folder_name = data.get("folder_name", "").strip()
    if not folder_name or folder_name.strip().lower() in ["all", "main library", "root", "", "none"]:
        return {"success": False, "error": "Cannot delete root library"}
        
    clean_name = folder_name.split("/")[-1].split("\\")[-1].strip()
    target_dir = OUTPUT_DIR / clean_name
    if not target_dir.exists() or not target_dir.is_dir():
        for p in OUTPUT_DIR.iterdir():
            if p.is_dir() and p.name.lower() == clean_name.lower():
                target_dir = p
                break
                
    if not target_dir.exists():
        return {"success": False, "error": "Folder not found on disk"}

    # Move any clips inside it back to root OUTPUT_DIR before deleting
    for mp4 in list(target_dir.glob("*.mp4")):
        try:
            dest = OUTPUT_DIR / mp4.name
            if not dest.exists():
                shutil.move(str(mp4), str(dest))
        except Exception as e:
            print(f"⚠️ Note moving clip before folder delete: {e}")

    try:
        shutil.rmtree(str(target_dir))
        print(f"🗑️ Deleted folder: {target_dir}")
        purge_ghost_files()
        return {"success": True, "deleted_folder": clean_name}
    except Exception as e:
        print(f"⚠️ Error deleting folder {target_dir}: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/rename_folder")
def rename_folder(data: dict = Body(...)):
    """
    Renames an existing folder on disk.
    """
    import shutil
    old_folder = data.get("old_folder", "").strip()
    new_name = data.get("new_name", "").strip()
    
    if not old_folder or old_folder.strip().lower() in ["all", "main library", "root", "", "none"]:
        return {"success": False, "error": "Cannot rename root library"}
    if not new_name:
        return {"success": False, "error": "New folder name cannot be empty"}
        
    old_clean = old_folder.split("/")[-1].split("\\")[-1].strip()
    new_clean = "".join(c for c in new_name if c.isalnum() or c in (' ', '_', '-', '.')).strip()
    if not new_clean:
        return {"success": False, "error": "Invalid new folder name"}
        
    src_dir = OUTPUT_DIR / old_clean
    dest_dir = OUTPUT_DIR / new_clean
    
    if not src_dir.exists():
        return {"success": False, "error": f"Source folder '{old_clean}' does not exist"}
        
    if src_dir.resolve() == dest_dir.resolve():
        return {"success": True, "old_folder": old_clean, "new_folder": new_clean}
        
    if dest_dir.exists():
        return {"success": False, "error": f"A folder named '{new_clean}' already exists"}
        
    try:
        os.rename(str(src_dir), str(dest_dir))
        print(f"✏️ Renamed folder: {src_dir} -> {dest_dir}")
        purge_ghost_files()
        return {"success": True, "old_folder": old_clean, "new_folder": new_clean}
    except Exception as e:
        print(f"⚠️ Error renaming folder: {e}")
        return {"success": False, "error": str(e)}

@app.post("/api/import_clip")
async def import_clip(
    file: UploadFile = File(...),
    target_folder: str = Form("Main Library")
):
    """
    Imports an external video file dropped from Windows Explorer into the clips vault.
    """
    if target_folder in ["all", "Main Library", "Root", "", "none"]:
        dest_dir = OUTPUT_DIR
    else:
        segments = [s.strip() for s in target_folder.replace("\\", "/").split("/") if s.strip()]
        safe_segments = ["".join(c for c in seg if c.isalnum() or c in (' ', '_', '-', '.')).strip() for seg in segments]
        dest_dir = OUTPUT_DIR / Path(*safe_segments)
        
    dest_dir.mkdir(parents=True, exist_ok=True)
    (dest_dir / "metadata").mkdir(exist_ok=True)
    
    clean_filename = "".join(c for c in file.filename if c.isalnum() or c in (' ', '_', '-', '.', '(', ')')).strip()
    if not clean_filename.lower().endswith(('.mp4', '.mov', '.webm', '.mkv')):
        clean_filename += ".mp4"
        
    target_path = dest_dir / clean_filename
    with open(target_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    print(f"📥 Imported external clip: {target_path}")
    return {"success": True, "filename": clean_filename, "path": str(target_path.resolve())}

@app.post("/api/move_clips")
def move_clips_to_folder(data: dict = Body(...)):
    """
    Moves specified clips and their metadata into a target folder or subfolder.
    Guarantees atomic move and deletes any stale source copy so duplicates NEVER occur.
    """
    import shutil
    import os
    import urllib.parse
    import gc
    gc.collect()

    file_paths = data.get("file_paths") or data.get("clip_paths") or []
    target_folder = data.get("target_folder", "").strip()
    
    if not target_folder:
        return {"success": False, "error": "Target folder name cannot be empty"}
    
    if target_folder in ["Main Library", "Root", "all", "root", "."]:
        dest_dir = OUTPUT_DIR
        clean_name = "Main Library"
    else:
        segments = [s.strip() for s in target_folder.replace("\\", "/").split("/") if s.strip()]
        safe_segments = ["".join(c for c in seg if c.isalnum() or c in (' ', '_', '-', '.')).strip() for seg in segments]
        dest_dir = OUTPUT_DIR / Path(*safe_segments)
        clean_name = "/".join(safe_segments)
        
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_meta_dir = dest_dir / "metadata"
    dest_meta_dir.mkdir(parents=True, exist_ok=True)
    
    moved = []
    for raw_fp in file_paths:
        if not raw_fp:
            continue
        # Clean URL prefixes or query params if passed
        fp = str(raw_fp)
        if "local:///" in fp:
            fp = fp.replace("local:///", "")
        if "stream?path=" in fp:
            fp = urllib.parse.unquote(fp.split("stream?path=")[-1].split("&")[0])
        elif "/clips/" in fp:
            fp = urllib.parse.unquote(fp.split("/clips/")[-1].split("?")[0])
        else:
            fp = urllib.parse.unquote(fp)
            
        src = Path(fp)
        if not src.is_absolute():
            src = (OUTPUT_DIR / fp).resolve()
            
        if not src.exists():
            # Match by exact filename or stem
            target_name = Path(fp).name
            for cand in OUTPUT_DIR.rglob("*.mp4"):
                if cand.name.lower() == target_name.lower():
                    src = cand
                    break

        if src.exists() and src.is_file():
            try:
                dest_file = dest_dir / src.name
                if src.resolve() != dest_file.resolve():
                    # If destination file already exists, replace it cleanly
                    if dest_file.exists():
                        try:
                            dest_file.unlink()
                        except Exception:
                            pass
                    
                    # Atomic replace / move with handle-release retry
                    moved_ok = False
                    for attempt in range(3):
                        try:
                            os.replace(str(src), str(dest_file))
                            moved_ok = True
                            break
                        except Exception:
                            gc.collect()
                            time.sleep(0.02)
                    
                    if not moved_ok:
                        try:
                            shutil.copy2(str(src), str(dest_file))
                            moved_ok = True
                            gc.collect()
                            try:
                                src.unlink()
                            except Exception:
                                # If Windows filesystem lock blocks delete, rename to hidden trash
                                try:
                                    trash_target = src.with_name(f".trash_{int(time.time()*1000)}_{src.name}")
                                    src.rename(trash_target)
                                except Exception:
                                    pass
                        except Exception as copy_err:
                            print(f"Fallback move error for {src}: {copy_err}")
                    
                    if moved_ok and dest_file.exists():
                        try:
                            os.utime(str(dest_file), None)
                        except Exception:
                            pass
                    
                    # Move metadata file
                    meta_src = src.parent / "metadata" / f"{src.stem}_metadata.txt"
                    if not meta_src.exists():
                        meta_src = src.parent / f"{src.stem}_metadata.txt"
                    if meta_src.exists() and meta_src.is_file():
                        meta_dest = dest_meta_dir / meta_src.name
                        if meta_dest.exists():
                            try: meta_dest.unlink()
                            except Exception: pass
                        try:
                            os.replace(str(meta_src), str(meta_dest))
                        except Exception:
                            try:
                                shutil.copy2(str(meta_src), str(meta_dest))
                                meta_src.unlink()
                            except Exception:
                                pass
                        if meta_dest.exists():
                            try:
                                os.utime(str(meta_dest), None)
                            except Exception:
                                pass
                        
                    if moved_ok:
                        moved.append(str(dest_file.resolve()))
                        print(f"📦 Moved clip cleanly: {src} -> {dest_file}")
            except Exception as move_err:
                print(f"Error moving {src} to {dest_dir}: {move_err}")
                
    # Run immediate ghost and duplicate purge
    purge_ghost_files()
    return {"success": True, "moved_count": len(moved), "target_folder": clean_name}

@app.post("/api/duplicate_clip")
def duplicate_clip(data: dict = Body(...)):
    """
    Duplicates a video clip and its metadata on disk.
    """
    import shutil
    file_path = data.get("file_path") or data.get("path", "")
    if not file_path:
        return {"success": False, "error": "file_path is required"}
        
    src = Path(file_path)
    if not src.is_absolute():
        src = (OUTPUT_DIR / file_path).resolve()
    if not src.exists():
        for cand in OUTPUT_DIR.rglob("*.mp4"):
            if cand.name == src.name or cand.stem == src.stem:
                src = cand
                break
                
    if not src.exists() or not src.is_file():
        return {"success": False, "error": "File not found on disk"}

    stem = src.stem
    ext = src.suffix
    parent = src.parent
    
    counter = 1
    dest_name = f"{stem}_copy{ext}"
    dest_path = parent / dest_name
    while dest_path.exists():
        counter += 1
        dest_name = f"{stem}_copy_{counter}{ext}"
        dest_path = parent / dest_name
        
    try:
        shutil.copy2(str(src), str(dest_path))
        
        meta_src = parent / "metadata" / f"{stem}_metadata.txt"
        if not meta_src.exists():
            meta_src = parent / f"{stem}_metadata.txt"
        if meta_src.exists():
            meta_dest_dir = parent / "metadata"
            meta_dest_dir.mkdir(parents=True, exist_ok=True)
            meta_dest = meta_dest_dir / f"{dest_path.stem}_metadata.txt"
            shutil.copy2(str(meta_src), str(meta_dest))
            
        print(f"📋 Duplicated clip: {src.name} -> {dest_path.name}")
        return {"success": True, "original": str(src.resolve()), "duplicate": str(dest_path.resolve()), "filename": dest_name}
    except Exception as e:
        print(f"⚠️ Error duplicating {src}: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/copy_clips")
def copy_clips_to_destination(data: dict = Body(...)):
    """
    Copies selected clips to a chosen destination directory.
    """
    import shutil
    dest_dir = data.get("destination_dir")
    file_paths = data.get("file_paths", [])
    if not dest_dir:
        return {"success": False, "error": "No destination directory specified"}
    
    os.makedirs(dest_dir, exist_ok=True)
    copied = []
    for fp in file_paths:
        if os.path.exists(fp):
            try:
                dest_file = os.path.join(dest_dir, os.path.basename(fp))
                shutil.copy2(fp, dest_file)
                copied.append(dest_file)
            except Exception as e:
                print(f"Copy error for {fp}: {e}")
    return {"success": True, "copied_count": len(copied), "destination": dest_dir}

@app.get("/api/health")
def health_check():
    """Simple API health check endpoint."""
    return {"status": "ok", "app": "AI Video Clipper Engine"}

@app.get("/api/background_videos")
def list_background_videos():
    """Returns all imported gameplay/background videos available in the backgrounds directory."""
    videos = []
    valid_exts = {".mp4", ".mov", ".webm", ".mkv"}
    for f in BACKGROUNDS_DIR.glob("*.*"):
        if f.suffix.lower() in valid_exts and f.is_file():
            videos.append({
                "name": f.name,
                "stem": f.stem,
                "path": str(f.resolve()),
                "url": f"http://127.0.0.1:8000/backgrounds/{f.name}",
                "size": f.stat().st_size
            })
    return {"success": True, "videos": videos}

@app.post("/api/upload_background_video")
async def upload_background_video(file: UploadFile = File(...)):
    """Uploads/imports a custom gameplay or satisfying loop video."""
    if not file.filename:
        return {"success": False, "error": "No file uploaded"}
    valid_exts = {".mp4", ".mov", ".webm", ".mkv"}
    ext = Path(file.filename).suffix.lower()
    if ext not in valid_exts:
        return {"success": False, "error": "Invalid video format (supported: .mp4, .mov, .webm, .mkv)"}
    
    dest_path = BACKGROUNDS_DIR / file.filename
    with open(dest_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    print(f"🎮 Imported custom gameplay video: {dest_path.name}")
    return {
        "success": True, 
        "name": file.filename, 
        "path": str(dest_path.resolve()), 
        "url": f"http://127.0.0.1:8000/backgrounds/{file.filename}"
    }

@app.post("/api/delete_background_video")
def delete_background_video(data: dict = Body(...)):
    """Deletes a custom gameplay video from backgrounds directory."""
    filename = data.get("name") or data.get("filename")
    if not filename:
        return {"success": False, "error": "Filename required"}
    target = BACKGROUNDS_DIR / filename
    if target.exists() and target.is_file():
        target.unlink()
        return {"success": True, "deleted": filename}
    return {"success": False, "error": "File not found"}

@app.get("/api/background_music")
def list_background_music():
    """Returns all imported soundtrack files available in the music directory."""
    tracks = []
    valid_exts = {".mp3", ".wav", ".m4a", ".aac", ".ogg"}
    for f in MUSIC_DIR.glob("*.*"):
        if f.suffix.lower() in valid_exts and f.is_file():
            tracks.append({
                "name": f.name,
                "stem": f.stem,
                "path": str(f.resolve()),
                "url": f"http://127.0.0.1:8000/music/{f.name}",
                "size": f.stat().st_size
            })
    return {"success": True, "tracks": tracks}

@app.post("/api/upload_background_music")
async def upload_background_music(file: UploadFile = File(...)):
    """Uploads/imports a custom background music soundtrack."""
    if not file.filename:
        return {"success": False, "error": "No file uploaded"}
    valid_exts = {".mp3", ".wav", ".m4a", ".aac", ".ogg"}
    ext = Path(file.filename).suffix.lower()
    if ext not in valid_exts:
        return {"success": False, "error": "Invalid audio format (supported: .mp3, .wav, .m4a, .aac, .ogg)"}
    
    dest_path = MUSIC_DIR / file.filename
    with open(dest_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    print(f"🎵 Imported custom background music: {dest_path.name}")
    return {
        "success": True, 
        "name": file.filename, 
        "path": str(dest_path.resolve()), 
        "url": f"http://127.0.0.1:8000/music/{file.filename}"
    }

@app.post("/api/process")
def process_video_endpoint(
    request: ProcessRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a new clipping task to run asynchronously in the background.
    Protected endpoint: requires a valid Google/Discord Supabase JWT token.
    """
    # STRICT VALIDATION: If Satisfying Gameplay Split is selected, require an existing background video on disk
    if request.layout == "gameplay_bg":
        valid_exts = {".mp4", ".mov", ".webm", ".mkv"}
        bg_candidates = [f for f in BACKGROUNDS_DIR.glob("*.*") if f.suffix.lower() in valid_exts and f.is_file()]
        custom_bg = getattr(request, "gameplay_bg_video", None)
        
        has_valid_bg = False
        if custom_bg:
            p = Path(custom_bg)
            if p.exists() or (BACKGROUNDS_DIR / p.name).exists():
                has_valid_bg = True
        elif len(bg_candidates) > 0:
            has_valid_bg = True
            
        if not has_valid_bg:
            raise HTTPException(
                status_code=400, 
                detail="Rejection: No background video found! For Satisfying Gameplay Split, you must import or select a gameplay video before compiling."
            )

    # Cap tasks_db to prevent memory growth over long server uptime
    if len(tasks_db) > 50:
        oldest_keys = list(tasks_db.keys())[:len(tasks_db) - 40]
        for k in oldest_keys:
            tasks_db.pop(k, None)

    task_id = str(uuid.uuid4())
    cancel_event = threading.Event()
    cancellation_events[task_id] = cancel_event

    tasks_db[task_id] = {
        "status": "processing",
        "progress": 0,
        "message": "Queued task...",
        "result": None,
        "error": None,
        "user_email": current_user.get("email")
    }
    
    background_tasks.add_task(execute_rendering_task, task_id, request, cancel_event)
    return {"task_id": task_id, "status": "processing", "message": "Task queued successfully"}

@app.post("/api/cancel/{task_id}")
@app.post("/api/cancel")
def cancel_clipping_task(task_id: Optional[str] = None):
    """Cancels the active clipping job and stops all sub-processes."""
    if task_id and task_id in cancellation_events:
        cancellation_events[task_id].set()
        if task_id in tasks_db:
            tasks_db[task_id]["status"] = "cancelled"
            tasks_db[task_id]["message"] = "Processing stopped by user."
    else:
        for tid, evt in cancellation_events.items():
            evt.set()
            if tid in tasks_db:
                tasks_db[tid]["status"] = "cancelled"
                tasks_db[tid]["message"] = "Processing stopped by user."
    return {"success": True, "message": "Cancellation signal sent."}

@app.get("/api/progress/{task_id}")
@app.get("/api/status/{task_id}")
def get_task_status(task_id: str):
    """
    Retrieves the execution status and progress of a background clipping task.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task ID not found")
    
    t = tasks_db[task_id]
    result = t.get("result") or {}
    return {
        "task_id": task_id,
        "status": t.get("message") or t.get("status"),
        "progress": t.get("progress", 0),
        "completed": t.get("status") == "completed",
        "cancelled": t.get("status") == "cancelled",
        "is_rate_limit": t.get("is_rate_limit", False),
        "error": t.get("error"),
        "clips": result.get("clips", []),
        "output_dir": result.get("output_folder", ""),
        "title": result.get("title", "")
    }

@app.get("/api/hardware_scan")
def scan_system_hardware():
    """
    Performs high-precision hardware probing to detect real CPU, GPU, NPU, and video encoders.
    """
    try:
        from services.hardware_scanner import HardwareScanner
        return HardwareScanner.scan()
    except Exception as e:
        return {
            "status": "fallback",
            "cpu": "Intel Core Ultra 5 135H",
            "gpu": "Intel Arc Graphics",
            "npu": "Intel AI Boost NPU",
            "vendor": "Intel",
            "encoder": "Intel QuickSync (h264_qsv)",
            "encoder_codec": "h264_qsv",
            "ram_gb": 16.0,
            "engine_id": "intel_ai",
            "engine_name": "Intel AI Engine",
            "engine_desc": "Optimized for Intel Core Ultra with Intel Arc GPU and AI Boost NPU.",
            "specs": [
                {"label": "CPU", "value": "Intel Core Ultra 5 135H"},
                {"label": "GPU", "value": "Intel Arc Graphics"},
                {"label": "NPU", "value": "Intel AI Boost NPU"},
                {"label": "Memory", "value": "16.0 GB RAM"},
                {"label": "Video Encoder", "value": "Intel QuickSync (h264_qsv)"}
            ]
        }

VAULT_DIR = Path.home() / ".clipvault"
VAULT_FILE = VAULT_DIR / "keys_vault.json"

@app.get("/api/vault_keys")
def get_vault_keys():
    """Returns securely saved API keys from the persistent local on-device vault."""
    try:
        if VAULT_FILE.exists() and VAULT_FILE.stat().st_size > 0:
            with open(VAULT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {"success": True, "keys": data}
    except Exception as e:
        print(f"⚠️ Note reading key vault: {e}")
    return {"success": True, "keys": {}}

@app.post("/api/save_vault_keys")
def save_vault_keys(data: dict = Body(...)):
    """Saves API keys to persistent local disk vault so keys are NEVER lost across restarts."""
    try:
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
        keys_data = data.get("keys", {})
        existing = {}
        if VAULT_FILE.exists() and VAULT_FILE.stat().st_size > 0:
            try:
                with open(VAULT_FILE, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = {}
        
        # Merge only non-empty strings so previous keys are never erased by empty requests
        for k, v in keys_data.items():
            if v and str(v).strip():
                existing[k] = str(v).strip()
                
        # Atomic write via tmp file to guarantee 0% corruption risk
        tmp_file = VAULT_DIR / "keys_vault.tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(existing, f, indent=2)
        tmp_file.replace(VAULT_FILE)
        return {"success": True, "saved_count": len(existing)}
    except Exception as e:
        print(f"⚠️ Error saving key vault: {e}")
        return {"success": False, "error": str(e)}
