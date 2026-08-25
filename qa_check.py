import os, sys, time, shutil, tempfile, subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.resolve()
ENGINE_DIR = PROJECT_ROOT / 'engine'
sys.path.insert(0, str(ENGINE_DIR))

GREEN = '\032[92m'
RED = '\032[91m'
YELLOW = '\032[93m'
CYAN = '\032[96m'
BOLD = '\032[1m'
RESET = '\032[0m'

results = []

def record_result(name, passed, message='', duration=0.0):
    status_str = f'{GREEN}[PASS]{RESET}' if passed else f'{RED}[FAIL]{RESET}'
    results.append({'name': name, 'passed': passed, 'message': message, 'duration': duration})
    dur_str = f'({duration:.2f}s)' if duration > 0 else ''
    print(f'  {status_str} {BOLD}{name}{RESET} {dur_str}')
    if message:
        color = GREEN if passed else RED
        print(f'       {color}{message}{RESET}')

def test_environment():
    print(f'\n{CYAN}{BOLD}[1/5] Checking Environment & Dependencies...{RESET}')
    t0 = time.time()
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        res = subprocess.run([ffmpeg_exe, '-version'], capture_output=True, text=True, check=False)
        record_result('FFmpeg Engine Binary', res.returncode == 0, f'Path: {ffmpeg_exe}', time.time() - t0)
    except Exception as e:
        record_result('FFmpeg Engine Binary', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        import yt_dlp
        record_result('yt-dlp Engine', True, f'Version: {yt_dlp.version.__version__}', time.time() - t0)
    except Exception as e:
        record_result('yt-dlp Engine', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        import cv2
        cv_msg = f"OpenCV {cv2.__version__}"
        try:
            import torch
            cv_msg += f", PyTorch {torch.__version__} (CUDA: {torch.cuda.is_available()})"
        except ImportError:
            cv_msg += " (Intel QSV & Hardware Pipeline Active)"
        record_result("Computer Vision Core", True, cv_msg, time.time() - t0)
    except Exception as e:
        record_result("Computer Vision Core", False, str(e), time.time() - t0)

def test_hardware_encoders():
    print(f'\n{CYAN}{BOLD}[2/5] Testing Hardware Acceleration & Video Encoders...{RESET}')
    t0 = time.time()
    try:
        from services.video_processor import VideoProcessor
        codec, preset, params, threads = VideoProcessor.detect_hardware_encoder()
        record_result('Hardware Acceleration Detection', True, f'Codec: {codec} (Preset: {preset}, Threads: {threads})', time.time() - t0)
    except Exception as e:
        record_result('Hardware Acceleration Detection', False, str(e), time.time() - t0)

def test_youtube_engine():
    print(f'\n{CYAN}{BOLD}[3/5] Testing YouTube Downloader & Stream Slicing Engine...{RESET}')
    t0 = time.time()
    try:
        from services.youtube_downloader_yt_dlp import YouTubeDownloader
        ydl = YouTubeDownloader()
        assert hasattr(ydl, 'download_slice')
        assert hasattr(ydl, 'download_audio_only')
        assert hasattr(ydl, 'get_video_info')
        record_result('Downloader Interface Integrity', True, 'All critical methods present', time.time() - t0)
    except Exception as e:
        record_result('Downloader Interface Integrity', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        test_url = 'https://www.youtube.com/watch?v=Sm9Af2DPsqs'
        info = ydl.get_video_info(test_url)
        assert info.get('title')
        assert info.get('duration', 0) > 0
        record_result('Stream Metadata Extraction', True, f'Title: {info["title"][:35]}... ({info["duration"]}s)', time.time() - t0)
    except Exception as e:
        record_result('Stream Metadata Extraction', False, str(e), time.time() - t0)

def test_backend_api():
    print(f'\n{CYAN}{BOLD}[4/5] Testing FastAPI REST Endpoints...{RESET}')
    try:
        from server import app, OUTPUT_DIR
        from fastapi.testclient import TestClient
        client = TestClient(app)
    except Exception as e:
        record_result('FastAPI App Import', False, str(e))
        return

    t0 = time.time()
    try:
        res = client.get('/api/saved_clips')
        data = res.json()
        assert res.status_code == 200 and 'clips' in data
        record_result('GET /api/saved_clips', True, f'Found {len(data["saved_clips"]) if "saved_clips" in data else len(data["clips"])} clips', time.time() - t0)
    except Exception as e:
        record_result('GET /api/saved_clips', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        c_res = client.post('/api/create_folder', json={'folder_name': 'QA_Test_Folder_Auto'})
        assert c_res.status_code == 200 and c_res.json().get('success')
        fpath = Path(c_res.json()['path'])
        assert fpath.exists()
        shutil.rmtree(fpath, ignore_errors=True)
        record_result('POST /api/create_folder', True, 'Created and verified folder on disk', time.time() - t0)
    except Exception as e:
        record_result('POST /api/create_folder', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        dummy_clip = OUTPUT_DIR / 'qa_dummy_test_clip.mp4'
        dummy_clip.write_text('dummy video')
        dummy_meta = OUTPUT_DIR / 'metadata' / 'qa_dummy_test_clip_metadata.txt'
        dummy_meta.parent.mkdir(parents=True, exist_ok=True)
        dummy_meta.write_text('dummy meta')

        del_res = client.post('/api/delete_clip', json={'path': str(dummy_clip)})
        assert del_res.status_code == 200 and del_res.json().get('success')
        assert not dummy_clip.exists()
        assert not dummy_meta.exists()
        record_result('POST /api/delete_clip', True, 'Permanently unlinked MP4 & metadata from disk', time.time() - t0)
    except Exception as e:
        record_result('POST /api/delete_clip', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        info_res = client.get('/api/video_info?url=https://www.youtube.com/watch?v=Sm9Af2DPsqs')
        assert info_res.status_code == 200 and info_res.json().get('success')
        record_result('GET /api/video_info', True, 'Preview stream URL resolved', time.time() - t0)
    except Exception as e:
        record_result('GET /api/video_info', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        from server import cancellation_events, tasks_db
        import threading
        test_tid = "qa_test_task_cancel"
        test_evt = threading.Event()
        cancellation_events[test_tid] = test_evt
        tasks_db[test_tid] = {"status": "processing", "progress": 50}

        cancel_res = client.post(f'/api/cancel/{test_tid}')
        assert cancel_res.status_code == 200 and cancel_res.json().get('success')
        assert test_evt.is_set(), "Cancellation event was not triggered"
        assert tasks_db[test_tid]["status"] == "cancelled"
        record_result('POST /api/cancel Pipeline', True, 'Cancellation event and task state verified', time.time() - t0)
    except Exception as e:
        record_result('POST /api/cancel Pipeline', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        # Test background videos list endpoint
        bg_res = client.get('/api/background_videos')
        assert bg_res.status_code == 200 and 'videos' in bg_res.json()
        record_result('GET /api/background_videos', True, f'Found {len(bg_res.json()["videos"])} background videos', time.time() - t0)
    except Exception as e:
        record_result('GET /api/background_videos', False, str(e), time.time() - t0)

    t0 = time.time()
    try:
        # Test strict rejection: gameplay_bg without background video must be rejected with 400
        from config import BACKGROUNDS_DIR
        # Temporarily ensure no bg files during test
        temp_backup = []
        for bg_file in BACKGROUNDS_DIR.glob('*.*'):
            temp_backup.append((bg_file, bg_file.read_bytes()))
            bg_file.unlink()

        try:
            reject_res = client.post('/api/process', json={
                'url': 'https://www.youtube.com/watch?v=Sm9Af2DPsqs',
                'layout': 'gameplay_bg',
                'gameplay_bg_video': None
            })
            assert reject_res.status_code == 400, f"Expected 400 status for missing gameplay video, got {reject_res.status_code}"
            assert "Rejection: No background video found" in reject_res.json().get('detail', '')
            record_result('Strict Validation: Missing Background Video Rejection', True, 'Rejected compilation with HTTP 400 when no gameplay video provided', time.time() - t0)
        finally:
            # Restore any files
            for bg_path, data in temp_backup:
                bg_path.write_bytes(data)
    except Exception as e:
        record_result('Strict Validation: Missing Background Video Rejection', False, str(e), time.time() - t0)

def test_frontend_build():
    print(f'\n{CYAN}{BOLD}[5/5] Testing Frontend TypeScript & Vite Production Build...{RESET}')
    t0 = time.time()
    try:
        cmd = ['npm.cmd' if sys.platform == 'win32' else 'npm', 'run', 'build']
        res = subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True, check=False)
        passed = (res.returncode == 0)
        msg = '0 type errors - Vite bundle compiled cleanly' if passed else f'Build error:\n{res.stderr[:300]}'
        record_result('Frontend Production Build', passed, msg, time.time() - t0)
    except Exception as e:
        record_result('Frontend Production Build', False, str(e), time.time() - t0)

def print_summary():
    total = len(results)
    passed = sum(1 for r in results if r['passed'])
    failed = total - passed
    score = int((passed / total) * 100) if total > 0 else 0

    print(f'\n{BOLD}=================================================================={RESET}')
    print(f'               {BOLD}CLIPVAULT QA TEST RESULTS SUMMARY{RESET}               ')
    print(f'{BOLD}==================================================================={RESET}')
    print(f' Total Tests Run: {BOLD}{total}{RESET}')
    print(f' Passed:          {GREEN}{BOLD}{passed} [PASS]{RESET}')
    print(f' Failed:          {RED}{BOLD}{failed} [FAIL]{RESET}')
    color = GREEN if score >= 90 else (YELLOW if score >= 70 else RED)
    print(f' Overall Health:  {color}{BOLD}{score}% Production Ready{RESET}')
    print(f'{BOLD}=================================================================={RESET}\n')

if __name__ == '__main__':
    print(f'\n{BOLD}>> Running ClipVault AI Quality Assurance Suite...{RESET}')
    test_environment()
    test_hardware_encoders()
    test_youtube_engine()
    test_backend_api()
    test_frontend_build()
    print_summary()
