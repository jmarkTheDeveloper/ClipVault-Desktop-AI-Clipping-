import os
import re
import json
from typing import Optional, List, Dict, Any, Tuple
from pathlib import Path

from config import GEMINI_API_KEY
from services.youtube_downloader_yt_dlp import YouTubeDownloader
from services.ai_selector import AISelector

def format_sec_to_stamp(seconds: float) -> str:
    """Formats seconds into MM:SS or HH:MM:SS string."""
    seconds = max(0.0, float(seconds))
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"

def parse_stamp_to_sec(stamp: str) -> float:
    """Parses MM:SS or HH:MM:SS string into seconds float."""
    try:
        parts = [float(p.strip()) for p in str(stamp).strip().split(":")]
        if len(parts) == 3:
            return parts[0] * 3600.0 + parts[1] * 60.0 + parts[2]
        elif len(parts) == 2:
            return parts[0] * 60.0 + parts[1]
        elif len(parts) == 1:
            return parts[0]
    except Exception:
        pass
    return 0.0

class VideoQAService:
    """
    Ask Studio AI Video Assistant Service.
    Enables creators to ask questions about long videos, extract interesting moments,
    summarize chapters, and seek / clip directly from natural language prompts.
    """
    _transcript_cache: Dict[str, Tuple[List[Dict], str, List[Dict]]] = {}

    @classmethod
    def get_transcript(cls, url: Optional[str] = None, local_path: Optional[str] = None, language: str = "en") -> Optional[Tuple[List[Dict], str, List[Dict]]]:
        cache_key = (url or local_path or "").strip()
        if not cache_key:
            return None
        
        if cache_key in cls._transcript_cache:
            return cls._transcript_cache[cache_key]

        # 1. YouTube instant native subtitle extraction (0.5s)
        if url and ("youtube.com" in url or "youtu.be" in url):
            try:
                downloader = YouTubeDownloader()
                subs = downloader.get_native_subtitles(url, language=language or "en")
                if subs:
                    cls._transcript_cache[cache_key] = subs
                    return subs
            except Exception as e:
                print(f"[VideoQAService] YouTube native subtitle notice: {e}")

        # 2. Local video file transcription using Whisper
        target_media = local_path or url
        if target_media and os.path.exists(target_media):
            try:
                from services.whisper_transcriber import WhisperSingleton
                transcriber = WhisperSingleton()
                words, full_text, segments = transcriber.transcribe(str(target_media), language=language or "en")
                if segments:
                    subs = (words, full_text, segments)
                    cls._transcript_cache[cache_key] = subs
                    return subs
            except Exception as e:
                print(f"[VideoQAService] Whisper transcription notice: {e}")

        return None

    @classmethod
    def ask_video(cls, question: str, url: Optional[str] = None, local_path: Optional[str] = None, api_key: Optional[str] = None, ai_engine: Optional[str] = "gemini", language: str = "en") -> Dict[str, Any]:
        """
        Processes a user question about a video transcript and returns a conversational answer
        with interactive timestamped moments.
        """
        clean_q = (question or "").strip()
        if not clean_q:
            return {
                "status": "error",
                "answer": "Please ask a question or select a suggestion chip.",
                "moments": []
            }

        # Step 1: Retrieve Transcript
        subs = cls.get_transcript(url=url, local_path=local_path, language=language)
        if not subs:
            return {
                "status": "error",
                "answer": "Could not retrieve dialogue transcript for this video. If it is a YouTube video, ensure subtitles/captions are available, or wait for local audio processing.",
                "moments": []
            }

        words, full_text, segments = subs
        if not segments:
            return {
                "status": "error",
                "answer": "No spoken dialogue was detected in this video to answer questions from.",
                "moments": []
            }

        # Step 2: Format dialogue into clean timestamped blocks
        formatted_dialogue = cls._format_dialogue_for_llm(segments)

        # Step 3: Check if LLM API key is available
        eff_api_key = api_key or GEMINI_API_KEY
        has_api_key = bool(eff_api_key and eff_api_key not in ["YOUR_API_KEY_HERE", "demo", "null", "undefined", ""])

        if has_api_key:
            try:
                selector = AISelector(api_key=eff_api_key, provider=ai_engine or "gemini")
                system_prompt = f"""You are "Ask Studio", an ultra-smart AI assistant for video creators inside ClipVault (inspired by YouTube Studio Gemini).
The creator is reviewing this video and asking questions about its contents, moments, topics, and timestamps.

USER QUESTION:
"{clean_q}"

VIDEO DIALOGUE TRANSCRIPT WITH TIMESTAMPS:
{formatted_dialogue}

INSTRUCTIONS:
1. Answer the creator's question directly, clearly, engagingly, and concisely.
2. Whenever you reference specific moments, topics, or clips, YOU MUST format timestamps strictly as [MM:SS - MM:SS] or [HH:MM:SS - HH:MM:SS] (or single timestamp [MM:SS]).
3. If recommending interesting, funny, or viral clips:
   - Provide the exact start and end timestamps.
   - Give each moment a punchy title and 1-2 sentence explanation of why it's worth watching or clipping.
4. At the very end of your response, output a valid JSON code block enclosed in ```json and ``` with a "moments" list containing all highlighted moments so the user can click to seek or clip them:
```json
{{
  "moments": [
    {{
      "start": 845.0,
      "end": 915.0,
      "label": "14:05 - 15:15",
      "title": "Catchy Moment Title",
      "reason": "Why this moment is interesting or relevant to the question"
    }}
  ]
}}
```
"""
                response = selector._generate_with_fallback(system_prompt)
                raw_text = getattr(response, "text", str(response)).strip()

                answer_text, moments = cls._parse_llm_response(raw_text, segments)
                return {
                    "status": "ok",
                    "answer": answer_text,
                    "moments": moments
                }

            except Exception as llm_err:
                print(f"[VideoQAService] LLM call notice: {llm_err}. Using smart NLP fallback...")

        # Step 4: NLP Heuristic Fallback
        return cls._heuristic_qa(clean_q, segments, full_text)

    @classmethod
    def _format_dialogue_for_llm(cls, segments: List[Dict], max_chars: int = 150000) -> str:
        """
        Groups continuous segments into coherent timestamped dialogue blocks.
        """
        lines = []
        cur_start = None
        cur_end = None
        cur_texts = []

        for seg in segments:
            st = float(seg.get('start', 0.0))
            et = float(seg.get('end', st + 2.0))
            txt = seg.get('text', '').strip()
            if not txt:
                continue

            if cur_start is None:
                cur_start = st
                cur_end = et
                cur_texts = [txt]
            elif (st - cur_end) <= 2.5 and (et - cur_start) <= 30.0:
                cur_end = et
                cur_texts.append(txt)
            else:
                stamp = f"[{format_sec_to_stamp(cur_start)} - {format_sec_to_stamp(cur_end)}]"
                lines.append(f"{stamp}: {' '.join(cur_texts)}")
                cur_start = st
                cur_end = et
                cur_texts = [txt]

        if cur_texts and cur_start is not None:
            stamp = f"[{format_sec_to_stamp(cur_start)} - {format_sec_to_stamp(cur_end)}]"
            lines.append(f"{stamp}: {' '.join(cur_texts)}")

        full = "\n".join(lines)
        if len(full) > max_chars:
            # Sample evenly if transcript is gigantic
            stride = len(lines) // 500 + 1
            full = "\n".join(lines[::stride])
        return full

    @classmethod
    def _parse_llm_response(cls, raw_text: str, segments: List[Dict]) -> Tuple[str, List[Dict]]:
        """
        Splits LLM response into markdown conversational text and structured moments list.
        """
        moments = []
        answer_text = raw_text

        # 1. Check for fenced code block ```json ... ```
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, re.DOTALL)
        json_str = None
        if json_match:
            json_str = json_match.group(1)
            answer_text = (raw_text[:json_match.start()].strip() + "\n" + raw_text[json_match.end():].strip()).strip()
        elif raw_text.strip().startswith("{") and "moments" in raw_text:
            json_str = raw_text.strip()
            answer_text = ""

        if json_str:
            try:
                data = json.loads(json_str)
                if isinstance(data, dict) and "moments" in data:
                    for m in data["moments"]:
                        if isinstance(m, dict):
                            st = float(m.get('start', 0.0))
                            et = float(m.get('end', st + 45.0))
                            if et <= st:
                                et = st + 45.0
                            label = m.get('label') or f"{format_sec_to_stamp(st)} - {format_sec_to_stamp(et)}"
                            moments.append({
                                "start": round(st, 1),
                                "end": round(et, 1),
                                "label": label,
                                "title": str(m.get('title', 'Highlighted Moment')),
                                "reason": str(m.get('reason', ''))
                            })
            except Exception as parse_err:
                print(f"[VideoQAService] JSON parse note: {parse_err}. Extracting moments with resilient pattern matching...")
                obj_matches = re.finditer(r'\{[^{}]*?"start"\s*:\s*([\d\.]+)[^{}]*?\}', json_str, re.DOTALL)
                for om in obj_matches:
                    obj_str = om.group(0)
                    st_m = re.search(r'"start"\s*:\s*([\d\.]+)', obj_str)
                    et_m = re.search(r'"end"\s*:\s*([\d\.]+)', obj_str)
                    ti_m = re.search(r'"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', obj_str)
                    re_m = re.search(r'"reason"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', obj_str)
                    if st_m:
                        st = float(st_m.group(1))
                        et = float(et_m.group(1)) if et_m else st + 50.0
                        title_val = ti_m.group(1).replace('\\"', '"') if ti_m else f"Key Moment ({format_sec_to_stamp(st)})"
                        reason_val = re_m.group(1).replace('\\"', '"') if re_m else ""
                        moments.append({
                            "start": round(st, 1),
                            "end": round(et, 1),
                            "label": f"{format_sec_to_stamp(st)} - {format_sec_to_stamp(et)}",
                            "title": title_val,
                            "reason": reason_val
                        })

        # If answer_text is empty or pure JSON, format a conversational markdown response from the moments
        if (not answer_text or answer_text.startswith("{")) and moments:
            lines = ["Here are the most compelling timestamped moments I found in this video:\n"]
            for m in moments:
                lines.append(f"- **[{m['label']}] {m['title']}**\n  {m['reason']}")
            lines.append("\n*Tip: Click any timestamp to jump the video player, or click **Set as Clip** to pin it to your timeline.*")
            answer_text = "\n".join(lines)

        # 2. If no JSON moments parsed, extract bracketed timestamps from prose e.g. [14:22 - 15:45] or [05:12]
        if not moments:
            ts_matches = re.finditer(r'\[(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*-\s*(\d{1,2}:\d{2}(?::\d{2})?))?\]', raw_text)
            for tm in ts_matches:
                start_str = tm.group(1)
                end_str = tm.group(2)
                st = parse_stamp_to_sec(start_str)
                et = parse_stamp_to_sec(end_str) if end_str else st + 50.0
                if et <= st:
                    et = st + 50.0
                label = f"{format_sec_to_stamp(st)} - {format_sec_to_stamp(et)}"
                moments.append({
                    "start": round(st, 1),
                    "end": round(et, 1),
                    "label": label,
                    "title": f"Moment at {format_sec_to_stamp(st)}",
                    "reason": "Referenced in AI response"
                })

        return answer_text.strip(), moments

    @classmethod
    def _heuristic_qa(cls, question: str, segments: List[Dict], full_text: str) -> Dict[str, Any]:
        """
        Intelligent local semantic fallback when LLM API keys are not yet configured.
        Searches transcript for key topics, question anchors, and viral peaks.
        """
        q_lower = question.lower()
        is_summary = any(k in q_lower for k in ['summarize', 'summary', 'overview', 'what is this video', 'about', 'topics'])
        
        words = re.findall(r'\b[a-zA-Z0-9_\'-]+\b', q_lower)
        stopwords = {'the', 'and', 'for', 'that', 'this', 'with', 'about', 'from', 'they', 'what', 'when', 'where', 'who', 'how', 'why', 'have', 'were', 'been', 'their', 'there', 'give', 'timestamps', 'video', 'talked', 'talking', 'summarize', 'summary', 'overview', 'tell', 'show', 'most', 'interesting', 'things'}
        keywords = [w for w in words if w not in stopwords and len(w) > 2]

        matched_blocks = []
        if is_summary and not keywords:
            # Sample 4 landmark chapter points across video timeline
            total_segs = len(segments)
            checkpoints = [int(total_segs * frac) for frac in [0.08, 0.32, 0.60, 0.85]]
            for cp in checkpoints:
                sub_segs = segments[cp:cp + 6]
                if sub_segs:
                    b_text = " ".join(s.get('text', '') for s in sub_segs)
                    st = float(sub_segs[0].get('start', 0.0))
                    et = float(sub_segs[-1].get('end', st + 50.0))
                    matched_blocks.append({
                        "start": st,
                        "end": et,
                        "score": 50.0,
                        "text": b_text
                    })
        else:
            # Scan for best matching segment blocks
            block_size = 5
            for i in range(0, len(segments) - block_size, 3):
                sub_segs = segments[i:i + block_size]
                b_text = " ".join(s.get('text', '') for s in sub_segs)
                b_text_lower = b_text.lower()
                st = float(sub_segs[0].get('start', 0.0))
                et = float(sub_segs[-1].get('end', st + 45.0))

                score = 0.0
                if keywords:
                    for kw in keywords:
                        if kw in b_text_lower:
                            score += 25.0
                else:
                    if any(k in b_text_lower for k in ['insane', 'crazy', 'secret', 'never', 'shocking', 'truth', 'future', 'why', 'how', 'impossible', 'story', 'remember']):
                        score += 20.0
                    if "?" in b_text:
                        score += 15.0

                if score > 0:
                    matched_blocks.append({
                        "start": st,
                        "end": et,
                        "score": score,
                        "text": b_text
                    })

            matched_blocks.sort(key=lambda x: x['score'], reverse=True)

        top_blocks = matched_blocks[:4]

        moments = []
        for b in top_blocks:
            st = round(b['start'], 1)
            et = round(min(b['end'], st + 60.0), 1)
            snippet = b['text'][:80].strip() + "..."
            moments.append({
                "start": st,
                "end": et,
                "label": f"{format_sec_to_stamp(st)} - {format_sec_to_stamp(et)}",
                "title": f"Key Discussion ({format_sec_to_stamp(st)})",
                "reason": f"\"{snippet}\""
            })

        if moments:
            reply_lines = [
                f"Here are key moments matching your query: **\"{question}\"**\n",
            ]
            for m in moments:
                reply_lines.append(f"- **[{m['label']}]** {m['title']}: {m['reason']}")
            reply_lines.append("\n*Tip: Click any timestamp to jump the video player, or click **Set as Clip** to pin it to your timeline.*")
            answer = "\n".join(reply_lines)
        else:
            answer = f"I scanned the transcript, but couldn't find a direct mention matching \"{question}\". Try asking about another topic or click one of the suggested prompts!"

        return {
            "status": "ok",
            "answer": answer,
            "moments": moments
        }
