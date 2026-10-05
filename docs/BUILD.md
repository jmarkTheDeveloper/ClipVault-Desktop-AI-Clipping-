# ClipVault Studio — Build & Release Guide

Audience: whoever cuts a release. Everything below was verified against this repository
(`package.json`, `engine_server.spec`, `electron/main.js`, `vite.config.ts`) rather than
copied from a template. Paths are Windows paths relative to the repository root unless
stated otherwise.

---

## 0. Pipeline at a glance

```
engine/**/*.py ──[pyinstaller engine_server.spec]──> dist_python/engine_server/
                                                       ├── engine_server.exe
                                                       └── _internal/**  (deps, models, DLLs)
                                                              │
                                                              │ electron-builder extraResources
                                                              ▼
src/**  ──[vite build]──> dist/  ────────────────┐      resources/engine_server/…
                                                 │             │
                                                 └─[electron-builder --win]─┐
                                                                            ▼
                                                                    release/
                                                                      ├── ClipVault Setup 1.0.0.exe
                                                                      ├── ClipVault Setup 1.0.0.exe.blockmap
                                                                      ├── latest.yml
                                                                      └── win-unpacked/
```

Three independent steps, three independent failure modes. **Build the engine first** —
electron-builder silently ships an installer with no engine if its `extraResources`
source folder does not exist.

| npm script | What it does | Output |
| --- | --- | --- |
| `npm run build:python` | `pyinstaller engine_server.spec --distpath dist_python --workpath build_python --clean --noconfirm` | `dist_python/engine_server/` |
| `npm run build` | `vite build` | `dist/` (renderer bundle: `index.html` + `assets/`) |
| `npm run build:electron` | `vite build && electron-builder --win --publish never` | `release/` (installer, **never** uploaded) |
| `npm run build:dist` | `build:python` + `build:electron` | `release/` (installer, **never** uploaded) |
| `npm run publish:dist` | `build:python` + `vite build` + `electron-builder --win --publish always` | `release/` **and** uploads to GitHub Releases |

> Only `publish:dist` uploads anything. `build:dist` is the safe local/CI artifact build.

---

## 1. Prerequisites (build machine)

### Node / package manager
- **Node.js 20 LTS or newer** (verified on Node 24.19.0 / npm 11.17.0). Vite 6 requires Node 18+.
- **Use npm.** The only lockfile in the repository is `package-lock.json`.
  `pnpm-workspace.yaml` and a `pnpm.overrides` block exist in `package.json`, but there is
  **no `pnpm-lock.yaml` committed**, so pnpm builds are not reproducible. Do not introduce
  pnpm into the release path without also committing a pnpm lockfile.
- `npm ci` is the correct clean install **only after** `package-lock.json` matches
  `package.json`. If the two are out of sync (e.g. after dependencies were moved between
  `dependencies` and `devDependencies` without touching the lockfile), run
  `npm install --package-lock-only` once and commit `package-lock.json`.

### Python (this is the interpreter that gets *embedded* in the exe)
- A **dedicated virtual environment** on the build machine. `engine_server.exe` embeds
  whatever Python minor version built it; a venv per Python minor version keeps releases
  reproducible.
  ```
  py -3.12 -m venv .venv-build
  .\.venv-build\Scripts\activate
  pip install -r engine/requirements.txt
  pip install pyinstaller
  ```
- **PyInstaller 6.x** (verified with 6.22.2). PyInstaller 6 describes its data policy and
  namespace-package handling; `engine_server.spec` relies on both.
- The five heavy wheels must have a binary wheel for the chosen Python version on Windows:
  `mediapipe`, `faster-whisper` (→ `ctranslate2`), `opencv-python`, `moviepy`, `yt-dlp`.
  Confirm before building — `engine_server.spec` now prints a loud warning for each package
  whose `collect_all()` fails, and an `INCOMPLETE BUILD` banner at the end. **Never ship an
  exe whose build log contains that banner.**
- `torch` is **optional** and not in `engine/requirements.txt`. Every import site is guarded
  (`video_processor.py:137`, `whisper_transcriber.py:7`, `system_guard.py:85`); without it the
  engine falls back to CPU encoders and CPU Whisper. If you do want CUDA NVENC detection and
  GPU Whisper, install a CUDA build explicitly (see the comment block at the bottom of
  `engine/requirements.txt`).

### Runtime prerequisites on the *target* machine
- Nothing. The installer is per-user (`oneClick: false`, `perMachine` unset), installs to
  `%LOCALAPPDATA%\Programs\ClipVault`, and needs no separate Python or FFmpeg — FFmpeg comes
  from `imageio-ffmpeg`, which is bundled by the spec.
