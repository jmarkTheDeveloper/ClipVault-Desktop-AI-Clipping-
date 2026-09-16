"""
Quality Benchmark Suite - Video Pipeline Comparison Test Harness.
Executes Strategies A through E on source video footage to visually and quantitatively compare:
  Strategy A: Legacy rigid crop + bilinear resize
  Strategy B: Temporal tracking + fixed crop
  Strategy C: Temporal tracking + adaptive quality-aware crop
  Strategy D: Adaptive crop + Super-Resolution enhancement
  Strategy E: Maximum-quality pipeline (temporal tracking, virtual camera, Lanczos, high-bitrate encode)
"""
import os
import sys
import time
from pathlib import Path
from typing import Dict, Any, List

import cv2
import numpy as np

# Ensure engine is in path
ENGINE_DIR = Path(__file__).parent / "engine"
sys.path.insert(0, str(ENGINE_DIR))

from moviepy.editor import VideoFileClip
from engine.services.source_analyzer import SourceAnalyzer
from engine.services.face_tracker import FaceTracker
from engine.services.quality_engine import QualityEngine
from engine.services.super_resolution import SuperResolutionEngine


def compute_metrics(original_frame: np.ndarray, processed_frame: np.ndarray) -> Dict[str, float]:
    """Computes PSNR and Structural Similarity between frames."""
    h, w = original_frame.shape[:2]
    if processed_frame.shape[:2] != (h, w):
        proc_resized = cv2.resize(processed_frame, (w, h), interpolation=cv2.INTER_LANCZOS4)
    else:
        proc_resized = processed_frame

    # PSNR
    mse = np.mean((original_frame.astype(np.float64) - proc_resized.astype(np.float64)) ** 2)
    if mse == 0:
        psnr = 100.0
    else:
        psnr = 10.0 * np.log10((255.0 ** 2) / mse)

    # Simplified SSIM
    gray1 = cv2.cvtColor(original_frame, cv2.COLOR_RGB2GRAY).astype(np.float64)
    gray2 = cv2.cvtColor(proc_resized, cv2.COLOR_RGB2GRAY).astype(np.float64)
    mu1 = np.mean(gray1)
    mu2 = np.mean(gray2)
    sigma1 = np.var(gray1)
    sigma2 = np.var(gray2)
    sigma12 = np.cov(gray1.flat, gray2.flat)[0, 1]
    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2
    ssim = ((2 * mu1 * mu2 + c1) * (2 * sigma12 + c2)) / ((mu1 ** 2 + mu2 ** 2 + c1) * (sigma1 + sigma2 + c2))

    return {
        "psnr": round(float(psnr), 2),
        "ssim": round(float(ssim), 4)
    }


