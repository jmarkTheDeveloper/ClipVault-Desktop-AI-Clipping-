"""
DiagnosticsVisualizer Service - Telemetry HUD & Visual Debugging Overlay.
Generates diagnostic debug videos visualizing detected faces, person boxes,
persistent Track IDs, Kalman trajectories, virtual camera bounds, and quality scores.
"""
from typing import List, Dict, Any, Tuple, Optional
import cv2
import numpy as np


class DiagnosticsVisualizer:
    """
    Renders visual debug overlays on video frames for tracking diagnostics.
    """

    @staticmethod
    def draw_telemetry_hud(
        frame: np.ndarray,
        tracks: List[Dict[str, Any]],
        primary_track: Optional[Dict[str, Any]],
        crop_rect: Tuple[int, int, int, int],
        zoom_level: float,
        quality_score: int,
        enlargement_ratio: float,
        tracking_status: str = "ACTIVE_TRACK"
    ) -> np.ndarray:
        """
        Overlays bounding boxes, track IDs, crop window, and HUD telemetry on the frame.
        """
        annotated = frame.copy()
        h, w = annotated.shape[:2]
        cx1, cy1, cw, ch = crop_rect

        # 1. Draw Active Virtual Camera Crop Window (Cyan rectangle)
        cv2.rectangle(annotated, (cx1, cy1), (cx1 + cw, cy1 + ch), (255, 220, 0), 3)
        cv2.putText(
            annotated, f"Virtual Camera Viewport ({cw}x{ch})",
            (cx1 + 10, cy1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 220, 0), 2, cv2.LINE_AA
        )

        # 2. Draw Track Bounding Boxes
        for trk in tracks:
            bx1, by1, bx2, by2 = [int(v) for v in trk["bbox"]]
            is_primary = primary_track and trk["track_id"] == primary_track.get("track_id")
            is_coasting = trk.get("is_coasting", False)

            # Color: Primary = Bright Green, Coasting = Orange, Secondary = Sky Blue
            if is_primary:
                color = (0, 255, 0)
                label_prefix = "[PRIMARY] "
            elif is_coasting:
                color = (0, 165, 255)
                label_prefix = "[COASTING] "
            else:
                color = (255, 128, 0)
                label_prefix = ""

            cv2.rectangle(annotated, (bx1, by1), (bx2, by2), color, 2)

            track_label = f"{label_prefix}ID: {trk['track_id']} ({trk['confidence']:.2f}) | Prom: {trk.get('prominence_score', 0):.2f}"
            (tw, th_text), _ = cv2.getTextSize(track_label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (bx1, max(0, by1 - 20)), (bx1 + tw + 6, max(20, by1)), color, -1)
            cv2.putText(
                annotated, track_label, (bx1 + 3, max(15, by1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA
            )

        # 3. Draw Telemetry HUD Header
        hud_h = 44
        overlay = annotated.copy()
        cv2.rectangle(overlay, (0, 0), (w, hud_h), (20, 20, 20), -1)
        annotated = cv2.addWeighted(overlay, 0.85, annotated, 0.15, 0)

        hud_text = (
            f"DIAGNOSTICS | Status: {tracking_status} | Zoom: {zoom_level:.2f}x "
            f"| Ratio: {enlargement_ratio:.2f}x | Quality Score: {quality_score}/100 | Active Tracks: {len(tracks)}"
        )
        cv2.putText(
            annotated, hud_text, (16, 28),
            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2, cv2.LINE_AA
        )

        return annotated
