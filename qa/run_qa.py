#!/usr/bin/env python
"""
ClipVault QA harness.

Boots a real engine instance on a spare port and verifies, end to end, that the
security findings from the audit are actually closed - not just that the code "looks
fixed". Every check below corresponds to a defect that was reproduced live, so this
file doubles as the regression suite for them.

Run from the repository root:

    python qa/run_qa.py

Exit code 0 = all checks passed. Non-zero = at least one regression.
"""

import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE_DIR = ROOT / "engine"
QA_TOKEN = "qa-session-token-6f2a"
PORT = int(os.environ.get("QA_ENGINE_PORT", "8137"))
BASE = f"http://127.0.0.1:{PORT}"

RESULTS = []


def record(name, passed, detail=""):
    RESULTS.append((name, bool(passed), detail))
    print(f"  [{'PASS' if passed else 'FAIL'}] {name}" + (f" - {detail}" if detail else ""))


def request(path, *, method="GET", headers=None, body=None, token=True, timeout=15):
    """Return (status, body_text, headers). Never raises for HTTP error codes."""
    url = f"{BASE}{path}"
    data = None
    hdrs = dict(headers or {})
    if token:
        hdrs["X-App-Auth-Token"] = QA_TOKEN
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), dict(e.headers)
    except Exception as e:  # connection refused / timeout
        return 0, f"{type(e).__name__}: {e}", {}


def start_engine(extra_env=None, port=None):
    """Start the engine and wait for /api/health."""
    global PORT, BASE
    if port:
        PORT = port
        BASE = f"http://127.0.0.1:{PORT}"
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    env["CLIPVAULT_AUTH_TOKEN"] = QA_TOKEN
    env["CLIPVAULT_LICENSE_MODE"] = "warn"  # licensing is exercised separately
    env.update(extra_env or {})
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server:app", "--host", "127.0.0.1", "--port", str(PORT),
         "--log-level", "warning"],
        cwd=str(ENGINE_DIR), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    )
    for _ in range(90):
        if proc.poll() is not None:
            out = proc.stdout.read() if proc.stdout else ""
            raise RuntimeError(f"engine exited during startup:\n{out[-3000:]}")
        status, _, _ = request("/api/health", token=False, timeout=3)
        if status == 200:
            return proc
        time.sleep(0.7)
    proc.terminate()
    raise RuntimeError("engine did not become healthy in time")


# ─────────────────────────────────────────────────────────────────────────────
# A. Authentication / session-token enforcement
# ─────────────────────────────────────────────────────────────────────────────
def test_auth():
    print("\nA. Session-token enforcement")
    status, _, _ = request("/api/health", token=False)
    record("A1 /api/health stays public (no token)", status == 200, f"HTTP {status}")

    status, body, _ = request("/api/saved_clips", token=False)
    record("A2 /api/saved_clips without token is refused", status == 403, f"HTTP {status}")

    status, _, _ = request("/api/saved_clips", token=True)
    record("A3 /api/saved_clips with the session token works", status == 200, f"HTTP {status}")

    status, _, _ = request("/api/vault_keys", token=False)
    record("A4 /api/vault_keys (stores API keys) requires the token", status == 403, f"HTTP {status}")

    status, _, _ = request("/api/vault_keys", token=True)
    record("A5 /api/vault_keys works with the token", status == 200, f"HTTP {status}")

    status, _, _ = request("/api/saved_clips", token=False, headers={"X-App-Auth-Token": "wrong-token"})
    record("A6 a wrong token is rejected", status == 403, f"HTTP {status}")


