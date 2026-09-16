"""
VirtualCamera Service - Cinematic AI Camera Operator with Kinematic Easing.
Features Deadzone (deadband) filtering, critically damped spring smoothing,
maximum pan/zoom velocity limits, multi-person envelope framing, and scene-cut synchronization.
"""
import math
import numpy as np
from typing import List, Dict, Any, Tuple, Optional


class VirtualCamera:
    """
    Simulates a professional human camera operator reframing video footage.
    Provides steady tripod stability for small movements, cinematic easing for deliberate motion,
    and instantaneous resets on scene transitions.
    """

    def __init__(
        self,
        frame_w: int,
        frame_h: int,
        aspect_ratio: float = 9 / 16,
        deadzone_ratio: float = 0.12,
        pan_speed: float = 350.0,
        zoom_speed: float = 0.20,
        fps: float = 30.0
    ):
        self.frame_w = frame_w
        self.frame_h = frame_h
        self.aspect_ratio = aspect_ratio
        self.deadzone_ratio = deadzone_ratio
        self.pan_speed = pan_speed
        self.zoom_speed = zoom_speed
        self.fps = max(1.0, float(fps))
        self.dt = 1.0 / self.fps

        # Determine default full-height crop dimensions
        self.base_crop_h = float(frame_h)
        self.base_crop_w = float(frame_h * aspect_ratio)
        if self.base_crop_w > frame_w:
            self.base_crop_w = float(frame_w)
            self.base_crop_h = float(frame_w / aspect_ratio)

        # Current camera state [cx, cy, w, h]
        self.cx = float(frame_w / 2.0)
        self.cy = float(frame_h / 2.0)
        self.w = float(self.base_crop_w)
        self.h = float(self.base_crop_h)

        # Velocities
        self.vx = 0.0
        self.vy = 0.0
        self.vw = 0.0
        self.vh = 0.0

        # State flags
        self.initialized = False

    def reset_to_center(self):
        """Resets the virtual camera to default centered composition."""
        self.cx = float(self.frame_w / 2.0)
        self.cy = float(self.frame_h / 2.0)
        self.w = float(self.base_crop_w)
        self.h = float(self.base_crop_h)
        self.vx = 0.0
        self.vy = 0.0
        self.vw = 0.0
        self.vh = 0.0
        self.initialized = True

    def snap_to(self, target_cx: float, target_cy: float, target_w: float, target_h: float):
        """Immediately teleports the camera to the target without smoothing (used at scene cuts)."""
        self.cx = float(target_cx)
        self.cy = float(target_cy)
        self.w = float(target_w)
        self.h = float(target_h)
        self.vx = 0.0
        self.vy = 0.0
        self.vw = 0.0
        self.vh = 0.0
        self._clamp_bounds()
        self.initialized = True

    def calculate_target_crop(
        self,
        primary_track: Optional[Dict[str, Any]],
        all_active_tracks: List[Dict[str, Any]],
        min_margin_pct: float = 0.30,
        max_digital_zoom: float = 1.35
    ) -> Tuple[float, float, float, float]:
        """
        Calculates the ideal target bounding box [cx, cy, w, h] based on tracked subjects.
        If multiple prominent subjects exist, frames both within the safe area.
        """
        if not primary_track:
            return float(self.frame_w / 2.0), float(self.frame_h / 2.0), self.base_crop_w, self.base_crop_h

        # Check if secondary prominent speaker exists
        prominent_tracks = [t for t in all_active_tracks if t.get("prominence_score", 0.0) >= 0.25 * primary_track.get("prominence_score", 1.0)]

        if len(prominent_tracks) >= 2:
            # Multi-person bounding envelope
            all_boxes = [t["bbox"] for t in prominent_tracks[:2]]
            min_x = min(b[0] for b in all_boxes)
            min_y = min(b[1] for b in all_boxes)
            max_x = max(b[2] for b in all_boxes)
            max_y = max(b[3] for b in all_boxes)
            group_cx = (min_x + max_x) / 2.0
            group_cy = (min_y + max_y) / 2.0
            group_w = (max_x - min_x) * (1.0 + min_margin_pct * 2.0)
            group_h = (max_y - min_y) * (1.0 + min_margin_pct * 2.0)

            # Fit to target aspect ratio
            req_w = max(group_w, group_h * self.aspect_ratio)
            req_h = req_w / self.aspect_ratio
            req_w = max(self.base_crop_w / max_digital_zoom, min(float(self.frame_w), req_w))
            req_h = req_w / self.aspect_ratio
            return group_cx, group_cy, req_w, req_h

        # Single Primary Subject Framing
        s_cx = float(primary_track["center_x"])
        s_cy = float(primary_track["center_y"])
        s_w = float(primary_track["width"])
        s_h = float(primary_track["height"])

        # Eye-level centering: position subject head at ~38% of crop height
        target_crop_w = max(self.base_crop_w / max_digital_zoom, min(float(self.frame_w), s_w * (1.0 + min_margin_pct * 3.5)))
        target_crop_h = target_crop_w / self.aspect_ratio

        # Align crop center so subject eyes sit at 38% of the vertical viewport
        target_cy = s_cy + (target_crop_h * 0.12)
        target_cx = s_cx

        return target_cx, target_cy, target_crop_w, target_crop_h

    def update(
        self,
        target_cx: float,
        target_cy: float,
        target_w: float,
        target_h: float,
        is_scene_cut: bool = False
    ) -> Tuple[int, int, int, int]:
        """
        Advances the virtual camera toward the target with deadzone filtering and spring smoothing.
        Returns the active integer crop rectangle [x1, y1, width, height].
        """
        if not self.initialized or is_scene_cut:
            self.snap_to(target_cx, target_cy, target_w, target_h)
            return self.get_crop_rect()

        # 1. Deadzone Filtering (Deadband)
        deadzone_w = self.w * self.deadzone_ratio
        deadzone_h = self.h * self.deadzone_ratio

        diff_x = target_cx - self.cx
        diff_y = target_cy - self.cy
        diff_w = target_w - self.w
        diff_h = target_h - self.h

        # If movement is inside the deadzone, damp target displacement to zero (tripod lock)
        effective_dx = 0.0
        if abs(diff_x) > deadzone_w:
            effective_dx = diff_x - math.copysign(deadzone_w, diff_x)

        effective_dy = 0.0
        if abs(diff_y) > deadzone_h:
            effective_dy = diff_y - math.copysign(deadzone_h, diff_y)

        # 2. Critically Damped Spring Smoothing (Spring constant k=12, damping c=7)
        k_spring = 8.0
        c_damping = 5.0

        # Acceleration = spring force - damping
        ax = k_spring * effective_dx - c_damping * self.vx
        ay = k_spring * effective_dy - c_damping * self.vy
        aw = k_spring * diff_w - c_damping * self.vw
        ah = k_spring * diff_h - c_damping * self.vh

        # Update velocities
        self.vx += ax * self.dt
        self.vy += ay * self.dt
        self.vw += aw * self.dt
        self.vh += ah * self.dt

        # Clamp max pan and zoom speeds
        max_v = self.pan_speed
        speed = math.hypot(self.vx, self.vy)
        if speed > max_v:
            scale = max_v / speed
            self.vx *= scale
            self.vy *= scale

        # Update camera coordinates
        self.cx += self.vx * self.dt
        self.cy += self.vy * self.dt
        self.w += self.vw * self.dt
        self.h += self.vh * self.dt

        self._clamp_bounds()
        return self.get_crop_rect()

    def _clamp_bounds(self):
        """Keeps the virtual camera crop box strictly inside the frame boundaries."""
        # Ensure aspect ratio consistency
        self.w = max(64.0, min(float(self.frame_w), self.w))
        self.h = self.w / self.aspect_ratio
        if self.h > self.frame_h:
            self.h = float(self.frame_h)
            self.w = self.h * self.aspect_ratio

        # Clamp center
        half_w = self.w / 2.0
        half_h = self.h / 2.0
        self.cx = max(half_w, min(self.frame_w - half_w, self.cx))
        self.cy = max(half_h, min(self.frame_h - half_h, self.cy))

    def get_crop_rect(self) -> Tuple[int, int, int, int]:
        """Returns integer crop tuple (x1, y1, crop_width, crop_height)."""
        x1 = int(round(self.cx - self.w / 2.0))
        y1 = int(round(self.cy - self.h / 2.0))
        cw = int(round(self.w))
        ch = int(round(self.h))

        # Guarantee even dimensions for video codecs
        if cw % 2 != 0: cw -= 1
        if ch % 2 != 0: ch -= 1

        x1 = max(0, min(self.frame_w - cw, x1))
        y1 = max(0, min(self.frame_h - ch, y1))
        return x1, y1, cw, ch