- If `engine_server.exe` fails on a clean VM with a `VCRUNTIME140.dll` / `MSVCP140.dll`
  error, install the **VC++ 2015–2022 x64 redistributable** there. Verify this on the VM
  rather than assuming PyInstaller collected the CRT DLLs.

### Environment variables
The engine reads `GEMINI_API_KEY` from the process environment (`engine/config.py:50`,
`load_dotenv()`). In **development** that comes from `engine/.env` (there is also a root
`.env`; both are gitignored and both are excluded from the installer by the
`"!**/.env*"` filter in `build.files`). In the **packaged app** no `.env` is shipped: the
end user supplies their Gemini key through the app's Engine Settings UI, and it is sent
with each render request (`engine/server.py:641`). So a release never contains API keys —
do not "fix" that by adding a `.env` to `extraResources`.

---

## 2. Step 1 — Engine bundle (`engine_server.spec`)

```powershell
npm run build:python
```

- Run it **from the repository root**: the spec resolves `engine/` and `public/icon.ico`
  relative to the current working directory.
- The spec is a **onedir** build (`COLLECT`), not onefile: `dist_python/engine_server/`
  contains `engine_server.exe` plus an `_internal/` folder holding the Python runtime,
  `mediapipe`/`ctranslate2`/`opencv` DLLs and the model files.
- `upx=False` is deliberate (see the comment in the spec). UPX-packing native ML DLLs causes
  "DLL load failed" at runtime and is a well-known antivirus false-positive trigger. Do not
  re-enable it to shave installer size.
- `datas` ships **data only**: `engine/assets/fonts/**`, `engine/models/**`
  (`blaze_face_short_range.tflite`, `face_detection_yunet.onnx`, the OpenCV cascades) and
  `engine/bg_music/**`. Python source (`engine/services/**`, `engine/styles/**`,
  `engine/utils/**`, `engine/config.py`) is compiled into the PYZ archive through the import
  graph — never copied in as readable `.py` text. If you re-add a `.py` folder to `datas`
  you are shipping your source code inside the product.
- Package version detail: `engine/models/` must stay in `datas` — it is *opened as a file* at
  runtime (`face_tracker.py`), not imported.
- Smoke test the bundle **before** touching electron-builder:
  ```powershell
  # Terminal 1
  $env:CLIPVAULT_ENGINE_DATA = "$env:TEMP\cv-engine-smoke"
  .\dist_python\engine_server\engine_server.exe
  # Terminal 2
  curl.exe http://127.0.0.1:8000/api/health
  ```
  `engine_server.exe` is built as a **windowed** app (`console=False`), so it prints nothing
  to the console — if it exits instantly, run it from a `cmd` window and check
  `%TEMP%\cv-engine-smoke` for logs, or temporarily rebuild with `console=True`.

## 3. Step 2 — Renderer bundle (`vite build`)

```powershell
npm run build
```

