"""
TemporalTracker Service - Persistent Multi-Object Tracking & Kalman State Estimation.
Enforces the core principle: DETECTION != TRACKING.
Features ByteTrack-style two-stage IoU association, Kalman bounding-box state estimation,
occlusion coasting (grace period), and multi-person prominence scoring.
"""
import math
import numpy as np
import cv2
from typing import List, Dict, Any, Tuple, Optional


def box_iou(box1: np.ndarray, box2: np.ndarray) -> float:
    """Calculates Intersection-over-Union between two boxes [x1, y1, x2, y2]."""
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
    area1 = max(1.0, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(1.0, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union = area1 + area2 - inter
    return inter / union if union > 0 else 0.0


def convert_bbox_to_z(bbox: np.ndarray) -> np.ndarray:
    """Converts [x1, y1, x2, y2] to measurement [cx, cy, s, r]."""
    w = max(1.0, bbox[2] - bbox[0])
    h = max(1.0, bbox[3] - bbox[1])
    cx = bbox[0] + w / 2.0
    cy = bbox[1] + h / 2.0
    s = w * h
    r = w / float(h)
    return np.array([cx, cy, s, r], dtype=np.float32).reshape((4, 1))


def convert_x_to_bbox(x: np.ndarray) -> np.ndarray:
    """Converts state [cx, cy, s, r, ...] to [x1, y1, x2, y2]."""
    cx = float(x[0, 0])
    cy = float(x[1, 0])
    s = max(1.0, float(x[2, 0]))
    r = max(0.05, min(20.0, float(x[3, 0])))

    w = math.sqrt(s * r)
    h = s / max(1.0, w)
    x1 = cx - w / 2.0
    y1 = cy - h / 2.0
    x2 = cx + w / 2.0
    y2 = cy + h / 2.0
    return np.array([x1, y1, x2, y2], dtype=np.float32)


class KalmanBoxTracker:
    """
    Tracks a single bounding box state [cx, cy, s, r] and velocities [vcx, vcy, vs].
    Coasts smoothly across missing frames during occlusion or motion blur.
    """
    _count = 0

    def __init__(self, bbox: np.ndarray, confidence: float = 1.0, metadata: Optional[Dict[str, Any]] = None):
        KalmanBoxTracker._count += 1
        self.id = KalmanBoxTracker._count

        self.kf = cv2.KalmanFilter(7, 4)
        self.kf.transitionMatrix = np.array([
            [1, 0, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0, 0, 1],
            [0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 1]
        ], dtype=np.float32)

        self.kf.measurementMatrix = np.array([
            [1, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0]
        ], dtype=np.float32)

        # Covariance initialization
        self.kf.processNoiseCov = np.eye(7, dtype=np.float32) * 1e-2
        self.kf.processNoiseCov[4:, 4:] *= 1e-1
        self.kf.measurementNoiseCov = np.eye(4, dtype=np.float32) * 1e-1
        self.kf.errorCovPost = np.eye(7, dtype=np.float32) * 1.0

        z = convert_bbox_to_z(bbox)
        self.kf.statePost = np.array([z[0, 0], z[1, 0], z[2, 0], z[3, 0], 0, 0, 0], dtype=np.float32).reshape((7, 1))

        self.time_since_update = 0
        self.hits = 1
        self.hit_streak = 1
        self.age = 0
        self.confidence = float(confidence)
        self.mouth_motion = 0.0
        self.metadata = metadata or {}
        self.history: List[np.ndarray] = []

    def update(self, bbox: np.ndarray, confidence: float = 1.0, metadata: Optional[Dict[str, Any]] = None):
        """Updates the state with a fresh detected bounding box."""
        self.time_since_update = 0
        self.hits += 1
        self.hit_streak += 1
        self.confidence = float(confidence)
        if metadata:
            self.metadata.update(metadata)
            if 'mouth_motion' in metadata:
                self.mouth_motion = float(metadata['mouth_motion'])

        z = convert_bbox_to_z(bbox)
        self.kf.correct(z)

    def predict(self) -> np.ndarray:
        """Advances the state vector using Kalman filter dynamics."""
        if (self.kf.statePost[2, 0] + self.kf.statePost[6, 0]) <= 0:
            self.kf.statePost[6, 0] = 0.0

        self.kf.predict()
        self.age += 1
        if self.time_since_update > 0:
            self.hit_streak = 0
        self.time_since_update += 1

        box = convert_x_to_bbox(self.kf.statePost)
        self.history.append(box)
        return box

    def get_state(self) -> np.ndarray:
        """Returns the current estimated bounding box [x1, y1, x2, y2]."""
        return convert_x_to_bbox(self.kf.statePost)

    @property
    def center(self) -> Tuple[float, float]:
        box = self.get_state()
        return float((box[0] + box[2]) / 2.0), float((box[1] + box[3]) / 2.0)

    @property
    def dimensions(self) -> Tuple[float, float]:
        box = self.get_state()
        return float(max(1.0, box[2] - box[0])), float(max(1.0, box[3] - box[1]))


class TemporalTracker:
    """
    ByteTrack-style Multi-Object Association & Temporal Trajectory Manager.
    Associates both high- and low-confidence detections, coasts through occlusions,
    and calculates prominence scores to select primary subjects.
    """

    def __init__(self, max_age: int = 30, min_hits: int = 3, iou_threshold: float = 0.25):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.trackers: List[KalmanBoxTracker] = []
        self.frame_count = 0
        self.primary_track_id: Optional[int] = None

    def reset(self):
        """Clears all active tracks (e.g. at a hard scene cut)."""
        self.trackers = []
        self.frame_count = 0
        self.primary_track_id = None

    def update(self, detections: List[Dict[str, Any]], frame_w: int, frame_h: int) -> List[Dict[str, Any]]:
        """
        Processes detections for the current frame and returns persistent active tracks.
        Each detection dictionary should contain: 'center_x', 'center_y', 'width', 'height', 'confidence'.
        """
        self.frame_count += 1

        # Predict new locations of existing trackers
        for trk in self.trackers:
            trk.predict()

        # Convert detections to [x1, y1, x2, y2]
        det_boxes = []
        det_confs = []
        det_metas = []
        for d in detections:
            cx, cy = float(d['center_x']), float(d['center_y'])
            w, h = float(d['width']), float(d['height'])
            x1 = max(0.0, cx - w / 2.0)
            y1 = max(0.0, cy - h / 2.0)
            x2 = min(float(frame_w), cx + w / 2.0)
            y2 = min(float(frame_h), cy + h / 2.0)
            det_boxes.append(np.array([x1, y1, x2, y2], dtype=np.float32))
            det_confs.append(float(d.get('confidence', 0.5)))
            det_metas.append(d)

        det_boxes = np.array(det_boxes, dtype=np.float32) if det_boxes else np.empty((0, 4), dtype=np.float32)
        det_confs = np.array(det_confs, dtype=np.float32) if det_confs else np.empty((0,), dtype=np.float32)

        # Stage 1: Separate high-confidence from low-confidence detections (ByteTrack)
        high_idx = np.where(det_confs >= 0.40)[0] if len(det_confs) > 0 else np.empty((0,), dtype=int)
        low_idx = np.where((det_confs < 0.40) & (det_confs >= 0.15))[0] if len(det_confs) > 0 else np.empty((0,), dtype=int)

        matched_tracks, unmatched_det_high, unmatched_tracks = self._associate(
            self.trackers, det_boxes[high_idx] if len(high_idx) > 0 else np.empty((0, 4)), self.iou_threshold
        )

        # Update stage 1 matches
        for t_idx, d_sub_idx in matched_tracks:
            orig_d_idx = high_idx[d_sub_idx]
            self.trackers[t_idx].update(
                det_boxes[orig_d_idx],
                confidence=det_confs[orig_d_idx],
                metadata=det_metas[orig_d_idx]
            )

        # Stage 2: Associate remaining unmatched tracks with low-confidence detections (motion blur / occlusion)
        remaining_trackers = [self.trackers[i] for i in unmatched_tracks]
        if remaining_trackers and len(low_idx) > 0:
            matched_low, _, final_unmatched_tracks = self._associate(
                remaining_trackers, det_boxes[low_idx], self.iou_threshold * 0.70
            )
            for sub_t_idx, d_sub_idx in matched_low:
                real_t_idx = unmatched_tracks[sub_t_idx]
                orig_d_idx = low_idx[d_sub_idx]
                self.trackers[real_t_idx].update(
                    det_boxes[orig_d_idx],
                    confidence=det_confs[orig_d_idx],
                    metadata=det_metas[orig_d_idx]
                )

        # Initialize new trackers for unassigned high-confidence detections
        for d_sub_idx in unmatched_det_high:
            orig_d_idx = high_idx[d_sub_idx]
            new_trk = KalmanBoxTracker(
                det_boxes[orig_d_idx],
                confidence=det_confs[orig_d_idx],
                metadata=det_metas[orig_d_idx]
            )
            self.trackers.append(new_trk)

        # Remove dead tracks that exceeded max_age
        alive_trackers = []
        active_outputs: List[Dict[str, Any]] = []

        for trk in self.trackers:
            if trk.time_since_update < self.max_age:
                alive_trackers.append(trk)
                if (trk.hits >= self.min_hits or self.frame_count <= self.min_hits):
                    cx, cy = trk.center
                    tw, th = trk.dimensions
                    state_box = trk.get_state()

                    # Prominence score: factors in face type, area, eye-level bonus, speech/mouth motion, track stability, and sticky speaker lock
                    det_type = trk.metadata.get("type", "human_subject")
                    type_weight = 3.0 if det_type in ("yunet_neural", "mediapipe", "frontal_haar", "profile_haar_left", "profile_haar_right") else 1.0

                    # Penalize tracks that are currently coasting (not actively detected)
                    coasting_factor = 0.35 if trk.time_since_update > 0 else 1.0

                    # Sticky hysteresis lock: prevent speaker flip-flopping when both people are in frame
                    sticky_bonus = 1.60 if (self.primary_track_id is not None and trk.id == self.primary_track_id) else 1.0

                    dist_eye = abs(cy - frame_h * 0.38) / (frame_h * 0.45)
                    eye_penalty = max(0.20, 1.0 - dist_eye ** 2)
                    normalized_area = min(0.35, (tw * th) / float(frame_w * frame_h))
                    motion_boost = 1.0 + min(2.5, max(0.0, trk.mouth_motion - 2.0) * 0.20)
                    stability = trk.hits / float(trk.hits + trk.time_since_update)

                    prominence = trk.confidence * type_weight * (normalized_area ** 0.50) * eye_penalty * motion_boost * stability * coasting_factor * sticky_bonus

                    active_outputs.append({
                        "track_id": trk.id,
                        "center_x": cx,
                        "center_y": cy,
                        "width": tw,
                        "height": th,
                        "bbox": state_box,
                        "confidence": trk.confidence,
                        "hits": trk.hits,
                        "time_since_update": trk.time_since_update,
                        "is_coasting": trk.time_since_update > 0,
                        "mouth_motion": trk.mouth_motion,
                        "prominence_score": prominence,
                        "type": det_type
                    })

        self.trackers = alive_trackers
        # Sort by prominence score descending (primary subject is index 0)
        active_outputs.sort(key=lambda x: x["prominence_score"], reverse=True)
        if active_outputs:
            self.primary_track_id = active_outputs[0]["track_id"]
        else:
            self.primary_track_id = None
        return active_outputs

    def _associate(
        self, trackers: List[KalmanBoxTracker], detections: np.ndarray, threshold: float
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """Associates trackers and detections via greedy IoU matching."""
        if len(trackers) == 0:
            return [], list(range(len(detections))), []
        if len(detections) == 0:
            return [], [], list(range(len(trackers)))

        iou_matrix = np.zeros((len(trackers), len(detections)), dtype=np.float32)
        for t, trk in enumerate(trackers):
            trk_box = trk.get_state()
            for d, det_box in enumerate(detections):
                iou_matrix[t, d] = box_iou(trk_box, det_box)

        matched_tracks = []
        unmatched_trackers = set(range(len(trackers)))
        unmatched_detections = set(range(len(detections)))

        # Greedy highest-IoU assignment
        while True:
            if len(unmatched_trackers) == 0 or len(unmatched_detections) == 0:
                break
            max_val = -1.0
            best_t, best_d = -1, -1
            for t in unmatched_trackers:
                for d in unmatched_detections:
                    if iou_matrix[t, d] > max_val:
                        max_val = iou_matrix[t, d]
                        best_t, best_d = t, d

            if max_val < threshold or best_t < 0:
                break

            matched_tracks.append((best_t, best_d))
            unmatched_trackers.remove(best_t)
            unmatched_detections.remove(best_d)

        return matched_tracks, sorted(list(unmatched_detections)), sorted(list(unmatched_trackers))
