import os
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from styles.caption_styles import CAPTION_STYLES, HIGHLIGHT_KEYWORDS, EMOJI_MAP


class CaptionMaker:
    """
    Creates and adds word-by-word captions to a video clip.
    """
    def __init__(self, selected_style='clean_white'):
        """
        Initializes the CaptionMaker with a selected caption style.

        Args:
            selected_style (str, optional): The style of captions to use.
                                            Defaults to 'clean_white'.
        """
        self.font_paths = self.find_available_fonts()
        self.selected_style = selected_style
        self.styles = CAPTION_STYLES
        self.highlight_keywords = HIGHLIGHT_KEYWORDS
        self.font_cache = {}

    def find_available_fonts(self):
        """
        Finds available fonts on the system and in local assets.
        All bundled fonts are 100% compliant under SIL Open Font License (OFL) or Apache 2.0.
        """
        win_dir = os.environ.get('SystemRoot', 'C:\\Windows')
        base_fonts = Path(__file__).resolve().parent.parent / "assets" / "fonts"
        
        font_collections = {
            'montserrat': [
                str(base_fonts / "Montserrat-Bold.ttf"),
                str(Path("./assets/fonts/Montserrat-Bold.ttf").resolve()),
            ],
            'anton': [
                str(base_fonts / "Anton-Regular.ttf"),
                str(Path("./assets/fonts/Anton-Regular.ttf").resolve()),
            ],
            'bebas_neue': [
                str(base_fonts / "BebasNeue-Regular.ttf"),
                str(Path("./assets/fonts/BebasNeue-Regular.ttf").resolve()),
            ],
            'bangers': [
                str(base_fonts / "Bangers-Regular.ttf"),
                str(Path("./assets/fonts/Bangers-Regular.ttf").resolve()),
            ],
            'luckiest_guy': [
                str(base_fonts / "LuckiestGuy-Regular.ttf"),
                str(Path("./assets/fonts/LuckiestGuy-Regular.ttf").resolve()),
            ],
            'rubik': [
                str(base_fonts / "Rubik-Bold.ttf"),
                str(Path("./assets/fonts/Rubik-Bold.ttf").resolve()),
            ],
            'outfit': [
                str(base_fonts / "Outfit-Bold.ttf"),
                str(Path("./assets/fonts/Outfit-Bold.ttf").resolve()),
            ],
            'plus_jakarta': [
                str(base_fonts / "PlusJakartaSans-Bold.ttf"),
                str(Path("./assets/fonts/PlusJakartaSans-Bold.ttf").resolve()),
            ],
            'permanent_marker': [
                str(base_fonts / "PermanentMarker-Regular.ttf"),
                str(Path("./assets/fonts/PermanentMarker-Regular.ttf").resolve()),
            ],
            'bold': [
                str(base_fonts / "Montserrat-Bold.ttf"),
                str(base_fonts / "Anton-Regular.ttf"),
                os.path.join(win_dir, 'Fonts', 'arialbd.ttf'),
                os.path.join(win_dir, 'Fonts', 'calibrib.ttf'),
                'C:\\Windows\\Fonts\\arialbd.ttf',
            ],
            'regular': [
                str(base_fonts / "Montserrat-Bold.ttf"),
                str(base_fonts / "Outfit-Bold.ttf"),
                str(base_fonts / "PlusJakartaSans-Bold.ttf"),
            ]
        }

        found_fonts = {k: None for k in font_collections.keys()}

        for font_type, paths in font_collections.items():
            for path in paths:
                if Path(path).exists():
                    found_fonts[font_type] = path
                    try:
                        print(f"    >> Found {font_type} font: {Path(path).name}")
                    except Exception:
                        pass
                    break

        default_font = found_fonts.get('montserrat') or found_fonts.get('bold') or found_fonts.get('rubik') or found_fonts.get('anton')
        for k in found_fonts:
            if not found_fonts[k]:
                found_fonts[k] = default_font

        return found_fonts

    def get_font(self, font_type, font_size):
        cache_key = f"{font_type}_{font_size}"
        if cache_key in self.font_cache:
            return self.font_cache[cache_key]

        font = None
        font_path = self.font_paths.get(font_type)
        if not font_path or not Path(font_path).exists():
            font_path = self.font_paths.get('montserrat') or self.font_paths.get('bold')

        if font_path and Path(font_path).exists():
            try:
                font = ImageFont.truetype(str(font_path), font_size)
            except Exception:
                font = None

        if font is None:
            base_fonts = Path(__file__).resolve().parent.parent / "assets" / "fonts"
            ttfs = list(base_fonts.glob("*.ttf"))
            if ttfs:
                try:
                    font = ImageFont.truetype(str(ttfs[0]), font_size)
                except Exception:
                    font = ImageFont.load_default()
            else:
                font = ImageFont.load_default()

        self.font_cache[cache_key] = font
        return font

    def create_word_image(self, word, font_size, is_highlighted):
        """
        Creates a transparent image containing a single word sized exactly to its text bounding box.

        Args:
            word (str): The word to draw.
            font_size (int): The size of the font.
            is_highlighted (bool, optional): Whether the word should be highlighted.

        Returns:
            numpy.ndarray: A numpy array representing the small image.
        """
        style_config = self.styles.get(self.selected_style, self.styles['clean_white'])
        font_type = style_config['font_type']
        font = self.get_font(font_type, font_size)

        # Draw on a temp image to calculate text bounding box
        temp_img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp_img)
        temp_bbox = temp_draw.textbbox((0, 0), word, font=font)
        
        # Calculate padding for stroke (outline) and background box to avoid text clipping
        stroke_factor = style_config.get('stroke_factor', 0.085)
        stroke_width = 0 if style_config.get('no_stroke', False) else max(3, int(font_size * stroke_factor))
        
        # Add box padding if background box is configured
        has_bg_box = 'bg_box_color' in style_config
        box_padding_x = int(font_size * 0.45) if has_bg_box else 0
        box_padding_y = int(font_size * 0.2) if has_bg_box else 0
        
        padding_x = stroke_width + 4 + box_padding_x
        padding_y = stroke_width + 4 + box_padding_y
        
        text_width = (temp_bbox[2] - temp_bbox[0]) + (padding_x * 2)
        text_height = (temp_bbox[3] - temp_bbox[1]) + (padding_y * 2)

        # Create exact fit image
        img = Image.new('RGBA', (text_width, text_height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw background rounded rectangle if configured
        if has_bg_box:
            bg_box_color = style_config['bg_box_color']
            # Draw rounded rectangle spanning the whole bounding box image
            radius = max(6, int(font_size * 0.15))
            draw.rounded_rectangle(
                [(0, 0), (text_width - 1, text_height - 1)],
                radius=radius,
                fill=bg_box_color
            )

        # Align text centered inside the padded small image
        x = padding_x - temp_bbox[0]
        y = padding_y - temp_bbox[1]

        if is_highlighted:
            text_color = style_config.get('highlight_color', (255, 255, 0, 255))
        else:
            text_color = style_config['text_color']

        if style_config.get('no_stroke', False):
            draw.text((x, y), word, font=font, fill=text_color, align="center")
            return np.array(img)
        else:
            # Draw JUST the text with NO stroke to avoid PIL's ugly spiky miter joins
            draw.text((x, y), word, font=font, fill=text_color, align="center")
            img_np = np.array(img)
            
            import cv2
            # Extract the alpha channel
            alpha = img_np[:, :, 3]
            
            # Create a perfectly circular morphological kernel for smooth, rounded strokes
            kernel_size = stroke_width * 2 + 1
            if kernel_size < 3: kernel_size = 3
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
            
            # Dilate the alpha channel to create a thick outline mask
            dilated_alpha = cv2.dilate(alpha, kernel, iterations=1)
            
            # Create a solid canvas of the stroke color
            stroke_fill = style_config.get('stroke_fill', (0, 0, 0, 255))
            stroke_img = np.zeros_like(img_np)
            stroke_img[:, :, 0] = stroke_fill[0]
            stroke_img[:, :, 1] = stroke_fill[1]
            stroke_img[:, :, 2] = stroke_fill[2]
            stroke_img[:, :, 3] = dilated_alpha
            
            # Composite the original anti-aliased text over the stroke background
            alpha_fg = (alpha / 255.0)[..., np.newaxis]
            
            final_img = stroke_img.copy()
            # Standard alpha compositing over the solid stroke color
            final_img[:, :, :3] = (img_np[:, :, :3] * alpha_fg + stroke_img[:, :, :3] * (1 - alpha_fg)).astype(np.uint8)
            final_img[:, :, 3] = dilated_alpha
            
            return final_img

    def overlay_image(self, background, foreground, x_offset, y_offset):
        """
        Overlays a transparent RGBA foreground image onto an RGB background image.
        Modifies the background image in-place.
        """
        bg_h, bg_w, _ = background.shape
        fg_h, fg_w, fg_c = foreground.shape
        
        if fg_c != 4:
            # If foreground doesn't have an alpha channel, just copy it
            x_end = min(x_offset + fg_w, bg_w)
            y_end = min(y_offset + fg_h, bg_h)
            fg_w_clipped = x_end - x_offset
            fg_h_clipped = y_end - y_offset
            if fg_w_clipped > 0 and fg_h_clipped > 0:
                background[y_offset:y_end, x_offset:x_end] = foreground[:fg_h_clipped, :fg_w_clipped, :3]
            return background

        # Calculate coordinates to prevent out-of-bounds errors
        x1 = max(0, x_offset)
        y1 = max(0, y_offset)
        x2 = min(bg_w, x_offset + fg_w)
        y2 = min(bg_h, y_offset + fg_h)

        # Clipped foreground coordinates
        fg_x1 = x1 - x_offset
        fg_y1 = y1 - y_offset
        fg_x2 = fg_x1 + (x2 - x1)
        fg_y2 = fg_y1 + (y2 - y1)

        if (x2 - x1) <= 0 or (y2 - y1) <= 0:
            return background

        # Extract slices
        bg_slice = background[y1:y2, x1:x2]
        fg_slice = foreground[fg_y1:fg_y2, fg_x1:fg_x2]

        # Perform alpha blending
        bg_slice_float = bg_slice.astype(np.float32)
        fg_rgb_float = fg_slice[:, :, :3].astype(np.float32)
        alpha = fg_slice[:, :, 3:4].astype(np.float32) / 255.0

        blended = fg_rgb_float * alpha + bg_slice_float * (1.0 - alpha)
        background[y1:y2, x1:x2] = blended.astype(np.uint8)
        
        return background

    def overlay_pre_rendered_word(self, background, fg_rgb, fg_alpha, w, h, x_offset, y_offset):
        """
        Highly optimized alpha-blending for pre-rendered float arrays.
        Elminates division and type casting on foreground inside the rendering loop.
        """
        bg_h, bg_w, _ = background.shape
        
        # Calculate coordinates to prevent out-of-bounds errors
        x1 = max(0, x_offset)
        y1 = max(0, y_offset)
        x2 = min(bg_w, x_offset + w)
        y2 = min(bg_h, y_offset + h)

        # Clipped foreground coordinates
        fg_x1 = x1 - x_offset
        fg_y1 = y1 - y_offset
        fg_x2 = fg_x1 + (x2 - x1)
        fg_y2 = fg_y1 + (y2 - y1)

        if (x2 - x1) <= 0 or (y2 - y1) <= 0:
            return background

        # Extract slices
        bg_slice = background[y1:y2, x1:x2].astype(np.float32)
        fg_rgb_slice = fg_rgb[fg_y1:fg_y2, fg_x1:fg_x2]
        alpha_slice = fg_alpha[fg_y1:fg_y2, fg_x1:fg_x2]

        # Perform alpha blending (extremely fast, zero division, minimal memory conversions!)
        blended = fg_rgb_slice * alpha_slice + bg_slice * (1.0 - alpha_slice)
        background[y1:y2, x1:x2] = blended.astype(np.uint8)
        
        return background

    def create_phrase_image(self, words_in_phrase, font_size, active_idx=None, style_config=None):
        """
        Renders a full multi-word phrase (2-3 words) with CapCut / Opus Clip active word highlight.
        Inactive words: Crisp white.
        Active word (at active_idx): Glowing radiant highlight (CapCut Yellow, Opus Neon Green, Cyan, etc.)
        All words have a clean, heavy black stroke for maximum legibility on any background.
        """
        if style_config is None:
            style_config = self.styles.get(self.selected_style, self.styles.get('capcut_yellow', {}))

        font_type = style_config.get('font_type', 'montserrat')
        font = self.get_font(font_type, font_size)

        space_bbox = font.getbbox(' ')
        space_w = max(8, space_bbox[2] - space_bbox[0])

        word_bboxes = [font.getbbox(w['word']) for w in words_in_phrase]
        word_widths = [max(1, b[2] - b[0]) for b in word_bboxes]
        word_heights = [max(1, b[3] - b[1]) for b in word_bboxes]

        line_w = sum(word_widths) + space_w * max(0, len(words_in_phrase) - 1)
        line_h = max(word_heights) if word_heights else font_size

        stroke_factor = style_config.get('stroke_factor', 0.14)
        stroke_w = 0 if style_config.get('no_stroke', False) else max(4, int(font_size * stroke_factor))

        pad_x = stroke_w + 14
        pad_y = stroke_w + 14
        img_w = line_w + pad_x * 2
        img_h = line_h + pad_y * 2

        img = Image.new('RGBA', (img_w, img_h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw rounded translucent background banner if configured
        if 'bg_box_color' in style_config:
            radius = max(8, int(font_size * 0.18))
            draw.rounded_rectangle(
                [(0, 0), (img_w - 1, img_h - 1)],
                radius=radius,
                fill=style_config['bg_box_color']
            )

        cur_x = pad_x
        base_color = style_config.get('text_color', (255, 255, 255, 255))
        highlight_color = style_config.get('highlight_color', (255, 230, 0, 255))
        stroke_fill = style_config.get('stroke_fill', (0, 0, 0, 255))

        for i, w_obj in enumerate(words_in_phrase):
            w_text = w_obj['word']
            is_active = (i == active_idx)
            is_keyword = any(k.upper() in w_text.upper() for k in self.highlight_keywords)

            if is_active or (active_idx is None and is_keyword):
                fill_color = highlight_color
            else:
                fill_color = base_color

            y_pos = pad_y - word_bboxes[i][1]
            if stroke_w > 0:
                draw.text((cur_x, y_pos), w_text, font=font, fill=fill_color,
                          stroke_width=stroke_w, stroke_fill=stroke_fill)
            else:
                draw.text((cur_x, y_pos), w_text, font=font, fill=fill_color)

            cur_x += word_widths[i] + space_w

        return np.array(img)

    def group_words_into_phrases(self, words, max_words=3, max_silence=0.4):
        """
        Groups individual words into punchy, coherent multi-word phrases (2-3 words per burst)
        matching modern TikTok, CapCut, and Opus Clip standards.
        """
        phrases = []
        if not words:
            return phrases

        current_words = []
        
        for i, word in enumerate(words):
            word_text = word['word'].strip()
            if not word_text:
                continue

            current_words.append(word)

            ends_terminal = word_text.endswith(('.', '?', '!'))
            has_next = i + 1 < len(words)
            silence_gap = (words[i+1]['start'] - word['end']) if has_next else 0
            total_chars = sum(len(w['word']) for w in current_words)

            if (len(current_words) >= max_words or 
                total_chars >= 20 or
                ends_terminal or 
                silence_gap > max_silence or 
                not has_next):
                
                phrase_start = current_words[0]['start']
                phrase_end = current_words[-1]['end']
                phrase_text = " ".join(w['word'] for w in current_words)
                
                phrases.append({
                    'text': phrase_text,
                    'words': list(current_words),
                    'start': phrase_start,
                    'end': phrase_end
                })
                current_words = []
                
        return phrases

    def add_captions(self, clip, words, clip_start_time, layout="vertical_crop", movie_recap=False, hook_text=None, auto_sfx=False, caption_y_pct=0.70):
        """
        Adds word-by-word captions and an optional static video hook banner to a video clip.
        Uses CapCut / Opus Clip multi-word bursts with active karaoke highlighting.
        """
        if not words:
            return clip

        style_config = self.styles.get(self.selected_style, self.styles.get('capcut_yellow', {}))
        force_uppercase = style_config.get('uppercase', True)

        clip_words = []
        for word in words:
            word_start = word['start']
            word_end = word['end']
            word_text = word['word'].strip()
            if force_uppercase:
                word_text = word_text.upper()

            # Broadcast audio-visual perceptual calibration:
            # Human visual processing takes ~150ms. Leading text highlight onset by 50ms (1-2 frames)
            # ensures the visual color pop perfectly synchronizes with the acoustic syllable hitting the ear!
            calibrated_start = max(0.0, word_start - 0.05)
            calibrated_end = max(calibrated_start + 0.08, word_end - 0.02)

            relative_start = calibrated_start - clip_start_time
            relative_end = calibrated_end - clip_start_time

            if relative_end <= 0 or relative_start >= clip.duration:
                continue

            relative_start = max(0.0, relative_start)
            relative_end = min(clip.duration, relative_end)
            duration = relative_end - relative_start

            if duration <= 0.05:
                continue

            clip_words.append({
                'word': word_text,
                'start': relative_start,
                'end': relative_end,
                'duration': duration
            })

        if not clip_words:
            return clip

        # Group words into punchy 2-3 word phrases (CapCut & Opus Clip standard)
        max_words = style_config.get('max_words', 3)
        phrases = self.group_words_into_phrases(clip_words, max_words=max_words)

        if not phrases:
            return clip

        video_width, video_height = clip.size
        
        # Check for custom logo watermark
        logo_dir = Path("./logo")
        logo_dir.mkdir(exist_ok=True)
        logo_files = list(logo_dir.glob("*.png")) + list(logo_dir.glob("*.jpg")) + list(logo_dir.glob("*.jpeg"))
        
        logo_data = None
        if logo_files:
            try:
                logo_path = logo_files[0]
                from PIL import Image
                logo_img = Image.open(logo_path).convert("RGBA")
                
                target_logo_w = max(60, int(video_width * 0.10))
                logo_aspect = logo_img.height / logo_img.width
                target_logo_h = int(target_logo_w * logo_aspect)
                logo_scaled = logo_img.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
                
                r, g, b, a = logo_scaled.split()
                a = a.point(lambda p: int(p * 0.60))
                logo_watermark = Image.merge("RGBA", (r, g, b, a))
                
                logo_fg_rgb = np.array(logo_watermark)[:, :, :3].astype(np.float32)
                logo_fg_alpha = np.array(logo_watermark)[:, :, 3:4].astype(np.float32) / 255.0
                
                margin = 35
                logo_x = video_width - target_logo_w - margin
                logo_y = video_height - target_logo_h - margin - 15
                
                logo_data = {
                    'fg_rgb': logo_fg_rgb,
                    'fg_alpha': logo_fg_alpha,
                    'w': target_logo_w,
                    'h': target_logo_h,
                    'x': logo_x,
                    'y': logo_y
                }
            except Exception:
                pass
        
        # Pre-render static video hook banner if provided
        hook_data = None
        if hook_text:
            try:
                import textwrap
                wrapped_hook = "\n".join(textwrap.wrap(hook_text, width=28))
                hook_font_size = max(24, int(min(video_width, video_height) * 0.052))
                
                prev_style = self.selected_style
                if self.selected_style not in ['capcut_banner', 'tiktok_banner']:
                    self.selected_style = 'capcut_banner'
                    
                hook_img = self.create_word_image(wrapped_hook, hook_font_size, is_highlighted=False)
                self.selected_style = prev_style
                
                h_h, h_w, _ = hook_img.shape
                h_x = (video_width - h_w) // 2
                h_y = int(video_height * 0.22)
                
                hook_data = {
                    'fg_rgb': hook_img[:, :, :3].astype(np.float32),
                    'fg_alpha': hook_img[:, :, 3:4].astype(np.float32) / 255.0,
                    'w': h_w,
                    'h': h_h,
                    'x': h_x,
                    'y': h_y
                }
            except Exception:
                pass
        
        # Base font size: 66-74px on 1080p, scales with resolution
        target_font_size = max(38, int(min(video_width, video_height) * 0.065))
        font_type = style_config.get('font_type', 'montserrat')

        pre_rendered_segments = []

        for p_idx, phrase in enumerate(phrases):
            words_in_p = phrase['words']
            # Scale font size if phrase is too wide
            curr_font_size = target_font_size
            while curr_font_size > 30:
                f_check = self.get_font(font_type, curr_font_size)
                sp_bbox = f_check.getbbox(' ')
                sp_w = sp_bbox[2] - sp_bbox[0]
                tot_w = sum(f_check.getbbox(w['word'])[2] - f_check.getbbox(w['word'])[0] for w in words_in_p) + sp_w * max(0, len(words_in_p) - 1)
                if tot_w <= video_width * 0.86:
                    break
                curr_font_size -= 4

            is_karaoke = style_config.get('karaoke', True)

            # CapCut / Opus Clip graceful lingering: keep phrase readable for 0.25s after speaking (or until next phrase)
            next_p_start = phrases[p_idx + 1]['start'] if p_idx + 1 < len(phrases) else clip.duration
            phrase_linger_end = min(next_p_start, phrase['end'] + 0.25)

            if is_karaoke and len(words_in_p) > 1:
                for w_idx, w_obj in enumerate(words_in_p):
                    img_np = self.create_phrase_image(words_in_p, curr_font_size, active_idx=w_idx, style_config=style_config)
                    fg_h, fg_w, _ = img_np.shape
                    x_pos = (video_width - fg_w) // 2
                    y_target = int(video_height * (caption_y_pct if caption_y_pct is not None else 0.70))
                    y_pos = max(10, min(video_height - fg_h - 10, y_target - (fg_h // 2)))

                    w_start = w_obj['start']
                    has_next_word = (w_idx + 1 < len(words_in_p))
                    next_word_start = words_in_p[w_idx + 1]['start'] if has_next_word else phrase_linger_end

                    # Minimum readability hold (0.15s) so fast speech does not strobe
                    min_readable = min(next_word_start, w_start + 0.15)

                    # Highlight active end:
                    # If this is the last word in the phrase, it should NOT stay highlighted across the entire linger duration!
                    if not has_next_word:
                        w_end = min(phrase_linger_end, max(min_readable, w_obj['end'] + 0.08))
                    elif (next_word_start - w_obj['end'] > 0.30):
                        # Slow speech with natural pause: release highlight smoothly
                        w_end = min(next_word_start, max(min_readable, w_obj['end'] + 0.12))
                    else:
                        w_end = max(min_readable, min(next_word_start, w_obj['end'] + 0.08))

                    w_end = max(w_start + 0.08, w_end)

                    pre_rendered_segments.append({
                        'start': w_start,
                        'end': w_end,
                        'fg_rgb': img_np[:, :, :3].astype(np.float32),
                        'fg_alpha': img_np[:, :, 3:4].astype(np.float32) / 255.0,
                        'w': fg_w,
                        'h': fg_h,
                        'x': x_pos,
                        'y': y_pos
                    })

                # If there's a lingering gap before next phrase, show the full phrase in neutral state
                last_w_end = pre_rendered_segments[-1]['end'] if pre_rendered_segments else phrase['end']
                if phrase_linger_end > last_w_end + 0.05:
                    neutral_img = self.create_phrase_image(words_in_p, curr_font_size, active_idx=None, style_config=style_config)
                    fg_h, fg_w, _ = neutral_img.shape
                    x_pos = (video_width - fg_w) // 2
                    y_target = int(video_height * (caption_y_pct if caption_y_pct is not None else 0.70))
                    y_pos = max(10, min(video_height - fg_h - 10, y_target - (fg_h // 2)))

                    pre_rendered_segments.append({
                        'start': last_w_end,
                        'end': phrase_linger_end,
                        'fg_rgb': neutral_img[:, :, :3].astype(np.float32),
                        'fg_alpha': neutral_img[:, :, 3:4].astype(np.float32) / 255.0,
                        'w': fg_w,
                        'h': fg_h,
                        'x': x_pos,
                        'y': y_pos
                    })
            else:
                img_np = self.create_phrase_image(words_in_p, curr_font_size, active_idx=None, style_config=style_config)
                fg_h, fg_w, _ = img_np.shape
                x_pos = (video_width - fg_w) // 2
                y_target = int(video_height * (caption_y_pct if caption_y_pct is not None else 0.70))
                y_pos = max(10, min(video_height - fg_h - 10, y_target - (fg_h // 2)))

                pre_rendered_segments.append({
                    'start': phrase['start'],
                    'end': phrase_linger_end,
                    'fg_rgb': img_np[:, :, :3].astype(np.float32),
                    'fg_alpha': img_np[:, :, 3:4].astype(np.float32) / 255.0,
                    'w': fg_w,
                    'h': fg_h,
                    'x': x_pos,
                    'y': y_pos
                })

        # Sort pre-rendered segments by start time for fast lookup
        pre_rendered_segments.sort(key=lambda x: x['start'])

        def make_frame(gf, t):
            frame = gf(t)
            
            # Find active segment at time t
            active_segments = [s for s in pre_rendered_segments if s['start'] <= t <= s['end']]
            
            copied = False
            if active_segments:
                frame = frame.copy()
                copied = True
                s_data = active_segments[-1]
                
                fg_rgb = s_data['fg_rgb']
                fg_alpha = s_data['fg_alpha']
                w_w, w_h = s_data['w'], s_data['h']
                x_pos, y_pos = s_data['x'], s_data['y']
                
                # Subtle Opus Clip & CapCut Pop Bounce on word entry (first 70ms)
                elapsed = t - s_data['start']
                if elapsed < 0.08:
                    scale = 1.0 + (1.0 - elapsed / 0.08) * 0.08  # Micro pop of 8%
                    try:
                        import cv2
                        new_w = max(1, int(w_w * scale))
                        new_h = max(1, int(w_h * scale))
                        fg_rgb = cv2.resize(fg_rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
                        fg_alpha_resized = cv2.resize(fg_alpha, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
                        if len(fg_alpha_resized.shape) == 2:
                            fg_alpha = fg_alpha_resized[:, :, np.newaxis]
                        else:
                            fg_alpha = fg_alpha_resized
                        
                        x_pos = x_pos - (new_w - w_w) // 2
                        y_pos = y_pos - (new_h - w_h) // 2
                        w_w, w_h = new_w, new_h
                    except Exception:
                        pass
                
                frame = self.overlay_pre_rendered_word(
                    frame, 
                    fg_rgb, 
                    fg_alpha, 
                    w_w, 
                    w_h, 
                    x_pos, 
                    y_pos
                )
            
            # Draw premium horizontal progress bar at the very bottom edge of the vertical canvas
            if not style_config.get('no_captions', False):
                h_bar = 6
                bg_h, bg_w, _ = frame.shape
                progress = min(1.0, max(0.0, t / clip.duration))
                bar_width = int(bg_w * progress)
                
                if bar_width > 0:
                    if not copied:
                        frame = frame.copy()
                        copied = True
                    # Color it neon-cyan: RGB [0, 223, 255]
                    frame[bg_h - h_bar : bg_h, 0 : bar_width] = [0, 223, 255]
            
            # Overlay static hook text banner if available for the first 3 seconds
            if hook_data and t < 3.0:
                if not copied:
                    frame = frame.copy()
                    copied = True
                frame = self.overlay_pre_rendered_word(
                    frame,
                    hook_data['fg_rgb'],
                    hook_data['fg_alpha'],
                    hook_data['w'],
                    hook_data['h'],
                    hook_data['x'],
                    hook_data['y']
                )

            # Overlay custom logo watermark if available
            if logo_data:
                if not copied:
                    frame = frame.copy()
                    copied = True
                frame = self.overlay_pre_rendered_word(
                    frame,
                    logo_data['fg_rgb'],
                    logo_data['fg_alpha'],
                    logo_data['w'],
                    logo_data['h'],
                    logo_data['x'],
                    logo_data['y']
                )
                    
            return frame

        captioned_clip = clip.fl(make_frame)
        return captioned_clip

