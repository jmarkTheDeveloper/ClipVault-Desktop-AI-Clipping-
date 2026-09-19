"""
FaceTracker Service - High-Precision Neural Face Tracking & Rock-Solid 9:16 Framing.
Combines MediaPipe TFLite Neural Detector, OpenCV Frontal/Profile Cascades, and HOG Body Detectors
with a Zero-Jitter Tripod Deadzone Steadicam Algorithm.
"""
import sys
import os
import builtins
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import cv2
import numpy as np

os.environ["PYTHONIOENCODING"] = "utf-8"

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

_original_builtin_print = builtins.print
def _safe_system_print(*args, **kwargs):
    try:
        _original_builtin_print(*args, **kwargs)
    except Exception:
        try:
            cleaned = [str(a).encode('ascii', errors='backslashreplace').decode('ascii') for a in args]
            _original_builtin_print(*cleaned, **kwargs)
        except Exception:
            pass
builtins.print = _safe_system_print

# MediaPipe Tasks (TFLite) Neural Detector
mp_face_detector = None
try:
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    import mediapipe as mp
    
    model_path = Path(__file__).parent.parent / "models" / "blaze_face_short_range.tflite"
    if model_path.exists():
        base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
        options = mp_vision.FaceDetectorOptions(base_options=base_options, min_detection_confidence=0.25)
        mp_face_detector = mp_vision.FaceDetector.create_from_options(options)
        try:
            print(">> Initialized MediaPipe Neural Face Detector (TFLite, Low-Threshold Sensitive)")
        except Exception:
            pass
except Exception:
    mp_face_detector = None


try:
    from services.subject_tracker import SubjectTracker
    from services.temporal_tracker import TemporalTracker
    from services.virtual_camera import VirtualCamera
    from services.quality_engine import QualityEngine
    from services.diagnostics import DiagnosticsVisualizer
except ImportError:
    try:
        from subject_tracker import SubjectTracker
        from temporal_tracker import TemporalTracker
        from virtual_camera import VirtualCamera
        from quality_engine import QualityEngine
        from diagnostics import DiagnosticsVisualizer
    except ImportError:
        from engine.services.subject_tracker import SubjectTracker
        from engine.services.temporal_tracker import TemporalTracker
        from engine.services.virtual_camera import VirtualCamera
        from engine.services.quality_engine import QualityEngine
        from engine.services.diagnostics import DiagnosticsVisualizer


