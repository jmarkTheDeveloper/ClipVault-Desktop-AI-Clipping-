import sys
import json
import random
import requests
import google.generativeai as genai

if hasattr(sys.stdout, 'reconfigure'):
    try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass
if hasattr(sys.stderr, 'reconfigure'):
    try: sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception: pass

class AISelector:
    """
    Uses AI models (Gemini, OpenAI, Groq, DeepSeek, Claude, Moonlight, Qwen) to select viral clips.
    """
    def __init__(self, api_key, provider="intel_ai"):
        self.api_key = api_key
        self.provider = (provider or "intel_ai").lower()
        
        # Configure Gemini if key is provided
        if self.api_key and self.api_key not in ["YOUR_API_KEY_HERE", "demo", "null", "undefined", ""]:
            try:
                genai.configure(api_key=self.api_key)
            except Exception:
                pass

        self.supported_gemini_models = [
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-3.7-flash',
            'gemini-3.6-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro',
            'gemini-pro-latest'
        ]

    def _call_openai_compatible(self, base_url: str, model: str, prompt: str) -> str:
        """Universal fast caller for OpenAI, Groq, DeepSeek, Moonshot, Qwen, or Custom Proxy."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a professional video editor and viral short-form clip curator. Return ONLY valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4
        }
        r = requests.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload, timeout=6.5)
        if r.status_code != 200:
            raise RuntimeError(f"Provider API HTTP {r.status_code}: {r.text[:120]}")
        data = r.json()
        return data["choices"][0]["message"]["content"]

    def _call_anthropic_claude(self, prompt: str) -> str:
        """Caller for Anthropic Claude API."""
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 1500,
            "messages": [{"role": "user", "content": prompt}]
        }
        r = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=7.0)
        if r.status_code != 200:
            raise RuntimeError(f"Anthropic API HTTP {r.status_code}: {r.text[:120]}")
        data = r.json()
        return data["content"][0]["text"]

    def _generate_with_fallback(self, prompt, generation_config=None):
        """Tries selected AI provider with strict 6.5s timeout or falls back to local chapter analysis."""
        if not self.api_key or self.api_key in ["YOUR_API_KEY_HERE", "demo", "null", "undefined", ""]:
            raise RuntimeError("Local Hardware / Demo mode active. Using instant local energy-peak analysis.")

        import concurrent.futures

        # 1. Groq LPU (Ultra Fast 500+ t/s)
        if "groq" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.groq.com/openai/v1", "llama-3.3-70b-versatile", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"⚠️ Groq LPU note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 2. DeepSeek
        elif "deepseek" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.deepseek.com", "deepseek-chat", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"⚠️ DeepSeek note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 3. OpenAI ChatGPT / GPT-4o
        elif "openai" in self.provider or "chatgpt" in self.provider or "sora" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.openai.com/v1", "gpt-4o-mini", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"⚠️ OpenAI note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 4. Anthropic Claude
        elif "claude" in self.provider or "anthropic" in self.provider:
            try:
                text = self._call_anthropic_claude(prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"⚠️ Anthropic note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 5. Moonshot / Moonlight
        elif "moonlight" in self.provider or "moonshot" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.moonshot.cn/v1", "moonshot-v1-8k", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"⚠️ Moonlight note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 6. Alibaba Qwen
        elif "qwen" in self.provider:
            try:
                text = self._call_openai_compatible("https://dashscope-intl.aliyuncs.com/compatible-mode/v1", "qwen-plus", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"⚠️ Qwen note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 7. Google Gemini (Gemini 2.5 Flash / Gemini Flash Latest)
        else:
            gemini_models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-2.5-pro"]
            for model_name in gemini_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                    headers = {"Content-Type": "application/json"}
                    payload = {
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.4}
                    }
                    r = requests.post(url, headers=headers, json=payload, timeout=12.0)
                    if r.status_code == 200:
                        res_json = r.json()
                        text = res_json["candidates"][0]["content"]["parts"][0]["text"]
                        class MockRes: text: str
                        m = MockRes(); m.text = text
                        return m
                    else:
                        print(f"⚠️ Google Gemini note ({model_name}): HTTP {r.status_code}")
                except Exception as e:
                    print(f"⚠️ Google Gemini note ({model_name}): {e}")
                    continue
            raise RuntimeError("Gemini API call failed across all available models.")

    def _expand_to_complete_context(self, segments, start_time, end_time, video_duration):
        """
        Expands clip boundaries backwards to capture the premise/question setup 
        and forwards to capture the complete resolution, preventing truncated context.
        """
        if not segments:
            return max(0.0, float(start_time)), min(float(video_duration), float(end_time) + 0.35)

        # Normalize segment list
        clean_segs = []
        for s in segments:
            if isinstance(s, dict):
                st = float(s.get('start', 0.0))
                et = float(s.get('end', st + 1.0))
                txt = str(s.get('text', '')).strip()
            elif isinstance(s, (list, tuple)) and len(s) >= 2:
                st = float(s[0])
                et = float(s[1])
                txt = str(s[2]).strip() if len(s) > 2 else ''
            else:
                continue
            if et > st:
                clean_segs.append({'start': st, 'end': et, 'text': txt})

        if not clean_segs:
            return max(0.0, float(start_time)), min(float(video_duration), float(end_time) + 0.35)

        # 1. Find segment index matching start_time
        start_idx = 0
        for i, s in enumerate(clean_segs):
            if s['start'] <= start_time <= s['end'] or s['start'] >= start_time:
                start_idx = i
                break

        # 2. Backward Expansion: Step backwards if current segment starts mid-thought or previous is setup question
        CONNECTIVE_STARTS = ['and', 'so', 'but', 'because', 'which', 'that', 'then', 'like', 'therefore', 'meaning']
        back_steps = 0
        while start_idx > 0 and back_steps < 6:
            cur_txt = clean_segs[start_idx]['text'].strip().lower()
            first_word = cur_txt.split()[0] if cur_txt else ''
            prev_txt = clean_segs[start_idx - 1]['text'].strip()
            
            needs_back = False
            if first_word in CONNECTIVE_STARTS or cur_txt.startswith(("that's why", "this is why", "and that", "so that", "and then")):
                needs_back = True
            elif prev_txt.endswith('?') or any(q in prev_txt.lower() for q in ['why', 'how', 'what about', 'tell me', 'did you know', 'have you']):
                needs_back = True

            if needs_back:
                start_idx -= 1
                back_steps += 1
            else:
                break

        new_start = clean_segs[start_idx]['start']

        # 3. Forward Expansion: Step forwards until the speaker reaches a true sentence conclusion
        end_idx = len(clean_segs) - 1
        for i in range(len(clean_segs) - 1, -1, -1):
            if clean_segs[i]['start'] <= end_time <= clean_segs[i]['end'] or clean_segs[i]['end'] <= end_time:
                end_idx = i
                break

        fwd_steps = 0
        while end_idx < len(clean_segs) - 1 and fwd_steps < 6:
            end_txt = clean_segs[end_idx]['text'].strip()
            if end_txt.endswith(('.', '!', '?')):
                break
            end_idx += 1
            fwd_steps += 1

        new_end = min(video_duration, clean_segs[end_idx]['end'] + 0.35)
        return max(0.0, new_start), new_end

    def _heuristic_viral_selector(self, segments, video_duration, n, target_duration, topic=None):
        """
        Intelligent Local NLP & Acoustic Energy Virality Scorer.
        Evaluates speech pacing (WPM), question hooks, emotional intensity, 
        laughter, high-stakes vocabulary, and sentence boundary snapping.
        """
        import re

        if not segments:
            clips = []
            step = max(5.0, (video_duration - target_duration) / max(1, n))
            for i in range(n):
                st = max(0.0, min(video_duration - target_duration, i * step))
                et = min(video_duration, st + target_duration)
                clips.append({
                    'start': st,
                    'end': et,
                    'title': f'Peak Highlight #{i+1}',
                    'virality_score': max(70, 95 - (i * 4)),
                    'hook_type': 'story_reveal',
                    'reason': 'Visual energy sequence',
                    'duration': et - st,
                    'content_title': f"Peak Highlight #{i+1} 🚀",
                    'content_description': "Insane viral moment! #shorts #viral #reels"
                })
            return clips

        # High-converting hook triggers
        HOOK_PATTERNS = [
            r"\b(why|how|what if|did you know|is it true|can you believe|who else|have you ever)\b",
            r"\b(the truth about|nobody talks about|the biggest mistake|the real reason|i never told|they lied|secret|hack)\b",
            r"\b(insane|crazy|unbelievable|impossible|illegal|dangerous|million dollars|police|arrested|ruined|deadly|genius|shocking)\b",
            r"\b(one day|so i was|suddenly|out of nowhere|i remember when|listen to this|look at what happened)\b",
            r"\b(the worst|the best|number one|top 3|never do this|always do this|stop doing)\b"
        ]

        REACTION_PATTERNS = [
            r"\b(oh my god|omg|no way|what the|holy|bro|wait wait|look at this|check this out|are you kidding)\b",
            r"\[laughter\]|\b(haha|hahaha|lmao|lol|giggle|giggling)\b",
            r"(\!|\?){1,}"
        ]

        BAN_PATTERNS = [
            r"\b(sponsored by|sponsor|nordvpn|betterhelp|expressvpn|audible|link in the description|use code|discount code|promo code)\b",
            r"\b(subscribe to my channel|subscribe to the channel|hit the bell|leave a like|comment down below|patreon\.com)\b",
            r"\b(can you hear me|mic test|audio check|stream starting|be right back|brb|technical difficulties)\b"
        ]

        # Normalize segment structures
        clean_segs = []
        for s in segments:
            if isinstance(s, dict):
                st = float(s.get('start', 0.0))
                et = float(s.get('end', st + 1.0))
                txt = str(s.get('text', '')).strip()
            elif isinstance(s, (list, tuple)) and len(s) >= 2:
                st = float(s[0])
                et = float(s[1])
                txt = str(s[2]).strip() if len(s) > 2 else ''
            else:
                continue
            if et > st and txt:
                clean_segs.append({'start': st, 'end': et, 'text': txt})

        if not clean_segs:
            return self._heuristic_viral_selector([], video_duration, n, target_duration, topic)

        # Flexible target window (soft threshold rather than rigid hard clamp)
        min_dur = max(6.0, float(target_duration) * 0.35)
        max_dur = min(float(video_duration), float(target_duration) * 1.35 + 20.0)

        candidates = []
        total_segs = len(clean_segs)

        for i in range(total_segs):
            start_seg = clean_segs[i]
            st = start_seg['start']
            
            accumulated_text = []
            for j in range(i, total_segs):
                end_seg = clean_segs[j]
                et = end_seg['end']
                cur_dur = et - st
                accumulated_text.append(end_seg['text'])

                if cur_dur >= min_dur:
                    if cur_dur <= max_dur:
                        full_txt = " ".join(accumulated_text)
                        hook_txt = " ".join(accumulated_text[:min(3, len(accumulated_text))])
                        
                        score = 50.0

                        if topic and topic.lower() in full_txt.lower():
                            score += 40.0

                        # Direct Hook Start
                        first_seg_txt = clean_segs[i]['text']
                        for hp in HOOK_PATTERNS:
                            if re.search(hp, first_seg_txt, re.IGNORECASE):
                                score += 35.0
                                break
                            elif re.search(hp, hook_txt, re.IGNORECASE):
                                score += 20.0
                                break

                        WEAK_STARTS = [r"^(so yeah|um|uh|and then|like i said|anyways|so basically|ok so)\b"]
                        for ws in WEAK_STARTS:
                            if re.search(ws, first_seg_txt, re.IGNORECASE):
                                score -= 25.0

                        for rp in REACTION_PATTERNS:
                            matches = len(re.findall(rp, full_txt, re.IGNORECASE))
                            score += min(20.0, matches * 6.0)

                        words = full_txt.split()
                        wpm = (len(words) / max(1.0, cur_dur)) * 60.0
                        if 120 <= wpm <= 220:
                            score += 15.0
                        elif wpm < 70:
                            score -= 30.0

                        if full_txt.rstrip().endswith(('.', '!', '?')):
                            score += 10.0

                        for bp in BAN_PATTERNS:
                            if re.search(bp, full_txt, re.IGNORECASE):
                                score -= 80.0

                        # Expand candidate to full context (premise setup + full conclusion)
                        exp_st, exp_et = self._expand_to_complete_context(clean_segs, st, et, video_duration)

                        title_candidate = hook_txt.strip()[:45]
                        if len(hook_txt) > 45:
                            title_candidate += "..."

                        candidates.append({
                            'start': exp_st,
                            'end': exp_et,
                            'duration': exp_et - exp_st,
                            'virality_score': int(min(99, max(60, score))),
                            'title': title_candidate,
                            'hook_type': 'high_engagement_story',
                            'reason': f'High speech density ({int(wpm)} WPM) with complete story context',
                            'content_title': f"{title_candidate} 🔥",
                            'content_description': "Must-watch viral highlight! #shorts #viral #reels #trending"
                        })
                    else:
                        break

        candidates.sort(key=lambda x: x['virality_score'], reverse=True)

        selected = []
        for cand in candidates:
            if len(selected) >= n:
                break
            
            overlaps = False
            for s in selected:
                overlap_start = max(cand['start'], s['start'])
                overlap_end = min(cand['end'], s['end'])
                if (overlap_end - overlap_start) > 6.0:
                    overlaps = True
                    break
            
            if not overlaps:
                selected.append(cand)

        if len(selected) < n:
            step = max(5.0, (video_duration - target_duration) / max(1, n))
            for i in range(n):
                if len(selected) >= n:
                    break
                st = max(0.0, min(video_duration - target_duration, i * step))
                et = min(video_duration, st + target_duration)
                exp_st, exp_et = self._expand_to_complete_context(clean_segs, st, et, video_duration)
                selected.append({
                    'start': exp_st,
                    'end': exp_et,
                    'duration': exp_et - exp_st,
                    'virality_score': max(65, 88 - (len(selected) * 4)),
                    'title': f'Chapter Highlight #{len(selected)+1}',
                    'hook_type': 'story_reveal',
                    'reason': 'Engaging segment from video chapter',
                    'content_title': f"Highlight #{len(selected)+1} 🍿",
                    'content_description': "Check out this highlight! #shorts #viral"
                })

        selected.sort(key=lambda x: x['virality_score'], reverse=True)
        return selected[:n]

    def select_clips(self, segments, video_duration, n, target_duration, topic=None):
        """
        Selects the most viral clips from a transcript using frontier AI models 
        (Gemini, Groq, OpenAI, Claude, DeepSeek) with intelligent NLP fallback.
        """
        # Format clean, continuous transcript (up to 300 contiguous segments without skipping)
        if len(segments) > 300:
            eval_segments = segments[:300]
        else:
            eval_segments = segments

        segments_text = []
        for seg in eval_segments:
            st = float(seg.get('start', 0.0))
            et = float(seg.get('end', st + 1.0))
            txt = str(seg.get('text', '')).strip()
            if txt:
                segments_text.append(f"[{st:.1f}s-{et:.1f}s]: {txt}")
        
        transcript_with_timestamps = "\n".join(segments_text)
        
        topic_clause = f"Focus strictly on highlights involving '{topic}'." if topic else "Focus on the most jaw-dropping, funny, emotional, or educational viral peaks."

        prompt = f"""You are a world-class viral video editor (similar to Opus Clip and viral TikTok curators).