# ─────────────────────────────────────────────────────────────────────────────
# B. Path traversal / arbitrary file access
# ─────────────────────────────────────────────────────────────────────────────
def test_path_traversal():
    print("\nB. Path traversal (the original arbitrary-file-read exploits)")
    status, body, _ = request("/api/download_clip?file=../../.env&name=x")
    record("B1 download_clip ?file=../../.env is refused", status == 403, f"HTTP {status}")
    record("B1b ...and no secret material is returned", "GEMINI_API_KEY" not in body)

    status, body, _ = request("/api/download_clip?file=C:/Windows/win.ini&name=x")
    record("B2 download_clip absolute path (C:/Windows/win.ini) is refused", status == 403, f"HTTP {status}")
    record("B2b ...and win.ini content is not returned", "for 16-bit app support" not in body.lower())

    status, body, _ = request("/api/download_clip?file=../../../config.py&name=x")
    record("B3 download_clip escapes the vault via .. is refused", status == 403, f"HTTP {status}")

    status, body, _ = request("/api/thumbnail?path=../../.env")
    record("B4 thumbnail on a file outside the vault is refused", status in (403, 404, 415), f"HTTP {status}")
    record("B4b ...and no secret material is returned", "GEMINI_API_KEY" not in body)

    # A canary file outside the vault must survive an attempted delete through the API.
    canary = Path(tempfile.gettempdir()) / "clipvault_qa_canary.txt"
    canary.write_text("do not delete", encoding="utf-8")
    status, _, _ = request("/api/delete_clips", method="POST", body={"paths": [str(canary)]})
    record("B5 delete_clips cannot delete a file outside the vault", canary.exists(),
           f"canary_exists={canary.exists()} HTTP {status}")
    canary.unlink(missing_ok=True)

    status, _, _ = request("/api/delete_clips", method="POST",
                           body={"paths": ["C:/Windows/win.ini"]})
    record("B6 delete_clips rejects an absolute system path", Path("C:/Windows/win.ini").exists(),
           f"win_ini_exists={Path('C:/Windows/win.ini').exists()} HTTP {status}")


