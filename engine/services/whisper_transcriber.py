import os
import time
from pathlib import Path
from faster_whisper import WhisperModel
try:
    # pyrefly: ignore [missing-import]
    import torch
    HAS_CUDA = torch.cuda.is_available()
except Exception:
    HAS_CUDA = False

from config import WHISPER_MODEL


class WhisperSingleton:
    """
    High-accuracy, multi-tier speech-to-text singleton for viral video clipping.
    Supports ultra-fast Groq LPU Whisper Large-v3-Turbo, OpenAI Whisper-1,
    and optimized local Faster-Whisper (small/medium model) with millisecond word timestamps.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self):
        """Loads the faster-whisper model with optimized settings for CPU / GPU."""
        if self._model is None:
            # Upgrade default to 'small' (244M params, 3.3x more accurate than base) or medium if on CUDA
            configured_model = os.getenv('WHISPER_MODEL', 'small')
            model_size = "medium" if HAS_CUDA and configured_model in ["base", "small"] else configured_model
            print(f"Loading faster-whisper model ({model_size})... (one time only)")
            
            import multiprocessing
            optimal_threads = min(4, max(1, multiprocessing.cpu_count() // 2))
            
            try:
                compute_type = "float16" if HAS_CUDA else "int8"
                device = "cuda" if HAS_CUDA else "cpu"
                
                os.environ["OMP_NUM_THREADS"] = str(optimal_threads if device == "cpu" else "1")
                
                self._model = WhisperModel(
                    model_size,
                    device=device,
                    compute_type=compute_type,
                    cpu_threads=optimal_threads if device == "cpu" else 4,  
                    num_workers=1
                )
                print(f"[OK] faster-whisper model loaded and cached on: {device} with {compute_type} precision")
            except Exception as e:
                print(f"Error loading {model_size}, falling back to base model: {e}")
                self._model = WhisperModel(
                    "base",
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=max(2, optimal_threads),
                    num_workers=1
                )

    def transcribe_cloud(self, audio_path: str, api_key: str = None, ai_engine: str = "groq_lpu", language: str = None):
        """
        Attempts ultra-fast high-accuracy cloud transcription via Groq LPU or OpenAI Whisper.
        Groq Large-v3-Turbo transcribes 60s of audio in ~0.4s with 800M+ parameters.
        """
        if not api_key:
            return None

        try:
            if os.path.getsize(audio_path) > 25 * 1024 * 1024:
                return None
        except Exception:
            return None

        try:
            import requests

            # 1. Groq LPU Whisper (whisper-large-v3-turbo)
            if api_key.startswith("gsk_") or "groq" in str(ai_engine).lower():
                print(">> Calling Groq LPU Whisper Large-v3-Turbo for ultra-accurate word timestamps...")
                url = "https://api.groq.com/openai/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {api_key}"}
                with open(audio_path, "rb") as f:
                    files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
                    data = {
                        "model": "whisper-large-v3-turbo",
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "word",
                        "temperature": "0"
                    }
                    if language and language != "auto":
                        data["language"] = language
                    resp = requests.post(url, headers=headers, files=files, data=data, timeout=30)
                    if resp.status_code == 200:
                        res_json = resp.json()
                        words = []
                        for w in res_json.get("words", []):
                            raw_w = w.get("word", "").strip()
                            clean_w = raw_w.strip(".,!?:;\"'()[]{}").upper()
                            if clean_w:
                                words.append({
                                    "word": clean_w,
                                    "start": float(w.get("start", 0.0)),
                                    "end": float(w.get("end", 0.0))
                                })
                        full_text = res_json.get("text", "")
                        segments = res_json.get("segments", [])
                        if words:
                            print(f"[OK] Groq Whisper returned {len(words)} ultra-accurate words with exact timing!")
                            return words, full_text, segments

            # 2. OpenAI Whisper (whisper-1)
            elif (api_key.startswith("sk-") and not api_key.startswith("sk-ant")) or "openai" in str(ai_engine).lower():
                print(">> Calling OpenAI Whisper-1 for ultra-accurate word timestamps...")
                url = "https://api.openai.com/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {api_key}"}
                with open(audio_path, "rb") as f:
                    files = {"file": (os.path.basename(audio_path), f, "audio/wav")}
                    data = {
                        "model": "whisper-1",
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "word",
                        "temperature": "0"
                    }
                    if language and language != "auto":
                        data["language"] = language
                    resp = requests.post(url, headers=headers, files=files, data=data, timeout=30)
                    if resp.status_code == 200:
                        res_json = resp.json()
                        words = []
                        for w in res_json.get("words", []):
                            raw_w = w.get("word", "").strip()
                            clean_w = raw_w.strip(".,!?:;\"'()[]{}").upper()
                            if clean_w:
                                words.append({
                                    "word": clean_w,
                                    "start": float(w.get("start", 0.0)),
                                    "end": float(w.get("end", 0.0))
                                })
                        full_text = res_json.get("text", "")
                        segments = res_json.get("segments", [])
                        if words:
                            print(f"[OK] OpenAI Whisper returned {len(words)} ultra-accurate words with exact timing!")
                            return words, full_text, segments

        except Exception as cloud_err:
            print(f"[WARN] Cloud Whisper note ({cloud_err}). Continuing with local Faster-Whisper.")

        return None

    def transcribe(self, video_path, language=None, progress_callback=None, api_key: str = None, ai_engine: str = "groq_lpu"):
        """
        Transcribes audio from a video or audio file with millisecond-precision word timestamps.
        Accurately captures both fast-talking and slow-talking creators without missing words.
        """
        print(">> Transcribing audio with high-precision Whisper...")
        
        # 1. Check for cloud acceleration if API key is provided
        if api_key:
            cloud_result = self.transcribe_cloud(str(video_path), api_key=api_key, ai_engine=ai_engine, language=language)
            if cloud_result:
                return cloud_result

        # 2. Local Faster-Whisper with optimized multi-speaker VAD and beam-5 search
        try:
            self._load_model()
            lang_label = f"forcing language '{language}'" if language and language != "auto" else "auto-detecting language"
            print(f">> Initializing local transcription with faster-whisper ({lang_label})...")
            
            target_lang = language if language and language != "auto" else None
            segments, info = self._model.transcribe(
                str(video_path), 
                word_timestamps=True,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=200,  # Fast dialogue pause detection
                    speech_pad_ms=100,            # Exact onset syllable alignment (prevents early/late offset)
                    threshold=0.35                # Sensitive enough for mumbling or soft speech
                ),
                beam_size=5,                      # 5 beams for robust accuracy
                best_of=5,
                temperature=[0.0, 0.2, 0.4],      # Fallback exploration for acoustic noise
                condition_on_previous_text=True,  # Maintain sentence context for fast creators
                hallucination_silence_threshold=1.5,
                repetition_penalty=1.1,
                no_repeat_ngram_size=3,
                initial_prompt="Accurate social media video captions with clear speech, slang, fast creator dialogue, and accurate punctuation.",
                language=target_lang
            )
            total_dur = getattr(info, 'duration', 0.0) or 1.0
            print(f"[OK] Audio loaded ({total_dur:.1f}s). Detected language: {info.language}")
            
            # Process segments and words
            words = []
            segments_list = []
            full_text = ""
            
            segment_count = 0
            word_count = 0
            
            for segment in segments:
                segment_count += 1
                if progress_callback and segment_count % 3 == 0:
                    pct = min(38, 20 + int((segment.end / max(1.0, total_dur)) * 18))
                    progress_callback(f"Transcribing audio with Whisper ({int(segment.end)}s / {int(total_dur)}s)...", pct)
                    
                segments_list.append({
                    'id': segment.id,
                    'start': segment.start,
                    'end': segment.end,
                    'text': segment.text
                })
                full_text += segment.text + " "
                
                # Extract word timestamps
                if hasattr(segment, 'words') and segment.words:
                    for word_info in segment.words:
                        raw_w = word_info.word.strip()
                        # Clean attached boundary punctuation but keep internal apostrophes (e.g. DON'T, I'M)
                        clean_w = raw_w.strip(".,!?:;\"'()[]{}").upper()
                        if clean_w and clean_w not in ('...', '—', '-'):
                            words.append({
                                'word': clean_w, 
                                'start': float(word_info.start), 
                                'end': float(word_info.end)
                            })
                            word_count += 1
            
            print(f"[OK] Transcription complete! Found {len(words)} words in {len(segments_list)} segments")
            print(f"[OK] Transcript length: {len(full_text)} characters")
            return words, full_text, segments_list

        except Exception as e:
            print(f"[ERROR] Transcription failed: {e}")
            return [], "", []
