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

OUTPUT_RAW_VIDEO = os.path.join(SCRATCH_DIR, "motion_graphics_raw.mp4")
OUTPUT_AUDIO = os.path.join(SCRATCH_DIR, "motion_graphics_audio.wav")
OUTPUT_FINAL_VIDEO = os.path.join(CLIPS_DIR, "clipvault_motion_graphics_promo.mp4")

WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION_SEC = 16.0
TOTAL_FRAMES = int(FPS * DURATION_SEC)  # 480 frames

# Fonts
FONT_HEADING = "C:/Windows/Fonts/bahnschrift.ttf"
FONT_BODY = "C:/Windows/Fonts/segoeuib.ttf"
FONT_MONO = "C:/Windows/Fonts/bahnschrift.ttf"

def get_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

# Colors
C_BG = (6, 8, 14)
C_GREEN = (52, 235, 61)
C_CYAN = (45, 212, 255)
C_RED = (255, 65, 84)
C_WHITE = (255, 255, 255)
C_GRAY = (148, 163, 184)
C_DARK_CARD = (15, 20, 30)

# Easing utilities
def ease_out_cubic(t):
    t = max(0.0, min(1.0, t))
    return 1.0 - (1.0 - t) ** 3

def ease_out_back(t, s=1.70158):
    t = max(0.0, min(1.0, t))
    t -= 1.0
    return t * t * ((s + 1.0) * t + s) + 1.0

def ease_in_out_cubic(t):
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        return 1.0 - (-2.0 * t + 2.0) ** 3 / 2.0

# Preload assets
logo_img = None
if os.path.exists(LOGO_PATH):
    logo_img = Image.open(LOGO_PATH).convert("RGBA")

# Open sample clip for scene 3
sample_cap = None
if os.path.exists(SAMPLE_CLIP_PATH):
    sample_cap = cv2.VideoCapture(SAMPLE_CLIP_PATH)

print(f"[INIT] Initializing Motion Graphics Engine: {WIDTH}x{HEIGHT} @ {FPS}fps, {TOTAL_FRAMES} frames...")

