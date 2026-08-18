import json
import random
import google.generativeai as genai

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
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.5-pro')

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
        segments_text = []
        for i, seg in enumerate(segments):
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
            
            response = self.model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
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
                duration = end - start
                
                if min_dur <= duration <= max_dur and start < end and end <= video_duration:
                    validated_clips.append({
                        'start': start,
                        'end': end,
                        'title': title,
                        'virality_score': score,
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
                print(f"⚠️ AI only returned {len(validated_clips)} clips. Generating {needed} fallback clips to match request...")
                fallback_clips = self._fallback_selection(segments, video_duration, needed, target_duration)
                # Adjust index/title for fallback clips
                for i, fb in enumerate(fallback_clips):
                    fb['title'] = f"Fallback Clip {len(validated_clips) + 1 + i}"
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
        used_segments = set()
        
        for i in range(n):
            available_segments = [seg for j, seg in enumerate(segments) if j not in used_segments]
            if available_segments:
                start_segment = random.choice(available_segments)
                start_time = start_segment['start']
                end_time = start_time + target_duration
                
                # Mark segments covered by this clip as used
                for idx, seg in enumerate(segments):
                    if seg['start'] >= start_time and seg['end'] <= end_time:
                        used_segments.add(idx)
            else:
                # Fall back to picking random time window across the video
                max_start = max(0.0, video_duration - target_duration)
                start_time = random.uniform(0.0, max_start)
                end_time = start_time + target_duration
            
            # Make sure we don't exceed video boundaries
            if end_time > video_duration:
                end_time = video_duration
                start_time = max(0.0, end_time - target_duration)
            
            clips.append({
                'start': start_time,
                'end': end_time,
                'title': f'Fallback clip {i+1}',
                'virality_score': 50,
                'hook_type': 'general',
                'reason': 'Automatically extracted highlight from the video sequence.',
                'duration': end_time - start_time,
                'content_title': f"Unmissable Moment: Clip {i+1} 🚀",
                'content_description': "You don't want to miss this engaging highlight from the video! #viral #trending #reels #shorts"
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
            
            response = self.model.generate_content(contents)
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
            
            response = self.model.generate_content(
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
        # call Gemini model
        try:
            response = self.model.generate_content(prompt)
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
