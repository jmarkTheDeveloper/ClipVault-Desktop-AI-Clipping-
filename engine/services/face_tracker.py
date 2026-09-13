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
except ImportError:
    try:
        from subject_tracker import SubjectTracker
    except ImportError:
        from engine.services.subject_tracker import SubjectTracker


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
            
        # Initialize OpenCV HOG Body / Person Detector
        try:
            self.hog_detector = cv2.HOGDescriptor()
            self.hog_detector.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        except Exception:
            self.hog_detector = None

        try:
            print(f">> Computer Vision Pipeline: MediaPipe={self.mp_detector is not None}, FrontalCascade={self.frontal_cascade is not None}, ProfileCascade={self.profile_cascade is not None}, HOG={self.hog_detector is not None}, SubjectTracker=True")
        except Exception:
            pass

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
        scale = 0.75  # High-res sampling for precision
        small_frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
        small_h, small_w = small_frame.shape[:2]
        candidate_detections: List[Dict[str, Any]] = []

        # ── TIER 1: MediaPipe Neural Face Detector (TFLite) ──
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

        # ── TIER 2: Frontal Haar Cascade ──
        if self.frontal_cascade is not None:
            try:
                detected_frontal = self.frontal_cascade.detectMultiScale(
                    gray_eq, scaleFactor=1.12, minNeighbors=4, minSize=(30, 30)
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

        # ── TIER 3: Bidirectional Profile Haar Cascade (Both Left & Right Facing Profiles) ──
        if self.profile_cascade is not None:
            try:
                # 3A: Left-facing profiles (standard orientation)
                detected_left = self.profile_cascade.detectMultiScale(
                    gray_eq, scaleFactor=1.10, minNeighbors=3, minSize=(28, 28)
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

                # 3B: Right-facing profiles (horizontally flipped orientation)
                detected_right = self.profile_cascade.detectMultiScale(
                    gray_flipped, scaleFactor=1.10, minNeighbors=3, minSize=(28, 28)
                )
                for (fx, fy, fw, fh) in detected_right:
                    # Invert horizontal coordinate back to original non-flipped image
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

        # ── TIER 4: Seated Upper-Body & Skin-Cluster Spatial Anchoring ──
        # If fewer than 2 distinct horizontal zones have candidates, inspect skin chrominance
        # in the upper portion of the frame to anchor seated podcast speakers
        unique_zones = {int(d['center_x'] / (w * 0.40)) for d in candidate_detections}
        if len(unique_zones) < 2:
            try:
                # Skin chrominance detection in YCrCb: Cr in [133, 173], Cb in [77, 127]
                ycrcb = cv2.cvtColor(small_frame, cv2.COLOR_RGB2YCrCb)
                skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))

                # Mask out lower 35% (legs/shoes/table) and upper 5% (ceiling/lights)
                skin_mask[int(small_h * 0.65):, :] = 0
                skin_mask[:int(small_h * 0.05), :] = 0

                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                skin_clean = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
                skin_clean = cv2.dilate(skin_clean, kernel, iterations=2)

                contours, _ = cv2.findContours(skin_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                min_skin_area = (small_w * small_h) * 0.003
                max_skin_area = (small_w * small_h) * 0.18

                for c in contours:
                    area = cv2.contourArea(c)
                    if min_skin_area <= area <= max_skin_area:
                        bx, by, bw, bh = cv2.boundingRect(c)
                        ar = bw / float(bh)
                        if 0.4 <= ar <= 2.2:
                            orig_x = int(bx / scale)
                            orig_y = int(by / scale)
                            orig_w = int(bw / scale)
                            orig_h = int(bh / scale)
                            candidate_detections.append({
                                'center_x': orig_x + orig_w // 2,
                                'center_y': orig_y + orig_h // 2,
                                'width': orig_w,
                                'height': orig_h,
                                'confidence': 0.65,
                                'area': orig_w * orig_h,
                                'type': 'skin_head_cluster'
                            })
            except Exception:
                pass

        # ── TIER 5: HOG Person Detector Fallback ──
        if not candidate_detections and self.hog_detector is not None:
            try:
                rects, weights = self.hog_detector.detectMultiScale(small_frame, winStride=(8, 8), padding=(4, 4), scale=1.05)
                for (sx, sy, sw, sh), wgt in zip(rects, weights):
                    if wgt >= 0.25:
                        orig_x = int(sx / scale)
                        orig_y = int(sy / scale)
                        orig_w = int(sw / scale)
                        orig_h = int(sh / scale)
                        candidate_detections.append({
                            'center_x': orig_x + orig_w // 2,
                            'center_y': orig_y + orig_h // 3,
                            'width': orig_w,
                            'height': orig_h,
                            'confidence': float(wgt),
                            'area': orig_w * orig_h,
                            'type': 'hog_person'
                        })
            except Exception:
                pass

        # Filter out false-positive non-face detections
        valid_faces = []
        for f in candidate_detections:
            # 1. Human faces must be in the upper/middle portion of the frame (never at the bottom legs/feet region)
            if f['center_y'] > h * 0.72:
                continue
            # 2. Bounding box cannot take up more than 48% width or 52% height of the entire frame
            if f['width'] > w * 0.48 or f['height'] > h * 0.52 or f['area'] > (w * h * 0.22):
                continue
            # 3. Minimum size to avoid single-pixel noise
            if f['width'] < 16 or f['height'] < 16 or f['area'] < 250:
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
            # Rank faces by confidence and upper-body eye-level position
            def face_rank(f):
                eye_level_bonus = 1.0 - abs(f['center_y'] - h * 0.35) / h
                return (f['confidence'] ** 2) * (f['area'] ** 0.35) * eye_level_bonus

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
                    all_face_xs.append((d['center_x'], d['confidence'] * (d['area'] ** 0.5)))
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
            if hist[idx] >= total_mass * 0.10:
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

    def track_and_crop(self, clip, crop_ratio: float = 9/16, camera_style: str = "instant"):
        """
        Intelligent AI Video Director for 9:16 Shorts/Reels/TikTok.
        Features Rock-Solid Cinema Tripod Locking on primary speakers,
        eliminating dizzying camera drift and erratic back-and-forth movement.
        """
        width, height = clip.size
        target_width = int(height * crop_ratio)
        if target_width % 2 != 0:
            target_width -= 1

        if width <= target_width:
            return clip

        self.face_cache = {}

        fps_sample = 5
        num_samples = max(5, int(clip.duration * fps_sample))
        sample_times = np.linspace(0.05, max(0.1, clip.duration - 0.05), num_samples)

        all_frame_detections = []
        all_face_data = []

        prev_faces = []
        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                detected = self.detect_faces_in_frame(frame, frame_time=t)
                if detected:
                    for f in detected:
                        best_motion = 0.0
                        if 'mouth_roi' in f and prev_faces:
                            closest_prev = min(prev_faces, key=lambda pf: abs(pf['center_x'] - f['center_x']) + abs(pf['center_y'] - f['center_y']))
                            if 'mouth_roi' in closest_prev and abs(closest_prev['center_x'] - f['center_x']) < target_width * 0.35:
                                diff = np.mean(cv2.absdiff(f['mouth_roi'], closest_prev['mouth_roi']))
                                best_motion = float(diff)
                        f['mouth_motion'] = best_motion
                        all_face_data.append((f['center_x'], f['confidence'], f['area']))

                    all_frame_detections.append(detected)
                    prev_faces = detected
                else:
                    all_frame_detections.append([])
                    prev_faces = []
            except Exception:
                all_frame_detections.append([])
                prev_faces = []

        # ── 1. SPATIAL SPEAKER CLUSTERING & ANCHOR IDENTIFICATION ──
        speaker_clusters = []
        cluster_weights = []

        if all_face_data:
            xs = np.array([x for x, c, a in all_face_data], dtype=np.float64)
            weights = np.array([c * (a ** 0.5) for x, c, a in all_face_data], dtype=np.float64)

            nbins = max(10, int(width // 60))
            hist, bin_edges = np.histogram(xs, bins=nbins, weights=weights, range=(0, width))
            peak_indices = np.argsort(hist)[::-1]
            total_mass = np.sum(hist) if np.sum(hist) > 0 else 1.0

            for idx in peak_indices:
                if hist[idx] > 0 and hist[idx] >= total_mass * 0.08:
                    approx_peak = (bin_edges[idx] + bin_edges[idx + 1]) / 2.0
                    in_cluster_mask = np.abs(xs - approx_peak) < (target_width * 0.45)
                    if np.any(in_cluster_mask):
                        c_xs = xs[in_cluster_mask]
                        c_ws = weights[in_cluster_mask]
                        true_center = float(np.average(c_xs, weights=c_ws))
                        c_mass = float(np.sum(c_ws))
                    else:
                        true_center = approx_peak
                        c_mass = float(hist[idx])

                    if not any(abs(true_center - c) < target_width * 0.35 for c in speaker_clusters):
                        speaker_clusters.append(true_center)
                        cluster_weights.append(c_mass)
                        if len(speaker_clusters) >= 2:
                            break

        # Check if there is a Dominant Host / Primary Speaker (>= 85% detection mass)
        total_cluster_mass = sum(cluster_weights) if cluster_weights else 1.0
        primary_is_dominant = False
        primary_speaker_x = width / 2.0

        if speaker_clusters:
            primary_speaker_x = speaker_clusters[0]
            top_ratio = cluster_weights[0] / total_cluster_mass
            if len(speaker_clusters) == 1 or top_ratio >= 0.85:
                primary_is_dominant = True
        else:
            # When neural face detection finds 0 faces across all sample frames,
            # engage SubjectTracker to track non-human subjects (action, gameplay, sports, products)
            print("    [FaceTracker] 0 human faces detected. Engaging general-purpose SubjectTracker...")
            try:
                return self.subject_tracker.track_and_crop(clip, crop_ratio=crop_ratio, camera_style=camera_style)
            except Exception as st_err:
                print(f"    [FaceTracker] SubjectTracker notice: {st_err}")

        # ── 2. ROCK-SOLID TRIPOD LOCK FOR DOMINANT SINGLE SPEAKER / REACTION VIDEOS ──
        if primary_is_dominant or len(speaker_clusters) <= 1:
            # Center target box directly over primary speaker center_x while clamping within frame bounds
            cx = max(target_width / 2.0, min(width - target_width / 2.0, primary_speaker_x))
            x1 = int(round(cx - target_width / 2.0))
            x1 = max(0, min(width - target_width, x1))

            print(f"    [FaceTracker] Tripod Lock Active: Perfectly centered & locked at X={primary_speaker_x:.0f} (Crop X1={x1})")

            def static_tripod_filter(get_frame, t):
                frame = get_frame(t)
                return frame[:, x1:x1 + target_width]

            cropped_clip = clip.fl(static_tripod_filter, apply_to=["mask"])
            cropped_clip.size = (target_width, height)
            return cropped_clip

        # ── 3. TWO CO-HOST PODCAST / CONVERSATION MODE ──
        # Order clusters left-to-right: speaker_A is left, speaker_B is right
        speaker_A = min(speaker_clusters[0], speaker_clusters[1])
        speaker_B = max(speaker_clusters[0], speaker_clusters[1])
        cluster_dist = abs(speaker_B - speaker_A)
        # Tight 2-shot fit: two people sitting close together on the same couch (<= 40% target width)
        two_shot_fits = (cluster_dist <= target_width * 0.40)
        two_shot_center = max(target_width / 2.0, min(width - target_width / 2.0, (speaker_A + speaker_B) / 2.0))

        raw_shot_candidates = []
        last_active = 'SPEAKER_A'
        for det_list in all_frame_detections:
            if not det_list:
                raw_shot_candidates.append(last_active)
                continue

            faces_A = [f for f in det_list if abs(f['center_x'] - speaker_A) < target_width * 0.45]
            faces_B = [f for f in det_list if abs(f['center_x'] - speaker_B) < target_width * 0.45]
            act_A = max([f.get('mouth_motion', 0.0) for f in faces_A], default=0.0)
            act_B = max([f.get('mouth_motion', 0.0) for f in faces_B], default=0.0)

            if act_A >= 3.0 and act_A > act_B * 1.25:
                last_active = 'SPEAKER_A'
            elif act_B >= 3.0 and act_B > act_A * 1.25:
                last_active = 'SPEAKER_B'

            raw_shot_candidates.append(last_active)

        # Adjust reaction hysteresis & switching speed based on selected camera_style
        if camera_style == "instant":
            min_hold = max(1, int(fps_sample * 0.6)) # Ultra-fast 0.6s instant teleport cut
        else:
            min_hold = max(2, int(fps_sample * 1.5))

        director_shots = []
        current_shot = 'SPEAKER_A'
        hold_count = 0

        for i, cand in enumerate(raw_shot_candidates):
            if i < int(fps_sample * 0.6): # Establish scene fast
                director_shots.append('SPEAKER_A')
                continue

            if cand == current_shot:
                hold_count += 1
            else:
                fwd = raw_shot_candidates[i:i + 3]
                if hold_count >= min_hold and fwd.count(cand) >= 2:
                    current_shot = cand
                    hold_count = 1

            director_shots.append(current_shot)

        # Precompute target X centers per sample time
        # STRICT NO-MIDDLE-GROUND RULE: Never center on the table/dead-space between speakers
        target_xs = []
        for shot in director_shots:
            if shot == 'SPEAKER_A':
                c = max(target_width / 2.0, min(width - target_width / 2.0, speaker_A))
            elif shot == 'SPEAKER_B':
                c = max(target_width / 2.0, min(width - target_width / 2.0, speaker_B))
            else:
                if two_shot_fits:
                    c = two_shot_center
                else:
                    c = max(target_width / 2.0, min(width - target_width / 2.0, speaker_A))
            target_xs.append(c)

        sample_times_arr = np.array(sample_times, dtype=np.float64)
        target_xs_arr = np.array(target_xs, dtype=np.float64)

        print(f"    [FaceTracker] Camera Director Mode: '{camera_style}' ({len(director_shots)} direction keyframes)")

        def multi_speaker_filter(get_frame, t):
            frame = get_frame(t)
            
            if camera_style == "instant":
                # Instant Teleport Cut: Hard 0ms jump-cut directly to speaker (zero sliding)
                idx = int(np.searchsorted(sample_times_arr, t))
                idx = max(0, min(len(target_xs_arr) - 1, idx))
                cx = target_xs_arr[idx]
            elif camera_style == "snappy":
                # Snappy Glide: Fast 0.25s linear camera pan between speakers
                cx = float(np.interp(t, sample_times_arr, target_xs_arr))
            else:
                # Smooth Cinema: Cosine ease-in-out camera glide
                idx = int(np.searchsorted(sample_times_arr, t))
                idx = max(0, min(len(target_xs_arr) - 1, idx))
                prev_idx = max(0, idx - 1)
                t_start = sample_times_arr[prev_idx]
                t_end = sample_times_arr[idx]
                x_start = target_xs_arr[prev_idx]
                x_end = target_xs_arr[idx]
                if t_end > t_start and x_start != x_end:
                    factor = min(1.0, max(0.0, (t - t_start) / (t_end - t_start)))
                    ease_factor = (1.0 - np.cos(factor * np.pi)) / 2.0
                    cx = x_start + (x_end - x_start) * ease_factor
                else:
                    cx = target_xs_arr[idx]

            x1 = int(round(cx - target_width / 2.0))
            x1 = max(0, min(width - target_width, x1))
            return frame[:, x1:x1 + target_width]

        cropped_clip = clip.fl(multi_speaker_filter, apply_to=["mask"])
        cropped_clip.size = (target_width, height)
        return cropped_clip

    def close(self):
        """Releases resources used by the face detector."""
        self.face_cache = {}