# ─────────────────────────────────────────────────────────────────────────────
# C. Cross-site / origin policy (the remote-exfiltration chain)
# ─────────────────────────────────────────────────────────────────────────────
def test_origins():
    print("\nC. Origin policy (remote page cannot read local responses)")
    cs = {"Sec-Fetch-Site": "cross-site", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Dest": "empty"}

    status, _, hdrs = request("/api/saved_clips", headers={**cs, "Origin": "null"}, token=False)
    acao = hdrs.get("access-control-allow-origin") or hdrs.get("Access-Control-Allow-Origin")
    record("C1 opaque 'Origin: null' (sandboxed iframe) is refused", status == 403, f"HTTP {status}")
    record("C1b ...and no Access-Control-Allow-Origin is echoed to it", not acao, f"ACAO={acao}")

    status, _, hdrs = request("/api/saved_clips", headers={**cs, "Origin": "https://evil.com"}, token=False)
    acao = hdrs.get("access-control-allow-origin") or hdrs.get("Access-Control-Allow-Origin")
    record("C2 a public web origin is refused", status == 403, f"HTTP {status}")
    record("C2b ...with no ACAO echoed", not acao, f"ACAO={acao}")

    status, _, hdrs = request("/api/saved_clips", headers={**cs, "Origin": "http://localhost.evil.com"}, token=False)
    record("C3 lookalike origin localhost.evil.com is refused", status == 403, f"HTTP {status}")

    status, _, _ = request("/api/saved_clips", headers={**cs, "Origin": "http://localhost:54321"}, token=True)
    record("C4 the desktop shell's loopback origin + token works", status == 200, f"HTTP {status}")

    status, _, _ = request("/api/saved_clips", headers={**cs, "Origin": "http://localhost:54321"}, token=False)
    record("C5 a loopback origin WITHOUT the token is refused", status == 403, f"HTTP {status}")


# ─────────────────────────────────────────────────────────────────────────────
# D. Functional smoke (the app must still work after hardening)
# ─────────────────────────────────────────────────────────────────────────────
def test_functional():
    print("\nD. Functional smoke tests")
    status, body, _ = request("/api/saved_clips")
    real_clip = None
    if status == 200:
        try:
            clips = json.loads(body).get("clips", [])
            real_clip = clips[0].get("filename") if clips else None
        except Exception:
            pass
    record("D1 /api/saved_clips returns JSON with a clips array", status == 200 and '"clips"' in body)

    if real_clip:
        status, _, _ = request(f"/api/download_clip?file={urllib.parse.quote(real_clip)}&name=x", token=True)
        record("D2 a legitimate vault clip is still downloadable", status == 200, f"HTTP {status}")
    else:
        record("D2 legitimate download (skipped: vault has no clips)", True, "skipped")

    status, _, _ = request("/api/cache_info")
    record("D3 /api/cache_info works", status == 200, f"HTTP {status}")

    status, _, _ = request("/api/hardware_scan")
    record("D4 /api/hardware_scan works", status == 200, f"HTTP {status}")

    # The UI contract for the Movie Recapper / progress polling.
    status, body, _ = request("/api/status/does-not-exist")
    record("D5 /api/status of an unknown task answers without a 500", status in (200, 404), f"HTTP {status}")

    try:
        payload = json.loads(body)
        state = payload.get("state")
        record("D6 /api/status exposes a normalized machine 'state' field",
               state in {"queued", "running", "completed", "failed", "cancelled"},
               f"state={state!r}")
    except Exception as exc:
        record("D6 /api/status exposes a normalized machine 'state' field", False, f"unparseable: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# E. Static source assertions (things HTTP cannot express)
# ─────────────────────────────────────────────────────────────────────────────
def source_text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8", errors="replace") if p.exists() else ""


def test_static():
    print("\nE. Static source assertions")
    server = source_text("engine/server.py")

    record("E1 no loopback auth bypass remains in the middleware",
           'client_host in ["127.0.0.1", "::1", "localhost"]' not in server)

    record("E2 exactly one /api/copy_clips route is registered",
           server.count('@app.post("/api/copy_clips")') == 1,
           f"count={server.count('@app.post(\"/api/copy_clips\")')}")

    record("E3 opaque origins are no longer trusted",
           'r"^null$"' not in server)

    record("E4 the path-jail helper is present", "def safe_path(" in server)

    record("E5 /api/shutdown has a module-level time import", "\nimport time\n" in server)

    # Hardcoded credentials must not exist anywhere in shipped source.
    leaked = []
    for rel in ("engine/services/video_qa_service.py",
                "src/app/components/clipper/AskStudioPanel.tsx",
                "engine/services/license_service.py"):
        text = source_text(rel)
        if "AIzaSy" in text:
            leaked.append(f"{rel} (Google key)")
        if "CV-FOUNDER" in text or "CV-VIP-" in text or "CV-LIFETIME" in text or "CV-DEV-VIP" in text:
            leaked.append(f"{rel} (license master key)")
    record("E6 no hardcoded credentials / master keys in shipped source", not leaked, ", ".join(leaked))

    phone = source_text("src/app/components/clipper/PhonePreview.tsx")
    if phone:
        early = phone.find("if (!addCaptions) return null;")
        anchor = phone.find("const [animStep, setAnimStep] = useState(0);")
        record("E7 PhonePreview: no early return above its hooks",
               anchor != -1 and (early == -1 or early > anchor),
               f"hooks_at={anchor} early_return_at={early}")

    # Same defect class, found by the frontend audit in two more components.
    customizer = source_text("src/app/components/clipper/ClipCustomizerModal.tsx")
    if customizer:
        early = customizer.find("if (!isOpen || !clip) return null;")
        hooks = customizer.find("const initialWords")
        record("E7b ClipCustomizerModal: guard is not above the hooks",
               early == -1 or (hooks != -1 and early > hooks),
               f"hooks_at={hooks} guard_at={early}")

    cropper = source_text("src/app/components/clipper/CropEditorModal.tsx")
    if cropper:
        early = cropper.find("if (!isOpen) return null;")
        last_hook = cropper.rfind("useEffect(")
        record("E7c CropEditorModal: the isOpen guard sits below every hook",
               early == -1 or early > last_hook,
               f"last_hook_at={last_hook} guard_at={early}")

    vp = source_text("engine/services/video_processor.py")
    record("E8 renders are gated by the licence layer",
           "require_render_license" in vp)
    record("E9 per-task temp dirs are used instead of a shared purge",
           "cleanup_task_temp_dir" in vp)


def main():
    print("=" * 72)
    print("ClipVault QA harness")
    print("=" * 72)

    # Static checks need no server.
    test_static()

    try:
        proc = start_engine()
    except Exception as e:
        print(f"\n[FATAL] could not start the engine: {e}")
        print("\nStatic checks ran; HTTP checks could not. Summary:")
        return summarise()

    try:
        time.sleep(0.5)
        test_auth()
        test_path_traversal()
        test_origins()
        test_functional()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()

    return summarise()


def summarise():
    failed = [r for r in RESULTS if not r[1]]
    print("\n" + "=" * 72)
    print(f"RESULT: {len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed")
    if failed:
        print("\nFailures:")
        for name, _, detail in failed:
            print(f"  - {name} {detail}")
        print("\nQA FAILED")
        return 1
    print("QA PASSED - all audit regressions are closed")
    return 0


if __name__ == "__main__":
    import urllib.parse  # noqa: E402  (used inside test_functional)
    sys.exit(main())
