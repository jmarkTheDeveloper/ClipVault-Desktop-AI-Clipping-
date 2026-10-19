import os
import math
import random
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

OUTPUT_RAW_VIDEO = os.path.join(SCRATCH_DIR, "apple_promo_90s_raw.mp4")
OUTPUT_AUDIO = os.path.join(SCRATCH_DIR, "apple_promo_90s_audio.wav")
OUTPUT_FINAL_VIDEO = os.path.join(CLIPS_DIR, "clipvault_apple_motion_promo.mp4")

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION_SEC = 90.0
TOTAL_FRAMES = int(FPS * DURATION_SEC)  # 2700 frames

# Fonts - Clean, modern Segoe UI (Apple/Microsoft modern tech style)
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REGULAR = "C:/Windows/Fonts/segoeui.ttf"
FONT_IMPACT = "C:/Windows/Fonts/arialbd.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

# Colors (Apple / Obsidian Studio Palette)
C_BG_DARK = (10, 13, 22)
C_CYAN = (56, 189, 248)
C_GREEN = (52, 235, 61)
C_PURPLE = (168, 85, 247)
C_YELLOW = (250, 204, 21)
C_WHITE = (255, 255, 255)
C_MUTED = (148, 163, 184)
C_RED = (239, 68, 68)

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

