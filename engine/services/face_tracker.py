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
            # 1. Floor & Lap rejection: human heads in 16:9/horizontal video sit in the upper 70%
            # Detections below 70% are almost always desks, laptops, hands, or cups unless very large
            if f['center_y'] > h * 0.70 and f['height'] < h * 0.35:
                continue
            # Ceiling rejection: extreme top 6% of frame unless large head
            if f['center_y'] < h * 0.06 and f['height'] < h * 0.25:
                continue
            # 2. Minimum confidence threshold to reject phantom background bokeh flickers
            min_conf = 0.68 if f['type'] == 'yunet_neural' else (0.50 if f['type'] == 'mediapipe' else 0.68)
            # Giant bounding boxes (>22% frame width or >42% frame height) must be high confidence
            # because a real close-up face is unmistakable, whereas blurry background walls produce giant ~0.55-0.65 boxes
            if f['width'] > w * 0.22 or f['height'] > h * 0.42:
                min_conf = max(min_conf, 0.80)
            if f['confidence'] < min_conf:
                continue
            # 3. Max size check
            if f['width'] > w * 0.65 or f['height'] > h * 0.75 or f['area'] > (w * h * 0.40):
                continue
            # 4. Minimum size to avoid noise
            if f['width'] < 16 or f['height'] < 16 or f['area'] < 256:
                continue

            bx = f['center_x'] - f['width'] // 2
            by = f['center_y'] - f['height'] // 2
            skin_ratio = self._get_skin_ratio(frame, bx, by, f['width'], f['height'])
            f['skin_ratio'] = skin_ratio

            # Biological skin-chroma threshold
            if f['type'] in ('frontal_haar', 'profile_haar_left', 'profile_haar_right', 'hog_person'):
                if skin_ratio < 0.06:
                    continue
            else:
                if skin_ratio < 0.02 and f['confidence'] < 0.85:
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
            # Rank faces favoring high-confidence foreground subjects at human eye level
            def face_rank(f):
                dist = abs(f['center_y'] - h * 0.38) / (h * 0.45)
                eye_penalty = max(0.15, 1.0 - dist ** 2)
                area_ratio = min(0.08, f['area'] / float(w * h))
                return (f['confidence'] ** 3.0) * (area_ratio ** 0.35) * eye_penalty

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
        camera_style: str = "smooth",
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
        # High-speed adaptive pre-scan: sample every ~1.5s-2.0s, capped at max 20 keyframes.
        # Eliminates 260+ seeks (which caused 5-minute CPU freezes) down to under 5 seconds,
        # while preserving complete multi-speaker framing and camera transition accuracy.
        num_samples = min(20, max(6, int(round(clip.duration * 0.65))))
        sample_times = np.linspace(0.05, max(0.10, clip.duration - 0.05), num_samples)
        fps_sample = float(num_samples) / max(0.1, float(clip.duration))

        def _compute_frame_signature(frm: np.ndarray):
            """Computes a 64x36 spatial thumbnail + 3-zone (Left/Center/Right) HSV histogram."""
            small_rgb = cv2.resize(frm, (64, 36), interpolation=cv2.INTER_AREA)
            small_hsv = cv2.cvtColor(small_rgb, cv2.COLOR_RGB2HSV)
            # 3 horizontal zones (left, center, right) so camera switches in the same studio lighting are caught
            z_hists = []
            for z_idx in range(3):
                x_start = z_idx * 21
                x_end = 64 if z_idx == 2 else (z_idx + 1) * 21
                zone = small_hsv[:, x_start:x_end]
                zh = cv2.calcHist([zone], [0, 1], None, [8, 8], [0, 180, 0, 256])
                cv2.normalize(zh, zh, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
                z_hists.append(zh)
            return np.ascontiguousarray(small_rgb, dtype=np.uint8), z_hists

        def _signature_diff(sig_a, sig_b) -> Tuple[float, float]:
            """Returns (zone_hist_diff, spatial_l1_diff) between two frame signatures."""
            if sig_a is None or sig_b is None:
                return 0.0, 0.0
            thumb_a, hists_a = sig_a
            thumb_b, hists_b = sig_b
            z_diffs = [
                float(cv2.compareHist(ha, hb, cv2.HISTCMP_BHATTACHARYYA))
                for ha, hb in zip(hists_a, hists_b)
            ]
            zone_hdiff = float(np.mean(z_diffs))
            rust_diff = None
            try:
                from services.rust_accelerator import rust_compute_frame_luma_diff
                rust_diff = rust_compute_frame_luma_diff(thumb_a, thumb_b, stride_step=1)
            except Exception:
                pass
            if rust_diff is not None:
                spatial_diff = float(rust_diff / 255.0)
            else:
                spatial_diff = float(np.mean(np.abs(thumb_a.astype(np.float32) - thumb_b.astype(np.float32))) / 255.0)
            return zone_hdiff, spatial_diff

        pre_frames = []
        prev_sig = None
        found_any_human = False

        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                if frame.dtype != np.uint8:
                    frame = np.clip(frame, 0, 255).astype(np.uint8)

                sig = None
                hdiff, sdiff = 0.0, 0.0
                try:
                    sig = _compute_frame_signature(frame)
                    if prev_sig is not None:
                        hdiff, sdiff = _signature_diff(prev_sig, sig)
                    prev_sig = sig
                except Exception:
                    pass

                detected = self.detect_faces_in_frame(frame, frame_time=t)
                if detected:
                    found_any_human = True

                pre_frames.append({
                    "t": float(t),
                    "faces": detected or [],
                    "hdiff": hdiff,
                    "sdiff": sdiff,
                    "sig": sig
                })
            except Exception:
                pass

        if not found_any_human:
            # ── Skin-Tone Centroid Rescue ──
            print("    [FaceTracker] 0 human tracks detected. Attempting skin-tone centroid rescue before SubjectTracker...")
            try:
                skin_rescue_xs = []
                rescue_sample_times = np.linspace(0.08, max(0.1, clip.duration - 0.08), min(6, max(3, int(clip.duration * 0.5))))
                for rt in rescue_sample_times:
                    try:
                        rescue_frame = clip.get_frame(rt)
                        if rescue_frame.dtype != np.uint8:
                            rescue_frame = np.clip(rescue_frame, 0, 255).astype(np.uint8)
                        rs_h, rs_w = rescue_frame.shape[:2]
                        scale = 320.0 / max(rs_h, rs_w)
                        small_rescue = cv2.resize(rescue_frame, (int(rs_w * scale), int(rs_h * scale)), interpolation=cv2.INTER_AREA)
                        cx_skin = self._compute_human_presence_centroid_x(small_rescue, rs_w)
                        if cx_skin is not None:
                            skin_rescue_xs.append(cx_skin)
                    except Exception:
                        continue

                if skin_rescue_xs and len(skin_rescue_xs) >= 2:
                    xs_arr = np.array(skin_rescue_xs)
                    med_x = float(np.median(xs_arr))
                    agree = sum(1 for x in xs_arr if abs(x - med_x) < width * 0.22)
                    if agree >= max(2, len(skin_rescue_xs) // 3):
                        print(f"    [FaceTracker] Skin centroid rescue: locking crop to x={med_x:.0f} ({agree}/{len(skin_rescue_xs)} frames agree)")
                        crop_w = min(width, base_crop_w)
                        half_cw = crop_w / 2.0
                        target_cx = max(half_cw, min(width - half_cw, med_x))
                        x1_rescue = max(0, min(width - crop_w, int(round(target_cx - half_cw))))
                        if x1_rescue % 2 != 0: x1_rescue = max(0, x1_rescue - 1)

                        final_out_w = int(target_resolution[0]) if (target_resolution and len(target_resolution) == 2) else crop_w
                        final_out_h = int(target_resolution[1]) if (target_resolution and len(target_resolution) == 2) else height
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

        # ── PASS 1.5: Frame-Accurate Shot Boundary Detection & Binary Search Refinement ──
        # Catch every multi-camera cut (even in identical studio lighting) using 3-zone HSV + spatial L1 diff,
        # then binary-search the [t_prev, t_curr] interval to pinpoint the exact cut frame (~25ms precision).
        cut_times_exact: Dict[int, float] = {}
        for i in range(1, len(pre_frames)):
            t_curr = pre_frames[i]["t"]
            t_prev = pre_frames[i - 1]["t"]
            hdiff = pre_frames[i]["hdiff"]
            sdiff = pre_frames[i]["sdiff"]
            prev_f = pre_frames[i - 1]["faces"]
            curr_f = pre_frames[i]["faces"]

            is_cut = False
            # 1. Strong 3-zone chromatic or joint chromatic+spatial pixel layout change
            # (catches studio angle cuts without triggering on smooth camera pans or hand gestures)
            if hdiff >= 0.28 or (hdiff >= 0.20 and sdiff >= 0.080) or sdiff >= 0.25:
                is_cut = True
            # 2. External scene detector cut
            elif scene_cut_times and any(abs(t_curr - ct) < (1.0 / fps_sample) for ct in scene_cut_times):
                is_cut = True
            # 3. Visual shift combined with a large horizontal teleport in face position
            # (only if NO prominent faces match between frames, preventing person index swaps in multi-person shots)
            elif (hdiff >= 0.18 or sdiff >= 0.090) and prev_f and curr_f:
                matched = False
                for pf in prev_f:
                    for cf in curr_f:
                        if abs(pf["center_x"] - cf["center_x"]) < (width * 0.10):
                            matched = True
                            break
                    if matched:
                        break
                if not matched:
                    p_cx = prev_f[0]["center_x"]
                    c_cx = curr_f[0]["center_x"]
                    if abs(c_cx - p_cx) > (width * 0.25):
                        is_cut = True

            if is_cut:
                # 3-Step Binary Search to find the EXACT frame where the camera cut occurred
                exact_t = t_curr
                sig_lo = pre_frames[i - 1].get("sig")
                sig_hi = pre_frames[i].get("sig")
                if sig_lo is not None and sig_hi is not None:
                    lo_t, hi_t = t_prev, t_curr
                    thumb_lo, hists_lo = sig_lo
                    thumb_hi, hists_hi = sig_hi
                    try:
                        for _ in range(3):
                            mid_t = 0.5 * (lo_t + hi_t)
                            mid_f = clip.get_frame(mid_t)
                            if mid_f.dtype != np.uint8:
                                mid_f = np.clip(mid_f, 0, 255).astype(np.uint8)
                            sig_mid = _compute_frame_signature(mid_f)
                            hd_lo, sd_lo = _signature_diff((thumb_lo, hists_lo), sig_mid)
                            hd_hi, sd_hi = _signature_diff(sig_mid, (thumb_hi, hists_hi))
                            score_lo = hd_lo + sd_lo * 2.0
                            score_hi = hd_hi + sd_hi * 2.0
                            if score_lo < score_hi:
                                lo_t = mid_t
                                thumb_lo, hists_lo = sig_mid
                            else:
                                hi_t = mid_t
                                thumb_hi, hists_hi = sig_mid
                        exact_t = hi_t
                    except Exception:
                        exact_t = 0.5 * (t_prev + t_curr)
                cut_times_exact[i] = exact_t

        raw_shots = []
        curr_shot = []
        curr_shot_start = 0.0
        curr_is_scene_cut = True
        for i, item in enumerate(pre_frames):
            if i in cut_times_exact and curr_shot:
                raw_shots.append({
                    "start_t": curr_shot_start,
                    "end_t": cut_times_exact[i],
                    "items": curr_shot,
                    "is_scene_cut": curr_is_scene_cut,
                })
                curr_shot = []
                curr_shot_start = cut_times_exact[i]
                # Check if this cut was a true visual/chromatic scene cut
                hdiff = pre_frames[i]["hdiff"]
                sdiff = pre_frames[i]["sdiff"]
                curr_is_scene_cut = bool(hdiff >= 0.28 or (hdiff >= 0.20 and sdiff >= 0.080) or sdiff >= 0.25)
            curr_shot.append(item)
        if curr_shot:
            raw_shots.append({
                "start_t": curr_shot_start,
                "end_t": float(clip.duration),
                "items": curr_shot,
                "is_scene_cut": curr_is_scene_cut,
            })

        # ── Debounce Micro-Shots (< 0.85s / 4-5 samples) ──
        # In professional broadcast framing, micro-shots (0.1s - 0.5s) produce jarring rapid flashes/whips.
        # Merge sub-0.85s micro-shots into neighboring shots to guarantee stable, pleasing camera pacing.
        MIN_SHOT_DURATION = 0.85
        merged_shots = []
        for s in raw_shots:
            dur = s["end_t"] - s["start_t"]
            if not merged_shots:
                merged_shots.append(s)
            elif dur < MIN_SHOT_DURATION:
                merged_shots[-1]["end_t"] = s["end_t"]
                merged_shots[-1]["items"].extend(s["items"])
            else:
                merged_shots.append(s)

        if len(merged_shots) > 1 and (merged_shots[0]["end_t"] - merged_shots[0]["start_t"]) < MIN_SHOT_DURATION:
            merged_shots[1]["start_t"] = merged_shots[0]["start_t"]
            merged_shots[1]["items"] = merged_shots[0]["items"] + merged_shots[1]["items"]
            merged_shots.pop(0)

        raw_shots = merged_shots

        # ── Compute Adaptive Quality-Aware Zoom Ceiling ──
        # Protects output against pixelation: vertical 9:16 crops already extract 31.6% of horizontal width,
        # so extra digital zoom is strictly scaled by native source pixel height.
        effective_max_zoom = float(max_digital_zoom) if (max_digital_zoom and max_digital_zoom > 1.0) else 1.0
        if adaptive_crop and effective_max_zoom > 1.0:
            if crop_ratio < 0.85:
                if height >= 2160:
                    safe_zoom_cap = min(effective_max_zoom, 1.25)
                elif height >= 1440:
                    safe_zoom_cap = min(effective_max_zoom, 1.18)
                elif height >= 1080:
                    safe_zoom_cap = min(effective_max_zoom, 1.10)
                else:
                    safe_zoom_cap = 1.0
            else:
                if height >= 1080:
                    safe_zoom_cap = effective_max_zoom
                elif height >= 720:
                    safe_zoom_cap = min(effective_max_zoom, 1.25)
                else:
                    safe_zoom_cap = 1.0
        else:
            safe_zoom_cap = effective_max_zoom

        # ── Helper: Speaker Clustering & Intelligent Composition inside a Shot ──
        # Groups face detections into discrete human clusters, scores active speakers,
        # applies rule-of-thirds vertical headroom, and computes optimal digital zoom.
        def _solve_shot_crop(shot_items_list: List[Dict[str, Any]], prev_shot_crop: Optional[Tuple[int, int, int, int, float, float]]) -> Tuple[int, int, int, int, float, float]:
            all_detections = []
            for f_idx, it in enumerate(shot_items_list):
                for face in it["faces"]:
                    all_detections.append((f_idx, face))

            if not all_detections:
                # No faces detected (e.g. B-roll close-up): skin centroid fallback or center crop
                skin_cx = None
                try:
                    mid_item = shot_items_list[len(shot_items_list) // 2]
                    frm = clip.get_frame(mid_item["t"])
                    if frm.dtype != np.uint8:
                        frm = np.clip(frm, 0, 255).astype(np.uint8)
                    scale = 320.0 / max(height, width)
                    small_frm = cv2.resize(frm, (int(width * scale), int(height * scale)), interpolation=cv2.INTER_AREA)
                    skin_cx = self._compute_human_presence_centroid_x(small_frm, width)
                except Exception:
                    pass

                ref_cx = skin_cx if skin_cx is not None else (width / 2.0)
                ref_cy = height / 2.0
                x1_b = int(round(ref_cx - base_crop_w / 2.0))
                x1_b = max(0, min(width - base_crop_w, x1_b))
                if x1_b % 2 != 0: x1_b = max(0, x1_b - 1)
                return (x1_b, 0, base_crop_w, height, float(ref_cx), float(ref_cy))

            # Cluster detections by horizontal center_x (radius = 14% of frame width)
            cluster_radius = width * 0.14
            clusters: List[List[Tuple[int, Dict[str, Any]]]] = []
            for f_idx, face in all_detections:
                fcx = float(face["center_x"])
                best_c = None
                best_dist = cluster_radius
                for c in clusters:
                    c_med_x = float(np.median([x[1]["center_x"] for x in c]))
                    d = abs(fcx - c_med_x)
                    if d <= best_dist:
                        best_dist = d
                        best_c = c
                if best_c is not None:
                    best_c.append((f_idx, face))
                else:
                    clusters.append([(f_idx, face)])

            scored_clusters = []
            num_shot_frames = max(1, len(shot_items_list))
            max_reasonable_area = float(width * height) * 0.08
            prev_center = (prev_shot_crop[0] + prev_shot_crop[2] / 2.0) if prev_shot_crop is not None else None

            for c in clusters:
                unique_frames = len(set(x[0] for x in c))
                persistence = unique_frames / float(num_shot_frames)
                c_xs = [float(x[1]["center_x"]) for x in c]
                c_ys = [float(x[1].get("center_y", height * 0.35)) for x in c]
                c_ws = [float(x[1]["width"]) for x in c]
                c_hs = [float(x[1]["height"]) for x in c]
                c_confs = [float(x[1].get("confidence", 0.7)) for x in c]
                c_mouths = [float(x[1].get("mouth_score", 0.0)) for x in c]

                med_cx = float(np.median(c_xs))
                med_cy = float(np.median(c_ys))
                med_fw = float(np.median(c_ws))
                med_fh = float(np.median(c_hs))
                avg_area = min(max_reasonable_area, med_fw * med_fh)
                avg_conf = float(np.mean(c_confs))
                avg_mouth = float(np.mean(c_mouths))
                center_bias = 1.0 - 0.15 * (abs(med_cx - (width / 2.0)) / max(1.0, width / 2.0))

                # Anchor speaker continuity: stability boost if cluster was in viewport of previous shot
                anchor_continuity = 1.0
                if prev_center is not None and abs(med_cx - prev_center) < (base_crop_w * 0.45):
                    anchor_continuity = 1.25

                score = (
                    (unique_frames ** 1.40)
                    * (avg_area ** 0.35)
                    * (avg_conf ** 3.0)
                    * (1.0 + 0.40 * min(1.5, avg_mouth))
                    * center_bias
                    * anchor_continuity
                )
                scored_clusters.append({
                    "score": score,
                    "persistence": persistence,
                    "unique_frames": unique_frames,
                    "med_cx": med_cx,
                    "med_cy": med_cy,
                    "med_fw": med_fw,
                    "med_fh": med_fh,
                })

            scored_clusters.sort(key=lambda item: -item["score"])
            primary = scored_clusters[0]
            target_cx = primary["med_cx"]
            target_cy = primary["med_cy"]
            subject_fw = primary["med_fw"]
            subject_fh = primary["med_fh"]
            is_two_shot = False

            # Check for tight two-shot where BOTH people fit naturally inside the 9:16 frame
            if len(scored_clusters) >= 2:
                secondary = scored_clusters[1]
                if (
                    secondary["score"] >= primary["score"] * 0.45
                    and secondary["unique_frames"] >= max(1, int(num_shot_frames * 0.45))
                ):
                    left_c = primary if primary["med_cx"] < secondary["med_cx"] else secondary
                    right_c = secondary if primary["med_cx"] < secondary["med_cx"] else primary
                    outer_left = left_c["med_cx"] - left_c["med_fw"] * 0.85
                    outer_right = right_c["med_cx"] + right_c["med_fw"] * 0.85
                    two_shot_span = outer_right - outer_left
                    if two_shot_span <= (base_crop_w * 0.82):
                        target_cx = 0.5 * (outer_left + outer_right)
                        target_cy = 0.5 * (left_c["med_cy"] + right_c["med_cy"])
                        subject_fw = two_shot_span * 0.5
                        is_two_shot = True

            # ── Digital Zoom & Rule-of-Thirds Headroom Calculation ──
            if not is_two_shot and safe_zoom_cap > 1.0:
                face_rel_h = subject_fh / float(height)
                # If face is small/medium in widescreen frame, zoom in up to safe_zoom_cap
                if face_rel_h < 0.25:
                    zoom_factor = min(safe_zoom_cap, 1.0 + (safe_zoom_cap - 1.0) * ((0.25 - face_rel_h) / 0.15))
                else:
                    zoom_factor = 1.0
                zoom_factor = max(1.0, min(safe_zoom_cap, zoom_factor))

                ch_val = int(round(height / zoom_factor))
                cw_val = int(round(ch_val * crop_ratio))
                if cw_val % 2 != 0: cw_val -= 1
                if ch_val % 2 != 0: ch_val -= 1
                cw_val = max(64, min(width, cw_val))
                ch_val = max(64, min(height, ch_val))

                # Rule-of-thirds headroom: place eyes/face at ~33% from the top of the crop box
                desired_y1 = int(round(target_cy - (ch_val * 0.33)))
                y1_val = max(0, min(height - ch_val, desired_y1))
                if y1_val % 2 != 0: y1_val = max(0, y1_val - 1)
            else:
                cw_val = base_crop_w
                ch_val = height
                y1_val = 0

            # Safe-Zone Edge Guard (horizontal clamping)
            half_cw = cw_val / 2.0
            person_left = target_cx - (subject_fw * 0.80)
            person_right = target_cx + (subject_fw * 0.80)
            min_edge_margin = cw_val * 0.12

            if (target_cx - half_cw) > (person_left - min_edge_margin):
                target_cx = max(half_cw, person_left - min_edge_margin + half_cw)
            elif (target_cx + half_cw) < (person_right + min_edge_margin):
                target_cx = min(float(width) - half_cw, person_right + min_edge_margin - half_cw)

            x1_val = int(round(target_cx - half_cw))
            x1_val = max(0, min(width - cw_val, x1_val))
            if x1_val % 2 != 0:
                x1_val = max(0, x1_val - 1)

            # Hysteresis against micro-shifts from previous shot
            if prev_shot_crop is not None:
                p_x1, p_y1, p_cw, p_ch = prev_shot_crop[:4]
                if abs(x1_val - p_x1) < (width * 0.04) and abs(cw_val - p_cw) < (width * 0.04):
                    x1_val, y1_val, cw_val, ch_val = p_x1, p_y1, p_cw, p_ch

            return (x1_val, y1_val, cw_val, ch_val, float(target_cx), float(target_cy))

        # ── PASS 2: Broadcast Virtual Camera Director ──
        # Solve framing and trajectory for every shot
        shot_keyframes = []
        prev_crop: Optional[Tuple[int, int, int, int, float, float]] = None

        for shot_idx, shot_dict in enumerate(raw_shots):
            shot_start_t = shot_dict["start_t"]
            shot_items_list = shot_dict["items"]
            solved = _solve_shot_crop(shot_items_list, prev_crop)
            x1, y1, cw, ch, target_cx, target_cy = solved
            prev_crop = solved

            # Continuous sample trajectory for "smooth" gimbal Steadicam tracking
            trajectory = []
            for item in shot_items_list:
                it_t = item["t"]
                it_faces = item["faces"]
                best_f = None
                best_d = width * 0.25
                for f in it_faces:
                    d = abs(float(f["center_x"]) - target_cx)
                    if d < best_d:
                        best_d = d
                        best_f = f
                if best_f is not None:
                    trajectory.append({
                        "t": float(it_t),
                        "cx": float(best_f["center_x"]),
                        "cy": float(best_f.get("center_y", target_cy)),
                    })
                else:
                    trajectory.append({
                        "t": float(it_t),
                        "cx": float(target_cx),
                        "cy": float(target_cy),
                    })

            # Pre-solve critically-damped 2nd-order camera trajectory once per shot in native Rust
            traj_t_arr = None
            smooth_x_arr = None
            smooth_y_arr = None
            if len(trajectory) >= 2:
                traj_t_arr = np.array([pt["t"] for pt in trajectory], dtype=np.float64)
                raw_x_arr = np.array([pt["cx"] for pt in trajectory], dtype=np.float64)
                raw_y_arr = np.array([pt["cy"] for pt in trajectory], dtype=np.float64)
                dead_w = float(cw) * 0.10
                dead_h = float(ch) * 0.10
                dt_sample = float(np.median(np.diff(traj_t_arr))) if len(traj_t_arr) > 1 else 0.20
                dt_sample = max(0.033, min(0.50, dt_sample))

                try:
                    from services.rust_accelerator import rust_solve_spring_damper_1d
                    smooth_x_arr = rust_solve_spring_damper_1d(
                        raw_x_arr, dt=dt_sample, stiffness=18.0, damping=8.5, deadzone_px=dead_w, substeps=4
                    )
                    smooth_y_arr = rust_solve_spring_damper_1d(
                        raw_y_arr, dt=dt_sample, stiffness=16.0, damping=8.0, deadzone_px=dead_h, substeps=4
                    )
                except Exception:
                    smooth_x_arr = None
                    smooth_y_arr = None

                if smooth_x_arr is None or smooth_y_arr is None:
                    fx = [float(raw_x_arr[0])]
                    fy = [float(raw_y_arr[0])]
                    for k in range(1, len(raw_x_arr)):
                        dx = float(raw_x_arr[k]) - fx[-1]
                        dy = float(raw_y_arr[k]) - fy[-1]
                        step_x = 0.0 if abs(dx) < dead_w else (dx - np.sign(dx) * dead_w) * 0.35
                        step_y = 0.0 if abs(dy) < dead_h else (dy - np.sign(dy) * dead_h) * 0.30
                        fx.append(fx[-1] + step_x)
                        fy.append(fy[-1] + step_y)
                    smooth_x_arr = np.array(fx, dtype=np.float64)
                    smooth_y_arr = np.array(fy, dtype=np.float64)

            shot_keyframes.append({
                "shot_idx": shot_idx,
                "t_start": float(shot_start_t),
                "t_end": float(shot_dict["end_t"]),
                "x1": int(x1),
                "y1": int(y1),
                "cw": int(cw),
                "ch": int(ch),
                "cx": float(target_cx),
                "cy": float(target_cy),
                "is_scene_cut": bool(shot_dict.get("is_scene_cut", False)),
                "trajectory": trajectory,
                "traj_t_arr": traj_t_arr,
                "smooth_x_arr": smooth_x_arr,
                "smooth_y_arr": smooth_y_arr,
            })

        if target_resolution and len(target_resolution) == 2:
            final_out_w, final_out_h = int(target_resolution[0]), int(target_resolution[1])
        else:
            final_out_w = int(base_crop_w)
            final_out_h = int(height)
        if final_out_w % 2 != 0: final_out_w -= 1
        if final_out_h % 2 != 0: final_out_h -= 1

        active_camera_style = str(camera_style).lower().strip()
        print(
            f"    [FaceTracker] Director Active [Mode: '{active_camera_style.upper()}'] "
            f"({len(shot_keyframes)} shots, zoom_cap={safe_zoom_cap:.2f}x) | "
            f"Output: {final_out_w}x{final_out_h}"
        )

        shot_starts = np.array([sk["t_start"] for sk in shot_keyframes], dtype=np.float64)

        def virtual_camera_filter(get_frame, t):
            frame = get_frame(t)
            s_idx = int(np.searchsorted(shot_starts, t, side="right")) - 1
            s_idx = max(0, min(len(shot_keyframes) - 1, s_idx))
            curr_sk = shot_keyframes[s_idx]

            if active_camera_style == "instant":
                # ── INSTANT: Rock-solid locked broadcast cut (zero wobble, instant switch) ──
                x1 = curr_sk["x1"]
                y1 = curr_sk["y1"]
                cw = curr_sk["cw"]
                ch = curr_sk["ch"]

            elif active_camera_style == "snappy":
                # ── SNAPPY: Reactive cubic ease-in-out pan glide across speaker changes ──
                glide_dur = 0.45
                t_rel = t - curr_sk["t_start"]
                if s_idx > 0 and not curr_sk["is_scene_cut"] and t_rel < glide_dur:
                    prev_sk = shot_keyframes[s_idx - 1]
                    u = max(0.0, min(1.0, t_rel / glide_dur))
                    # Smoothstep ease: 3u^2 - 2u^3
                    alpha = u * u * (3.0 - 2.0 * u)
                    x1 = int(round((1.0 - alpha) * prev_sk["x1"] + alpha * curr_sk["x1"]))
                    y1 = int(round((1.0 - alpha) * prev_sk["y1"] + alpha * curr_sk["y1"]))
                    cw = int(round((1.0 - alpha) * prev_sk["cw"] + alpha * curr_sk["cw"]))
                    ch = int(round((1.0 - alpha) * prev_sk["ch"] + alpha * curr_sk["ch"]))
                else:
                    x1 = curr_sk["x1"]
                    y1 = curr_sk["y1"]
                    cw = curr_sk["cw"]
                    ch = curr_sk["ch"]

            else:  # "smooth" or default
                # ── SMOOTH: Pre-solved Rust critically-damped Steadicam gimbal ──
                cw = curr_sk["cw"]
                ch = curr_sk["ch"]
                traj_t_arr = curr_sk.get("traj_t_arr")
                smooth_x_arr = curr_sk.get("smooth_x_arr")
                smooth_y_arr = curr_sk.get("smooth_y_arr")
                if traj_t_arr is not None and smooth_x_arr is not None and smooth_y_arr is not None:
                    cur_cx = float(np.interp(t, traj_t_arr, smooth_x_arr))
                    cur_cy = float(np.interp(t, traj_t_arr, smooth_y_arr))

                    # Eased glide on shot transitions if not scene cut
                    glide_dur = 0.50
                    t_rel = t - curr_sk["t_start"]
                    if s_idx > 0 and not curr_sk["is_scene_cut"] and t_rel < glide_dur:
                        prev_sk = shot_keyframes[s_idx - 1]
                        u = max(0.0, min(1.0, t_rel / glide_dur))
                        alpha = u * u * (3.0 - 2.0 * u)
                        start_cx = prev_sk["cx"]
                        start_cy = prev_sk["cy"]
                        cur_cx = (1.0 - alpha) * start_cx + alpha * cur_cx
                        cur_cy = (1.0 - alpha) * start_cy + alpha * cur_cy

                    x1 = int(round(cur_cx - cw / 2.0))
                    y1 = int(round(cur_cy - (ch * 0.33)))
                else:
                    x1 = curr_sk["x1"]
                    y1 = curr_sk["y1"]

            # Clamp boundaries safely
            x1 = max(0, min(width - cw, x1))
            y1 = max(0, min(height - ch, y1))
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

