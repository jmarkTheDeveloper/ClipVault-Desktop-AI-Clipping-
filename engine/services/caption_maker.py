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
        Finds available fonts on the system.

        Returns:
            dict: A dictionary of available font paths.
        """
        win_dir = os.environ.get('SystemRoot', 'C:\\Windows')
        font_collections = {
            'anton': [str(Path("./assets/fonts/Anton-Regular.ttf").resolve())],
            'bebas_neue': [str(Path("./assets/fonts/BebasNeue-Regular.ttf").resolve())],
            'bangers': [str(Path("./assets/fonts/Bangers-Regular.ttf").resolve())],
            'permanent_marker': [str(Path("./assets/fonts/PermanentMarker-Regular.ttf").resolve())],
            'bold': [
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
                '/System/Library/Fonts/Helvetica.ttc',
                '/System/Library/Fonts/Arial.ttf',
                os.path.join(win_dir, 'Fonts', 'arialbd.ttf'),
                os.path.join(win_dir, 'Fonts', 'calibrib.ttf'),
                'C:\\Windows\\Fonts\\arialbd.ttf',
                '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf'
            ],
            'regular': [
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
                '/System/Library/Fonts/Helvetica.ttc',
                os.path.join(win_dir, 'Fonts', 'arial.ttf'),
                os.path.join(win_dir, 'Fonts', 'calibri.ttf'),
                'C:\\Windows\\Fonts\\arial.ttf',
                '/usr/share/fonts/TTF/DejaVuSans.ttf'
            ]
        }

        found_fonts = {k: None for k in font_collections.keys()}

        for font_type, paths in font_collections.items():
            for path in paths:
                if Path(path).exists():
                    found_fonts[font_type] = path
                    print(f"    📝 Found {font_type} font: {Path(path).name}")
                    break

        if not found_fonts['bold'] and not found_fonts['regular']:
            print("    📝 Using default system fonts")

        return found_fonts

    def get_font(self, font_type, font_size):
        cache_key = f"{font_type}_{font_size}"
        if cache_key in self.font_cache:
            return self.font_cache[cache_key]

        try:
            font_path = self.font_paths.get(font_type)
            if font_path:
                font = ImageFont.truetype(font_path, font_size)
            else:
                font = ImageFont.load_default()
        except:
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

    def group_words_into_phrases(self, words, max_words=7, max_silence=0.8):
        """
        Groups individual words into coherent multi-word phrases/sentences for traditional subtitles.
        """
        phrases = []
        if not words:
            return phrases

        current_phrase = []
        current_start = None
        
        for i, word in enumerate(words):
            word_text = word['word']
            word_start = word['start']
            word_end = word['end']
            
            if current_start is None:
                current_start = word_start
                
            current_phrase.append(word_text)
            
            # Split if current word ends with punctuation or next word is too far
            is_punctuation = word_text.endswith(('.', '?', '!', ','))
            
            has_next_word = i + 1 < len(words)
            silence_gap = 0
            if has_next_word:
                silence_gap = words[i+1]['start'] - word_end
                
            if (len(current_phrase) >= max_words or 
                is_punctuation or 
                silence_gap > max_silence or 
                not has_next_word):
                
                phrase_text = " ".join(current_phrase)
                phrases.append({
                    'text': phrase_text,
                    'start': current_start,
                    'end': word_end
                })
                current_phrase = []
                current_start = None
                
        return phrases

    def add_captions(self, clip, words, clip_start_time, layout="vertical_crop", movie_recap=False, hook_text=None, auto_sfx=False, caption_y_pct=0.70):
        """
        Adds word-by-word captions and an optional static video hook banner to a video clip.

        Args:
            clip (moviepy.editor.VideoFileClip): The video clip to add captions to.
            words (list): A list of words with timestamps.
            clip_start_time (float): The start time of the clip in the original video.
            caption_y_pct (float): Vertical position percentage (0.15 to 0.85, default 0.70).
        """
        if not words:
            return clip

        style_config = self.styles.get(self.selected_style, {})
        force_uppercase = style_config.get('uppercase', True)

        clip_words = []
        for word in words:
            word_start = word['start']
            word_end = word['end']
            word_text = word['word'].strip()
            if force_uppercase:
                word_text = word_text.upper()

            relative_start = word_start - clip_start_time
            relative_end = word_end - clip_start_time

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

        # Check if the style wants traditional phrases instead of single words
        phrase_mode = style_config.get('phrase_mode', False)
        if phrase_mode:
            max_words = style_config.get('max_words', 7)
            display_units = self.group_words_into_phrases(clip_words, max_words=max_words)
        else:
            display_units = [{
                'text': w['word'],
                'start': w['start'],
                'end': w['end']
            } for w in clip_words]

        if not display_units:
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
                print(f"    🏷️ Found watermark logo: {logo_path.name}")
                from PIL import Image
                logo_img = Image.open(logo_path).convert("RGBA")
                
                # Scale logo to be 10% of the video width (very subtle and clean)
                target_logo_w = max(60, int(video_width * 0.10))
                logo_aspect = logo_img.height / logo_img.width
                target_logo_h = int(target_logo_w * logo_aspect)
                logo_scaled = logo_img.resize((target_logo_w, target_logo_h), Image.Resampling.LANCZOS)
                
                # Apply 60% watermark opacity
                r, g, b, a = logo_scaled.split()
                a = a.point(lambda p: int(p * 0.60))
                logo_watermark = Image.merge("RGBA", (r, g, b, a))
                
                # Prepare array overlays
                logo_fg_rgb = np.array(logo_watermark)[:, :, :3].astype(np.float32)
                logo_fg_alpha = np.array(logo_watermark)[:, :, 3:4].astype(np.float32) / 255.0
                
                # Bottom-right corner position with 35px margin (slightly above progress bar)
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
                print(f"    ✅ Watermark loaded successfully (scaled to {target_logo_w}x{target_logo_h})")
            except Exception as logo_err:
                print(f"    ⚠️ Failed to load watermark logo: {logo_err}")
        
        # Pre-render static video hook banner if provided
        hook_data = None
        if hook_text:
            try:
                import textwrap
                wrapped_hook = "\n".join(textwrap.wrap(hook_text, width=28))
                hook_font_size = max(24, int(min(video_width, video_height) * 0.052))
                
                # Temporarily swap selected_style to capcut_banner or tiktok_banner to ensure it renders with a nice black box
                prev_style = self.selected_style
                if self.selected_style not in ['capcut_banner', 'tiktok_banner']:
                    self.selected_style = 'capcut_banner'
                    
                hook_img = self.create_word_image(wrapped_hook, hook_font_size, is_highlighted=False)
                self.selected_style = prev_style
                
                h_h, h_w, _ = hook_img.shape
                h_x = (video_width - h_w) // 2
                # Position it around 22% down (upper portion of screen, perfect for hook boxes)
                h_y = int(video_height * 0.22)
                
                hook_data = {
                    'fg_rgb': hook_img[:, :, :3].astype(np.float32),
                    'fg_alpha': hook_img[:, :, 3:4].astype(np.float32) / 255.0,
                    'w': h_w,
                    'h': h_h,
                    'x': h_x,
                    'y': h_y
                }
                print(f"    📝 Static hook text banner pre-rendered successfully: '{hook_text}'")
            except Exception as hook_err:
                print(f"    ⚠️ Failed to pre-render hook text: {hook_err}")
        
        # For phrase mode, reduce the font size slightly (ratio 0.038) so a full sentence fits nicely on screen
        if phrase_mode:
            base_font_size = max(28, int(min(video_width, video_height) * 0.038))
        else:
            base_font_size = max(48, int(min(video_width, video_height) * 0.085))

        pre_rendered_words = []
        for unit in display_units:
            text = unit['text']
            
            # Auto emoji injection for viral/social media aesthetic
            if not movie_recap and auto_sfx:
                import re
                # Find all alphanumeric words in the text segment
                raw_words = re.findall(r'\b\w+\b', text.upper())
                matching_emojis = []
                for w in raw_words:
                    if w in EMOJI_MAP and EMOJI_MAP[w] not in matching_emojis:
                        matching_emojis.append(EMOJI_MAP[w])
                
                # Append matching emojis at the end of the text segment
                if matching_emojis:
                    text = f"{text} {' '.join(matching_emojis)}"
            
            # Wrap text to maximum 32 characters per line to create clean 2-line subtitles
            if phrase_mode:
                import textwrap
                wrapped_lines = textwrap.wrap(text, width=32)
                wrapped_text = "\n".join(wrapped_lines)
            else:
                wrapped_text = text
                
            is_highlighted = any(keyword.upper() in text.upper() for keyword in self.highlight_keywords)

            # Create highly optimized bounding box image for the word/phrase
            word_img = self.create_word_image(wrapped_text, base_font_size, is_highlighted)
            fg_h, fg_w, _ = word_img.shape

            # Position centered horizontally, and at custom vertical percentage
            x_pos = (video_width - fg_w) // 2
            y_target = int(video_height * (caption_y_pct if caption_y_pct is not None else 0.70))
            y_pos = max(10, min(video_height - fg_h - 10, y_target - (fg_h // 2)))

            pre_rendered_words.append({
                'start': unit['start'],
                'end': unit['end'],
                'fg_rgb': word_img[:, :, :3].astype(np.float32),
                'fg_alpha': word_img[:, :, 3:4].astype(np.float32) / 255.0,
                'w': fg_w,
                'h': fg_h,
                'x': x_pos,
                'y': y_pos
            })

        # Sort pre-rendered words by start time for fast lookup
        pre_rendered_words.sort(key=lambda x: x['start'])

        def make_frame(gf, t):
            frame = gf(t)
            
            # Find active words at time t
            active_words = [w for w in pre_rendered_words if w['start'] <= t <= w['end']]
            
            copied = False
            if active_words:
                frame = frame.copy()
                copied = True
                # Draw only the single latest active caption segment to prevent overlapping text!
                w_data = active_words[-1]
                
                fg_rgb = w_data['fg_rgb']
                fg_alpha = w_data['fg_alpha']
                w_w, w_h = w_data['w'], w_data['h']
                x_pos, y_pos = w_data['x'], w_data['y']
                
                # Opus Bouncy Captions logic
                elapsed = t - w_data['start']
                if elapsed < 0.15:
                    if elapsed < 0.08:
                        scale = 1.0 + (elapsed / 0.08) * 0.15  # Pop to 115%
                    else:
                        scale = 1.15 - ((elapsed - 0.08) / 0.07) * 0.15  # Settle back to 100%
                    
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
                    except ImportError:
                        pass # if cv2 is not available, just use static size
                
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
            # We don't draw it for clean 'no_captions' style
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

        return clip.fl(make_frame)
