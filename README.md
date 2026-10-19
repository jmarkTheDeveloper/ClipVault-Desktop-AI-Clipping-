<div align="center">

# ⚡ ClipVault Studio AI
### Autonomous Desktop AI Video Clipping, Virality Engine & Studio

[![Status: Active Development](https://img.shields.io/badge/Status-Active_Development-orange.svg?style=flat-square&logo=github)](https://github.com/jmarkTheDeveloper/ClipVault-Desktop-AI-Clipping-)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-30.0-47848F.svg?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Rust Core](https://img.shields.io/badge/Rust_Core-SIMD_Accelerated-DEA584.svg?style=flat-square&logo=rust&logoColor=white)](./engine/rust_core)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Hardware_Accelerated-007808.svg?style=flat-square&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![License: Proprietary Commercial](https://img.shields.io/badge/License-Proprietary%20Commercial-red.svg?style=flat-square)](./LICENSE)

<br/>

> [!IMPORTANT]
> **Active Development Notice**: ClipVault Studio AI is currently in rapid, active development. Core neural tracking models, Rust SIMD compositors, and automated virality pipelines are continuously receiving production updates.

<p align="center">
  <b>ClipVault Studio AI</b> transforms full-length YouTube videos, podcasts, and local footage into high-retention, publication-ready 9:16 vertical Shorts, TikToks, and Reels — complete with dynamic kinetic animated typography, active AI speaker reframing, and instant byte-range stream slicing.
</p>

[Key Features](#-key-features) •
[Architecture](#-architecture) •
[Installation & Quick Start](#-installation--quick-start) •
[Video Layouts & Dynamic Framing](#-video-layouts--dynamic-framing) •
[Quality Assurance](#-quality-assurance--testing) •
[Changelog](#-changelog--release-notes) •
[License](#-license--intellectual-property)

---

</div>

## 🌟 Key Features

### 🚀 Zero-Lag Desktop Architecture
- **Thread & Priority Management**: Background rendering tasks automatically adjust process priorities to ensure **0% OS stutter, cursor lag, or UI freezing**, even during high-bitrate 4K encoding.
- **Hardware-Accelerated Encoders**: Automatic silicon hardware detection and zero-copy rendering:
  - **Intel Arc / QuickSync Video** (`h264_qsv`)
  - **NVIDIA NVENC** (`h264_nvenc`)
  - **AMD AMF** (`h264_amf`)
  - **Optimized Multi-Threaded CPU** (`libx264`)
- **Native Rust SIMD Accelerator**: High-performance pixel compositing and alpha-channel word blending compiled directly to native machine assembly via [`clipvault_rust.dll`](./engine/services/bin/clipvault_rust.dll).
- **HTTP 206 Byte-Range Streaming**: Ultra-smooth in-app video playback and scrubbing powered by an internal streaming proxy with instant 32MB range response buffers.

### 🧠 Multi-Engine AI Virality Analysis
- AI models scan transcripts, dialogue hooks, and narrative sentiment to isolate peak retention moments, emotional climaxes, and shareable punchlines.
- Compatible with industry-leading frontier LLMs:
  - **Google Gemini 1.5 Pro / Flash**
  - **OpenAI GPT-4o / Sora APIs**
  - **Anthropic Claude 3.5 Sonnet**
  - **DeepSeek & Local Custom Endpoints**
- Dynamic virality scoring (1–100 pts) with auto-generated contextual titles, platform-optimized tags, and curation rationales.

### ✂️ Smart Partial Stream Slicing (`yt-dlp` + FFmpeg)
- Rather than downloading massive 2-to-4 hour videos, ClipVault resolves the live audio/video streams and downloads **only the exact timestamp chunks** directly over HTTP in seconds.
- Instant dialogue transcript ingestion from YouTube native tracks in ~0.5s when available, bypassing lengthy audio extraction.

### 🎨 Kinetic Animated Subtitles & Typography
- Word-by-word karaoke typography rendered with genuine SIL OFL / Google Open Fonts:
  - **Montserrat**, **Anton**, **Bebas Neue**, **Bangers**, **Luckiest Guy**, **Rubik**, **Plus Jakarta Sans**, and **Outfit**.
- Pre-configured, creator-tested subtitle aesthetics:
  - 🟡 **Viral Iconic Yellow** (Bold black outline + energetic word highlight)
  - 🟢 **Neon Toxic Lime** (Cyberpunk aesthetic with glowing drop shadows)
  - 🔵 **Ocean Blue Wave** (Clean podcast captioning)
  - 🔴 **Hot Crimson Punch** (High-intensity creator edits)
  - ⚪ **Clean Minimal White**
- Automated pop sound effects (**SFX**) and context-aware **animated emojis** placed synchronously at keyword punchlines.

### 📐 Video Layouts & Dynamic Framing
1. **Auto Face-Tracking (9:16)**: Computer vision with 3-step binary cut detection tracks active speakers and centers faces with smooth camera panning.
2. **Satisfying Gameplay Split**: Top-half speaker video combined with satisfying gameplay (Subway Surfers, GTA 5, Minecraft Parkour, ASMR) with custom background import support.
3. **Landscape + Blurred Canvas**: Fits horizontal video inside a 9:16 frame with a 40% dimmed Gaussian-blurred background.
4. **Landscape Fit (Letterbox)**: Clean centered letterbox with padded bars.
5. **Custom Dual-Box Split-Screen**: Interactive visual dual-crop editor.

### 📁 Real-Time Windows File Explorer Integration
- **Direct Disk Mirroring**: Folders and subfolders created in ClipVault mirror directly into the Windows filesystem.
- **True Drag & Drop Movement**: Drag video cards across folders or breadcrumb chips with strict folder isolation (no visual duplication).
- **Native OS Drag-Out**: Drag clips directly from the Vault into Premiere Pro, CapCut Desktop, DaVinci Resolve, or any Windows folder.
- **One-Click Duplicate & Trash Management**: Physical file duplication and locked-file recovery deletion on Windows.

---

## 🏛️ Architecture

```
ClipVault Studio/
├── electron/                         # Electron Main Process & Native Preload IPC
│   ├── main.js                       # Window lifecycle, protocol streaming, native drag-out
│   └── preload.cjs                   # Secure context bridge with listener cleanup
├── src/                              # Frontend Application (React 18 + TypeScript + Tailwind)
│   ├── app/
│   │   ├── components/clipper/       # SetupSidebar, PhonePreview, SavedClipsVault, CropModal
│   │   ├── screens/                  # AiClipperScreen, MovieRecapperScreen, EditorScreen, HomeScreen
│   │   └── utils/                    # API client, types, storage helpers
├── engine/                           # Python Backend Engine (FastAPI + MoviePy)
│   ├── server.py                     # REST API & background rendering task runner
│   ├── config.py                     # Path configs & hardware acceleration
│   ├── assets/fonts/                 # Genuine SIL OFL viral creator fonts
│   ├── rust_core/                    # Native Rust SIMD video & alpha compositor source
│   ├── services/
│   │   ├── bin/                      # Compiled native binaries (clipvault_rust.dll)
│   │   ├── video_processor.py        # Main orchestration pipeline
│   │   ├── layout_compositor.py      # 9:16 cropping, splits, gameplay composition
│   │   ├── caption_maker.py          # Word-by-word subtitle rasterizer (binary-search bisect)
│   │   ├── face_tracker.py           # Neural lookahead face tracker & virtual camera
│   │   ├── whisper_transcriber.py    # Faster-Whisper multi-language transcription
│   │   ├── ai_selector.py            # LLM virality analysis & hook extraction
│   │   ├── youtube_downloader_yt_dlp.py # High-speed stream slicing engine
│   │   ├── scene_detector.py         # Visual shot boundary cut detection
│   │   ├── thumbnail_generator.py    # Auto-generation of 9:16 YouTube/TikTok posters
│   │   └── color_grader.py           # Cinematic LUT profiles
└── qa_check.py                       # Automated 14-point Quality Assurance suite
```

### Architecture & Engineering Guides
- **[`docs/BUILD.md`](./docs/BUILD.md)** — Build & release guide: PyInstaller engine bundle → Vite renderer → electron-builder NSIS installer, clean-VM installer testing, the GitHub auto-update feed requirement, and Windows code signing.
- **[`docs/HANDOFF.md`](./docs/HANDOFF.md)** — Developer hand-off notes and in-depth architecture walkthrough.

---

## 💻 Installation & Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (3.10, 3.11, or 3.12 recommended)
- **FFmpeg** (automatically detected via `imageio_ffmpeg` or system PATH)

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/jmarkTheDeveloper/ClipVault-Desktop-AI-Clipping-.git
   cd ClipVault-Desktop-AI-Clipping-
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Install Python backend requirements:**
   ```bash
   pip install -r engine/requirements.txt
   ```
   *(The engine's requirements file lives inside `engine/` — there is no requirements file at the repository root.)*

4. **Configure Environment Variables (Optional):**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_google_ai_studio_api_key
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   OUTPUT_DIR=engine/clips
   ```

5. **Start the Development Studio:**
   ```bash
   # Launch the FastAPI engine + Vite dev server + Electron UI together
   npm run dev:electron
   ```

   *Frontend-only (`vite`) dev server, without Electron or the Python engine:*
   ```bash
   npm run dev
   ```

   *Or run the standalone desktop launcher:*
   ```bash
   # Windows batch launcher
   start_app.bat
   ```

---

## 🧪 Quality Assurance & Testing

ClipVault includes a dedicated automated test suite that validates dependencies, hardware acceleration, YouTube slicing, REST endpoints, and the frontend TypeScript bundle:

```bash
python qa_check.py
```

### Verified Test Suites (14/14 Passing):
- `[PASS]` **FFmpeg Engine Binary**
- `[PASS]` **yt-dlp Engine Integrity**
- `[PASS]` **Computer Vision Core (OpenCV + Hardware Pipeline)**
- `[PASS]` **Hardware Acceleration Detection**
- `[PASS]` **Downloader Interface Integrity**
- `[PASS]` **Stream Metadata Extraction**
- `[PASS]` **FastAPI Endpoints (`/api/saved_clips`, `/api/create_folder`, `/api/delete_clip`, `/api/cancel`)**
- `[PASS]` **Background Video & Music Asset Discovery**
- `[PASS]` **Strict Pre-Compilation Validation Guard**
- `[PASS]` **Frontend TypeScript & Vite Production Build** (0 type errors)

---

## 💖 Support & Community

If you find ClipVault useful or want to support ongoing development, consider starring the repository and supporting us:

<div align="center">

<p><sub>Built with 💚 by <b>ClipVault Studio LLC</b>.</sub></p>

</div>

---

## 📋 Changelog & Release Notes

Stay updated with all new features, AI integrations, performance improvements, and bug fixes in our official changelog:

👉 **[View Full Release Changelog (`CHANGELOG.md`)](./CHANGELOG.md)**

---

## 📄 License & Intellectual Property

Copyright © 2026 **ClipVault Studio LLC**. All Rights Reserved.

Distributed under the **Exclusive Proprietary Commercial Software License**.
- **Personal & Educational Use**: You are free to view, study, and use ClipVault locally for personal content creation.
- **Commercial & SaaS Restrictions**: Commercial resale, subscription monetization, SaaS re-hosting, and unauthorized commercial redistribution are strictly prohibited without an official commercial agreement directly from **ClipVault Studio LLC**.

See the [`LICENSE`](./LICENSE) file for complete legal terms.
