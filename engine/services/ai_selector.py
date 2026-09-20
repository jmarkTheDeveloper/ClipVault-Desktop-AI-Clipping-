import sys
import os
import json
import random
import base64
import requests
import google.generativeai as genai

try:
    from services.virality_models import ViralitySubScores, normalize_sub_scores
except ImportError:
    try:
        from virality_models import ViralitySubScores, normalize_sub_scores
    except ImportError:
        from engine.services.virality_models import ViralitySubScores, normalize_sub_scores

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

    def sample_candidate_keyframes(self, video_path: str, timestamps: list, max_frames: int = 4) -> list:
        """
        Samples lightweight downsampled keyframes from the video at specified timestamps
        to provide visual context for multimodal hook evaluation.
        """
        import cv2
        if not video_path or not os.path.exists(video_path) or not timestamps:
            return []

        frames = []
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return []
        try:
            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            for t in timestamps[:max_frames]:
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(max(0.0, float(t)) * fps))
                ret, frame = cap.read()
                if ret and frame is not None:
                    # Downsample to 480x270 JPEG for lightweight transmission
                    small = cv2.resize(frame, (480, 270), interpolation=cv2.INTER_AREA)
                    success, buf = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, 72])
                    if success:
                        frames.append(buf.tobytes())
        except Exception as e:
            print(f"[AISelector] Keyframe extraction notice: {e}")
        finally:
            cap.release()
        return frames

    def _call_openai_compatible(self, base_url: str, model: str, prompt: str, image_frames: list = None) -> str:
        """Universal fast caller for OpenAI, Groq, DeepSeek, Moonshot, Qwen, or Custom Proxy."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        user_content = []
        if image_frames and ("openai" in self.provider or "chatgpt" in self.provider):
            for frame_bytes in image_frames:
                b64 = base64.b64encode(frame_bytes).decode("utf-8")
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                })

        if user_content:
            user_content.append({"type": "text", "text": prompt})
            content_payload = user_content
        else:
            content_payload = prompt

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a professional video editor and viral short-form clip curator. Return ONLY valid JSON."},
                {"role": "user", "content": content_payload}
            ],
            "temperature": 0.4
        }
        r = requests.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload, timeout=60.0)
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
            "max_tokens": 4096,
            "messages": [{"role": "user", "content": prompt}]
        }
        r = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=60.0)
        if r.status_code != 200:
            raise RuntimeError(f"Anthropic API HTTP {r.status_code}: {r.text[:120]}")
        data = r.json()
        return data["content"][0]["text"]

    def _generate_with_fallback(self, prompt, generation_config=None, image_frames: list = None):
        """Tries selected AI provider with strict timeout or falls back to local chapter analysis."""
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
                print(f"[AISelector] Groq LPU note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 2. DeepSeek
        elif "deepseek" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.deepseek.com", "deepseek-chat", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"[AISelector] DeepSeek note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 3. OpenAI ChatGPT / GPT-4o
        elif "openai" in self.provider or "chatgpt" in self.provider or "sora" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.openai.com/v1", "gpt-4o-mini", prompt, image_frames=image_frames)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"[AISelector] OpenAI note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 4. Anthropic Claude
        elif "claude" in self.provider or "anthropic" in self.provider:
            try:
                text = self._call_anthropic_claude(prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"[AISelector] Anthropic note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 5. Moonshot / Moonlight
        elif "moonlight" in self.provider or "moonshot" in self.provider:
            try:
                text = self._call_openai_compatible("https://api.moonshot.cn/v1", "moonshot-v1-8k", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"[AISelector] Moonlight note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 6. Alibaba Qwen
        elif "qwen" in self.provider:
            try:
                text = self._call_openai_compatible("https://dashscope-intl.aliyuncs.com/compatible-mode/v1", "qwen-plus", prompt)
                class MockRes: text: str
                m = MockRes(); m.text = text
                return m
            except Exception as e:
                print(f"[AISelector] Qwen note: {e}. Falling back to smart chapter analyzer.")
                raise RuntimeError(e)

        # 7. Google Gemini (Gemini 3.6 Flash / Gemini Flash Latest / Gemini 2.5 Flash)
        else:
            gemini_models = [
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-1.5-flash",
                "gemini-2.5-pro",
                "gemini-1.5-pro",
            ]
            parts = []
            if image_frames:
                for frame_bytes in image_frames:
                    parts.append({
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": base64.b64encode(frame_bytes).decode("utf-8")
                        }
                    })
            parts.append({"text": prompt})

            for model_name in gemini_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
                    headers = {"Content-Type": "application/json"}
                    payload = {
                        "contents": [{"parts": parts}],
                        "generationConfig": {
                            "temperature": 0.4,
                            "responseMimeType": "application/json"
                        }
                    }
                    r = requests.post(url, headers=headers, json=payload, timeout=60.0)
                    if r.status_code == 200:
                        res_json = r.json()
                        candidates_list = res_json.get("candidates", [])
                        if not candidates_list:
                            continue
                        parts_list = candidates_list[0].get("content", {}).get("parts", [])
                        if not parts_list:
                            continue
                        text = parts_list[0].get("text", "")
                        if not text:
                            continue
                        class MockRes: text: str
                        m = MockRes(); m.text = text
                        return m
                    else:
                        print(f"[AISelector] Google Gemini note ({model_name}): HTTP {r.status_code}")
                except Exception as e:
                    print(f"[AISelector] Google Gemini note ({model_name}): {e}")
                    continue
            raise RuntimeError("Gemini API call failed across all available models.")

    def _expand_to_complete_context(self, segments, start_time, end_time, video_duration, target_duration=30.0):
        """
        Expands clip boundaries backwards to capture the premise/question setup 
        and forwards to capture the complete resolution, preventing truncated context.
        Resolves dangling pronouns ('he', 'she', 'they', 'it', 'this') and bundles
        interviewer setup questions with guest answers.
        """
        if not segments:
            return max(0.0, float(start_time)), min(float(video_duration), float(end_time) + 0.35)

        import bisect

        # Normalize segment list if not already cleaned
        if isinstance(segments, list) and len(segments) > 0 and isinstance(segments[0], dict) and 'start' in segments[0] and isinstance(segments[0]['start'], (int, float)) and 'end' in segments[0] and 'text' in segments[0]:
            clean_segs = segments
        else:
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
            return max(0.0, float(start_time)), min(float(video_duration), float(end_time) + 0.35)

        start_times = [s['start'] for s in clean_segs]
        # 1. Find segment index matching start_time via binary search
        start_idx = bisect.bisect_right(start_times, float(start_time)) - 1
        start_idx = max(0, min(len(clean_segs) - 1, start_idx))

        # 2. Backward Context Expansion:
        # Check if the start segment begins with dangling pronouns, conjunctions, or conversational continuations
        DANGLING_PRONOUNS = {
            'he', 'she', 'they', 'them', 'him', 'her', 'it', 'this', 'that', 'these',
            'those', 'his', 'hers', 'their', 'theirs', 'its', 'which', 'who', 'whom'
        }
        CONNECTIVE_STARTS = {
            'and', 'so', 'but', 'because', 'which', 'that', 'then', 'like', 'therefore',
            'meaning', 'anyway', 'also', 'or', 'well', 'actually', 'meanwhile', 'instead',
            'though', 'furthermore', 'moreover', 'hence', 'plus'
        }
        PHRASE_STARTERS = (
            "that's why", "this is why", "and that", "so that", "and then", "because of",
            "so basically", "like i said", "as i was saying", "which means", "meaning that",
            "in fact", "actually", "he said", "she said", "they said", "he was", "she was",
            "they were", "one day he", "when he", "when she", "when they", "when it",
            "what happened was", "and so"
        )
        QUESTION_WORDS = (
            'why', 'how', 'what', 'who', 'where', 'when', 'is it', 'can you', 'did you',
            'do you', 'have you', 'could you', 'would you', 'tell me', 'what about'
        )

        orig_start_time = start_time
        max_back_sec = 28.0  # Max lookback window (seconds) to find setup/question

        # A. First, check if an interviewer question was asked within the preceding 25 seconds
        question_start_idx = None
        for k in range(start_idx - 1, max(-1, start_idx - 18), -1):
            if (clean_segs[start_idx]['start'] - clean_segs[k]['start']) > max_back_sec:
                break
            prev_t = clean_segs[k]['text'].strip()
            if prev_t.endswith('?') or any(prev_t.lower().startswith(qw) for qw in QUESTION_WORDS):
                # Found the question end! Now step back to find where this question sentence started
                q_walk = k
                while q_walk > 0 and (clean_segs[start_idx]['start'] - clean_segs[q_walk - 1]['start']) <= max_back_sec:
                    prior_t = clean_segs[q_walk - 1]['text'].strip()
                    if prior_t.endswith(('.', '!', '?')):
                        break
                    q_walk -= 1
                question_start_idx = q_walk
                break

        # If a setup question was asked nearby, anchor the clip to the beginning of that question!
        if question_start_idx is not None and question_start_idx < start_idx:
            potential_dur = (end_time - clean_segs[question_start_idx]['start'])
            if potential_dur <= max(90.0, float(target_duration) * 1.65):
                start_idx = question_start_idx

        # B. Additionally, step back if current segment still starts mid-thought or with a dangling reference
        back_steps = 0
        max_back_steps = 18
        while start_idx > 0 and back_steps < max_back_steps:
            cur_txt = clean_segs[start_idx]['text'].strip().lower()
            words = cur_txt.split()
            first_word = words[0] if words else ''
            second_word = words[1] if len(words) > 1 else ''

            needs_back = False
            if first_word in CONNECTIVE_STARTS or first_word in DANGLING_PRONOUNS:
                needs_back = True
            elif any(cur_txt.startswith(p) for p in PHRASE_STARTERS):
                needs_back = True
            elif first_word in ('the', 'a') and second_word in ('guy', 'thing', 'problem', 'reason', 'doctor', 'cop', 'person', 'woman', 'man', 'boss'):
                needs_back = True

            prev_txt = clean_segs[start_idx - 1]['text'].strip()
            if prev_txt.endswith('?') or any(prev_txt.lower().startswith(q) for q in QUESTION_WORDS):
                needs_back = True

            # Guardrails against stepping back too far
            if (orig_start_time - clean_segs[start_idx - 1]['start']) > max_back_sec:
                break

            if needs_back:
                start_idx -= 1
                back_steps += 1
            else:
                break

        # Give 0.15s pre-roll buffer so the opening word/consonant is never clipped
        new_start = max(0.0, clean_segs[start_idx]['start'] - 0.15)

        # 3. Forward Expansion: Step forwards until the speaker reaches a true sentence conclusion
        end_idx = bisect.bisect_right(start_times, float(end_time)) - 1
        end_idx = max(0, min(len(clean_segs) - 1, end_idx))

        fwd_steps = 0
        max_fwd_steps = 16
        while end_idx < len(clean_segs) - 1 and fwd_steps < max_fwd_steps:
            end_txt = clean_segs[end_idx]['text'].strip()
            if end_txt.endswith(('.', '!', '?')):
                # Check if next segment immediately continues the payoff punchline or moral
                next_txt = clean_segs[end_idx + 1]['text'].strip().lower()
                PAYOFF_CONTINUATIONS = ("and that's why", "which means", "so the moral is", "and i never", "so basically that's", "in conclusion")
                if any(next_txt.startswith(pc) for pc in PAYOFF_CONTINUATIONS) and fwd_steps < 8:
                    end_idx += 1
                    fwd_steps += 1
                    continue
                break
            end_idx += 1
            fwd_steps += 1

        # Give 0.25s post-roll so the final word's decay isn't abruptly cut
        new_end = min(video_duration, clean_segs[end_idx]['end'] + 0.25)

        # 4. Strict Short-Form Duration Ceiling Enforcement
        if target_duration and target_duration > 0:
            max_dur = max(45.0, float(target_duration) * 1.30)
            if (new_end - new_start) > max_dur:
                cutoff_target = new_start + target_duration
                best_end_idx = None
                min_diff = float('inf')
                for idx in range(start_idx, end_idx + 1):
                    seg_dur = clean_segs[idx]['end'] - new_start
                    if seg_dur >= max(20.0, float(target_duration) * 0.60) and seg_dur <= max_dur:
                        txt = clean_segs[idx]['text'].strip()
                        if txt.endswith(('.', '!', '?')):
                            diff = abs(clean_segs[idx]['end'] - cutoff_target)
                            if diff < min_diff:
                                min_diff = diff
                                best_end_idx = idx
                if best_end_idx is not None:
                    new_end = min(video_duration, clean_segs[best_end_idx]['end'] + 0.25)
                else:
                    new_end = min(video_duration, new_start + max_dur)

        return max(0.0, new_start), new_end

    def _heuristic_viral_selector(self, segments, video_duration, n, target_duration, topic=None):
        """
        Intelligent Semantic Story Arc Selector.
        Groups Whisper segments into cohesive thought-blocks and complete stories,
        anchoring on premise/question setups and ending strictly on complete narrative closures
        (punchlines, resolution, laughter, natural topic pauses). Never cuts mid-sentence or mid-thought.
        """
        import re

        if not segments:
            clips = []
            step = max(10.0, (video_duration - 45.0) / max(1, n))
            for i in range(n):
                st = max(0.0, min(video_duration - 45.0, i * step))
                et = min(video_duration, st + 45.0)
                score = max(70, 92 - (i * 3))
                sub = normalize_sub_scores(None, score)
                clips.append({
                    'start': st,
                    'end': et,
                    'title': f'Video Story Arc #{i+1}',
                    'virality_score': score,
                    'sub_scores': sub.to_dict(),
                    'hook_type': 'Story Reveal',
                    'reason': 'Self-contained conversational arc with continuous narrative',
                    'duration': et - st,
                    'content_title': f"Story Arc #{i+1}",
                    'content_description': "Must-watch viral story! #shorts #viral #reels"
                })
            return clips

        # 1. Normalize segments
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

        # 2. Group raw micro-segments into Sentence Thought-Blocks
        # A true sentence accumulates words until punctuation (., !, ?) or silence pause > 0.80s
        QUESTION_WORDS = (
            'why', 'how', 'what', 'who', 'where', 'when', 'is it', 'can you', 'did you',
            'do you', 'have you', 'could you', 'would you', 'tell me', 'what about', 'are you', 'was it'
        )
        sentences = []
        cur_words = []
        cur_st = clean_segs[0]['start']
        cur_et = clean_segs[0]['end']

        for idx, seg in enumerate(clean_segs):
            txt = seg['text'].strip()
            if not cur_words:
                cur_st = seg['start']
            cur_words.append(txt)
            cur_et = seg['end']

            is_end = txt.endswith(('.', '!', '?'))
            has_pause = False
            if idx < len(clean_segs) - 1:
                next_st = clean_segs[idx + 1]['start']
                if (next_st - cur_et) > 0.80:
                    has_pause = True

            # Group boundary reached: sentence terminal, breath pause, or >15 seconds of monologue
            if is_end or has_pause or (cur_et - cur_st) > 15.0:
                s_text = " ".join(cur_words).strip()
                is_q = s_text.endswith('?') or any(s_text.lower().startswith(qw) for qw in QUESTION_WORDS)
                pause_after = (clean_segs[idx + 1]['start'] - cur_et) if idx < len(clean_segs) - 1 else 1.5
                sentences.append({
                    'start': cur_st,
                    'end': cur_et,
                    'text': s_text,
                    'is_question': is_q,
                    'pause_after': pause_after,
                    'ends_with_terminal': is_end
                })
                cur_words = []

        if cur_words:
            s_text = " ".join(cur_words).strip()
            is_q = s_text.endswith('?') or any(s_text.lower().startswith(qw) for qw in QUESTION_WORDS)
            sentences.append({
                'start': cur_st,
                'end': cur_et,
                'text': s_text,
                'is_question': is_q,
                'pause_after': 2.0,
                'ends_with_terminal': True
            })

        if not sentences:
            return self._heuristic_viral_selector([], video_duration, n, target_duration, topic)

        # 3. Regex Patterns for Story Detection
        HOOK_PATTERNS = [
            re.compile(r"\b(why|how|what if|did you know|is it true|can you believe|have you ever|who was|who is)\b", re.IGNORECASE),
            re.compile(r"\b(the truth about|nobody talks about|the biggest mistake|the real reason|i never told|they lied|the secret to|this is why)\b", re.IGNORECASE),
            re.compile(r"\b(one day|so what happened was|the craziest thing|i remember when|listen to this|look at what happened|my friend told me)\b", re.IGNORECASE),
            re.compile(r"\b(insane|crazy|unbelievable|impossible|illegal|dangerous|million dollars|police|arrested|ruined|deadly|genius|shocking)\b", re.IGNORECASE),
            re.compile(r"\b(the worst|the best|number one|top 3|never do this|always do this|stop doing|the problem with)\b", re.IGNORECASE)
        ]
        PAYOFF_PATTERNS = [
            re.compile(r"\b(and that's why|that is why|which means|so the moral is|and that was it|in the end|and it worked|so basically that's)\b", re.IGNORECASE),
            re.compile(r"\b(and everyone was|everybody laughed|he couldn't believe it|she couldn't believe it|and i was like|it blew my mind)\b", re.IGNORECASE),
            re.compile(r"\[laughter\]|\b(haha|hahaha|lmao|lol|giggle|giggling)\b", re.IGNORECASE),
            re.compile(r"\b(no way|oh my god|holy shit|what the hell|are you serious|that's crazy)\b", re.IGNORECASE)
        ]
        BAN_PATTERNS = [
            re.compile(r"\b(sponsored by|sponsor|nordvpn|betterhelp|expressvpn|audible|link in the description|use code|discount code|promo code)\b", re.IGNORECASE),
            re.compile(r"\b(subscribe to my channel|subscribe to the channel|hit the bell|leave a like|comment down below|patreon\.com)\b", re.IGNORECASE),
            re.compile(r"\b(can you hear me|mic test|audio check|stream starting|be right back|brb|technical difficulties)\b", re.IGNORECASE)
        ]
        DANGLING_STARTERS = {'he', 'she', 'they', 'them', 'it', 'this', 'that', 'these', 'those', 'his', 'her', 'their', 'which'}
        CONNECTIVE_STARTERS = {'and', 'so', 'but', 'because', 'then', 'also', 'meaning', 'anyway', 'or', 'well', 'actually'}

        # 4. Form Complete Story Candidates
        # Adaptive duration boundaries: allow the story to breathe naturally (25s to 90s)
        min_story_dur = 25.0
        max_story_dur = 90.0

        candidates = []
        total_sents = len(sentences)

        for s_idx in range(total_sents):
            first_sent = sentences[s_idx]
            first_text = first_sent['text'].strip()
            first_words = first_text.lower().split()
            if not first_words:
                continue

            # Check if this sentence is a valid Story Setup Anchor
            is_valid_anchor = False
            anchor_bonus = 0.0

            # Rule A: It's an explicit question (interviewer prompt or rhetorical hook)
            if first_sent['is_question']:
                is_valid_anchor = True
                anchor_bonus += 35.0

            # Rule B: Matches high-retention hook / story opening patterns
            for hp in HOOK_PATTERNS:
                if hp.search(first_text):
                    is_valid_anchor = True
                    anchor_bonus += 25.0
                    break

            # Rule C: Natural paragraph start preceded by conversational pause (> 0.9s)
            if s_idx == 0 or (s_idx > 0 and sentences[s_idx - 1]['pause_after'] > 0.9):
                is_valid_anchor = True
                anchor_bonus += 15.0

            # Penalty for starting with unreferenced dangling pronouns or connectives
            if first_words[0] in DANGLING_STARTERS:
                anchor_bonus -= 30.0
            if first_words[0] in CONNECTIVE_STARTERS:
                anchor_bonus -= 15.0

            if not is_valid_anchor and anchor_bonus <= 0:
                continue

            # Walk forward to find sentences that provide definitive narrative resolution / payoff
            accumulated_sents = []
            for e_idx in range(s_idx, min(total_sents, s_idx + 35)):
                cur_s = sentences[e_idx]
                accumulated_sents.append(cur_s)
                dur = cur_s['end'] - first_sent['start']

                if dur > max_story_dur:
                    break

                if dur >= min_story_dur:
                    # Check if cur_s is a valid narrative conclusion point
                    end_text = cur_s['text'].strip()
                    is_resolution = False
                    resolution_score = 0.0

                    # 1. Payoff / Punchline / Moral markers
                    for pp in PAYOFF_PATTERNS:
                        if pp.search(end_text):
                            is_resolution = True
                            resolution_score += 35.0
                            break

                    # 2. Conversational pause or topic shift immediately after sentence
                    if cur_s['pause_after'] >= 0.85:
                        is_resolution = True
                        resolution_score += 25.0

                    # 3. Next sentence starts a new question (indicating current answer is finished!)
                    if e_idx < total_sents - 1 and sentences[e_idx + 1]['is_question']:
                        is_resolution = True
                        resolution_score += 30.0

                    # 4. Standard clean sentence punctuation
                    if cur_s['ends_with_terminal']:
                        resolution_score += 15.0
                        if dur >= 35.0:
                            is_resolution = True

                    if is_resolution:
                        story_text = " ".join(s['text'] for s in accumulated_sents)
                        
                        # Score this complete story arc
                        score = 50.0 + anchor_bonus + resolution_score

                        # Topic alignment bonus
                        if topic and topic.lower() in story_text.lower():
                            score += 40.0

                        # Speaking rate check
                        words_count = len(story_text.split())
                        wpm = (words_count / max(1.0, dur)) * 60.0
                        if 125 <= wpm <= 190:
                            score += 15.0
                        elif wpm < 75:
                            score -= 30.0

                        # Penalize banned words
                        for bp in BAN_PATTERNS:
                            if bp.search(story_text):
                                score -= 80.0

                        # Penalize stories ending mid-sentence
                        if not cur_s['ends_with_terminal']:
                            score -= 40.0

                        # Generate high-quality contextual viral title
                        candidate_title = ""
                        if first_sent['is_question']:
                            clean_q = first_text.rstrip('?.! ')
                            if len(clean_q) > 48:
                                clean_q = clean_q[:45] + "..."
                            candidate_title = clean_q
                        else:
                            # Extract meaningful narrative premise
                            candidate_title = first_text[:50].rstrip('. ')
                            if len(first_text) > 50:
                                candidate_title += "..."

                        # Extract punchy hook title (3-5 words)
                        hook_words = [w for w in first_words if w not in {'the', 'a', 'an', 'and', 'so', 'to', 'of', 'in', 'is', 'it'}]
                        hook_title = " ".join(hook_words[:4]).title() if hook_words else "Viral Story"

                        comp_score = int(min(99, max(65, score)))
                        candidates.append({
                            'start': first_sent['start'],
                            'end': cur_s['end'],
                            'duration': dur,
                            'virality_score': comp_score,
                            'title': candidate_title,
                            'hook_title': hook_title,
                            'wpm': wpm,
                            'hook_type': 'Complete Story Arc' if resolution_score > 20 else 'Dialogue Highlight',
                            'reason': f'Complete self-contained story arc ({dur:.1f}s, {int(wpm)} WPM) with setup, discussion, and clear resolution.',
                            'content_title': candidate_title,
                            'content_description': f"{candidate_title} - Must-watch complete story! #shorts #viral #reels #clips"
                        })

        # 5. Sort candidates by virality score
        candidates.sort(key=lambda x: x['virality_score'], reverse=True)

        # 6. Chronologically balanced selection
        # Ensure selected clips do not heavily overlap (>6.0s) and provide broad coverage
        selected = []
        for cand in candidates:
            if len(selected) >= n:
                break

            # Run through Deep Context Expander to lock boundaries
            exp_st, exp_et = self._expand_to_complete_context(clean_segs, cand['start'], cand['end'], video_duration, target_duration=target_duration)

            overlaps = False
            for s in selected:
                overlap_start = max(exp_st, s['start'])
                overlap_end = min(exp_et, s['end'])
                if (overlap_end - overlap_start) > 6.0:
                    overlaps = True
                    break

            if not overlaps:
                cand['start'] = exp_st
                cand['end'] = exp_et
                cand['duration'] = exp_et - exp_st
                sub = normalize_sub_scores(None, cand['virality_score'])
                cand['sub_scores'] = sub.to_dict()
                selected.append(cand)

        # If still need more clips, extract best remaining non-overlapping sentences
        if len(selected) < n:
            remaining_needed = n - len(selected)
            slot_size = video_duration / max(1, remaining_needed + 1)
            for idx in range(remaining_needed):
                target_center = (idx + 1) * slot_size
                best_sent_idx = 0
                min_dist = 999999.0
                for s_i, sent in enumerate(sentences):
                    dist = abs(sent['start'] - target_center)
                    if dist < min_dist:
                        min_dist = dist
                        best_sent_idx = s_i
                
                s_st = sentences[best_sent_idx]['start']
                s_et = s_st + 40.0
                for f_i in range(best_sent_idx, min(total_sents, best_sent_idx + 15)):
                    if (sentences[f_i]['end'] - s_st) >= 30.0 and sentences[f_i]['ends_with_terminal']:
                        s_et = sentences[f_i]['end']
                        break
                
                exp_st, exp_et = self._expand_to_complete_context(clean_segs, s_st, s_et, video_duration, target_duration=target_duration)
                overlaps = any(max(exp_st, s['start']) < min(exp_et, s['end']) for s in selected)
                if not overlaps and exp_et > exp_st:
                    p_score = max(65, 85 - (len(selected) * 2))
                    sub = normalize_sub_scores(None, p_score)
                    title_text = sentences[best_sent_idx]['text'][:45].rstrip('. ') + "..."
                    selected.append({
                        'start': exp_st,
                        'end': exp_et,
                        'duration': exp_et - exp_st,
                        'virality_score': p_score,
                        'sub_scores': sub.to_dict(),
                        'title': title_text,
                        'hook_title': "Key Moment",
                        'hook_type': 'Key Highlight',
                        'reason': 'Conversational highlight with complete sentence closure.',
                        'content_title': title_text,
                        'content_description': "Must-watch viral moment! #shorts #viral"
                    })

        # Select top n by virality score
        selected = selected[:n]
        # Always return clips sorted chronologically by start timestamp along the video timeline!
        selected.sort(key=lambda x: x.get('start', 0.0))
        return selected

    @staticmethod
    def format_continuous_dialogue(segments: list) -> tuple[str, list]:
        """
        Aggregates raw Whisper micro-segments into continuous, paragraph-level dialogue
        thought-blocks and complete sentences, labeling questions and speaker shifts.
        Preserves 100% of the conversation without skipping lines.
        """
        if not segments:
            return "", []

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
            return "", []

        QUESTION_WORDS = (
            'why', 'how', 'what', 'who', 'where', 'when', 'is it', 'can you', 'did you',
            'do you', 'have you', 'could you', 'would you', 'tell me', 'what about', 'are you'
        )

        grouped_sentences = []
        cur_words = []
        cur_st = clean_segs[0]['start']
        cur_et = clean_segs[0]['end']

        for i, seg in enumerate(clean_segs):
            txt = seg['text'].strip()
            if not cur_words:
                cur_st = seg['start']
            cur_words.append(txt)
            cur_et = seg['end']

            is_end = txt.endswith(('.', '!', '?'))
            has_pause = False
            if i < len(clean_segs) - 1:
                next_st = clean_segs[i + 1]['start']
                if (next_st - cur_et) > 0.70:
                    has_pause = True

            if is_end or has_pause or (cur_et - cur_st) > 16.0:
                sentence_txt = " ".join(cur_words).strip()
                is_q = sentence_txt.endswith('?') or any(sentence_txt.lower().startswith(qw) for qw in QUESTION_WORDS)
                grouped_sentences.append({
                    'start': cur_st,
                    'end': cur_et,
                    'text': sentence_txt,
                    'is_question': is_q
                })
                cur_words = []

        if cur_words:
            sentence_txt = " ".join(cur_words).strip()
            is_q = sentence_txt.endswith('?') or any(sentence_txt.lower().startswith(qw) for qw in QUESTION_WORDS)
            grouped_sentences.append({
                'start': cur_st,
                'end': cur_et,
                'text': sentence_txt,
                'is_question': is_q
            })

        lines = []
        for g in grouped_sentences:
            tag = "QUESTION" if g['is_question'] else "DIALOGUE"
            lines.append(f"[{tag} {g['start']:.1f}s-{g['end']:.1f}s]: {g['text']}")

        return "\n".join(lines), grouped_sentences

    def select_clips(self, segments, video_duration, n, target_duration, topic=None, video_path=None):
        """
        Selects the most viral clips from a transcript using frontier AI models 
        (Gemini, Groq, OpenAI, Claude, DeepSeek) with intelligent multimodal evaluation and NLP fallback.
        Enforces complete self-contained context and question-premise anchoring.
        """
        # Format continuous, coherent dialogue without skipping or striding sentences
        transcript_with_timestamps, aggregated_dialogue = self.format_continuous_dialogue(segments)
        if not transcript_with_timestamps:
            return self._heuristic_viral_selector(segments, video_duration, n, target_duration, topic=topic)
        
        topic_clause = f"Focus strictly on highlights involving '{topic}'." if topic else "Focus on the most jaw-dropping, funny, emotional, or educational viral peaks."

        # Check if long video (> 15 minutes) with active API key -> Use Hierarchical Chaptering
        has_api_key = bool(self.api_key and self.api_key not in ["YOUR_API_KEY_HERE", "demo", "null", "undefined", ""])
        if video_duration > 900 and has_api_key and segments:
            try:
                print(f"[AISelector] Long video detected ({video_duration/60:.1f}m). Running Multi-Chapter Story Extraction across timeline...")
                window_duration = 720.0  # 12-minute window
                overlap = 60.0          # 1-minute overlap
                step = window_duration - overlap
                num_windows = max(2, int((video_duration - overlap) / step) + 1)
                clips_per_window = max(3, int(round((n * 1.5) / num_windows)) + 1)

                max_clip_dur = int(min(120, target_duration * 1.25 if target_duration and target_duration > 0 else 75))
                min_clip_dur = int(max(20, target_duration * 0.60 if target_duration and target_duration > 0 else 30))
                target_label = int(target_duration) if target_duration and target_duration > 0 else 60

                all_window_clips = []
                for w_idx in range(num_windows):
                    w_start = w_idx * step
                    w_end = min(video_duration, w_start + window_duration)
                    if w_start >= video_duration - 30.0:
                        break

                    # Filter segments falling into this chapter window
                    w_segs = [s for s in segments if isinstance(s, dict) and (w_start - 5.0) <= s.get('start', 0.0) <= (w_end + 5.0)]
                    if len(w_segs) < 10:
                        continue

                    w_transcript, _ = self.format_continuous_dialogue(w_segs)
                    if not w_transcript:
                        continue

                    w_prompt = f"""You are an elite viral video editor for short-form video (TikTok, YouTube Shorts, Reels).
