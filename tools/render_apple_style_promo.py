import os
import math
import wave
import struct
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

# Paths
ROOT_DIR = r"c:\Users\Dell User\Downloads\Personal Coding Projects\Python Projects\Desktop AI Clipping Software"
CLIPS_DIR = os.path.join(ROOT_DIR, "clips")
SCRATCH_DIR = os.path.join(ROOT_DIR, "scratch")
WEB_PUBLIC_DIR = r"c:\Users\Dell User\Downloads\Personal Coding Projects\Web Projects\ClipVault Web\public"

os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(SCRATCH_DIR, exist_ok=True)

LOGO_PATH = os.path.join(ROOT_DIR, "logo", "icon-512.png")
SAMPLE_CLIP_PATH = os.path.join(ROOT_DIR, "engine", "clips", "can mold it. Um that's maybe the most im.mp4")
MUSIC_SOURCE = os.path.join(ROOT_DIR, "engine", "music", "suspense.mp3")
UI_SCREENSHOT_PATH = r"C:\Users\Dell User\.gemini\antigravity\brain\90ffe8a2-9ff4-43ac-9067-907a538fd867\.user_uploaded\media_1791357901524.png"

OUTPUT_RAW_VIDEO = os.path.join(SCRATCH_DIR, "apple_promo_raw.mp4")
OUTPUT_AUDIO = os.path.join(SCRATCH_DIR, "apple_promo_audio.wav")
OUTPUT_FINAL_VIDEO = os.path.join(CLIPS_DIR, "clipvault_apple_motion_promo.mp4")

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION_SEC = 16.5
TOTAL_FRAMES = int(FPS * DURATION_SEC)  # 495 frames

FONT_HEADING = "C:/Windows/Fonts/bahnschrift.ttf"
FONT_BODY = "C:/Windows/Fonts/segoeuib.ttf"
FONT_MONO = "C:/Windows/Fonts/bahnschrift.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

# Colors (Apple Dark Studio Palette)
C_STUDIO_BG = (12, 15, 22)
C_GREEN = (52, 235, 61)
C_CYAN = (56, 189, 248)
C_WHITE = (255, 255, 255)
C_GRAY_TEXT = (148, 163, 184)
C_DARK_CARD = (18, 24, 38)
C_BORDER = (255, 255, 255, 28)

# Easing functions
def ease_out_cubic(t):
    t = max(0.0, min(1.0, t))
    return 1.0 - (1.0 - t) ** 3

def ease_in_out_cubic(t):
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        return 1.0 - (-2.0 * t + 2.0) ** 3 / 2.0

def ease_out_back(t, s=1.70158):
    t = max(0.0, min(1.0, t))
    t -= 1.0
    return t * t * ((s + 1.0) * t + s) + 1.0

# Preload Assets
logo_img = None
if os.path.exists(LOGO_PATH):
    logo_img = Image.open(LOGO_PATH).convert("RGBA")

sample_cap = None
if os.path.exists(SAMPLE_CLIP_PATH):
    sample_cap = cv2.VideoCapture(SAMPLE_CLIP_PATH)

# Load base UI screenshot and crop taskbar
base_ui_img = None
if os.path.exists(UI_SCREENSHOT_PATH):
    raw_ui = Image.open(UI_SCREENSHOT_PATH).convert("RGBA")
    # Crop off taskbar at bottom
    base_ui_img = raw_ui.crop((0, 0, 1024, 595))
    print("[INIT] Loaded base ClipVault UI screenshot:", base_ui_img.size)

# Phone screen bounds inside base_ui_img (relative to 1024x595)
# In media_1791357901524.png, phone screen video is approx: x: 574, y: 136, w: 284, h: 410
PHONE_V_X = 574
PHONE_V_Y = 136
PHONE_V_W = 284
PHONE_V_H = 410

print(f"[INIT] Initializing Apple-Style 3D Motion Graphics Engine: {WIDTH}x{HEIGHT} @ {FPS}fps, {TOTAL_FRAMES} frames...")

