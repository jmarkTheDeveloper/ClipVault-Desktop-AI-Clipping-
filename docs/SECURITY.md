# ClipVault — Security Model & Findings Register

This document describes how ClipVault is secured, what was wrong before the
security remediation, and which risks are knowingly accepted. It is written for
anyone who will maintain, audit or resell this software.

Last reviewed: security remediation pass (see `CHANGELOG.md`).

---

## 1. Threat model

ClipVault is a desktop application. Three facts shape every decision below:

1. **The engine is an unauthenticated-looking local HTTP API.** The Python engine
   binds `127.0.0.1:8000` only. Any process running as the same user — and, if the
   API were browser-reachable, any web page the user visits — can send it requests.
   A loopback bind is *not* an authorization boundary.
2. **The renderer cannot use origin-based checks.** The Electron window runs with
   `webSecurity: false` (required so local media plays without CORS friction), and
   in production it loads from `file://`. Chromium therefore sends **no `Origin`
   header at all** for the app's own requests, and `Sec-Fetch-Site` is reported as
   `cross-site` because the UI is served from `localhost:<port>` while the engine is
   on `127.0.0.1`. Any security model based on `Origin` alone is therefore unusable
   for the desktop shell.
3. **Customer secrets live locally.** Users store their own Gemini/OpenAI/Groq keys
   (encrypted with Windows DPAPI under `~/.clipvault`), so the API is worth attacking
   from inside the machine.

## 2. Authentication: the session token

Because `Origin` is unavailable, identity is proven with a **per-session 256-bit
secret**:

* `electron/main.js` generates `BACKEND_AUTH_TOKEN = crypto.randomBytes(32)` at
  startup and passes it to the engine as the `CLIPVAULT_AUTH_TOKEN` env var.
* The engine reads it into `AUTH_TOKEN` and compares it in constant time
  (`hmac.compare_digest`) against the `X-App-Auth-Token` header.
* The token is stamped onto **every** request the renderer makes to the engine at
  the network layer, via
  `session.defaultSession.webRequest.onBeforeSendHeaders` — not by patching
  `window.fetch` in the preload. This matters: under `contextIsolation: true` a
  preload `fetch` patch lives in an isolated world and never reaches the React app,
  and it could not cover `<img>`/`<video>` subresources (thumbnails, `/stream`) at
  all.
* The middleware enforces the token on **every route except `PUBLIC_PATHS`**
  (`/api/health`, `/docs`, `/redoc`, `/openapi.json`). There is **no loopback
  exemption**.
* If `CLIPVAULT_AUTH_TOKEN` is unset (someone runs the engine standalone for
  development) the engine prints a loud `[SECURITY WARNING]` and skips the token
  check, because there is no secret to compare. The packaged app always sets it.

Consequence worth knowing: a plain browser pointed at `http://localhost:54321`
(Vite dev server) can no longer call the API, because it has no token. That is
intended — Electron is the supported entry point.

## 3. Origin policy and CORS

* `ALLOWED_ORIGIN_PATTERNS` trusts only `http://localhost:<port>`,
  `http://127.0.0.1:<port>` and `app://-`.
* **Opaque origins (`Origin: null`, `file://`) are deliberately NOT trusted.** They
  are forgeable by any sandboxed iframe on any website; the server previously
  answered them with `Access-Control-Allow-Origin: null` **and**
  `Access-Control-Allow-Credentials: true`, which let a remote page *read* local
  responses. The desktop shell does not need them (see §1.2).
* `allow_credentials=False` — the app uses no cookies, so reflecting an origin with
  credential access would only widen the surface.
* The request middleware is mounted **outside** `CORSMiddleware`, so refused requests
  never receive CORS headers.

## 4. Filesystem access: the path jail

Every client-supplied path is resolved through helpers in `engine/server.py`:

| Helper | Purpose |
|---|---|
| `safe_path(requested, roots, *, must_exist, allowed_ext, label, basename_fallback)` | Resolves a path and refuses it unless it lands inside one of `roots`. Accepts absolute paths only when they are already inside a root (the UI legitimately sends absolute clip paths). Raises 400 / 403 / 415 / 404. |
| `safe_name(value, *, label)` | Validates a single folder/file name — no separators, no `..`, no drive letters. |
| `safe_upload_name(filename, *, allowed_ext)` | Reduces an upload to a safe basename so a crafted `filename` can never traverse. |

Allowed roots are the app's own media directories (`OUTPUT_DIR`, `BACKGROUNDS_DIR`,
`MUSIC_DIR`).

Deliberate exceptions, each with a rationale:

* **`/stream`** must serve media the user picked from anywhere on their disk (the
  Local Upload feature). It keeps a sensitive-path keyword blocklist and a media
  extension allowlist instead of a root jail. It is token-protected.
