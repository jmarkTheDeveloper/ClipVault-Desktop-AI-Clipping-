# ClipVault — Developer Handoff

Everything a new maintainer needs to run, modify, verify and ship ClipVault.
Read this first, then `docs/BUILD.md` (build/release) and `docs/SECURITY.md`
(threat model, findings register, accepted risks).

---

## 1. Status snapshot

| Area | State |
|---|---|
| Core pipeline (download → transcribe → score → reframe → caption → render) | Working end to end |
| Security remediation (audit findings) | Done — see `docs/SECURITY.md` §5 register |
| Runtime bug remediation (crashes, polls, temp, tasks) | Done |
| Engine-enforced licensing | Done (`warn` in dev, `enforce` when packaged) |
| Packaging config | Fixed, **not yet validated with a real installer build** |
| Repo hygiene | Done (junk removed, auto-push gated, requirements tracked) |
| Automated QA | `qa/run_qa.py` + `tools/test_licensing.py` |

**Manual steps that only the owner can complete** (the code cannot do these):

1. **Rotate the leaked Google API key** and the GitHub PAT, then purge git history
   (`git filter-repo`) — see `docs/SECURITY.md` §5, findings 4 and 18.
2. **Generate the licence keypair** and keep the private key offline (§5 below).
3. **Build and test one real installer on a clean VM**, then sign it (`docs/BUILD.md`).
4. **Publish a release** so the auto-updater feed is non-empty.

## 2. Architecture

Two OS processes plus the UI:

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│ Electron main (Node)        │ spawns  │ Python engine (FastAPI)      │
│  electron/main.js           │────────▶│  engine/server.py            │
│  · window + IPC             │  env:   │  · binds 127.0.0.1:8000      │
│  · installEngineAuthHeader  │  CLIPVAULT_AUTH_TOKEN                │
│  · local:// allowlisted     │  CLIPVAULT_ENGINE_DATA               │
└───────────┬─────────────────┘  CLIPVAULT_PACKAGED                  │
            │ renderer                                               │
            ▼                                                        │
