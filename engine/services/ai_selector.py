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
        r = requests.post(f"{base_url.rstrip('/')}/chat/completions", headers=headers, json=payload, timeout=8.5)
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
        r = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=7.0)
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
                "gemini-3.6-flash",
                "gemini-flash-latest",
                "gemini-2.5-flash",
                "gemini-3.7-flash",
                "gemini-pro-latest",
                "gemini-2.5-pro",
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
                    r = requests.post(url, headers=headers, json=payload, timeout=45.0)
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
                score = max(70, 95 - (i * 4))
                sub = normalize_sub_scores(None, score)
                clips.append({
                    'start': st,
                    'end': et,
                    'title': f'Highlight #{i+1}',
                    'virality_score': score,
                    'sub_scores': sub.to_dict(),
                    'hook_type': 'Story Reveal',
                    'reason': 'Visual energy sequence with continuous narrative',
                    'duration': et - st,
                    'content_title': f"Highlight #{i+1}",
                    'content_description': "Must-watch viral highlight! #shorts #viral #reels"
                })
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

        # Pre-compile regex patterns
        HOOK_REGEXES = [
            re.compile(r"\b(why|how|what if|did you know|is it true|can you believe|who else|have you ever)\b", re.IGNORECASE),
            re.compile(r"\b(the truth about|nobody talks about|the biggest mistake|the real reason|i never told|they lied|secret|hack)\b", re.IGNORECASE),
            re.compile(r"\b(insane|crazy|unbelievable|impossible|illegal|dangerous|million dollars|police|arrested|ruined|deadly|genius|shocking)\b", re.IGNORECASE),
            re.compile(r"\b(one day|so i was|suddenly|out of nowhere|i remember when|listen to this|look at what happened)\b", re.IGNORECASE),
            re.compile(r"\b(the worst|the best|number one|top 3|never do this|always do this|stop doing)\b", re.IGNORECASE)
        ]
        REACTION_REGEXES = [
            re.compile(r"\b(oh my god|omg|no way|what the|holy|bro|wait wait|look at this|check this out|are you kidding)\b", re.IGNORECASE),
            re.compile(r"\[laughter\]|\b(haha|hahaha|lmao|lol|giggle|giggling)\b", re.IGNORECASE),
            re.compile(r"(\!|\?){1,}")
        ]
        BAN_REGEXES = [
            re.compile(r"\b(sponsored by|sponsor|nordvpn|betterhelp|expressvpn|audible|link in the description|use code|discount code|promo code)\b", re.IGNORECASE),
            re.compile(r"\b(subscribe to my channel|subscribe to the channel|hit the bell|leave a like|comment down below|patreon\.com)\b", re.IGNORECASE),
            re.compile(r"\b(can you hear me|mic test|audio check|stream starting|be right back|brb|technical difficulties)\b", re.IGNORECASE)
        ]
        WEAK_START_REGEXES = [re.compile(r"^(so yeah|um|uh|and then|like i said|anyways|so basically|ok so)\b", re.IGNORECASE)]

        # Flexible target window (soft threshold rather than rigid hard clamp)
        min_dur = max(6.0, float(target_duration) * 0.4)
        max_dur = min(float(video_duration), float(target_duration) * 1.35 + 20.0)

        # Step 1: Identify high-potential candidate start indices
        # (Sentence starts, questions, hooks, or regular anchors every ~12s to guarantee full video coverage)
        total_segs = len(clean_segs)
        start_indices = set()
        last_anchor_time = -999.0

        for i in range(total_segs):
            seg = clean_segs[i]
            st = seg['start']
            txt = seg['text']

            if (st - last_anchor_time) >= 12.0:
                start_indices.add(i)
                last_anchor_time = st
                continue

            is_prev_sentence_end = (i == 0 or clean_segs[i - 1]['text'].strip().endswith(('.', '!', '?')))
            if is_prev_sentence_end:
                start_indices.add(i)
                continue

            if txt.strip().endswith('?') or any(hp.search(txt) for hp in HOOK_REGEXES):
                start_indices.add(i)

        sorted_starts = sorted(list(start_indices))

        # Step 2: For each start anchor, find best 1-2 sentence endings near target_duration
        candidates = []
        for i in sorted_starts:
            start_seg = clean_segs[i]
            st = start_seg['start']
            first_seg_txt = start_seg['text']

            base_score = 50.0
            base_hook_bonus = 0.0

            for hp in HOOK_REGEXES:
                if hp.search(first_seg_txt):
                    base_score += 35.0
                    base_hook_bonus += 8.0
                    break

            for ws in WEAK_START_REGEXES:
                if ws.search(first_seg_txt):
                    base_score -= 25.0
                    base_hook_bonus -= 10.0
                    break

            if first_seg_txt.strip().endswith('?'):
                base_score += 40.0
                base_hook_bonus += 10.0
            elif i > 0 and clean_segs[i - 1]['text'].strip().endswith('?'):
                base_score += 35.0
                base_hook_bonus += 8.0

            first_word = first_seg_txt.strip().lower().split()[0] if first_seg_txt.strip() else ''
            if first_word in {'he', 'she', 'they', 'them', 'him', 'her', 'it', 'this', 'that', 'these', 'those'}:
                base_score -= 25.0
                base_hook_bonus -= 6.0

            accumulated = []
            best_ends_for_start = []
            for j in range(i, min(total_segs, i + 100)):
                end_seg = clean_segs[j]
                cur_dur = end_seg['end'] - st
                accumulated.append(end_seg['text'])

                if cur_dur > max_dur:
                    break

                if cur_dur >= min_dur:
                    is_end = end_seg['text'].rstrip().endswith(('.', '!', '?'))
                    diff = abs(cur_dur - target_duration)
                    if is_end or diff <= 3.0 or j == total_segs - 1:
                        best_ends_for_start.append((diff, j, cur_dur, list(accumulated)))

            # Keep only the top 2 closest endpoints for this start
            best_ends_for_start.sort(key=lambda x: x[0])
            for _, j, cur_dur, acc in best_ends_for_start[:2]:
                full_txt = " ".join(acc)
                hook_txt = " ".join(acc[:min(3, len(acc))])

                score = base_score
                hook_bonus = base_hook_bonus

                if topic and topic.lower() in full_txt.lower():
                    score += 40.0

                if hook_bonus == 0.0:
                    for hp in HOOK_REGEXES:
                        if hp.search(hook_txt):
                            score += 20.0
                            hook_bonus += 4.0
                            break

                for rp in REACTION_REGEXES:
                    matches = len(rp.findall(full_txt))
                    score += min(20.0, matches * 6.0)

                words = full_txt.split()
                wpm = (len(words) / max(1.0, cur_dur)) * 60.0
                if 120 <= wpm <= 220:
                    score += 15.0
                elif wpm < 70:
                    score -= 30.0

                if full_txt.rstrip().endswith(('.', '!', '?')):
                    score += 10.0

                for bp in BAN_REGEXES:
                    if bp.search(full_txt):
                        score -= 80.0

                title_candidate = hook_txt.strip()[:45]
                if len(hook_txt) > 45:
                    title_candidate += "..."

                comp_score = int(min(99, max(60, score)))
                candidates.append({
                    'start': st,
                    'end': clean_segs[j]['end'],
                    'duration': cur_dur,
                    'virality_score': comp_score,
                    'title': title_candidate,
                    'hook_bonus': hook_bonus,
                    'wpm': wpm,
                    'hook_type': 'High Engagement Story',
                    'reason': f'High speech density ({int(wpm)} WPM) with complete narrative resolution',
                    'content_title': title_candidate,
                    'content_description': "Must-watch viral highlight! #shorts #viral #reels #trending"
                })

        candidates.sort(key=lambda x: x['virality_score'], reverse=True)

        selected = []
        for cand in candidates:
            if len(selected) >= n:
                break

            # Expand only candidates being actively considered for selection
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
                candidate_sub_scores = normalize_sub_scores(
                    raw_sub_scores=None,
                    overall_score=cand['virality_score'],
                    hook_bonus=cand.get('hook_bonus', 0.0),
                    wpm=cand.get('wpm', 140.0)
                )
                cand['sub_scores'] = candidate_sub_scores.to_dict()
                selected.append(cand)

        if len(selected) < n:
            step = max(5.0, (video_duration - target_duration) / max(1, n))
            for i in range(n):
                if len(selected) >= n:
                    break
                st = max(0.0, min(video_duration - target_duration, i * step))
                et_candidate = min(video_duration, st + target_duration)
                exp_st, exp_et = self._expand_to_complete_context(clean_segs, st, et_candidate, video_duration, target_duration=target_duration)
                fallback_score = max(65, 88 - (len(selected) * 4))
                fallback_sub = normalize_sub_scores(None, fallback_score)
                selected.append({
                    'start': exp_st,
                    'end': exp_et,
                    'duration': exp_et - exp_st,
                    'virality_score': fallback_score,
                    'sub_scores': fallback_sub.to_dict(),
                    'title': f'Chapter Highlight #{len(selected)+1}',
                    'hook_type': 'Story Reveal',
                    'reason': 'Engaging segment from video chapter',
                    'content_title': f"Highlight #{len(selected)+1}",
                    'content_description': "Check out this highlight! #shorts #viral"
                })

        selected.sort(key=lambda x: x['virality_score'], reverse=True)
        return selected[:n]

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
5. TARGET DURATION GUIDELINE (~{target_duration}s): Use ~{target_duration} seconds as a flexible guide capturing the complete unbroken story arc. Do not cut early or truncate the explanation.
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

            print(f"[AISelector] Selected top {n} complete narrative clips:")
            for i, clip in enumerate(validated_clips[:n], 1):
                print(f"  {i}. {clip['title']} (Score: {clip['virality_score']}pts, Duration: {clip['duration']:.1f}s)")
            
            return validated_clips[:n]
            
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