* **Export/copy destinations** are folders the user chooses, so they are validated
  as absolute existing directories (UNC paths rejected) rather than jailed.

## 5. Findings register

Status legend: **Fixed** = code change, regression-tested in `qa/run_qa.py`;
**Owner action** = cannot be done from the codebase.

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `/api/download_clip` served any file (`?file=../../.env`, `?file=C:/Windows/win.ini`) — unauthenticated arbitrary file read, reproduced byte-for-byte | Critical | Fixed |
| 2 | Auth middleware short-circuited for loopback clients, so the session token was dead code and any local process could read `/api/vault_keys` (customer API keys) and delete files | Critical | Fixed |
| 3 | `Origin: null` + `Allow-Credentials: true` let a remote web page read local API responses (chainable with #1) | Critical | Fixed |
| 4 | Live Google API key committed to git history and hardcoded in `video_qa_service.py` / `AskStudioPanel.tsx`, then compiled into the shipped renderer bundle and `engine_server.exe` | Critical | Fixed in source · **Owner action: rotate the key and purge history** |
| 5 | Licence bypass: master keys hardcoded, master key pre-filled in the activation dialog, X button unlocked the app, no engine-side check | Critical | Fixed |
| 6 | `/api/delete_clips` accepted absolute paths verbatim (`resolve_target`) | High | Fixed |
| 7 | `/api/thumbnail` had no jail and ran ffmpeg on any path | High | Fixed |
| 8 | Duplicate `POST /api/copy_clips` registration shadowed an auth-guarded handler | High | Fixed (single route) |
| 9 | `local://` protocol handler served any absolute path to the renderer | High | Fixed (allow-listed roots) |
| 10 | Upload filenames used unsanitised (`BACKGROUNDS_DIR / file.filename`) | Medium | Fixed |
| 11 | `engine_server.spec` shipped `engine/services` as readable `.py` source (publishing the key above) | High | Fixed |
| 12 | `/api/shutdown` always raised `NameError` (no module-level `import time`) | Medium | Fixed |
| 13 | Package config `!node_modules/**/*` stripped production deps → packaged app could not start | Critical | Fixed |
| 14 | `package.json` shipped 60 renderer-only packages as runtime dependencies (installer bloat) | Medium | Fixed |
| 15 | `webSecurity: false` on the production window | High | **Accepted** — required for local media playback; mitigated by the token, the path jail, the `local://` allowlist and the navigation/window-open guards. Do not flip this without replacing the media loading path. |
| 16 | Any same-user process can read the engine's token env var | Medium | **Accepted** — an attacker with the user's privileges already has their files; the token stops *remote* pages and unrelated low-privilege surfaces. |
| 17 | Installer unsigned / updater feed has zero releases | High | **Owner action** — see `docs/BUILD.md` §code signing |
| 18 | `GH_TOKEN` (GitHub PAT) present in the untracked root `.env` | Medium | **Owner action: rotate; never ship the folder containing `.env`** |

## 6. Secrets handling

* No credential is hardcoded anywhere in `engine/**`, `src/**` or `electron/**`
  (asserted by `qa/run_qa.py` check E6).
* User API keys live either in the OS environment / a gitignored `.env`, or in the
  DPAPI-encrypted vault (`services/vault_crypto.py`) under `~/.clipvault`.
* `.env` is gitignored, and `engine/.gitignore` now explicitly re-includes
  `requirements*.txt` (a bare `*.txt` rule had been hiding the dependency manifest).
* Build outputs (`release/`, `dist_python/`, `build_python/`, `*.asar`) and
  `*-player-script.js` dumps are gitignored.
* The auto-push helper scripts (`sync.cjs`, `auto_git_watch.cjs`) now require
  `CLIPVAULT_AUTO_PUSH=1`; previously they ran `git add .` → commit → push on any
  source edit, which could have published build artifacts or `.env`.

## 7. Licensing integrity (summary)

Full detail, including the licence format and key management, is in
`docs/HANDOFF.md`. In short: licences are Ed25519-signed blobs verified **offline**
by the engine using an embedded public key; the private key never ships; the render
path is gated in the engine (not just the UI); and enforcement is `warn` in
development and `enforce` in a packaged build.

## 8. Verifying the guarantees

```
python qa/run_qa.py            # boots a real engine and replays the original exploits
python tools/test_licensing.py # licence signature / tamper / expiry / machine-binding
```

`qa/run_qa.py` is a regression suite, not a smoke test: checks B1–B6, C1–C5 and
A1–A6 correspond one-to-one with the exploits that were reproduced live during the
audit. If any of them starts passing when it should fail (or vice versa), treat it
as a build blocker.

## 9. Reporting a vulnerability

Do not open a public issue for a security problem. Contact the maintainer privately
with: the affected endpoint or file, a minimal reproduction, and the impact. Please
allow time for a fix and a release before disclosing.
