# Technology Stack & Dependency Inventory

## 1. System Requirements

| Specification | Minimum Requirement | Recommended Production Specs |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit, 1909+) | Windows 11 (64-bit, 22H2+) |
| **Processor (CPU)** | Intel Core i5 / AMD Ryzen 5 (4 cores) | Intel Core i7 / AMD Ryzen 7 (8+ cores) |
| **Memory (RAM)** | 8 GB DDR4 | 16 GB – 32 GB DDR4/DDR5 |
| **Graphics (GPU)** | Intel UHD 630 / NVIDIA GTX 1050 | Intel Arc A-Series / NVIDIA RTX 3060+ (NVENC) |
| **Disk Storage** | 5 GB free SSD space | 50 GB+ NVMe SSD space |
| **Internet Speed** | 10 Mbps broadband | 50+ Mbps for rapid stream slicing |

---

## 2. Core Dependencies & Libraries

### Presentation Layer (Frontend)
- **Node.js**: v18.0.0+ / v20.0.0+ LTS
- **Electron**: v35.7.5 (Chromium shell, IPC, contextIsolation enabled)
- **React**: v18.3.1 (Modern functional components & Hooks)
- **Vite**: v6.3.5 (Fast bundling, Rollup chunk splitting)
- **Tailwind CSS**: v4.1.1 (High-performance styling)
- **Lucide React**: v0.487.0 (Precision iconography)
- **proglog**: Terminal and GUI progress streaming

### Core Engine (Python Backend)
- **Python**: v3.10 – v3.14 (64-bit)
- **FastAPI**: v0.115.0+ (Modern, high-speed asynchronous REST API)
- **Uvicorn**: v0.32.0+ (Lightning-fast ASGI loopback server)
- **yt-dlp**: v2026.10.21+ (Direct unthrottled HLS / CDN stream slicing)
- **MoviePy**: v1.0.3 (Nonlinear programmatic video compositing)
- **OpenCV (opencv-python)**: v5.0.0+ (Computer vision, scene detection, Lanczos resizing)
- **Faster-Whisper**: (CTranslate2 accelerated speech recognition)
- **MediaPipe**: (BlazeFace TFLite neural face & subject tracking)
- **imageio-ffmpeg**: (Bundled FFmpeg 7.1 static binaries with hardware codecs)
- **PyInstaller**: v6.11.0+ (Bundles Python backend into standalone `engine_server.exe`)

---

## 3. Hardware Video Codecs Supported
1. **Intel QuickSync Video (`h264_qsv`)**:
   - Hardware accelerated encoding via Intel Arc / Core integrated silicon.
   - Zero-copy NV12 surface pipeline.
2. **NVIDIA NVENC (`h264_nvenc`)**:
   - Dedicated NVIDIA tensor silicon encoder (P4 preset, low latency).
3. **AMD Advanced Media Framework (`h264_amf`)**:
   - AMD Radeon hardware VCN encoding engine.
4. **Multi-Threaded CPU Fallback (`libx264 ultrafast`)**:
   - Auto-detected threads (`min(8, os.cpu_count() - 1)`), zero crash guarantee.
