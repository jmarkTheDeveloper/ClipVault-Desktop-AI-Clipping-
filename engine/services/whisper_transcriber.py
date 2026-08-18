from faster_whisper import WhisperModel
try:
    # pyrefly: ignore [missing-import]
    import torch
    HAS_CUDA = torch.cuda.is_available()
except Exception:
    HAS_CUDA = False
import os
from config import WHISPER_MODEL

class WhisperSingleton:
    """
    A singleton class for transcribing audio using the faster-whisper library.

    This class ensures that the Whisper model is loaded only once and provides
    a method to transcribe audio from a video file.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        """Loads the faster-whisper model with optimized settings."""
        if self._model is None:
            print(f"Loading faster-whisper model ({WHISPER_MODEL})... (one time only)")
            try:
                # Check if CUDA is available
                compute_type = "float16" if HAS_CUDA else "int8"
                device = "cuda" if HAS_CUDA else "cpu"
                
                # Set environment variable to reduce memory usage
                os.environ["OMP_NUM_THREADS"] = "1"
                
                # Load the model with optimized settings
                self._model = WhisperModel(
                    WHISPER_MODEL,
                    device=device,
                    compute_type=compute_type,
                    cpu_threads=4,  # Limit CPU threads to prevent overload
                    num_workers=1    # Single worker to prevent model duplicate RAM loading and thread thrashing
                )
                print(f"✅ faster-whisper model loaded and cached on: {device} with {compute_type} precision")
            except Exception as e:
                print(f"Error loading model, falling back to CPU with minimal settings: {e}")
                # Fallback with minimal resource usage
                self._model = WhisperModel(
                    WHISPER_MODEL,
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=2,
                    num_workers=1
                )


    def transcribe(self, video_path, language=None):
        """
        Transcribes the audio from a video file.

        Args:
            video_path (str): The path to the video file.
            language (str, optional): Language code to force transcription.

        Returns:
            tuple: A tuple containing a list of words with timestamps, the full
                   transcript, and a list of segments.
        """
        print("🎵 Transcribing video...")
        try:
            lang_label = f"forcing language '{language}'" if language else "auto-detecting language"
            print(f"⏳ Initializing transcription with faster-whisper ({lang_label})...")
            segments, info = self._model.transcribe(
                str(video_path), 
                word_timestamps=True,
                vad_filter=True,  # Voice activity detection to skip silence
                vad_parameters={"min_silence_duration_ms": 500},  # Adjust silence detection
                beam_size=1,  # Reduce beam size for faster processing
                best_of=1,    # Only keep the best result
                temperature=0,  # Disable sampling for deterministic results
                language=language
            )
            print(f"✅ Audio processing complete. Detected language: {info.language} (probability: {info.language_probability:.2f})")
            
            # Process segments and words
            words = []
            segments_list = []
            full_text = ""
            
            segment_count = 0
            word_count = 0
            
            print("⏳ Processing transcription segments...")
            for segment in segments:
                segment_count += 1
                if segment_count % 10 == 0:
                    print(f"⏳ Processed {segment_count} segments so far...")
                    
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
                        word = word_info.word.strip().upper()
                        if word:
                            words.append({
                                'word': word, 
                                'start': word_info.start, 
                                'end': word_info.end
                            })
                            word_count += 1
            
            print(f"✅ Transcription complete! Found {len(words)} words in {len(segments_list)} segments")
            print(f"📝 Transcript length: {len(full_text)} characters")
            return words, full_text, segments_list

        except Exception as e:
            print(f"❌ Transcription failed: {e}")
            return [], "", []
