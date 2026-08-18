import asyncio
import sys

# Silence harmless Windows asyncio ConnectionResetError spam
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    try:
        import ctypes
        # Set process priority to IDLE_PRIORITY_CLASS (0x00000040)
        # Guarantees that Windows OS, mouse cursor, and UI never experience lag or stutter
        process_handle = ctypes.windll.kernel32.GetCurrentProcess()
        ctypes.windll.kernel32.SetPriorityClass(process_handle, 0x00000040)
        print("⚡ Background engine priority set to 'Idle Priority' (0% PC lag guaranteed).")
    except Exception:
        pass

from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import uuid
import sys
import os
from pathlib import Path

# Force UTF-8 encoding for stdout on Windows to prevent charmap errors with emojis
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

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

from config import OUTPUT_DIR
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

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
    custom_crop_boxes: Optional[List[List[float]]] = None
    caption_style: str = "capcut_yellow"
    caption_y_pct: Optional[float] = 0.70
    ai_engine: str = "openai_sora" # New parameter for AI Engine selection
    camera_style: str = "smooth"

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

def execute_rendering_task(task_id: str, request: ProcessRequest):
    """
    Worker task running inside the thread pool to execute clip generation.
    """
    try:
        tasks_db[task_id]["message"] = "Initializing video processor..."
        processor = VideoProcessor(caption_style=request.caption_style, ai_engine=request.ai_engine)
        
        # Determine topic selection filter
        custom_range_filter = request.custom_range_filter
        
        tasks_db[task_id]["message"] = "Downloading and rendering clips (this may take a few minutes)..."
        
        def on_progress(message, percent):
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
            progress_callback=on_progress
        )
        
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
        tasks_db[task_id]["status"] = "failed"
        tasks_db[task_id]["error"] = str(e)
        tasks_db[task_id]["message"] = f"Error during processing: {e}"

