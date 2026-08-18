import os
import sys
import time
from pathlib import Path
from urllib.parse import urlparse
import PIL.Image

# Monkey-patch PIL.Image.ANTIALIAS for compatibility with older MoviePy versions
if not hasattr(PIL.Image, 'ANTIALIAS'):
    PIL.Image.ANTIALIAS = PIL.Image.Resampling.LANCZOS

def set_low_process_priority():
    """
    Sets the current process priority to 'Below Normal' on Windows.
    This allows Python and spawned child processes (FFmpeg) to consume full CPU power
    when idle, but prevents the system from lagging or freezing when the user interacts.
    """
    try:
        import ctypes
        # Get handle to current process
        process_handle = ctypes.windll.kernel32.GetCurrentProcess()
        # BELOW_NORMAL_PRIORITY_CLASS = 0x00004000
        ctypes.windll.kernel32.SetPriorityClass(process_handle, 0x00004000)
        print("⚡ Process priority set to 'Below Normal' to prevent system lag during rendering.")
    except Exception:
        pass

from services.video_processor import VideoProcessor
from styles.caption_styles import CAPTION_STYLES
from config import OUTPUT_DIR, TEMP_DIR

# Ensure output is not buffered and uses UTF-8 encoding to support emojis on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True, encoding='utf-8')

# Function to print with immediate flush
def log(message):
    """Prints a message to the console with immediate flushing."""
    print(message, flush=True)

def copy_to_clipboard(text):
    """
    Copies text to the Windows Clipboard using PowerShell - 100% crash-safe and Unicode-compliant.
    """
    try:
        import subprocess
        # Use PowerShell Set-Clipboard with standard input to avoid command-line parsing or memory bugs
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", "Set-Clipboard -Value $Input"],
            input=text,
            text=True,
            encoding="utf-8", # Force UTF-8 encoding to support emojis on Windows
            check=True,
            creationflags=0x08000000 # CREATE_NO_WINDOW prevents flashing console window on Windows
        )
        return True
    except Exception as e:
        print(f"⚠️ Failed to copy text to clipboard: {e}")
        return False

def display_caption_styles():
    """Displays the available caption styles to the user."""
    styles = CAPTION_STYLES
    log("\n🎨 Available Caption Styles (No Strokes):")
    log("=" * 50)
    for i, (key, value) in enumerate(styles.items(), 1):
        log(f"{i}. {key} - {value['name']}")
    log("=" * 50)
    return list(styles.keys())

def validate_youtube_url(url):
    """
    Validates that the provided URL is a valid YouTube URL.

    Args:
        url (str): The URL to validate.

    Returns:
        bool: True if the URL is a valid YouTube URL, False otherwise.
    """
    if not url:
        return False
        
    # Basic validation
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return False
        
    # Check if it's a YouTube domain
    if not ('youtube.com' in parsed.netloc or 'youtu.be' in parsed.netloc):
        return False
        
    return True

def parse_timestamp(ts_str):
    """Parses timestamp string (seconds, MM:SS, or HH:MM:SS) into float seconds."""
    ts_str = ts_str.strip()
    if not ts_str:
        return None
    try:
        if ':' in ts_str:
            parts = ts_str.split(':')
            if len(parts) == 2:  # MM:SS
                return int(parts[0]) * 60 + float(parts[1])
            elif len(parts) == 3:  # HH:MM:SS
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        return float(ts_str)
    except ValueError:
        return None

def format_duration(total_seconds):
    """Formats duration in seconds into a human-readable string (hours, minutes, seconds)."""
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = int(total_seconds % 60)
    
    parts = []
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if minutes > 0:
        parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    if seconds > 0 or not parts:
        parts.append(f"{seconds} second{'s' if seconds != 1 else ''}")
        
    return ", ".join(parts)

