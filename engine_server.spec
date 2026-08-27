# -*- mode: python ; coding: utf-8 -*-
# ClipVault AI - Python Backend PyInstaller Spec
# Bundles: FastAPI + uvicorn + server.py + all services into engine_server.exe

import os
import sys
from PyInstaller.utils.hooks import collect_all, collect_data_files, collect_submodules

datas = []
binaries = []
hiddenimports = []

for pkg in ['mediapipe', 'faster_whisper', 'moviepy']:
    try:
        d, b, h = collect_all(pkg)
        datas += d; binaries += b; hiddenimports += h
    except Exception:
        pass

for pkg in ['ctranslate2', 'imageio_ffmpeg', 'cv2', 'yt_dlp']:
    try:
        d, b, h = collect_all(pkg)
        datas += d; binaries += b; hiddenimports += h
    except Exception:
        pass

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
    'groq','openai','anthropic','requests','certifi','charset_normalizer',
    'idna','urllib3','typing_extensions','aiofiles','multipart','python_multipart',
]

engine_base = os.path.abspath('engine')
datas += [
    (os.path.join(engine_base, 'services'), 'services'),
    (os.path.join(engine_base, 'config.py'), '.'),
]
for asset_dir in ['assets', 'styles', 'models', 'utils']:
    ap = os.path.join(engine_base, asset_dir)
    if os.path.isdir(ap):
        datas.append((ap, asset_dir))

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

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='engine_server',
    debug=False,
    strip=False,
    upx=True,
    console=False,
    icon='public/icon.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='engine_server',
)