┌─────────────────────────────┐   HTTP + X-App-Auth-Token             │
│ React renderer (Vite)       │──────────────────────────────────────┘
│  src/  (dev: localhost:54321, prod: file://)
└─────────────────────────────┘
```

* **Ports:** UI `54321` (Vite, dev only); engine `8000` (loopback only).
* **Speech/render happens in a worker thread** inside the engine
  (`execute_rendering_task`), reporting progress through an in-memory `tasks_db`
  polled via `/api/progress/<task_id>` and `/api/status/<task_id>`.
* **Data locations:** dev writes into `engine/clips`, `engine/temp`. Packaged builds
  pass `CLIPVAULT_ENGINE_DATA = %APPDATA%\ClipVault\engine_data`, so clips/temp live
  under the user profile — never inside the install directory.
* **Frozen app (production only):** users' API keys are DPAPI-encrypted in
  `~/.clipvault`; the licence lives in `~/.clipvault/license.json`.

## 3. Repository map

| Path | What it is |
|---|---|
| `engine/server.py` | The whole HTTP API + auth middleware + path jail helpers |
| `engine/services/` | Pipeline stages: `video_processor` (orchestrator), `whisper_transcriber`, `face_tracker`, `caption_maker`, `ai_selector`, `youtube_downloader_yt_dlp`, `license_service`, … |
| `engine/utils/helpers.py` | Temp-dir ownership (`make_task_temp_dir`, `cleanup_task_temp_dir`, `cleanup_temp_files`) |
| `engine/config.py` | Paths and env configuration |
| `electron/main.js` | Window, backend spawn, IPC, network-layer auth header, `local://` handler |
| `electron/preload.cjs` | `contextBridge` surface (`window.electronAPI`) |
| `src/app/` | React UI (`screens/`, `components/clipper/`) |
| `qa/run_qa.py` | Security + functional regression suite |
| `tools/mint_license.py` | Owner-side licence signer (never bundled) |
| `docs/` | `BUILD.md`, `SECURITY.md`, this file |
| `engine_server.spec` | PyInstaller spec for the bundled engine |

Dead code still in the tree: `src/app/screens/editor/**`, `HomeScreen.tsx`,
`LoginScreen.tsx`, `AiChatVideoScreen.tsx` are not reachable from `App.tsx`'s
`Screen` union. They are harmless but should be deleted in a future cleanup.

## 4. Setting up a dev environment

```powershell
# 1. Node deps (the renderer + Electron main)
npm install

# 2. Python engine deps — note the path; there is no root requirements file
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r engine/requirements.txt

# 3. Optional local configuration (never commit this file)
copy .env.example .env      # then fill in GEMINI_API_KEY etc.

# 4. Run the full desktop app (Vite + Electron + engine)
npm run dev:electron
```

`npm run dev` alone only starts Vite — no Electron, no engine — so API calls fail.

Important behaviour: the engine requires `X-App-Auth-Token` on every route. When
Electron spawns it, the token is injected automatically. If you run the engine by
hand for debugging it will log `[SECURITY WARNING] ... running WITHOUT
authentication`, and any client (e.g. `curl`) can then call it freely — that is
development-only behaviour by design.

## 5. Licensing

**Model:** offline asymmetric verification. The engine holds only a public key; the
private key stays with the vendor and signs licence blobs.

**Blob format**

```
CV1.<base64url(canonical-json payload)>.<base64url(ed25519 signature)>
```

Payload fields: `v` (1), `key` (id), `email`, `plan` (`lifetime|pro|trial`),
`machine` (fingerprint, or `null` for a portable licence), `iat`, `exp` (or `null`),
`activations`. The signature covers the canonical JSON
(`json.dumps(payload, sort_keys=True, separators=(",", ":"))`).

**Machine fingerprint:** sha256 of the Windows `MachineGuid`
(`HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`), truncated to 24 hex chars;
falls back to hostname + username. `python tools/mint_license.py fingerprint` prints
the current machine's value.

**Configuration**

| Env var | Meaning |
|---|---|
| `CLIPVAULT_LICENSE_PUBKEY` | Ed25519 public key (hex or base64 raw 32 bytes) |
| `CLIPVAULT_LICENSE_MODE` | `off` \| `warn` \| `enforce` |
| `CLIPVAULT_PACKAGED` | Set to `1` by Electron in a packaged build |

Default mode is **`enforce` when `CLIPVAULT_PACKAGED=1`, otherwise `warn`** — so
developers are never blocked, and customers are actually gated. With no public key
configured, `enforce` refuses to render with a clear "build misconfigured" message
(that is a real release blocker, not a customer problem).

**Enforcement point:** `VideoProcessor.process()` (and the re-render path) call
`require_render_license()`. This is deliberate — gating at the render layer means
every entry point is covered, not just the ones the UI happens to use. The UI gate
is cosmetic UX; the engine is authoritative.

**Vendor workflow**

```powershell
python tools/mint_license.py keygen --out C:\keys\clipvault_private.pem   # once
python tools/mint_license.py fingerprint                                  # per customer
python tools/mint_license.py mint --private-key C:\keys\clipvault_private.pem `
       --email buyer@example.com --plan lifetime --machine <fingerprint>
```

Put the printed **public** key into `CLIPVAULT_LICENSE_PUBKEY` at build time (or ship
`engine/license_public_key.txt`). **Never commit the private key** — `*.pem`,
`*.pfx` and `*.p12` are gitignored, but keep it off the build machine entirely if you
can. To sell through Lemon Squeezy, sign blobs in the webhook handler with the same
private key and return the blob from your signing endpoint
(`CLIPVAULT_LICENSE_SIGN_ENDPOINT`).

## 6. Quality assurance

```powershell
python qa/run_qa.py             # starts a real engine, replays the original exploits
python tools/test_licensing.py  # signature, tamper, expiry, machine binding
npx tsc --noEmit                # must be clean
npx vite build                  # must succeed
```

`qa/run_qa.py` boots the engine on a spare port with a known token and asserts, among
others: `/api/download_clip?file=../../.env` → 403, `C:/Windows/win.ini` → 403, a
canary file outside the vault survives `/api/delete_clips`, `Origin: null` gets no
`Access-Control-Allow-Origin`, the token is required on protected routes, and static
source invariants hold (no hardcoded credentials, one `copy_clips` route, no early
`return` above hooks in the three components that had that crash).

Treat a failing QA check as a release blocker.

## 7. Conventions

* **One writer per file.** Multiple agents/people editing the same file at once has
  already caused a duplicated FastAPI route that silently removed an auth check.
* **Never commit credentials.** Keys come from env/`.env` or the encrypted vault.
  `qa/run_qa.py` asserts none are hardcoded in shipped source.
* **Paths from the client always go through `safe_path` / `safe_name` /
  `safe_upload_name`.** No `SOME_DIR / <client string>` anywhere.
* **React hooks must be unconditional.** An early `return` above a `useState` crashes
  the whole app via the ErrorBoundary; three components had this bug.
* **Per-task temp dirs.** A render cleans up only `TEMP_DIR/task_<id>/`.
* Run `qa/run_qa.py` + `tsc --noEmit` before any commit that touches engine or UI.

## 8. Known gaps

* No packaged installer has been produced or tested end to end (§1).
* No CI pipeline; `package-lock.json` is the only lockfile (no pnpm lock).
* No unit-test framework for the React app (no jsdom/react-test-renderer installed),
  so UI verification is `tsc` + `vite build` + the QA harness.
* `/stream` intentionally serves user-chosen media from anywhere on disk (see
  `docs/SECURITY.md` §4).
* `webSecurity: false` remains (see `docs/SECURITY.md` §5, finding 15).