# Video Writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
video_writer = cv2.VideoWriter(OUTPUT_RAW_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

# Pre-render luxury Apple studio background
def make_studio_background():
    bg = Image.new("RGBA", (WIDTH, HEIGHT), (10, 13, 20, 255))
    draw = ImageDraw.Draw(bg)
    
    # Soft circular spotlight in upper center
    cx, cy = WIDTH // 2, int(HEIGHT * 0.42)
    for r in range(550, 0, -25):
        alpha = int((1.0 - r / 550.0) * 45)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(26, 36, 56, alpha))
        
    return bg

studio_bg_template = make_studio_background()

# Helper to draw Apple-style mouse cursor
def draw_cursor(draw, x, y, is_clicking=False, click_progress=0.0):
    # Cursor points (macOS style sleek pointer)
    pts = [
        (x, y),
        (x, y + 26),
        (x + 6, y + 20),
        (x + 11, y + 31),
        (x + 15, y + 29),
        (x + 10, y + 18),
        (x + 18, y + 18)
    ]
    # Drop shadow
    shadow_pts = [(px + 2, py + 3) for px, py in pts]
    draw.polygon(shadow_pts, fill=(0, 0, 0, 100))
    # Outer black stroke
    draw.polygon(pts, fill=(255, 255, 255, 255), outline=(0, 0, 0, 255))
    
    # Click ripple pulse
    if is_clicking and 0.0 < click_progress < 1.0:
        cr = int(click_progress * 35)
        c_alpha = int((1.0 - click_progress) * 220)
        draw.ellipse([x - cr, y - cr, x + cr, y + cr], outline=(52, 235, 61, c_alpha), width=3)

# Helper to draw Apple-style frosted glass callout badge
def draw_apple_callout(draw, x, y, tag, title, desc, anim_t=1.0, width=540):
    if anim_t <= 0.01:
        return
    t = ease_out_back(anim_t)
    w = width
    h = 96
    cur_x = int(x + (1.0 - t) * 60)
    cur_y = y
    alpha = int(anim_t * 255)
    
    # Frosted glass card
    draw.rounded_rectangle([cur_x, cur_y, cur_x + w, cur_y + h], radius=18, fill=(18, 24, 38, 235), outline=(255, 255, 255, int(40 * anim_t)), width=2)
    # Emerald left accent indicator
    draw.rounded_rectangle([cur_x + 8, cur_y + 16, cur_x + 12, cur_y + h - 16], radius=2, fill=(52, 235, 61, int(230 * anim_t)))
    
    # Tag
    draw.text((cur_x + 24, cur_y + 14), tag, font=get_font(FONT_MONO, 16), fill=(52, 235, 61, alpha))
    # Title
    draw.text((cur_x + 24, cur_y + 36), title, font=get_font(FONT_HEADING, 25), fill=(255, 255, 255, alpha))
    # Desc
    draw.text((cur_x + 24, cur_y + 66), desc, font=get_font(FONT_BODY, 18), fill=(148, 163, 184, alpha))

print("[RENDER] Rendering Apple / Kram.Visuals style product showcase frames...")

