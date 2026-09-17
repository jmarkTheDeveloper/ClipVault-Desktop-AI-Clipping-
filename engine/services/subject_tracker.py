"""
SubjectTracker Service - General-Purpose Subject Reframe Tracking.
Combines OpenCV Spectral Saliency, Temporal Motion Energy Differencing,
and a Zero-Jitter Steadicam/Tripod Filter to center non-human subjects
(gameplay action, sports players, vehicles, products) in 9:16 vertical video.
"""
import os
import sys
from typing import List, Tuple, Optional
import cv2
import numpy as np

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass


class SubjectTracker:
    """
    Tracks visual subjects (action, gameplay, sports, products) using saliency
    and temporal motion vectors when human faces are not present.
    """

    def __init__(self, sample_fps: float = 4.0):
        self.sample_fps = max(1.0, float(sample_fps))
        self.saliency_detector = None
        try:
            if hasattr(cv2, 'saliency') and hasattr(cv2.saliency, 'StaticSaliencySpectralResidual_create'):
                self.saliency_detector = cv2.saliency.StaticSaliencySpectralResidual_create()
        except Exception:
            self.saliency_detector = None

    def _compute_human_presence_centroid_x(self, rgb_frame: np.ndarray, width: int) -> Optional[float]:
        """
        Locates the horizontal centroid of human skin and flesh tones across the frame.
        Guarantees that when humans are in the scene, the camera focuses on the person
        rather than background furniture, bookshelves, or static objects.
        """
        try:
            hsv = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2HSV)
            m1 = cv2.inRange(hsv, np.array([0, 20, 35]), np.array([25, 255, 255]))
            m2 = cv2.inRange(hsv, np.array([170, 20, 35]), np.array([180, 255, 255]))
            skin_mask = cv2.bitwise_or(m1, m2)
            col_sums = np.sum(skin_mask > 0, axis=0)
            total_skin = np.sum(col_sums)
            # Require minimum skin volume (e.g. face, hands, arms, or torso)
            if total_skin > (rgb_frame.shape[0] * 3):
                smooth_skin = cv2.GaussianBlur(col_sums.astype(np.float32).reshape(1, -1), (1, 15), 0)[0]
                peak_idx = int(np.argmax(smooth_skin))
                return (peak_idx / len(col_sums)) * width
        except Exception:
            pass
        return None

    def _compute_saliency_centroid_x(self, gray_frame: np.ndarray, width: int) -> float:
        """
        Computes the horizontal center of visual saliency using spectral residual
        or gradient energy density.
        """
        try:
            if self.saliency_detector is not None:
                rgb_small = cv2.cvtColor(gray_frame, cv2.COLOR_GRAY2BGR)
                success, saliency_map = self.saliency_detector.computeSaliency(rgb_small)
                if success and saliency_map is not None:
                    thresh = np.percentile(saliency_map, 85)
                    sal_mask = (saliency_map >= thresh).astype(np.uint8)
                    col_sums = np.sum(sal_mask, axis=0)
                    total_sal = np.sum(col_sums)
                    if total_sal > 0:
                        smooth_sal = cv2.GaussianBlur(col_sums.astype(np.float32).reshape(1, -1), (1, 15), 0)[0]
                        peak_idx = int(np.argmax(smooth_sal))
                        return (peak_idx / len(col_sums)) * width
        except Exception:
            pass

        # Fallback: High-contrast Sobel gradient energy
        try:
            gx = cv2.Sobel(gray_frame, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray_frame, cv2.CV_32F, 0, 1, ksize=3)
            mag = cv2.magnitude(gx, gy)
            col_energy = np.sum(mag, axis=0)
            total_energy = np.sum(col_energy)
            if total_energy > 0:
                smooth_energy = cv2.GaussianBlur(col_energy.astype(np.float32).reshape(1, -1), (1, 15), 0)[0]
                peak_idx = int(np.argmax(smooth_energy))
                return (peak_idx / len(col_energy)) * width
        except Exception:
            pass

        return width / 2.0

    def _compute_motion_centroid_x(self, prev_gray: np.ndarray, cur_gray: np.ndarray, width: int) -> Optional[float]:
        """
        Computes the horizontal centroid of pixel motion between two consecutive frames.
        """
        try:
            diff = cv2.absdiff(prev_gray, cur_gray)
            _, thresh = cv2.threshold(diff, 20, 255, cv2.THRESH_BINARY)
            col_motion = np.sum(thresh, axis=0)
            total_motion = np.sum(col_motion)
            if total_motion > (thresh.shape[0] * 5):
                smooth_motion = cv2.GaussianBlur(col_motion.astype(np.float32).reshape(1, -1), (1, 15), 0)[0]
                peak_idx = int(np.argmax(smooth_motion))
                return (peak_idx / len(col_motion)) * width
        except Exception:
            pass
        return None

    def track_and_crop(
        self,
        clip,
        crop_ratio: float = 9.0 / 16.0,
        camera_style: str = "instant"
    ):
        """
        Analyzes motion, human presence, and visual saliency across the clip duration, selects the optimal
        horizontal focal center, and applies a zero-jitter steadicam crop.
        """
        width, height = clip.size
        target_width = int(height * crop_ratio)
        if target_width % 2 != 0:
            target_width -= 1

        if width <= target_width:
            return clip

        num_samples = max(4, int(clip.duration * self.sample_fps))
        sample_times = np.linspace(0.05, max(0.1, clip.duration - 0.05), num_samples)

        centroids: List[float] = []
        prev_gray = None

        downsample_w = 320
        downsample_h = int(downsample_w * (height / width))

        for t in sample_times:
            try:
                frame = clip.get_frame(t)
                small = cv2.resize(frame, (downsample_w, downsample_h), interpolation=cv2.INTER_AREA)
                gray = cv2.cvtColor(small, cv2.COLOR_RGB2GRAY)

                # 1. Primary: Human skin presence (locates living subjects across all backgrounds)
                skin_x = self._compute_human_presence_centroid_x(small, width)
                # 2. Secondary: Motion centroid (living actors moving vs static room/furniture)
                motion_x = self._compute_motion_centroid_x(prev_gray, gray, width) if prev_gray is not None else None
                # 3. Tertiary: Visual saliency
                saliency_x = self._compute_saliency_centroid_x(gray, width)

                if skin_x is not None and motion_x is not None:
                    # Confirmed human with active motion: 70% skin location, 30% motion
                    fused_x = (skin_x * 0.70) + (motion_x * 0.30)
                elif skin_x is not None:
                    fused_x = skin_x
                elif motion_x is not None:
                    fused_x = motion_x
                else:
                    fused_x = saliency_x

                centroids.append(fused_x)
                prev_gray = gray
            except Exception:
                centroids.append(width / 2.0)

        if not centroids:
            centroids = [width / 2.0]

        centroids_arr = np.array(centroids, dtype=np.float64)

        # ── Deadzone Tripod Lock ──
        # If the standard deviation of movement is low (< 6% of video width), lock to median
        x_std = float(np.std(centroids_arr))
        median_x = float(np.median(centroids_arr))

        if x_std < (width * 0.06) or camera_style == "instant":
            cx = max(target_width / 2.0, min(width - target_width / 2.0, median_x))
            x1 = int(round(cx - target_width / 2.0))
            x1 = max(0, min(width - target_width, x1))

            print(f"    [SubjectTracker] Tripod Lock on Subject: Centered at X={median_x:.0f} (Crop X1={x1})")

            def static_subject_filter(get_frame, t):
                frame = get_frame(t)
                return frame[:, x1:x1 + target_width]

            cropped = clip.fl(static_subject_filter, apply_to=["mask"])
            cropped.size = (target_width, height)
            return cropped

        # ── Fluid Steadicam Motion Filter ──
        print(f"    [SubjectTracker] Steadicam Following Mode: Dynamic subject panning across {len(centroids)} keyframes")

        # Smooth raw centroids with Exponential Moving Average (EMA) and Gaussian filter
        smoothed_xs = []
        current_ema = centroids[0]
        alpha = 0.20 if camera_style == "smooth" else 0.35

        for c in centroids:
            current_ema = (alpha * c) + ((1.0 - alpha) * current_ema)
            clamped = max(target_width / 2.0, min(width - target_width / 2.0, current_ema))
            smoothed_xs.append(clamped)

        smoothed_arr = np.array(smoothed_xs, dtype=np.float64)
        if len(smoothed_arr) >= 5:
            k = cv2.getGaussianKernel(5, 1.5).flatten()
            padded = np.pad(smoothed_arr, (2, 2), mode='edge')
            smoothed_arr = np.convolve(padded, k, mode='valid')

        sample_times_arr = np.array(sample_times, dtype=np.float64)
        smoothed_xs_arr = smoothed_arr

        def dynamic_steadicam_filter(get_frame, t):
            frame = get_frame(t)
            target_cx = float(np.interp(t, sample_times_arr, smoothed_xs_arr))
            x_left = int(round(target_cx - target_width / 2.0))
            x_left = max(0, min(width - target_width, x_left))
            return frame[:, x_left:x_left + target_width]

        cropped = clip.fl(dynamic_steadicam_filter, apply_to=["mask"])
        cropped.size = (target_width, height)
        return cropped