Analyze this continuous video transcript with timestamps and select the {n} BEST viral short-form clips.

{topic_clause}

CRITICAL RULES FOR FULL CONTEXT & NARRATIVE COMPLETENESS:
1. FULL CONTEXT SETUP (NEVER START IN THE MIDDLE): Every clip MUST include the opening question, premise, or backstory that introduces the topic. Never start mid-explanation (e.g. starting at "So that's why they did it..." WITHOUT the setup is STRICTLY FORBIDDEN).
2. FULL NARRATIVE RESOLUTION: Every clip MUST conclude the thought, story, or lesson completely. Never cut off mid-explanation before the conclusion is spoken.
3. TARGET DURATION GUIDELINE (~{target_duration}s): Use ~{target_duration} seconds as a flexible guide, NOT a rigid guillotine. If completing the full premise-to-conclusion story takes less or more time, capture the complete unbroken story arc.
4. ZERO FILLER: Do NOT select sponsor reads, channel plugs, or audio checks.
5. EXACT SENTENCE BOUNDARIES: Start at word 1 of the opening sentence and end cleanly on the final punctuation mark.
6. EXACT NUMBER: Return EXACTLY {n} non-overlapping clips in the JSON array.

VIDEO DURATION: {video_duration} seconds

TRANSCRIPT:
{transcript_with_timestamps}

