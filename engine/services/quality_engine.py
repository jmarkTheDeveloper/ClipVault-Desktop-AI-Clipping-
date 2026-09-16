"""
QualityEngine Service - Resolution Awareness, Quality Scoring & Adaptive Framing.
Guarantees that the pipeline never blindly crops a small region and stretches it to 4K.
Evaluates source pixel availability, enlargement ratios, and governs AI super-resolution triggers.
"""
import math
from typing import Dict, Any, Tuple


class QualityEngine:
    """
    Quality-Aware Decision Engine that balances subject framing against pixel density.
    """

    @staticmethod
    def evaluate_quality(
        src_w: int,
        src_h: int,
        crop_w: int,
        crop_h: int,
        target_w: int,
        target_h: int
    ) -> Dict[str, Any]:
        """
        Calculates source pixel availability, digital enlargement factor, and quality score.
        """
        cw = max(1, crop_w)
        ch = max(1, crop_h)
        tw = max(1, target_w)
        th = max(1, target_h)

        scale_x = tw / float(cw)
        scale_y = th / float(ch)
        enlargement_ratio = max(scale_x, scale_y)

        # Pixel area comparison
        crop_pixels = cw * ch
        target_pixels = tw * th
        pixel_fill_ratio = min(1.0, float(crop_pixels) / float(target_pixels))

        # Detail retention score (100 = full native source fidelity, <50 = heavy digital stretch)
        detail_score = int(round(min(100.0, max(10.0, (1.0 / enlargement_ratio) * 100.0))))

        if enlargement_ratio <= 1.05:
            tier = "PRISTINE_NATIVE"
            recommendation = "Native resolution preserved. Zero digital upscaling required."
            needs_superres = False
        elif enlargement_ratio <= 1.35:
            tier = "HIGH_FIDELITY"
            recommendation = "Slight cinematic framing. High-quality Lanczos resampling sufficient."
            needs_superres = False
        elif enlargement_ratio <= 1.85:
            tier = "MODERATE_ZOOM"
            recommendation = "Moderate digital zoom. AI Super-Resolution (2x) recommended for crisp edges."
            needs_superres = True
        else:
            tier = "HEAVY_STRETCH"
            recommendation = "Excessive enlargement! Recommend adaptive crop expansion or 4x AI Super-Resolution."
            needs_superres = True

        return {
            "source_dimensions": (src_w, src_h),
            "crop_dimensions": (cw, ch),
            "target_dimensions": (tw, th),
            "enlargement_ratio": round(enlargement_ratio, 2),
            "pixel_fill_ratio": round(pixel_fill_ratio, 3),
            "detail_score": detail_score,
            "quality_tier": tier,
            "needs_super_resolution": needs_superres,
            "recommendation": recommendation
        }

    @staticmethod
    def adjust_crop_for_quality(
        crop_w: int,
        crop_h: int,
        target_w: int,
        target_h: int,
        max_w: int,
        max_h: int,
        max_digital_zoom: float = 1.35,
        aspect_ratio: float = 9 / 16
    ) -> Tuple[int, int]:
        """
        Expands the crop window outward if the requested crop would require excessive
        digital enlargement beyond max_digital_zoom, preserving original source clarity.
        """
        cw = float(crop_w)
        ch = float(crop_h)

        scale_x = target_w / max(1.0, cw)
        scale_y = target_h / max(1.0, ch)
        current_enlargement = max(scale_x, scale_y)

        # If current enlargement exceeds allowed zoom limit, widen the crop box
        if current_enlargement > max_digital_zoom:
            min_useful_w = target_w / max_digital_zoom
            min_useful_h = target_h / max_digital_zoom

            req_w = max(min_useful_w, min_useful_h * aspect_ratio)
            req_h = req_w / aspect_ratio

            # Clamp to source dimensions
            if req_w > max_w:
                req_w = float(max_w)
                req_h = req_w / aspect_ratio
            if req_h > max_h:
                req_h = float(max_h)
                req_w = req_h * aspect_ratio

            final_w = int(round(req_w))
            final_h = int(round(req_h))
            if final_w % 2 != 0: final_w -= 1
            if final_h % 2 != 0: final_h -= 1
            return max(32, final_w), max(32, final_h)

        final_w = int(round(cw))
        final_h = int(round(ch))
        if final_w % 2 != 0: final_w -= 1
        if final_h % 2 != 0: final_h -= 1
        return max(32, final_w), max(32, final_h)
