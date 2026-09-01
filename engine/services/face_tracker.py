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
        options = mp_vision.FaceDetectorOptions(base_options=base_options, min_detection_confidence=0.45)
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

        # Separate high-confidence real faces from noise/posters
        high_conf = [f for f in faces if f['confidence'] >= 0.55]
        valid_faces = high_conf if high_conf else [f for f in faces if f['confidence'] >= 0.40]
        result = sorted(valid_faces, key=lambda f: (f['confidence'] ** 2) * (f['area'] ** 0.5), reverse=True)

        # Extract mouth ROI patch for active speech / lip-motion detection
        for f in result:
            my1 = max(0, min(h - 1, int(f['center_y'] + f['height'] * 0.12)))
            my2 = max(0, min(h, int(f['center_y'] + f['height'] * 0.52)))
            mx1 = max(0, min(w - 1, int(f['center_x'] - f['width'] * 0.28)))
            mx2 = max(0, min(w, int(f['center_x'] + f['width'] * 0.28)))
            if my2 > my1 + 4 and mx2 > mx1 + 4:
                try:
                    m_crop = frame[my1:my2, mx1:mx2]
                    f['mouth_roi'] = cv2.resize(cv2.cvtColor(m_crop, cv2.COLOR_RGB2GRAY), (32, 20))
                except Exception:
                    pass

        if frame_time is not None:
            self.face_cache[frame_time] = result
        return result

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
        Features:
          - Active Speaker Tracking via Lip Motion & Spatial Clustering.
          - Automatic Two-Shot / Group 'Zoom Out' when 2 people or group interact.
          - Clean, instantaneous camera CUTS in 'instant' mode (zero dizzying panning/wobble).
          - Professional broadcast TV director pacing with 2.2s minimum shot hold.
        """
        width, height = clip.size
        target_width = int(height * crop_ratio)
        if target_width % 2 != 0:
            target_width -= 1

        if width <= target_width:
            return clip

        try:
            print(f"    >> Analyzing video across {clip.duration:.1f}s for active speaker & multi-person framing ({camera_style})...")
        except Exception:
            pass

        self.face_cache = {}

        # Sample frames at 6 FPS for high temporal resolution
        fps_sample = 6
        num_samples = max(6, int(clip.duration * fps_sample))
        sample_times = np.linspace(0.05, max(0.1, clip.duration - 0.05), num_samples)

        all_frame_detections = []
        all_face_data = []

        prev_faces = []
        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                detected = self.detect_faces_in_frame(frame, frame_time=t)
                # Compute mouth movement relative to previous frame
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

        # ── 1. SPATIAL SPEAKER CLUSTERING (Who are the people?) ──
        speaker_clusters = []
        if all_face_data:
            xs = np.array([x for x, c, a in all_face_data], dtype=np.float64)
            weights = np.array([c * (a ** 0.5) for x, c, a in all_face_data], dtype=np.float64)

            # High-resolution histogram for initial peak location
            nbins = max(8, int(width // 80))
            hist, bin_edges = np.histogram(xs, bins=nbins, weights=weights, range=(0, width))
            peak_indices = np.argsort(hist)[::-1]

            max_val = hist[peak_indices[0]] if len(peak_indices) > 0 else 1.0

            for idx in peak_indices:
                if hist[idx] > 0 and hist[idx] >= max_val * 0.15:
                    approx_peak = (bin_edges[idx] + bin_edges[idx + 1]) / 2.0
                    
                    # Refine centroid: Calculate TRUE weighted average of actual face coordinates around this peak
                    in_cluster_mask = np.abs(xs - approx_peak) < (target_width * 0.40)
                    if np.any(in_cluster_mask):
                        c_xs = xs[in_cluster_mask]
                        c_ws = weights[in_cluster_mask]
                        true_center = float(np.average(c_xs, weights=c_ws))
                    else:
                        true_center = approx_peak

                    # Avoid duplicate clusters that are too close
                    if not any(abs(true_center - c) < target_width * 0.35 for c in speaker_clusters):
                        speaker_clusters.append(true_center)
                        if len(speaker_clusters) >= 3:
                            break

        speaker_clusters.sort()

        # ── 2. PER-FRAME CONTINUOUS FACE TRACKING & TRAJECTORY ──
        # Calculate the primary face position at each sample time
        raw_centers = []
        for i, det_list in enumerate(all_frame_detections):
            if det_list:
                # Weighted center of all detected faces in this frame
                f_xs = [f['center_x'] for f in det_list]
                f_ws = [f['confidence'] * (f['area'] ** 0.5) for f in det_list]
                frame_cx = float(np.average(f_xs, weights=f_ws))
                raw_centers.append(frame_cx)
            else:
                # Carry forward previous center or fallback to main speaker cluster / screen center
                if raw_centers:
                    raw_centers.append(raw_centers[-1])
                elif speaker_clusters:
                    raw_centers.append(speaker_clusters[0])
                else:
                    raw_centers.append(width / 2.0)

        # ── 3. SINGLE SPEAKER OR NO FACE (Dynamic Steadicam Centering) ──
        if len(speaker_clusters) <= 1:
            main_speaker_x = speaker_clusters[0] if len(speaker_clusters) == 1 else (width / 2.0)
            
            # Apply Deadzone Steadicam Filter:
            # - Minor movements (< 40px) keep camera rock-solid (zero jitter)
            # - Real motion / pacing / shifting smoothly glides camera so face stays centered!
            smoothed_centers = []
            curr_cam_x = main_speaker_x
            deadzone = max(35.0, target_width * 0.08)

            for target_x in raw_centers:
                dist = target_x - curr_cam_x
                if abs(dist) > deadzone:
                    # Move camera towards face smoothly
                    step = (dist - np.sign(dist) * deadzone) * 0.35
                    curr_cam_x += step
                smoothed_centers.append(curr_cam_x)

            # Extra light temporal smoothing for cinematic fluidity
            smooth_kernel = np.array([0.15, 0.70, 0.15])
            smoothed_arr = np.convolve(smoothed_centers, smooth_kernel, mode='same')
            smoothed_arr[0] = smoothed_centers[0]
            smoothed_arr[-1] = smoothed_centers[-1]

            sample_times_arr = np.array(sample_times, dtype=np.float64)

            def dynamic_single_steadicam(get_frame, t):
                frame = get_frame(t)
                cx = float(np.interp(t, sample_times_arr, smoothed_arr))
                # Clamp to ensure target_width stays within video bounds without cutting
                cx = max(target_width / 2.0, min(width - target_width / 2.0, cx))
                x1 = int(round(cx - target_width / 2.0))
                x1 = max(0, min(width - target_width, x1))
                return frame[:, x1:x1 + target_width]

            cropped_clip = clip.fl(dynamic_single_steadicam, apply_to=["mask"])
            cropped_clip.size = (target_width, height)
            try:
                print(f"    [OK] Single Speaker Precision Steadicam Active at X={main_speaker_x:.0f} (Dynamic Head-Centering)")
            except Exception:
                pass
            return cropped_clip

        # ── 4. TWO SPEAKERS OR GROUP (Podcasts, Interviews, Conversations) ──
        speaker_A = speaker_clusters[0]
        speaker_B = speaker_clusters[1]
        cluster_dist = abs(speaker_B - speaker_A)

        # Check if both speakers fit comfortably in a single 9:16 vertical crop
        two_shot_fits_in_vertical = (cluster_dist <= target_width * 0.78)
        two_shot_center = (speaker_A + speaker_B) / 2.0
        two_shot_center = max(target_width / 2.0, min(width - target_width / 2.0, two_shot_center))

        try:
            shot_fit_label = "tight 2-shot" if two_shot_fits_in_vertical else "wide zoom-out"
            print(f"    [OK] Detected 2 Co-Speakers (A={speaker_A:.0f}, B={speaker_B:.0f}). Multi-person mode: {shot_fit_label}")
        except Exception:
            pass

        # ── 5. ACTIVE SPEAKER DETECTION PER TIME STEP ──
        raw_shot_candidates = []
        for det_list in all_frame_detections:
            if not det_list:
                raw_shot_candidates.append('TWO_SHOT')
                continue

            # Measure mouth activity for Speaker A vs Speaker B
            faces_A = [f for f in det_list if abs(f['center_x'] - speaker_A) < target_width * 0.45]
            faces_B = [f for f in det_list if abs(f['center_x'] - speaker_B) < target_width * 0.45]

            act_A = max([f.get('mouth_motion', 0.0) for f in faces_A], default=0.0)
            act_B = max([f.get('mouth_motion', 0.0) for f in faces_B], default=0.0)

            # Strong active speaker distinction
            if act_A >= 3.5 and act_A > act_B * 1.30:
                raw_shot_candidates.append('SPEAKER_A')
            elif act_B >= 3.5 and act_B > act_A * 1.30:
                raw_shot_candidates.append('SPEAKER_B')
            else:
                # Both talking, crosstalk, laughing, or both quiet -> Zoom-Out Two-Shot
                raw_shot_candidates.append('TWO_SHOT')

        # ── 6. BROADCAST TV DIRECTOR HYSTERESIS (Min Hold = 2.0s, No Ping-Pong) ──
        min_hold_samples = int(fps_sample * 2.0)  # ~12 samples = 2.0 seconds minimum hold
        initial_establish_samples = int(fps_sample * 1.5) # First 1.5s establishes the scene with two-shot

        director_shots = []
        current_shot = 'TWO_SHOT'
        shot_hold_count = 0

        for i, candidate in enumerate(raw_shot_candidates):
            # Clip opening: always establish with Two-Shot / Zoom-Out view
            if i < initial_establish_samples:
                director_shots.append('TWO_SHOT')
                current_shot = 'TWO_SHOT'
                shot_hold_count += 1
                continue

            if candidate == current_shot:
                shot_hold_count += 1
                director_shots.append(current_shot)
            else:
                # Candidate wants to switch
                forward_window = raw_shot_candidates[i:i + 4]
                candidate_persistent = (forward_window.count(candidate) >= 3)

                if shot_hold_count >= min_hold_samples and candidate_persistent:
                    current_shot = candidate
                    shot_hold_count = 1
                elif shot_hold_count < min_hold_samples and candidate_persistent and current_shot != 'TWO_SHOT':
                    # Fast turn-taking / rapid banter (< 2s) -> Switch to Two-Shot / Zoom-Out!
                    current_shot = 'TWO_SHOT'
                    shot_hold_count = 1

                director_shots.append(current_shot)

        # ── 7. CAMERA STYLE EXECUTION (Instant Cut vs Smooth/Snappy) ──
        sample_times_arr = np.array(sample_times, dtype=np.float64)

        if camera_style == "instant":
            # DIRECT CUT: Camera is 100% static during each shot, and cuts instantly on shot change!
            def dynamic_instant_filter(get_frame, t):
                frame = get_frame(t)
                idx = int(np.searchsorted(sample_times_arr, t))
                idx = max(0, min(len(director_shots) - 1, idx))
                active_shot = director_shots[idx]

                if active_shot == 'SPEAKER_A':
                    cx = speaker_A
                    cx = max(target_width / 2.0, min(width - target_width / 2.0, cx))
                    x1 = int(round(cx - target_width / 2.0))
                    x1 = max(0, min(width - target_width, x1))
                    return frame[:, x1:x1 + target_width]
                elif active_shot == 'SPEAKER_B':
                    cx = speaker_B
                    cx = max(target_width / 2.0, min(width - target_width / 2.0, cx))
                    x1 = int(round(cx - target_width / 2.0))
                    x1 = max(0, min(width - target_width, x1))
                    return frame[:, x1:x1 + target_width]
                else: # 'TWO_SHOT'
                    if two_shot_fits_in_vertical:
                        x1 = int(round(two_shot_center - target_width / 2.0))
                        x1 = max(0, min(width - target_width, x1))
                        return frame[:, x1:x1 + target_width]
                    else:
                        return self.render_wide_zoom_frame(frame, target_width, height)

            cropped_clip = clip.fl(dynamic_instant_filter, apply_to=["mask"])
            cropped_clip.size = (target_width, height)
            try:
                print(f"    [OK] Multi-Person Instant Cut Director Active (Zero Jitter, Instant Transitions)")
            except Exception:
                pass
            return cropped_clip

        else:
            # 'snappy' or 'smooth' with gentle camera gliding
            target_positions = []
            for shot in director_shots:
                if shot == 'SPEAKER_A':
                    target_positions.append(speaker_A)
                elif shot == 'SPEAKER_B':
                    target_positions.append(speaker_B)
                else:
                    target_positions.append(two_shot_center)

            # Apply smoothing filter
            kernel = np.array([0.15, 0.70, 0.15]) if camera_style == "snappy" else np.array([0.05, 0.20, 0.50, 0.20, 0.05])
            smoothed_positions = np.convolve(target_positions, kernel, mode='same')
            smoothed_positions[0] = target_positions[0]
            smoothed_positions[-1] = target_positions[-1]
            smoothed_arr = np.array(smoothed_positions, dtype=np.float64)

            def dynamic_glide_filter(get_frame, t):
                frame = get_frame(t)
                idx = int(np.searchsorted(sample_times_arr, t))
                idx = max(0, min(len(director_shots) - 1, idx))
                active_shot = director_shots[idx]

                if active_shot == 'TWO_SHOT' and not two_shot_fits_in_vertical:
                    return self.render_wide_zoom_frame(frame, target_width, height)

                center_x = float(np.interp(t, sample_times_arr, smoothed_arr))
                center_x = max(target_width / 2.0, min(width - target_width / 2.0, center_x))
                x1 = int(round(center_x - target_width / 2.0))
                x1 = max(0, min(width - target_width, x1))
                return frame[:, x1:x1 + target_width]

            cropped_clip = clip.fl(dynamic_glide_filter, apply_to=["mask"])
            cropped_clip.size = (target_width, height)
            try:
                print(f"    [OK] Multi-Person Gliding Steadicam Active (Style: {camera_style})")
            except Exception:
                pass
            return cropped_clip

    def close(self):
        """Releases resources used by the face detector."""
        self.face_cache = {}