@app.post("/api/create_folder")
def create_folder(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Creates a new custom subfolder in the output directory for organizing clips.
    """
    folder_name = data.get("folder_name", "").strip()
    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name is required")
    
    # Sanitize folder name
    safe_name = "".join(c for c in folder_name if c.isalnum() or c in (' ', '_', '-')).strip()
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid folder name")
        
    folder_path = OUTPUT_DIR / safe_name
    folder_path.mkdir(parents=True, exist_ok=True)
    (folder_path / "metadata").mkdir(exist_ok=True)
    return {"success": True, "folder": safe_name, "path": str(folder_path)}

@app.post("/api/move_clips")
def move_clips(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Moves specified clips and their metadata to a target folder within OUTPUT_DIR.
    """
    import shutil
    file_paths = data.get("file_paths", [])
    target_folder = data.get("target_folder", "").strip()
    
    if not file_paths:
        raise HTTPException(status_code=400, detail="No files specified to move")
    
    safe_target = "".join(c for c in target_folder if c.isalnum() or c in (' ', '_', '-')).strip()
    if safe_target:
        dest_dir = OUTPUT_DIR / safe_target
    else:
        dest_dir = OUTPUT_DIR
        
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_meta_dir = dest_dir / "metadata"
    dest_meta_dir.mkdir(exist_ok=True)
    
    moved_count = 0
    for fpath_str in file_paths:
        try:
            fpath = Path(fpath_str)
            if fpath.exists() and fpath.is_file():
                dest_file = dest_dir / fpath.name
                shutil.move(str(fpath), str(dest_file))
                
                # Check for metadata file
                meta_src = fpath.parent / "metadata" / f"{fpath.stem}_metadata.txt"
                if meta_src.exists():
                    shutil.move(str(meta_src), str(dest_meta_dir / meta_src.name))
                    
                moved_count += 1
        except Exception as e:
            print(f"⚠️ Error moving file {fpath_str}: {e}")
            
    return {"success": True, "moved_count": moved_count, "target_folder": safe_target or "Main Library"}

@app.get("/api/saved_clips")
def get_saved_clips(current_user: dict = Depends(get_current_user)):
    """
    Scans the output directory (and all subfolders) to return all generated video clips, metadata, and folders.
    """
    clips = []
    folders = set()
    try:
        # Search root output dir and all subdirectories
        for path in sorted(OUTPUT_DIR.glob("**/*.mp4"), key=lambda p: p.stat().st_mtime, reverse=True):
            try:
                stat = path.stat()
                
                # Determine folder name relative to OUTPUT_DIR
                rel_parent = path.parent.relative_to(OUTPUT_DIR)
                folder_name = str(rel_parent) if str(rel_parent) != "." else "Main Library"
                if folder_name != "Main Library":
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

                # Relative URL for static serving
                rel_path = path.relative_to(OUTPUT_DIR).as_posix()
                clip_url = f"http://127.0.0.1:8000/clips/{rel_path}"

                clips.append({
                    "filename": path.name,
                    "path": str(path),
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
def delete_clip(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Deletes a specific video clip file and its metadata.
    """
    clip_path = data.get("path")
    if not clip_path:
        raise HTTPException(status_code=400, detail="Path is required")
    
    file = Path(clip_path)
    if file.exists() and file.is_file():
        try:
            file.unlink()
            meta_file = file.parent / "metadata" / f"{file.stem}_metadata.txt"
            if meta_file.exists():
                meta_file.unlink()
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=404, detail="Clip not found")

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
def open_system_folder(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Opens the output clips folder in the native OS file explorer (Windows Explorer / Finder).
    """
    import subprocess
    folder_path = data.get("folder_path") or str(OUTPUT_DIR)
    if os.path.exists(folder_path):
        if sys.platform == "win32":
            os.startfile(folder_path)
        elif sys.platform == "darwin":
            subprocess.Popen(["open", folder_path])
        else:
            subprocess.Popen(["xdg-open", folder_path])
        return {"success": True}
    return {"success": False, "error": "Folder not found"}

@app.get("/api/video_info")
def get_video_info(url: str, current_user: dict = Depends(get_current_user)):
    """
    Extracts video metadata (title, duration, uploader, stream_url) without downloading.
    Uses mobile client spoofing to bypass YouTube bot blocks and provide instant preview stream.
    """
    import yt_dlp
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extractor_args': {
                'youtube': {
                    'player_client': ['android', 'web', 'ios'],
                    'player_skip': ['webpage', 'configs'],
                }
            },
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            stream_url = None
            formats = info.get("formats", [])
            
            # Prefer 360p or 720p progressive MP4 for ultra-smooth preview streaming in HTML5 video tag
            for fmt in formats:
                if fmt.get("ext") == "mp4" and fmt.get("acodec") != "none" and fmt.get("vcodec") != "none":
                    stream_url = fmt.get("url")
                    if fmt.get("format_id") in ["18", "22"]:
                        break
            
            # Fallback to any direct streamable URL
            if not stream_url and formats:
                for fmt in formats:
                    if fmt.get("url") and fmt.get("vcodec") != "none":
                        stream_url = fmt.get("url")
                        break

            return {
                "title": info.get("title", "Unknown Video"),
                "duration": info.get("duration", 0),
                "author": info.get("uploader", "Unknown Channel"),
                "stream_url": stream_url,
                "url": stream_url
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch video info: {e}")

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
def stream_video_file(path: str):
    import os
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, media_type="video/mp4", headers={"Accept-Ranges": "bytes"})

@app.get("/api/saved_clips")
def list_saved_clips():
    """
    Scans the clips directory recursively and returns all saved clips and subfolders with metadata.
    """
    clips = []
    folders = set(["Main Library"])
    
    if OUTPUT_DIR.exists():
        # Discover all subfolders
        for d in OUTPUT_DIR.iterdir():
            if d.is_dir() and d.name != "metadata" and not d.name.startswith("."):
                folders.add(d.name)

        # Discover all .mp4 video clips
        for mp4_file in OUTPUT_DIR.rglob("*.mp4"):
            try:
                rel_path = mp4_file.relative_to(OUTPUT_DIR)
                folder_name = rel_path.parent.name if str(rel_path.parent) != "." else "Main Library"
                folders.add(folder_name)
                file_size_mb = round(mp4_file.stat().st_size / (1024 * 1024), 1)
                mtime = mp4_file.stat().st_mtime
                
                # Check for corresponding metadata file
                meta_file = mp4_file.parent / "metadata" / f"{mp4_file.stem}_metadata.txt"
                title = mp4_file.stem.replace("_", " ")
                desc = ""
                score = 99
                
                # Try to extract score from filename if format is clip_X_YYpts_...
                import re
                score_match = re.search(r'_(\d+)pts_', mp4_file.name)
                if score_match:
                    score = int(score_match.group(1))
                    
                if meta_file.exists():
                    try:
                        with open(meta_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                            if "🎬 Catchy Title:" in content:
                                parts = content.split("🎬 Catchy Title:\n")
                                if len(parts) > 1:
                                    title_part = parts[1].split("=")[0].strip()
                                    if title_part:
                                        title = title_part
                            if "📝 Description & Hashtags:" in content:
                                parts = content.split("📝 Description & Hashtags:\n")
                                if len(parts) > 1:
                                    desc = parts[1].split("=")[0].strip()
                    except:
                        pass
                        
                clips.append({
                    "id": str(rel_path).replace("\\", "/"),
                    "filename": mp4_file.name,
                    "title": title,
                    "description": desc,
                    "size_mb": file_size_mb,
                    "mtime": mtime,
                    "folder": folder_name,
                    "path": str(mp4_file.resolve()),
                    "url": f"http://127.0.0.1:8000/stream?path={urllib.parse.quote(str(mp4_file.resolve()))}",
                    "virality_score": score
                })
            except Exception as file_err:
                print(f"Error reading clip {mp4_file}: {file_err}")
                
    # Sort newest first
    clips.sort(key=lambda x: x["mtime"], reverse=True)
    return {
        "clips": clips, 
        "folders": sorted(list(folders)),
        "total": len(clips), 
        "storage_dir": str(OUTPUT_DIR.resolve())
    }

@app.post("/api/create_folder")
def create_new_folder(data: dict = Body(...)):
    """
    Creates a new subfolder in the clips storage directory.
    """
    folder_name = data.get("folder_name", "").strip()
    if not folder_name:
        return {"success": False, "error": "Folder name cannot be empty"}
    clean_name = "".join(c for c in folder_name if c.isalnum() or c in (' ', '_', '-', '.')).strip()
    if not clean_name:
        return {"success": False, "error": "Invalid folder name"}
    
    new_dir = OUTPUT_DIR / clean_name
    new_dir.mkdir(parents=True, exist_ok=True)
    (new_dir / "metadata").mkdir(exist_ok=True)
    return {"success": True, "folder_name": clean_name, "path": str(new_dir.resolve())}

@app.post("/api/move_clips")
def move_clips_to_folder(data: dict = Body(...)):
    """
    Moves specified clips and their metadata into a target subfolder.
    """
    import shutil
    file_paths = data.get("file_paths", [])
    target_folder = data.get("target_folder", "").strip()
    
    if not target_folder:
        return {"success": False, "error": "Target folder name cannot be empty"}
    
    if target_folder == "Main Library" or target_folder == "Root":
        dest_dir = OUTPUT_DIR
    else:
        clean_name = "".join(c for c in target_folder if c.isalnum() or c in (' ', '_', '-', '.')).strip()
        dest_dir = OUTPUT_DIR / clean_name
        
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_meta_dir = dest_dir / "metadata"
    dest_meta_dir.mkdir(parents=True, exist_ok=True)
    
    moved = []
    for fp in file_paths:
        src = Path(fp)
        if src.exists() and src.is_file():
            try:
                dest_file = dest_dir / src.name
                shutil.move(str(src), str(dest_file))
                
                # Also move metadata if exists
                meta_src = src.parent / "metadata" / f"{src.stem}_metadata.txt"
                if meta_src.exists():
                    meta_dest = dest_meta_dir / meta_src.name
                    shutil.move(str(meta_src), str(meta_dest))
                    
                moved.append(str(dest_file.resolve()))
            except Exception as move_err:
                print(f"Error moving {src}: {move_err}")
                
    return {"success": True, "moved_count": len(moved), "target_folder": target_folder}

@app.post("/api/delete_clip")
def delete_clip(data: dict = Body(...)):
    """
    Deletes a saved clip and its associated metadata from disk.
    """
    path_str = data.get("path")
    if path_str and os.path.exists(path_str):
        try:
            os.remove(path_str)
            p = Path(path_str)
            meta = p.parent / "metadata" / f"{p.stem}_metadata.txt"
            if meta.exists():
                try: os.remove(meta)
                except: pass
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "File not found"}

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
    task_id = str(uuid.uuid4())
    tasks_db[task_id] = {
        "status": "processing",
        "progress": 0,
        "message": "Queued task...",
        "result": None,
        "error": None,
        "user_email": current_user.get("email")
    }
    
    background_tasks.add_task(execute_rendering_task, task_id, request)
    return {"task_id": task_id, "status": "processing", "message": "Task queued successfully"}

@app.get("/api/status/{task_id}")
def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves the execution status and progress of a background clipping task.
    Protected endpoint: requires valid authentication.
    """
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task ID not found")
    
    return tasks_db[task_id]
