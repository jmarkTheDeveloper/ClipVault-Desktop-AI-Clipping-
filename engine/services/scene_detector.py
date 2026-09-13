"""
SceneDetector Service - High-Speed Visual Shot Boundary & Scene Cut Detection.
Uses downsampled computer vision frame analysis to locate camera transitions
and align video clip boundaries to true visual shot transitions.
"""
import os
from typing import List, Optional
import cv2
import numpy as np


class SceneDetector:
    """
    Detects visual shot boundaries and aligns clip cut points to natural camera transitions.
    """

    def __init__(self, sample_fps: float = 3.0, threshold: float = 0.40):
        self.sample_fps = max(1.0, float(sample_fps))
        self.threshold = float(threshold)

    def detect_cuts(
        self,
        video_path: str,
        start_time: float = 0.0,
        end_time: Optional[float] = None,
        max_duration: float = 600.0
    ) -> List[float]:
        """
        Scans a video window and returns a list of timestamps (seconds) where a scene cut occurred.
        """
        if not video_path or not os.path.exists(video_path):
            return []

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return []

        try:
            fps = cap.get(cv2.CAP_PROP_FPS)
            if fps <= 0 or np.isnan(fps):
                fps = 30.0

            total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            video_duration = total_frames / fps if total_frames > 0 else 0.0

            st = max(0.0, float(start_time))
            et = min(video_duration, float(end_time)) if end_time and video_duration > 0 else (st + max_duration)
            if video_duration > 0:
                et = min(et, video_duration)

            if et <= st:
                return []

            step_frames = max(1, int(round(fps / self.sample_fps)))
            start_frame = int(st * fps)
            end_frame = int(et * fps)

            cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
            current_frame_idx = start_frame

            prev_hist = None
            scene_cuts: List[float] = []

            while current_frame_idx <= end_frame:
                ret, frame = cap.read()
                if not ret:
                    break

                # Downsample frame to low resolution for fast color histogram computation
                small = cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA)
                hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
                hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
                cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)

                if prev_hist is not None:
                    # Histogram correlation: 1.0 is identical, < 0.40 indicates drastic scene shift
                    similarity = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
                    if similarity < self.threshold:
                        timestamp = current_frame_idx / fps
                        scene_cuts.append(round(timestamp, 2))

                prev_hist = hist
                current_frame_idx += step_frames
                cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame_idx)

            return scene_cuts

        except Exception as e:
            print(f"SceneDetector notice: {e}")
            return []
        finally:
            cap.release()

    def snap_boundary(
        self,
        timestamp: float,
        scene_cuts: List[float],
        tolerance: float = 0.85,
        prefer: str = "nearest"
    ) -> float:
        """
        Snaps a target timestamp to the nearest scene cut if one exists within the tolerance window.
        """
        if not scene_cuts:
            return timestamp

        valid_cuts = [c for c in scene_cuts if abs(c - timestamp) <= tolerance]
        if not valid_cuts:
            return timestamp

        if prefer == "earlier":
            earlier = [c for c in valid_cuts if c <= timestamp]
            if earlier:
                return max(earlier)
        elif prefer == "later":
            later = [c for c in valid_cuts if c >= timestamp]
            if later:
                return min(later)

        # Default: pick cut with minimum delta
        best_cut = min(valid_cuts, key=lambda c: abs(c - timestamp))
        return best_cut

    def align_clip_boundaries(
        self,
        start_time: float,
        end_time: float,
        video_path: Optional[str] = None,
        tolerance: float = 0.85
    ) -> tuple[float, float]:
        """
        Convenience method to align both clip start and end timestamps to nearest scene transitions.
        """
        if not video_path or not os.path.exists(video_path):
            return start_time, end_time

        try:
            # Detect cuts within small windows around start and end
            start_cuts = self.detect_cuts(
                video_path,
                start_time=max(0.0, start_time - tolerance - 0.5),
                end_time=start_time + tolerance + 0.5
            )
            end_cuts = self.detect_cuts(
                video_path,
                start_time=max(0.0, end_time - tolerance - 0.5),
                end_time=end_time + tolerance + 0.5
            )

            aligned_start = self.snap_boundary(start_time, start_cuts, tolerance=tolerance, prefer="nearest")
            aligned_end = self.snap_boundary(end_time, end_cuts, tolerance=tolerance, prefer="nearest")

            if aligned_end > aligned_start + 4.0:
                return aligned_start, aligned_end
            return start_time, end_time
        except Exception:
            return start_time, end_time