def main(url=None):
    """
    The main function of the YouTube Viral Clipper application.

    Args:
        url (str, optional): The YouTube URL to process. Defaults to None.
    """
    current_url = url
    while True:
        try:
            url = current_url
            log("=" * 70)
            log("🎬 WELCOME TO THE AI VIDEO EDITING ENGINE 🎬")
            log("=" * 70)
            log("Please select your workflow mode:")
            log("1. 🚀 VIRAL VIDEO CLIPPER (Podcasts, Shows, Streams -> 9:16 Shorts with Captions)")
            log("2. 🍿 AI MOVIE RECAPPER & SUMMARIZER (Movie Scenes -> AI Voiceover Narrative)")
            log("3. 🎵 LYRIC VIDEO CREATOR (Sync song lyrics over background footage)")
            mode_choice = input("Select mode (1-3) [1]: ").strip() or "1"
            
            movie_recap = mode_choice == "2"
            lyric_video = mode_choice == "3"
            
            tts_voice = "en-US-ChristopherNeural"
            tts_pitch = "+0Hz"
            tts_rate = "+0%"
            add_bg_music = False
            hook_text = None
            filter_profile = 'default'
            apply_exposure_flashes = False
            apply_streamer_shake = False
            facecam_pos = "top_left"
            if lyric_video:
                log("\n" + "="*70)
                log("🎵 MODE: LYRIC VIDEO CREATOR ENABLED")
                log("="*70)
                log("💡 Enter a song or music video link to generate synced visual lyrics!")
                log("="*70 + "\n")
                
                os.makedirs(OUTPUT_DIR, exist_ok=True)
                os.makedirs(TEMP_DIR, exist_ok=True)
                log(f"📁 Output directory: {OUTPUT_DIR}")
                log(f"📁 Temp directory: {TEMP_DIR}")
                
                if not url:
                    url = input("🔗 Enter YouTube URL: ").strip()
                if not url:
                    log("❌ Error: No URL provided.")
                    continue
                if not validate_youtube_url(url):
                    log("❌ Error: Invalid YouTube URL.")
                    continue
                
                print("\n🎬 Select Visual Background for Lyrics:")
                print("1. Use original video/song footage (default)")
                print("2. Use satisfying gameplay background loop (GTA/Minecraft)")
                bg_choice = input("Select option (1-2) [1]: ").strip() or "1"
                layout = "vertical_crop" if bg_choice == "1" else "gameplay_bg"
                split_screen = False
                
                print("\n✂️ Select Synced Audio Duration:")
                print("1. Export entire song (default)")
                print("2. Crop specific part (e.g. 00:45-01:15)")
                dur_choice = input("Select option (1-2) [1]: ").strip() or "1"
                
                custom_range = None
                if dur_choice == "2":
                    range_str = input("Enter start and end time (format: MM:SS-MM:SS, e.g. 00:45-01:15): ").strip()
                    try:
                        start_str, end_str = range_str.split('-')
                        def to_sec(s):
                            parts = s.strip().split(':')
                            return int(parts[0]) * 60 + int(parts[1])
                        custom_range = (to_sec(start_str), to_sec(end_str))
                        target_duration = custom_range[1] - custom_range[0]
                        num_clips = 1
                    except Exception as err:
                        log(f"⚠️ Invalid format: {err}. Defaulting to entire song.")
                        target_duration = -1
                        num_clips = 1
                else:
                    target_duration = -1
                    num_clips = 1
            elif movie_recap:
                log("\n" + "="*70)
                log("🍿 MODE: AI MOVIE RECAPPER & SUMMARIZER ENABLED")
                log("="*70)
                log("💡 NEED MOVIE CLIPS? Copy-paste links from these popular YouTube channels:")
                log("👉 Fandango Movieclips: https://www.youtube.com/@movieclips")
                log("👉 Binge Society - Movie Clips: https://www.youtube.com/@BingeSociety")
                log("👉 Screen Bites: https://www.youtube.com/@ScreenBites")
                log("👉 Official Movie Trailers channels (Marvel, A24, Warner Bros, etc.)")
                log("="*70 + "\n")
                
                # Prompt for voice choice
                print("🎙️  Select AI Narrator Voice:")
                print("1. Guy (Deep, gravely storytelling voice - matches TikTok recap channels)")
                print("2. Christopher (Deep, smooth cinematic voice)")
                print("3. Andrew (Warm, friendly male voice)")
                print("4. Ava (Expressive, professional female voice)")
                print("5. Sonia (British female narrator voice)")
                voice_choice = input("Select voice (1-5) [1]: ").strip() or "1"
                voice_map = {
                    "1": "en-US-GuyNeural",
                    "2": "en-US-ChristopherNeural",
                    "3": "en-US-AndrewNeural",
                    "4": "en-US-AvaNeural",
                    "5": "en-GB-SoniaNeural"
                }
                tts_voice = voice_map.get(voice_choice, "en-US-GuyNeural")
                
                # Pitch adjustment prompt for movie recaps
                print("🔊 Select AI Voice Pitch (Depth/Height):")
                print("1. High Pitch (+15Hz - Recommended for energetic/fast narrators)")
                print("2. Cinematic Depth (-20Hz - Deep, rich voice for horror/suspense)")
                print("3. Ultra Deep (-40Hz - Very deep, dramatic voice)")
                print("4. Natural/Standard (+0Hz)")
                pitch_choice = input("Select pitch (1-4) [4]: ").strip() or "4"
                pitch_map = {
                    "1": "+15Hz",
                    "2": "-20Hz",
                    "3": "-40Hz",
                    "4": "+0Hz"
                }
                tts_pitch = pitch_map.get(pitch_choice, "+0Hz")
                log(f"🔊 Selected Pitch Shift: {tts_pitch}\n")
                
                # Speaking speed selection prompt
                print("⚡ Select Speaking Speed (Rate):")
                print("1. Fast Talking (+20% - Energetic TikTok speed)")
                print("2. Slightly Fast (+10%)")
                print("3. Natural/Standard (+0%)")
                print("4. Slow/Dramatic (-5%)")
                rate_choice = input("Select speed (1-4) [3]: ").strip() or "3"
                rate_map = {
                    "1": "+20%",
                    "2": "+10%",
                    "3": "+0%",
                    "4": "-5%"
                }
                tts_rate = rate_map.get(rate_choice, "+0%")
                log(f"⚡ Selected Speaking Speed: {tts_rate}\n")
                
                # Prompt for background suspense BGM choice
                print("🎵 Add dramatic background ambient music? (y/n) [y]: ")
                bg_music_choice = input().strip().lower() or "y"
                add_bg_music = bg_music_choice == "y"
                log(f"🎵 Background Music: {'ENABLED' if add_bg_music else 'DISABLED'}\n")
            else:
                log("\n🚀 MODE: VIRAL VIDEO CLIPPER ENABLED\n")

            # Ensure output directory exists
            os.makedirs(OUTPUT_DIR, exist_ok=True)
            # Ensure temp directory exists
            os.makedirs(TEMP_DIR, exist_ok=True)
            log(f"📁 Output directory: {OUTPUT_DIR}")
            log(f"📁 Temp directory: {TEMP_DIR}")

            if not url:
                url = input("🔗 Enter YouTube URL: ").strip()
            if not url:
                log("❌ Error: No URL provided.")
                continue

            # Validate URL
            if not validate_youtube_url(url):
                log("❌ Error: Invalid YouTube URL. Must be a youtube.com or youtu.be link.")
                continue

            # Prompt for layout choice
            if not lyric_video:
                layout = "vertical_crop"
                split_screen = False
                
                # Widescreen landscape choice is only offered in Recap mode
                if movie_recap:
                    print("📺 Select Video Layout:")
                    print("1. Vertical Crop (9:16) - Fills the entire vertical screen (Best for TikTok/Reels/Shorts)")
                    print("2. Landscape Fit (9:16) - Keeps full original width with black bars on top/bottom")
                    print("3. Native Widescreen (16:9) - Keeps original widescreen video (Best for Facebook Videos & YouTube Long-form)")
                    print("4. Blurred Background Fit (9:16) - Keeps full width centered with a blurred, zoomed background")
                    layout_choice = input("Select layout (1-4) [2]: ").strip() or "2"
                    layout_map = {
                        "1": "vertical_crop",
                        "2": "landscape_fit",
                        "3": "landscape",
                        "4": "landscape_blur"
                    }
                    layout = layout_map.get(layout_choice, "landscape_fit")
                    
                    # Split-screen overlay is only applicable/offered for vertical formats
                    if layout != "landscape":
                        print("\n🎮 Select Video Sub-Layout Overlay:")
                        print("1. Standard (No background overlay)")
                        print("2. Satisfying/Gameplay Split-Screen (Add satisfying background video to bottom half)")
                        split_choice = input("Select option (1-2) [1]: ").strip() or "1"
                        split_screen = split_choice == "2"
                else:
                    print("📺 Select Video Layout:")
                    print("1. Vertical Crop (9:16) - Fills the entire vertical screen (Best for TikTok/Reels/Shorts)")
                    print("2. Landscape Fit (9:16) - Keeps full original width with black bars on top/bottom")
                    print("3. Blurred Background Fit (9:16) - Keeps full width centered with a blurred, zoomed background")
                    print("4. Streamer Facecam Split-Screen (9:16) - Facecam on top, gameplay on bottom (CaseOh style!)")
                    print("5. Podcast/Interview Split-Screen (9:16) - Left speaker on top, right speaker on bottom (Clipzi style!)")
                    layout_choice = input("Select layout (1-5) [1]: ").strip() or "1"
                    layout_map = {
                        "1": "vertical_crop",
                        "2": "landscape_fit",
                        "3": "landscape_blur",
                        "4": "streamer_cam",
                        "5": "podcast_split"
                    }
                    layout = layout_map.get(layout_choice, "vertical_crop")
                    
                    if layout == "streamer_cam":
                        print("\n📷 Select Streamer Facecam Position:")
                        print("1. Top-Left Corner (default)")
                        print("2. Top-Right Corner")
                        print("3. Bottom-Left Corner")
                        print("4. Bottom-Right Corner")
                        cam_choice = input("Select option (1-4) [1]: ").strip() or "1"
                        cam_map = {
                            "1": "top_left",
                            "2": "top_right",
                            "3": "bottom_left",
                            "4": "bottom_right"
                        }
                        facecam_pos = cam_map.get(cam_choice, "top_left")
                        log(f"📷 Streamer Facecam Position: {facecam_pos.upper()}")
                        split_screen = False
                    elif layout == "podcast_split":
                        split_screen = False
                    else:
                        print("\n🎮 Select Video Sub-Layout Overlay:")
                        print("1. Standard (No background overlay)")
                        print("2. Satisfying/Gameplay Split-Screen (Add satisfying background video to bottom half)")
                        split_choice = input("Select option (1-2) [1]: ").strip() or "1"
                        split_screen = split_choice == "2"

            log(f"📺 Selected Layout: {layout}")
            if split_screen:
                log("🎮 Satisfying Split-Screen Overlay: ENABLED")

            # Prompt for download quality
            print("\n⚡ Select Video Download Quality/Speed:")
            print("1. 720p (Speed Quality - 5x to 10x faster downloads and processing - Recommended)")
            print("2. 1080p (Highest Quality - slower downloads)")
            quality_choice = input("Select option (1-2) [1]: ").strip() or "1"
            quality = "720p" if quality_choice == "1" else "1080p"
            log(f"⚡ Selected Quality: {quality}\n")

            if not movie_recap and not lyric_video:
                print("💥 Enable Streamer Reaction Zoom & Shake on screams/laughter? (y/n) [n]: ")
                shake_choice = input().strip().lower() or "n"
                apply_streamer_shake = shake_choice == "y"
                log(f"💥 Streamer Reaction Zoom & Shake: {'ENABLED' if apply_streamer_shake else 'DISABLED'}\n")

            # Display caption styles list
            available_styles = display_caption_styles()
            
            # Default style index mapping
            default_style_idx = "1"
            if movie_recap:
                try:
                    default_style_idx = str(available_styles.index('tiktok_recap') + 1)
                except ValueError:
                    default_style_idx = "1"
            
            style_idx = input(f"Select style (1-{len(available_styles)}) [{default_style_idx}]: ").strip() or default_style_idx
            try:
                selected_style = available_styles[int(style_idx) - 1]
            except (ValueError, IndexError):
                if movie_recap:
                    selected_style = 'tiktok_recap'
                else:
                    selected_style = 'clean_white'
            log(f"🎨 Selected Style: {selected_style}\n")

            # Prompt for clipping options
            print("⏱️  Select Clip Duration Option:")
            print("1. Auto-Detect Highlights (Generates short virality-scored highlights)")
            print("2. Entire Video (Processes the entire video as one complete movie recap)")
            print("3. Customize Range (Manually specify start and end timestamps to recap a specific scene)")
            clip_dur_choice = input("Select option (1-3) [1]: ").strip() or "1"
            
            num_clips = 1
            target_duration = 30
            topic = None
            custom_range = None
            custom_range_filter = None
            
            if clip_dur_choice == "1":
                # Prompt for clips count
                num_clips = int(input("🔢 How many clips to generate? [3]: ").strip() or "3")
                
                # Prompt for target duration
                target_duration = int(input("⏱️  Target duration (seconds) [30]: ").strip() or "30")
                
                # Prompt for topic prioritization
                topic = input("💡 Prioritize specific topic/keyword (optional) [None]: ").strip()
                if not topic:
                    topic = None
            elif clip_dur_choice == "3":
                while True:
                    print("\n📐 Enter Custom Time Range (you can enter seconds like '52' or '128', or MM:SS like '1:16'):")
                    start_input = input("⏳ Enter START time [0]: ").strip() or "0"
                    end_input = input("⏳ Enter END time: ").strip()
                    
                    start_sec = parse_timestamp(start_input)
                    end_sec = parse_timestamp(end_input)
                    
                    if start_sec is None or end_sec is None or start_sec < 0 or end_sec <= start_sec:
                        print("❌ Error: Invalid start or end time. Make sure end time is greater than start time.")
                        continue
                        
                    duration_sec = end_sec - start_sec
                    duration_str = format_duration(duration_sec)
                    
                    print(f"\n📐 Selected Range: {start_input} to {end_input}")
                    print(f"⏱️  Total Duration: {duration_sec:.1f} seconds ({duration_str})")
                    
                    confirm = input("Is this range correct? (y/n) [y]: ").strip().lower() or 'y'
                    if confirm in ['y', 'yes']:
                        print("\n🎯 How do you want to clip this custom range?")
                        print("1. Process the entire range as one single clip (Default)")
                        print("2. Auto-Detect Highlights (AI selects the best highlights within this range)")
                        range_choice = input("Select option (1-2) [1]: ").strip() or "1"
                        
                        if range_choice == "2":
                            num_clips = int(input("🔢 How many clips to generate? [3]: ").strip() or "3")
                            target_duration = int(input("⏱️  Target duration (seconds) [30]: ").strip() or "30")
                            custom_range_filter = (start_sec, end_sec)
                            custom_range = None
                        else:
                            custom_range = (start_sec, end_sec)
                            custom_range_filter = None
                        break
            else:
                # Force settings for processing entire video
                num_clips = 1
                target_duration = -1  # Negative value triggers entire video mode in processor
                log("🎞️ Entire Video mode enabled. Full duration recap will be generated.")

            # Prompt for Copyright Bypass Option
            print("\n⚡ Copyright Bypass Options:")
            print("1. Standard (No extra bypass filters - includes 12% original movie background audio)")
            print("2. Maximum Copyright Bypass (Applies 1.06x Speedup + Horizontal Mirroring - includes 12% original movie background audio - Recommended to bypass Facebook/TikTok Content ID!)")
            bypass_choice = input("Select option (1-2) [1]: ").strip() or "1"
            yt_bypass = bypass_choice == "2"

            if split_screen or layout == "gameplay_bg":
                from config import BACKGROUNDS_DIR
                bg_files = list(BACKGROUNDS_DIR.glob("*.mp4"))
                
                if split_screen:
                    log("\n" + "!"*70)
                    log("⚠️  IMPORTANT COPYRIGHT WARNING & DISCLAIMER:")
                    log("!"*70)
                    log("👉 Split-screen overlay helps bypass simple automated Content ID filters")
                    log("   on TikTok, Instagram Reels, and Facebook Reels.")
                    log("👉 However, this is NOT 100% foolproof on any platform.")
                    log("👉 YouTube's Content ID is highly advanced and will still likely detect")
                    log("   copyrighted audio/video tracks. Avoid posting copyrighted music/clips")
                    log("   on YouTube if you plan to monetize.")
                    log("!"*70 + "\n")
                    
                    if not bg_files:
                        log(f"ℹ️  Notice: The '{BACKGROUNDS_DIR}' folder is currently empty.")
                        log("   To use split-screen, please place one or more gameplay or satisfying background videos (.mp4) in that folder.")
                        log("   Press Enter to continue (it will fall back to normal layout for this run)...")
                        input()
                else: # gameplay_bg
                    if not bg_files:
                        log(f"ℹ️  Notice: The '{BACKGROUNDS_DIR}' folder is currently empty.")
                        log("   To use gameplay backgrounds, please place one or more satisfying loop videos (.mp4) in that folder.")
                        log("   Press Enter to continue (it will fall back to original visuals)...")
                        input()

            # Prompt for optional cinematic/creative grading filters
            print("\n🎨 Select Cinematic Color Grade Profile:")
            print("1. Default (No color grading - standard video colors)")
            print("2. Cool Teal (cool cinematic desaturated blues)")
            print("3. Manga Ink (grayscale sketch with red highlights - ideal for anime edits!)")
            print("4. Dark Cyberpunk (deep violet shadows and high neon cyan contrast)")
            print("5. Sunset Gold (warm orange retro)")
            print("6. Sigma HDR (sharp details & high color saturation - ideal for streamer edits!)")
            profile_choice = input("Select option (1-6) [1]: ").strip() or "1"
            profile_map = {
                "1": "default",
                "2": "cool_teal",
                "3": "manga_ink",
                "4": "dark_cyberpunk",
                "5": "sunset_gold",
                "6": "sigma_hdr"
            }
            filter_profile = profile_map.get(profile_choice, "default")
            
            print("\n⚡ Add white exposure beat-flashes? (y/n) [n]: ")
            flash_choice = input().strip().lower() or 'n'
            apply_exposure_flashes = flash_choice == 'y'

            log("\n" + "="*70)
            log("🎬 STARTING VIDEO PROCESSING...")
            log("="*70)

            log("⏳ Initializing video processor...")
            processor = VideoProcessor(caption_style=selected_style)
            log("✅ Video processor initialized")
            
            # Add a small delay to ensure logs are displayed
            time.sleep(0.5)
            
            try:
                outputs, title = processor.process_video(url, num_clips, target_duration, topic=topic, layout=layout, split_screen=split_screen, movie_recap=movie_recap, quality=quality, yt_bypass=yt_bypass, tts_voice=tts_voice, tts_pitch=tts_pitch, tts_rate=tts_rate, custom_range=custom_range, add_bg_music=add_bg_music, hook_text=hook_text, lyrc_promo=False, custom_range_filter=custom_range_filter, filter_profile=filter_profile, apply_exposure_flashes=apply_exposure_flashes, apply_streamer_shake=apply_streamer_shake, facecam_pos=facecam_pos)
            finally:
                try:
                    processor.face_tracker.close()
                except Exception as close_err:
                    log(f"⚠️ Warning: Could not close face tracker resources: {close_err}")

            log("\n" + "="*70)
            log("🎉 VIRAL CLIPS GENERATED!")
            log("="*70)
            log(f"📹 Source: '{title}'")
            log(f"📁 Location: {OUTPUT_DIR.resolve()}")
            log(f"🎨 Caption Style: {processor.caption_maker.styles[selected_style]['name']}")

            total_size = 0
            log("\n📋 Generated Clips Summary:")
            log("="*70)
            for i, f in enumerate(outputs, 1):
                path = Path(f)
                try:
                    if path.exists():
                        size_bytes = path.stat().st_size
                        size_mb = size_bytes / (1024 * 1024)
                        total_size += size_mb
                        log(f"\n🎥 CLIP {i}: {path.name} ({size_mb:.2f} MB)")
                        
                        # Read and display generated metadata
                        metadata_path = path.parent / "metadata" / (path.stem + "_metadata.txt")
                        if metadata_path.exists():
                            with open(metadata_path, 'r', encoding='utf-8') as f_meta:
                                log(f_meta.read())
                except Exception as e:
                    log(f"  - {path.name} (error loading metadata: {e})")
            log(f"\n💾 Total Size: {total_size:.2f} MB")
            
            # Prompt user to choose target upload platform directory copy
            print("\n📲 Select Target Upload Platform for these clips:")
            print("1. TikTok")
            print("2. YouTube")
            print("3. Facebook")
            print("4. Instagram")
            print("5. Keep in main clips folder (Do not move)")
            platform_choice = input("Select option (1-5) [5]: ").strip() or "5"
            
            platform_map = {
                "1": "tiktok",
                "2": "youtube",
                "3": "facebook",
                "4": "instagram"
            }
            
            target_platform = platform_map.get(platform_choice)
            if target_platform:
                platform_dir = OUTPUT_DIR / target_platform
                platform_dir.mkdir(exist_ok=True)
                
                # Move files into professional folder structures
                moved_count = 0
                import shutil
                import re
                for f in outputs:
                    path = Path(f)
                    if path.exists():
                        # Create clean sanitized folder name based on clip name
                        folder_name = re.sub(r'[^a-zA-Z0-9_]', '', path.stem.replace(' ', '_'))
                        clip_folder = platform_dir / folder_name
                        clip_folder.mkdir(exist_ok=True)
                        
                        # Move video clip to clips/[platform]/[folder]/video.mp4
                        new_video_path = clip_folder / "video.mp4"
                        shutil.move(str(path), str(new_video_path))
                        
                        # Move metadata text file to clips/[platform]/[folder]/metadata.txt if it exists
                        metadata_path = path.parent / "metadata" / (path.stem + "_metadata.txt")
                        if metadata_path.exists():
                            new_meta_path = clip_folder / "metadata.txt"
                            shutil.move(str(metadata_path), str(new_meta_path))
                        
                        moved_count += 1
                
                log(f"\n📁 Packaged and moved {moved_count} clip(s) into: clips/{target_platform}/[Clip_Folder]/")

                # Trigger 1-Click Upload Assist for TikTok (Option 1) or YouTube (Option 2)
                if target_platform in ['tiktok', 'youtube']:
                    assist_name = "TikTok Studio" if target_platform == 'tiktok' else "YouTube Studio"
                    assist_url = "https://www.tiktok.com/tiktokstudio/upload" if target_platform == 'tiktok' else "https://studio.youtube.com/"
                    log(f"\n🚀 Launching {assist_name} Upload Assist...")
                    
                    # Try to copy the metadata of the first processed clip
                    copied_desc = False
                    for f in outputs:
                        path = Path(f)
                        folder_name = re.sub(r'[^a-zA-Z0-9_]', '', path.stem.replace(' ', '_'))
                        meta_file = platform_dir / folder_name / "metadata.txt"
                        if meta_file.exists():
                            try:
                                with open(meta_file, 'r', encoding='utf-8') as f_m:
                                    meta_content = f_m.read()
                                    if copy_to_clipboard(meta_content):
                                        log("📋 Clip Title & Description copied to clipboard successfully!")
                                        copied_desc = True
                                        break
                            except Exception as clipboard_err:
                                log(f"⚠️ Clipboard copy warning: {clipboard_err}")
                                
                    # Open default browser
                    import webbrowser
                    try:
                        webbrowser.open(assist_url)
                        log(f"🌐 Opened {assist_name} upload page in your default browser.")
                        if copied_desc:
                            log("💡 Pro-Tip: Drag and drop the 'video.mp4' from your folder, then press Ctrl+V to paste the description!")
                    except Exception as web_err:
                        log(f"⚠️ Could not open browser upload page: {web_err}")

            log("\n✅ Done! Enjoy your viral clips!")

        except ValueError as e:
            log(f"\n❌ Input Error: {e}")
        except FileNotFoundError as e:
            log(f"\n❌ File Error: {e}")
        except Exception as e:
            log(f"\n❌ An unexpected error occurred: {e}")
            import traceback
            traceback.print_exc()
            log("\nPlease check the error message above and try again.")

        # Ask if user wants to run another video after error or success
        print("\n🔄 Do you want to process another video? (y/n) [y]: ")
        another_choice = input().strip().lower()
        if another_choice == 'n':
            log("\n👋 Thank you for using the AI Video Editing Engine! Goodbye!")
            break
            
        current_url = None
        print("\n" + "\n" * 3)

if __name__ == "__main__":
    try:
        # Check if we should boot as a FastAPI server
        if "--server" in sys.argv:
            print("🚀 Launching local FastAPI server...")
            import uvicorn
            uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
            sys.exit(0)

        # Check if URL was provided as command-line argument
        url = None
        if len(sys.argv) > 1:
            url = sys.argv[1].strip()
            # Basic URL validation
            if not url.startswith('http'):
                url = 'https://' + url
        
        # Create necessary directories
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        os.makedirs(Path("./temp"), exist_ok=True)
        
        # Apply Windows system lag optimizer
        set_low_process_priority()
        
        main(url)
    except KeyboardInterrupt:
        print("\n\n🛑 Process interrupted by user. Exiting gracefully.")
    except Exception as e:
        print(f"\n\n❌ Critical error: {e}")
        print("Please report this issue if it persists.")