- Output is `dist/` (Vite's default `outDir`; `vite.config.ts` does not override it).
  `base: './'` produces relative asset URLs, which is what `electron/main.js` needs when it
  loads the bundle with `mainWindow.loadFile('../dist/index.html')`.
- `dist/index.html` **must exist** before electron-builder runs — `build.files` ships
  `dist/**/*`, and `main.js` hardcodes `path.join(__dirname, '../dist/index.html')`.
  A missing `dist/` produces an installer whose window stays blank.
- Every renderer dependency is bundled here by Vite, which is why `package.json` keeps
  React/MUI/Radix/recharts in `devDependencies` with **only `electron-updater`** as a
  production dependency. If you ever move a renderer package back into `dependencies`,
  electron-builder will ship a second copy of it inside `app.asar` — that is the single
  biggest installer-size regression you can cause.

## 4. Step 3 — Installer (`electron-builder`)

```powershell
npm run build:dist      # engine + renderer + installer, no upload
# or
npm run publish:dist    # same, then upload to GitHub Releases
```

Relevant `package.json` → `build` settings (unchanged by this guide, listed for orientation):

| Key | Value | Effect |
| --- | --- | --- |
| `appId` | `com.clipvault.app` | AUMID / NSIS identity |
| `productName` | `ClipVault` | Installer + artifact name (`ClipVault Setup <version>.exe`) |
| `directories.output` | `release` | All artifacts land in `release/` (gitignored) |
| `directories.buildResources` | `public` | `public/icon.ico` is the build resource icon |
| `asar` | `true` | `dist/`, `electron/`, `public/`, `package.json` and `node_modules/electron-updater` are packed into `resources/app.asar` |
| `npmRebuild` | `false` | Fine: no native Node modules are used |
| `win.target` | `nsis`, x64 | One installer, per-user |
| `extraResources` | `dist_python/engine_server` → `engine_server` | The engine bundle |
| `publish` | `github` / `jmarkTheDeveloper` / `ClipVault-Releases` | Update feed |

> **`files` must not re-add `"!node_modules/**/*"`.** That exclusion strips every production
> dependency from `app.asar`, and because `electron/main.js` does a top-level
> `import updaterPkg from 'electron-updater'`, the packaged app then dies before it can open
> a window. Production dependencies are picked up automatically; devDependencies are pruned.

### Where the engine binary must land

`electron/main.js` resolves the backend as:

```js
path.join(process.resourcesPath, 'engine_server', 'engine_server.exe')
```

so inside an installed app it must be at:

```
%LOCALAPPDATA%\Programs\ClipVault\resources\engine_server\engine_server.exe
%LOCALAPPDATA%\Programs\ClipVault\resources\engine_server\_internal\…      (required siblings!)
```

That is exactly what `extraResources[0]` (`from: dist_python/engine_server`,
`to: engine_server`) produces. Consequences:

- You must copy the **whole** `dist_python/engine_server` folder, including `_internal/`.
  Copying only the `.exe` yields a backend that exits immediately.
- If `dist_python/engine_server` does not exist when electron-builder runs, electron-builder
  only *warns* about the missing source and still produces an installer — one that ships no
  engine. Always check the build log and then check `release/win-unpacked/resources/engine_server/`.
- Do **not** put the engine in `extraFiles` or under `dist/`: `app.asar` is a single archive,
  and `main.js` expects the exe on the real filesystem at `process.resourcesPath`.
- At runtime the engine's writable data directory is `%APPDATA%\ClipVault\engine_data`
  (passed via `CLIPVAULT_ENGINE_DATA`, see `engine/config.py:19-32`). Clip output, temp
  files, thumbnails and settings live there, not in Program Files.

---

## 5. Testing the installer on a clean VM

A "clean VM" means a Windows image that never had Node, Python, FFmpeg or ClipVault on it.
Take a snapshot first; every verification below is disposable.

1. **Snapshot the VM** (Windows 10 22H2 and Windows 11 23H2 are the two configurations worth
   testing).
2. Copy `release\ClipVault Setup <version>.exe` into the VM.
3. **Do not** disable SmartScreen or Defender before the first run — the unsigned-signature
   experience *is* one of the things under test (see §7).
4. Install it. Confirm the install directory now contains
   `resources\engine_server\engine_server.exe` **and** `resources\engine_server\_internal\`.
5. Launch from the Start-menu shortcut. Check, in order:
   - the window opens and renders the UI (proves `dist/index.html` + `app.asar` are intact);
   - `http://127.0.0.1:8000/api/health` answers (proves the engine started);
   - `%APPDATA%\ClipVault\engine_data\` gets created (proves config/paths work when
     `sys._MEIPASS` is in play);
   - Task Manager shows exactly one `engine_server.exe`, and closing the app removes it.
6. Run a real render end-to-end with a short local file: transcription (faster-whisper),
   face tracking (mediapipe + `models/*.tflite`), captions (fonts from `assets/fonts`), and
   the hardware encoder path. These are the parts that a broken `datas`/`upx`/`collect_all`
   setup breaks, and they only fail at runtime.
7. Check Add/Remove Programs: name `ClipVault`, publisher shows your signing name (or
   "Unknown publisher" while unsigned), and uninstall leaves `engine_data` alone
   (`deleteAppDataOnUninstall: false`).
8. Reboot and relaunch once — catches stale-socket and zombie-process handling on port 8000.
9. **Upgrade test:** install the previous released version, publish a newer release, then let
   the running app find and install the update (§6). Verify the version in
   `%APPDATA%\ClipVault`-level app data / the installer log actually changed.

---

## 6. Auto-update: the feed must exist before updates can ship

`electron/main.js:setupAutoUpdater()` calls `autoUpdater.checkForUpdatesAndNotify()` 8 s
after the window is ready, and `electron/preload.cjs` exposes the UI hooks. The provider is
configured in `package.json`:

```json
"publish": [{ "provider": "github", "owner": "jmarkTheDeveloper", "repo": "ClipVault-Releases" }]
```

`electron-updater`'s GitHub provider reads the **newest published release** of
`jmarkTheDeveloper/ClipVault-Releases` and looks for a `latest.yml` asset in it. That file is
generated by electron-builder next to the installer and contains the version and the
installer's SHA-512, so it is the actual update feed.

> **Status check (verified):**
> `https://api.github.com/repos/jmarkTheDeveloper/ClipVault-Releases/releases` returns `[]`
> — that repository has **zero releases**. Until a release with a `latest.yml` asset exists
> there, `checkForUpdatesAndNotify()` can only ever report "no update", and no customer will
> ever receive an automatic update. This is a distribution blocker, not a code bug.

To actually ship an update:

1. Bump `version` in `package.json` (e.g. `1.0.0` → `1.0.1`). The version in `latest.yml`
   comes from here.
2. Build **and** upload with a token that can write to `ClipVault-Releases`:
   ```powershell
   $env:GH_TOKEN = "<token with repo scope on jmarkTheDeveloper/ClipVault-Releases>"
   npm run publish:dist
   ```
   (`electron-builder`'s GitHub provider takes `GH_TOKEN`/`GITHUB_TOKEN`. `build:dist` and
   `build:electron` pass `--publish never` and upload nothing.)
3. In the `ClipVault-Releases` repo, confirm the new release is **published** — a *draft* or
   *prerelease* release is invisible to `electron-updater`. Assets must include
   `ClipVault Setup <version>.exe`, `…exe.blockmap` and `latest.yml`.
4. `latest.yml` must describe the *newest* version; if an older release is left published as
   "latest", clients will silently stay behind.
5. The source repository (`jmarkTheDeveloper/ClipVault-Desktop-AI-Clipping-`) is **not** the
   update feed. Pushing code there does not update anybody.

There is no staging channel configured (`detectUpdateChannel` / `generateUpdatesFilesForAllChannels`
are unset), so every published release goes to every user immediately. If you want a beta
ring, add a channel and build with `--config.publish.channel=beta`.

---

## 7. Code signing (Windows)

### Why it matters
An unsigned NSIS installer produces an executable with no Authenticode signature. Windows
therefore reports the publisher as **"Unknown publisher"**:

- SmartScreen shows the full-screen blue **"Windows protected your PC"** dialog the first
  time a user runs the installer; users must click *More info → Run anyway*.
- Defender and third-party AV heuristics score unsigned, freshly-downloaded installers as
  suspicious — this app also spawns `python`-like child processes and writes to
  `%APPDATA%`, which does not help.
- Reputation in SmartScreen is attached to the signing certificate, so you cannot "build up"
  reputation while unsigned.

### What to buy

| Option | Typical cost | Notes |
| --- | --- | --- |
| **OV code-signing certificate** | ~US$200–400/yr | Organization-validated. Since the June 2023 CA/Browser Forum rules the private key must live in FIPS 140-2 Level 2 hardware, so in practice you buy the CA's **cloud signing** service (DigiCert KeyLocker, SSL.com eSigner, Sectigo, GlobalSign) instead of a loose `.pfx`. SmartScreen reputation accrues per certificate as downloads accumulate; expect warnings early on. |
| **EV code-signing certificate** | ~US$400–700/yr | Extended validation, hardware token or cloud HSM. Historically granted immediate SmartScreen reputation; Microsoft no longer *guarantees* instant reputation, but EV remains the fastest path and is required by some enterprise procurement. |
| **Azure Trusted Signing** (Microsoft, formerly "Azure Code Signing") | ~US$10/month | Microsoft-issued short-lived certificates signed through their service — the cheapest modern option and the least CI plumbing. Requires an Azure subscription, a completed **identity validation** of the legal entity (Microsoft currently requires roughly 3+ years of verifiable business history), and a **certificate profile**. electron-builder 26 has first-class support. |

Pick one; do not ship a public release without it.

### Configuring electron-builder 26

> **Correction to the older documentation.** In electron-builder **26.15.3** the flat keys
> `win.certificateFile` and `win.signingHashAlgorithms` are **no longer valid** `win`
> properties — verified against `node_modules/app-builder-lib/scheme.json`, where
> `WindowsConfiguration` exposes only `signtoolOptions`, `azureSignOptions`,
> `verifyUpdateCodeSignature`, `forceCodeSigning`, `signAndEditExecutable`, … and
> `certificateFile` / `certificatePassword` / `certificateSha1` / `certificateSubjectName` /
> `signingHashAlgorithms` / `publisherName` / `rfc3161TimeStampServer` now live under
> **`win.signtoolOptions`**. Putting them at the `win` level will be rejected by schema
> validation.

**A. Certificate file / cloud-signing wrapper (`signtoolOptions`)**

```jsonc
"win": {
  "signtoolOptions": {
    "certificateFile": "certs/clipvault-codesign.pfx",     // never commit; prefer a CI secret
    "certificatePassword": "${env.CSC_KEY_PASSWORD}",
    "signingHashAlgorithms": ["sha256"],
    "publisherName": "ClipVault Studio LLC",
    "rfc3161TimeStampServer": "http://timestamp.digicert.com"
  }
}
```

`certificateFile` accepts either a filesystem path or a base64-encoded blob, which is how CI
passes the certificate without writing a `.pfx` to disk (via the `CSC_LINK` and
`CSC_KEY_PASSWORD` environment variables; `${env.VAR}` expansion works in these values).
Timestamping is not optional: without an RFC-3161 timestamp the signature becomes permanently
invalid the moment the certificate expires.

**B. Azure Trusted Signing**

```jsonc
"win": {
  "azureSignOptions": {
    "publisherName": "ClipVault Studio LLC",
    "endpoint": "https://eus.codesigning.azure.net/",
    "codeSigningAccountName": "clipvault-signing",
    "certificateProfileName": "clipvault-public-trust",
    "fileDigest": "SHA256",
    "timestampRfc3161": "http://timestamp.acs.microsoft.com",
    "timestampDigest": "SHA256"
  }
}
```

CI authenticates with `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET`
(a federated credential is preferable). `endpoint` must match the region of the Trusted
Signing account; `publisherName` must match the **exact legal name** on the certificate
or the signature/verification steps fail.

**Signing is also an update-security control.** `verifyUpdateCodeSignature` defaults to
`true`, which makes the updater compare the signer of the downloaded installer against the
configured publisher name. With no signing configured there is no publisher name to compare
against, so that check cannot protect anyone — another reason to sign before enabling the
public update feed.

Also add the certificate material to `.gitignore` (`*.pfx`, `*.p12`) and store it in the CI
secret store, never in the repository.

---

## 8. Release checklist

```
[ ] version bumped in package.json (drives installer name + latest.yml)
[ ] package.json / package-lock.json in sync (npm ci works from a clean clone)
[ ] engine/requirements.txt installed in a clean venv; pyinstaller present
[ ] npm run build:python   -> no "INCOMPLETE BUILD" banner in the log
[ ] engine_server.exe smoke-tested locally (/api/health)
[ ] npm run build          -> dist/index.html present
[ ] npm run build:dist     -> release/ contains the installer, .blockmap and latest.yml
[ ] release/win-unpacked/resources/engine_server/_internal/ exists
[ ] installer tested on a clean VM, including a real end-to-end render (§5)
[ ] installer signed; publisher name shown in file Properties -> Digital Signatures
[ ] GH_TOKEN set; npm run publish:dist
[ ] release in ClipVault-Releases is PUBLISHED (not draft/prerelease) with latest.yml attached
[ ] upgrade test from the previous released version
[ ] git status clean of release/, dist_python/, build_python/, *.asar, .env, test_*.mp4
```

## 9. Known gaps

- **`engine/requirements.txt` is currently untracked** (`engine/.gitignore` contains a bare
  `*.txt` rule). A fresh clone therefore has no Python requirements file, so the README's
  install step cannot work until the file is force-added (`git add -f engine/requirements.txt`)
  or `engine/.gitignore` gains a `!requirements.txt` exception.
- **No published release exists in the update feed repo**, so auto-update is inert (§6).
- **No code signing is configured**, so the installer shows "Unknown publisher" (§7).
- **Auto-push is opt-in.** `sync.cjs` and `auto_git_watch.cjs` do nothing unless
  `CLIPVAULT_AUTO_PUSH=1` is set; they run `git add .` and push the whole working tree to a
  public remote, so leaving them disabled is intentional. See §8's last checkbox.
- `test_*.mp4` files and `engine/clips/**` in the working tree are gitignored local test
  artefacts. They are *not* part of the app: `build.files` excludes `clips/**`, `temp/**`,
  `backgrounds/**` and `!*.py`/`!*.spec`/`!*.bat`/`!*.vbs`, so they cannot reach `app.asar`.
  Verify with `npx asar list release/win-unpacked/resources/app.asar` after a build.
