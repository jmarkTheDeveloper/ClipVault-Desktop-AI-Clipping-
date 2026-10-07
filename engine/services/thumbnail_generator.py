"""
ThumbnailGenerator Service - Automated High-Quality 9:16 Portrait Thumbnail Engine.
Extracts the sharpest, most flattering speaker expression frame using neural face detection,
eye-level composition, sharpness analysis, and subtle cinematic polish for YouTube Shorts,
TikTok, and Instagram Reels.
"""
import os
import sys
from pathlib import Path
from typing import Optional, Tuple, List, Dict, Any
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

try:
    from services.face_tracker import FaceTracker
except ImportError:
    try:
        from face_tracker import FaceTracker
    except ImportError:
        from engine.services.face_tracker import FaceTracker


class ThumbnailGenerator:
    """
    Generates pristine, high-CTR 9:16 vertical thumbnails with flattering facial anchoring,
    tighter face-sharpness selection, and clean cinematic composition.
    """
    def __init__(self, face_tracker: Optional[FaceTracker] = None):
        self.face_tracker = face_tracker or FaceTracker()
        self.font_path = self._resolve_bold_font()

    def _resolve_bold_font(self) -> Optional[str]:
        """Finds Arial Black or Montserrat Bold font on Windows / Linux / macOS."""
        project_root = Path(__file__).parent.parent
        candidates = [
            r"C:\Windows\Fonts\ariblk.ttf",
            str(project_root / "assets" / "fonts" / "Montserrat-Bold.ttf"),
            str(project_root / "assets" / "fonts" / "Anton-Regular.ttf"),
            r"C:\Windows\Fonts\impact.ttf",
            r"C:\Windows\Fonts\arialbd.ttf",
            r"C:\Windows\Fonts\segoeuib.ttf",
            "/usr/share/fonts/truetype/msttcorefonts/Impact.ttf",
            "/System/Library/Fonts/Supplemental/Impact.ttf",
            "/Library/Fonts/Impact.ttf",
        ]
        for c in candidates:
            if c and os.path.exists(c):
                return c
        return None

    def _score_frame(
        self,
        frame_rgb: np.ndarray,
        frame_time: float,
        frame_w: int,
        frame_h: int
    ) -> Tuple[float, Optional[Dict[str, Any]]]:
        """
        Evaluates a candidate frame based on:
        1. Neural face detection confidence & size
        2. Sharpness of the face region (anti-motion-blur)
        3. Eye-level portrait positioning & horizontal centering
        4. Natural mouth/expression metrics
        5. Frame luminance & contrast
        """
        faces = self.face_tracker.detect_faces_in_frame(frame_rgb, frame_time=float(frame_time))
        
        # Check overall frame luminance & contrast first
        gray_frame = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2GRAY)
        mean_lum = float(np.mean(gray_frame))
        std_contrast = float(np.std(gray_frame))
        
        # Heavily penalize fades to black or blown out whites
        if mean_lum < 35.0 or mean_lum > 225.0 or std_contrast < 20.0:
            return -100.0, None

        if faces:
            primary_face = faces[0]
            conf = float(primary_face.get('confidence', 0.8))
            cx = float(primary_face.get('center_x', frame_w / 2.0))
            cy = float(primary_face.get('center_y', frame_h / 2.0))
            fw = float(primary_face.get('width', frame_w * 0.3))
            fh = float(primary_face.get('height', frame_h * 0.3))

            # Crop face bounding box to measure sharpness
            x1 = max(0, min(frame_w - 1, int(cx - fw / 2.0)))
            y1 = max(0, min(frame_h - 1, int(cy - fh / 2.0)))
            x2 = max(x1 + 10, min(frame_w, int(cx + fw / 2.0)))
            y2 = max(y1 + 10, min(frame_h, int(cy + fh / 2.0)))
            
            face_roi_gray = gray_frame[y1:y2, x1:x2]
            if face_roi_gray.size > 100:
                face_sharpness = float(cv2.Laplacian(face_roi_gray, cv2.CV_64F).var())
            else:
                face_sharpness = 20.0

            # Flattering portrait composition bonuses:
            # 1. Horizontal centering (speaker centered horizontally in 9:16)
            centering_bonus = max(0.2, 1.0 - (abs(cx - frame_w / 2.0) / (frame_w / 2.0)) * 0.7)
            
            # 2. Eye-level positioning (upper third: y ~ 30-40% down the frame)
            ideal_eye_y = frame_h * 0.35
            eye_level_bonus = max(0.2, 1.0 - (abs(cy - ideal_eye_y) / frame_h) * 1.2)
            
            # 3. Flattering face size (ideal: face height between 18% and 42% of frame)
            height_ratio = fh / float(frame_h)
            if 0.16 <= height_ratio <= 0.45:
                size_bonus = 1.2
            elif height_ratio < 0.10 or height_ratio > 0.65:
                size_bonus = 0.5
            else:
                size_bonus = 1.0

            # 4. Sharpness normalization: reward sharp faces (>80), heavily penalize blurry frames (<35)
            sharp_factor = min(200.0, max(1.0, face_sharpness)) ** 0.55

            # 5. Natural mouth check: avoid mouth wide open in awkward speech
            mouth_span = primary_face.get('mouth_span', 0)
            mouth_penalty = 1.0
            if mouth_span > 0 and fh > 0:
                mouth_ratio = mouth_span / fh
                if mouth_ratio > 0.45:  # Wide open mouth / awkward grimace
                    mouth_penalty = 0.65

            total_score = (conf ** 2) * sharp_factor * centering_bonus * eye_level_bonus * size_bonus * mouth_penalty
            return total_score, primary_face
        else:
            # No face detected (e.g. gameplay, scene, B-roll): rely on frame sharpness & contrast
            laplacian_var = float(cv2.Laplacian(gray_frame, cv2.CV_64F).var())
            score = min(60.0, (laplacian_var ** 0.5) * (std_contrast / 50.0))
            return score, None

    def _find_best_frame(self, video_path: str, num_samples: int = 35) -> Tuple[np.ndarray, Optional[Dict[str, Any]]]:
        """
        Scans frames across the video with intelligent multi-stage sampling:
        Stage 1: Broad multi-point candidate scan (30-45 points across duration)
        Stage 2: High-density micro-burst scan around the top candidate timestamp to catch peak sharpness
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        duration = total_frames / fps if fps > 0 else 10.0

        # Sample points distributed across duration, skipping first 0.8s and last 0.8s
        start_t = min(1.0, duration * 0.05)
        end_t = max(start_t + 1.0, duration - 1.0)
        
        # Adaptive sample density: ~1 sample every 0.7s, minimum 15, max 45
        target_samples = min(45, max(15, int(duration / 0.7)))
        sample_times = np.linspace(start_t, end_t, target_samples)

        best_score = -9999.0
        best_t = sample_times[0] if len(sample_times) > 0 else 1.0

        # Stage 1: Coarse candidate scan
        for t in sample_times:
            frame_idx = int(t * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame_bgr = cap.read()
            if not ret or frame_bgr is None:
                continue

            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            h, w = frame_rgb.shape[:2]

            score, _ = self._score_frame(frame_rgb, float(t), w, h)
            if score > best_score:
                best_score = score
                best_t = float(t)

        # Stage 2: Refinement Micro-Burst Scan (+/- 180ms around the best candidate)
        # Tests 5 high-frequency frames to avoid mid-blink eye closure or mouth syllable twitches
        refine_offsets = [-0.18, -0.09, 0.0, 0.09, 0.18]
        final_best_frame = None
        final_best_face = None
        final_highest_score = -9999.0

        for offset in refine_offsets:
            cur_t = max(0.2, min(duration - 0.2, best_t + offset))
            frame_idx = int(cur_t * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame_bgr = cap.read()
            if not ret or frame_bgr is None:
                continue

            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            h, w = frame_rgb.shape[:2]

            score, face_info = self._score_frame(frame_rgb, cur_t, w, h)
            if score > final_highest_score or final_best_frame is None:
                final_highest_score = score
                final_best_frame = frame_rgb
                final_best_face = face_info

        cap.release()

        if final_best_frame is None:
            final_best_frame = np.zeros((1920, 1080, 3), dtype=np.uint8)

        return final_best_frame, final_best_face

    def _enhance_visuals(self, pil_img: Image.Image) -> Image.Image:
        """
        Applies subtle, tasteful cinematic color grading:
        + Gentle contrast boost (+6%)
        + Subtle color vibrance (+5%)
        + High-fidelity unsharp mask to ensure crystal-clear mobile rendering
        """
        # Contrast polish
        enhancer = ImageEnhance.Contrast(pil_img)
        pil_img = enhancer.enhance(1.06)

        # Color vibrance polish
        color_enhancer = ImageEnhance.Color(pil_img)
        pil_img = color_enhancer.enhance(1.05)

        # Gentle edge sharpness enhancement
        pil_img = pil_img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=45, threshold=3))
        return pil_img

    def generate_thumbnail(
        self,
        video_path: str,
        output_path: Optional[str] = None,
        hook_text: str = "",
        title: str = "",
        include_text_overlay: bool = False
    ) -> str:
        """
        Generates a 1080x1920 viral portrait thumbnail from the given video clip.
        Default is clean portrait keyframe (no text covering speaker's face).
        Saves high-quality JPEG to output_path and returns the absolute path.
        """
        vid_p = Path(video_path)
        if not vid_p.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        if not output_path:
            output_path = str(vid_p.parent / f"{vid_p.stem}_thumbnail.jpg")

        target_w, target_h = 1080, 1920
        frame_rgb, face_info = self._find_best_frame(str(vid_p))
        fh, fw = frame_rgb.shape[:2]

        target_ar = target_w / float(target_h)
        cur_ar = fw / float(fh)

        # Crop / reframe to perfect 9:16 vertical canvas
        if abs(cur_ar - target_ar) < 0.05:
            canvas_img = cv2.resize(frame_rgb, (target_w, target_h), interpolation=cv2.INTER_AREA)
        elif cur_ar > target_ar:
            # Horizontal / wide source: center horizontally on detected face
            crop_w = int(fh * target_ar)
            if crop_w % 2 != 0: crop_w -= 1
            if face_info:
                cx = face_info.get('center_x', fw / 2.0)
            else:
                cx = fw / 2.0

            x1 = max(0, min(fw - crop_w, int(round(cx - crop_w / 2.0))))
            cropped = frame_rgb[:, x1:x1 + crop_w]
            canvas_img = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)
        else:
            # Taller source: center vertically with headroom
            crop_h = int(fw / target_ar)
            if crop_h % 2 != 0: crop_h -= 1
            if face_info:
                cy = face_info.get('center_y', fh / 2.0)
                # Ensure 15% headroom above face
                y1 = max(0, min(fh - crop_h, int(round(cy - crop_h * 0.35))))
            else:
                y1 = max(0, min(fh - crop_h, (fh - crop_h) // 2))
            cropped = frame_rgb[y1:y1 + crop_h, :]
            canvas_img = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)

        pil_img = Image.fromarray(canvas_img)

        # Apply subtle cinematic enhancement (clarity, contrast, vibrant colors)
        pil_img = self._enhance_visuals(pil_img)

        # Only render text overlay if explicitly requested (e.g. by a specific banner template)
        if include_text_overlay and (hook_text or title):
            clean_text = (hook_text or title).strip().upper()
            words = clean_text.split()[:4]
            banner_text = " ".join(words)
            if banner_text:
                draw = ImageDraw.Draw(pil_img)
                font_size = 56
                font = None
                if self.font_path:
                    try:
                        font = ImageFont.truetype(self.font_path, font_size)
                    except Exception:
                        font = None
                if font is None:
                    font = ImageFont.load_default()

                # Clean pill badge at the bottom safe zone (never over the speaker's face)
                bbox = draw.textbbox((0, 0), banner_text, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                px, py = 32, 16
                badge_w = tw + px * 2
                badge_h = th + py * 2
                badge_x = (target_w - badge_w) // 2
                badge_y = target_h - badge_h - 140  # Safe above bottom controls

                # Draw rounded backdrop pill
                pill_layer = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
                p_draw = ImageDraw.Draw(pill_layer)
                p_draw.rounded_rectangle(
                    [badge_x, badge_y, badge_x + badge_w, badge_y + badge_h],
                    radius=20,
                    fill=(0, 0, 0, 210),
                    outline=(255, 230, 0, 180),
                    width=2
                )
                pil_img = Image.alpha_composite(pil_img.convert("RGBA"), pill_layer).convert("RGB")
                draw = ImageDraw.Draw(pil_img)
                draw.text((badge_x + px, badge_y + py), banner_text, font=font, fill=(255, 255, 255))

        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        pil_img.save(str(out_p), "JPEG", quality=96, optimize=True, subsampling=0)
        print(f"    [ThumbnailGenerator] Created high-quality 9:16 portrait thumbnail: {out_p.name}")

        return str(Path(output_path).resolve())