Analyze this dialogue excerpt ({w_start/60:.1f}m - {w_end/60:.1f}m of the video) and extract the top {clips_per_window} COMPLETE self-contained viral stories.

{topic_clause}

CRITICAL RULES:
1. COMPLETE STANDALONE CONTEXT: Each clip MUST make 100% sense on its own. If it starts with a question or premise, include the question! Never start mid-explanation or with dangling pronouns ("he said", "this happened").
2. COMPLETE NARRATIVE ARC: Must contain: Setup/Hook -> Discussion -> Conclusion/Payoff. Never cut off before the punchline or moral of the story.
3. STRICT SHORT-FORM DURATION (~{target_label}s): Each clip MUST be around {target_label} seconds (between {min_clip_dur}s and {max_clip_dur}s). NEVER return a clip longer than {max_clip_dur} seconds!
4. EXACT TIMESTAMPS: Use the exact timestamps from this excerpt.

EXCERPT TRANSCRIPT:
{w_transcript}

Return ONLY valid JSON format:
{{
  "clips": [
    {{
      "start": {w_start + 10.0:.1f},
      "end": {w_start + 55.0:.1f},
      "title": "Clear punchy title of what they are talking about",
      "hook_title": "3-5 word on-screen text",
      "virality_score": 94,
      "sub_scores": {{"hook": 95, "flow": 92, "value": 94, "trend": 91}},
      "hook_type": "Story Reveal",
      "reason": "Complete narrative arc starting with premise and ending with full resolution"
    }}
  ]
}}"""
                    try:
                        resp = self._generate_with_fallback(w_prompt, generation_config={"response_mime_type": "application/json"})
                        raw_t = getattr(resp, "text", str(resp)).strip()
                        c_text = raw_t
                        if c_text.startswith("```"):
                            pts = c_text.split("```")
                            c_text = pts[1] if len(pts) >= 3 else pts[-1]
                            if c_text.startswith("json"): c_text = c_text[4:].strip()
                        if c_text.endswith("```"): c_text = c_text[:-3].strip()
                        c_data = json.loads(c_text)
                        c_list = c_data if isinstance(c_data, list) else c_data.get('clips', [])
                        for cd in c_list:
                            c_st = cd.get('start')
                            c_et = cd.get('end')
                            if c_st is not None and c_et is not None:
                                c_st, c_et = float(c_st), float(c_et)
                                if c_et > c_st and 0 <= c_st < video_duration:
                                    exp_st, exp_et = self._expand_to_complete_context(segments, c_st, c_et, video_duration, target_duration=target_duration)
                                    dur = exp_et - exp_st
                                    score = max(60, min(99, int(cd.get('virality_score', 85))))
                                    sub_s = normalize_sub_scores(cd.get('sub_scores'), score)
                                    title_str = cd.get('title', 'Highlight')
                                    all_window_clips.append({
                                        'start': exp_st,
                                        'end': exp_et,
                                        'duration': dur,
                                        'title': title_str,
                                        'hook_title': cd.get('hook_title', 'Key Moment'),
                                        'virality_score': score,
                                        'sub_scores': sub_s.to_dict(),
                                        'hook_type': cd.get('hook_type', 'Story Arc'),
                                        'reason': cd.get('reason', 'Complete narrative arc from chapter analysis'),
                                        'content_title': title_str,
                                        'content_description': f"{title_str} #shorts #viral #reels"
                                    })
                    except Exception as ch_err:
                        print(f"[AISelector] Chapter {w_idx+1} analysis note: {ch_err}")

                if all_window_clips:
                    all_window_clips.sort(key=lambda x: x['virality_score'], reverse=True)
                    deduped = []
                    for c in all_window_clips:
                        ov = False
                        for d in deduped:
                            overlap_start = max(c['start'], d['start'])
                            overlap_end = min(c['end'], d['end'])
                            if (overlap_end - overlap_start) > 8.0:
                                ov = True
                                break
                        if not ov:
                            deduped.append(c)

                    if len(deduped) >= n:
                        print(f"[AISelector] Multi-Chapter Analysis yielded {len(deduped)} top story clips across video timeline.")
                        top_n = deduped[:n]
                        top_n.sort(key=lambda x: x.get('start', 0.0))
                        return top_n
                    elif deduped:
                        needed = n - len(deduped)
                        print(f"[AISelector] Multi-Chapter Analysis produced {len(deduped)} clips, padding {needed} more to guarantee exactly {n} clips...")
                        extra = self._heuristic_viral_selector(segments, video_duration, needed, target_duration, topic=topic)
                        for ex in extra:
                            deduped.append(ex)
                        top_n = deduped[:n]
                        top_n.sort(key=lambda x: x.get('start', 0.0))
                        return top_n

            except Exception as multi_err:
                print(f"[AISelector] Multi-Chapter Analysis note: {multi_err}. Proceeding with standard flow...")

        prompt = f"""You are an elite viral video editor and algorithm curator for short-form video (TikTok, YouTube Shorts, Instagram Reels).
