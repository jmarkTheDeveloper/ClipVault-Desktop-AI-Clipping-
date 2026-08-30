"""
LayoutCompositor Service - High-Performance Vertical & Split-Screen Video Composition.
Handles all layout transformations (9:16 vertical crop, blurred backgrounds, gameplay overlays, facecam splits).
"""
import random
from pathlib import Path
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
from moviepy.editor import VideoFileClip, CompositeVideoClip, ColorClip

from config import BACKGROUNDS_DIR


class LayoutCompositor:
    """
    Composes and transforms horizontal landscape video feeds into vertical 9:16 viral shorts.
    """
    def __init__(self, face_tracker=None):
        self.face_tracker = face_tracker

    @staticmethod
    def letterbox(clip, target_width: int, target_height: int):
        """Pads a clip inside a centered black canvas matching target dimensions."""
        W, H = clip.size
        scale = min(target_width / W, target_height / H)
        new_w = int(W * scale)
        new_h = int(H * scale)
        if new_w % 2 != 0: new_w -= 1
        if new_h % 2 != 0: new_h -= 1

        scaled_clip = clip.resize((new_w, new_h))
        bg = ColorClip(size=(target_width, target_height), color=(0, 0, 0), duration=clip.duration)
        return CompositeVideoClip([bg, scaled_clip.set_position("center")], size=(target_width, target_height))

    def compose_layout(
        self,
        clip,
        layout: str,
        target_width: int,
        target_height: int,
        custom_crop_boxes: Optional[List[Dict[str, Any]]] = None,
        camera_style: str = "instant",
        clips_to_close: Optional[List[Any]] = None,
        gameplay_bg_video: Optional[str] = None
    ):
        """
        Applies the selected layout transformation and returns the composed MoviePy clip.
        """
        if clips_to_close is None:
            clips_to_close = []

        if layout == "landscape":
            print(f"    📐 Keeping original landscape resolution ({target_width}x{target_height})...")
            scaled = clip.resize((target_width, target_height))
            clips_to_close.append(scaled)
            return scaled

        elif layout == "landscape_blur":
            print(f"    📐 Fitting landscape video with blurred background inside vertical canvas ({target_width}x{target_height})...")
            W, H = clip.size
            scale_bg = max(target_width / W, target_height / H) * 1.15
            bg_w = int(W * scale_bg)
            bg_h = int(H * scale_bg)
            if bg_w % 2 != 0: bg_w -= 1
            if bg_h % 2 != 0: bg_h -= 1

            bg = clip.resize((bg_w, bg_h))
            clips_to_close.append(bg)

            # Center crop background to exact target dimensions
            crop_x = max(0, (bg_w - target_width) // 2)
            crop_y = max(0, (bg_h - target_height) // 2)
            bg_cropped = bg.crop(x1=crop_x, y1=crop_y, width=target_width, height=target_height)
            clips_to_close.append(bg_cropped)

            # Apply heavy blur and darkening for sleek contrast
            from moviepy.video.fx.headblur import headblur
            try:
                bg_blurred = bg_cropped.fl_image(lambda frame: cv2.GaussianBlur(frame, (91, 91), 0))
            except Exception:
                bg_blurred = bg_cropped
            clips_to_close.append(bg_blurred)

            # Dim background by 40%
            bg_dark = bg_blurred.fl_image(lambda frame: (frame * 0.60).astype(np.uint8))
            clips_to_close.append(bg_dark)

            # Foreground: Centered fit
            fg = clip.resize(width=target_width)
            clips_to_close.append(fg)

            composed = CompositeVideoClip([bg_dark, fg.set_position("center")], size=(target_width, target_height))
            clips_to_close.append(composed)
            return composed

        elif layout == "landscape_fit":
            print(f"    📐 Fitting landscape video inside vertical canvas ({target_width}x{target_height})...")
            fg = clip.resize(width=target_width)
            clips_to_close.append(fg)
            bg = ColorClip(size=(target_width, target_height), color=(0, 0, 0), duration=clip.duration)
            clips_to_close.append(bg)
            composed = CompositeVideoClip([bg, fg.set_position("center")])
            clips_to_close.append(composed)
            return composed

        elif layout == "gameplay_bg":
            print("    🎮 Applying Satisfying Gameplay Split (Speaker Top, Gameplay Bottom)...")
            bg_file = None
            if gameplay_bg_video and Path(gameplay_bg_video).exists():
                bg_file = Path(gameplay_bg_video)
            elif gameplay_bg_video and (BACKGROUNDS_DIR / Path(gameplay_bg_video).name).exists():
                bg_file = BACKGROUNDS_DIR / Path(gameplay_bg_video).name
            else:
                valid_exts = {".mp4", ".mov", ".webm", ".mkv"}
                bg_files = [f for f in BACKGROUNDS_DIR.glob("*.*") if f.suffix.lower() in valid_exts and f.is_file()]
                if bg_files:
                    bg_file = random.choice(bg_files)

            if not bg_file or not bg_file.exists():
                raise ValueError("No background video found for Satisfying Gameplay Split. Please import a gameplay video before compiling.")

            try:
                speaker_h = target_height // 2
                speaker_w = target_width
                
                # Face track or center crop speaker for top half
                speaker_ratio = speaker_w / speaker_h
                top_speaker = None
                if self.face_tracker:
                    print("    🎯 Applying intelligent face tracking to top speaker frame...")
                    try:
                        tracked_top = self.face_tracker.track_and_crop(clip, crop_ratio=speaker_ratio, camera_style=camera_style)
                        top_speaker = tracked_top.resize((speaker_w, speaker_h))
                    except Exception as fe:
                        print(f"    ⚠️ Face tracking fallback in gameplay layout: {fe}")
                        top_speaker = None

                if top_speaker is None:
                    W, H = clip.size
                    crop_w = int(H * speaker_ratio)
                    if crop_w % 2 != 0: crop_w -= 1
                    if crop_w > W:
                        crop_w = W
                        crop_h = int(W / speaker_ratio)
                        if crop_h % 2 != 0: crop_h -= 1
                        top_x = 0
                        top_y = max(0, H // 2 - crop_h // 2)
                        top_speaker = clip.crop(x1=top_x, y1=top_y, width=crop_w, height=crop_h).resize((speaker_w, speaker_h))
                    else:
                        top_x = max(0, W // 2 - crop_w // 2)
                        top_speaker = clip.crop(x1=top_x, y1=0, width=crop_w, height=H).resize((speaker_w, speaker_h))
                clips_to_close.append(top_speaker)

                # Bottom half: Gameplay video
                bg_video = VideoFileClip(str(bg_file))
                clips_to_close.append(bg_video)
                bg_video_muted = bg_video.without_audio()
                clips_to_close.append(bg_video_muted)

                if bg_video_muted.duration > clip.duration:
                    max_start = max(0.0, bg_video_muted.duration - clip.duration - 2.0)
                    start_bg = random.uniform(0.0, max_start)
                    gameplay_clip = bg_video_muted.subclip(start_bg, start_bg + clip.duration)
                else:
                    gameplay_clip = bg_video_muted
                clips_to_close.append(gameplay_clip)

                # Crop gameplay to bottom half
                bg_w, bg_h = gameplay_clip.size
                crop_bg_w = int(bg_h * (speaker_w / speaker_h))
                if crop_bg_w % 2 != 0: crop_bg_w -= 1
                if crop_bg_w > bg_w:
                    crop_bg_w = bg_w
                    crop_bg_h = int(bg_w * (speaker_h / speaker_w))
                    if crop_bg_h % 2 != 0: crop_bg_h -= 1
                    bg_y = max(0, bg_h // 2 - crop_bg_h // 2)
                    bot_gameplay = gameplay_clip.crop(x1=0, y1=bg_y, width=crop_bg_w, height=crop_bg_h).resize((speaker_w, speaker_h))
                else:
                    bg_x = max(0, bg_w // 2 - crop_bg_w // 2)
                    bot_gameplay = gameplay_clip.crop(x1=bg_x, y1=0, width=crop_bg_w, height=bg_h).resize((speaker_w, speaker_h))
                clips_to_close.append(bot_gameplay)

                composed = CompositeVideoClip([
                    top_speaker.set_position((0, 0)),
                    bot_gameplay.set_position((0, speaker_h))
                ], size=(target_width, target_height)).set_audio(clip.audio)
                clips_to_close.append(composed)
                return composed
            except Exception as bg_err:
                print(f"    ⚠️ Failed to load gameplay background: {bg_err}")
                raise bg_err

        elif layout == "custom_split" and custom_crop_boxes and len(custom_crop_boxes) >= 2:
            print("    🎛️ Applying custom dual-box split-screen layout from UI...")
            try:
                W, H = clip.size
                box_top = custom_crop_boxes[0]
                box_bot = custom_crop_boxes[1]

                target_half_w = target_width
                target_half_h = target_height // 2

                def crop_and_fit_half(box, fallback_y_pct=0.0):
                    x_pct = float(box.get('x', 0))
                    y_pct = float(box.get('y', fallback_y_pct))
                    w_pct = float(box.get('width', 100))
                    h_pct = float(box.get('height', 50))

                    x1 = max(0, min(W - 4, int(round((x_pct / 100.0) * W))))
                    y1 = max(0, min(H - 4, int(round((y_pct / 100.0) * H))))
                    x2 = max(x1 + 4, min(W, int(round(((x_pct + w_pct) / 100.0) * W))))
                    y2 = max(y1 + 4, min(H, int(round(((y_pct + h_pct) / 100.0) * H))))

                    # 1. Exact bounding crop from source video
                    raw_cropped = clip.crop(x1=x1, y1=y1, x2=x2, y2=y2)
                    cw, ch = raw_cropped.size

                    if cw <= 0 or ch <= 0:
                        return raw_cropped.resize((target_half_w, target_half_h))

                    # 2. Scale to cover (target_half_w, target_half_h) preserving natural aspect ratio
                    scale = max(target_half_w / float(cw), target_half_h / float(ch))
                    scaled_w = max(4, int(round(cw * scale)))
                    scaled_h = max(4, int(round(ch * scale)))
                    if scaled_w % 2 != 0: scaled_w += 1
                    if scaled_h % 2 != 0: scaled_h += 1

                    scaled_clip = raw_cropped.resize((scaled_w, scaled_h))

                    # 3. Center-crop to exact target dimensions
                    xc = scaled_w / 2.0
                    yc = scaled_h / 2.0
                    fitted = scaled_clip.crop(
                        x_center=xc,
                        y_center=yc,
                        width=target_half_w,
                        height=target_half_h
                    )
                    clips_to_close.append(raw_cropped)
                    clips_to_close.append(scaled_clip)
                    clips_to_close.append(fitted)
                    return fitted

                top_half = crop_and_fit_half(box_top, 0.0)
                bot_half = crop_and_fit_half(box_bot, 50.0)

                composed = CompositeVideoClip([
                    top_half.set_position((0, 0)),
                    bot_half.set_position((0, target_half_h))
                ], size=(target_width, target_height))

                if clip.audio is not None:
                    composed = composed.set_audio(clip.audio)

                clips_to_close.append(composed)
                return composed
            except Exception as split_err:
                print(f"    ⚠️ Custom split failed: {split_err}. Falling back to standard vertical crop.")

        # Default: 9:16 Vertical Crop with intelligent Active Speaker Face Tracking
        if custom_crop_boxes and len(custom_crop_boxes) > 0:
            print("    📐 Using custom crop coordinates from UI...")
            box = custom_crop_boxes[0]
            W, H = clip.size
            x_pct, y_pct = float(box.get('x', 0)), float(box.get('y', 0))
            w_pct, h_pct = float(box.get('width', 100)), float(box.get('height', 100))

            crop_x = max(0, int((x_pct / 100.0) * W))
            crop_y = max(0, int((y_pct / 100.0) * H))
            crop_w = min(W - crop_x, int((w_pct / 100.0) * W))
            crop_h = min(H - crop_y, int((h_pct / 100.0) * H))

            cropped = clip.crop(x1=crop_x, y1=crop_y, width=crop_w, height=crop_h)
            clips_to_close.append(cropped)
            return self.letterbox(cropped, target_width, target_height)

        if self.face_tracker:
            print("    🎯 Applying intelligent face tracking...")
            try:
                tracked = self.face_tracker.track_and_crop(clip, camera_style=camera_style)
                clips_to_close.append(tracked)
                resized = tracked.resize((target_width, target_height))
                clips_to_close.append(resized)
                return resized
            except Exception as e:
                print(f"    ⚠️ Face tracking note: {e}")

        # Fallback centered vertical crop
        crop_w = int(clip.h * 9 / 16)
        if crop_w % 2 != 0: crop_w -= 1
        crop_x = max(0, clip.w // 2 - crop_w // 2)
        cropped = clip.crop(x1=crop_x, width=crop_w)
        clips_to_close.append(cropped)
        resized = cropped.resize((target_width, target_height))
        clips_to_close.append(resized)
        return resized