for frame_idx in range(TOTAL_FRAMES):
    sec = frame_idx / FPS
    bg = studio_bg_template.copy()
    draw = ImageDraw.Draw(bg)
    
    # Current Video Frame from live clip
    live_v_img = None
    if sample_cap:
        ret, vf = sample_cap.read()
        if not ret:
            sample_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, vf = sample_cap.read()
        if ret and vf is not None:
            rgb_f = cv2.cvtColor(vf, cv2.COLOR_BGR2RGB)
            live_v_img = Image.fromarray(rgb_f)

    # Composite live video directly into base_ui_img
    current_ui = base_ui_img.copy() if base_ui_img else Image.new("RGBA", (1024, 595), (15, 20, 30))
    if live_v_img:
        # Resize live video to fit phone screen
        v_resized = live_v_img.resize((PHONE_V_W, PHONE_V_H), Image.Resampling.BILINEAR)
        current_ui.paste(v_resized, (PHONE_V_X, PHONE_V_Y))
        
        # Add dynamic face-tracking reticle on live video
        ui_draw = ImageDraw.Draw(current_ui)
        # Centered face box over speaker
        fx = PHONE_V_X + 80
        fy = PHONE_V_Y + 70 + int(math.sin(frame_idx * 0.12) * 4)
        fw, fh = 120, 120
        # Corner brackets
        bl = 16
        ui_draw.line([(fx, fy), (fx + bl, fy)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx, fy), (fx, fy + bl)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx + fw, fy), (fx + fw - bl, fy)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx + fw, fy), (fx + fw, fy + bl)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx, fy + fh), (fx + bl, fy + fh)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx, fy + fh), (fx, fy + fh - bl)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx + fw, fy + fh), (fx + fw - bl, fy + fh)], fill=(52, 235, 61, 240), width=2)
        ui_draw.line([(fx + fw, fy + fh), (fx + fw, fy + fh - bl)], fill=(52, 235, 61, 240), width=2)

    # -------------------------------------------------------------
    # VIRTUAL CAMERA DEFINITION (Apple Keynote Smooth Interpolation)
    # -------------------------------------------------------------
    # Shots:
    # Shot 1 (0.0s - 3.5s): Overview of whole app window, cursor enters & pastes link
    # Shot 2 (3.5s - 7.5s): Camera zooms into Left Panel (Auto-Clipper settings & Whisper AI)
    # Shot 3 (7.5s - 11.5s): Camera glides to Right Panel (Phone preview & Kinetic captions)
    # Shot 4 (11.5s - 13.5s): Camera pans to Export Button & fast NVENC render
    # Shot 5 (13.5s - 16.5s): Camera pulls back to isometric view + Pricing & Download CTA
    
    if sec < 3.5:
        # Shot 1: Wide floating window
        t_shot = sec / 3.5
        cam_zoom = 0.98 + 0.02 * ease_out_cubic(t_shot)
        cam_cx = 512
        cam_cy = 298
        shot_id = 1
    elif sec < 7.5:
        # Shot 2: Smooth zoom into Left Panel
        t_shot = (sec - 3.5) / 4.0
        transition_t = ease_in_out_cubic(min(1.0, (sec - 3.5) / 1.0))
        cam_zoom = 1.0 + (1.65 - 1.0) * transition_t
        cam_cx = 512 + (270 - 512) * transition_t
        cam_cy = 298 + (280 - 298) * transition_t
        shot_id = 2
    elif sec < 11.5:
        # Shot 3: Camera glides to Phone Player
        t_shot = (sec - 7.5) / 4.0
        transition_t = ease_in_out_cubic(min(1.0, (sec - 7.5) / 1.2))
        cam_zoom = 1.65 + (1.75 - 1.65) * transition_t
        cam_cx = 270 + (720 - 270) * transition_t
        cam_cy = 280 + (320 - 280) * transition_t
        shot_id = 3
    elif sec < 13.5:
        # Shot 4: Camera pans to Export Settings
        t_shot = (sec - 11.5) / 2.0
        transition_t = ease_in_out_cubic(min(1.0, (sec - 11.5) / 0.8))
        cam_zoom = 1.75 + (1.45 - 1.75) * transition_t
        cam_cx = 720 + (420 - 720) * transition_t
        cam_cy = 320 + (420 - 320) * transition_t
        shot_id = 4
    else:
        # Shot 5: Pull back into cinematic overview & finale
        t_shot = (sec - 13.5) / 3.0
        transition_t = ease_in_out_cubic(min(1.0, (sec - 13.5) / 0.9))
        cam_zoom = 1.45 + (0.86 - 1.45) * transition_t
        cam_cx = 420 + (512 - 420) * transition_t
        cam_cy = 420 + (298 - 420) * transition_t
        shot_id = 5

    # -------------------------------------------------------------
    # RENDER FLOATING DESKTOP WINDOW WITH CAMERA TRANSFORM
    # -------------------------------------------------------------
    # Scale current_ui based on cam_zoom
    scaled_w = int(1024 * cam_zoom)
    scaled_h = int(595 * cam_zoom)
    scaled_ui = current_ui.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
    
    # Calculate placement centered around (cam_cx, cam_cy)
    # Screen target center:
    screen_target_x = WIDTH // 2
    screen_target_y = int(HEIGHT * 0.44) if shot_id < 5 else int(HEIGHT * 0.38)
    
    win_x = int(screen_target_x - (cam_cx * cam_zoom))
    win_y = int(screen_target_y - (cam_cy * cam_zoom))
    
    # Create window container with Apple Titlebar and drop shadow
    # For wide shots (1 and 5), render full window chrome with titlebar
    if shot_id == 1 or shot_id == 5:
        # Window Shadow
        shadow_margin = 40
        draw.rounded_rectangle([
            win_x - 12, win_y - 48,
            win_x + scaled_w + 12, win_y + scaled_h + 12
        ], radius=24, fill=(0, 0, 0, 160))
        
        # Window Titlebar
        tb_h = int(42 * cam_zoom)
        tb_y = win_y - tb_h
        draw.rounded_rectangle([
            win_x, tb_y,
            win_x + scaled_w, win_y + 10
        ], radius=int(18 * cam_zoom), fill=(24, 30, 44, 255), outline=(255, 255, 255, 30), width=1)
        
        # Traffic light buttons
        btn_r = int(6 * cam_zoom)
        by = tb_y + tb_h // 2
        draw.ellipse([win_x + 20, by - btn_r, win_x + 20 + btn_r*2, by + btn_r], fill=(255, 95, 87)) # red
        draw.ellipse([win_x + 40, by - btn_r, win_x + 40 + btn_r*2, by + btn_r], fill=(254, 188, 46)) # yellow
        draw.ellipse([win_x + 60, by - btn_r, win_x + 60 + btn_r*2, by + btn_r], fill=(40, 200, 64)) # green
        
        # Window title text
        tb_font = get_font(FONT_BODY, int(15 * cam_zoom))
        draw.text((win_x + scaled_w // 2 - 80, tb_y + 11), "ClipVault Studio Pro", font=tb_font, fill=(255, 255, 255, 200))
    
    # Paste scaled UI onto background canvas
    bg.paste(scaled_ui, (win_x, win_y), scaled_ui)
    draw = ImageDraw.Draw(bg)
    
    # Window glass border
    draw.rounded_rectangle([
        win_x - 1, win_y - 1,
        win_x + scaled_w + 1, win_y + scaled_h + 1
    ], radius=int(14 * cam_zoom), outline=(255, 255, 255, 35), width=2)

    # -------------------------------------------------------------
    # SHOT-SPECIFIC OVERLAYS, CURSORS, AND CALLOUTS
    # -------------------------------------------------------------
    
    # TOP HEADER TEXT (Apple Style clean branding)
    if shot_id <= 4:
        top_h1 = "CLIPVAULT STUDIO"
        top_h2 = "100% On-Device AI Video Workstation"
        draw.text((WIDTH//2 - 220, 100), top_h1, font=get_font(FONT_HEADING, 38), fill=(255, 255, 255, 240))
        draw.text((WIDTH//2 - 250, 150), top_h2, font=get_font(FONT_BODY, 24), fill=(52, 235, 61, 230))

    # --- SHOT 1: Paste YouTube Link & Dropzone ---
    if shot_id == 1:
        # Animate cursor entering and clicking Paste
        # Target: Paste button in UI (approx x: 350, y: 220 in base_ui coords)
        target_scr_x = win_x + int(350 * cam_zoom)
        target_scr_y = win_y + int(224 * cam_zoom)
        
        cur_progress = min(1.0, sec / 1.8)
        cur_t = ease_out_cubic(cur_progress)
        
        # Cursor enters from bottom-right
        cur_x = int(WIDTH * 0.85 + (target_scr_x - WIDTH * 0.85) * cur_t)
        cur_y = int(HEIGHT * 0.75 + (target_scr_y - HEIGHT * 0.75) * cur_t)
        
        is_click = (1.8 <= sec <= 2.4)
        click_p = (sec - 1.8) / 0.6 if is_click else 0.0
        draw_cursor(draw, cur_x, cur_y, is_clicking=is_click, click_progress=click_p)
        
        # Callout Badge 1
        c1_t = min(1.0, max(0.0, (sec - 0.6) / 0.5))
        draw_apple_callout(draw, 50, 1420, "01. INSTANT INGESTION", "Zero Cloud Queues", "Paste any YouTube link or drop raw 4K videos", c1_t, width=980)

    # --- SHOT 2: Left Panel AI Analysis Pipeline ---
    elif shot_id == 2:
        # Floating 3D Processing Pipeline Cards
        c2_t = min(1.0, max(0.0, (sec - 3.8) / 0.5))
        draw_apple_callout(draw, 50, 1380, "02. LOCAL AI PIPELINE", "Whisper Speech + Face Tracking", "Runs 100% on your GPU with zero cloud latency", c2_t, width=980)
        
        # 3 Live Status Badges
        p_items = [
            ("Whisper AI Transcription", "Word-level alignment [DONE]", 4.2),
            ("Acoustic Peak Analyzer", "Detecting laugh & climax hooks [DONE]", 5.0),
            ("Neural Face Steadicam", "Active speaker centered in 9:16 [ACTIVE]", 5.8)
        ]
        for p_i, (p_title, p_sub, p_time) in enumerate(p_items):
            if sec >= p_time:
                pt = ease_out_back(min(1.0, (sec - p_time) / 0.4))
                px = 60
                py = 1520 + p_i * 84
                draw.rounded_rectangle([px, py, px + 960, py + 72], radius=14, fill=(18, 26, 38, 240), outline=(52, 235, 61, int(180 * pt)), width=2)
                draw.text((px + 24, py + 14), p_title, font=get_font(FONT_HEADING, 22), fill=(255, 255, 255, 255))
                draw.text((px + 24, py + 40), p_sub, font=get_font(FONT_BODY, 17), fill=(52, 235, 61, 255))

    # --- SHOT 3: Phone Preview & Kinetic Captions ---
    elif shot_id == 3:
        # Callout Badge 3
        c3_t = min(1.0, max(0.0, (sec - 7.6) / 0.5))
        draw_apple_callout(draw, 50, 1400, "03. VIRAL SHORTS CONVERSION", "Auto 9:16 Steadicam + Subtitles", "Perfect portrait crop with high-retention captions", c3_t, width=980)
        
        # Viral Hook Gauge Card
        score_val = min(98, int(82 + (sec - 7.5) * 4))
        draw.rounded_rectangle([60, 1530, 1020, 1630], radius=18, fill=(16, 22, 34, 240), outline=(52, 235, 61, 200), width=2)
        draw.text((90, 1550), "AI VIRAL HOOK PREDICTION", font=get_font(FONT_MONO, 18), fill=(148, 163, 184, 255))
        draw.text((90, 1580), f"{score_val} / 100 EXCELLENT RETENTION", font=get_font(FONT_HEADING, 32), fill=(52, 235, 61, 255))

    # --- SHOT 4: Export to Vault ---
    elif shot_id == 4:
        # Callout Badge 4
        c4_t = min(1.0, max(0.0, (sec - 11.6) / 0.4))
        draw_apple_callout(draw, 50, 1400, "04. NVENC ACCELERATION", "14-Second Local Render", "Over 180x faster than cloud queue encoding", c4_t, width=980)
        
        # Fast Export Progress Bar Animation
        p_pct = min(100, int((sec - 11.5) / 1.4 * 100))
        draw.rounded_rectangle([60, 1530, 1020, 1640], radius=18, fill=(18, 24, 36, 240), outline=(52, 235, 61, 220), width=2)
        draw.text((90, 1548), f"NVIDIA NVENC Transcoding: {p_pct}%", font=get_font(FONT_HEADING, 26), fill=(255, 255, 255, 255))
        # Bar track
        draw.rounded_rectangle([90, 1590, 990, 1612], radius=10, fill=(30, 40, 56, 255))
        bar_fill_w = int(900 * (p_pct / 100.0))
        draw.rounded_rectangle([90, 1590, 90 + bar_fill_w, 1612], radius=10, fill=(52, 235, 61, 255))

    # --- SHOT 5: Apple-Style Finale & CTA ---
    else:
        # Apple-Style Grand Finale
        # Logo
        if logo_img:
            l_sz = 140
            lr = logo_img.resize((l_sz, l_sz), Image.Resampling.LANCZOS)
            bg.paste(lr, (WIDTH//2 - l_sz//2, 1020), lr)
            draw = ImageDraw.Draw(bg)
            
        # Headline
        draw.text((WIDTH//2 - 310, 1190), "CLIP SOVEREIGN.", font=get_font(FONT_HEADING, 58), fill=(255, 255, 255, 255))
        draw.text((WIDTH//2 - 270, 1260), "OWN YOUR DATA.", font=get_font(FONT_HEADING, 58), fill=(52, 235, 61, 255))
        
        # Subtitle
        draw.text((WIDTH//2 - 340, 1345), "Everything runs locally on your machine. Zero cloud queues.", font=get_font(FONT_BODY, 24), fill=(148, 163, 184, 255))
        
        # Pricing Card (Apple Style)
        draw.rounded_rectangle([WIDTH//2 - 320, 1420, WIDTH//2 + 320, 1500], radius=18, fill=(20, 28, 42, 240), outline=(52, 235, 61, 160), width=2)
        draw.text((WIDTH//2 - 250, 1442), "CREATOR PRO - FROM $11 / MO", font=get_font(FONT_HEADING, 30), fill=(255, 255, 255, 255))
        
        # Download CTA Button
        btn_pulse = math.sin(frame_idx * 0.25) * 4
        bw = int(720 + btn_pulse)
        bh = 96
        bx = (WIDTH - bw) // 2
        by = 1530
        draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=26, fill=(52, 235, 61, 255))
        draw.text((bx + 110, by + 24), "DOWNLOAD FOR WINDOWS", font=get_font(FONT_HEADING, 38), fill=(0, 0, 0, 255))
        
        # URL
        draw.text((WIDTH//2 - 140, 1660), "clipvault.app", font=get_font(FONT_HEADING, 42), fill=(255, 255, 255, 240))
        draw.line([(WIDTH//2 - 150, 1715), (WIDTH//2 + 150, 1715)], fill=(52, 235, 61, 220), width=3)

    # Convert to OpenCV BGR and write
    frame_cv = cv2.cvtColor(np.array(bg), cv2.COLOR_RGBA2BGR)
    video_writer.write(frame_cv)
    
    if frame_idx % 60 == 0 or frame_idx == TOTAL_FRAMES - 1:
        print(f"  [FRAME] Rendered frame {frame_idx + 1}/{TOTAL_FRAMES} ({(frame_idx + 1)/TOTAL_FRAMES*100:.1f}%)")

video_writer.release()
if sample_cap:
    sample_cap.release()

print("[DONE] Raw Apple-style motion graphic video frames rendered successfully!")

# -------------------------------------------------------------
# AUDIO SOUND DESIGN WITH REAL SFX (Click, Pop, Chime)
# -------------------------------------------------------------
print("[AUDIO] Synthesizing synchronized sound design with Windows SFX...")
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Extract base music
temp_music_wav = os.path.join(SCRATCH_DIR, "apple_temp_music.wav")
subprocess.run([
    ffmpeg, "-y", "-ss", "0", "-t", str(DURATION_SEC), "-i", MUSIC_SOURCE,
    "-ar", "44100", "-ac", "2", temp_music_wav
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

with wave.open(temp_music_wav, "rb") as wf:
    sample_rate = wf.getframerate()
    n_channels = wf.getnchannels()
    n_frames = wf.getnframes()
    raw_data = wf.readframes(n_frames)

audio_data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)
audio_data = audio_data.reshape(-1, n_channels)
# Slightly soften music so SFX cut through crisply
audio_data *= 0.75

# Load Windows SFX if available
def mix_wav_sfx(audio, wav_path, start_sec, volume=1.0):
    if not os.path.exists(wav_path):
        return
    try:
        # Convert SFX to 44100Hz 2ch
        temp_sfx = os.path.join(SCRATCH_DIR, "temp_sfx.wav")
        subprocess.run([
            ffmpeg, "-y", "-i", wav_path, "-ar", "44100", "-ac", "2", temp_sfx
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        
        with wave.open(temp_sfx, "rb") as wf:
            s_frames = wf.getnframes()
            s_raw = wf.readframes(s_frames)
        s_data = np.frombuffer(s_raw, dtype=np.int16).astype(np.float32).reshape(-1, 2)
        
        start_sample = int(start_sec * sample_rate)
        end_sample = min(len(audio), start_sample + len(s_data))
        count = end_sample - start_sample
        audio[start_sample:end_sample] += s_data[:count] * volume
    except Exception as e:
        print("[SFX] Could not mix", wav_path, e)

# Mix SFX at exact interaction moments:
# 1. Click at t=1.8s (URL paste)
mix_wav_sfx(audio_data, r"C:\Windows\Media\Windows Navigation Start.wav", start_sec=1.8, volume=2.2)
# 2. Camera zoom pop at t=3.5s
mix_wav_sfx(audio_data, r"C:\Windows\Media\Windows Balloon.wav", start_sec=3.5, volume=1.8)
# 3. Mode switch at t=7.5s
mix_wav_sfx(audio_data, r"C:\Windows\Media\Windows Navigation Start.wav", start_sec=7.5, volume=2.0)
# 4. Success Chime at t=12.8s (Export Complete!)
mix_wav_sfx(audio_data, r"C:\Windows\Media\ding.wav", start_sec=12.8, volume=2.5)
mix_wav_sfx(audio_data, r"C:\Windows\Media\chimes.wav", start_sec=13.5, volume=1.8)

# Smooth fade out at end
fade_samples = int(0.8 * sample_rate)
fade_env = np.linspace(1.0, 0.0, fade_samples)[:, np.newaxis]
audio_data[-fade_samples:] *= fade_env

audio_data = np.clip(audio_data, -32767, 32767).astype(np.int16)

with wave.open(OUTPUT_AUDIO, "wb") as wf:
    wf.setnchannels(n_channels)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    wf.writeframes(audio_data.tobytes())

print("[AUDIO] Sound design and music track mixed successfully!")

# -------------------------------------------------------------
# FINAL ENCODING (H.264 + AAC)
# -------------------------------------------------------------
print("[FFMPEG] Encoding final Apple-style promotional video...")
subprocess.run([
    ffmpeg, "-y",
    "-i", OUTPUT_RAW_VIDEO,
    "-i", OUTPUT_AUDIO,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_FINAL_VIDEO
], check=True)

# Also copy to Web public directory and override promo names
if os.path.exists(WEB_PUBLIC_DIR):
    import shutil
    shutil.copy2(OUTPUT_FINAL_VIDEO, os.path.join(WEB_PUBLIC_DIR, "clipvault_apple_motion_promo.mp4"))
    shutil.copy2(OUTPUT_FINAL_VIDEO, os.path.join(WEB_PUBLIC_DIR, "clipvault_motion_graphics_promo.mp4"))
    shutil.copy2(OUTPUT_FINAL_VIDEO, os.path.join(WEB_PUBLIC_DIR, "clipvault_stopmotion_promo.mp4"))
    # Also in clips/
    shutil.copy2(OUTPUT_FINAL_VIDEO, os.path.join(CLIPS_DIR, "clipvault_motion_graphics_promo.mp4"))
    shutil.copy2(OUTPUT_FINAL_VIDEO, os.path.join(CLIPS_DIR, "clipvault_stopmotion_promo.mp4"))

print(f"[SUCCESS] Apple-style commercial rendered successfully to:\n  -> {OUTPUT_FINAL_VIDEO}")
