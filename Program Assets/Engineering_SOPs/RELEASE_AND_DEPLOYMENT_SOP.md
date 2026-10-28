# ClipVault Release & Deployment SOP

## Standard Operating Procedure: SOP-ENG-001
**Objective**: Build, verify, package, and deploy production-ready ClipVault executables and consumer bundles with zero regressions.

---

## 1. Pre-Release Verification Protocol

Always execute the automated Quality Assurance Suite before building or committing code:

```powershell
cd "c:\Users\Dell User\Downloads\Personal Coding Projects\Python Projects\Desktop AI Clipping Software"
python qa_check.py
```

### Verification Criteria:
- **15 / 15 test suites must show `[PASS]` (100% Production Ready)**.
- FFmpeg binary probe: Verified.
- yt-dlp stream extractor: Verified.
- OpenCV 5.0 hardware pipeline: Verified.
- SystemGuard memory reclamation: Verified.
- Hardware encoder probe (QSV/NVENC/AMF/CPU): Verified.
- FastAPI REST endpoints: Verified.
- Frontend TypeScript & Vite production build: 0 errors.

---

## 2. Release Build Options

### Option A: Consumer Mode Update (Fast ~5 Seconds)
Used when deploying frontend and Python updates to local clients without rebuilding the heavy 1GB installer:

```powershell
# 1. Compile updated UI assets (Rollup vendor chunking)
npm run build

# 2. Launch Consumer Application directly
npm run consumer
```

### Option B: Standalone Production Installer (`.exe` Build)
Used when creating the official standalone distribution installer for customers who do not have Python or Node installed:

```powershell
# Compiles PyInstaller (dist_python) + Vite + Electron-Builder installer into release/
npm run build:dist
```

The resulting standalone setup installer is generated in:
`release/ClipVault Setup 1.0.0.exe`

---

## 3. Post-Build Smoke Checklist
- [ ] Launch `start_consumer_app.bat` — Verify clean startup with zero yellow warnings.
- [ ] Paste a YouTube URL — Generate 1 clip in 1080p.
- [ ] Verify that the progress bar advances smoothly without freezing.
- [ ] Confirm the generated MP4 plays cleanly with audio and word-level animated typography.
- [ ] Verify 9:16 portrait thumbnail is generated in `metadata/` and Saved Vault displays it.
- [ ] Check Git status and push to GitHub `origin/main`.
