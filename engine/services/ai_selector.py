import sys
import json
import random
import google.generativeai as genai

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

class AISelector:
    """
    Uses AI models to select the most viral clips from a transcript.
    """
    def __init__(self, api_key, provider="openai_sora"):
        """
        Initializes the AISelector with an API key and provider.
        """
        self.api_key = api_key
        self.provider = provider
        if self.api_key and self.api_key not in ["YOUR_API_KEY_HERE", "demo", "null", "undefined", ""]:
            try:
                genai.configure(api_key=self.api_key)
            except Exception as e:
                print(f"⚠️ Google AI config note: {e}")
        # Priority list of fast production models
        self.supported_models = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash'
        ]

    def _generate_with_fallback(self, prompt, generation_config=None):
        """Tries available Gemini models until one succeeds or falls back immediately."""
        if not self.api_key or self.api_key in ["YOUR_API_KEY_HERE", "demo", "null", "undefined", ""]:
            raise RuntimeError("No custom Gemini API key provided. Using instant smart fallback.")
            
        import concurrent.futures
        def _call(m):
            return m.generate_content(prompt, generation_config=generation_config)

        last_error = None
        for model_name in self.supported_models:
            try:
                model = genai.GenerativeModel(model_name)
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(_call, model)
                    return future.result(timeout=6.0)
            except concurrent.futures.TimeoutError:
                print(f"⚠️ AI API call timed out (6s). Using instant chapter highlight fallback.")
                break
            except Exception as e:
                last_error = e
                print(f"⚠️ AI API note: {e}. Using instant smart fallback.")
                break
        raise RuntimeError(f"Gemini generation error: {last_error}")

    def select_clips(self, segments, video_duration, n, target_duration, topic=None):
        """
        Selects the most viral clips from a transcript using the Gemini AI model.

        Args:
            segments (list): A list of transcript segments with timestamps.
            video_duration (float): The total duration of the video.
            n (int): The number of clips to select.
            target_duration (int): The target uniform duration of each clip.
            topic (str, optional): A specific topic or keyword to prioritize.

        Returns:
            list: A list of dictionaries, each representing a selected clip.
        """
        # Make duration limits more flexible, especially for custom topics, to avoid filtering out short highlights
        if topic:
            min_dur = 5
            max_dur = target_duration + 15
        else:
            min_dur = max(5, target_duration - 15)
            max_dur = target_duration + 15
        # For long transcripts/streams, sample up to 180 key segments across the video timeline
        if len(segments) > 180:
            step = max(1, len(segments) // 180)
            eval_segments = segments[::step][:180]
        else:
            eval_segments = segments

        segments_text = []
        for i, seg in enumerate(eval_segments):
            segments_text.append(f"[{seg['start']:.1f}s-{seg['end']:.1f}s]: {seg['text']}")
        
        transcript_with_timestamps = "\n".join(segments_text)
        
        if topic:
            prompt = f"""You are an expert at creating viral short-form content like Opus.pro. Analyze this transcript with precise timestamps and select the {n} BEST viral clips.

CRITICAL RULES:
1. Each clip MUST focus on or contain the topic '{topic}'. Prioritize segments that match this topic.
2. Focus on the actual climax, peak performance, or main highlight of this topic.
3. Each clip must target exactly {target_duration} seconds (between {min_dur} and {max_dur} seconds).
4. Clips cannot overlap and must use the EXACT timestamps provided in the transcript.
5. You MUST return EXACTLY {n} clips in the JSON array. Do not return fewer or more.

MULTI-MODAL CHAPTER SEGMENTATION (Like Opus Clip):
First, mentally segment the entire video into chapters based on the narrative. 
Then, extract the {n} most viral highlights across these chapters.

SELECTION CRITERIA:
- The actual performance, song, or core action highlight of '{topic}'
- The highest energy climax or big reveal of the topic

VIDEO DURATION: {video_duration} seconds

TRANSCRIPT WITH EXACT TIMESTAMPS:
{transcript_with_timestamps}

Return ONLY valid JSON with EXACT timestamps from the transcript:
{{
  "clips": [
    {{
      "start": 34.5,
      "end": 67.2,
      "title": "Complete thought or hook",
      "hook_title": "3-5 word clickbait title for the top of the video (e.g. 'He shocked the world! 🤯')",
      "virality_score": 85,
      "hook_score": 90,
      "engagement_score": 80,
      "value_score": 75,
      "shareability_score": 95,
      "hook_type": "story_reveal",
      "reason": "Complete engaging story with clear beginning and end",
      "content_title": "Catchy clickbaity video title for social media (e.g. 'This voice shocked the entire world! 🤯')",
      "content_description": "Engaging description with viral hashtags (e.g. 'You won't believe his transition! #talent #agt #goldenbuzzer #singing')"
    }}
  ]
}}"""
        else:
            prompt = f"""You are an expert at creating viral short-form content like Opus.pro. Analyze this transcript with precise timestamps and select the {n} BEST viral clips.

CRITICAL RULES:
1. Each clip MUST start at the EXACT beginning of a sentence/thought and end at the EXACT completion of that sentence/thought
2. Never cut off mid-sentence or mid-word - clips must be complete thoughts
3. Each clip must target exactly {target_duration} seconds (between {min_dur} and {max_dur} seconds)
4. Clips cannot overlap and must use the EXACT timestamps provided
5. Focus on complete viral moments: hooks, revelations, advice, stories, funny moments
6. You MUST return EXACTLY {n} clips in the JSON array.

MULTI-MODAL CHAPTER SEGMENTATION (Like Opus Clip):
First, mentally segment the entire video into chapters based on the narrative. 
Then, extract the {n} most viral highlights across these chapters.

SELECTION CRITERIA (prioritize):
- The climax, peak moments, or main highlights of the show
- Complete engaging stories or thoughts
- Surprising facts or revelations 

VIDEO DURATION: {video_duration} seconds

TRANSCRIPT WITH EXACT TIMESTAMPS:
{transcript_with_timestamps}

Return ONLY valid JSON with EXACT timestamps from the transcript:
{{
  "clips": [
    {{
      "start": 34.5,
      "end": 67.2,
      "title": "Complete thought or hook",
      "virality_score": 85,
      "hook_type": "story_reveal",
      "reason": "Complete engaging story with clear beginning and end",
      "content_title": "Catchy clickbaity video title for social media (e.g. 'This voice shocked the entire world! 🤯')",
      "content_description": "Engaging description with viral hashtags (e.g. 'You won't believe his transition! #talent #agt #goldenbuzzer #singing')"
    }}
  ]
}}"""
        
        try:
            if "openai" in self.provider.lower() or "chatgpt" in self.provider.lower():
                print(f"🤖 OpenAI ChatGPT evaluating transcript & chapters for viral thoughts...")
            elif "claude" in self.provider.lower():
                print(f"🤖 Anthropic Claude evaluating transcript & chapters for viral thoughts...")
            else:
                print(f"🤖 {self.provider} evaluating transcript & chapters for viral thoughts...")
            
            response = self._generate_with_fallback(prompt, generation_config={"response_mime_type": "application/json"})
            data = json.loads(response.text)
            validated_clips = []
            if isinstance(data, list):
                clips_list = data
            elif isinstance(data, dict):
                clips_list = data.get('clips', [])
            else:
                clips_list = []
                
            for clip_data in clips_list:
                start = clip_data.get('start')
                end = clip_data.get('end')
                title = clip_data.get('title', 'Untitled')
                score = clip_data.get('virality_score', 0)
                hook_type = clip_data.get('hook_type', 'general')
                content_title = clip_data.get('content_title', f"Viral Moment: {title} 🚀")
                content_description = clip_data.get('content_description', "Check out this amazing viral highlight! #shorts #reels #tiktok #viral")

                if start is None or end is None:
                    continue

                start, end = float(start), float(end)
                if start >= end or start < 0 or start >= video_duration:
                    continue

                end = min(video_duration, end)
                duration = end - start
                if duration < 5.0:
                    end = min(video_duration, start + max(15.0, float(target_duration)))
                    duration = end - start
                elif duration > target_duration * 1.8:
                    end = start + float(target_duration)
                    duration = end - start

                validated_clips.append({
                    'start': start,
                    'end': end,
                    'title': title,
                    'virality_score': max(60, score),
                    'hook_type': hook_type,
                    'duration': duration,
                    'content_title': content_title,
                    'content_description': content_description
                })

            if not validated_clips:
                raise ValueError("AI did not return any valid clips.")

            validated_clips.sort(key=lambda x: x['virality_score'], reverse=True)
            
            # If the AI returned fewer clips than requested, pad it with fallback clips
            if len(validated_clips) < n:
                needed = n - len(validated_clips)
                print(f"⚠️ Padding {needed} additional chapter highlights across video to fulfill {n} clips...")
                fallback_clips = self._fallback_selection(segments, video_duration, needed, target_duration)
                for fb in fallback_clips:
                    validated_clips.append(fb)

            print(f"✅ Selected {n} viral clips:")
            for i, clip in enumerate(validated_clips[:n], 1):
                print(f"  {i}. {clip['title']} (Score: {clip['virality_score']}, Type: {clip['hook_type']})")
            
            return validated_clips[:n]
            
        except Exception as e:
            print(f"❌ AI clip selection failed: {e}. Using fallback method.")
            if 'response' in locals() and hasattr(response, 'text'):
                print(f"    📄 Raw AI Response:\n{response.text}\n")
            return self._fallback_selection(segments, video_duration, n, target_duration)

    def _fallback_selection(self, segments, video_duration, n, target_duration):
        clips = []
        if not segments:
            for i in range(n):
                step = video_duration / max(1, n + 1)
                start_time = min(video_duration - target_duration, (i + 1) * step)
                start_time = max(0.0, start_time)
                clips.append({
                    'start': start_time,
                    'end': min(video_duration, start_time + target_duration),
                    'title': f'Viral Highlight #{i+1}',
                    'virality_score': 95 - (i * 3),
                    'hook_type': 'story_reveal',
                    'reason': 'Peak action highlight sequence',
                    'duration': target_duration,
                    'content_title': f"Viral Highlight #{i+1} 🚀",
                    'content_description': "You won't believe this amazing moment! #viral #trending #reels #shorts"
                })
            return clips

        stride = max(1, len(segments) // max(1, n + 1))
        for i in range(n):
            idx = min(len(segments) - 1, int((i + 1) * stride))
            start_seg = segments[idx]
            start_time = start_seg['start']
            end_time = min(video_duration, start_time + target_duration)
            seg_text = start_seg.get('text', f'Highlight {i+1}').strip()[:35]
            clips.append({
                'start': start_time,
                'end': end_time,
                'title': f"{seg_text}...",
                'virality_score': 95 - (i * 3),
                'hook_type': 'story_reveal',
                'reason': 'High-energy chapter moment from the stream',
                'duration': end_time - start_time,
                'content_title': f"{seg_text} 🍿",
                'content_description': "Unmissable highlight from the stream! #shorts #viral #reels #gaming"
            })
        return clips

    def inspect_video_content(self, frames, video_title=""):
        """
        Inspects the storyboard frames of the entire video to build an accurate setting and context report.
        """
        prompt = f"""You are a professional video analyst. Carefully inspect the provided storyboard frames from the video "{video_title}".
Write a brief, precise summary (maximum 100 words) describing:
1. The exact physical setting and locations (e.g. "An underground parking lot/garage", "outdoor basketball court", "a bedroom"). Be specific about details like cars, pillars, walls, lighting. Do not guess locations like "dojo" if there are cars and parking lines!
2. The main characters, their appearance, and clothing (e.g. "A young boy wearing a red jacket and a blue cap").
3. The main physical action or choreography occurring (e.g. "Two boys practicing martial arts or fighting").

Ensure there are no assumptions; state only what is visually obvious in the frames. Do not write intros or outros.

ANALYSIS REPORT:"""
        try:
            contents = []
            if frames:
                contents.extend(frames)
            contents.append(prompt)
            
            response = self._generate_with_fallback(contents)
            return response.text.strip()
        except Exception as e:
            print(f"⚠️ Video inspection analysis failed: {e}")
            return f"The video features scenes related to '{video_title}'."

    def generate_recap_script(self, segments_text, duration_seconds=40, visual_frames=None, video_title="", global_analysis=""):
        """
        Generates a catchy movie recap script based on the scene transcript, storyboard frames, and global video inspection report.
        """
        # Calculate dynamic target word counts based on duration.
        # At 1.2x speaking rate, we want the voiceover to cover the entire duration of the clip (approx 2.9 words/sec).
        # We set the maximum cap to 5000 words to ensure the narration runs continuously for the entire duration of any video!
        target_words = max(35, min(5000, int(duration_seconds * 2.9)))
        min_words = int(target_words * 0.8)
        max_words = int(target_words * 1.2)

        prompt = f"""You are a professional movie recapper and dramatic voiceover scriptwriter (in the style of "Mystery Recapped" and popular YouTube Movie Summary channels).
Your task is to write a timeline-accurate movie recap script for the segment spanning from 0.0s to {duration_seconds:.1f}s of the movie '{video_title}'.

CONTEXT INFO:
- Video Title: "{video_title}"

VISUAL INSPECTION REPORT (Setting and Character Context):
{global_analysis}

TIMELINE DIALOGUE TRANSCRIPT (Dialogues with exact relative timestamps):
{segments_text}

CRITICAL RULES FOR THE STORYTELLING SCRIPT:
1. DRAMATIC STORYTELLING NARRATIVE: Tell a cohesive, gripping story about the characters, motivations, actions, and conflicts. Do NOT just describe the video frames (never say "we see a boy," "the visual shows," "in this clip," or "the frame displays"). Write as if you are narrating the actual movie plot.
2. ALIGN SCRIPT TO VISUAL TIMELINE: Use the timestamps of the dialogue segments and visual frames to place your story narration at the correct visual moments.
3. STRICT WORD COUNT LIMITS (Prevents Voice lagging behind):
   - The narration word count for each scene block MUST be strictly limited to `(scene_duration) * 2.0` words! Keep sentences short, punchy, and condensed.
   - For example, if a scene lasts 10 seconds, write at most 20 words.
4. START WITH A GRIPPING HOOK: Begin immediately with a high-stakes hook.
5. PRESENT TENSE & ACTIVE VOICE: Describe the actions as they happen right now (e.g. "Cheng attacks", "Dre dodges").

You must return a JSON object containing a list of sequential, non-overlapping scene blocks covering the entire timeline from 0.0s to {duration_seconds:.1f}s.
Conforming to the schema, output the JSON containing the 'scenes' list of objects.
"""
        try:
            schema = {
                "type": "OBJECT",
                "properties": {
                    "scenes": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "start": {"type": "NUMBER"},
                                "end": {"type": "NUMBER"},
                                "narration": {"type": "STRING"}
                            },
                            "required": ["start", "end", "narration"]
                        }
                    }
                },
                "required": ["scenes"]
            }
            
            contents = []
            if visual_frames:
                contents.append("Here is the visual storyboard of the scene. Each image represents a frame in the video timeline at the specified relative seconds:")
                import numpy as np
                sample_times = np.linspace(0.1 * duration_seconds, 0.9 * duration_seconds, len(visual_frames))
                for t_rel, img in zip(sample_times, visual_frames):
                    contents.append(f"--- Frame at {t_rel:.1f} seconds ---")
                    contents.append(img)
            
            contents.append(prompt)
            
            response = self._generate_with_fallback(
                contents,
                generation_config={
                    "response_mime_type": "application/json",
                    "response_schema": schema
                }
            )
            script = response.text.strip()
            return script
        except Exception as e:
            print(f"⚠️ Failed to generate AI recap script: {e}")
            return "Check out this amazing highlight from the video scene!"

    def select_montage_clips(self, segments, video_duration, target_duration=30):
        """
        Selects multiple short action highlights (2-4 seconds each) 
        to be spliced together into a fast-paced viral montage (total target_duration).
        """
        # Format segments
        segments_text = []
        for i, seg in enumerate(segments):
            segments_text.append(f"[{seg['start']:.1f}s-{seg['end']:.1f}s]: {seg['text']}")
        transcript_with_timestamps = "\n".join(segments_text)
        
        prompt = f"""You are an expert at creating viral short-form montages and action compilations. 
Analyze this transcript with precise timestamps and select the top 8 to 10 most action-packed, visual, or engaging peak highlights in this video.

CRITICAL RULES:
1. Each segment must be short (between 2.5 and 4.0 seconds long).
2. The total combined duration of all segments should target around {target_duration} seconds.
3. Prioritize high-energy highlights: action scenes, intense expressions, key reveals, singing peaks.
4. Segments must not overlap and must use exact timestamps.

VIDEO DURATION: {video_duration} seconds

TRANSCRIPT WITH EXACT TIMESTAMPS:
{transcript_with_timestamps}

Return ONLY valid JSON:
{{
  "segments": [
    {{
      "start": 12.4,
      "end": 15.2,
      "title": "Action peak scene",
      "reason": "High-intensity jump kick"
    }}
  ]
}}"""
        try:
            response = self._generate_with_fallback(prompt)
            # Parse response JSON
            import re
            cleaned = response.text.strip()
            json_match = re.search(r'\{.*\}|\[.*\]', cleaned, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return parsed.get('segments', [])
        except Exception as e:
            print(f"⚠️ Failed to get montage segments from Gemini: {e}")
        
        # Fallback: slice the video into 3-second segments evenly
        fallback_segments = []
        interval = max(5, int(video_duration / 8))
        for t in range(0, int(video_duration) - 4, interval):
            fallback_segments.append({
                'start': float(t),
                'end': float(t + 3.0),
                'title': f"Peak highlight at {t}s"
            })
        return fallback_segments

    def get_editing_inspiration(self, topic):
        """
        Uses search-grounded Gemini to find viral editing styles on TikTok/Shorts
        related to the video topic, returning the optimal style config.
        """
        search_model = genai.GenerativeModel(
            'gemini-2.5-flash',
            tools=[{"google_search": {}}]
        )
        
        prompt = f"""Search the web and TikTok for popular editing trends, viral videos, color grades, and caption formats for edits of '{topic}'.
Based on your findings, select the best visual profile matching the trending style.

You must choose from these color filters:
- 'manga_ink': High-contrast black and white sketch with red/pink highlights (perfect for action anime edits like Jujutsu Kaisen, Demon Slayer, etc.)
- 'cool_teal': Cool desaturated blue-teal tones (perfect for cinematic drama, thriller clips, general action)
- 'dark_cyberpunk': Neon violet/cyan highlight, deep shadows, high saturation in blues (perfect for gaming, sci-fi)
- 'sunset_gold': Warm orange-gold tones (perfect for travel, retro, music clips)
- 'default': No color grading (standard video colors)

Return ONLY valid JSON:
{{
  "filter_profile": "manga_ink",
  "transition_flash": true,
  "caption_style": "cinematic_sub",
  "inspiration_summary": "Short explanation of the trending TikTok style you found"
}}"""
        try:
            response = search_model.generate_content(prompt)
            import re
            import json
            cleaned = response.text.strip()
            json_match = re.search(r'\{.*\}|\[.*\]', cleaned, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            print(f"⚠️ Failed to query search-grounded Gemini for editing inspiration: {e}")
            
        # Fallback configs based on keyword matches
        topic_lower = topic.lower()
        if any(kw in topic_lower for kw in ['anime', 'jjk', 'jujutsu', 'naruto', 'manga', 'goku', 'demon slayer', 'yuta']):
            return {
                "filter_profile": "manga_ink",
                "transition_flash": True,
                "caption_style": "cinematic_sub",
                "inspiration_summary": "Failsafe: Detected anime topic, defaulting to high-contrast manga_ink edit style."
            }
        elif any(kw in topic_lower for kw in ['game', 'gaming', 'cyberpunk', 'halo', 'gta', 'cod']):
            return {
                "filter_profile": "dark_cyberpunk",
                "transition_flash": True,
                "caption_style": "neon_cyan",
                "inspiration_summary": "Failsafe: Detected gaming topic, defaulting to dark_cyberpunk neon edit style."
            }
        return {
            "filter_profile": "cool_teal",
            "transition_flash": True,
            "caption_style": "cinematic_sub",
            "inspiration_summary": "Failsafe: Defaulting to standard cinematic cool_teal edit style."
        }
