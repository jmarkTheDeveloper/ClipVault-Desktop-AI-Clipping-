# -*- mode: python ; coding: utf-8 -*-
# ClipVault AI - Python Backend PyInstaller Spec
# Bundles: FastAPI + uvicorn + server.py + all services into engine_server.exe
#
# DATA POLICY
# -----------
# `datas` carries genuine non-Python *data* only (fonts, face-detection models,
# bundled background music). Python source is NEVER shipped as data: with
# pathex=[engine] the whole import graph (config.py, services/*, styles/*,
# utils/* -- all PEP 420 namespace packages) is compiled into the PYZ archive.
# Previously `engine/services` was copied in as datas, which embedded readable
# .py source in the shipped binary -- including
# engine/services/video_qa_service.py, which contains a hard-coded Google API
# key. Verified with PyInstaller 6.22.2 modulegraph that all of those modules
# resolve from the import graph without any datas entry.

import os
import sys
from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_submodules

datas = []
binaries = []
hiddenimports = []

# Packages that must be collected in full (Python modules, data files, native
# DLLs, model weights). A missing package used to be swallowed by a bare
# `except Exception: pass`, so a build machine without mediapipe / faster_whisper
# / ctranslate2 / cv2 silently produced an exe with the entire AI stack missing.
# Failures are now loud but still non-fatal: the build completes and reports
# exactly which packages are absent.
COLLECT_PACKAGES = [
    'mediapipe',
    'faster_whisper',
    'moviepy',
    'ctranslate2',
    'imageio_ffmpeg',
    'cv2',
    'yt_dlp',
]

_collect_failures = []
for pkg in COLLECT_PACKAGES:
    try:
        d, b, h = collect_all(pkg)
        datas += d
        binaries += b
        hiddenimports += h
    except Exception as exc:
        _collect_failures.append(pkg)
        print('=' * 78)
        print('[engine_server.spec] WARNING: collect_all(%r) FAILED' % pkg)
        print('[engine_server.spec]   %s: %s' % (type(exc).__name__, exc))
        print('[engine_server.spec]   This exe will be MISSING parts of the AI stack.')
        print('[engine_server.spec]   Install %r into the build interpreter and rebuild.' % pkg)
        print('=' * 78)

if _collect_failures:
    print('[engine_server.spec] **********************************************************')
    print('[engine_server.spec] INCOMPLETE BUILD - failed collect_all for: %s'
          % ', '.join(_collect_failures))
    print('[engine_server.spec] DO NOT SHIP this engine_server.exe.')
    print('[engine_server.spec] **********************************************************')

# NOTE: `google.auth` / `google.api_core` are kept deliberately -- they are
# transitive dependencies of google-generativeai, which engine/services/ai_selector.py
# imports directly. `groq`, `openai` and `anthropic` were removed: no module in
# engine/** imports them and they are not installed.
hiddenimports += [
    'uvicorn','uvicorn.logging','uvicorn.lifespan','uvicorn.lifespan.on','uvicorn.lifespan.off',
    'uvicorn.protocols','uvicorn.protocols.http','uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl','uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets','uvicorn.protocols.websockets.auto',
    'uvicorn.main','uvicorn.config','uvicorn.server',
    'fastapi','fastapi.applications','fastapi.middleware','fastapi.middleware.cors',
    'fastapi.staticfiles','fastapi.responses','pydantic','pydantic.v1',
    'starlette','starlette.middleware','starlette.middleware.cors','starlette.routing',
    'starlette.staticfiles','starlette.responses','starlette.requests',
    'anyio','anyio.from_thread','h11','httptools','click','dotenv','python_dotenv',
    'PIL','PIL.Image','numpy','google.auth','google.api_core','httpx','httpcore',
    'requests','certifi','charset_normalizer',
    'idna','urllib3','typing_extensions','aiofiles','multipart','python_multipart',
]

# ── Bundled runtime data (read from disk at runtime, not importable) ──────────
#   assets/    -> engine/assets/fonts/*.ttf      (caption_maker / thumbnail_generator)
#   models/    -> engine/models/*.tflite/.onnx/.xml (face_tracker, OpenCV cascades)
#   bg_music/  -> engine/bg_music/*.mp3           (video_processor fallback track,
#                 used when MUSIC_DIR in AppData holds no user-supplied music)
engine_base = os.path.abspath('engine')
for asset_dir in ['assets', 'models', 'bg_music']:
    ap = os.path.join(engine_base, asset_dir)
    if os.path.isdir(ap):
        datas.append((ap, asset_dir))
    else:
        print('[engine_server.spec] WARNING: expected data folder missing: %s' % ap)

a = Analysis(
    [os.path.join(engine_base, 'server.py')],
    pathex=[engine_base],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=['tkinter','matplotlib','notebook','IPython','scipy','pandas','sympy','_pytest','pytest'],
    noarchive=False,
    optimize=1,
)

pyz = PYZ(a.pure)

# UPX is disabled on purpose:
#   1. UPX-packing mediapipe / ctranslate2 (and other native ML) DLLs is a known
#      cause of "DLL load failed" at runtime -- UPX mangles the sections those
#      libraries re-map during import.
#   2. UPX-packed binaries are a classic malware heuristic, so a UPX'd installer
#      gets flagged by Windows Defender / SmartScreen far more often.
# The size saved is not worth a backend that will not start on customer machines.
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='engine_server',
    debug=False,
    strip=False,
    upx=False,
    console=False,
    icon='public/icon.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='engine_server',
)
