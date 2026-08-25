import os
import gc
import time
import random
from config import TEMP_DIR

def cleanup_temp_files():
    """
    Immediately purges heavy downloaded video and audio files from the temporary directory,
    reclaiming all disk space while preserving lightweight transcript cache.
    """
    print("🧹 Cleaning up temporary downloaded stream files to reclaim storage...")
    gc.collect()
    time.sleep(0.3) # Give Windows file system time to release locks
    
    freed_bytes = 0
    deleted_count = 0
    try:
        if TEMP_DIR.exists():
            for item in list(TEMP_DIR.iterdir()):
                try:
                    if item.is_file() and item.suffix.lower() not in ['.json', '.txt']:
                        size = item.stat().st_size
                        item.unlink()
                        freed_bytes += size
                        deleted_count += 1
                except Exception as file_err:
                    # Retry once after garbage collection
                    try:
                        gc.collect()
                        time.sleep(0.2)
                        if item.exists():
                            item.unlink()
                            deleted_count += 1
                    except Exception:
                        pass
        freed_mb = round(freed_bytes / (1024 * 1024), 2)
        print(f"✅ Storage cleanup complete: Freed {freed_mb} MB ({deleted_count} temp files removed).")
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
