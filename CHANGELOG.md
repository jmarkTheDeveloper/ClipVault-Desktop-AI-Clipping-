# ClipVault Studio Changelog & Release Notes

All notable changes, architectural updates, AI engine integrations, and hardware optimizations for **ClipVault Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Security & Stability Remediation

A full third-party audit was run against the codebase. **Every critical and high finding
is fixed in this pass**; the two items that require the owner's cloud consoles (key
rotation, code signing) are listed as owner actions. Full detail: `docs/SECURITY.md`
(findings register) and `docs/HANDOFF.md`.

### Security (breaking for the local API)
- **Arbitrary file read fixed.** `/api/download_clip` joined the client string onto the
  clips directory with no jail, so `?file=../../.env` or `?file=C:/Windows/win.ini`
  returned any readable file. All file endpoints now resolve through
  `safe_path()`/`safe_name()`/`safe_upload_name()` (403 on escape).
- **Authentication now actually applies.** The middleware short-circuited for loopback
  clients — which is every request, since the engine only binds `127.0.0.1` — making the
  `X-App-Auth-Token` handshake dead code. The token is now enforced on every route except
  `/api/health` and the docs routes, and is stamped onto engine requests at the network
  layer (`session.webRequest.onBeforeSendHeaders`), which also covers `<img>`/`<video>`.
  **A plain browser on `localhost:54321` can no longer call the API.**
- **Remote exfiltration chain closed.** `Origin: null` was trusted *and* answered with
  `Access-Control-Allow-Origin: null` plus credentials, letting a sandboxed iframe on any
  website read local responses. Opaque origins are no longer trusted and credentialed
  CORS is disabled.
- **Leaked credential removed** from `video_qa_service.py` / `AskStudioPanel.tsx` (it had
  been committed to git history, compiled into the renderer bundle and embedded in
  `engine_server.exe`). **The key must still be rotated and history purged.**
- **Licence bypasses removed**: hardcoded master keys, the `CV-VIP-*` wildcard, the
  pre-filled master key in the activation dialog, and the close button that unlocked the
  app. Licensing is now Ed25519-verified offline and **enforced in the engine** at the
  render layer (`warn` in development, `enforce` when packaged).
- Duplicate `/api/copy_clips` route removed (it shadowed an auth-guarded handler);
  `local://` protocol restricted to allow-listed roots; upload filenames sanitised;
  `engine_server.spec` no longer ships readable Python source.

### Stability
- **Fixed a crash**: three components returned early *above* their hooks, so toggling
  AI Captions (or the clip customiser / crop editor) threw "Rendered fewer hooks than
  expected" and replaced the whole UI with the recovery screen.
- **AI Movie Recapper now completes.** It compared a human-readable status string against
  `"completed"`, so it polled forever at a fake 95% while clips sat on disk. It now reads
  a normalised machine state, stops the poll on terminal states, and shows real errors.
- **Renders no longer kill each other.** All tasks shared one temp directory and each
  completion wiped it, deleting files another render was reading. Each task now owns
  `TEMP_DIR/task_<id>/` and cleans up only its own directory.
- Clipper/Movie-Recapper/Opus polling: added request timeouts, in-flight guards, stale-run
  rejection, monotonic progress (no more backwards jumps) and a Cancel that actually stops
  the chain. Re-entering the Clipper no longer lands on the Vault.
- Thumbnails no longer silently disappear after a metadata save failure (an unbound
  variable was swallowed). `/api/shutdown` no longer raises `NameError` (missing module
  import). Whisper inference is serialised with a lock and reports per-thread confidence,
  so two concurrent renders can no longer corrupt each other's word timings.
- Removed an `AudioContext` leak (one per completed run) and fixed the last five
  pre-existing TypeScript errors — `tsc --noEmit` is now clean.

### Packaging & repo hygiene
- Removed `!node_modules/**/*` from the electron-builder `files` list (it stripped all
  production dependencies, so a packaged build could not start) and demoted 60
  renderer-only packages to `devDependencies` (only `electron-updater` is a runtime
  dependency now).
- `engine/requirements.txt` is tracked again (a bare `*.txt` ignore rule had hidden it)
  and now lists the missing `python-multipart`, `imageio-ffmpeg`, `python-jose`, `psutil`
  and `proglog`; `package-lock.json` re-synced.
- PyInstaller spec: no longer ships Python source as data, ships the `bg_music` fallback
  asset, fails loudly instead of silently when a package can't be collected, and `upx` is
  disabled for the AI DLLs.
- Removed 4.8 MB of scraped `*-player-script.js` dumps and a stray directory from the
  repo; build outputs and signing keys are gitignored; the auto-push helper scripts now
  require `CLIPVAULT_AUTO_PUSH=1` instead of pushing on every file edit.
- Added `qa/run_qa.py` (boots a real engine and replays the original exploits),
  `tools/test_licensing.py`, `docs/SECURITY.md`, `docs/HANDOFF.md` and `docs/BUILD.md`.

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
- **Exclusive Proprietary Commercial License**: 100% exclusive commercial, distribution, and monetization rights owned by **ClipVault Studio LLC**.

### Typography, Captions & Editing
- **CapCut-Identical Word-by-Word Animated Subtitles**: SIL OFL typography (Montserrat, Anton, Bebas Neue, Bangers, Luckiest Guy, Rubik, Plus Jakarta Sans, Outfit).
- **Viral Caption Presets**: CapCut Iconic Yellow, Neon Toxic Lime, Ocean Blue Wave, Hot Crimson Punch, TikTok Clean Minimal.
- **Anti-ContentID Evasion Matrix**: Micro-crop zoom (2.5%), horizontal reflection, and acoustic tempo micro-warping.
- **Windows Explorer Native Sync**: Real-time folder mirroring on disk, folder isolation, and native drag-out to Premiere Pro, CapCut Desktop, and DaVinci Resolve.