# Video Writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
video_writer = cv2.VideoWriter(OUTPUT_RAW_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

# Background star / particle field
np.random.seed(42)
PARTICLE_COUNT = 60
particles = []
for _ in range(PARTICLE_COUNT):
    particles.append({
        'x': np.random.uniform(0, WIDTH),
        'y': np.random.uniform(0, HEIGHT),
        'speed': np.random.uniform(1.2, 3.8),
        'size': np.random.uniform(1.5, 4.0),
        'alpha': np.random.uniform(40, 180),
        'color': C_GREEN if np.random.rand() > 0.4 else C_CYAN
    })

def render_background(frame_idx, glow_color=(52, 235, 61), glow_intensity=0.25):
    # Base dark gradient
    bg = Image.new("RGBA", (WIDTH, HEIGHT), (6, 8, 14, 255))
    draw = ImageDraw.Draw(bg)
    
    # Perspective Grid lines in bottom half
    grid_y_start = int(HEIGHT * 0.55)
    horizon_x = WIDTH // 2
    horizon_y = int(HEIGHT * 0.5)
    
    # Horizontal grid lines with perspective spacing
    for i in range(12):
        rel = (i + (frame_idx * 0.08) % 1.0) / 12.0
        y_pos = int(grid_y_start + (HEIGHT - grid_y_start) * (rel ** 1.8))
        grid_alpha = int(40 * (rel ** 1.2))
        draw.line([(0, y_pos), (WIDTH, y_pos)], fill=(glow_color[0], glow_color[1], glow_color[2], grid_alpha), width=1)
        
    # Vanishing perspective vertical lines
    for angle_i in range(-8, 9):
        x_target = horizon_x + angle_i * (WIDTH // 7)
        grid_alpha = max(10, 35 - abs(angle_i) * 3)
        draw.line([(horizon_x, horizon_y), (x_target, HEIGHT)], fill=(glow_color[0], glow_color[1], glow_color[2], grid_alpha), width=1)

    # Ambient radial orb
    t_pulse = math.sin(frame_idx * 0.08) * 0.15 + 0.85
    orb_radius = int(420 * t_pulse)
    orb_cx = WIDTH // 2
    orb_cy = int(HEIGHT * 0.42)
    
    # Floating particles
    for p in particles:
        p_y = (p['y'] - frame_idx * p['speed']) % HEIGHT
        p_alpha = int(p['alpha'] * (0.6 + 0.4 * math.sin(frame_idx * 0.1 + p['x'])))
        draw.ellipse([
            p['x'] - p['size'], p_y - p['size'],
            p['x'] + p['size'], p_y + p['size']
        ], fill=(p['color'][0], p['color'][1], p['color'][2], p_alpha))

    return bg

# Audio waveform simulator for HUD
def draw_audio_waveform(draw, x, y, w, h, frame_idx, bar_count=28):
    bar_w = w / bar_count
    for b in range(bar_count):
        phase = frame_idx * 0.25 + b * 0.35
        amp = (math.sin(phase) * 0.5 + 0.5) * (math.cos(phase * 1.7) * 0.3 + 0.7)
        bar_h = max(4, int(amp * h))
        bx = int(x + b * bar_w)
        by = int(y + (h - bar_h) // 2)
        
        # Color gradient green to cyan
        ratio = b / float(bar_count)
        cr = int(C_GREEN[0] * (1 - ratio) + C_CYAN[0] * ratio)
        cg = int(C_GREEN[1] * (1 - ratio) + C_CYAN[1] * ratio)
        cb = int(C_GREEN[2] * (1 - ratio) + C_CYAN[2] * ratio)
        
        draw.rounded_rectangle([bx + 1, by, bx + bar_w - 2, by + bar_h], radius=2, fill=(cr, cg, cb, 230))

print("[RENDER] Rendering Motion Graphics frames...")

for frame_idx in range(TOTAL_FRAMES):
    sec = frame_idx / FPS
    
    # -------------------------------------------------------------
    # SCENE 1: THE PROBLEM (0.0s - 3.0s | Frames 0 - 90)
    # -------------------------------------------------------------
    if sec < 3.0:
        local_t = sec / 3.0
        bg = render_background(frame_idx, glow_color=C_RED, glow_intensity=0.3)
        draw = ImageDraw.Draw(bg)
        
        # Warning Top Pill
        pill_scale = ease_out_back(min(1.0, sec / 0.6))
        if pill_scale > 0.05:
            pill_font = get_font(FONT_MONO, 24)
            pill_text = "THE OLD WORKFLOW IS BROKEN"
            pw, ph = 460, 48
            px = (WIDTH - pw) // 2
            py = int(280 + (1.0 - pill_scale) * -50)
            draw.rounded_rectangle([px, py, px + pw, py + ph], radius=24, fill=(255, 65, 84, 40), outline=(255, 65, 84, 160), width=2)
            draw.text((px + 45, py + 10), pill_text, font=pill_font, fill=(255, 100, 115, 255))
            
        # Kinetic Typography Slam 1
        slam1_t = ease_out_back(min(1.0, max(0.0, (sec - 0.3) / 0.5)))
        if slam1_t > 0.01:
            title_font = get_font(FONT_HEADING, 74)
            t1 = "TIRED OF CLOUD"
            t2 = "CLIPPING QUEUES?"
            
            # Subtle motion trail / glow
            y1 = int(390 + (1.0 - slam1_t) * 80)
            y2 = int(480 + (1.0 - slam1_t) * 80)
            
            # Shadow
            draw.text((WIDTH//2 - 290 + 3, y1 + 3), t1, font=title_font, fill=(0, 0, 0, 180))
            draw.text((WIDTH//2 - 320 + 3, y2 + 3), t2, font=title_font, fill=(0, 0, 0, 180))
            
            # Text
            draw.text((WIDTH//2 - 290, y1), t1, font=title_font, fill=(255, 255, 255, 255))
            draw.text((WIDTH//2 - 320, y2), t2, font=title_font, fill=(255, 65, 84, 255))
            
        # Pain Cards Stagger In
        card_items = [
            ("45 Minutes In Slow Cloud Queues", 0.9),
            ("$30 - $50 Every Month In Subscriptions", 1.4),
            ("Hour Caps & Aggressive Watermarks", 1.9),
            ("Private Client Videos Uploaded To Web", 2.4),
        ]
        
        card_y_base = 670
        for idx, (ctext, cstart) in enumerate(card_items):
            if sec >= cstart:
                ct = ease_out_back(min(1.0, (sec - cstart) / 0.45))
                c_font = get_font(FONT_BODY, 32)
                cw, ch = 920, 84
                cx = int(80 + (1.0 - ct) * -120)
                cy = card_y_base + idx * 104
                c_alpha = int(ct * 255)
                
                # Card box
                draw.rounded_rectangle([cx, cy, cx + cw, cy + ch], radius=16, fill=(20, 15, 22, 230), outline=(255, 65, 84, int(120 * ct)), width=2)
                draw.text((cx + 28, cy + 24), ctext, font=c_font, fill=(255, 220, 225, c_alpha))
                
        # Pulsing Red Progress Bar showing long wait
        if sec > 1.2:
            bar_w = int(880 * min(1.0, (sec - 1.2) / 1.8 * 0.32)) # stuck at 32%
            draw.rounded_rectangle([100, 1140, 980, 1160], radius=10, fill=(30, 20, 25, 200), outline=(255, 65, 84, 100), width=1)
            draw.rounded_rectangle([100, 1140, 100 + bar_w, 1160], radius=10, fill=(255, 65, 84, 255))
            draw.text((WIDTH//2 - 140, 1180), "Server Queue: Position #412...", font=get_font(FONT_MONO, 22), fill=(255, 120, 130, 230))

    # -------------------------------------------------------------
    # SCENE 2: THE BREAKTHROUGH REVEAL (3.0s - 6.0s | Frames 90 - 180)
    # -------------------------------------------------------------
    elif sec < 6.0:
        local_t = (sec - 3.0) / 3.0
        bg = render_background(frame_idx, glow_color=C_GREEN, glow_intensity=0.45)
        draw = ImageDraw.Draw(bg)
        
        # Flash impact at 3.0s
        if sec < 3.2:
            flash_alpha = int((1.0 - (sec - 3.0) / 0.2) * 255)
            flash_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (255, 255, 255, flash_alpha))
            bg.paste(flash_overlay, (0, 0), flash_overlay)
            draw = ImageDraw.Draw(bg)

        # Expanding Shockwave Rings
        ring_t = (sec - 3.0) / 2.0
        for r_offset in [0.0, 0.4, 0.8]:
            rt = max(0.0, ring_t - r_offset)
            if 0.0 < rt < 1.0:
                rad = int(rt * 700)
                r_alpha = int((1.0 - rt) * 160)
                draw.ellipse([WIDTH//2 - rad, 520 - rad, WIDTH//2 + rad, 520 + rad], outline=(52, 235, 61, r_alpha), width=3)

        # 3D Scale Logo Drop with Spring
        logo_t = ease_out_back(min(1.0, (sec - 3.0) / 0.7))
        if logo_img and logo_t > 0.05:
            current_logo_size = int(260 * logo_t)
            l_resized = logo_img.resize((current_logo_size, current_logo_size), Image.Resampling.LANCZOS)
            lx = (WIDTH - current_logo_size) // 2
            ly = int(390 - (1.0 - logo_t) * 120)
            
            # Radial green back-glow for logo
            glow_rad = int(current_logo_size * 0.9)
            draw.ellipse([WIDTH//2 - glow_rad, ly + current_logo_size//2 - glow_rad, WIDTH//2 + glow_rad, ly + current_logo_size//2 + glow_rad], fill=(52, 235, 61, 40))
            
            bg.paste(l_resized, (lx, ly), l_resized)
            draw = ImageDraw.Draw(bg)

        # Kinetic Product Name Reveal
        if sec >= 3.5:
            name_t = ease_out_back(min(1.0, (sec - 3.5) / 0.5))
            n_font = get_font(FONT_HEADING, 82)
            n_text = "CLIPVAULT"
            nw = 450
            nx = (WIDTH - nw) // 2
            ny = int(700 + (1.0 - name_t) * 50)
            
            # Glow shadow
            draw.text((nx + 3, ny + 3), n_text, font=n_font, fill=(0, 0, 0, 200))
            draw.text((nx, ny), n_text, font=n_font, fill=(255, 255, 255, 255))
            
            # Emerald Underline Sweep
            line_w = int(nw * name_t)
            draw.rounded_rectangle([nx, ny + 95, nx + line_w, ny + 101], radius=3, fill=(52, 235, 61, 255))

        # Tagline
        if sec >= 3.9:
            tag_t = ease_out_cubic(min(1.0, (sec - 3.9) / 0.4))
            t_font = get_font(FONT_BODY, 34)
            tag_text = "THE SOVEREIGN DESKTOP AI CLIPPER"
            tw = 620
            tx = (WIDTH - tw) // 2
            ty = int(830 + (1.0 - tag_t) * 30)
            draw.text((tx, ty), tag_text, font=t_font, fill=(52, 235, 61, int(tag_t * 255)))

        # 3 Pillar Badges Flying In
        pillars = [
            ("100% CLIENT-SIDE AI ENGINE", 4.3),
            ("ZERO CLOUD QUEUES OR TOLLS", 4.7),
            ("UNLIMITED LOCAL 4K EXPORTS", 5.1),
        ]
        
        for p_idx, (p_text, p_time) in enumerate(pillars):
            if sec >= p_time:
                pt = ease_out_back(min(1.0, (sec - p_time) / 0.45))
                pw, ph = 680, 76
                px = (WIDTH - pw) // 2
                py = 960 + p_idx * 96
                
                # Slide in from alternating sides
                slide_offset = int((1.0 - pt) * (200 if p_idx % 2 == 0 else -200))
                px += slide_offset
                
                draw.rounded_rectangle([px, py, px + pw, py + ph], radius=20, fill=(16, 24, 20, 230), outline=(52, 235, 61, int(180 * pt)), width=2)
                p_font = get_font(FONT_BODY, 30)
                draw.text((px + 50, py + 20), p_text, font=p_font, fill=(255, 255, 255, int(pt * 255)))

    # -------------------------------------------------------------
    # SCENE 3: LIVE AI ENGINE & REAL CLIP SHOWCASE (6.0s - 11.5s | Frames 180 - 345)
    # -------------------------------------------------------------
    elif sec < 11.5:
        local_t = (sec - 6.0) / 5.5
        bg = render_background(frame_idx, glow_color=C_GREEN, glow_intensity=0.35)
        draw = ImageDraw.Draw(bg)
        
        # Header Badge
        header_font = get_font(FONT_BODY, 28)
        header_text = "LIVE AI ENGINE DEMO"
        hw, hh = 400, 48
        hx = (WIDTH - hw) // 2
        hy = 100
        draw.rounded_rectangle([hx, hy, hx + hw, hy + hh], radius=24, fill=(52, 235, 61, 30), outline=(52, 235, 61, 140), width=2)
        draw.text((hx + 48, hy + 8), header_text, font=header_font, fill=(52, 235, 61, 255))
        
        title_font = get_font(FONT_HEADING, 54)
        draw.text((WIDTH//2 - 340, 168), "ONE CLICK TO VIRAL SHORTS", font=title_font, fill=(255, 255, 255, 255))
        
        # Phone / Video Frame dimensions
        # Real vertical clip inside floating mock frame
        phone_w = 640
        phone_h = 1138  # 9:16 ratio
        phone_x = (WIDTH - phone_w) // 2
        
        # Floating up from bottom with ease_out_back
        phone_intro_t = ease_out_back(min(1.0, (sec - 6.0) / 0.8))
        phone_y = int(260 + (1.0 - phone_intro_t) * 400)
        
        # Read real frame from sample video
        video_frame_rgb = None
        if sample_cap:
            ret, v_frame = sample_cap.read()
            if not ret:
                sample_cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, v_frame = sample_cap.read()
            if ret and v_frame is not None:
                video_frame_rgb = cv2.cvtColor(v_frame, cv2.COLOR_BGR2RGB)
                
        # Outer phone shadow & bezel
        draw.rounded_rectangle([phone_x - 14, phone_y - 14, phone_x + phone_w + 14, phone_y + phone_h + 14], radius=38, fill=(18, 22, 32, 240), outline=(52, 235, 61, 160), width=3)
        draw.rounded_rectangle([phone_x - 4, phone_y - 4, phone_x + phone_w + 4, phone_y + phone_h + 4], radius=32, fill=(0, 0, 0, 255))
        
        # Paste video frame
        if video_frame_rgb is not None:
            v_img = Image.fromarray(video_frame_rgb)
            v_img = v_img.resize((phone_w, phone_h), Image.Resampling.BILINEAR)
            bg.paste(v_img, (phone_x, phone_y))
            draw = ImageDraw.Draw(bg)
            
        # Dynamic AI Overlays on Phone Screen:
        # 1. AI Face Tracking Reticle on Speaker's face
        face_reticle_t = math.sin(frame_idx * 0.15) * 6
        rx = phone_x + phone_w // 2 - 110 + int(face_reticle_t)
        ry = phone_y + int(phone_h * 0.28)
        rw, rh = 220, 220
        
        # Corner brackets of target reticle
        c_len = 26
        # Top-left
        draw.line([(rx, ry), (rx + c_len, ry)], fill=(52, 235, 61, 240), width=3)
        draw.line([(rx, ry), (rx, ry + c_len)], fill=(52, 235, 61, 240), width=3)
        # Top-right
        draw.line([(rx + rw, ry), (rx + rw - c_len, ry)], fill=(52, 235, 61, 240), width=3)
        draw.line([(rx + rw, ry), (rx + rw, ry + c_len)], fill=(52, 235, 61, 240), width=3)
        # Bottom-left
        draw.line([(rx, ry + rh), (rx + c_len, ry + rh)], fill=(52, 235, 61, 240), width=3)
        draw.line([(rx, ry + rh), (rx, ry + rh - c_len)], fill=(52, 235, 61, 240), width=3)
        # Bottom-right
        draw.line([(rx + rw, ry + rh), (rx + rw - c_len, ry + rh)], fill=(52, 235, 61, 240), width=3)
        draw.line([(rx + rw, ry + rh), (rx + rw, ry + rh - c_len)], fill=(52, 235, 61, 240), width=3)
        
        # Face Lock Label
        draw.rounded_rectangle([rx + 15, ry - 32, rx + rw - 15, ry - 6], radius=6, fill=(0, 0, 0, 190), outline=(52, 235, 61, 180), width=1)
        draw.text((rx + 25, ry - 30), "AI FACE LOCK: 99.4%", font=get_font(FONT_MONO, 16), fill=(52, 235, 61, 255))

        # Floating HUD Badge 1: VIRAL SCORE GAUGE (Right of phone)
        score_val = min(98, int((sec - 6.0) / 3.0 * 98))
        gauge_x = phone_x + phone_w - 60
        gauge_y = phone_y + 110
        draw.rounded_rectangle([gauge_x - 140, gauge_y, gauge_x + 80, gauge_y + 88], radius=16, fill=(12, 16, 24, 230), outline=(52, 235, 61, 220), width=2)
        draw.text((gauge_x - 122, gauge_y + 12), "VIRAL HOOK", font=get_font(FONT_MONO, 18), fill=(148, 163, 184, 255))
        draw.text((gauge_x - 124, gauge_y + 36), f"{score_val} / 100", font=get_font(FONT_HEADING, 36), fill=(52, 235, 61, 255))
        
        # Floating HUD Badge 2: WHISPER WORD-SYNC (Left of phone)
        if sec >= 7.2:
            wh_y = phone_y + 440
            draw.rounded_rectangle([phone_x - 120, wh_y, phone_x + 120, wh_y + 74], radius=14, fill=(12, 16, 24, 230), outline=(45, 212, 255, 200), width=2)
            draw.text((phone_x - 100, wh_y + 12), "WHISPER WORD-SYNC", font=get_font(FONT_BODY, 19), fill=(45, 212, 255, 255))
            draw.text((phone_x - 100, wh_y + 40), "Zero Latency • On-Device", font=get_font(FONT_MONO, 15), fill=(255, 255, 255, 200))

        # Audio Waveform Live at bottom of phone
        draw.rounded_rectangle([phone_x + 30, phone_y + phone_h - 90, phone_x + phone_w - 30, phone_y + phone_h - 20], radius=12, fill=(0, 0, 0, 180), outline=(52, 235, 61, 100), width=1)
        draw_audio_waveform(draw, phone_x + 45, phone_y + phone_h - 85, phone_w - 90, 55, frame_idx)

        # 4 Snappy Feature Cards at bottom of canvas
        feature_pills = [
            ("1-Click Auto Slicer", 7.8),
            ("9:16 Steadicam Reframe", 8.6),
            ("Kinetic Viral Captions", 9.4),
            ("NVENC GPU Export", 10.2)
        ]
        
        for fp_idx, (fp_text, fp_start) in enumerate(feature_pills):
            if sec >= fp_start:
                fpt = ease_out_back(min(1.0, (sec - fp_start) / 0.4))
                col = fp_idx % 2
                row = fp_idx // 2
                fw, fh = 450, 68
                fx = 70 + col * 490
                fy = 1450 + row * 82
                
                draw.rounded_rectangle([fx, fy, fx + fw, fy + fh], radius=14, fill=(15, 22, 30, 230), outline=(52, 235, 61, int(200 * fpt)), width=2)
                draw.text((fx + 30, fy + 18), fp_text, font=get_font(FONT_BODY, 25), fill=(255, 255, 255, int(255 * fpt)))

    # -------------------------------------------------------------
    # SCENE 4: THE SPEED SHOWDOWN (11.5s - 13.5s | Frames 345 - 405)
    # -------------------------------------------------------------
    elif sec < 13.5:
        local_t = (sec - 11.5) / 2.0
        bg = render_background(frame_idx, glow_color=C_GREEN, glow_intensity=0.4)
        draw = ImageDraw.Draw(bg)
        
        # Heading
        head_font = get_font(FONT_HEADING, 66)
        draw.text((WIDTH//2 - 360, 220), "THE SPEED SHOWDOWN", font=head_font, fill=(255, 255, 255, 255))
        
        sub_font = get_font(FONT_BODY, 30)
        draw.text((WIDTH//2 - 310, 310), "Why Wait In Cloud Queues Every Day?", font=sub_font, fill=(148, 163, 184, 255))
        
        # Left Card: Cloud SaaS (Red)
        c1_t = ease_out_back(min(1.0, (sec - 11.5) / 0.4))
        card_w = 450
        card_h = 820
        c1_x = int(65 + (1.0 - c1_t) * -200)
        c1_y = 420
        draw.rounded_rectangle([c1_x, c1_y, c1_x + card_w, c1_y + card_h], radius=24, fill=(24, 15, 18, 235), outline=(255, 65, 84, 160), width=2)
        
        draw.text((c1_x + 95, c1_y + 40), "CLOUD SAAS", font=get_font(FONT_HEADING, 42), fill=(255, 65, 84, 255))
        draw.line([(c1_x + 30, c1_y + 110), (c1_x + card_w - 30, c1_y + 110)], fill=(255, 65, 84, 80), width=2)
        
        c1_points = [
            ("Video Upload:", "20+ Minutes"),
            ("Queue Waiting:", "25 Minutes"),
            ("Rendering:", "Slow CPU"),
            ("Monthly Fee:", "$30 - $50 / mo"),
            ("Total Wait:", "45 MINUTES")
        ]
        for p_i, (lbl, val) in enumerate(c1_points):
            py = c1_y + 160 + p_i * 115
            draw.text((c1_x + 35, py), lbl, font=get_font(FONT_BODY, 24), fill=(180, 150, 155, 255))
            draw.text((c1_x + 35, py + 34), val, font=get_font(FONT_HEADING, 32), fill=(255, 100, 115, 255))

        # Right Card: ClipVault (Neon Emerald)
        c2_t = ease_out_back(min(1.0, (sec - 11.8) / 0.4))
        c2_x = int(565 + (1.0 - c2_t) * 200)
        c2_y = 420
        draw.rounded_rectangle([c2_x, c2_y, c2_x + card_w, c2_y + card_h], radius=24, fill=(15, 28, 20, 240), outline=(52, 235, 61, 240), width=3)
        
        draw.text((c2_x + 110, c2_y + 40), "CLIPVAULT", font=get_font(FONT_HEADING, 42), fill=(52, 235, 61, 255))
        draw.line([(c2_x + 30, c2_y + 110), (c2_x + card_w - 30, c2_y + 110)], fill=(52, 235, 61, 100), width=2)
        
        c2_points = [
            ("Video Upload:", "0 SECONDS"),
            ("Queue Waiting:", "ZERO (Local)"),
            ("Rendering:", "NVENC GPU"),
            ("Pricing:", "From $11 / mo"),
            ("Total Wait:", "14 SECONDS")
        ]
        for p_i, (lbl, val) in enumerate(c2_points):
            py = c2_y + 160 + p_i * 115
            draw.text((c2_x + 35, py), lbl, font=get_font(FONT_BODY, 24), fill=(160, 220, 180, 255))
            draw.text((c2_x + 35, py + 34), val, font=get_font(FONT_HEADING, 32), fill=(52, 235, 61, 255))
            
        # Banner at bottom
        if sec >= 12.3:
            b_t = ease_out_back(min(1.0, (sec - 12.3) / 0.4))
            draw.rounded_rectangle([WIDTH//2 - 380, 1340, WIDTH//2 + 380, 1440], radius=20, fill=(52, 235, 61, 240))
            draw.text((WIDTH//2 - 280, 1362), "OVER 180X FASTER WORKFLOW", font=get_font(FONT_HEADING, 36), fill=(0, 0, 0, 255))

    # -------------------------------------------------------------
    # SCENE 5: FINALE & CALL TO ACTION (13.5s - 16.0s | Frames 405 - 480)
    # -------------------------------------------------------------
    else:
        local_t = (sec - 13.5) / 2.5
        bg = render_background(frame_idx, glow_color=C_GREEN, glow_intensity=0.5)
        draw = ImageDraw.Draw(bg)
        
        # Center Logo
        if logo_img:
            l_size = 200
            l_resized = logo_img.resize((l_size, l_size), Image.Resampling.LANCZOS)
            lx = (WIDTH - l_size) // 2
            ly = 320
            bg.paste(l_resized, (lx, ly), l_resized)
            draw = ImageDraw.Draw(bg)

        # Big Kinetic Finale Heading
        h1_t = ease_out_back(min(1.0, (sec - 13.5) / 0.45))
        draw.text((WIDTH//2 - 290, 560), "CLIP SOVEREIGN.", font=get_font(FONT_HEADING, 70), fill=(255, 255, 255, 255))
        draw.text((WIDTH//2 - 280, 645), "OWN YOUR DATA.", font=get_font(FONT_HEADING, 70), fill=(52, 235, 61, 255))

        # Pricing Pill
        price_t = ease_out_back(min(1.0, (sec - 13.9) / 0.4))
        draw.rounded_rectangle([WIDTH//2 - 320, 780, WIDTH//2 + 320, 856], radius=20, fill=(20, 32, 25, 240), outline=(52, 235, 61, 200), width=2)
        draw.text((WIDTH//2 - 250, 796), "CREATOR PRO - ONLY $11 / MO", font=get_font(FONT_BODY, 32), fill=(255, 255, 255, 255))

        # Pulsing CTA Button
        btn_pulse = math.sin(frame_idx * 0.2) * 4
        btn_w = int(720 + btn_pulse)
        btn_h = 100
        btn_x = (WIDTH - btn_w) // 2
        btn_y = 920
        
        # Button Glow halo
        draw.rounded_rectangle([btn_x - 6, btn_y - 6, btn_x + btn_w + 6, btn_y + btn_h + 6], radius=32, fill=(52, 235, 61, 80))
        # Button Fill
        draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=28, fill=(52, 235, 61, 255))
        draw.text((btn_x + 110, btn_y + 24), "DOWNLOAD FOR WINDOWS", font=get_font(FONT_HEADING, 42), fill=(0, 0, 0, 255))

        # URL
        draw.text((WIDTH//2 - 135, 1070), "clipvault.app", font=get_font(FONT_HEADING, 42), fill=(255, 255, 255, 240))
        draw.line([(WIDTH//2 - 145, 1125), (WIDTH//2 + 145, 1125)], fill=(52, 235, 61, 220), width=3)
        
        # Feature recap bullet list
        bullets = [
            "+ 100% Sovereign Privacy (Runs Locally)",
            "+ NVIDIA NVENC & Intel QSV Hardware Acceleration",
            "+ Unlimited Clips • Zero Monthly Hour Limits"
        ]
        for b_idx, b_text in enumerate(bullets):
            draw.text((WIDTH//2 - 290, 1200 + b_idx * 55), b_text, font=get_font(FONT_BODY, 26), fill=(148, 163, 184, 255))

    # Convert to OpenCV BGR frame and write
    frame_cv = cv2.cvtColor(np.array(bg), cv2.COLOR_RGBA2BGR)
    video_writer.write(frame_cv)
    
    if frame_idx % 60 == 0 or frame_idx == TOTAL_FRAMES - 1:
        print(f"  [FRAME] Rendered frame {frame_idx + 1}/{TOTAL_FRAMES} ({(frame_idx + 1)/TOTAL_FRAMES*100:.1f}%)")

video_writer.release()
if sample_cap:
    sample_cap.release()

print("[DONE] Raw motion graphic video frames rendered successfully!")

# -------------------------------------------------------------
# AUDIO SYNTHESIS & MIXING ENGINE
# -------------------------------------------------------------
print("[AUDIO] Synthesizing synchronized sound design & music track...")
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

# Extract 16 seconds of base music
temp_music_wav = os.path.join(SCRATCH_DIR, "temp_music_16s.wav")
subprocess.run([
    ffmpeg, "-y", "-ss", "0", "-t", "16", "-i", MUSIC_SOURCE,
    "-ar", "44100", "-ac", "2", temp_music_wav
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

# Read base audio with wave
with wave.open(temp_music_wav, "rb") as wf:
    sample_rate = wf.getframerate()
    n_channels = wf.getnchannels()
    n_frames = wf.getnframes()
    raw_data = wf.readframes(n_frames)

audio_data = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32)
audio_data = audio_data.reshape(-1, n_channels)

# Function to synthesize sound effects into the audio array
def add_bass_drop(audio, start_sec, duration_sec=1.2, volume=12000.0):
    start_sample = int(start_sec * sample_rate)
    total_samples = int(duration_sec * sample_rate)
    t = np.linspace(0, duration_sec, total_samples)
    freq = np.linspace(80.0, 32.0, total_samples) # sweeping down
    wave_data = np.sin(2 * np.pi * freq * t) * np.exp(-t * 2.5) * volume
    end_sample = min(len(audio), start_sample + total_samples)
    count = end_sample - start_sample
    for c in range(audio.shape[1]):
        audio[start_sample:end_sample, c] += wave_data[:count]

def add_whoosh_hit(audio, start_sec, duration_sec=0.4, volume=8000.0):
    start_sample = int(start_sec * sample_rate)
    total_samples = int(duration_sec * sample_rate)
    noise = np.random.uniform(-1.0, 1.0, total_samples)
    t = np.linspace(0, duration_sec, total_samples)
    envelope = np.sin(np.pi * (t / duration_sec)) ** 2 * volume
    sound = noise * envelope
    end_sample = min(len(audio), start_sample + total_samples)
    count = end_sample - start_sample
    for c in range(audio.shape[1]):
        audio[start_sample:end_sample, c] += sound[:count]

# Apply Sound Design cues
add_whoosh_hit(audio_data, start_sec=0.2)
add_bass_drop(audio_data, start_sec=3.0, volume=16000.0) # Scene 2 Drop
add_whoosh_hit(audio_data, start_sec=6.0) # Scene 3 Phone Enter
add_whoosh_hit(audio_data, start_sec=11.5) # Scene 4 Showdown
add_bass_drop(audio_data, start_sec=13.5, volume=14000.0) # Scene 5 Finale Drop

# Fade out last 0.8 seconds
fade_samples = int(0.8 * sample_rate)
fade_env = np.linspace(1.0, 0.0, fade_samples)[:, np.newaxis]
audio_data[-fade_samples:] *= fade_env

# Clip & Convert back to int16
audio_data = np.clip(audio_data, -32767, 32767).astype(np.int16)

with wave.open(OUTPUT_AUDIO, "wb") as wf:
    wf.setnchannels(n_channels)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    wf.writeframes(audio_data.tobytes())

print("[AUDIO] High-impact cinematic sound design track mixed!")

# -------------------------------------------------------------
# FINAL COMPOSITING WITH FFMPEG (H.264 + AAC)
# -------------------------------------------------------------
print("[FFMPEG] Muxing final H.264 video with AAC sound design...")
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

# Also copy to Web public directory and override stopmotion name for backwards-compatibility
if os.path.exists(WEB_PUBLIC_DIR):
    import shutil
    web_dest1 = os.path.join(WEB_PUBLIC_DIR, "clipvault_motion_graphics_promo.mp4")
    web_dest2 = os.path.join(WEB_PUBLIC_DIR, "clipvault_stopmotion_promo.mp4")
    shutil.copy2(OUTPUT_FINAL_VIDEO, web_dest1)
    shutil.copy2(OUTPUT_FINAL_VIDEO, web_dest2)
    # Also override in clips/
    shutil.copy2(OUTPUT_FINAL_VIDEO, os.path.join(CLIPS_DIR, "clipvault_stopmotion_promo.mp4"))

print(f"[SUCCESS] Motion graphics commercial rendered to:\n  -> {OUTPUT_FINAL_VIDEO}")
