"""
FaceTracker Service - High-Precision Neural Face Tracking & Rock-Solid 9:16 Framing.
Combines MediaPipe TFLite Neural Detector, OpenCV Frontal/Profile Cascades, and HOG Body Detectors
with a Zero-Jitter Tripod Deadzone Steadicam Algorithm.
"""
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import cv2
import numpy as np

# MediaPipe Tasks (TFLite) Neural Detector
mp_face_detector = None
try:
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    import mediapipe as mp
    
    model_path = Path(__file__).parent.parent / "models" / "blaze_face_short_range.tflite"
    if model_path.exists():
        base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
        options = mp_vision.FaceDetectorOptions(base_options=base_options, min_detection_confidence=0.3)
        mp_face_detector = mp_vision.FaceDetector.create_from_options(options)
        try:
            print(">> Initialized MediaPipe Neural Face Detector (TFLite)")
        except Exception:
            pass
except Exception:
    mp_face_detector = None


class FaceTracker:
    """
    Tracks human faces, side profiles, and speakers with zero-jitter tripod stability.
    """
    def __init__(self):
        self.face_cache: Dict[float, List[Dict[str, Any]]] = {}
        self.mp_detector = mp_face_detector
        
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
            print(f">> Computer Vision Pipeline: MediaPipe={self.mp_detector is not None}, FrontalCascade={self.frontal_cascade is not None}, ProfileCascade={self.profile_cascade is not None}, HOG={self.hog_detector is not None}")
        except Exception:
            pass

    def detect_faces_in_frame(self, frame: np.ndarray, frame_time: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Detects faces or speakers in a frame using a robust 4-tier detection pipeline.
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
        faces: List[Dict[str, Any]] = []

        # ── TIER 1: MediaPipe Neural Face Detector (TFLite) ──
        if self.mp_detector is not None:
            try:
                # MoviePy frame is ALREADY RGB; do not invert to BGR!
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
                        faces.append({
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

        # ── TIER 2: OpenCV Frontal Face Haar Cascade ──
        if not faces and self.frontal_cascade is not None:
            try:
                gray = cv2.cvtColor(small_frame, cv2.COLOR_RGB2GRAY)
                gray_eq = cv2.equalizeHist(gray)
                detected = self.frontal_cascade.detectMultiScale(
                    gray_eq, scaleFactor=1.10, minNeighbors=4, minSize=(28, 28)
                )
                for (sx, sy, sw, sh) in detected:
                    orig_x = int(sx / scale)
                    orig_y = int(sy / scale)
                    orig_w = int(sw / scale)
                    orig_h = int(sh / scale)
                    faces.append({
                        'center_x': orig_x + orig_w // 2,
                        'center_y': orig_y + orig_h // 2,
                        'width': orig_w,
                        'height': orig_h,
                        'confidence': 0.85,
                        'area': orig_w * orig_h,
                        'type': 'frontal_haar'
                    })
            except Exception:
                pass

        # ── TIER 3: OpenCV Profile Face Cascade (Side Profiles) ──
        if not faces and self.profile_cascade is not None:
            try:
                if 'gray_eq' not in locals():
                    gray_eq = cv2.equalizeHist(cv2.cvtColor(small_frame, cv2.COLOR_RGB2GRAY))
                
                # Right profile
                detected_prof = self.profile_cascade.detectMultiScale(
                    gray_eq, scaleFactor=1.12, minNeighbors=4, minSize=(28, 28)
                )
                for (sx, sy, sw, sh) in detected_prof:
                    faces.append({
                        'center_x': int((sx + sw // 2) / scale),
                        'center_y': int((sy + sh // 2) / scale),
                        'width': int(sw / scale),
                        'height': int(sh / scale),
                        'confidence': 0.80,
                        'area': int((sw * sh) / (scale * scale)),
                        'type': 'profile_haar'
                    })
                    
                # Left profile (flipped)
                if not faces:
                    gray_flipped = cv2.flip(gray_eq, 1)
                    detected_prof_flip = self.profile_cascade.detectMultiScale(
                        gray_flipped, scaleFactor=1.12, minNeighbors=4, minSize=(28, 28)
                    )
                    for (sx, sy, sw, sh) in detected_prof_flip:
                        unflipped_x = small_w - (sx + sw)
                        faces.append({
                            'center_x': int((unflipped_x + sw // 2) / scale),
                            'center_y': int((sy + sh // 2) / scale),
                            'width': int(sw / scale),
                            'height': int(sh / scale),
                            'confidence': 0.80,
                            'area': int((sw * sh) / (scale * scale)),
                            'type': 'profile_haar_flip'
                        })
            except Exception:
                pass

        # ── TIER 4: OpenCV HOG Human / Person Detector ──
        if not faces and self.hog_detector is not None:
            try:
                bgr_small = cv2.cvtColor(small_frame, cv2.COLOR_RGB2BGR)
                boxes, weights = self.hog_detector.detectMultiScale(bgr_small, winStride=(8, 8), padding=(4, 4), scale=1.05)
                for i, (sx, sy, sw, sh) in enumerate(boxes):
                    conf = float(weights[i]) if len(weights) > i else 0.75
                    if conf > 0.1:
                        head_cy = int((sy + sh * 0.25) / scale)
                        head_cx = int((sx + sw * 0.50) / scale)
                        faces.append({
                            'center_x': head_cx,
                            'center_y': head_cy,
                            'width': int(sw / scale),
                            'height': int((sh * 0.4) / scale),
                            'confidence': conf,
                            'area': int((sw * sh) / (scale * scale)),
                            'type': 'hog_person'
                        })
            except Exception:
                pass

        # Sort by prominence: confidence * area
        result = sorted(faces, key=lambda f: f['confidence'] * f['area'], reverse=True)
        if frame_time is not None:
            self.face_cache[frame_time] = result
        return result

    def track_and_crop(self, clip, crop_ratio: float = 9/16, camera_style: str = "smooth"):
        """
        Tracks faces/speakers in a video clip with rock-solid tripod stability and buttery-smooth cinematic panning.
        Includes Multi-Speaker Group Locking and Sticky Anchor Hysteresis to eliminate wobbly/ping-pong movement in multi-person scenes.
        """
        width, height = clip.size
        target_width = int(height * crop_ratio)
        if target_width % 2 != 0: target_width -= 1
        
        if width <= target_width:
            try:
                print("    >> Video already in target aspect ratio, skipping horizontal crop")
            except Exception:
                pass
            return clip

        try:
            print(f"    >> Analyzing frames across {clip.duration:.1f}s for rock-solid 9:16 {camera_style} face tracking...")
        except Exception:
            pass
        self.face_cache = {}

        # Sample frames across the clip timeline (3 samples/sec for accurate tracking)
        fps_sample = 3
        num_samples = max(4, int(clip.duration * fps_sample))
        sample_times = np.linspace(0.05, max(0.1, clip.duration - 0.05), num_samples)

        all_frame_detections = []
        all_face_centers = []

        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                detected = self.detect_faces_in_frame(frame, frame_time=t)
                if detected:
                    max_area = max(f['area'] for f in detected)
                    # Filter out small background faces / noise
                    valid = [f for f in detected if f['area'] >= max_area * 0.35 and f['confidence'] >= 0.35]
                    all_frame_detections.append(valid if valid else detected[:1])
                    for f in (valid if valid else detected[:1]):
                        all_face_centers.append((f['center_x'], f['area'] * f['confidence']))
                else:
                    all_frame_detections.append([])
            except Exception:
                all_frame_detections.append([])

        # ── 1. GLOBAL MULTI-PERSON CLUSTERING & GROUP LOCK ──
        if all_face_centers:
            xs = np.array([x for x, w in all_face_centers])
            weights = np.array([w for x, w in all_face_centers])
            nbins = max(4, int(width // 150))
            hist, bin_edges = np.histogram(xs, bins=nbins, weights=weights, range=(0, width))
            peak_indices = np.argsort(hist)[::-1]

            speaker_clusters = []
            for idx in peak_indices:
                if hist[idx] > 0 and (len(speaker_clusters) == 0 or hist[idx] >= hist[peak_indices[0]] * 0.22):
                    c_pos = (bin_edges[idx] + bin_edges[idx+1]) / 2.0
                    if not any(abs(c_pos - c) < target_width * 0.40 for c in speaker_clusters):
                        speaker_clusters.append(c_pos)
                        if len(speaker_clusters) >= 3:
                            break

            # Case A: Two persistent speakers (Interview / Podcast / Co-host)
            if len(speaker_clusters) == 2:
                dist = abs(speaker_clusters[0] - speaker_clusters[1])
                # If both speakers fit comfortably in vertical 9:16 frame, LOCK TWO-SHOT TRIPOD
                if dist <= target_width * 0.90:
                    group_center = (speaker_clusters[0] + speaker_clusters[1]) / 2.0
                    group_center = max(target_width / 2.0, min(width - target_width / 2.0, group_center))
                    x1 = int(round(group_center - target_width / 2.0))
                    x1 = max(0, min(width - target_width, x1))
                    try:
                        print(f"    [OK] Locked Two-Shot Group Tripod at X={group_center:.0f} (Zero Ping-Pong Wiggle)")
                    except Exception:
                        pass
                    return clip.crop(x1=x1, width=target_width)

            # Case B: 3+ People (Panel / Crowd / Group) -> Lock on group centroid
            if len(speaker_clusters) >= 3:
                group_span = max(speaker_clusters[:3]) - min(speaker_clusters[:3])
                if group_span <= target_width * 0.95:
                    group_center = float(np.average(speaker_clusters[:3]))
                    locked_pos = max(target_width / 2.0, min(width - target_width / 2.0, group_center))
                    x1 = int(round(locked_pos - target_width / 2.0))
                    x1 = max(0, min(width - target_width, x1))
                    try:
                        print(f"    [OK] Locked Group Centroid Tripod at X={locked_pos:.0f} (Zero Jitter)")
                    except Exception:
                        pass
                    return clip.crop(x1=x1, width=target_width)

        # ── 2. STICKY ANCHOR & TEMPORAL TRACKING ──
        face_positions: List[Optional[float]] = []
        current_sticky_anchor: Optional[float] = None

        for faces in all_frame_detections:
            if faces:
                if len(faces) == 1:
                    current_sticky_anchor = float(faces[0]['center_x'])
                    face_positions.append(current_sticky_anchor)
                else:
                    # Multi-face frame: prioritize closest face to current sticky anchor to prevent jumping
                    if current_sticky_anchor is not None:
                        closest = min(faces, key=lambda f: abs(f['center_x'] - current_sticky_anchor))
                        # If closest is reasonably sized, stick to it
                        current_sticky_anchor = float(closest['center_x'])
                        face_positions.append(current_sticky_anchor)
                    else:
                        primary = max(faces, key=lambda f: f['area'] * f['confidence'])
                        current_sticky_anchor = float(primary['center_x'])
                        face_positions.append(current_sticky_anchor)
            else:
                face_positions.append(current_sticky_anchor)

        # Backward & forward fill missing frames
        valid_positions = [p for p in face_positions if p is not None]
        if not valid_positions:
            filled_positions = [float(width // 2)] * len(sample_times)
        else:
            first_val = valid_positions[0]
            filled_positions: List[float] = []
            last_seen = first_val
            for p in face_positions:
                if p is not None:
                    last_seen = p
                filled_positions.append(float(last_seen))

        # ── 3. ZERO-JITTER TRIPOD LOCK ──
        pos_min = min(filled_positions)
        pos_max = max(filled_positions)
        pos_span = pos_max - pos_min

        # If total speaker movement across the clip is within 30% of video width,
        # lock a 100% static tripod crop (zero wiggle, zero jitter, perfectly stable).
        if pos_span < width * 0.30 and camera_style == "smooth":
            median_pos = float(np.median(filled_positions))
            median_pos = max(target_width / 2.0, min(width - target_width / 2.0, median_pos))
            x1 = int(round(median_pos - target_width / 2.0))
            x1 = max(0, min(width - target_width, x1))
            
            try:
                print(f"    [OK] Rock-Solid Tripod Locked at X={median_pos:.0f} (Zero Jitter, {target_width}x{height})")
            except Exception:
                pass
            return clip.crop(x1=x1, width=target_width)

        # ── 4. HOLLYWOOD STEADICAM WITH GAUSSIAN SMOOTHING ──
        deadzone_ratio = 0.30 if camera_style == "snappy" else 0.65
        deadzone_width = target_width * deadzone_ratio
        smoothing_factor = 0.20 if camera_style == "snappy" else 0.04
        required_hold_frames = 2 if camera_style == "snappy" else 6

        smoothed: List[float] = []
        current_cam_pos = float(np.median(filled_positions[:3]))
        stable_target_pos = current_cam_pos
        frames_held = 0

        for target_pos in filled_positions:
            if abs(target_pos - stable_target_pos) > width * 0.12:
                frames_held += 1
                if frames_held >= required_hold_frames:
                    stable_target_pos = target_pos
                    frames_held = 0
            else:
                frames_held = 0

            dist = stable_target_pos - current_cam_pos
            if abs(dist) > width * 0.45:
                # Hard scene transition / angle cut
                current_cam_pos = stable_target_pos
            elif abs(dist) > deadzone_width / 2.0:
                if dist > 0:
                    desired_cam = stable_target_pos - (deadzone_width / 2.0)
                else:
                    desired_cam = stable_target_pos + (deadzone_width / 2.0)
                current_cam_pos += (desired_cam - current_cam_pos) * smoothing_factor

            clamped_cam = max(target_width / 2.0, min(width - target_width / 2.0, current_cam_pos))
            smoothed.append(float(clamped_cam))

        # Multi-stage Gaussian filter smoothing
        if len(smoothed) >= 5:
            kernel = np.array([0.05, 0.20, 0.50, 0.20, 0.05])
            smoothed_np = np.convolve(smoothed, kernel, mode='same')
            smoothed_np[:2] = smoothed[:2]
            smoothed_np[-2:] = smoothed[-2:]
            smoothed = list(smoothed_np)

        sample_times_arr = np.array(sample_times, dtype=np.float64)
        smoothed_arr = np.array(smoothed, dtype=np.float64)

        def dynamic_crop_filter(get_frame, t):
            frame = get_frame(t)
            center_x = float(np.interp(t, sample_times_arr, smoothed_arr))
            center_x = max(target_width / 2.0, min(width - target_width / 2.0, center_x))
            x1 = int(round(center_x - target_width / 2.0))
            x1 = max(0, min(width - target_width, x1))
            x2 = x1 + target_width
            return frame[:, x1:x2]

        cropped_clip = clip.fl(dynamic_crop_filter, apply_to=["mask"])
        cropped_clip.size = (target_width, height)

        try:
            print(f"    [OK] Multi-Speaker Steadicam Active ({target_width}x{height}, Camera Style: {camera_style})")
        except Exception:
            pass
        self.face_cache = {}
        return cropped_clip

    def close(self):
        """Releases resources used by the face detector."""
        self.face_cache = {}