Analyze this continuous dialogue transcript with timestamps and select the {n} BEST viral short-form clips.

{topic_clause}

CRITICAL RULES FOR ZERO-KNOWLEDGE STANDALONE CONTEXT (MANDATORY):
1. THE STANDALONE TEST: The viewer has NEVER seen this podcast or video before and knows NOTHING about the speakers. Every clip must make 100% complete sense in isolation without requiring prior context. If a viewer scrolls past this clip, they must understand who/what is being discussed within the first 3 seconds without feeling confused.
2. ALWAYS INCLUDE THE QUESTION / PREMISE SETUP: In podcasts and interviews, a story or answer ALWAYS begins with a prompt. You MUST start the clip at the host's question or the speaker's introductory premise. NEVER start mid-answer, mid-explanation, or 10 seconds into a story.
3. ZERO DANGLING PRONOUNS: NEVER start a clip with an unreferenced pronoun ("he told me", "she was like", "they took it", "this company", "it happened"). The clip MUST start where the subject, person, or situation is first named and introduced.
4. FULL 3-PART STORY ARC: Every clip MUST contain:
   - Part 1: The Setup / Hook (The question, mystery, premise, or situation introduction)
   - Part 2: The Core Meat (The story, argument, struggle, or insight unfolding)
   - Part 3: The Payoff / Resolution (The conclusion, punchline, takeaway, or moral of the story)
