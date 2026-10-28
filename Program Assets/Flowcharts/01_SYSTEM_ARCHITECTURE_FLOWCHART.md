# System Architecture & Component Interaction Flowchart

## 1. Overview
ClipVault is a hybrid desktop application designed with a high-performance decoupled architecture:
- **Presentation Layer**: Electron Shell + React 18 + Vite (Tailwind CSS, TypeScript).
- **Core Orchestration & AI Engine**: Python 3.10–3.14 + FastAPI + Uvicorn (local loopback server).
- **Hardware & Media Acceleration Pipeline**: OpenCV 5.0, FFmpeg 7.1, Intel QSV / NVIDIA NVENC / AMD AMF hardware codecs, Faster-Whisper, and MediaPipe TFLite Neural Detectors.
- **Security & Authorization**: Cryptographic session tokens, loopback CORS protection, and Ed25519 offline digital signature verification.

---

## 2. System Architecture Flowchart

```mermaid
flowchart TD
    subgraph UI_Layer ["Desktop Presentation Layer (Electron + Vite + React)"]
        A1["User Interface (1-Click Opus Clipper / Pro Manual Studio)"]
        A2["Electron Main Process (electron/main.js)"]
        A3["Secure Preload Bridge (contextBridge, IPC)"]
        A4["Session Token Injector (Authorization Header)"]
    end

    subgraph IPC_Loopback ["Secure Local Loopback Transport"]
        B1["Localhost HTTP / REST API (127.0.0.1:8000)"]
    end

    subgraph Backend_Engine ["ClipVault Engine Server (FastAPI + Uvicorn)"]
        C1["Auth & Loopback Middleware (engine/server.py)"]
        C2["Task Queue & Background Thread Pool"]
        C3["Hardware Scanner (GPU & Encoder Probe)"]
        C4["License Verifier (Ed25519 Public Key)"]
    end

    subgraph Media_Pipeline ["High-Throughput Processing Pipeline"]
        D1["YouTube Stream Slicer (yt-dlp + FFmpeg Range Seek)"]
        D2["Speech-to-Text Engine (Faster-Whisper / Cloud API)"]
        D3["AI Virality Curator (Gemini / Claude / Local LLM)"]
        D4["Face & Subject Tracker (MediaPipe + YuNet + Cascades)"]
        D5["Layout Compositor (9:16 Auto-Reframe, Split Screen, Blur)"]
        D6["Animated Caption Typography (Karaoke / SFX / Emojis)"]
        D7["Hardware Video Encoder (QSV / NVENC / AMF / libx264)"]
    end

    subgraph Storage_Layer ["Local Disk & Export Vault"]
        E1["Temporary Cache (~/temp/)"]
        E2["Saved Clips Vault (~/clips/)"]
        E3["JSON Metadata & Viral Scores (~/metadata/)"]
    end

    %% Connections
    A1 --> A3
    A3 --> A2
    A2 -->|Spawns with Session Token| C1
    A1 -->|HTTP REST + Bearer Token| B1
    B1 --> C1
    C1 --> C2
    C2 --> C3
    C2 --> C4
    C2 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> D4
    D4 --> D5
    D5 --> D6
    D6 --> D7
    D7 --> E2
    D7 --> E3
    D1 -.->|Cleans up slices| E1
```

---

## 3. Component Communication Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Content Creator
    participant UI as React UI (Renderer)
    participant Elect as Electron Main
    participant API as FastAPI Engine (127.0.0.1:8000)
    participant Pipe as Video Processing Pipeline
    participant Disk as Local Vault Storage

    User->>UI: Pastes YouTube URL & Clicks "Generate Clips"
    UI->>Elect: Validates URL & active license state
    UI->>API: POST /api/process (URL, Layout, Language, Captions)
    API-->>UI: HTTP 200 { task_id, status: "Started" }
    
    activate Pipe
    API->>Pipe: Spawns Background Task (process_video)
    Pipe->>Pipe: Probes Hardware (detect_hardware_encoder)
    Pipe->>Pipe: Extracts Audio & Transcribes (Faster-Whisper)
    Pipe->>Pipe: Scores Viral Hooks (AI Curation Analysis)
    
    loop Every 1 Second
        UI->>API: GET /api/progress/{task_id}
        API-->>UI: HTTP 200 { progress: 40..100%, status: "..." }
    end

    Pipe->>Pipe: Prefetches Slices (ThreadPoolExecutor Lookahead)
    Pipe->>Pipe: Face Tracking & Kinetic Camera Reframing
    Pipe->>Pipe: MoviePy Composition & Ultrafast Hardware Encoding
    Pipe->>Disk: Writes Output MP4 + JSON Metadata + 9:16 Thumbnail
    deactivate Pipe

    API-->>UI: Task Complete (100%) { output_files: [...] }
    UI->>User: Displays Instant Video Preview in Phone Player & Saved Vault
```

---

## 4. Key Architectural Highlights
1. **Decoupled Lifecycle**: The UI and Python backend run as separate processes connected via secure local loopback. If the UI reloads, active video rendering in Python continues without crashing.
2. **Local-First Privacy**: Video frames, audio, and transcripts are processed on the user's local machine; no raw user video content is sent to third-party cloud render farms.
3. **Hardware Fallback Chain**: Automatically probes for Intel QSV, NVIDIA NVENC, and AMD AMF hardware encoders, with fail-safe zero-crash fallback to multi-threaded CPU `libx264 ultrafast`.
