import os
import random
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Source vertical stop-motion image
IMAGE_PATH = r"C:\Users\Dell User\.gemini\antigravity\brain\90ffe8a2-9ff4-43ac-9067-907a538fd867\clipvault_stopmotion_vertical_1791536411975.jpg"
OUTPUT_DIR = r"c:\Users\Dell User\Downloads\Personal Coding Projects\Python Projects\Desktop AI Clipping Software\clips"
OUTPUT_VIDEO = os.path.join(OUTPUT_DIR, "clipvault_stopmotion_promo.mp4")

WIDTH = 720
HEIGHT = 1280
FPS = 10
TOTAL_FRAMES = 120  # 12 seconds

base_img = Image.open(IMAGE_PATH).convert("RGBA")
base_img = base_img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(OUTPUT_VIDEO, fourcc, FPS, (WIDTH, HEIGHT))

def draw_paper_badge(draw, text, pos, bg_color=(0, 255, 102), text_color=(0, 0, 0), rotation=0, padding=(20, 10), font_size=32):
    # Create separate canvas for rotated badge
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    bbox = font.getbbox(text)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    w = text_w + padding[0] * 2
    h = text_h + padding[1] * 2
    
    badge = Image.new("RGBA", (w + 20, h + 20), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge)
    
    # Shadow
    bdraw.rounded_rectangle([14, 14, w + 10, h + 10], radius=12, fill=(0, 0, 0, 180))
    # Border / paper edge
    bdraw.rounded_rectangle([10, 10, w + 6, h + 6], radius=12, fill=(255, 255, 255, 240))
    # Fill
    bdraw.rounded_rectangle([12, 12, w + 4, h + 4], radius=10, fill=bg_color)
    
    # Text
    bdraw.text((12 + padding[0], 12 + padding[1]), text, font=font, fill=text_color)
    
    # Rotate slightly for tactile stop-motion look
    rotated = badge.rotate(rotation, resample=Image.Resampling.BICUBIC, expand=True)
    return rotated

print("Rendering stop-motion marketing frames...")

for i in range(TOTAL_FRAMES):
    # Stop motion camera wiggle (imperfections that give authentic stop-motion feel)
    jitter_x = random.randint(-4, 4)
    jitter_y = random.randint(-4, 4)
    jitter_rot = random.uniform(-0.8, 0.8)
    
    frame = base_img.copy()
    frame = frame.rotate(jitter_rot, resample=Image.Resampling.BILINEAR)
    
    # Create compositing overlay
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    
    # Timeline Sequences
    if 0 <= i < 30:
        # Scene 1: The Problem (Stop editing manually)
        badge1 = draw_paper_badge(draw, "TIRED OF EDITING 8 HOURS?", (0, 0), bg_color=(255, 60, 60, 255), text_color=(255, 255, 255), rotation=random.uniform(-4, 4), font_size=34)
        overlay.paste(badge1, (60 + jitter_x, 180 + jitter_y), badge1)
        
        if i >= 10:
            badge2 = draw_paper_badge(draw, "NO MORE MANUAL TRIMMING", (0, 0), bg_color=(0, 0, 0, 240), text_color=(255, 255, 255), rotation=random.uniform(-2, 2), font_size=28)
            overlay.paste(badge2, (100 + jitter_x, 260 + jitter_y), badge2)
            
    elif 30 <= i < 65:
        # Scene 2: The Solution (Paste 1 link -> 1-Click Viral Clips)
        badge1 = draw_paper_badge(draw, "1. PASTE YOUTUBE LINK", (0, 0), bg_color=(255, 255, 255, 255), text_color=(0, 0, 0), rotation=random.uniform(-3, 3), font_size=32)
        overlay.paste(badge1, (80 + jitter_x, 160 + jitter_y), badge1)
        
        if i >= 40:
            badge2 = draw_paper_badge(draw, "2. HIT 1-CLICK CLIPPER", (0, 0), bg_color=(52, 235, 61, 255), text_color=(0, 0, 0), rotation=random.uniform(-4, 4), font_size=36)
            overlay.paste(badge2, (60 + jitter_x, 240 + jitter_y), badge2)
            
        if i >= 50:
            badge3 = draw_paper_badge(draw, "⚡ AI FINDS VIRAL HOOKS", (0, 0), bg_color=(0, 0, 0, 240), text_color=(52, 235, 61), rotation=random.uniform(-2, 2), font_size=30)
            overlay.paste(badge3, (90 + jitter_x, 320 + jitter_y), badge3)
            
    elif 65 <= i < 95:
        # Scene 3: Features (Steadicam, Hormozi Captions, 4K)
        badge1 = draw_paper_badge(draw, "9:16 STEADICAM FACE LOCK", (0, 0), bg_color=(52, 235, 61, 255), text_color=(0, 0, 0), rotation=random.uniform(-3, 3), font_size=32)
        overlay.paste(badge1, (70 + jitter_x, 160 + jitter_y), badge1)
        
        if i >= 75:
            badge2 = draw_paper_badge(draw, "KINETIC HORMOZI CAPTIONS", (0, 0), bg_color=(255, 220, 0, 255), text_color=(0, 0, 0), rotation=random.uniform(-2, 2), font_size=30)
            overlay.paste(badge2, (65 + jitter_x, 240 + jitter_y), badge2)
            
        if i >= 85:
            badge3 = draw_paper_badge(draw, "4K & 8K SUPER-RESOLUTION", (0, 0), bg_color=(0, 0, 0, 245), text_color=(255, 255, 255), rotation=random.uniform(-4, 4), font_size=30)
            overlay.paste(badge3, (80 + jitter_x, 320 + jitter_y), badge3)
            
    else:
        # Scene 4: Call to Action & Pricing
        badge1 = draw_paper_badge(draw, "START FOR JUST $11 / MO", (0, 0), bg_color=(52, 235, 61, 255), text_color=(0, 0, 0), rotation=random.uniform(-2, 2), font_size=36)
        overlay.paste(badge1, (70 + jitter_x, 150 + jitter_y), badge1)
        
        badge2 = draw_paper_badge(draw, "100% LOCAL • 0% CLOUD QUEUES", (0, 0), bg_color=(0, 0, 0, 240), text_color=(255, 255, 255), rotation=random.uniform(-3, 3), font_size=26)
        overlay.paste(badge2, (75 + jitter_x, 235 + jitter_y), badge2)
        
        badge3 = draw_paper_badge(draw, "👉 DOWNLOAD CLIPVAULT NOW", (0, 0), bg_color=(255, 255, 255, 255), text_color=(0, 0, 0), rotation=random.uniform(-1, 1), font_size=32)
        overlay.paste(badge3, (55 + jitter_x, 310 + jitter_y), badge3)

    # Composite overlay onto frame
    combined = Image.alpha_composite(frame, overlay)
    
    # Convert RGBA -> BGR for OpenCV
    rgb_frame = combined.convert("RGB")
    cv_frame = cv2.cvtColor(np.array(rgb_frame), cv2.COLOR_RGB2BGR)
    
    # Offset frame slightly for paper wiggle
    M = np.float32([[1, 0, jitter_x], [0, 1, jitter_y]])
    cv_frame = cv2.warpAffine(cv_frame, M, (WIDTH, HEIGHT), borderMode=cv2.BORDER_REFLECT)
    
    out.write(cv_frame)

out.release()
print(f"STOP MOTION PROMO VIDEO SUCCESSFULLY CREATED: {OUTPUT_VIDEO}")
