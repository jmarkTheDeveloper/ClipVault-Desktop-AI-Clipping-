
<div align="center">

#     STILL IN DEVELOPMENT!

# ⚡ ClipVault Studio AI
### Autonomous Desktop AI Video Clipping, Virality Engine & Studio

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-30.0-47848F.svg?logo=electron)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB.svg?logo=python)](https://python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Hardware_Accelerated-007808.svg?logo=ffmpeg)](https://ffmpeg.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <b>ClipVault</b> transforms full-length YouTube videos, podcasts, and local files into ultra-engaging, high-retention 9:16 vertical Shorts, TikToks, and Reels with CapCut-style animated subtitles, active face tracking, and smart stream slicing.
</p>

[Key Features](#-key-features) •
[Architecture](#-architecture) •
[Installation & Quick Start](#-installation--quick-start) •
[Video Layouts & CapCut Typography](#-video-layouts--capcut-typography) •
[Quality Assurance](#-quality-assurance--testing)

---

</div>

## 🌟 Key Features

### 🚀 Zero-Lag Desktop Architecture
- **Thread & Priority Management**: Background rendering tasks automatically adjust process priorities to ensure **0% OS stutter, cursor lag, or UI freezing**, even during high-bitrate 4K encoding.
- **Hardware Acceleration**: Automatic encoder detection:
  - **Intel Arc / QuickSync Video** (`h264_qsv`)
  - **NVIDIA NVENC** (`h264_nvenc`)
  - **AMD AMF** (`h264_amf`)
  - **Optimized Multi-Threaded CPU** (`libx264`)

### 🧠 Multi-Engine AI Virality Analysis
- AI scans transcripts and audio energy to pinpoint peak retention hooks, emotional climaxes, and shareable punchlines.
- Compatible with **OpenAI (Sora/GPT-4o)**, **Anthropic Claude 3.5**, **Google Gemini 1.5 Pro / Flash**, **Higgsfield AI**, and **DeepSeek**.
- Automatic virality scoring (1–100 pts) with generated catchy titles, viral hashtags, and curation rationales.

### ✂️ Smart Partial Stream Slicing (`yt-dlp` + FFmpeg)
- Rather than downloading massive 4-hour livestreams, ClipVault resolves the live audio/video streams and slices **only the exact timestamp chunks** directly over HTTP in seconds.

### 🎨 CapCut-Identical Animated Subtitles & Typography
- Word-by-word karaoke typography with genuine SIL OFL / Google Open Fonts:
  - **Montserrat**, **Anton**, **Bebas Neue**, **Bangers**, **Luckiest Guy**, **Rubik**, **Plus Jakarta Sans**, and **Outfit**.
- Pre-configured viral caption styles:
  - 🟡 **CapCut Iconic Yellow** (Bold black outline + energetic word highlight)
  - 🟢 **Neon Toxic Lime** (Cyberpunk aesthetic with glowing drop shadows)
  - 🔵 **Ocean Blue Wave** (Clean podcast captioning)
  - 🔴 **Hot Crimson Punch** (High-intensity creator edits)
  - ⚪ **TikTok Clean Minimal**
- Automatic pop sound effects (**SFX**) and context-aware **animated emojis** placed at keyword punchlines.

### 📐 Video Layouts & CapCut Typography
1. **Auto Face-Tracking (9:16)**: OpenCV-driven computer vision actively tracks speaker faces to keep them centered.
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
├── electron/                  # Electron Main Process & Preload IPC
│   ├── main.js                # Window lifecycle, native drag-out, child processes
│   └── preload.cjs            # Safe context bridge
├── src/                       # Frontend Application (React 18 + TypeScript + Tailwind)
│   ├── app/
│   │   ├── components/clipper/ # SetupSidebar, PhonePreview, SavedClipsVault, CropModal
│   │   ├── screens/           # AiClipperScreen, MovieRecapperScreen, EditorScreen
│   │   └── utils/             # API client, types, storage helpers
├── engine/                    # Python Backend Engine (FastAPI + MoviePy)
│   ├── server.py              # REST API & background rendering task runner
│   ├── config.py              # Path configs & hardware acceleration
│   ├── assets/fonts/          # genuine SIL OFL viral fonts
│   ├── services/
│   │   ├── video_processor.py # Main orchestration pipeline
│   │   ├── layout_compositor.py # 9:16 cropping, splits, gameplay composition
│   │   ├── caption_maker.py   # Word-by-word subtitle rasterizer
│   │   ├── whisper_transcriber.py # Faster-Whisper multi-language transcription
│   │   ├── ai_selector.py     # LLM virality analysis & hook extraction
│   │   ├── youtube_downloader_yt_dlp.py # Stream slicing engine
│   │   └── color_grader.py    # LUT & cinematic color profiles
└── qa_check.py                # Automated 14-point Quality Assurance suite
```

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
   pip install -r requirements.txt
   ```

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
   # Launch both FastAPI engine and Vite/Electron UI
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

## 💖 Support & Sponsorship

If you find ClipVault useful or want to support ongoing open-source development, you can support me on Patreon!

<div align="center">

[![Patreon](https://img.shields.io/badge/Patreon-Support_on_Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/jmarkTheDeveloper?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink)
[![GitHub](https://img.shields.io/badge/GitHub-Follow_@jmarkTheDeveloper-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/jmarkTheDeveloper)

<p><sub>Built with 💚 by <b><a href="https://github.com/jmarkTheDeveloper">jmarkTheDeveloper</a></b> — Computer Science Student at National University Philippines.</sub></p>

</div>

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
