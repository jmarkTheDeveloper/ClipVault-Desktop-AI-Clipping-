import os
import gc
import shutil
import time
import uuid
import random
from pathlib import Path
from config import TEMP_DIR

TASK_DIR_PREFIX = "task_"


def make_task_temp_dir(task_id=None) -> Path:
    """
    Create a temp directory owned exclusively by one render task.

    Every task gets its own folder so that finishing (or cleaning up after) one render can
    never delete files another render is still reading. Previously all tasks shared
    TEMP_DIR and each completion wiped the whole directory, which killed concurrent
    renders mid-encode with no clear error.
    """
    safe_id = "".join(ch for ch in str(task_id or uuid.uuid4().hex) if ch.isalnum() or ch in "-_")
    if not safe_id:
        safe_id = uuid.uuid4().hex
    path = Path(TEMP_DIR) / f"{TASK_DIR_PREFIX}{safe_id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def cleanup_task_temp_dir(task_dir) -> None:
    """Delete ONLY the given task's temp directory — never another task's files."""
    if not task_dir:
        return
    path = Path(task_dir)
    try:
        if path.exists() and path.is_dir() and path.name.startswith(TASK_DIR_PREFIX):
            gc.collect()
            shutil.rmtree(path, ignore_errors=True)
    except Exception as e:
        print(f"[Temp] Could not remove task temp dir {path}: {e}")


def cleanup_temp_files(purge_all: bool = False, orphan_age_hours: float = 6.0) -> None:
    """
    Reclaim temporary storage.

    `purge_all=True` wipes every task directory (used only by the explicit
    "Clear cache" action and at startup). By default only *orphaned* data is removed:
    task_* directories older than `orphan_age_hours` (left behind by a crash) plus stale
    legacy loose files. A render that is still running keeps its own task dir, so it is
    never disturbed.
    """
    print("🧹 Cleaning up temporary stream files to reclaim storage...")
    gc.collect()
    time.sleep(0.2)  # give Windows a moment to release file locks

    freed_bytes = 0
    deleted_count = 0
    now = time.time()
    cutoff = now - max(0.0, orphan_age_hours) * 3600

    try:
        root = Path(TEMP_DIR)
        if not root.exists():
            return

        for item in list(root.iterdir()):
            try:
                if item.is_dir():
                    # Never touch a non-task directory, and never touch a task that may be live.
                    if not item.name.startswith(TASK_DIR_PREFIX):
                        continue
                    if purge_all or item.stat().st_mtime < cutoff:
                        size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                        shutil.rmtree(item, ignore_errors=True)
                        freed_bytes += size
                        deleted_count += 1
                    continue

                # Lightweight transcript cache is intentionally preserved.
                if item.suffix.lower() in ('.json', '.txt'):
                    continue

                # Legacy loose temp files: keep anything a running task may still be writing.
                if not purge_all and item.stat().st_mtime > now - 600:
                    continue

                size = item.stat().st_size
                item.unlink()
                freed_bytes += size
                deleted_count += 1
            except Exception:
                # Retry once after a garbage collection (typical Windows file-lock case).
                try:
                    gc.collect()
                    time.sleep(0.1)
                    if item.exists() and not item.is_dir():
                        item.unlink()
                        deleted_count += 1
                except Exception:
                    pass

        freed_mb = round(freed_bytes / (1024 * 1024), 2)
        print(f"✅ Storage cleanup complete: freed {freed_mb} MB ({deleted_count} items).")
    except Exception as e:
        print(f"⚠️ Could not clean up all temporary files: {e}")


def generate_random_clips(duration, num_clips, min_duration, max_duration):
    """
    Generates random clip start and end times as a fallback.

    Args:
        duration (float): The total duration of the video.
        num_clips (int): The number of clips to generate.
        min_duration (int): The minimum duration of each clip.
        max_duration (int): The maximum duration of each clip.

    Returns:
        list: A list of dictionaries, each representing a random clip.
    """
    clips = []
    for i in range(num_clips):
        clip_duration = random.uniform(min_duration, max_duration)
        if duration - clip_duration <= 0:
            continue
        start = random.uniform(0, duration - clip_duration)
        clips.append({
            'start': start,
            'end': start + clip_duration,
            'title': f'Random clip {i+1}',
            'virality_score': 30,
            'hook_type': 'general',
            'duration': clip_duration
        })
    return clips
