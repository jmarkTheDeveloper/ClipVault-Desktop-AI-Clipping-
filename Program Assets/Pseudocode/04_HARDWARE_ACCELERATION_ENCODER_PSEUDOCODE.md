# Hardware Acceleration & Encoder Probing Pseudocode

## File: `engine/services/video_processor.py`

```python
FUNCTION detect_hardware_encoder():
    """
    Probes system silicon capabilities and returns the fastest stable video encoder,
    preset, and FFmpeg parameters available on the user's physical machine.
    """
    ffmpeg_binary = imageio_ffmpeg.get_ffmpeg_exe()
    
    // Default Fallback: Multi-threaded software CPU encoding
    cpu_threads = MIN(8, MAX(2, os.cpu_count() - 1))
    best_codec = 'libx264'
    best_preset = 'ultrafast'
    params = ['-pix_fmt', 'yuv420p', '-threads', str(cpu_threads), '-preset', 'ultrafast']
    
    // Hardware candidates in prioritized order of performance & power efficiency
    candidates = [
        {
            'name': 'Intel Arc / Core QuickSync (h264_qsv)',
            'codec': 'h264_qsv',
            'preset': 'veryfast',
            'test_args': ['-f', 'lavfi', '-i', 'nullsrc=s=1280x720:d=0.2', '-c:v', 'h264_qsv', '-f', 'null', '-'],
            'runtime_params': ['-pix_fmt', 'nv12', '-global_quality', '18', '-preset', 'veryfast']
        },
        {
            'name': 'NVIDIA NVENC Hardware Silicon (h264_nvenc)',
            'codec': 'h264_nvenc',
            'preset': 'p4',
            'test_args': ['-f', 'lavfi', '-i', 'nullsrc=s=1280x720:d=0.2', '-c:v', 'h264_nvenc', '-f', 'null', '-'],
            'runtime_params': ['-pix_fmt', 'yuv420p', '-cq', '19', '-rc', 'vbr', '-preset', 'p4']
        },
        {
            'name': 'AMD Radeon AMF Hardware Engine (h264_amf)',
            'codec': 'h264_amf',
            'preset': 'speed',
            'test_args': ['-f', 'lavfi', '-i', 'nullsrc=s=1280x720:d=0.2', '-c:v', 'h264_amf', '-f', 'null', '-'],
            'runtime_params': ['-pix_fmt', 'yuv420p', '-rc', 'cqp', '-qp_i', '18', '-qp_p', '18', '-quality', 'speed']
        }
    ]
    
    // TEST HARDWARE SILICON RESPONSIVENESS IN REAL TIME
    FOR candidate IN candidates:
        TRY:
            cmd = [ffmpeg_binary] + candidate.test_args
            // Suppress console popups on Windows with CREATE_NO_WINDOW
            process = subprocess.run(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                timeout=3.0,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            
            IF process.returncode == 0:
                PRINT("[Hardware Scanner] Activated Silicon Accelerator: " + candidate.name)
                RETURN candidate.codec, candidate.preset, candidate.runtime_params, cpu_threads
        EXCEPT Exception:
            // Candidate failed or timed out; continue probing next hardware engine
            CONTINUE
            
    PRINT("[Hardware Scanner] No dedicated hardware encoder responding. Active: libx264 Ultrafast CPU")
    RETURN best_codec, best_preset, params, cpu_threads
```