Return ONLY valid JSON format:
{{
  "clips": [
    {{
      "start": 12.4,
      "end": 48.6,
      "title": "Short punchy summary of the clip",
      "hook_title": "3-5 word clickbait title for on-screen text",
      "virality_score": 94,
      "hook_type": "shock_reveal",
      "reason": "Complete narrative arc starting with the opening setup question and ending with full resolution",
      "content_title": "Catchy viral title for TikTok/Shorts (e.g. 'He revealed the truth! 🤯')",
      "content_description": "Engaging description with viral hashtags #shorts #viral #reels"
    }}
  ]
}}"""
        
        try:
            print(f"🤖 {self.provider.upper()} analyzing transcript for complete narrative story arcs...")
            response = self._generate_with_fallback(prompt, generation_config={"response_mime_type": "application/json"})
            raw_text = getattr(response, "text", str(response)).strip()
            clean_text = raw_text
            if clean_text.startswith("```"):
                parts = clean_text.split("```")
                clean_text = parts[1] if len(parts) >= 3 else parts[-1]
                if clean_text.startswith("json"):
                    clean_text = clean_text[4:].strip()
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3].strip()

            data = json.loads(clean_text)
            clips_list = data if isinstance(data, list) else data.get('clips', [])
            
            validated_clips = []
            for clip_data in clips_list:
                start = clip_data.get('start')
                end = clip_data.get('end')
                title = clip_data.get('title', 'Untitled Highlight')
                score = clip_data.get('virality_score', 85)
                hook_type = clip_data.get('hook_type', 'story_reveal')
                content_title = clip_data.get('content_title', f"Viral Moment: {title} 🚀")
                content_description = clip_data.get('content_description', "Check out this viral moment! #shorts #reels #tiktok #viral")

                if start is None or end is None:
                    continue

                start, end = float(start), float(end)
                if start >= end or start < 0 or start >= video_duration:
                    continue

                # Pass through Context Expander to guarantee setup + conclusion are not truncated
                exp_st, exp_et = self._expand_to_complete_context(segments, start, end, video_duration)
                dur = exp_et - exp_st

                validated_clips.append({
                    'start': exp_st,
                    'end': exp_et,
                    'title': title,
                    'virality_score': max(60, min(99, int(score))),
                    'hook_type': hook_type,
                    'duration': dur,
                    'content_title': content_title,
                    'content_description': content_description
                })

            if not validated_clips:
                raise ValueError("AI returned zero valid timestamp clips.")

            validated_clips.sort(key=lambda x: x['virality_score'], reverse=True)

            if len(validated_clips) < n:
                needed = n - len(validated_clips)
                print(f"⚠️ Padding {needed} additional viral moments using NLP context detector...")
                extra = self._heuristic_viral_selector(segments, video_duration, needed, target_duration, topic=topic)
                for ex in extra:
                    validated_clips.append(ex)

            print(f"✅ Selected top {n} complete narrative clips:")
            for i, clip in enumerate(validated_clips[:n], 1):
                print(f"  {i}. {clip['title']} (Score: {clip['virality_score']}pts, Duration: {clip['duration']:.1f}s)")
            
            return validated_clips[:n]
            
        except Exception as e:
            print(f"⚡ AI selection notice: {e}. Executing Intelligent NLP Virality Scorer...")
            return self._heuristic_viral_selector(segments, video_duration, n, target_duration, topic=topic)

    def _fallback_selection(self, segments, video_duration, n, target_duration):
        """Backwards-compatible wrapper routing to heuristic viral selector."""
        return self._heuristic_viral_selector(segments, video_duration, n, target_duration)

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
