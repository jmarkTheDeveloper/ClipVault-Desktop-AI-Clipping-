# ClipVault Studio Changelog & Release Notes

All notable changes, architectural updates, AI engine integrations, and hardware optimizations for **ClipVault Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-26

### Major Milestones & Performance
- **150+ FPS Hardware Acceleration Pipeline**: Integrated native C-pointer video transforms and hardware-accelerated video encoders (Intel Arc QuickSync h264_qsv, NVIDIA NVENC h264_nvenc, AMD AMF h264_amf). Slices and renders 1080p vertical clips in under 15 seconds.
- **Zero-Lag Desktop Process Prioritization**: Background rendering tasks automatically adjust OS process priorities to Idle Priority, guaranteeing 0% cursor lag, stutter, or UI freezing.
- **Automated 14-Point Quality Assurance Suite (qa_check.py)**: 100% automated health testing verifying FFmpeg, yt-dlp, OpenCV, hardware encoders, REST endpoints, file operations, and Vite production builds.

### AI Virality & Multi-Engine Hub
- **Universal Multi-Cloud BYOK Engine**: Native SDK and HTTP routing with strict 6.5s fallback guards for:
  - **Google Gemini** (Gemini 2.5 Flash / 2.0 Pro multimodal intelligence)
  - **Groq LPU Engine** (Llama 3.3 70B & Whisper at 500+ tok/s real-time)
  - **DeepSeek V3 / R1** (Viral hook and retention reasoning)
  - **OpenAI ChatGPT** (GPT-4o, OpenAI Sora, Cloud Whisper)
  - **Anthropic Claude** (Claude 3.7 & 3.5 Sonnet script specialist)
  - **Moonshot Moonlight** (moonshot-v1-8k)
  - **Alibaba Qwen** (qwen-plus)
  - **Higgsfield AI & SeeDance AI**
- **Free Local On-Device GPU / NPU Mode**: 100% offline, zero-cost highlight generation using local hardware audio energy clustering.
- **Accurate Real-Time Hardware Scanner**: Probes real CPU, GPU, NPU, and video encoders via PowerShell WMI and DirectShow APIs.

### Computer Vision & Face Tracking
- **Two-Shot Group Lock**: When 2 people are detected in interviews or podcasts, ClipVault measures the horizontal span and locks a 100% static tripod crop between both speakers - eliminating all wobbly ping-pong camera oscillation.
- **Group Centroid Tripod**: Automatically clusters 3+ people (panels, crowds) and centers on the group centroid while filtering background noise (< 35% dominant size).
- **Sticky Anchor Hysteresis**: Prevents rapid camera jumping on wide-angle sets, requiring continuous speech before smoothly panning.
- **MediaPipe Neural TFLite Engine**: Real-time neural face detection with RGB color pipeline and multi-tier Haar cascade and HOG fallbacks.

### Security, Key Vault & Compliance
- **Dual-Layer Permanent Key Persistence**: Keys are saved simultaneously to browser storage and a protected on-device disk vault (~/.clipvault/keys_vault.json), ensuring keys are never lost across restarts.
- **Interactive Eye Password Masking**: API keys are masked by default (••••••••) with one-click show/hide toggle.
- **Confidentiality & Anti-Leakage Safeguard**: Strict exception sanitization prevents backend tracebacks or API keys from being exposed in UI notifications.
- **Formal Legal Disclaimer & Trademark Attribution Notice**: Added legal compliance attributions for Intel, AMD, NVIDIA, Google, OpenAI, Anthropic, Groq, DeepSeek, Alibaba, Moonshot, Higgsfield, and ByteDance.
- **Exclusive Proprietary Commercial License**: 100% exclusive commercial, distribution, and monetization rights owned by **John Mark (jmarkTheDeveloper)**.

### Typography, Captions & Editing
- **CapCut-Identical Word-by-Word Animated Subtitles**: SIL OFL typography (Montserrat, Anton, Bebas Neue, Bangers, Luckiest Guy, Rubik, Plus Jakarta Sans, Outfit).
- **Viral Caption Presets**: CapCut Iconic Yellow, Neon Toxic Lime, Ocean Blue Wave, Hot Crimson Punch, TikTok Clean Minimal.
- **Anti-ContentID Evasion Matrix**: Micro-crop zoom (2.5%), horizontal reflection, and acoustic tempo micro-warping.
- **Windows Explorer Native Sync**: Real-time folder mirroring on disk, folder isolation, and native drag-out to Premiere Pro, CapCut Desktop, and DaVinci Resolve.