class FaceTracker:
    """
    Tracks human faces, side profiles, and speakers with zero-jitter tripod stability,
    with automatic delegation to SubjectTracker when no faces are detected.
    """
    def __init__(self):
        self.face_cache: Dict[float, List[Dict[str, Any]]] = {}
        self.mp_detector = mp_face_detector
        self.subject_tracker = SubjectTracker()
        
        # Load OpenCV Frontal & Profile Cascades
        self.frontal_cascade = None
        self.profile_cascade = None
        
        models_dir = Path(__file__).parent.parent / "models"
        frontal_path = models_dir / "haarcascade_frontalface_default.xml"
        profile_path = models_dir / "haarcascade_profileface.xml"
        
        if not frontal_path.exists() and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
            fallback_frontal = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
            if fallback_frontal.exists():
                frontal_path = fallback_frontal

        if frontal_path.exists():
            try:
                self.frontal_cascade = cv2.CascadeClassifier(str(frontal_path))
                if self.frontal_cascade.empty(): self.frontal_cascade = None
            except Exception: pass
            
        if profile_path.exists():
            try:
                self.profile_cascade = cv2.CascadeClassifier(str(profile_path))
                if self.profile_cascade.empty(): self.profile_cascade = None
            except Exception: pass
            
        # Initialize OpenCV YuNet Neural Face Detector (Extreme Profiles & Landmarks)
        self.yunet_detector = None
        yunet_path = models_dir / "face_detection_yunet.onnx"
        if yunet_path.exists() and hasattr(cv2, 'FaceDetectorYN'):
            try:
                self.yunet_detector = cv2.FaceDetectorYN.create(
                    str(yunet_path), "", (320, 320),
                    score_threshold=0.28,
                    nms_threshold=0.30,
                    top_k=5000
                )
            except Exception:
                self.yunet_detector = None

        # Initialize OpenCV HOG Body / Person Detector
        try:
            self.hog_detector = cv2.HOGDescriptor()
            self.hog_detector.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        except Exception:
            self.hog_detector = None

        try:
            print(f">> Computer Vision Pipeline: YuNet={self.yunet_detector is not None}, MediaPipe={self.mp_detector is not None}, Cascades={self.frontal_cascade is not None}, HOG={self.hog_detector is not None}, SubjectTracker=True")
        except Exception:
            pass

    def _get_skin_ratio(self, rgb_frame: np.ndarray, x: int, y: int, bw: int, bh: int) -> float:
        """
        Calculates ratio of human skin/flesh pixels within a bounding box using HSV chroma ranges.
        Filters out false positives on inanimate objects (bookshelves, lamps, furniture, wallpaper).
        """
        h, w = rgb_frame.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w, x + bw), min(h, y + bh)
        if x2 <= x1 or y2 <= y1:
            return 0.0
        patch = rgb_frame[y1:y2, x1:x2]
        try:
            hsv = cv2.cvtColor(patch, cv2.COLOR_RGB2HSV)
            m1 = cv2.inRange(hsv, np.array([0, 20, 35]), np.array([25, 255, 255]))
            m2 = cv2.inRange(hsv, np.array([170, 20, 35]), np.array([180, 255, 255]))
            mask = cv2.bitwise_or(m1, m2)
            total_pixels = patch.shape[0] * patch.shape[1]
            return float(np.sum(mask > 0)) / float(total_pixels) if total_pixels > 0 else 0.0
        except Exception:
            return 0.0

    def _compute_human_presence_centroid_x(self, rgb_small: np.ndarray, orig_w: int) -> Optional[float]:
        """
        Locates the horizontal centroid of human skin and flesh tones across the frame.
        Guarantees that when humans are in the scene, the camera focuses on the person
        rather than background furniture, bookshelves, or static objects.
        """
        try:
            hsv = cv2.cvtColor(rgb_small, cv2.COLOR_RGB2HSV)
            m1 = cv2.inRange(hsv, np.array([0, 20, 35]), np.array([25, 255, 255]))
            m2 = cv2.inRange(hsv, np.array([170, 20, 35]), np.array([180, 255, 255]))
            skin_mask = cv2.bitwise_or(m1, m2)
            col_sums = np.sum(skin_mask > 0, axis=0)
            total_skin = np.sum(col_sums)
            if total_skin > (rgb_small.shape[0] * 3):
                smooth_skin = cv2.GaussianBlur(col_sums.astype(np.float32).reshape(1, -1), (1, 15), 0)[0]
                peak_idx = int(np.argmax(smooth_skin))
                return (peak_idx / len(col_sums)) * orig_w
        except Exception:
            pass
        return None

    def detect_faces_in_frame(self, frame: np.ndarray, frame_time: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Detects faces or speakers in a frame using a robust multi-model detection pipeline:
        MediaPipe neural detector, Frontal Haar cascade, Bidirectional (left/right) Profile Haar cascades,
        and Seated Upper-Body skin-cluster analysis.
        Note: MoviePy frames are already in RGB format.
        """
        if frame_time is not None and frame_time in self.face_cache:
            return self.face_cache[frame_time]

        if frame.dtype != np.uint8:
            frame = np.clip(frame, 0, 255).astype(np.uint8)
        frame = np.ascontiguousarray(frame)

        h, w = frame.shape[:2]
        max_dim = 960
        if max(h, w) > max_dim:
            scale = max_dim / float(max(h, w))
            small_w = int(w * scale)
            small_h = int(h * scale)
            small_frame = cv2.resize(frame, (small_w, small_h), interpolation=cv2.INTER_AREA)
        else:
            scale = 1.0
            small_frame = frame.copy()
            small_h, small_w = h, w

        candidate_detections: List[Dict[str, Any]] = []

        # ── TIER 1: OpenCV YuNet Neural Face Detector (Extreme Profiles, Walking, Landmarks) ──
        if self.yunet_detector is not None:
            try:
                self.yunet_detector.setInputSize((small_w, small_h))
                bgr_small = cv2.cvtColor(small_frame, cv2.COLOR_RGB2BGR)
                _, yunet_faces = self.yunet_detector.detect(bgr_small)
                if yunet_faces is not None:
                    for det in yunet_faces:
                        box_x, box_y, box_w, box_h = int(det[0]), int(det[1]), int(det[2]), int(det[3])
                        conf = float(det[14])
                        if conf < 0.25 or box_w < 12 or box_h < 12:
                            continue
                        orig_x = int(box_x / scale)
                        orig_y = int(box_y / scale)
                        orig_w = int(box_w / scale)
                        orig_h = int(box_h / scale)
                        center_x = max(0, min(w, orig_x + orig_w // 2))
                        center_y = max(0, min(h, orig_y + orig_h // 2))

                        # Landmarks: det[10..13] right and left mouth corners
                        rx, ry = int(det[10] / scale), int(det[11] / scale)
                        lx, ly = int(det[12] / scale), int(det[13] / scale)

                        candidate_detections.append({
                            'center_x': center_x,
                            'center_y': center_y,
                            'width': orig_w,
                            'height': orig_h,
                            'confidence': float(conf),
                            'area': orig_w * orig_h,
                            'type': 'yunet_neural',
                            'mouth_center_y': (ry + ly) // 2,
                            'mouth_span': abs(rx - lx)
                        })
            except Exception:
                pass

        # ── TIER 2: MediaPipe Neural Face Detector (TFLite) ──
        if self.mp_detector is not None:
            try:
                rgb_small = np.ascontiguousarray(small_frame)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_small)
                detection_result = self.mp_detector.detect(mp_img)
                if detection_result.detections:
                    for det in detection_result.detections:
                        bb = det.bounding_box
                        x = int(bb.origin_x / scale)
                        y = int(bb.origin_y / scale)
                        box_w = int(bb.width / scale)
                        box_h = int(bb.height / scale)
                        score = det.categories[0].score if det.categories else 0.9
                        
                        center_x = max(0, min(w, x + box_w // 2))
                        center_y = max(0, min(h, y + box_h // 2))
                        candidate_detections.append({
                            'center_x': center_x,
                            'center_y': center_y,
                            'width': box_w,
                            'height': box_h,
                            'confidence': float(score),
                            'area': box_w * box_h,
                            'type': 'mediapipe'
                        })
            except Exception:
                pass

        # Prepare grayscale and equalized frames for OpenCV cascades
        gray = cv2.cvtColor(small_frame, cv2.COLOR_RGB2GRAY)
        gray_eq = cv2.equalizeHist(gray)
        gray_flipped = cv2.flip(gray_eq, 1)

        # ── TIER 3: Frontal Haar Cascade ──
        if self.frontal_cascade is not None:
            try:
                detected_frontal = self.frontal_cascade.detectMultiScale(
                    gray_eq, scaleFactor=1.12, minNeighbors=4, minSize=(26, 26)
                )
                for (sx, sy, sw, sh) in detected_frontal:
                    orig_x = int(sx / scale)
                    orig_y = int(sy / scale)
                    orig_w = int(sw / scale)
                    orig_h = int(sh / scale)
                    candidate_detections.append({
                        'center_x': orig_x + orig_w // 2,
                        'center_y': orig_y + orig_h // 2,
                        'width': orig_w,
                        'height': orig_h,
                        'confidence': 0.78,
                        'area': orig_w * orig_h,
                        'type': 'frontal_haar'
                    })
            except Exception:
                pass

        # ── TIER 4: Bidirectional Profile Haar Cascade (Both Left & Right Facing Profiles) ──
        if self.profile_cascade is not None:
            try:
                # 4A: Left-facing profiles (standard orientation)
                detected_left = self.profile_cascade.detectMultiScale(
                    gray_eq, scaleFactor=1.10, minNeighbors=3, minSize=(26, 26)
                )
                for (sx, sy, sw, sh) in detected_left:
                    orig_x = int(sx / scale)
                    orig_y = int(sy / scale)
                    orig_w = int(sw / scale)
                    orig_h = int(sh / scale)
                    candidate_detections.append({
                        'center_x': orig_x + orig_w // 2,
                        'center_y': orig_y + orig_h // 2,
                        'width': orig_w,
                        'height': orig_h,
                        'confidence': 0.75,
                        'area': orig_w * orig_h,
                        'type': 'profile_haar_left'
                    })

                # 4B: Right-facing profiles (horizontally flipped orientation)
                detected_right = self.profile_cascade.detectMultiScale(
                    gray_flipped, scaleFactor=1.10, minNeighbors=3, minSize=(26, 26)
                )
                for (fx, fy, fw, fh) in detected_right:
                    sx = small_w - (fx + fw)
                    orig_x = int(sx / scale)
                    orig_y = int(fy / scale)
                    orig_w = int(fw / scale)
                    orig_h = int(fh / scale)
                    candidate_detections.append({
                        'center_x': orig_x + orig_w // 2,
                        'center_y': orig_y + orig_h // 2,
                        'width': orig_w,
                        'height': orig_h,
                        'confidence': 0.75,
                        'area': orig_w * orig_h,
                        'type': 'profile_haar_right'
                    })
            except Exception:
                pass

        # ── TIER 5: Full-Body / Upper-Body Person Detector (Foreground Dominance) ──
        # Enforces a strict Foreground Dominance filter to lock onto human subjects
        # while discarding distant pedestrians and architectural structures.
        if len(candidate_detections) == 0 and self.hog_detector is not None:
            try:
                rects, weights = self.hog_detector.detectMultiScale(
                    small_frame, winStride=(8, 8), padding=(4, 4), scale=1.05
                )
                for (sx, sy, sw, sh), wgt in zip(rects, weights):
                    orig_h = int(sh / scale)
                    # FOREGROUND DOMINANCE FILTER:
                    # In street vlogs or interviews, main subjects occupy >= 25% of frame height.
                    # Distant pedestrians in background occupy < 20% of frame height.
                    if orig_h < (h * 0.25) or wgt < 0.20:
                        continue

                    orig_x = int(sx / scale)
                    orig_y = int(sy / scale)
                    orig_w = int(sw / scale)

                    # Compute head position and head bounding box from upper body
                    head_cx = orig_x + orig_w // 2
                    head_cy = orig_y + int(orig_h * 0.16)
                    head_w = int(orig_w * 0.45)
                    head_h = int(orig_h * 0.25)

                    candidate_detections.append({
                        'center_x': max(0, min(w, head_cx)),
                        'center_y': max(0, min(h, head_cy)),
                        'width': head_w,
                        'height': head_h,
                        'confidence': float(wgt) * 0.88,
                        'area': head_w * head_h,
                        'type': 'hog_person',
                        'body_height': orig_h
                    })
            except Exception:
                pass

        # Filter out false-positive non-face detections
        valid_faces = []
        for f in candidate_detections:
            # 1. Human faces must be in the upper/middle portion of the frame
            if f['center_y'] > h * 0.85:
                continue
            # Ceiling rejection: Objects with face centers in the extreme top 10% of the frame
            # are ceiling fixtures, hanging portraits/paintings, banners, or wall art.
            if f['center_y'] < h * 0.10 and f['height'] < h * 0.30:
                continue
            # 2. Bounding box cannot take up more than 68% width or 75% height of the entire frame.
            # Close-up talking-head shots can have very large face boxes — allow them through.
            if f['width'] > w * 0.68 or f['height'] > h * 0.75 or f['area'] > (w * h * 0.45):
                continue
            # 3. Minimum size to avoid single-pixel noise
            if f['width'] < 12 or f['height'] < 12 or f['area'] < 150:
                continue

            # 4. Biological human skin-tone verification to eliminate background furniture & lanterns.
            # Note: Studio/cool lighting and dark skin tones produce lower HSV skin saturation,
            # so thresholds are kept permissive for neural detectors which already have high precision.
            bx = f['center_x'] - f['width'] // 2
            by = f['center_y'] - f['height'] // 2
            skin_ratio = self._get_skin_ratio(frame, bx, by, f['width'], f['height'])
            f['skin_ratio'] = skin_ratio

            # Cascade and HOG detectors lack deep semantic reasoning and frequently trigger
            # false positives on bookshelves, lanterns, wallpaper, and boxes.
            # Enforce biological skin-chroma threshold (>= 8%).
            if f['type'] in ('frontal_haar', 'profile_haar_left', 'profile_haar_right', 'hog_person'):
                if skin_ratio < 0.08:
                    continue
            else:
                # Neural detectors (YuNet, MediaPipe) have high semantic precision.
                # Only reject objects with near-zero skin signal (< 1.5%) — catches lamps, shelves.
                # Dark skin tones and studio-lit speakers can read as low as 2-4% in the HSV range.
                if skin_ratio < 0.015:
                    continue

            valid_faces.append(f)

        # Spatial Non-Maximum Suppression: merge overlapping boxes belonging to the same person
        merged_faces: List[Dict[str, Any]] = []
        sorted_candidates = sorted(valid_faces, key=lambda x: x['confidence'], reverse=True)
        for cand in sorted_candidates:
            is_dup = False
            for existing in merged_faces:
                dx = abs(cand['center_x'] - existing['center_x'])
                dy = abs(cand['center_y'] - existing['center_y'])
                # If centers are within 25% of candidate box dimensions, treat as same person
                if dx < max(cand['width'], existing['width']) * 0.65 and dy < max(cand['height'], existing['height']) * 0.65:
                    is_dup = True
                    break
            if not is_dup:
                merged_faces.append(cand)

        if merged_faces:
            # Rank faces favoring foreground subjects at human eye level
            def face_rank(f):
                dist = abs(f['center_y'] - h * 0.38) / (h * 0.45)
                eye_penalty = max(0.15, 1.0 - dist ** 2)
                area_ratio = f['area'] / float(w * h)
                return f['confidence'] * (area_ratio ** 0.65) * eye_penalty

            result = sorted(merged_faces, key=face_rank, reverse=True)
        else:
            result = []

        # Extract mouth ROI patch for active speech / lip-motion detection
        for f in result:
            my1 = max(0, min(h - 1, int(f['center_y'] + f['height'] * 0.10)))
            my2 = max(0, min(h, int(f['center_y'] + f['height'] * 0.55)))
            mx1 = max(0, min(w - 1, int(f['center_x'] - f['width'] * 0.30)))
            mx2 = max(0, min(w, int(f['center_x'] + f['width'] * 0.30)))
            if my2 > my1 + 4 and mx2 > mx1 + 4:
                try:
                    m_crop = frame[my1:my2, mx1:mx2]
                    f['mouth_roi'] = cv2.resize(cv2.cvtColor(m_crop, cv2.COLOR_RGB2GRAY), (32, 20))
                except Exception:
                    pass

        if frame_time is not None:
            self.face_cache[frame_time] = result
        return result

    def get_speaker_anchors(self, clip, max_samples: int = 20) -> Tuple[Optional[float], Optional[float]]:
        """
        Scans clip sample frames to identify primary and secondary horizontal speaker anchors.
        Returns (speaker_left_x, speaker_right_x) if 2 distinct speakers exist, or (speaker_x, None) if solo.
        """
        width, height = clip.size
        sample_times = np.linspace(0.1, max(0.2, clip.duration - 0.1), max(5, min(max_samples, int(clip.duration * 2))))
        all_face_xs = []

        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                dets = self.detect_faces_in_frame(frame, frame_time=t)
                for d in dets:
                    dist = abs(d['center_y'] - height * 0.38) / (height * 0.45)
                    eye_penalty = max(0.15, 1.0 - dist ** 2)
                    area_ratio = d['area'] / float(width * height)
                    all_face_xs.append((d['center_x'], d['confidence'] * (area_ratio ** 0.65) * eye_penalty))
            except Exception:
                continue

        if not all_face_xs:
            return None, None

        xs = np.array([x for x, wgt in all_face_xs], dtype=np.float64)
        weights = np.array([wgt for x, wgt in all_face_xs], dtype=np.float64)

        nbins = max(8, int(width // 80))
        hist, bin_edges = np.histogram(xs, bins=nbins, weights=weights, range=(0, width))
        peak_indices = np.argsort(hist)[::-1]
        total_mass = np.sum(hist) if np.sum(hist) > 0 else 1.0

        clusters = []
        for idx in peak_indices:
            if hist[idx] >= total_mass * 0.18:
                approx_peak = (bin_edges[idx] + bin_edges[idx + 1]) / 2.0
                in_mask = np.abs(xs - approx_peak) < (width * 0.20)
                if np.any(in_mask):
                    true_center = float(np.average(xs[in_mask], weights=weights[in_mask]))
                else:
                    true_center = approx_peak

                if not any(abs(true_center - c) < width * 0.22 for c in clusters):
                    clusters.append(true_center)
                    if len(clusters) >= 2:
                        break

        if len(clusters) >= 2:
            return min(clusters[0], clusters[1]), max(clusters[0], clusters[1])
        elif len(clusters) == 1:
            return clusters[0], None
        return None, None

    @staticmethod
    def render_wide_zoom_frame(frame: np.ndarray, target_w: int, target_h: int) -> np.ndarray:
        """
        Renders an elegant 9:16 'Zoom-Out' two-shot / group shot showing interacting speakers.
        Fits the wide 16:9 frame horizontally with sleek blurred & dimmed background fill.
        """
        H, W = frame.shape[:2]
        scale = target_w / W
        scaled_h = int(H * scale)
        if scaled_h % 2 != 0:
            scaled_h -= 1

        fg = cv2.resize(frame, (target_w, scaled_h))

        # Blurred background
        bg_scale = max(target_w / W, target_h / H)
        bg_w = int(W * bg_scale)
        bg_h = int(H * bg_scale)
        bg = cv2.resize(frame, (bg_w, bg_h))
        bx = max(0, (bg_w - target_w) // 2)
        by = max(0, (bg_h - target_h) // 2)
        bg_cropped = bg[by:by + target_h, bx:bx + target_w]

        # Fast 2-pass blur
        small_w = max(16, target_w // 8)
        small_h = max(16, target_h // 8)
        bg_small = cv2.resize(bg_cropped, (small_w, small_h))
        bg_small = cv2.GaussianBlur(bg_small, (15, 15), 0)
        bg_blurred = cv2.resize(bg_small, (target_w, target_h))
        bg_dimmed = (bg_blurred * 0.55).astype(np.uint8)

        # Composite foreground in the vertical center
        y_off = max(0, (target_h - scaled_h) // 2)
        bg_dimmed[y_off:y_off + scaled_h, 0:target_w] = fg
        return bg_dimmed

    def track_and_crop(
        self,
        clip,
        crop_ratio: float = 9/16,
        camera_style: str = "instant",
        adaptive_crop: bool = True,
        max_digital_zoom: float = 1.35,
        min_crop_margin: float = 0.30,
        diagnostic_mode: bool = False,
        scene_cut_times: Optional[List[float]] = None,
        target_resolution: Optional[Tuple[int, int]] = None
    ):
        """
        AI Virtual Camera Director with Temporal Tracking & Quality-Aware Cropping.
        Utilizes Kalman multi-object state estimation, ByteTrack association,
        deadzone filtering, and kinematic spring smoothing.
        """
        width, height = clip.size
        base_crop_w = int(height * crop_ratio)
        if base_crop_w % 2 != 0: base_crop_w -= 1

        if width <= base_crop_w and not diagnostic_mode:
            return clip

        self.face_cache = {}

        # Sample clip frames to perform multi-model detection and temporal tracking
        fps_sample = 6
        num_samples = max(6, int(clip.duration * fps_sample))
        sample_times = np.linspace(0.05, max(0.1, clip.duration - 0.05), num_samples)

        temporal_tracker = TemporalTracker(max_age=int(fps_sample * 2.5), min_hits=2)
        virtual_cam = VirtualCamera(
            width, height, aspect_ratio=crop_ratio,
            camera_style=camera_style,
            deadzone_ratio=0.12 if camera_style == "snappy" else (0.18 if camera_style == "smooth" else 0.16),
            pan_speed=400.0 if camera_style == "snappy" else (240.0 if camera_style == "smooth" else 350.0),
            fps=float(fps_sample)
        )

        all_timeline_data = []
        prev_faces = []
        found_any_human = False
        prev_primary_id = None

        prev_sample_hist = None
        for t in sample_times:
            try:
                frame = clip.get_frame(t)

                # Fast visual scene cut detection via normalized 2D HSV chromatic histogram comparison
                is_visual_cut = False
                try:
                    small_hsv = cv2.cvtColor(cv2.resize(frame, (80, 80), interpolation=cv2.INTER_NEAREST), cv2.COLOR_RGB2HSV)
                    hist = cv2.calcHist([small_hsv], [0, 1], None, [12, 12], [0, 180, 0, 256])
                    cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                    if prev_sample_hist is not None:
                        hist_diff = cv2.compareHist(prev_sample_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
                        if hist_diff > 0.40:
                            is_visual_cut = True
                    prev_sample_hist = hist
                except Exception:
                    pass

                # If visual cut detected, reset temporal tracker so predictions don't carry over from previous angle
                if is_visual_cut:
                    temporal_tracker.reset()

                detected = self.detect_faces_in_frame(frame, frame_time=t)
                if detected:
                    for f in detected:
                        best_motion = 0.0
                        if 'mouth_roi' in f and prev_faces:
                            closest_prev = min(prev_faces, key=lambda pf: abs(pf['center_x'] - f['center_x']) + abs(pf['center_y'] - f['center_y']))
                            if 'mouth_roi' in closest_prev and abs(closest_prev['center_x'] - f['center_x']) < width * 0.35:
                                diff = np.mean(cv2.absdiff(f['mouth_roi'], closest_prev['mouth_roi']))
                                best_motion = float(diff)
                        f['mouth_motion'] = best_motion
                    prev_faces = detected
                else:
                    prev_faces = []

                tracks = temporal_tracker.update(detected, width, height)
                primary_track = tracks[0] if tracks else None
                if primary_track:
                    found_any_human = True

                # Determine if a visual scene cut, scene boundary, or confirmed speaker switch occurred
                is_scene_boundary = is_visual_cut or bool(scene_cut_times and any(abs(t - ct) < (0.5 / fps_sample) for ct in scene_cut_times))
                is_speaker_switch = bool(prev_primary_id is not None and primary_track and primary_track["track_id"] != prev_primary_id)
                is_cut = is_scene_boundary or (is_speaker_switch and camera_style == "instant")

                if primary_track:
                    prev_primary_id = primary_track["track_id"]

                # Calculate target crop
                tcx, tcy, tcw, tch = virtual_cam.calculate_target_crop(
                    primary_track, tracks, min_margin_pct=min_crop_margin, max_digital_zoom=max_digital_zoom
                )

                if adaptive_crop:
                    tw = target_resolution[0] if target_resolution else int(tch * crop_ratio)
                    th = target_resolution[1] if target_resolution else int(tch)
                    tcw, tch = QualityEngine.adjust_crop_for_quality(
                        int(tcw), int(tch), tw, th, width, height,
                        max_digital_zoom=max_digital_zoom, aspect_ratio=crop_ratio
                    )

                crop_rect = virtual_cam.update(tcx, tcy, tcw, tch, is_scene_cut=is_cut)

                # Quality evaluation
                tw = target_resolution[0] if target_resolution else int(crop_rect[3] * crop_ratio)
                th = target_resolution[1] if target_resolution else crop_rect[3]
                q_eval = QualityEngine.evaluate_quality(width, height, crop_rect[2], crop_rect[3], tw, th)

                all_timeline_data.append({
                    "t": t,
                    "crop_rect": crop_rect,
                    "tracks": tracks,
                    "primary_track": primary_track,
                    "is_cut": is_cut,
                    "quality_eval": q_eval
                })
            except Exception:
                pass

        if not found_any_human:
            # ── Skin-Tone Centroid Rescue ──
            # Before giving up and using saliency-based SubjectTracker (which locks onto background),
            # try to locate the human via their skin-tone column centroid across sampled frames.
            # This handles cases where all face detectors fire but get filtered out (e.g., partial occlusion,
            # unusual lighting, or a distant speaker whose face is below minimum pixel size).
            print("    [FaceTracker] 0 human tracks detected. Attempting skin-tone centroid rescue before SubjectTracker...")
            try:
                skin_rescue_xs = []
                rescue_sample_times = np.linspace(0.08, max(0.1, clip.duration - 0.08), min(8, max(4, int(clip.duration * 2))))
                for rt in rescue_sample_times:
                    try:
                        rescue_frame = clip.get_frame(rt)
                        if rescue_frame.dtype != np.uint8:
                            rescue_frame = np.clip(rescue_frame, 0, 255).astype(np.uint8)
                        rs_h, rs_w = rescue_frame.shape[:2]
                        # Downsample for fast skin detection
                        scale = 320.0 / max(rs_h, rs_w)
                        small_rescue = cv2.resize(rescue_frame, (int(rs_w * scale), int(rs_h * scale)), interpolation=cv2.INTER_AREA)
                        cx_skin = self._compute_human_presence_centroid_x(small_rescue, rs_w)
                        if cx_skin is not None:
                            skin_rescue_xs.append(cx_skin)
                    except Exception:
                        continue

                if skin_rescue_xs and len(skin_rescue_xs) >= 2:
                    # Cluster skin centroid estimates — if they cluster tightly, use the median
                    xs_arr = np.array(skin_rescue_xs)
                    med_x = float(np.median(xs_arr))
                    agree = sum(1 for x in xs_arr if abs(x - med_x) < width * 0.22)
                    if agree >= max(2, len(skin_rescue_xs) // 2):
                        print(f"    [FaceTracker] Skin centroid rescue: locking crop to x={med_x:.0f} ({agree}/{len(skin_rescue_xs)} frames agree)")
                        # Build a fixed static crop centered on the skin centroid
                        crop_w = int(height * crop_ratio)
                        if crop_w % 2 != 0: crop_w -= 1
                        crop_w = min(width, crop_w)
                        x1_rescue = max(0, min(width - crop_w, int(round(med_x - crop_w / 2.0))))
                        if x1_rescue % 2 != 0: x1_rescue = max(0, x1_rescue - 1)

                        final_out_w = crop_w
                        final_out_h = height
                        if final_out_w % 2 != 0: final_out_w -= 1
                        if final_out_h % 2 != 0: final_out_h -= 1

                        def skin_rescue_filter(get_frame, t):
                            frame = get_frame(t)
                            patch = frame[:, x1_rescue:x1_rescue + crop_w]
                            if patch.shape[1] != final_out_w or patch.shape[0] != final_out_h:
                                return cv2.resize(patch, (final_out_w, final_out_h), interpolation=cv2.INTER_LANCZOS4)
                            return patch

                        rescued_clip = clip.fl(skin_rescue_filter, apply_to=["mask"])
                        rescued_clip.size = (final_out_w, final_out_h)
                        return rescued_clip
            except Exception as rescue_err:
                print(f"    [FaceTracker] Skin rescue notice: {rescue_err}")

            print("    [FaceTracker] Skin rescue insufficient. Engaging general-purpose SubjectTracker...")
            try:
                return self.subject_tracker.track_and_crop(clip, crop_ratio=crop_ratio, camera_style=camera_style)
            except Exception as st_err:
                print(f"    [FaceTracker] SubjectTracker notice: {st_err}")

        if not all_timeline_data:
            return clip

        # ── Shot Segment Post-Processing & Tripod Stabilization ──
        # Group timeline keyframes into stable broadcast shot segments
        segments = []
        current_seg = []
        for item in all_timeline_data:
            if current_seg and item.get("is_cut", False):
                segments.append(current_seg)
                current_seg = []
            current_seg.append(item)
        if current_seg:
            segments.append(current_seg)

        if camera_style == "instant":
            # True Broadcast Multi-Camera Studio Behavior:
            # Every shot segment is 100.0% LOCKED on a static tripod.
            # Zero micro-creeping, zero 6-FPS stair-stepping, zero roughness.
            # When switching speakers or scenes, the camera cuts instantly in 0.0 seconds.
            for seg in segments:
                med_x1 = float(np.median([it["crop_rect"][0] for it in seg]))
                med_y1 = float(np.median([it["crop_rect"][1] for it in seg]))
                med_cw = float(np.median([it["crop_rect"][2] for it in seg]))
                med_ch = float(np.median([it["crop_rect"][3] for it in seg]))
                for it in seg:
                    it["crop_rect"] = (med_x1, med_y1, med_cw, med_ch)
        else:
            # Smooth / Snappy Steadi-Cam Mode:
            # 1. Deadzone: If movement within a segment is small (< 5% width), lock to tripod to eliminate jitter.
            # 2. Gaussian temporal smoothing: eliminates piecewise-linear kinks and creates buttery fluid pans.
            raw_x1 = np.array([it["crop_rect"][0] for it in all_timeline_data], dtype=np.float64)
            raw_y1 = np.array([it["crop_rect"][1] for it in all_timeline_data], dtype=np.float64)
            raw_cw = np.array([it["crop_rect"][2] for it in all_timeline_data], dtype=np.float64)
            raw_ch = np.array([it["crop_rect"][3] for it in all_timeline_data], dtype=np.float64)

            stable_x1 = raw_x1.copy()
            stable_y1 = raw_y1.copy()
            idx_start = 0
            for seg in segments:
                seg_len = len(seg)
                idx_end = idx_start + seg_len
                seg_x = raw_x1[idx_start:idx_end]
                if np.std(seg_x) < (width * 0.05):
                    stable_x1[idx_start:idx_end] = np.median(seg_x)
                    stable_y1[idx_start:idx_end] = np.median(raw_y1[idx_start:idx_end])
                idx_start = idx_end

            kernel_size = 5 if camera_style == "snappy" else 9
            if len(stable_x1) >= kernel_size:
                sigma = 1.2 if camera_style == "snappy" else 2.0
                k = cv2.getGaussianKernel(kernel_size, sigma).flatten()
                padded_x = np.pad(stable_x1, (kernel_size // 2, kernel_size // 2), mode='edge')
                padded_y = np.pad(stable_y1, (kernel_size // 2, kernel_size // 2), mode='edge')
                smoothed_x1 = np.convolve(padded_x, k, mode='valid')
                smoothed_y1 = np.convolve(padded_y, k, mode='valid')
            else:
                smoothed_x1 = stable_x1
                smoothed_y1 = stable_y1

            for i, it in enumerate(all_timeline_data):
                it["crop_rect"] = (float(smoothed_x1[i]), float(smoothed_y1[i]), float(raw_cw[i]), float(raw_ch[i]))

        # Timeline keyframe arrays
        t_keys = np.array([item["t"] for item in all_timeline_data], dtype=np.float64)
        x1_keys = np.array([item["crop_rect"][0] for item in all_timeline_data], dtype=np.float64)
        y1_keys = np.array([item["crop_rect"][1] for item in all_timeline_data], dtype=np.float64)
        cw_keys = np.array([item["crop_rect"][2] for item in all_timeline_data], dtype=np.float64)
        ch_keys = np.array([item["crop_rect"][3] for item in all_timeline_data], dtype=np.float64)

        final_out_w = int(round(float(np.median(cw_keys))))
        final_out_h = int(round(float(np.median(ch_keys))))
        if final_out_w % 2 != 0: final_out_w -= 1
        if final_out_h % 2 != 0: final_out_h -= 1

        print(
            f"    [FaceTracker] Temporal Virtual Camera Active ({len(t_keys)} keyframes) | "
            f"Aspect: {crop_ratio:.3f} | Style: {camera_style} | Adaptive Crop: {adaptive_crop} | Diagnostics: {diagnostic_mode}"
        )

        def virtual_camera_filter(get_frame, t):
            frame = get_frame(t)
            if camera_style == "instant":
                idx = int(np.searchsorted(t_keys, t, side="right")) - 1
                idx = max(0, min(len(t_keys) - 1, idx))
                x1 = int(round(x1_keys[idx]))
                y1 = int(round(y1_keys[idx]))
                cw = int(round(cw_keys[idx]))
                ch = int(round(ch_keys[idx]))
            else:
                idx = int(np.searchsorted(t_keys, t))
                idx = max(0, min(len(t_keys) - 1, idx))
                x1 = int(round(float(np.interp(t, t_keys, x1_keys))))
                y1 = int(round(float(np.interp(t, t_keys, y1_keys))))
                cw = int(round(float(np.interp(t, t_keys, cw_keys))))
                ch = int(round(float(np.interp(t, t_keys, ch_keys))))

            # Clamp boundaries
            x1 = max(0, min(width - cw, x1))
            y1 = max(0, min(height - ch, y1))

            # Production video clip must always be pristine clean video frames
            cropped_patch = frame[y1:y1 + ch, x1:x1 + cw]

            if cropped_patch.shape[0] != final_out_h or cropped_patch.shape[1] != final_out_w:
                return cv2.resize(cropped_patch, (final_out_w, final_out_h), interpolation=cv2.INTER_LANCZOS4)
            return cropped_patch

        cropped_clip = clip.fl(virtual_camera_filter, apply_to=["mask"])
        cropped_clip.size = (final_out_w, final_out_h)
        return cropped_clip

    def close(self):
        """Releases resources used by the face detector."""
        self.face_cache = {}