5. STRICT SHORT-FORM DURATION (~{int(target_duration) if target_duration and target_duration > 0 else 60}s): Each clip MUST be around {int(target_duration) if target_duration and target_duration > 0 else 60} seconds (between {int(max(20, target_duration * 0.60 if target_duration and target_duration > 0 else 30))}s and {int(min(120, target_duration * 1.25 if target_duration and target_duration > 0 else 75))}s). NEVER return a clip longer than {int(min(120, target_duration * 1.25 if target_duration and target_duration > 0 else 75))} seconds!
6. ZERO FILLER: Do NOT select sponsor reads, channel plugs, audio checks, or disconnected punchlines.
7. EXACT SENTENCE BOUNDARIES: Start precisely at word 1 of the opening sentence (or question) and end cleanly on the final punctuation mark of the conclusion.
8. EXPLAINABLE METRICS: Provide an overall virality_score (0-99) and 4 sub_scores:
   - hook (0-99): Opening 3-5 seconds retention strength.
   - flow (0-99): Rhythm, conversational pacing, lack of dead air.
   - value (0-99): Information density or emotional payoff.
   - trend (0-99): Viral topical relevance and hook patterns.
9. EXACT NUMBER: Return EXACTLY {n} non-overlapping clips in the JSON array.
10. FULL CHRONOLOGICAL COVERAGE: For long videos ({video_duration}s), distribute your clip selections across the ENTIRE video duration (early setups, middle discussions, and late climaxes/conclusions). Do NOT cluster clips only at the beginning.

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
      "hook_title": "3-5 word on-screen text",
      "virality_score": 94,
      "sub_scores": {{
        "hook": 96,
        "flow": 91,
        "value": 93,
        "trend": 95
      }},
      "hook_type": "Shock Reveal",
      "reason": "Complete narrative arc starting with opening question and ending with full resolution",
      "content_title": "He Revealed The Shocking Truth",
      "content_description": "Engaging description with viral hashtags #shorts #viral #reels"
    }}
  ]
}}"""
        
        try:
            image_frames = []
            if video_path and os.path.exists(video_path):
                try:
                    sample_pts = [float(video_duration) * 0.15, float(video_duration) * 0.45, float(video_duration) * 0.75]
                    image_frames = self.sample_candidate_keyframes(video_path, sample_pts, max_frames=3)
                    if image_frames:
                        print(f"[AISelector] Sampled {len(image_frames)} keyframes for multimodal visual evaluation")
                except Exception as kf_err:
                    print(f"[AISelector] Keyframe sampling notice: {kf_err}")

            print(f"[AISelector] {self.provider.upper()} analyzing content for complete narrative story arcs...")
            response = self._generate_with_fallback(
                prompt,
                generation_config={"response_mime_type": "application/json"},
                image_frames=image_frames if image_frames else None
            )
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
                sub_scores_raw = clip_data.get('sub_scores')
                hook_type = clip_data.get('hook_type', 'Story Reveal')
                reason = clip_data.get('reason', 'Strong narrative flow and retention hook')
                content_title = clip_data.get('content_title', f"Viral Moment: {title}")
                content_description = clip_data.get('content_description', "Check out this viral moment! #shorts #reels #tiktok #viral")

                if start is None or end is None:
                    continue

                start, end = float(start), float(end)
                if start >= end or start < 0 or start >= video_duration:
                    continue

                # Pass through Deep Context Expander to guarantee setup + conclusion are not truncated
                exp_st, exp_et = self._expand_to_complete_context(segments, start, end, video_duration, target_duration=target_duration)
                dur = exp_et - exp_st
                comp_score = max(60, min(99, int(score)))
                sub_scores = normalize_sub_scores(sub_scores_raw, comp_score)

                validated_clips.append({
                    'start': exp_st,
                    'end': exp_et,
                    'title': title,
                    'virality_score': comp_score,
                    'sub_scores': sub_scores.to_dict(),
                    'hook_type': hook_type,
                    'reason': reason,
                    'duration': dur,
                    'content_title': content_title,
                    'content_description': content_description
                })

            if not validated_clips:
                raise ValueError("AI returned zero valid timestamp clips.")

            validated_clips.sort(key=lambda x: x['virality_score'], reverse=True)

            if len(validated_clips) < n:
                needed = n - len(validated_clips)
                print(f"[AISelector] Padding {needed} additional viral moments using NLP context detector...")
                extra = self._heuristic_viral_selector(segments, video_duration, needed, target_duration, topic=topic)
                for ex in extra:
                    validated_clips.append(ex)

            top_n = validated_clips[:n]
            # Ensure clips are strictly ordered chronologically along the video timeline
            top_n.sort(key=lambda x: x.get('start', 0.0))

            print(f"[AISelector] Selected top {len(top_n)} complete narrative clips (ordered by video timeline):")
            for i, clip in enumerate(top_n, 1):
                print(f"  Clip #{i}: {clip['title']} (Score: {clip['virality_score']}pts, Timeline: {clip['start']:.1f}s-{clip['end']:.1f}s, Duration: {clip['duration']:.1f}s)")
            
            return top_n
            
        except Exception as e:
            print(f"[AISelector] AI selection notice: {e}. Executing Intelligent NLP Virality Scorer...")
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
  "caption_style": "capcut_yellow",
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
                "caption_style": "capcut_yellow",
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
            "caption_style": "capcut_yellow",
            "inspiration_summary": "Failsafe: Defaulting to standard viral yellow edit style."
        }
