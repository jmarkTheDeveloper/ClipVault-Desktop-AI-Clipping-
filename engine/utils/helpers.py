import random
from config import TEMP_DIR

def cleanup_temp_files():
    """
    Removes heavy audio/video temp files from the temporary directory,
    preserving lightweight transcription and script cache files.
    """
    print("🧹 Cleaning up temporary audio/video files...")
    try:
        for item in TEMP_DIR.iterdir():
            if item.is_file() and item.suffix not in ['.json', '.txt']:
                item.unlink()
        print("✅ Cleanup complete.")
    except Exception as e:
        print(f"⚠️  Could not clean up all temporary files: {e}")


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