# Video Capture for phone screen
sample_frames_cache = []
if os.path.exists(SAMPLE_CLIP_PATH):
    cap = cv2.VideoCapture(SAMPLE_CLIP_PATH)
    total_src_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cache_limit = min(600, total_src_frames if total_src_frames > 0 else 600)
    for _ in range(cache_limit):
        ret, frame = cap.read()
        if not ret:
            break
        h, w = frame.shape[:2]
        crop_w = int(h * (9 / 16))
        start_x = max(0, (w - crop_w) // 2)
        cropped = frame[:, start_x:start_x + crop_w]
        resized = cv2.resize(cropped, (284, 410))
        sample_frames_cache.append(resized)
    cap.release()
    print(f"[INIT] Pre-cached {len(sample_frames_cache)} video frames for phone mockup.")

# Base UI screenshot
base_ui_img = None
if os.path.exists(UI_SCREENSHOT_PATH):
    raw_ui = Image.open(UI_SCREENSHOT_PATH).convert("RGBA")
    base_ui_img = raw_ui.crop((0, 0, 1024, 595))
    print("[INIT] Loaded base ClipVault UI screenshot:", base_ui_img.size)

PHONE_V_X = 574
PHONE_V_Y = 136

# Create luxury studio background with smooth Gaussian blur
def create_luxury_studio_bg(accent="cyan"):
    bg = np.zeros((HEIGHT, WIDTH, 3), dtype=np.float32)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        bg[y, :] = [10 + 6 * ratio, 12 + 8 * ratio, 20 + 12 * ratio]
    
    # Soft upper spotlight
    cx, cy = WIDTH // 2, int(HEIGHT * 0.35)
    y_coords, x_coords = np.ogrid[:HEIGHT, :WIDTH]
    dist_sq = (x_coords - cx) ** 2 + ((y_coords - cy) * 0.7) ** 2
    spotlight1 = np.exp(-dist_sq / (2 * (320 ** 2)))
    
    if accent == "red":
        bg[:, :, 0] += spotlight1 * 15
        bg[:, :, 1] += spotlight1 * 15
        bg[:, :, 2] += spotlight1 * 45
    else:
        bg[:, :, 0] += spotlight1 * 42  # Blue
        bg[:, :, 1] += spotlight1 * 32  # Green
        bg[:, :, 2] += spotlight1 * 18  # Red
        
        # Soft lower-right accent (violet)
        cx2, cy2 = int(WIDTH * 0.75), int(HEIGHT * 0.70)
        dist_sq2 = (x_coords - cx2) ** 2 + (y_coords - cy2) ** 2
        spotlight2 = np.exp(-dist_sq2 / (2 * (280 ** 2)))
        bg[:, :, 0] += spotlight2 * 35
        bg[:, :, 1] += spotlight2 * 12
        bg[:, :, 2] += spotlight2 * 30
    
    bg = np.clip(bg, 0, 255).astype(np.uint8)
    bg = cv2.GaussianBlur(bg, (101, 101), 0)
    return Image.fromarray(bg).convert("RGBA")

print("[INIT] Pre-generating luxury backgrounds...")
studio_bg_cyan = create_luxury_studio_bg("cyan")
studio_bg_red = create_luxury_studio_bg("red")

# Text centering helper with drop shadow
def draw_centered_text(draw, text, y, font, fill, shadow_fill=(0, 0, 0, 220), dy_shadow=2):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = (WIDTH - tw) // 2
    draw.text((tx + dy_shadow, y + dy_shadow), text, font=font, fill=shadow_fill)
    draw.text((tx, y), text, font=font, fill=fill)

# Vector Icons to replace broken emoji boxes
def draw_vector_check(draw, x, y, color=(52, 235, 61, 255)):
    draw.ellipse([x - 14, y - 14, x + 14, y + 14], fill=(16, 185, 129, 40), outline=color, width=1)
    draw.line([x - 6, y, x - 2, y + 5], fill=color, width=2)
    draw.line([x - 2, y + 5, x + 7, y - 5], fill=color, width=2)

def draw_vector_cross(draw, x, y, color=(239, 68, 68, 255)):
    draw.ellipse([x - 14, y - 14, x + 14, y + 14], fill=(239, 68, 68, 40), outline=color, width=1)
    draw.line([x - 5, y - 5, x + 5, y + 5], fill=color, width=2)
    draw.line([x - 5, y + 5, x + 5, y - 5], fill=color, width=2)

# Helper to draw Apple-style mouse cursor
def draw_cursor(draw, x, y, is_clicking=False, click_progress=0.0):
    pts = [
        (x, y),
        (x, y + 26),
        (x + 7, y + 20),
        (x + 15, y + 27),
        (x + 19, y + 23),
        (x + 11, y + 16),
        (x + 19, y + 16),
    ]
    draw.polygon(pts, fill=(255, 255, 255, 250), outline=(15, 23, 42, 255))
    
    if is_clicking and click_progress > 0:
        cr = int(35 * click_progress)
        ca = int(220 * (1.0 - click_progress))
        if ca > 0:
            draw.ellipse([x - cr, y - cr, x + cr, y + cr], outline=(56, 189, 248, ca), width=3)

# Helper to draw frosted glass badge
def draw_glass_badge(draw, bbox, title, subtitle="", pill_text="", pill_color=C_CYAN):
    x1, y1, x2, y2 = bbox
    # Glass backdrop with luminous top accent line
    draw.rounded_rectangle([x1, y1, x2, y2], radius=22, fill=(18, 24, 38, 235), outline=(255, 255, 255, 38), width=1)
    draw.line([x1 + 25, y1 + 1, x2 - 25, y1 + 1], fill=(pill_color[0], pill_color[1], pill_color[2], 180), width=2)
    
    font_badge_title = get_font(FONT_BOLD, 30)
    font_badge_sub = get_font(FONT_REGULAR, 22)
    font_pill = get_font(FONT_BOLD, 18)
    
    curr_y = y1 + 18
    if pill_text:
        pill_w = int(draw.textlength(pill_text, font=font_pill)) + 26
        draw.rounded_rectangle([x1 + 24, curr_y, x1 + 24 + pill_w, curr_y + 32], radius=16, fill=(pill_color[0], pill_color[1], pill_color[2], 40), outline=(pill_color[0], pill_color[1], pill_color[2], 180), width=1)
        draw.text((x1 + 37, curr_y + 5), pill_text, font=font_pill, fill=pill_color)
        curr_y += 44
    
    draw.text((x1 + 24, curr_y), title, font=font_badge_title, fill=(255, 255, 255, 255))
    if subtitle:
        draw.text((x1 + 24, curr_y + 42), subtitle, font=font_badge_sub, fill=(148, 163, 184, 255))

# Helper to draw a glowing macOS window frame
def draw_macos_window(ui_content, scale=1.0):
    orig_w, orig_h = ui_content.size
    bar_h = 38
    tot_h = orig_h + bar_h
    win = Image.new("RGBA", (orig_w, tot_h), (0, 0, 0, 0))
    win_draw = ImageDraw.Draw(win)
    
    win_draw.rounded_rectangle([0, 0, orig_w, tot_h], radius=18, fill=(16, 20, 30, 255), outline=(255, 255, 255, 30), width=1)
    win_draw.rounded_rectangle([0, 0, orig_w, bar_h], radius=18, fill=(24, 30, 44, 255))
    win_draw.rectangle([0, bar_h - 10, orig_w, bar_h], fill=(24, 30, 44, 255))
    win_draw.line([0, bar_h, orig_w, bar_h], fill=(255, 255, 255, 20), width=1)
    
    # Traffic lights
    win_draw.ellipse([16, 12, 28, 24], fill=(255, 95, 87, 255))
    win_draw.ellipse([34, 12, 46, 24], fill=(254, 188, 46, 255))
    win_draw.ellipse([52, 12, 64, 24], fill=(40, 200, 64, 255))
    
    font_bar = get_font(FONT_BOLD, 15)
    win_draw.text((orig_w // 2 - 90, 10), "ClipVault Studio Pro v2.4", font=font_bar, fill=(148, 163, 184, 255))
    
    win.paste(ui_content, (0, bar_h), ui_content)
    
    if scale != 1.0:
        target_w = int(orig_w * scale)
        target_h = int(tot_h * scale)
        win = win.resize((target_w, target_h), Image.Resampling.BILINEAR)
        
    return win

print(f"[INIT] Apple-Style 90-Second Promo Video Engine Initialized ({WIDTH}x{HEIGHT} @ {FPS}fps, {TOTAL_FRAMES} frames)...")

# Open Video Writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
video_writer = cv2.VideoWriter(OUTPUT_RAW_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

audio_cues = [
    (int(8.5 * FPS), "whoosh"),
    (int(11.0 * FPS), "speech_on"),
    (int(28.0 * FPS), "click"),
    (int(34.0 * FPS), "success_chime"),
    (int(38.0 * FPS), "proximity"),
    (int(49.0 * FPS), "lock"),
    (int(63.0 * FPS), "click"),
    (int(76.0 * FPS), "whoosh"),
    (int(82.0 * FPS), "chimes"),
    (int(85.0 * FPS), "tada")
]

print("[RENDER] Starting multi-scene rendering loop...")

for f in range(TOTAL_FRAMES):
    sec = f / FPS
    
    # Select background
    frame_img = studio_bg_red.copy() if f < 330 else studio_bg_cyan.copy()
    draw = ImageDraw.Draw(frame_img)
    
    # Current video frame for phone screen
    video_idx = f % len(sample_frames_cache) if sample_frames_cache else 0
    current_clip_frame = sample_frames_cache[video_idx] if sample_frames_cache else None
    
    active_ui = base_ui_img.copy()
    if current_clip_frame is not None:
        cv_rgb = cv2.cvtColor(current_clip_frame, cv2.COLOR_BGR2RGB)
        phone_pil = Image.fromarray(cv_rgb)
        active_ui.paste(phone_pil, (PHONE_V_X, PHONE_V_Y))
        
    # =========================================================================
    # SCENE 1: THE PROBLEM / CREATOR DILEMMA (0.0s - 11.0s / Frames 0 - 330)
    # =========================================================================
    if f < 330:
        prog = f / 330.0
        
        font_h1 = get_font(FONT_BOLD, 46)
        font_sub = get_font(FONT_REGULAR, 26)
        
        h1_y = int(200 + (1.0 - ease_out_cubic(min(1.0, f / 45.0))) * 40)
        draw_centered_text(draw, "SPENDING 4+ HOURS", h1_y, font_h1, C_WHITE)
        draw_centered_text(draw, "EDITING SHORT CLIPS?", h1_y + 60, font_h1, C_RED)
        
        cards = [
            ("Scrubbing 2-hour podcasts for hooks", 50),
            ("Manual keyframing & cropping to 9:16", 110),
            ("Typing subtitles word-by-word", 170),
            ("Overpriced monthly cloud subscriptions", 230)
        ]
        
        cy = 480
        for text, trigger_frame in cards:
            if f >= trigger_frame:
                c_prog = min(1.0, (f - trigger_frame) / 25.0)
                e_c = ease_out_back(c_prog)
                card_w = 920
                card_h = 80
                card_x = (WIDTH - card_w) // 2
                cur_cy = cy + int((1.0 - e_c) * 30)
                
                draw.rounded_rectangle([card_x, cur_cy, card_x + card_w, cur_cy + card_h], radius=18, fill=(20, 24, 36, 235), outline=(239, 68, 68, 90), width=1)
                draw_vector_cross(draw, card_x + 45, cur_cy + 40)
                draw.text((card_x + 75, cur_cy + 24), text, font=get_font(FONT_BOLD, 25), fill=(254, 202, 202, 255))
            cy += 110
            
        if f >= 265:
            q_prog = min(1.0, (f - 265) / 30.0)
            e_q = ease_out_back(q_prog)
            box_w = 940
            box_h = 135
            bx = (WIDTH - box_w) // 2
            by = 1000 + int((1.0 - e_q) * 40)
            
            draw.rounded_rectangle([bx, by, bx + box_w, by + box_h], radius=24, fill=(16, 32, 54, 245), outline=(56, 189, 248, 220), width=2)
            draw.line([bx + 30, by + 1, bx + box_w - 30, by + 1], fill=(56, 189, 248, 255), width=2)
            draw_centered_text(draw, "WHAT IF AI DID IT IN 60 SECONDS?", by + 26, get_font(FONT_BOLD, 36), C_CYAN)
            draw_centered_text(draw, "100% LOCALLY ON YOUR COMPUTER", by + 80, get_font(FONT_REGULAR, 24), C_MUTED)
            
    # =========================================================================
    # SCENE 2: HERO INTRO - CLIPVAULT STUDIO PRO (11.0s - 23.0s / Frames 330 - 690)
    # =========================================================================
    elif f < 690:
        prog = (f - 330) / 360.0
        e_prog = ease_out_cubic(min(1.0, prog * 1.5))
        
        font_hero = get_font(FONT_BOLD, 46)
        font_sub = get_font(FONT_REGULAR, 26)
        
        draw_centered_text(draw, "MEET CLIPVAULT", 160, font_hero, C_WHITE)
        draw_centered_text(draw, "STUDIO PRO", 220, font_hero, C_CYAN)
        draw_centered_text(draw, "The All-In-One AI Short-Form Engine", 290, font_sub, C_MUTED)
        
        scale = 0.82 + 0.18 * e_prog
        win_img = draw_macos_window(active_ui, scale=scale)
        win_w, win_h = win_img.size
        wx = (WIDTH - win_w) // 2
        wy = int(390 + (1.0 - e_prog) * 80)
        
        frame_img.paste(win_img, (wx, wy), win_img)
        
        if f >= 450:
            p_prog = min(1.0, (f - 450) / 30.0)
            e_p = ease_out_back(p_prog)
            
            pills = [
                ("[ ZERO LIMITS ]", "UNLIMITED CLOUD-FREE LOCAL PROCESSING", C_CYAN),
                ("[ PRIVACY ]", "100% DATA PRIVACY • RUNS OFFLINE", C_GREEN),
                ("[ HARDWARE ]", "NVIDIA NVENC & APPLE SILICON ACCELERATED", C_PURPLE)
            ]
            
            py = int(1420 + (1.0 - e_p) * 40)
            for i, (p_tag, p_text, p_col) in enumerate(pills):
                pw = 900
                px = (WIDTH - pw) // 2
                draw.rounded_rectangle([px, py + i * 75, px + pw, py + i * 75 + 62], radius=18, fill=(18, 24, 38, 235), outline=(p_col[0], p_col[1], p_col[2], 120), width=1)
                draw.text((px + 30, py + i * 75 + 17), p_tag, font=get_font(FONT_BOLD, 22), fill=p_col)
                draw.text((px + 195, py + i * 75 + 18), p_text, font=get_font(FONT_BOLD, 20), fill=C_WHITE)
                
    # =========================================================================
    # SCENE 3: STEP 01 - MULTI-PLATFORM INGESTION (23.0s - 35.0s / Frames 690 - 1050)
    # =========================================================================
    elif f < 1050:
        prog = (f - 690) / 360.0
        
        scale = 1.65
        win_img = draw_macos_window(active_ui, scale=scale)
        
        wx = int(WIDTH // 2 - 380)
        wy = int(HEIGHT * 0.45 - 280)
        frame_img.paste(win_img, (wx, wy), win_img)
        
        draw_glass_badge(draw, [60, 140, WIDTH - 60, 310], 
                         title="Instant URL & Video Ingestion",
                         subtitle="YouTube, Twitch, Kick & Local 4K MP4",
                         pill_text="STEP 01 / INGESTION",
                         pill_color=C_CYAN)
        
        cursor_prog = min(1.0, prog * 2.2)
        cur_x = int(120 + 320 * ease_in_out_cubic(cursor_prog))
        cur_y = int(wy + 180 + 30 * math.sin(prog * math.pi))
        
        is_click = 0.35 <= prog <= 0.55
        click_t = (prog - 0.35) / 0.20 if is_click else 0.0
        draw_cursor(draw, cur_x, cur_y, is_clicking=is_click, click_progress=click_t)
        
        if prog > 0.40:
            type_prog = min(1.0, (prog - 0.40) / 0.30)
            full_url = "https://youtube.com/watch?v=steve-jobs"
            typed_chars = int(len(full_url) * type_prog)
            
            draw.rounded_rectangle([80, 1140, WIDTH - 80, 1260], radius=18, fill=(15, 23, 42, 245), outline=(56, 189, 248, 160), width=1)
            draw.line([100, 1141, WIDTH - 100, 1141], fill=(56, 189, 248, 220), width=2)
            draw.text((110, 1165), full_url[:typed_chars] + ("|" if (f // 8) % 2 == 0 else ""), font=get_font(FONT_BOLD, 26), fill=C_WHITE)
            draw.text((110, 1210), "Extracting 1080p Video + High-Res Audio...", font=get_font(FONT_REGULAR, 20), fill=C_CYAN)
            
        if prog > 0.65:
            dl_prog = min(1.0, (prog - 0.65) / 0.30)
            bar_w = int(880 * ease_out_cubic(dl_prog))
            draw.rounded_rectangle([100, 1310, 980, 1340], radius=15, fill=(24, 30, 46, 255))
            draw.rounded_rectangle([100, 1310, 100 + bar_w, 1340], radius=15, fill=C_CYAN)
            
            pct_text = f"DOWNLOAD STATUS: {int(dl_prog * 100)}% COMPLETE"
            draw.text((100, 1360), pct_text, font=get_font(FONT_BOLD, 24), fill=C_WHITE)
            
    # =========================================================================
    # SCENE 4: STEP 02 - AI VIRALITY & HOOK DETECTION (35.0s - 48.0s / Frames 1050 - 1440)
    # =========================================================================
    elif f < 1440:
        prog = (f - 1050) / 390.0
        
        draw_glass_badge(draw, [60, 140, WIDTH - 60, 310], 
                         title="AI Virality & Hook Engine",
                         subtitle="Whisper AI + Semantic Energy Spikes",
                         pill_text="STEP 02 / AI ANALYSIS",
                         pill_color=C_GREEN)
        
        # Audio Waveform Visualizer Card
        draw.rounded_rectangle([60, 360, WIDTH - 60, 680], radius=22, fill=(18, 24, 38, 235), outline=(255, 255, 255, 35), width=1)
        draw.line([85, 361, WIDTH - 85, 361], fill=(52, 235, 61, 200), width=2)
        draw.text((100, 390), "SPEECH TIMELINE & ENERGY FREQUENCY", font=get_font(FONT_BOLD, 24), fill=C_MUTED)
        
        wave_start_x = 100
        wave_y = 540
        num_bars = 48
        scan_x = wave_start_x + int(880 * ((f * 1.5) % 390) / 390.0)
        
        for b in range(num_bars):
            bx = wave_start_x + b * 18
            base_h = math.sin(b * 0.4 + f * 0.15) * 45 + math.cos(b * 0.8) * 35 + 50
            h_bar = max(10, int(base_h))
            bar_color = C_GREEN if bx < scan_x else (56, 189, 248, 120)
            draw.line([bx, wave_y - h_bar, bx, wave_y + h_bar], fill=bar_color, width=8)
            
        draw.line([scan_x, 430, scan_x, 650], fill=(255, 255, 255, 240), width=3)
        draw.ellipse([scan_x - 6, 430, scan_x + 6, 442], fill=C_GREEN)
        
        metrics = [
            ("VIRAL HOOK DETECTED", "00:14.2 - High Emotional Peak", C_YELLOW, 1120),
            ("VIRALITY SCORE: 98.4 / 100", "Top 1% Social Reach Potential", C_GREEN, 1200),
            ("RETENTION BOOST: +420%", "AI Hook Guaranteed To Stop The Scroll", C_CYAN, 1280)
        ]
        
        my = 730
        for m_title, m_sub, m_col, trig in metrics:
            if f >= trig:
                m_prog = min(1.0, (f - trig) / 25.0)
                e_m = ease_out_back(m_prog)
                
                mw = 960
                mh = 100
                mx = (WIDTH - mw) // 2
                cur_my = my + int((1.0 - e_m) * 30)
                
                draw.rounded_rectangle([mx, cur_my, mx + mw, cur_my + mh], radius=18, fill=(18, 24, 38, 240), outline=(m_col[0], m_col[1], m_col[2], 140), width=1)
                draw_vector_check(draw, mx + 45, cur_my + 50, color=m_col)
                draw.text((mx + 75, cur_my + 20), m_title, font=get_font(FONT_BOLD, 26), fill=m_col)
                draw.text((mx + 75, cur_my + 58), m_sub, font=get_font(FONT_REGULAR, 20), fill=C_MUTED)
            my += 135
            
    # =========================================================================
    # SCENE 5: STEP 03 - 3D FACE TRACKING & SMART 9:16 CROP (48.0s - 62.0s / Frames 1440 - 1860)
    # =========================================================================
    elif f < 1860:
        prog = (f - 1440) / 420.0
        
        draw_glass_badge(draw, [60, 140, WIDTH - 60, 310], 
                         title="Active Speaker 9:16 Crop",
                         subtitle="AI Face Detection & Cinematic Tracking",
                         pill_text="STEP 03 / AUTO REFRAME",
                         pill_color=C_CYAN)
        
        phone_w = 480
        phone_h = 853
        px = (WIDTH - phone_w) // 2
        py = 370
        
        draw.rounded_rectangle([px - 14, py - 14, px + phone_w + 14, py + phone_h + 14], radius=42, fill=(15, 20, 32, 255), outline=(255, 255, 255, 50), width=3)
        
        if current_clip_frame is not None:
            resized_screen = cv2.resize(cv2.cvtColor(current_clip_frame, cv2.COLOR_BGR2RGB), (phone_w, phone_h))
            screen_pil = Image.fromarray(resized_screen)
            frame_img.paste(screen_pil, (px, py))
            
        fx = px + int(phone_w * 0.28 + math.sin(f * 0.08) * 12)
        fy = py + int(phone_h * 0.22 + math.cos(f * 0.05) * 8)
        fw = int(phone_w * 0.44)
        fh = int(phone_h * 0.30)
        
        b_len = 24
        col_track = (52, 235, 61, 240)
        draw.line([fx, fy, fx + b_len, fy], fill=col_track, width=3)
        draw.line([fx, fy, fx, fy + b_len], fill=col_track, width=3)
        draw.line([fx + fw, fy, fx + fw - b_len, fy], fill=col_track, width=3)
        draw.line([fx + fw, fy, fx + fw, fy + b_len], fill=col_track, width=3)
        draw.line([fx, fy + fh, fx + b_len, fy + fh], fill=col_track, width=3)
        draw.line([fx, fy + fh, fx, fy + fh - b_len], fill=col_track, width=3)
        draw.line([fx + fw, fy + fh, fx + fw - b_len, fy + fh], fill=col_track, width=3)
        draw.line([fx + fw, fy + fh, fx + fw, fy + fh - b_len], fill=col_track, width=3)
        
        draw.rounded_rectangle([fx, fy - 36, fx + 260, fy - 6], radius=8, fill=(10, 15, 26, 220), outline=C_GREEN, width=1)
        draw.text((fx + 10, fy - 30), "TARGET LOCKED: 99.8%", font=get_font(FONT_BOLD, 16), fill=C_GREEN)
        
        draw.rounded_rectangle([80, 1280, WIDTH - 80, 1420], radius=20, fill=(18, 24, 38, 235), outline=(56, 189, 248, 120), width=1)
        draw.line([100, 1281, WIDTH - 100, 1281], fill=(56, 189, 248, 200), width=2)
        draw.text((120, 1305), "SMART PAN & SCAN ALGORITHM", font=get_font(FONT_BOLD, 24), fill=C_CYAN)
        draw.text((120, 1345), "Keeps the speaker centered smoothly with zero keyframes.", font=get_font(FONT_REGULAR, 20), fill=C_MUTED)
        
    # =========================================================================
    # SCENE 6: STEP 04 - KINETIC KARAOKE SUBTITLES (62.0s - 75.0s / Frames 1860 - 2250)
    # =========================================================================
    elif f < 2250:
        prog = (f - 1860) / 390.0
        
        draw_glass_badge(draw, [60, 140, WIDTH - 60, 310], 
                         title="Kinetic Karaoke Subtitles",
                         subtitle="Word-by-Word Highlight & Custom Presets",
                         pill_text="STEP 04 / CAPTIONS",
                         pill_color=C_YELLOW)
        
        phone_w = 520
        phone_h = 924
        px = (WIDTH - phone_w) // 2
        py = 370
        
        draw.rounded_rectangle([px - 10, py - 10, px + phone_w + 10, py + phone_h + 10], radius=38, fill=(15, 20, 32, 255), outline=(255, 255, 255, 45), width=2)
        if current_clip_frame is not None:
            resized_screen = cv2.resize(cv2.cvtColor(current_clip_frame, cv2.COLOR_BGR2RGB), (phone_w, phone_h))
            screen_pil = Image.fromarray(resized_screen)
            frame_img.paste(screen_pil, (px, py))
            
        sub_words = ["YOU", "CAN", "MOLD", "IT", "YOURSELF"]
        highlight_idx = int((f * 0.15) % len(sub_words))
        
        sub_box_y = py + int(phone_h * 0.72)
        font_sub_karaoke = get_font(FONT_IMPACT, 38)
        
        total_w = sum(draw.textlength(w, font=font_sub_karaoke) + 14 for w in sub_words)
        cur_w_x = px + (phone_w - total_w) // 2
        
        for idx, w in enumerate(sub_words):
            w_len = draw.textlength(w, font=font_sub_karaoke)
            if idx == highlight_idx:
                bounce = int(math.sin(f * 0.4) * 6)
                draw.text((cur_w_x + 3, sub_box_y - bounce + 3), w, font=font_sub_karaoke, fill=(0, 0, 0, 255))
                draw.text((cur_w_x, sub_box_y - bounce), w, font=font_sub_karaoke, fill=C_YELLOW)
            else:
                draw.text((cur_w_x + 2, sub_box_y + 2), w, font=font_sub_karaoke, fill=(0, 0, 0, 200))
                draw.text((cur_w_x, sub_box_y), w, font=font_sub_karaoke, fill=C_WHITE)
            cur_w_x += w_len + 14
            
        draw.rounded_rectangle([80, 1340, WIDTH - 80, 1480], radius=20, fill=(18, 24, 38, 235), outline=(255, 255, 255, 30), width=1)
        draw.text((110, 1365), "STYLE PRESETS:", font=get_font(FONT_BOLD, 22), fill=C_MUTED)
        
        presets = [("HORMOZI", True), ("MRBEAST", False), ("DEVIN", False), ("MINIMAL", False)]
        pr_x = 110
        for pr_name, is_act in presets:
            pr_w = 170
            pr_col = C_YELLOW if is_act else C_MUTED
            pr_fill = (250, 204, 21, 35) if is_act else (24, 30, 44, 200)
            draw.rounded_rectangle([pr_x, 1405, pr_x + pr_w, 1450], radius=14, fill=pr_fill, outline=pr_col, width=1)
            draw.text((pr_x + 26, 1416), pr_name, font=get_font(FONT_BOLD, 20), fill=pr_col)
            pr_x += pr_w + 20
            
    # =========================================================================
    # SCENE 7: STEP 05 - HARDWARE ACCELERATED EXPORT (75.0s - 83.0s / Frames 2250 - 2490)
    # =========================================================================
    elif f < 2490:
        prog = (f - 2250) / 240.0
        
        draw_glass_badge(draw, [60, 140, WIDTH - 60, 310], 
                         title="Lightning GPU Export",
                         subtitle="NVIDIA NVENC & Apple Silicon Hardware Acceleration",
                         pill_text="STEP 05 / 180 FPS RENDER",
                         pill_color=C_GREEN)
        
        exp_prog = min(1.0, prog * 1.6)
        e_exp = ease_out_cubic(exp_prog)
        
        draw.rounded_rectangle([80, 360, WIDTH - 80, 520], radius=22, fill=(18, 24, 38, 235), outline=(52, 235, 61, 140), width=1)
        draw.line([100, 361, WIDTH - 100, 361], fill=(52, 235, 61, 200), width=2)
        draw.text((120, 395), "BATCH RENDERING 10 VIRAL CLIPS...", font=get_font(FONT_BOLD, 26), fill=C_WHITE)
        
        draw.rounded_rectangle([120, 445, WIDTH - 120, 475], radius=15, fill=(24, 32, 48, 255))
        draw.rounded_rectangle([120, 445, 120 + int((WIDTH - 240) * e_exp), 475], radius=15, fill=C_GREEN)
        
        draw.text((WIDTH - 240, 400), f"{int(e_exp * 100)}%", font=get_font(FONT_BOLD, 24), fill=C_GREEN)
        
        clips_data = [
            ("Clip 01: Steve Jobs Secrets", "Score: 98.4", C_GREEN),
            ("Clip 02: Building The Future", "Score: 96.1", C_GREEN),
            ("Clip 03: Don't Live Someone Else's Life", "Score: 94.8", C_CYAN),
            ("Clip 04: The Secret of Life", "Score: 92.5", C_CYAN),
        ]
        
        card_y = 560
        for i, (c_title, c_score, c_col) in enumerate(clips_data):
            c_delay = 2270 + i * 25
            if f >= c_delay:
                card_prog = min(1.0, (f - c_delay) / 20.0)
                e_card = ease_out_back(card_prog)
                
                cw = 920
                ch = 95
                cx = (WIDTH - cw) // 2
                cy = card_y + int((1.0 - e_card) * 35)
                
                draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=18, fill=(18, 24, 38, 240), outline=(255, 255, 255, 30), width=1)
                draw.text((cx + 35, cy + 20), c_title, font=get_font(FONT_BOLD, 24), fill=C_WHITE)
                draw.text((cx + 35, cy + 55), "1080x1920 • 9:16 Vertical • 60 FPS • Ready to Post", font=get_font(FONT_REGULAR, 18), fill=C_MUTED)
                
                draw.rounded_rectangle([cx + cw - 180, cy + 25, cx + cw - 30, cy + 70], radius=12, fill=(c_col[0], c_col[1], c_col[2], 40), outline=c_col, width=1)
                draw.text((cx + cw - 165, cy + 36), c_score, font=get_font(FONT_BOLD, 18), fill=c_col)
            card_y += 125
            
    # =========================================================================
    # SCENE 8: FINALE & IRRESISTIBLE CALL TO ACTION (83.0s - 90.0s / Frames 2490 - 2700)
    # =========================================================================
    else:
        font_h1 = get_font(FONT_BOLD, 44)
        font_sub = get_font(FONT_REGULAR, 24)
        
        draw_centered_text(draw, "SCALE YOUR REACH", 160, font_h1, C_WHITE)
        draw_centered_text(draw, "ON EVERY SOCIAL PLATFORM", 225, font_h1, C_CYAN)
        draw_centered_text(draw, "TikTok  •  YouTube Shorts  •  Instagram Reels", 295, font_sub, C_MUTED)
        
        card_w, card_h = 940, 560
        cx = (WIDTH - card_w) // 2
        cy = 380
        
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=24, fill=(18, 24, 38, 235), outline=(255, 255, 255, 35), width=1)
        draw.line([cx + 30, cy + 1, cx + card_w - 30, cy + 1], fill=(56, 189, 248, 200), width=2)
        
        font_plan = get_font(FONT_BOLD, 26)
        font_price = get_font(FONT_BOLD, 46)
        font_feat = get_font(FONT_BOLD, 21)
        
        # Pro
        draw.text((cx + 50, cy + 35), "PRO PLAN", font=font_plan, fill=C_CYAN)
        draw.text((cx + 50, cy + 75), "$11 / month", font=font_price, fill=C_WHITE)
        draw.text((cx + 50, cy + 135), "or $89 / year ($7.40/mo)", font=font_sub, fill=C_MUTED)
        
        # Max
        draw.text((cx + 520, cy + 35), "MAX PLAN", font=font_plan, fill=C_GREEN)
        draw.text((cx + 520, cy + 75), "$15 / month", font=font_price, fill=C_WHITE)
        draw.text((cx + 520, cy + 135), "or $119 / year ($9.90/mo)", font=font_sub, fill=C_MUTED)
        
        draw.line([cx + 40, cy + 180, cx + card_w - 40, cy + 180], fill=(255, 255, 255, 25), width=1)
        
        features = [
            "Unlimited 100% Local Video & Audio Processing",
            "Zero Cloud Tokens & Zero Hidden API Fees",
            "Whisper AI Word-Level Sync + Dynamic Subtitles",
            "Full Commercial Monetization Rights Included",
            "Instant Lifetime Software Updates"
        ]
        
        fy = cy + 220
        for feat in features:
            draw_vector_check(draw, cx + 65, fy + 12)
            draw.text((cx + 95, fy), feat, font=font_feat, fill=(241, 245, 249, 255))
            fy += 52
            
        btn_w, btn_h = 940, 95
        bx = (WIDTH - btn_w) // 2
        by = 1000
        
        draw.rounded_rectangle([bx, by, bx + btn_w, by + btn_h], radius=22, fill=(37, 99, 235, 255), outline=(56, 189, 248, 200), width=2)
        draw.line([bx + 20, by + 2, bx + btn_w - 20, by + 2], fill=(147, 197, 253, 200), width=2)
        
        btn_font = get_font(FONT_BOLD, 30)
        draw_centered_text(draw, "DOWNLOAD CLIPVAULT STUDIO PRO", by + 28, btn_font, C_WHITE, shadow_fill=(0, 0, 0, 160))
        draw_centered_text(draw, "clipvault.com", 1130, font_plan, C_CYAN)
        
        if f >= 2640:
            fade_alpha = int(255 * ((f - 2640) / 60.0))
            fade_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (10, 13, 22, fade_alpha))
            frame_img = Image.alpha_composite(frame_img, fade_overlay)
            
    # Write frame to video
    frame_bgr = cv2.cvtColor(np.array(frame_img), cv2.COLOR_RGBA2BGR)
    video_writer.write(frame_bgr)
    
    if f % 300 == 0:
        print(f"[PROGRESS] Rendered {f}/{TOTAL_FRAMES} frames ({f/TOTAL_FRAMES*100:.1f}%) - {sec:.1f}s / {DURATION_SEC:.1f}s")

video_writer.release()
print("[RENDER] Video rendering completed successfully!")

# Audio Mixing Pipeline
print("[AUDIO] Generating synchronized 90-second audio mix...")
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

TEMP_MUSIC_WAV = os.path.join(SCRATCH_DIR, "music_90s_base.wav")
cmd_music = [
    ffmpeg_exe, "-y",
    "-i", MUSIC_SOURCE,
    "-t", "90.0",
    "-ar", "44100",
    "-ac", "2",
    TEMP_MUSIC_WAV
]
subprocess.run(cmd_music, check=True)

with wave.open(TEMP_MUSIC_WAV, 'rb') as wf:
    nchannels, sampwidth, framerate, nframes, comptype, compname = wf.getparams()
    raw_music = wf.readframes(nframes)
    music_samples = np.frombuffer(raw_music, dtype=np.int16).copy()

total_audio_samples = int(DURATION_SEC * framerate * 2)
if len(music_samples) < total_audio_samples:
    music_samples = np.pad(music_samples, (0, total_audio_samples - len(music_samples)))
else:
    music_samples = music_samples[:total_audio_samples]

music_samples = (music_samples * 0.70).astype(np.int16)

sfx_files = {
    "whoosh": r"C:\Windows\Media\Windows Balloon.wav",
    "speech_on": r"C:\Windows\Media\Speech On.wav",
    "click": r"C:\Windows\Media\Windows Navigation Start.wav",
    "success_chime": r"C:\Windows\Media\Windows Information Bar.wav",
    "proximity": r"C:\Windows\Media\Windows Proximity Connection.wav",
    "lock": r"C:\Windows\Media\Windows Feed Discovered.wav",
    "chimes": r"C:\Windows\Media\chimes.wav",
    "tada": r"C:\Windows\Media\tada.wav"
}

def load_sfx_samples(filepath):
    if not os.path.exists(filepath):
        return None
    try:
        with wave.open(filepath, 'rb') as wf:
            ch, sw, fr, nf, _, _ = wf.getparams()
            raw = wf.readframes(nf)
            data = np.frombuffer(raw, dtype=np.int16)
            if ch == 1:
                data = np.repeat(data, 2)
            return data
    except Exception as e:
        print(f"[WARN] Failed to load SFX {filepath}: {e}")
        return None

sfx_loaded = {k: load_sfx_samples(v) for k, v in sfx_files.items()}

for cue_frame, sfx_key in audio_cues:
    samples = sfx_loaded.get(sfx_key)
    if samples is not None and len(samples) > 0:
        start_samp = int((cue_frame / FPS) * framerate * 2)
        end_samp = start_samp + len(samples)
        if start_samp < len(music_samples):
            actual_end = min(end_samp, len(music_samples))
            sfx_len = actual_end - start_samp
            mixed = music_samples[start_samp:actual_end].astype(np.int32) + (samples[:sfx_len].astype(np.int32) * 1.2).astype(np.int32)
            mixed = np.clip(mixed, -32768, 32767).astype(np.int16)
            music_samples[start_samp:actual_end] = mixed

with wave.open(OUTPUT_AUDIO, 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(44100)
    wf.writeframes(music_samples.tobytes())

print("[AUDIO] Audio track synthesized and mixed successfully!")

print("[ENCODE] Muxing video and audio into production MP4...")
cmd_mux = [
    ffmpeg_exe, "-y",
    "-i", OUTPUT_RAW_VIDEO,
    "-i", OUTPUT_AUDIO,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "19",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_FINAL_VIDEO
]
subprocess.run(cmd_mux, check=True)

print(f"[COMPLETE] Final Apple-Style 90-Second Promo Video saved to: {OUTPUT_FINAL_VIDEO}")

for dest_dir in [WEB_PUBLIC_DIR, CLIPS_DIR]:
    if os.path.exists(dest_dir):
        for alias in ["clipvault_apple_motion_promo.mp4", "clipvault_motion_graphics_promo.mp4", "clipvault_stopmotion_promo.mp4"]:
            target = os.path.join(dest_dir, alias)
            if target != OUTPUT_FINAL_VIDEO:
                import shutil
                shutil.copy2(OUTPUT_FINAL_VIDEO, target)
                print(f"[SYNC] Copied to {target}")

print("[PREVIEWS] Generating preview screenshots for visual inspection...")
cap = cv2.VideoCapture(OUTPUT_FINAL_VIDEO)
preview_frames = [
    (int(5.0 * FPS), "apple_scene_90s_1.jpg"),
    (int(16.0 * FPS), "apple_scene_90s_2.jpg"),
    (int(29.0 * FPS), "apple_scene_90s_3.jpg"),
    (int(42.0 * FPS), "apple_scene_90s_4.jpg"),
    (int(55.0 * FPS), "apple_scene_90s_5.jpg"),
    (int(68.0 * FPS), "apple_scene_90s_6.jpg"),
    (int(79.0 * FPS), "apple_scene_90s_7.jpg"),
    (int(87.0 * FPS), "apple_scene_90s_8.jpg")
]

for frame_idx, filename in preview_frames:
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    if ret:
        out_path = os.path.join(ROOT_DIR, filename)
        cv2.imwrite(out_path, frame)
        art_path = os.path.join(r"C:\Users\Dell User\.gemini\antigravity\brain\90ffe8a2-9ff4-43ac-9067-907a538fd867", filename)
        cv2.imwrite(art_path, frame)
        print(f"[PREVIEW] Saved {filename}")

cap.release()
print("[ALL DONE] 90-Second Luxury Motion Graphics Promo is ready!")
