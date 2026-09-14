"""
ThumbnailGenerator Service - Automated Viral 9:16 Portrait Thumbnail Engine.
Extracts the highest-engagement speaker expression frame and composites high-contrast
two-color typography (Yellow / White) with outline strokes for YouTube Shorts and TikTok.
"""
import os
import sys
from pathlib import Path
from typing import Optional, Tuple, List
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

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
    Generates high-CTR 9:16 vertical thumbnails with bold headlines and facial expression anchoring.
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

    def _find_best_frame(self, video_path: str, num_samples: int = 8) -> Tuple[np.ndarray, Optional[Dict[str, Any]]]:
        """
        Scans sample frames across the video and picks the one with the highest-engagement
        facial clarity, eye-level framing, and visual contrast.
        """
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        duration = total_frames / fps if fps > 0 else 10.0

        sample_times = np.linspace(0.5, max(1.0, duration - 0.5), min(num_samples, max(4, int(duration * 2))))

        best_frame = None
        best_face = None
        highest_score = -1.0

        for t in sample_times:
            frame_idx = int(t * fps)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame_bgr = cap.read()
            if not ret or frame_bgr is None:
                continue

            frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
            h, w = frame_rgb.shape[:2]

            faces = self.face_tracker.detect_faces_in_frame(frame_rgb, frame_time=float(t))
            score = 0.0
            chosen_face = None

            if faces:
                primary_face = faces[0]
                chosen_face = primary_face
                conf = primary_face.get('confidence', 0.8)
                area = primary_face.get('area', 1000)
                cx = primary_face.get('center_x', w / 2)
                cy = primary_face.get('center_y', h / 2)

                centering_bonus = 1.0 - abs(cx - w / 2.0) / w
                eye_level_bonus = 1.0 - abs(cy - h * 0.40) / h
                score = (conf ** 2) * (area ** 0.4) * centering_bonus * eye_level_bonus * 100.0
            else:
                gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
                laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
                score = min(50.0, laplacian_var * 0.1)

            if score > highest_score or best_frame is None:
                highest_score = score
                best_frame = frame_rgb
                best_face = chosen_face

        cap.release()

        if best_frame is None:
            best_frame = np.zeros((1920, 1080, 3), dtype=np.uint8)

        return best_frame, best_face

    def _format_hook_lines(self, hook_text: str, fallback_title: str) -> List[List[Tuple[str, str]]]:
        """
        Splits hook text into two bold punchy lines with two-color tokens.
        Colors: 'yellow' (#FFE600) or 'white' (#FFFFFF).
        """
        text = (hook_text or "").strip()
        if not text or len(text.split()) < 2:
            clean_t = (fallback_title or "VIRAL MOMENT").strip()
            clean_t = "".join(c for c in clean_t if c.isalnum() or c in (" ", "?", "!")).upper()
            words = clean_t.split()[:4]
            text = " ".join(words)

        text = text.upper()
        words = text.split()

        lines = []
        if len(words) == 1:
            lines = [[(words[0], "yellow")]]
        elif len(words) == 2:
            lines = [[(words[0], "yellow"), (words[1], "white")]]
        elif len(words) == 3:
            lines = [
                [(words[0], "yellow"), (words[1], "white")],
                [(words[2], "white")]
            ]
        elif len(words) == 4:
            lines = [
                [(words[0], "yellow"), (words[1], "white")],
                [(words[2], "white"), (words[3], "white")]
            ]
        else:
            mid = max(2, len(words) // 2)
            l1_words = words[:mid]
            l2_words = words[mid:mid + 3]
            line1_tokens = [(l1_words[0], "yellow")] + [(w, "white") for w in l1_words[1:]]
            line2_tokens = [(w, "white") for w in l2_words]
            lines = [line1_tokens, line2_tokens]

        return lines

    def generate_thumbnail(
        self,
        video_path: str,
        output_path: Optional[str] = None,
        hook_text: str = "",
        title: str = ""
    ) -> str:
        """
        Generates a 1080x1920 viral portrait thumbnail from the given video clip.
        Saves JPEG to output_path and returns the absolute path.
        """
        vid_p = Path(video_path)
        if not vid_p.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        if not output_path:
            output_path = str(vid_p.parent / f"{vid_p.stem}_thumbnail.jpg")

        target_w, target_h = 1080, 1920

        frame_rgb, face_info = self._find_best_frame(str(vid_p))
        fh, fw = frame_rgb.shape[:2]

        target_ar = target_w / target_h
        cur_ar = fw / fh

        if abs(cur_ar - target_ar) < 0.05:
            canvas_img = cv2.resize(frame_rgb, (target_w, target_h), interpolation=cv2.INTER_AREA)
        elif cur_ar > target_ar:
            crop_w = int(fh * target_ar)
            if crop_w % 2 != 0: crop_w -= 1
            if face_info:
                cx = face_info.get('center_x', fw / 2)
            else:
                cx = fw / 2

            x1 = max(0, min(fw - crop_w, int(round(cx - crop_w / 2.0))))
            cropped = frame_rgb[:, x1:x1 + crop_w]
            canvas_img = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)
        else:
            crop_h = int(fw / target_ar)
            if crop_h % 2 != 0: crop_h -= 1
            y1 = max(0, min(fh - crop_h, (fh - crop_h) // 2))
            cropped = frame_rgb[y1:y1 + crop_h, :]
            canvas_img = cv2.resize(cropped, (target_w, target_h), interpolation=cv2.INTER_AREA)

        pil_img = Image.fromarray(canvas_img)

        # Ambient top vignette gradient for text legibility
        gradient = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(gradient)

        max_grad_y = 650
        for y in range(max_grad_y):
            factor = 1.0 - (y / float(max_grad_y))
            alpha = int(185 * (factor ** 1.35))
            g_draw.line([(0, y), (target_w, y)], fill=(10, 10, 15, alpha))

        pil_img = pil_img.convert("RGBA")
        pil_img = Image.alpha_composite(pil_img, gradient)

        lines_tokens = self._format_hook_lines(hook_text, title)

        font_size = 94
        font = None
        if self.font_path:
            try:
                font = ImageFont.truetype(self.font_path, font_size)
            except Exception:
                font = None

        if font is None:
            font = ImageFont.load_default()

        # Measure text layout
        dummy_img = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        dummy_draw = ImageDraw.Draw(dummy_img)

        line_layouts = []
        for line in lines_tokens:
            line_w = 0
            word_boxes = []
            for word, color_name in line:
                bbox = dummy_draw.textbbox((0, 0), word, font=font)
                w_width = bbox[2] - bbox[0]
                w_height = bbox[3] - bbox[1]
                word_boxes.append((word, color_name, w_width, w_height))
                line_w += w_width + 24
            line_w -= 24
            line_layouts.append((line_w, word_boxes))

        # Render soft Gaussian drop shadow on separate transparent layer
        shadow_layer = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(shadow_layer)

        base_y = 165
        line_spacing = font_size + 20

        # Pass 1: Draw black silhouettes on shadow layer
        for line_idx, (line_w, word_boxes) in enumerate(line_layouts):
            cur_x = (target_w - line_w) // 2
            cur_y = base_y + (line_idx * line_spacing)
            for word, _, w_width, _ in word_boxes:
                s_draw.text((cur_x, cur_y), word, font=font, fill=(0, 0, 0, 255), stroke_width=12, stroke_fill=(0, 0, 0, 255))
                cur_x += w_width + 24

        # Apply Gaussian blur to shadow layer for soft ambient depth
        from PIL import ImageFilter
        shadow_blurred = shadow_layer.filter(ImageFilter.GaussianBlur(radius=8))

        # Composite shadow layer onto main image with offset
        shadow_composite = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        shadow_composite.paste(shadow_blurred, (5, 7))
        pil_img = Image.alpha_composite(pil_img, shadow_composite)

        # Pass 2: Draw crisp stroked text
        text_layer = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        t_draw = ImageDraw.Draw(text_layer)

        for line_idx, (line_w, word_boxes) in enumerate(line_layouts):
            cur_x = (target_w - line_w) // 2
            cur_y = base_y + (line_idx * line_spacing)
            for word, color_name, w_width, _ in word_boxes:
                fill_color = (255, 230, 0, 255) if color_name == "yellow" else (255, 255, 255, 255)
                t_draw.text((cur_x, cur_y), word, font=font, fill=fill_color, stroke_width=7, stroke_fill=(0, 0, 0, 255))
                cur_x += w_width + 24

        pil_img = Image.alpha_composite(pil_img, text_layer)

        final_rgb = pil_img.convert("RGB")
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        final_rgb.save(str(out_p), "JPEG", quality=95, optimize=True)
        print(f"    [ThumbnailGenerator] Created viral 9:16 thumbnail: {out_p.name}")

        return str(Path(output_path).resolve())