def run_benchmark(input_video_path: str, output_dir: str = "benchmark_results") -> Dict[str, Any]:
    """Runs comparison benchmarks across strategies A through E."""
    out_dir = Path(output_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    print("\n=======================================================")
    print("   CLIPVAULT VIDEO PIPELINE QUALITY BENCHMARK HARNESS  ")
    print("=======================================================")

    source_meta = SourceAnalyzer.analyze(input_video_path)
    print(f"Source: {source_meta['filename']} ({source_meta['width']}x{source_meta['height']} @ {source_meta['fps']} FPS)")

    clip = VideoFileClip(input_video_path)
    # Use max 6 seconds for benchmark
    test_duration = min(6.0, clip.duration)
    test_clip = clip.subclip(0.0, test_duration)
    sample_frame = test_clip.get_frame(min(1.0, test_duration / 2.0))

    ft = FaceTracker()
    sr_engine = SuperResolutionEngine()

    target_w, target_h = 1080, 1920
    results: Dict[str, Any] = {}

    strategies = [
        ("Strategy_A_Legacy", False, False, False, "veryfast"),
        ("Strategy_B_Temporal_Fixed", True, False, False, "fast"),
        ("Strategy_C_Temporal_Adaptive", True, True, False, "fast"),
        ("Strategy_D_Adaptive_SuperRes", True, True, True, "medium"),
        ("Strategy_E_Master_Quality", True, True, True, "slow"),
    ]

    for name, use_temporal, use_adaptive, use_enhancement, preset in strategies:
        print(f"\n>> Executing {name}...")
        t0 = time.time()
        out_file = out_dir / f"{name}.mp4"

        try:
            if not use_temporal:
                # Strategy A: Legacy rigid crop
                cw = int(test_clip.h * 9 / 16)
                if cw % 2 != 0: cw -= 1
                cx = max(0, test_clip.w // 2 - cw // 2)
                cropped = test_clip.crop(x1=cx, width=cw)
                final_clip = cropped.resize((target_w, target_h))
            else:
                # Temporal tracking + Virtual Camera
                cropped = ft.track_and_crop(
                    test_clip,
                    crop_ratio=9 / 16,
                    camera_style="smooth",
                    adaptive_crop=use_adaptive,
                    max_digital_zoom=1.35 if use_adaptive else 3.0,
                    target_resolution=(target_w, target_h)
                )
                if use_enhancement:
                    def enhance_frame(frame):
                        return sr_engine.upscale_frame_opencv(frame, target_w, target_h)
                    final_clip = cropped.fl_image(enhance_frame)
                else:
                    final_clip = cropped.resize((target_w, target_h))

            final_clip.write_videofile(
                str(out_file),
                codec="libx264",
                preset=preset,
                fps=source_meta["fps"],
                ffmpeg_params=["-pix_fmt", "yuv420p", "-crf", "16" if "Master" in name else "20"],
                verbose=False,
                logger=None
            )
            elapsed = time.time() - t0
            file_size_mb = round(out_file.stat().st_size / (1024.0 * 1024.0), 2)

            # Measure metrics on center frame
            res_frame = final_clip.get_frame(min(1.0, test_duration / 2.0))
            metrics = compute_metrics(sample_frame, res_frame)
            crop_w, crop_h = cropped.size
            q_eval = QualityEngine.evaluate_quality(source_meta["width"], source_meta["height"], crop_w, crop_h, target_w, target_h)

            results[name] = {
                "elapsed_seconds": round(elapsed, 2),
                "file_size_mb": file_size_mb,
                "crop_resolution": f"{crop_w}x{crop_h}",
                "target_resolution": f"{target_w}x{target_h}",
                "enlargement_ratio": q_eval["enlargement_ratio"],
                "quality_score": q_eval["detail_score"],
                "quality_tier": q_eval["quality_tier"],
                "psnr": metrics["psnr"],
                "ssim": metrics["ssim"]
            }
            print(
                f"   [DONE] {elapsed:.2f}s | Size: {file_size_mb} MB | Crop: {crop_w}x{crop_h} "
                f"| Quality: {q_eval['detail_score']}/100 | Ratio: {q_eval['enlargement_ratio']}x | SSIM: {metrics['ssim']}"
            )
        except Exception as e:
            print(f"   [ERROR] in {name}: {e}")
            results[name] = {"error": str(e)}

    clip.close()

    print("\n=======================================================")
    print("               BENCHMARK SUMMARY RESULTS               ")
    print("=======================================================")
    for k, v in results.items():
        if "error" in v:
            print(f"{k}: FAILED ({v['error']})")
        else:
            print(
                f"{k:<30} | Score: {v['quality_score']}/100 | Ratio: {v['enlargement_ratio']}x "
                f"| SSIM: {v['ssim']} | PSNR: {v['psnr']} dB | Time: {v['elapsed_seconds']}s"
            )
    print("=======================================================\n")
    return results


if __name__ == "__main__":
    test_vid = "test_720.mp4"
    if len(sys.argv) > 1:
        test_vid = sys.argv[1]
    run_benchmark(test_vid)
