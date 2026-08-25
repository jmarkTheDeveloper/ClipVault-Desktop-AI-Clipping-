"""
ColorGrader Service - High-Performance Cinematic LUT Color Grading.
Applies pre-calculated Look-Up Table (LUT) color profiles to video frames with zero overhead.
"""
import cv2
import numpy as np


class ColorGrader:
    """
    Applies cinematic color grading profiles to video clips using NumPy vectorization
    and pre-computed 256-value Look-Up Tables (LUTs) for maximum rendering speed.
    """

    @staticmethod
    def apply_profile(clip, profile_name: str):
        """
        Applies the requested color grading profile to a MoviePy clip.
        Returns the graded clip, or the original clip if profile is 'default' or unknown.
        """
        if not profile_name or profile_name == 'default':
            return clip

        print(f"    🎨 Applying cinematic color grade profile: '{profile_name}' (LUT optimized)...")

        if profile_name == 'manga_ink':
            # High-contrast Japanese Manga/Anime grayscale with ink tint
            lut_manga = np.clip(128.0 + 2.2 * (np.arange(256) - 128.0), 0, 255).astype(np.uint8)
            def color_grade(image):
                gray = (0.299 * image[:, :, 0] + 0.587 * image[:, :, 1] + 0.114 * image[:, :, 2]).astype(np.uint8)
                manga_gray = lut_manga[gray]
                graded = np.empty_like(image)
                graded[:, :, 0] = np.clip(manga_gray * 1.12, 0, 255).astype(np.uint8)
                graded[:, :, 1] = np.clip(manga_gray * 0.90, 0, 255).astype(np.uint8)
                graded[:, :, 2] = np.clip(manga_gray * 0.96, 0, 255).astype(np.uint8)
                return graded
            return clip.fl_image(color_grade)

        elif profile_name == 'dark_cyberpunk':
            # Neo-noir neon cyberpunk: crushed blacks, cyan highlights, magenta shadows
            lut_r = np.clip(128.0 + 1.35 * (np.arange(256) * 0.72 - 128.0), 0, 255).astype(np.uint8)
            lut_g = np.clip(128.0 + 1.35 * (np.arange(256) * 0.95 - 128.0), 0, 255).astype(np.uint8)
            lut_b = np.clip(128.0 + 1.35 * (np.arange(256) * 1.32 - 128.0), 0, 255).astype(np.uint8)
            def color_grade(image):
                graded = np.empty_like(image)
                graded[:, :, 0] = lut_r[image[:, :, 0]]
                graded[:, :, 1] = lut_g[image[:, :, 1]]
                graded[:, :, 2] = lut_b[image[:, :, 2]]
                return graded
            return clip.fl_image(color_grade)

        elif profile_name == 'sunset_gold':
            # Warm golden hour aesthetic with glowing highlights and rich skin tones
            lut_r = np.clip(128.0 + 1.15 * (np.arange(256) * 1.25 - 128.0), 0, 255).astype(np.uint8)
            lut_g = np.clip(128.0 + 1.15 * (np.arange(256) * 1.06 - 128.0), 0, 255).astype(np.uint8)
            lut_b = np.clip(128.0 + 1.15 * (np.arange(256) * 0.78 - 128.0), 0, 255).astype(np.uint8)
            def color_grade(image):
                graded = np.empty_like(image)
                graded[:, :, 0] = lut_r[image[:, :, 0]]
                graded[:, :, 1] = lut_g[image[:, :, 1]]
                graded[:, :, 2] = lut_b[image[:, :, 2]]
                return graded
            return clip.fl_image(color_grade)

        elif profile_name == 'sigma_hdr':
            # Hyper-detailed HDR sharpness & contrast for intense moments
            def color_grade(image):
                blurred = cv2.GaussianBlur(image, (0, 0), 2.0)
                sharpened = cv2.addWeighted(image, 1.45, blurred, -0.45, 0)
                hsv = cv2.cvtColor(sharpened, cv2.COLOR_RGB2HSV).astype(np.float32)
                hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.20, 0, 255)
                hsv[:, :, 2] = np.clip(128.0 + 1.18 * (hsv[:, :, 2] - 128.0), 0, 255)
                return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
            return clip.fl_image(color_grade)

        elif profile_name == 'matrix_green':
            # Cyber hacker Matrix terminal green tint
            lut_r = np.clip(np.arange(256) * 0.45, 0, 255).astype(np.uint8)
            lut_g = np.clip(np.arange(256) * 1.30, 0, 255).astype(np.uint8)
            lut_b = np.clip(np.arange(256) * 0.55, 0, 255).astype(np.uint8)
            def color_grade(image):
                graded = np.empty_like(image)
                graded[:, :, 0] = lut_r[image[:, :, 0]]
                graded[:, :, 1] = lut_g[image[:, :, 1]]
                graded[:, :, 2] = lut_b[image[:, :, 2]]
                return graded
            return clip.fl_image(color_grade)

        elif profile_name == 'vintage_film':
            # Nostalgic 90s VHS / 35mm film warm grain
            lut_r = np.clip(np.arange(256) * 1.10 + 15, 0, 255).astype(np.uint8)
            lut_g = np.clip(np.arange(256) * 0.98 + 10, 0, 255).astype(np.uint8)
            lut_b = np.clip(np.arange(256) * 0.85 + 20, 0, 255).astype(np.uint8)
            def color_grade(image):
                graded = np.empty_like(image)
                graded[:, :, 0] = lut_r[image[:, :, 0]]
                graded[:, :, 1] = lut_g[image[:, :, 1]]
                graded[:, :, 2] = lut_b[image[:, :, 2]]
                return graded
            return clip.fl_image(color_grade)

        return clip
