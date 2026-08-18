import cv2
try:
    import mediapipe as mp
    import mediapipe.solutions.face_detection
except ImportError:
    mp = None
import numpy as np


class FaceTracker:
    """
    Tracks faces in a video and crops the frame to keep the speaker centered.
    """
    def __init__(self):
        """
        Initializes the FaceTracker with a MediaPipe face detection model
        or falls back to OpenCV Haar Cascades if MediaPipe is not available.
        """
        # Cache for detected faces to avoid reprocessing
        self.face_cache = {}
        self.face_detection = None
        self.face_cascade = None
        
        # Initialize OpenCV Haar Cascade as a universal fallback detector
        try:
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.face_cascade = cv2.CascadeClassifier(cascade_path)
            if self.face_cascade.empty():
                print("⚠️ OpenCV Haar Cascade XML loaded empty. Fallback face tracking disabled.")
                self.face_cascade = None
            else:
                print("🎯 Initialized fallback face tracking with OpenCV Haar Cascades")
        except Exception as e:
            print(f"⚠️ OpenCV Haar Cascade initialization failed: {e}")

        if mp is not None:
            try:
                self.mp_face_detection = mp.solutions.face_detection
                # Use model_selection=0 (short-range) for better performance
                # Increase min_detection_confidence to reduce false positives
                self.face_detection = self.mp_face_detection.FaceDetection(
                    model_selection=0, min_detection_confidence=0.3
                )
                
                # Add Pose Tracking as fallback
                if hasattr(mp.solutions, 'pose'):
                    self.mp_pose = mp.solutions.pose
                    self.pose_detection = self.mp_pose.Pose(
                        static_image_mode=False,
                        model_complexity=0,
                        min_detection_confidence=0.3
                    )
                print("🎯 Initialized intelligent face & pose tracking with MediaPipe (optimized)")
            except AttributeError as e:
                print(f"⚠️ MediaPipe solutions module is missing (using OpenCV fallback): {e}")
            except Exception as e:
                print(f"⚠️ MediaPipe Face/Pose Detection initialization failed (using OpenCV fallback): {e}")

    def detect_faces_in_frame(self, frame, frame_time=None):
        """
        Detects faces in a single frame of a video.

        Args:
            frame (numpy.ndarray): The video frame to process.
            frame_time (float, optional): The timestamp of the frame.
                                           Defaults to None.

        Returns:
            list: A list of dictionaries, each representing a detected face.
        """
        # Use cache if available
        if frame_time is not None and frame_time in self.face_cache:
            return self.face_cache[frame_time]
            
        try:
            # Resize frame for faster processing (half size)
            h, w, _ = frame.shape
            scale = 0.5
            small_frame = cv2.resize(frame, (int(w*scale), int(h*scale)))
            faces = []
            
            if self.face_detection is not None:
                # Convert to RGB (required by MediaPipe)
                rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                results = self.face_detection.process(rgb_frame)

                if results.detections:
                    for detection in results.detections:
                        bbox = detection.location_data.relative_bounding_box
                        x = int(bbox.xmin * w)  # Scale back to original size
                        y = int(bbox.ymin * h)
                        width = int(bbox.width * w)
                        height = int(bbox.height * h)

                        center_x = x + width // 2
                        center_y = y + height // 2
                        confidence = detection.score[0]

                        faces.append({
                            'center_x': center_x,
                            'center_y': center_y,
                            'width': width,
                            'height': height,
                            'confidence': confidence,
                            'area': width * height
                        })
            elif self.face_cascade is not None:
                # Fallback to OpenCV Haar Cascades
                gray_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2GRAY)
                # Equalize to improve face detection contrast
                gray_frame = cv2.equalizeHist(gray_frame)
                detected = self.face_cascade.detectMultiScale(
                    gray_frame,
                    scaleFactor=1.1,
                    minNeighbors=5,
                    minSize=(30, 30)
                )
                for (small_x, small_y, small_w, small_h) in detected:
                    # Scale coordinates back to original size
                    x = int(small_x / scale)
                    y = int(small_y / scale)
                    width = int(small_w / scale)
                    height = int(small_h / scale)
                    center_x = x + width // 2
                    center_y = y + height // 2

                    faces.append({
                        'center_x': center_x,
                        'center_y': center_y,
                        'width': width,
                        'height': height,
                        'confidence': 1.0, # Haar cascades don't output score, default to 1.0
                        'area': width * height
                    })

            if not faces and hasattr(self, 'pose_detection') and self.pose_detection is not None:
                # Run Pose Detection as fallback only if no face is detected
                if 'rgb_frame' not in locals():
                    rgb_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
                
                pose_results = self.pose_detection.process(rgb_frame)
                if pose_results.pose_landmarks:
                    landmarks = pose_results.pose_landmarks.landmark
                    # 11: left shoulder, 12: right shoulder, 0: nose
                    l_sh = landmarks[11]
                    r_sh = landmarks[12]
                    
                    if l_sh.visibility > 0.3 and r_sh.visibility > 0.3:
                        # Use chest center
                        cx = (l_sh.x + r_sh.x) / 2
                        cy = (l_sh.y + r_sh.y) / 2
                    else:
                        # Fallback to nose
                        cx = landmarks[0].x
                        cy = landmarks[0].y
                        
                    center_x = int(cx * w)
                    center_y = int(cy * h)
                    
                    # Create a pseudo-face at the body center
                    pseudo_width = int(w * 0.2)
                    pseudo_height = int(h * 0.3)
                    
                    faces.append({
                        'center_x': center_x,
                        'center_y': center_y,
                        'width': pseudo_width,
                        'height': pseudo_height,
                        'confidence': 0.7,
                        'area': pseudo_width * pseudo_height
                    })

            result = sorted(faces, key=lambda f: f['confidence'] * f['area'], reverse=True)
            
            # Cache the result
            if frame_time is not None:
                self.face_cache[frame_time] = result
                
            return result
        except Exception as e:
            print(f"    ⚠️ Face detection error: {e}")
            return []

    def smooth_trajectory(self, positions, window_size=5):
        """
        Smoothes a trajectory of positions using a moving average.

        Args:
            positions (list): A list of (x, y) tuples representing positions.
            window_size (int, optional): The size of the moving average window.
                                         Defaults to 5.

        Returns:
            list: A list of smoothed (x, y) tuples.
        """
        if len(positions) <= window_size:
            return positions

        smoothed = []
        for i in range(len(positions)):
            start_idx = max(0, i - window_size // 2)
            end_idx = min(len(positions), i + window_size // 2 + 1)
            window = positions[start_idx:end_idx]

            avg_x = sum(pos[0] for pos in window) / len(window)
            avg_y = sum(pos[1] for pos in window) / len(window)
            smoothed.append((avg_x, avg_y))

        return smoothed
    def track_and_crop(self, clip, crop_ratio=9/16, camera_style="smooth"):
        """
        Tracks faces in a video clip and crops it to keep the speaker centered.

        Args:
            clip (moviepy.editor.VideoFileClip): The video clip to process.
            crop_ratio (float, optional): The crop aspect ratio. Defaults to 9/16.
            camera_style (str, optional): 'smooth' for slow gentle panning, 'snappy' for fast tracking.

        Returns:
            moviepy.editor.VideoFileClip: The cropped video clip.
        """
        width, height = clip.size
        target_width = int(height * crop_ratio)
        if target_width % 2 != 0:
            target_width -= 1
        if width <= target_width:
            print("    ⏩ Skipping face tracking - video already in target aspect ratio")
            return clip

        if self.face_detection is None and self.face_cascade is None:
            # Fallback to static center cropping
            center_x = width // 2
            left = center_x - target_width // 2
            left = max(0, min(width - target_width, left))
            print(f"    ⚠️ Face tracking is disabled. Static center cropping to {target_width}x{height}...")
            # Use faster cropping for better performance
            cropped_clip = clip.crop(x1=left, width=target_width)
            return cropped_clip

        print("    🎯 Analyzing frames for optimal face tracking (optimized)...")

        # Clear cache for new clip
        self.face_cache = {}
        
        face_positions = []
        # Sample frames for smoother panning (higher for snappy to catch fast movements)
        fps_sample = 4 if camera_style == "snappy" else 2
        num_samples = max(3, int(clip.duration * fps_sample))
        print(f"    ⏳ Analyzing {num_samples} frames across {clip.duration:.1f}s of video for dynamic {camera_style} panning...")
            
        # Avoid exact boundaries (0.0 and clip.duration) to prevent MoviePy EOF/frame-reading errors
        sample_times = np.linspace(0.1, clip.duration - 0.1, num_samples)

        for i, t in enumerate(sample_times):
            try:
                frame = clip.get_frame(t)
                faces = self.detect_faces_in_frame(frame, frame_time=t)

                if faces:
                    # Filter out tiny background faces
                    largest_area = faces[0]['area']
                    significant_faces = [f for f in faces if f['area'] >= largest_area * 0.25]
                    
                    if len(significant_faces) == 1:
                        face_positions.append(significant_faces[0]['center_x'])
                    else:
                        # Find the leftmost and rightmost person, and center the camera between them
                        min_x = min(f['center_x'] for f in significant_faces)
                        max_x = max(f['center_x'] for f in significant_faces)
                        midpoint_x = (min_x + max_x) / 2
                        face_positions.append(midpoint_x)
                else:
                    face_positions.append(None)

            except Exception as e:
                print(f"    ⚠️ Error processing frame at {t:.2f}s: {e}")
                face_positions.append(None)

        # Forward-fill and backward-fill missing detections
        valid_positions = [p for p in face_positions if p is not None]
        if not valid_positions:
            # If absolutely no faces or poses were found in the ENTIRE video, default to center
            face_positions = [width // 2] * len(face_positions)
        else:
            # Backward fill initial missing frames with the FIRST known location
            first_valid = valid_positions[0]
            for i in range(len(face_positions)):
                if face_positions[i] is None:
                    face_positions[i] = first_valid
                else:
                    break
                    
            # Forward fill any other missing frames with the LAST known location
            for i in range(1, len(face_positions)):
                if face_positions[i] is None:
                    face_positions[i] = face_positions[i-1]

        ratio_str = "9:16" if crop_ratio == 9/16 else "9:8"

        if face_positions:
            print(f"    🎯 Calculating cinematic '{camera_style}' tracking trajectory (Deadzone + EMA)...")
            
            # 1. Deadzone Configuration
            # 'smooth': Very wide deadzone (50% of frame), camera stays still like a tripod
            # 'snappy': Tight deadzone (20% of frame), camera follows action quickly but resists micro-jitters
            deadzone_ratio = 0.20 if camera_style == "snappy" else 0.50
            deadzone_width = target_width * deadzone_ratio
            
            # 2. Smooth Pursuit (EMA) Configuration
            # How fast the camera catches up (0.0 to 1.0)
            smoothing_factor = 0.35 if camera_style == "snappy" else 0.08
            
            # 3. Target Locking (Hysteresis) Configuration
            # We sample at 2 to 4 frames per second. 
            # We want to ignore 1 or 2 frame glitches (which represent 0.25s - 1.0s of time).
            required_hold_frames = 2 if camera_style == "snappy" else 3
            
            smoothed = []
            
            # Initialize camera position (centered on the first face)
            current_cam_pos = face_positions[0]
            
            # Debounce state for target locking
            stable_target_pos = face_positions[0]
            frames_held = 0
            
            for face_pos in face_positions:
                # TARGET LOCKING (Hysteresis)
                # Check if the detected face jumped far away from our currently locked target
                if abs(face_pos - stable_target_pos) > width * 0.15:
                    frames_held += 1
                    if frames_held >= required_hold_frames:
                        # The new face stayed there long enough! Break the lock and switch to them.
                        stable_target_pos = face_pos
                        frames_held = 0
                else:
                    # The face is still roughly in the same spot, update the stable target instantly
                    stable_target_pos = face_pos
                    frames_held = 0
                    
                # Calculate distance from current camera center to the STABLE target
                dist = stable_target_pos - current_cam_pos
                
                target_cam_pos = current_cam_pos
                
                if abs(dist) > width * 0.25:
                    # HARD CUT: If the speaker jumps across the room (e.g. cutting to a new person),
                    # instantly teleport the camera to avoid a messy, sluggish pan.
                    current_cam_pos = stable_target_pos
                elif abs(dist) > deadzone_width / 2:
                    # Face broke through the deadzone boundary, calculate new target camera position
                    # to keep the face exactly on the edge of the deadzone
                    if dist > 0:
                        target_cam_pos = stable_target_pos - (deadzone_width / 2)
                    else:
                        target_cam_pos = stable_target_pos + (deadzone_width / 2)
                
                    # Apply Exponential Moving Average (Spring Dampener)
                    current_cam_pos += (target_cam_pos - current_cam_pos) * smoothing_factor
                    
                smoothed.append(current_cam_pos)
            
            # Create a dynamic function for x1 that evaluates at any time t
            def get_dynamic_x1(t):
                # Interpolate the center_x position
                center_x = np.interp(t, sample_times, smoothed)
                # Keep crop inside video boundaries
                center_x = max(target_width / 2, min(width - target_width / 2, center_x))
                return center_x - target_width / 2

            # Create a dynamic function for x2 as well, because MoviePy crop fails if x1 is a function and width is an int
            def get_dynamic_x2(t):
                return get_dynamic_x1(t) + target_width

            print(f"    ✅ Dynamic Face Panning Camera active ({target_width}x{height}, Style: {camera_style})")
            
            # Clear cache to free memory
            self.face_cache = {}
            
            # Use fl_image with a custom get_frame filter because MoviePy's standard crop() does not support dynamic functions
            def dynamic_crop_filter(get_frame, t):
                frame = get_frame(t)
                x1 = int(get_dynamic_x1(t))
                x2 = int(get_dynamic_x2(t))
                return frame[:, x1:x2]

            cropped_clip = clip.fl(dynamic_crop_filter, apply_to=["mask"])
            return cropped_clip
        else:
            center_x = width // 2
            print("    ⚠️ No faces detected, using static center crop")
            
            center_x = max(target_width // 2, min(width - target_width // 2, center_x))
            left = center_x - target_width // 2
            
            print(f"    ⏳ Cropping video to {target_width}x{height} ({ratio_str} ratio) at x-position: {left}")
            self.face_cache = {}
            cropped_clip = clip.crop(x1=left, width=target_width)
            return cropped_clip

    def close(self):
        """Releases resources used by the face detector."""
        try:
            # Clear cache to free memory
            self.face_cache = {}
            # Close the face detection model
            if self.face_detection is not None:
                self.face_detection.close()
            if hasattr(self, 'pose_detection') and self.pose_detection is not None:
                self.pose_detection.close()
            print("🎯 Face & pose tracking resources released")
        except Exception as e:
            print(f"⚠️ Error closing face tracker: {e}")
