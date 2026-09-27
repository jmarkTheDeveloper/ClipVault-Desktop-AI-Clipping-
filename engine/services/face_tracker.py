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
        Calculates ratio of human skin/flesh pixels within a bounding box using
        dual YCrCb (scientific standard across all complexions) and HSV color spaces.
        Accurately identifies all skin complexions, studio lighting, and side profiles
        while filtering out inanimate objects (lamps, walls, mugs, microphones).
        """
        h, w = rgb_frame.shape[:2]
        x1, y1 = max(0, x), max(0, y)
        x2, y2 = min(w, x + bw), min(h, y + bh)
        if x2 <= x1 or y2 <= y1:
            return 0.0
        patch = rgb_frame[y1:y2, x1:x2]
        try:
            # 1. YCrCb skin chrominance (permissive for all skin tones and studio lighting)
            ycrcb = cv2.cvtColor(patch, cv2.COLOR_RGB2YCrCb)
            cr = ycrcb[:, :, 1]
            cb = ycrcb[:, :, 2]
            skin_ycrcb = (cr >= 130) & (cr <= 180) & (cb >= 75) & (cb <= 135)

            # 2. HSV skin hue
            hsv = cv2.cvtColor(patch, cv2.COLOR_RGB2HSV)
            m1 = cv2.inRange(hsv, np.array([0, 15, 30]), np.array([28, 255, 255]))
            m2 = cv2.inRange(hsv, np.array([168, 15, 30]), np.array([180, 255, 255]))
            skin_hsv = (cv2.bitwise_or(m1, m2) > 0)

            combined_skin = skin_ycrcb | skin_hsv
            total_pixels = patch.shape[0] * patch.shape[1]
            return float(np.sum(combined_skin)) / float(total_pixels) if total_pixels > 0 else 0.0
        except Exception:
            return 0.0

    def _compute_human_presence_centroid_x(self, rgb_small: np.ndarray, orig_w: int) -> Optional[float]:
        """
        Locates the horizontal centroid of human skin and flesh tones across the frame.
        Guarantees that when humans are in the scene, the camera focuses on the person
        rather than background furniture, bookshelves, or static objects.
        """
        try:
            ycrcb = cv2.cvtColor(rgb_small, cv2.COLOR_RGB2YCrCb)
            cr = ycrcb[:, :, 1]
            cb = ycrcb[:, :, 2]
            skin_mask = ((cr >= 130) & (cr <= 180) & (cb >= 75) & (cb <= 135)).astype(np.uint8)
            col_sums = np.sum(skin_mask > 0, axis=0)
            total_skin = np.sum(col_sums)
            if total_skin > (rgb_small.shape[0] * 2):
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
        # Higher resolution max_dim (960) gives small heads in wide shots 2x more pixels to be detected
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
                        if conf < 0.18 or box_w < 8 or box_h < 8:
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
        # Run MediaPipe unless YuNet already found a very high-confidence face (>= 0.70)
        has_very_confident_yunet = any(c.get('confidence', 0.0) >= 0.70 for c in candidate_detections)
        if self.mp_detector is not None and not has_very_confident_yunet:
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

        # ── TIER 3 & 4: OpenCV Haar Cascades (Fallback Only) ──
        # Haar sliding-window cascades are expensive. Only run when modern neural detectors find zero faces.
        if not candidate_detections:
            gray = cv2.cvtColor(small_frame, cv2.COLOR_RGB2GRAY)
            gray_eq = cv2.equalizeHist(gray)
            gray_flipped = cv2.flip(gray_eq, 1)

            # ── TIER 3: Frontal Haar Cascade ──
            if self.frontal_cascade is not None:
                try:
                    detected_frontal = self.frontal_cascade.detectMultiScale(
                        gray_eq, scaleFactor=1.10, minNeighbors=3, minSize=(12, 12)
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
                        gray_eq, scaleFactor=1.08, minNeighbors=2, minSize=(12, 12)
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
                        gray_flipped, scaleFactor=1.08, minNeighbors=2, minSize=(12, 12)
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
        if len(candidate_detections) == 0 and self.hog_detector is not None:
            try:
                rects, weights = self.hog_detector.detectMultiScale(
                    small_frame, winStride=(8, 8), padding=(4, 4), scale=1.05
                )
                for (sx, sy, sw, sh), wgt in zip(rects, weights):
                    orig_h = int(sh / scale)
                    if orig_h < (h * 0.18) or wgt < 0.15:
                        continue

                    orig_x = int(sx / scale)
                    orig_y = int(sy / scale)
                    orig_w = int(sw / scale)

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
            if f['center_y'] > h * 0.88:
                continue
            # Ceiling rejection: extreme top 8% of frame
            if f['center_y'] < h * 0.08 and f['height'] < h * 0.25:
                continue
            # 2. Max size check
            if f['width'] > w * 0.75 or f['height'] > h * 0.80 or f['area'] > (w * h * 0.50):
                continue
            # 3. Minimum size to avoid noise
            if f['width'] < 8 or f['height'] < 8 or f['area'] < 64:
                continue

            bx = f['center_x'] - f['width'] // 2
            by = f['center_y'] - f['height'] // 2
            skin_ratio = self._get_skin_ratio(frame, bx, by, f['width'], f['height'])
            f['skin_ratio'] = skin_ratio

            # Cascade and HOG detectors lack semantic features: enforce biological skin-chroma threshold
            if f['type'] in ('frontal_haar', 'profile_haar_left', 'profile_haar_right', 'hog_person'):
                if skin_ratio < 0.05:
                    continue
            else:
                # Neural detectors (YuNet, MediaPipe): only reject pure inanimate objects (skin_ratio < 0.005)
                if skin_ratio < 0.005:
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

    def get_speaker_anchors_detailed(self, clip, max_samples: int = 20) -> Tuple[Optional[Dict[str, float]], Optional[Dict[str, float]]]:
        """
        Scans clip sample frames to identify primary and secondary speakers with full spatial details:
        returns (speaker_left_dict, speaker_right_dict) where each dict has:
        {'x': center_x, 'y': center_y, 'face_h': face_height}.
        """
        width, height = clip.size
        sample_times = np.linspace(0.1, max(0.2, clip.duration - 0.1), max(5, min(max_samples, int(clip.duration * 2))))
        all_detections = []

        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                dets = self.detect_faces_in_frame(frame, frame_time=t)
                for d in dets:
                    dist = abs(d['center_y'] - height * 0.38) / (height * 0.45)
                    eye_penalty = max(0.15, 1.0 - dist ** 2)
                    area_ratio = d['area'] / float(width * height)
                    wgt = d['confidence'] * (area_ratio ** 0.65) * eye_penalty
                    all_detections.append({
                        'x': float(d['center_x']),
                        'y': float(d['center_y']),
                        'face_h': float(d.get('height', height * 0.22)),
                        'weight': float(wgt)
                    })
            except Exception:
                continue

        if not all_detections:
            return None, None

        xs = np.array([d['x'] for d in all_detections], dtype=np.float64)
        weights = np.array([d['weight'] for d in all_detections], dtype=np.float64)

        nbins = max(8, int(width // 80))
        hist, bin_edges = np.histogram(xs, bins=nbins, weights=weights, range=(0, width))
        peak_indices = np.argsort(hist)[::-1]
        total_mass = np.sum(hist) if np.sum(hist) > 0 else 1.0

        clusters = []
        for idx in peak_indices:
            if hist[idx] >= total_mass * 0.18:
                approx_peak = (bin_edges[idx] + bin_edges[idx + 1]) / 2.0
                in_mask = np.abs(xs - approx_peak) < (width * 0.20)

                matched_indices = np.where(in_mask)[0]
                if len(matched_indices) > 0:
                    c_weights = weights[matched_indices]
                    c_xs = xs[matched_indices]
                    c_ys = np.array([all_detections[i]['y'] for i in matched_indices])
                    c_hs = np.array([all_detections[i]['face_h'] for i in matched_indices])

                    sum_w = np.sum(c_weights) if np.sum(c_weights) > 0 else 1.0
                    true_x = float(np.sum(c_xs * c_weights) / sum_w)
                    true_y = float(np.sum(c_ys * c_weights) / sum_w)
                    true_h = float(np.sum(c_hs * c_weights) / sum_w)
                else:
                    true_x = approx_peak
                    true_y = height * 0.38
                    true_h = height * 0.22

                if not any(abs(true_x - c['x']) < width * 0.22 for c in clusters):
                    clusters.append({'x': true_x, 'y': true_y, 'face_h': true_h})
                    if len(clusters) >= 2:
                        break

        if len(clusters) >= 2:
            left_s = min(clusters[0], clusters[1], key=lambda c: c['x'])
            right_s = max(clusters[0], clusters[1], key=lambda c: c['x'])
            return left_s, right_s
        elif len(clusters) == 1:
            return clusters[0], None
        return None, None

    def get_speaker_anchors(self, clip, max_samples: int = 20) -> Tuple[Optional[float], Optional[float]]:
        """
        Scans clip sample frames to identify primary and secondary horizontal speaker anchors.
        Returns (speaker_left_x, speaker_right_x) if 2 distinct speakers exist, or (speaker_x, None) if solo.
        """
        left_s, right_s = self.get_speaker_anchors_detailed(clip, max_samples=max_samples)
        left_x = left_s['x'] if left_s else None
        right_x = right_s['x'] if right_s else None
        return left_x, right_x

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

        if str(camera_style).lower() in ("off", "none", "center", "fixed"):
            print("    [FaceTracker] camera_style is 'off' — bypassing tracking and using rock-solid fixed center crop.")
            crop_w = min(width, base_crop_w)
            x1 = max(0, min(width - crop_w, (width - crop_w) // 2))
            if x1 % 2 != 0: x1 = max(0, x1 - 1)
            
            def static_center_crop_filter(get_frame, t):
                frame = get_frame(t)
                return frame[:, x1:x1 + crop_w]
            
            cropped = clip.fl(static_center_crop_filter, apply_to=["mask"])
            cropped.size = (crop_w, height)
            return cropped

        self.face_cache = {}

        # ── PASS 1: Global Lookahead Video Pre-Scan ("Watch the video first") ──
        # Pre-scanning the video allows the AI to predict and map every shot cut, camera angle change,
        # and speaker location in advance. This guarantees the virtual camera instantly aligns with the speaker
        # from frame 0 of every shot, with zero lag and zero drift onto empty space or chairs.
        fps_sample = 2
        num_samples = max(4, int(clip.duration * fps_sample))
        sample_times = np.linspace(0.05, max(0.1, clip.duration - 0.05), num_samples)

        pre_frames = []
        prev_sample_hist = None
        found_any_human = False

        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                if frame.dtype != np.uint8:
                    frame = np.clip(frame, 0, 255).astype(np.uint8)

                # Normalized 2D HSV chromatic histogram for visual scene cut detection
                hdiff = 0.0
                try:
                    small_hsv = cv2.cvtColor(cv2.resize(frame, (80, 80), interpolation=cv2.INTER_NEAREST), cv2.COLOR_RGB2HSV)
                    hist = cv2.calcHist([small_hsv], [0, 1], None, [12, 12], [0, 180, 0, 256])
                    cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                    if prev_sample_hist is not None:
                        hdiff = cv2.compareHist(prev_sample_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
                    prev_sample_hist = hist
                except Exception:
                    pass

                detected = self.detect_faces_in_frame(frame, frame_time=t)
                if detected:
                    found_any_human = True

                pre_frames.append({
                    "t": t,
                    "faces": detected or [],
                    "hdiff": hdiff
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
                rescue_sample_times = np.linspace(0.08, max(0.1, clip.duration - 0.08), min(12, max(6, int(clip.duration * 2))))
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
                    if agree >= max(2, len(skin_rescue_xs) // 3):
                        print(f"    [FaceTracker] Skin centroid rescue: locking crop to x={med_x:.0f} ({agree}/{len(skin_rescue_xs)} frames agree)")
                        # Build a fixed static crop centered on the skin centroid with Safe-Zone Edge Guard
                        crop_w = int(height * crop_ratio)
                        if crop_w % 2 != 0: crop_w -= 1
                        crop_w = min(width, crop_w)
                        half_cw = crop_w / 2.0
                        target_cx = max(half_cw, min(width - half_cw, med_x))
                        x1_rescue = max(0, min(width - crop_w, int(round(target_cx - half_cw))))
                        if x1_rescue % 2 != 0: x1_rescue = max(0, x1_rescue - 1)

                        final_out_w = crop_w
                        final_out_h = height
                        if final_out_w % 2 != 0: final_out_w -= 1
                        if final_out_h % 2 != 0: final_out_h -= 1

                        def skin_rescue_filter(get_frame, t):
                            frame = get_frame(t)
                            patch = frame[:, x1_rescue:x1_rescue + crop_w]
                            if patch.shape[1] != final_out_w or patch.shape[0] != final_out_h:
                                interp = cv2.INTER_AREA if (final_out_w < patch.shape[1] or final_out_h < patch.shape[0]) else cv2.INTER_LINEAR
                                return cv2.resize(patch, (final_out_w, final_out_h), interpolation=interp)
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

        if not pre_frames:
            return clip

        # ── PASS 1.5: Dynamic Shot Partitioning ──
        # Segment the video into discrete broadcast shots based on visual cuts, external cuts, or speaker position jumps
        cut_indices = set()
        for i in range(1, len(pre_frames)):
            t = pre_frames[i]["t"]
            hdiff = pre_frames[i]["hdiff"]
            prev_f = pre_frames[i - 1]["faces"]
            curr_f = pre_frames[i]["faces"]

            is_cut = False
            # Visual cut threshold (0.25 accurately catches multi-camera cuts in identical studio lighting)
            if hdiff >= 0.25:
                is_cut = True
            elif scene_cut_times and any(abs(t - ct) < (0.5 / fps_sample) for ct in scene_cut_times):
                is_cut = True
            elif prev_f and curr_f:
                p_cx = prev_f[0]["center_x"]
                c_cx = curr_f[0]["center_x"]
                if abs(c_cx - p_cx) > (width * 0.18):
                    is_cut = True

            if is_cut:
                cut_indices.add(i)

        raw_shots = []
        curr_shot = []
        for i, item in enumerate(pre_frames):
            if i in cut_indices and curr_shot:
                raw_shots.append(curr_shot)
                curr_shot = []
            curr_shot.append(item)
        if curr_shot:
            raw_shots.append(curr_shot)

        # Merge micro-shots: shots shorter than min_shot_len where speaker centers are virtually identical (< 15% width)
        min_shot_len = max(2, int(fps_sample * 1.0))
        shots = []
        for shot in raw_shots:
            if not shots:
                shots.append(shot)
                continue
            prev_s = shots[-1]
            prev_faces = [f for it in prev_s for f in it["faces"]]
            curr_faces = [f for it in shot for f in it["faces"]]
            if len(shot) < min_shot_len and prev_faces and curr_faces:
                prev_med = float(np.median([f["center_x"] for f in prev_faces]))
                curr_med = float(np.median([f["center_x"] for f in curr_faces]))
                if abs(curr_med - prev_med) < (width * 0.15):
                    prev_s.extend(shot)
                    continue
            shots.append(shot)

        # ── PASS 2: Virtual Camera Framing with Shot-Isolated Smoothing ──
        shot_keyframes = []
        all_cw = []
        all_ch = []

        for shot_idx, shot in enumerate(shots):
            # Compute dominant confirmed human speaker location for this entire shot
            shot_faces = [f for it in shot for f in it["faces"]]
            shot_anchor_cx = float(np.median([f["center_x"] for f in shot_faces])) if shot_faces else None
            shot_anchor_cy = float(np.median([f["center_y"] for f in shot_faces])) if shot_faces else None

            temporal_tracker = TemporalTracker(max_age=int(fps_sample * 2.5), min_hits=1)
            virtual_cam = VirtualCamera(
                width, height, aspect_ratio=crop_ratio,
                camera_style=camera_style,
                deadzone_ratio=0.12 if camera_style == "snappy" else (0.18 if camera_style == "smooth" else 0.16),
                pan_speed=400.0 if camera_style == "snappy" else (240.0 if camera_style == "smooth" else 350.0),
                fps=float(fps_sample)
            )

            shot_items = []
            for item_idx, item in enumerate(shot):
                t = item["t"]
                faces = item["faces"]
                is_first_in_shot = (item_idx == 0)

                tracks = temporal_tracker.update(faces, width, height)
                primary_track = tracks[0] if tracks else None

                if primary_track:
                    tcx, tcy, tcw, tch = virtual_cam.calculate_target_crop(
                        primary_track, tracks, min_margin_pct=min_crop_margin, max_digital_zoom=max_digital_zoom
                    )
                elif shot_anchor_cx is not None:
                    # Anchor to confirmed speaker in this shot! Never drift onto empty walls or chairs!
                    tch = float(base_crop_w / crop_ratio)
                    tcw = float(base_crop_w)
                    tcx = shot_anchor_cx
                    tcy = shot_anchor_cy + (tch * 0.12)
                else:
                    tcw = float(base_crop_w)
                    tch = float(base_crop_w / crop_ratio)
                    tcx = float(width / 2.0)
                    tcy = float(height / 2.0)

                if adaptive_crop:
                    tw = target_resolution[0] if target_resolution else int(tch * crop_ratio)
                    th = target_resolution[1] if target_resolution else int(tch)
                    tcw, tch = QualityEngine.adjust_crop_for_quality(
                        int(tcw), int(tch), tw, th, width, height,
                        max_digital_zoom=max_digital_zoom, aspect_ratio=crop_ratio
                    )

                crop_rect = virtual_cam.update(tcx, tcy, tcw, tch, is_scene_cut=is_first_in_shot)
                all_cw.append(crop_rect[2])
                all_ch.append(crop_rect[3])

                item_data = {
                    "t": t,
                    "crop_rect": crop_rect,
                    "tracks": tracks,
                    "primary_track": primary_track,
                    "is_cut": is_first_in_shot,
                    "shot_idx": shot_idx
                }
                shot_items.append(item_data)

            # Shot-Isolated Stabilization:
            # Across cuts, camera transitions instantly with 0.0 lag.
            # Within each shot, apply camera style smoothing strictly confined inside the shot.
            raw_x1 = np.array([it["crop_rect"][0] for it in shot_items], dtype=np.float64)
            raw_y1 = np.array([it["crop_rect"][1] for it in shot_items], dtype=np.float64)
            raw_cw = np.array([it["crop_rect"][2] for it in shot_items], dtype=np.float64)
            raw_ch = np.array([it["crop_rect"][3] for it in shot_items], dtype=np.float64)

            if camera_style == "instant" or np.std(raw_x1) < (width * 0.05):
                # Pure tripod lock on median framing
                med_x1 = float(np.median(raw_x1))
                med_y1 = float(np.median(raw_y1))
                med_cw = float(np.median(raw_cw))
                med_ch = float(np.median(raw_ch))
                for it in shot_items:
                    it["crop_rect"] = (med_x1, med_y1, med_cw, med_ch)
            else:
                # Smooth / snappy: Gaussian filter strictly inside this shot (never bleeding across cuts)
                k_size = 3 if (camera_style == "snappy" or len(raw_x1) < 5) else 5
                sigma = 1.2 if camera_style == "snappy" else 2.0
                k = cv2.getGaussianKernel(k_size, sigma).flatten()
                pad_w = k_size // 2
                padded_x = np.pad(raw_x1, (pad_w, pad_w), mode='edge')
                padded_y = np.pad(raw_y1, (pad_w, pad_w), mode='edge')
                smoothed_x = np.convolve(padded_x, k, mode='valid')
                smoothed_y = np.convolve(padded_y, k, mode='valid')
                for i, it in enumerate(shot_items):
                    it["crop_rect"] = (float(smoothed_x[i]), float(smoothed_y[i]), float(raw_cw[i]), float(raw_ch[i]))

            shot_keyframes.append({
                "shot_idx": shot_idx,
                "t_start": shot_items[0]["t"],
                "t_end": shot_items[-1]["t"],
                "t_keys": np.array([it["t"] for it in shot_items], dtype=np.float64),
                "x1_keys": np.array([it["crop_rect"][0] for it in shot_items], dtype=np.float64),
                "y1_keys": np.array([it["crop_rect"][1] for it in shot_items], dtype=np.float64),
                "cw_keys": np.array([it["crop_rect"][2] for it in shot_items], dtype=np.float64),
                "ch_keys": np.array([it["crop_rect"][3] for it in shot_items], dtype=np.float64)
            })

        if target_resolution and len(target_resolution) == 2:
            final_out_w, final_out_h = int(target_resolution[0]), int(target_resolution[1])
        else:
            final_out_w = int(round(float(np.median(all_cw)))) if all_cw else base_crop_w
            final_out_h = int(round(float(np.median(all_ch)))) if all_ch else height
        if final_out_w % 2 != 0: final_out_w -= 1
        if final_out_h % 2 != 0: final_out_h -= 1

        print(
            f"    [FaceTracker] Two-Pass Virtual Camera Active ({len(shots)} broadcast shots, {len(pre_frames)} keyframes) | "
            f"Aspect: {crop_ratio:.3f} | Style: {camera_style} | Adaptive Crop: {adaptive_crop} | Diagnostics: {diagnostic_mode}"
        )

        shot_starts = np.array([sk["t_start"] for sk in shot_keyframes], dtype=np.float64)

        def virtual_camera_filter(get_frame, t):
            frame = get_frame(t)
            # Find the active shot for timestamp t
            s_idx = int(np.searchsorted(shot_starts, t, side="right")) - 1
            s_idx = max(0, min(len(shot_keyframes) - 1, s_idx))
            sk = shot_keyframes[s_idx]

            if len(sk["t_keys"]) <= 1 or camera_style == "instant":
                # Static tripod framing for this shot
                x1 = int(round(sk["x1_keys"][0]))
                y1 = int(round(sk["y1_keys"][0]))
                cw = int(round(sk["cw_keys"][0]))
                ch = int(round(sk["ch_keys"][0]))
            else:
                # Interpolate smoothly strictly within this shot's keyframes
                x1 = int(round(float(np.interp(t, sk["t_keys"], sk["x1_keys"]))))
                y1 = int(round(float(np.interp(t, sk["t_keys"], sk["y1_keys"]))))
                cw = int(round(float(np.interp(t, sk["t_keys"], sk["cw_keys"]))))
                ch = int(round(float(np.interp(t, sk["t_keys"], sk["ch_keys"]))))

            # Clamp boundaries
            x1 = max(0, min(width - cw, x1))
            y1 = max(0, min(height - ch, y1))

            # Production video clip must always be pristine clean video frames
            cropped_patch = frame[y1:y1 + ch, x1:x1 + cw]

            if cropped_patch.shape[0] != final_out_h or cropped_patch.shape[1] != final_out_w:
                interp = cv2.INTER_AREA if (final_out_w < cropped_patch.shape[1] or final_out_h < cropped_patch.shape[0]) else cv2.INTER_LINEAR
                return cv2.resize(cropped_patch, (final_out_w, final_out_h), interpolation=interp)
            return cropped_patch

        cropped_clip = clip.fl(virtual_camera_filter, apply_to=["mask"])
        cropped_clip.size = (final_out_w, final_out_h)
        return cropped_clip

    def close(self):
        """Releases resources used by the face detector."""
        self.face_cache = {}

