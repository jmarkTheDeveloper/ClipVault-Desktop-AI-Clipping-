"""
SourceAnalyzer Service - Comprehensive Video & Audio Stream Inspection.
Extracts native resolution, exact fractional FPS, bitrate, pixel format,
audio streams, and determines source quality tier using PyAV and FFmpeg.
"""
import os
import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

try:
    import av
except ImportError:
    av = None

try:
    import imageio_ffmpeg
except ImportError:
    imageio_ffmpeg = None


class SourceAnalyzer:
    """
    Inspects source media to determine native resolution, FPS, codecs,
    and calculates an optimal quality-preserving processing strategy.
    """

    @staticmethod
    def analyze(video_path: str) -> Dict[str, Any]:
        """
        Extracts detailed metadata from the given video file path.
        Returns a dictionary with stream properties and quality tier.
        """
        p = Path(video_path)
        if not p.exists():
            raise FileNotFoundError(f"Video file not found: {video_path}")

        meta: Dict[str, Any] = {
            "path": str(p.resolve()),
            "filename": p.name,
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
            "duration": 0.0,
            "bitrate": 0,
            "video_codec": "h264",
            "audio_codec": "aac",
            "pixel_format": "yuv420p",
            "has_audio": False,
            "audio_channels": 2,
            "audio_sample_rate": 44100,
            "aspect_ratio": 16 / 9,
            "quality_tier": "STANDARD_HD"
        }

        # Method 1: High-Speed Direct PyAV Inspection
        if av is not None:
            try:
                container = av.open(str(p))
                if container.streams.video:
                    v = container.streams.video[0]
                    meta["width"] = int(v.width or 1920)
                    meta["height"] = int(v.height or 1080)
                    if v.average_rate is not None and float(v.average_rate) > 0:
                        meta["fps"] = round(float(v.average_rate), 3)
                    elif v.guessed_rate is not None and float(v.guessed_rate) > 0:
                        meta["fps"] = round(float(v.guessed_rate), 3)

                    if v.codec_context and v.codec_context.name:
                        meta["video_codec"] = v.codec_context.name
                    if v.pix_fmt:
                        meta["pixel_format"] = str(v.pix_fmt)

                if container.streams.audio:
                    a = container.streams.audio[0]
                    meta["has_audio"] = True
                    if a.codec_context and a.codec_context.name:
                        meta["audio_codec"] = a.codec_context.name
                    if a.channels:
                        meta["audio_channels"] = int(a.channels)
                    if a.rate:
                        meta["audio_sample_rate"] = int(a.rate)

                if container.duration is not None:
                    meta["duration"] = round(float(container.duration) / 1000000.0, 3)
                if container.bit_rate is not None:
                    meta["bitrate"] = int(container.bit_rate)

                container.close()
            except Exception as e:
                print(f"    [SourceAnalyzer] PyAV inspection notice: {e}. Falling back to FFprobe/FFmpeg.")

        # Method 2: FFmpeg/FFprobe Subprocess Fallback
        if meta["duration"] <= 0 and imageio_ffmpeg is not None:
            try:
                ff_exe = imageio_ffmpeg.get_ffmpeg_exe()
                res = subprocess.run(
                    [ff_exe, "-i", str(p)],
                    capture_output=True,
                    text=True,
                    errors="replace",
                    check=False
                )
                output = res.stderr
                import re
                dim_m = re.search(r'Stream #.*Video:.*, (\d{3,5})x(\d{3,5})', output)
                if dim_m:
                    meta["width"] = int(dim_m.group(1))
                    meta["height"] = int(dim_m.group(2))

                fps_m = re.search(r'(\d+(?:\.\d+)?) fps', output)
                if fps_m:
                    meta["fps"] = float(fps_m.group(1))

                dur_m = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', output)
                if dur_m:
                    h, m, s = float(dur_m.group(1)), float(dur_m.group(2)), float(dur_m.group(3))
                    meta["duration"] = round(h * 3600 + m * 60 + s, 3)

                if "Audio:" in output:
                    meta["has_audio"] = True
            except Exception:
                pass

        if meta["height"] > 0:
            meta["aspect_ratio"] = round(float(meta["width"]) / float(meta["height"]), 4)

        # Classify Quality Tier
        max_dim = max(meta["width"], meta["height"])
        min_dim = min(meta["width"], meta["height"])
        if min_dim >= 2160 or max_dim >= 3840:
            meta["quality_tier"] = "NATIVE_4K"
        elif min_dim >= 1440 or max_dim >= 2560:
            meta["quality_tier"] = "CRISP_QHD"
        elif min_dim >= 1080 or max_dim >= 1920:
            meta["quality_tier"] = "STANDARD_FHD"
        elif min_dim >= 720 or max_dim >= 1280:
            meta["quality_tier"] = "STANDARD_HD"
        else:
            meta["quality_tier"] = "LOW_SD"

        print(
            f"    [SourceAnalyzer] Loaded: {meta['filename']} | {meta['width']}x{meta['height']} @ {meta['fps']} FPS "
            f"| Codec: {meta['video_codec']} ({meta['pixel_format']}) | Tier: {meta['quality_tier']}"
        )
        return meta
