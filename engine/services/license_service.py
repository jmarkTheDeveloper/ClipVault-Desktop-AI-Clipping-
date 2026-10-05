"""
ClipVault Studio - Commercial Licensing Service (offline asymmetric verification).

DESIGN
------
A license is a self-contained, offline-verifiable blob:

    CV1.<base64url(payload_json)>.<base64url(ed25519_signature)>

* ``payload_json`` is canonical JSON:
  ``json.dumps(payload, separators=(",", ":"), sort_keys=True)`` where payload is

    {
      "v": 1,
      "key": "<license id>",
      "email": "...",
      "plan": "lifetime" | "pro" | "trial",
      "machine": "<fingerprint>" | null,   # null = deliberately portable key
      "iat": <unix seconds>,
      "exp": <unix seconds> | null,        # null = never expires
      "activations": <int>
    }

* The blob is signed with an **Ed25519 private key that never ships in this repo**
  (see ``tools/mint_license.py`` and the owner's Lemon Squeezy webhook). The engine
  embeds/locates only the matching **public key**, from
  ``CLIPVAULT_LICENSE_PUBKEY`` (hex or base64 raw 32 bytes) or the optional file
  ``engine/license_public_key.txt``.

* There is no master key, no prefix wildcard and no client-side trust: the ONLY way
  to be licensed is a blob whose Ed25519 signature verifies against the embedded
  public key.

ENFORCEMENT
-----------
``CLIPVAULT_LICENSE_MODE`` = ``off`` | ``warn`` | ``enforce``.
Default: ``enforce`` when ``CLIPVAULT_PACKAGED`` is truthy (the packaged Electron
build sets it), otherwise ``warn``. So developers keep working unblocked while
paying customers running the packaged app are really gated. The render gate is
``require_render_license()``, called by ``engine/services/video_processor.py``.
"""

from __future__ import annotations

import base64
import datetime
import getpass
import hashlib
import hmac
import json
import os
import socket
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

# ── Import bootstrap ─────────────────────────────────────────────────────────
# This module is normally imported as ``services.license_service`` from inside
# ``engine/`` (the engine's working directory). Adding this file's parent
# directory to sys.path lets ``python tools/test_licensing.py`` import it from the
# repository root too. Harmless in a PyInstaller bundle.
_ENGINE_DIR = Path(__file__).resolve().parent.parent
if str(_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(_ENGINE_DIR))

try:  # pragma: no cover - trivial import guard
    from services.vault_crypto import VaultCrypto
except Exception:  # defensive: never make the engine unimportable over the vault
    try:
        from vault_crypto import VaultCrypto  # type: ignore
    except Exception:
        VaultCrypto = None  # type: ignore


# ── Constants ────────────────────────────────────────────────────────────────
VAULT_DIR = Path.home() / ".clipvault"
LICENSE_FILE = VAULT_DIR / "license.json"
PUBLIC_KEY_FILE = _ENGINE_DIR / "license_public_key.txt"

BLOB_PREFIX = "CV1"
BLOB_VERSION = 1
VALID_PLANS = ("lifetime", "max", "pro", "trial")

CREDITS_FILE = VAULT_DIR / "manual_studio_credits.json"
MANUAL_STUDIO_WEEKLY_LIMIT = 3
FREE_CREDITS_FILE = VAULT_DIR / "free_tier_credits.json"
FREE_TIER_WEEKLY_LIMIT = 2
WEEK_SECONDS = 7 * 24 * 3600  # 7 days in seconds
CLOCK_DRIFT_TOLERANCE_SECONDS = 300  # 5 minutes tolerance against clock manipulation
AUDIT_LOG_FILE = VAULT_DIR / "security_audit.log"

LEMON_SQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1/licenses"
# Optional owner-operated signing endpoint (Lemon Squeezy webhook / Cloudflare
# Worker holding the private key). When configured, it may exchange an online
# activation for a signed offline blob. It is NOT bundled and never ships a key.
LICENSE_BLOB_ENDPOINT_ENV = "CLIPVAULT_LICENSE_SIGN_ENDPOINT"

PUBKEY_ENV = "CLIPVAULT_LICENSE_PUBKEY"
MODE_ENV = "CLIPVAULT_LICENSE_MODE"
PACKAGED_ENV = "CLIPVAULT_PACKAGED"

MISSING_PUBKEY_MESSAGE = (
    "ClipVault cannot verify its license: this build is missing its license "
    "public key (a real build error). Set CLIPVAULT_LICENSE_PUBKEY or ship "
    "engine/license_public_key.txt."
)

FINGERPRINT_PREFIX = "CLIPVAULT_MACHINE_V1"


class LicenseRequiredError(Exception):
    """Raised when rendering is attempted without a valid license in enforce mode."""


# ── Machine fingerprint ──────────────────────────────────────────────────────
def _read_windows_machine_guid() -> Optional[str]:
    """Reads HKLM\\SOFTWARE\\Microsoft\\Cryptography\\MachineGuid (Windows only)."""
    if sys.platform != "win32":
        return None
    try:
        import winreg  # noqa: WPS433 - Windows-only, imported lazily on purpose

        access = winreg.KEY_READ | getattr(winreg, "KEY_WOW64_64KEY", 0)
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, access
        ) as key:
            value, _ = winreg.QueryValueEx(key, "MachineGuid")
        value = str(value).strip()
        return value or None
    except Exception:
        return None


def get_machine_fingerprint() -> str:
    """
    Returns a stable 24-hex-char hardware fingerprint for this machine.

    Primary source is the Windows ``MachineGuid`` registry value, which survives
    PC/account renames - unlike the old hostname+username hash that changed
    whenever either was renamed. If the registry value is unavailable (non-Windows,
    locked-down policy, missing key), it falls back to ``platform.node()`` plus
    ``getpass.getuser()`` hashed the same way.

    This function is public/stable on purpose: ``tools/mint_license.py fingerprint``
    uses it to print the value the owner must pass to ``mint --machine``.
    """
    raw_parts = []
    guid = _read_windows_machine_guid()
    if guid:
        raw_parts.append(f"machine_guid={guid}")

    if not raw_parts:
        # Fallback: hostname + account name (documented, stable enough per-seat).
        try:
            host = socket.gethostname()
        except Exception:
            host = "unknown_host"
        try:
            user = getpass.getuser()
        except Exception:
            user = os.getenv("USERNAME") or os.getenv("USER") or "unknown_user"
        raw_parts.append(f"host={host}")
        raw_parts.append(f"user={user}")

    raw = f"{FINGERPRINT_PREFIX}|" + "|".join(raw_parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _device_name() -> str:
    """User-friendly device name for Lemon Squeezy instance tracking."""
    try:
        return f"{socket.gethostname()} ({getpass.getuser()})"
    except Exception:
        return "Windows Desktop"


# ── Anti-Tamper & Security Shield ─────────────────────────────────────────────
def _record_security_event(event_type: str, details: str) -> None:
    """
    Appends an immutable security record to ~/.clipvault/security_audit.log.
    Any suspicious activity, tampering, or clock manipulation is logged here.
    """
    try:
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
        log_file = VAULT_DIR / "security_audit.log"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        fp = get_machine_fingerprint()
        record = {
            "timestamp": now_iso,
            "machine": fp,
            "event": event_type,
            "details": details,
        }
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")
        print(f"[ClipVault Security Warning] {event_type}: {details}")
    except Exception:
        pass


def _get_machine_secret() -> bytes:
    """Derives a machine-unique 256-bit cryptographic key for local tamper-seals."""
    fp = get_machine_fingerprint()
    host = os.environ.get("COMPUTERNAME", "") or socket.gethostname()
    user = os.environ.get("USERNAME", "") or os.environ.get("USER", "")
    seed = f"{fp}:{host}:{user}:CLIPVAULT_SEC_SHIELD_V2_2026"
    return hashlib.sha256(seed.encode("utf-8")).digest()


def _compute_tamper_seal(data: Dict[str, Any]) -> str:
    """Calculates an HMAC-SHA256 integrity tag over data excluding existing seals."""
    filtered = {k: v for k, v in data.items() if k not in ("_seal", "_mac")}
    canonical = json.dumps(filtered, separators=(",", ":"), sort_keys=True)
    return hmac.new(_get_machine_secret(), canonical.encode("utf-8"), hashlib.sha256).hexdigest()


def _verify_tamper_seal(data: Dict[str, Any]) -> bool:
    """Verifies that the HMAC seal on the payload matches this machine and data."""
    if not isinstance(data, dict):
        return False
    seal = data.get("_seal") or data.get("_mac")
    if not seal:
        return True  # Unsealed legacy payloads migrate cleanly on first load
    expected = _compute_tamper_seal(data)
    return hmac.compare_digest(str(seal), expected)


# ── Public key loading ───────────────────────────────────────────────────────
def _decode_public_key_material(text: str) -> Tuple[Optional[bytes], str]:
    """Decodes a raw 32-byte Ed25519 public key from hex or base64."""
    cleaned = (text or "").strip()
    if not cleaned:
        return None, "empty public key"

    # Accept PEM if someone pastes the public key PEM instead of raw bytes.
    if "BEGIN" in cleaned and "KEY" in cleaned:
        try:
            from cryptography.hazmat.primitives import serialization

            obj = serialization.load_pem_public_key(cleaned.encode("utf-8"))
            raw = obj.public_bytes(
                serialization.Encoding.Raw, serialization.PublicFormat.Raw
            )
            if len(raw) == 32:
                return raw, ""
            return None, "PEM public key is not an Ed25519 32-byte key"
        except Exception as exc:
            return None, f"could not parse PEM public key: {exc}"

    compact = "".join(cleaned.split())
    is_hex = len(compact) == 64 and all(c in "0123456789abcdefABCDEF" for c in compact)
    if is_hex:
        return bytes.fromhex(compact), ""

    try:
        padded = compact + "=" * (-len(compact) % 4)
        raw = base64.urlsafe_b64decode(padded)
    except Exception:
        try:
            raw = base64.b64decode(compact + "=" * (-len(compact) % 4))
        except Exception as exc:
            return None, f"public key is neither hex nor base64: {exc}"

    if len(raw) != 32:
        return None, f"public key must be 32 raw bytes (got {len(raw)})"
    return raw, ""


_PUBKEY_CACHE: Dict[str, Tuple[Optional[Any], str]] = {}


def _get_public_key() -> Tuple[Optional[Any], str]:
    """
    Resolves the Ed25519 public key object for this build.

    Returns ``(public_key_or_None, error_message)``. Cache is keyed by the raw
    configured source string so tests (and operators editing the file) can change
    it without restarting the process.
    """
    source = os.environ.get(PUBKEY_ENV, "")
    origin = f"env:{PUBKEY_ENV}"
    if not source.strip() and PUBLIC_KEY_FILE.is_file():
        try:
            source = PUBLIC_KEY_FILE.read_text(encoding="utf-8")
            origin = f"file:{PUBLIC_KEY_FILE}"
        except Exception as exc:
            return None, f"could not read {PUBLIC_KEY_FILE}: {exc}"

    if not source.strip():
        return None, MISSING_PUBKEY_MESSAGE

    cache_key = f"{origin}\n{source.strip()}"
    if cache_key in _PUBKEY_CACHE:
        return _PUBKEY_CACHE[cache_key]

    raw, decode_error = _decode_public_key_material(source)
    if raw is None:
        result: Tuple[Optional[Any], str] = (
            None,
            f"invalid license public key configured via {origin}: {decode_error}",
        )
        _PUBKEY_CACHE[cache_key] = result
        return result

    try:
        # Imported lazily/defensively: a missing 'cryptography' package must fail
        # verification with a clear message, never crash the engine at import time.
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

        pubkey = Ed25519PublicKey.from_public_bytes(raw)
    except ImportError as exc:  # pragma: no cover - depends on environment
        result = (
            None,
            "the 'cryptography' package is required to verify ClipVault licenses "
            f"but is not installed ({exc}). Install it with: pip install cryptography",
        )
        _PUBKEY_CACHE[cache_key] = result
        return result
    except Exception as exc:
        result = (None, f"could not load Ed25519 public key from {origin}: {exc}")
        _PUBKEY_CACHE[cache_key] = result
        return result

    result = (pubkey, "")
    _PUBKEY_CACHE[cache_key] = result
    return result


def has_public_key() -> bool:
    """True when a usable license public key is configured for this build."""
    pubkey, _ = _get_public_key()
    return pubkey is not None


# ── Blob encode / decode / verify ────────────────────────────────────────────
def canonical_payload_json(payload: Dict[str, Any]) -> str:
    """Canonical JSON used for signing and verification (never change casually)."""
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64url_decode(text: str) -> bytes:
    padded = text + "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(padded)


def sign_payload(payload: Dict[str, Any], private_key: Any) -> str:
    """
    Owner-side helper: signs a payload dict and returns a ready-to-use blob.
    Not used by the shipped app (the private key never ships).
    """
    payload_bytes = canonical_payload_json(payload).encode("utf-8")
    signature = private_key.sign(payload_bytes)
    return f"{BLOB_PREFIX}.{_b64url_encode(payload_bytes)}.{_b64url_encode(signature)}"


def verify_license(blob: str, machine_fp: Optional[str] = None) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """
    Verifies a ClipVault license blob entirely offline.

    Returns ``(ok, reason, payload)``. Rejects - in order - a missing configured
    public key, bad format, bad base64, non-canonical JSON, wrong signature
    (tampered payload), unsupported ``v``, expired ``exp`` and machine mismatch.

    Machine binding fails CLOSED: if the payload carries a ``machine`` value it
    must equal ``machine_fp`` exactly; ``machine: null`` marks a deliberately
    portable key and is accepted on any machine.
    """
    if machine_fp is None:
        machine_fp = get_machine_fingerprint()

    if not isinstance(blob, str) or not blob.strip():
        return False, "No license key provided.", None

    pubkey, key_error = _get_public_key()
    if pubkey is None:
        return False, key_error, None

    parts = blob.strip().split(".")
    if len(parts) != 3 or parts[0] != BLOB_PREFIX:
        return False, "Unrecognised license format (expected a CV1.<payload>.<signature> blob).", None

    try:
        payload_bytes = _b64url_decode(parts[1])
        signature = _b64url_decode(parts[2])
    except Exception:
        return False, "License data is corrupted (invalid base64url encoding).", None

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return False, "License payload is not valid JSON.", None
    if not isinstance(payload, dict):
        return False, "License payload is malformed.", None

    # Signature covers the canonical serialisation of the payload.
    if canonical_payload_json(payload).encode("utf-8") != payload_bytes:
        return False, "License payload was modified (not in canonical form).", None

    try:
        pubkey.verify(signature, payload_bytes)
    except Exception:
        _record_security_event("LICENSE_SIGNATURE_MISMATCH", "Ed25519 signature verification failed. Foreign or tampered license blob.")
        return False, "License signature mismatch - this key was not issued by ClipVault or has been tampered with.", None

    version = payload.get("v")
    if version != BLOB_VERSION:
        return False, f"Unsupported license version ({version!r}); this build requires v{BLOB_VERSION}.", None

    now = int(time.time())
    exp = payload.get("exp")
    if exp is not None:
        try:
            exp_int = int(exp)
        except Exception:
            return False, "License expiry is malformed.", None
        if exp_int <= now:
            when = datetime.datetime.fromtimestamp(exp_int, datetime.timezone.utc).strftime("%Y-%m-%d")
            return False, f"License expired on {when}. Please renew to keep rendering.", None

    bound_machine = payload.get("machine")
    if bound_machine is not None and str(bound_machine) != str(machine_fp):
        _record_security_event("MACHINE_MISMATCH", f"License bound to {bound_machine} executed on {machine_fp}.")
        return False, (
            "License is bound to a different computer. Activate this PC with a "
            "license issued for this machine."
        ), None

    return True, "License verified.", payload


def get_license_mode() -> str:
    """Resolves the enforcement mode: off | warn | enforce."""
    explicit = os.environ.get(MODE_ENV, "").strip().lower()
    if explicit in ("off", "warn", "enforce"):
        return explicit
    if explicit:
        print(f"[License] Unrecognised {MODE_ENV}={explicit!r}; falling back to default.")
    if str(os.environ.get(PACKAGED_ENV, "")).strip().lower() in ("1", "true", "yes", "on"):
        return "enforce"
    return "warn"


def _invalid_license_reason() -> str:
    """Verifies the stored license and returns the rejection reason ('' if valid)."""
    pubkey, key_error = _get_public_key()
    if pubkey is None:
        # A build shipping without its public key is a real build error: surface it
        # instead of the misleading "no license found".
        return key_error or MISSING_PUBKEY_MESSAGE

    data = _read_stored_license()
    if not data:
        return "No license found on this computer."
    blob = data.get("blob") or data.get("license_blob")
    if not blob:
        if (
            data.get("status") == "active"
            and data.get("instance_id")
            and data.get("hw_fingerprint") == get_machine_fingerprint()
            and _verify_tamper_seal(data)
        ):
            return ""
        return "No license found on this computer."
    ok, reason, _payload = verify_license(str(blob))
    if ok:
        return ""
    # Never return an empty reason for an invalid license: callers treat '' as valid.
    return reason or "License could not be verified."


_WARNED_REASONS: set = set()


def is_render_allowed(
    is_free_1click: bool = False, resolution: str = "1080p"
) -> Tuple[bool, str]:
    """
    Render-layer gate decision.

    * ``off``      -> always allowed (kill switch for support).
    * ``warn``     -> always allowed, but the reason is logged once per process.
    * ``enforce``  -> allowed with a valid license, OR with free tier credits for 1-click clipper.

    ``warn`` mode keeps developers unblocked; ``enforce`` (the packaged build)
    actually gates paying customers' renders.
    """
    mode = get_license_mode()
    if mode == "off":
        return True, "Licensing disabled (CLIPVAULT_LICENSE_MODE=off)."

    reason = _invalid_license_reason()

    if not reason:
        # User is licensed!
        if not is_free_1click and mode == "enforce":
            plan = LicenseService.get_plan()
            if plan == "pro":
                studio_status = LicenseService.get_manual_studio_credits()
                if studio_status.get("tampered"):
                    return False, "Security violation: Local vault tampering or clock manipulation detected. Rendering suspended."
                if not studio_status.get("allowed"):
                    return False, f"Weekly limit of 3 manual studio clips reached ({studio_status.get('clips_used')}/3 used). Refreshes in {studio_status.get('resets_in_days')} day(s). Upgrade to Creator Max for unlimited clips."
        return True, "Licensed."

    # If unlicensed in enforce mode, check if Free Tier 1-Click Clipper is eligible
    if is_free_1click and mode == "enforce":
        res_clean = str(resolution or "").lower()
        if "4k" in res_clean or "8k" in res_clean or "2160" in res_clean or "4320" in res_clean:
            return False, "4K and 8K master exports require Creator Pro. Free tier supports 720p and 1080p."

        free_status = LicenseService.get_free_tier_credits()
        if free_status.get("tampered"):
            return False, "Security violation: Local vault tampering or clock manipulation detected. Rendering suspended."
        if free_status.get("allowed"):
            return True, f"Free Tier: {free_status.get('remaining')} of 2 weekly clips remaining."
        return False, f"Weekly Free Tier limit (2/2 clips used) reached. Refreshes in {free_status.get('resets_in_days')} day(s). Upgrade to Creator Pro for unlimited clips."

    if mode == "enforce":
        return False, reason

    # warn mode: log once per distinct reason, then allow.
    if reason not in _WARNED_REASONS:
        _WARNED_REASONS.add(reason)
        print(f"[License] WARNING (warn mode, render allowed): {reason}")

    if not has_public_key():
        return True, MISSING_PUBKEY_MESSAGE
    return True, reason


def require_render_license(
    is_free_1click: bool = False, resolution: str = "1080p"
) -> None:
    """
    Raises ``LicenseRequiredError`` when rendering is not licensed in enforce mode.

    Call this at the start of every render entry point.
    """
    allowed, reason = is_render_allowed(is_free_1click=is_free_1click, resolution=resolution)
    if allowed:
        return

    raise LicenseRequiredError(
        "ClipVault is not activated on this computer, so rendering is blocked. "
        f"({reason}) Open 'Activate ClipVault Studio' or subscribe to Creator Pro to continue."
    )


# ── Local persistence (DPAPI-encrypted via services.vault_crypto) ─────────────
def _encrypt(data: Dict[str, Any]) -> str:
    if VaultCrypto is not None:
        try:
            return VaultCrypto.encrypt_data(data)
        except Exception as exc:  # pragma: no cover - host specific
            print(f"[License] Vault encryption failed ({exc}); refusing to write plaintext secrets.")
    # Never write the raw blob in plaintext: store nothing rather than leak it.
    raise RuntimeError("License vault encryption is unavailable; license not saved.")


def _decrypt(content: str) -> Dict[str, Any]:
    if VaultCrypto is None:
        return {}
    try:
        data = VaultCrypto.decrypt_data(content)
    except Exception as exc:
        print(f"[License] Could not decrypt stored license: {exc}")
        return {}
    return data if isinstance(data, dict) else {}


def _read_stored_license() -> Dict[str, Any]:
    """Reads and decrypts ``~/.clipvault/license.json``; returns {} when absent or tampered."""
    try:
        if not LICENSE_FILE.exists() or LICENSE_FILE.stat().st_size == 0:
            return {}
        with open(LICENSE_FILE, "r", encoding="utf-8") as f:
            content = f.read()
        data = _decrypt(content)
        if not data or not isinstance(data, dict):
            return {}
        if "_seal" in data or "_mac" in data:
            if not _verify_tamper_seal(data):
                _record_security_event(
                    "LICENSE_VAULT_TAMPER",
                    "Cryptographic machine seal mismatch on stored license vault file."
                )
                return {}
        return data
    except Exception as exc:
        print(f"[License] Error reading license file: {exc}")
        return {}


def _save_license_data(data_dict: Dict[str, Any]) -> None:
    """Saves the encrypted license payload to disk via DPAPI (vault_crypto) with tamper seal."""
    VAULT_DIR.mkdir(parents=True, exist_ok=True)
    data_copy = dict(data_dict)
    data_copy["_seal"] = _compute_tamper_seal(data_copy)
    payload = _encrypt(data_copy)
    tmp_file = VAULT_DIR / "license.json.tmp"
    with open(tmp_file, "w", encoding="utf-8") as f:
        f.write(payload)
    tmp_file.replace(LICENSE_FILE)


def _key_preview(key_id: Any) -> str:
    """Never leaks the whole key: 4 leading + 4 trailing characters."""
    text = str(key_id or "").strip()
    if len(text) < 10:
        return "ACTIVE"
    return f"{text[:4]}-****-****-{text[-4:]}"


# ── Service facade (must keep the exact endpoint response shapes) ─────────────
class LicenseService:
    """
    Commercial licensing facade used by ``engine/server.py``.

    Response shapes of ``/api/license/status``, ``/api/license/activate`` and
    ``/api/license/deactivate`` are unchanged; the internals are now
    signature-verification based and fail closed.
    """

    @classmethod
    def get_machine_fingerprint(cls) -> str:
        return get_machine_fingerprint()

    @classmethod
    def _get_machine_fingerprint(cls) -> str:
        # Backwards-compatible private alias.
        return get_machine_fingerprint()

    @classmethod
    def _get_device_name(cls) -> str:
        return _device_name()

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """
        Returns the license state for the UI.

        Same shape as before: either ``{"licensed": False, "message": ...}`` or
        ``{"licensed": True, "key_preview": ..., "user_email": ..., "user_name": ...,
        "product_name": ..., "activated_at": ..., "instance_id": ...}``.

        Extra informational keys (mode/public_key_configured) are additive only.
        """
        try:
            data = _read_stored_license()
            if not data:
                return {"licensed": False, "message": "No license key found."}

            blob = data.get("blob") or data.get("license_blob")
            plan = "pro"
            key_id = None
            email = None
            if blob:
                ok, reason, payload = verify_license(str(blob))
                if not ok or not isinstance(payload, dict):
                    return {"licensed": False, "message": reason or "License could not be verified."}
                plan = payload.get("plan") or data.get("plan") or "pro"
                key_id = payload.get("key") or data.get("license_key")
                email = payload.get("email") or data.get("user_email")
            elif (
                data.get("status") == "active"
                and data.get("instance_id")
                and data.get("hw_fingerprint") == get_machine_fingerprint()
            ):
                plan = data.get("plan") or "pro"
                key_id = data.get("license_key")
                email = data.get("user_email")
            else:
                return {"licensed": False, "message": "No license key found."}

            product_name = data.get("product_name")
            if not product_name:
                product_name = "ClipVault Creator Max" if plan == "max" else f"ClipVault Studio ({str(plan).title()})"

            return {
                "licensed": True,
                "plan": plan,
                "key_preview": _key_preview(key_id),
                "user_email": email or "Licensed User",
                "user_name": data.get("user_name") or "Creator",
                "product_name": product_name,
                "activated_at": data.get("activated_at") or "",
                "instance_id": data.get("instance_id") or "",
            }
        except Exception as exc:
            return {"licensed": False, "message": f"Error reading license: {exc}"}

    @classmethod
    def get_plan(cls) -> str:
        """Returns the current plan: 'max', 'pro', 'lifetime', 'trial', or 'unlicensed'."""
        try:
            status = cls.get_status()
            if not status.get("licensed"):
                return "unlicensed"
            plan = str(status.get("plan") or "").lower()
            product = str(status.get("product_name") or "").lower()
            if "max" in plan or "max" in product:
                return "max"
            if "lifetime" in plan or "lifetime" in product:
                return "lifetime"
            return "pro"
        except Exception:
            return "unlicensed"

    @classmethod
    def get_manual_studio_credits(cls) -> Dict[str, Any]:
        """
        Calculates remaining credits for Pro Manual Studio.
        - Creator Max / Lifetime: unlimited access (no cap).
        - Creator Pro ($15/mo): 3 clips maximum per 7-day rolling week.
        - Unlicensed: blocked in enforce mode, allowed in dev/warn mode.
        """
        plan = cls.get_plan()
        now = int(time.time())

        if plan in ("max", "lifetime"):
            return {
                "plan": plan,
                "is_max": True,
                "allowed": True,
                "unlimited": True,
                "clips_used": 0,
                "max_weekly_clips": 3,
                "remaining": 999999,
                "resets_in_days": 0,
                "resets_at": "",
                "message": "Creator Max - Unlimited Studio Access",
            }

        if plan == "unlicensed":
            if get_license_mode() != "enforce":
                return {
                    "plan": "pro_dev",
                    "is_max": False,
                    "allowed": True,
                    "unlimited": False,
                    "clips_used": 0,
                    "max_weekly_clips": 3,
                    "remaining": 3,
                    "resets_in_days": 7,
                    "resets_at": "",
                    "message": "Dev Mode: 3/3 clips available",
                }
            return {
                "plan": "unlicensed",
                "is_max": False,
                "allowed": False,
                "unlimited": False,
                "clips_used": 0,
                "max_weekly_clips": 3,
                "remaining": 0,
                "resets_in_days": 0,
                "resets_at": "",
                "message": "Unlicensed",
            }

        # Creator Pro plan
        credits_file = VAULT_DIR / "manual_studio_credits.json"
        credits_data = {}
        tampered = False
        try:
            if credits_file.exists() and credits_file.stat().st_size > 0:
                with open(credits_file, "r", encoding="utf-8") as f:
                    credits_data = _decrypt(f.read())
                if credits_data and not _verify_tamper_seal(credits_data):
                    _record_security_event("MANUAL_STUDIO_CREDITS_TAMPER", "Tamper seal mismatch in manual_studio_credits.json.")
                    tampered = True
        except Exception as exc:
            credits_data = {}

        # Anti-Clock-Rollback protection
        last_recorded = int(credits_data.get("_last_seen_time") or 0)
        if last_recorded > 0 and now < (last_recorded - CLOCK_DRIFT_TOLERANCE_SECONDS):
            _record_security_event("CLOCK_ROLLBACK_DETECTED", f"System clock moved backwards by {last_recorded - now}s in manual studio.")
            tampered = True

        if tampered:
            return {
                "plan": "pro",
                "is_max": False,
                "allowed": False,
                "unlimited": False,
                "clips_used": MANUAL_STUDIO_WEEKLY_LIMIT,
                "max_weekly_clips": MANUAL_STUDIO_WEEKLY_LIMIT,
                "remaining": 0,
                "resets_in_days": 7,
                "resets_at": "",
                "message": "Security integrity violation: Vault state tampering or system clock rollback detected.",
                "tampered": True,
            }

        week_start = int(credits_data.get("week_start") or 0)
        clips_used = int(credits_data.get("clips_used") or 0)

        # 7-day rolling window refresh
        if week_start == 0 or (now - week_start) >= WEEK_SECONDS:
            week_start = now
            clips_used = 0
            try:
                VAULT_DIR.mkdir(parents=True, exist_ok=True)
                new_payload = {
                    "week_start": week_start,
                    "clips_used": 0,
                    "max_clips": MANUAL_STUDIO_WEEKLY_LIMIT,
                    "last_reset": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "_last_seen_time": now,
                }
                new_payload["_seal"] = _compute_tamper_seal(new_payload)
                tmp = VAULT_DIR / "manual_studio_credits.tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    f.write(_encrypt(new_payload))
                tmp.replace(credits_file)
            except Exception as e:
                print(f"[License] Could not save credit refresh: {e}")

        remaining = max(0, MANUAL_STUDIO_WEEKLY_LIMIT - clips_used)
        seconds_left = max(0, (week_start + WEEK_SECONDS) - now)
        resets_in_days = max(1, int((seconds_left + 86399) // 86400))
        resets_at_str = datetime.datetime.fromtimestamp(
            week_start + WEEK_SECONDS, datetime.timezone.utc
        ).strftime("%b %d, %Y")

        allowed = remaining > 0
        msg = (
            f"{remaining}/3 weekly clips remaining"
            if remaining > 0
            else f"Weekly limit reached. Refreshes in {resets_in_days} day(s)."
        )

        return {
            "plan": "pro",
            "is_max": False,
            "allowed": allowed,
            "unlimited": False,
            "clips_used": clips_used,
            "max_weekly_clips": MANUAL_STUDIO_WEEKLY_LIMIT,
            "remaining": remaining,
            "resets_in_days": resets_in_days,
            "resets_at": resets_at_str,
            "message": msg,
        }

    @classmethod
    def use_manual_studio_credit(cls, clip_name: str = "") -> Dict[str, Any]:
        """
        Consumes 1 manual studio credit for Creator Pro users.
        Creator Max users have unlimited credits and are never blocked.
        """
        status = cls.get_manual_studio_credits()
        if status.get("is_max") or status.get("unlimited"):
            return {"success": True, "allowed": True, "credits": status}

        if status.get("tampered"):
            return {
                "success": False,
                "allowed": False,
                "error": "Security integrity violation: Vault state tampering or system clock rollback detected. Quota suspended.",
                "credits": status,
            }

        if not status.get("allowed"):
            return {
                "success": False,
                "allowed": False,
                "error": f"Weekly limit of 3 manual studio clips reached. Credits refresh in {status.get('resets_in_days')} day(s). Upgrade to Creator Max for unlimited clips.",
                "credits": status,
            }

        now = int(time.time())
        try:
            credits_file = VAULT_DIR / "manual_studio_credits.json"
            credits_data = {}
            if credits_file.exists() and credits_file.stat().st_size > 0:
                with open(credits_file, "r", encoding="utf-8") as f:
                    credits_data = _decrypt(f.read())

            week_start = int(credits_data.get("week_start") or now)
            clips_used = int(credits_data.get("clips_used") or 0) + 1
            history = credits_data.get("history") or []
            if isinstance(history, list):
                history.append({
                    "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "clip": clip_name or "manual_clip",
                })
                history = history[-20:]

            updated_payload = {
                "week_start": week_start,
                "clips_used": clips_used,
                "max_clips": MANUAL_STUDIO_WEEKLY_LIMIT,
                "history": history,
                "_last_seen_time": now,
            }
            updated_payload["_seal"] = _compute_tamper_seal(updated_payload)
            VAULT_DIR.mkdir(parents=True, exist_ok=True)
            tmp = VAULT_DIR / "manual_studio_credits.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(_encrypt(updated_payload))
            tmp.replace(credits_file)
        except Exception as exc:
            print(f"[License] Error updating manual studio credits: {exc}")

        new_status = cls.get_manual_studio_credits()
        return {"success": True, "allowed": True, "credits": new_status}

    @classmethod
    def get_free_tier_credits(cls) -> Dict[str, Any]:
        """
        Calculates remaining free tier credits for the 1-Click Auto Clipper.
        Community Free: 2 clips maximum per 7-day rolling week, 720p/1080p only.
        """
        now = int(time.time())
        credits_file = VAULT_DIR / "free_tier_credits.json"
        credits_data = {}
        tampered = False
        try:
            if credits_file.exists() and credits_file.stat().st_size > 0:
                with open(credits_file, "r", encoding="utf-8") as f:
                    credits_data = _decrypt(f.read())
                if credits_data and not _verify_tamper_seal(credits_data):
                    _record_security_event("FREE_TIER_CREDITS_TAMPER", "Tamper seal mismatch in free_tier_credits.json.")
                    tampered = True
        except Exception:
            credits_data = {}

        # Anti-Clock-Rollback protection
        last_recorded = int(credits_data.get("_last_seen_time") or 0)
        if last_recorded > 0 and now < (last_recorded - CLOCK_DRIFT_TOLERANCE_SECONDS):
            _record_security_event("CLOCK_ROLLBACK_DETECTED", f"System clock moved backwards by {last_recorded - now}s in free tier.")
            tampered = True

        if tampered:
            return {
                "allowed": False,
                "clips_used": FREE_TIER_WEEKLY_LIMIT,
                "max_weekly_clips": FREE_TIER_WEEKLY_LIMIT,
                "remaining": 0,
                "resets_in_days": 7,
                "resets_at": "",
                "max_resolution": "1080p",
                "allowed_resolutions": ["720p", "1080p"],
                "message": "Security integrity violation: Vault state tampering or system clock rollback detected.",
                "tampered": True,
            }

        week_start = int(credits_data.get("week_start") or 0)
        clips_used = int(credits_data.get("clips_used") or 0)

        # 7-day rolling window refresh
        if week_start == 0 or (now - week_start) >= WEEK_SECONDS:
            week_start = now
            clips_used = 0
            try:
                VAULT_DIR.mkdir(parents=True, exist_ok=True)
                new_payload = {
                    "week_start": week_start,
                    "clips_used": 0,
                    "max_clips": FREE_TIER_WEEKLY_LIMIT,
                    "last_reset": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "_last_seen_time": now,
                }
                new_payload["_seal"] = _compute_tamper_seal(new_payload)
                tmp = VAULT_DIR / "free_tier_credits.tmp"
                with open(tmp, "w", encoding="utf-8") as f:
                    f.write(_encrypt(new_payload))
                tmp.replace(credits_file)
            except Exception as e:
                print(f"[License] Could not save free credit refresh: {e}")

        remaining = max(0, FREE_TIER_WEEKLY_LIMIT - clips_used)
        seconds_left = max(0, (week_start + WEEK_SECONDS) - now)
        resets_in_days = max(1, int((seconds_left + 86399) // 86400))
        resets_at_str = datetime.datetime.fromtimestamp(
            week_start + WEEK_SECONDS, datetime.timezone.utc
        ).strftime("%b %d, %Y")

        allowed = remaining > 0
        msg = (
            f"{remaining}/2 weekly free clips remaining"
            if remaining > 0
            else f"Weekly free limit reached (2/2 clips). Refreshes in {resets_in_days} day(s)."
        )

        return {
            "allowed": allowed,
            "clips_used": clips_used,
            "max_weekly_clips": FREE_TIER_WEEKLY_LIMIT,
            "remaining": remaining,
            "resets_in_days": resets_in_days,
            "resets_at": resets_at_str,
            "max_resolution": "1080p",
            "allowed_resolutions": ["720p", "1080p"],
            "message": msg,
        }

    @classmethod
    def use_free_tier_credit(cls, clip_name: str = "") -> Dict[str, Any]:
        """Consumes 1 free tier credit."""
        status = cls.get_free_tier_credits()
        if status.get("tampered"):
            return {
                "success": False,
                "allowed": False,
                "error": "Security integrity violation: Vault state tampering or system clock rollback detected. Quota suspended.",
                "credits": status,
            }

        if not status.get("allowed"):
            return {
                "success": False,
                "allowed": False,
                "error": f"Weekly Free Tier limit of 2 clips reached. Credits refresh in {status.get('resets_in_days')} day(s). Upgrade to Creator Pro for unlimited 1-Click clips.",
                "credits": status,
            }

        now = int(time.time())
        try:
            credits_file = VAULT_DIR / "free_tier_credits.json"
            credits_data = {}
            if credits_file.exists() and credits_file.stat().st_size > 0:
                with open(credits_file, "r", encoding="utf-8") as f:
                    credits_data = _decrypt(f.read())

            week_start = int(credits_data.get("week_start") or now)
            clips_used = int(credits_data.get("clips_used") or 0) + 1
            history = credits_data.get("history") or []
            if isinstance(history, list):
                history.append({
                    "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "clip": clip_name or "free_clip",
                })
                history = history[-20:]

            updated_payload = {
                "week_start": week_start,
                "clips_used": clips_used,
                "max_clips": FREE_TIER_WEEKLY_LIMIT,
                "history": history,
                "_last_seen_time": now,
            }
            updated_payload["_seal"] = _compute_tamper_seal(updated_payload)
            VAULT_DIR.mkdir(parents=True, exist_ok=True)
            tmp = VAULT_DIR / "free_tier_credits.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                f.write(_encrypt(updated_payload))
            tmp.replace(credits_file)
        except Exception as exc:
            print(f"[License] Error updating free credits: {exc}")

        new_status = cls.get_free_tier_credits()
        return {"success": True, "allowed": True, "credits": new_status}

    @classmethod
    def get_security_audit_summary(cls) -> Dict[str, Any]:
        """Returns security status and recent tamper audit events."""
        log_file = VAULT_DIR / "security_audit.log"
        events = []
        if log_file.exists():
            try:
                with open(log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line:
                            try:
                                events.append(json.loads(line))
                            except Exception:
                                pass
            except Exception:
                pass
        return {
            "tamper_detected": len(events) > 0,
            "incident_count": len(events),
            "recent_incidents": events[-5:],
        }

    @classmethod
    def activate(cls, license_key: str) -> Dict[str, Any]:
        """
        Activates this PC from an offline signed blob or online Lemon Squeezy subscription.
        """
        clean_key = (license_key or "").strip()
        if not clean_key:
            return {"success": False, "error": "Please enter a valid license key."}

        if cls._try_offline_blob(clean_key):
            return cls._activate_offline(clean_key)

        # ── Online Lemon Squeezy activation ──────────────────────────────────
        online = cls._activate_online(clean_key)
        if online.get("ok"):
            blob = str(online.get("blob"))
            ok, reason, payload = verify_license(blob)
            if not ok or not isinstance(payload, dict):
                return {"success": False, "error": reason or "The activation server returned an invalid license."}

            cls._persist_blob(blob, payload, online.get("instance_id") or "")
            return {
                "success": True,
                "licensed": True,
                "message": online.get("message") or "ClipVault successfully activated!",
                "user_email": payload.get("email") or "customer@clipvault.app",
            }

        if online.get("verified_online") or online.get("insecure_success"):
            cls._persist_online_legacy(clean_key, online.get("data") or {})
            return {
                "success": True,
                "licensed": True,
                "message": online.get("message") or "ClipVault successfully activated!",
                "user_email": online.get("user_email") or "customer@clipvault.app",
            }

        return {"success": False, "error": online.get("error") or "Activation failed."}

    @classmethod
    def deactivate(cls) -> Dict[str, Any]:
        """
        Removes the local activation (and deactivates the device on Lemon Squeezy
        when the stored record carries an instance id). Same response shape as before.
        """
        try:
            if LICENSE_FILE.exists():
                data = _read_stored_license()
                key = data.get("license_key")
                instance_id = data.get("instance_id")
                if key and instance_id:
                    try:
                        import requests

                        requests.post(
                            f"{LEMON_SQUEEZY_API_URL}/deactivate",
                            headers={"Accept": "application/json"},
                            data={"license_key": key, "instance_id": instance_id},
                            timeout=8,
                        )
                    except Exception:
                        pass

                LICENSE_FILE.unlink(missing_ok=True)
            return {"success": True, "licensed": False, "message": "License deactivated."}
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    # ── internals ───────────────────────────────────────────────────────────
    @classmethod
    def _try_offline_blob(cls, key: str) -> bool:
        """A key is treated as an offline blob when it verifies as one."""
        ok, _reason, _payload = verify_license(key)
        return bool(ok)

    @classmethod
    def _activate_offline(cls, blob: str) -> Dict[str, Any]:
        ok, reason, payload = verify_license(blob)
        if not ok or not isinstance(payload, dict):
            return {"success": False, "error": reason or "Invalid license."}
        if not has_public_key():
            return {"success": False, "error": MISSING_PUBKEY_MESSAGE}

        instance_id = cls._signing_endpoint_activation_id(blob, payload)
        cls._persist_blob(blob, payload, instance_id)

        plan = str(payload.get("plan") or "licensed").title()
        email = str(payload.get("email") or "Licensed User")
        return {
            "success": True,
            "licensed": True,
            "message": f"ClipVault {plan} activated successfully for {email}.",
            "user_email": email,
        }

    @classmethod
    def _persist_blob(cls, blob: str, payload: Dict[str, Any], instance_id: str) -> None:
        data = {
            # The signed blob is stored inside the DPAPI-encrypted vault only.
            "blob": blob,
            "license_key": payload.get("key") or "",
            "status": "active",
            "user_email": payload.get("email") or "customer@clipvault.app",
            "user_name": payload.get("email") or "Creator",
            "product_name": f"ClipVault Studio ({str(payload.get('plan') or 'licensed').title()})",
            "plan": payload.get("plan") or "",
            "instance_id": instance_id or "",
            "activated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
            "hw_fingerprint": get_machine_fingerprint(),
        }
        _save_license_data(data)

    @classmethod
    def _persist_online_legacy(cls, license_key: str, data: Dict[str, Any]) -> None:
        """Verified record for an online activation."""
        plan = data.get("plan")
        if not plan:
            prod = str(data.get("product_name") or "").lower()
            plan = "max" if "max" in prod else "pro"
        payload = {
            "license_key": license_key,
            "status": data.get("status", "active"),
            "user_email": data.get("user_email") or "customer@clipvault.app",
            "user_name": data.get("user_name") or "Creator",
            "product_name": data.get("product_name") or f"ClipVault Creator {'Max' if plan == 'max' else 'Pro'}",
            "plan": plan,
            "instance_id": data.get("instance_id", ""),
            "activated_at": data.get("activated_at") or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d"),
            "hw_fingerprint": get_machine_fingerprint(),
        }
        _save_license_data(payload)

    @classmethod
    def _signing_endpoint_activation_id(cls, blob: str, payload: Dict[str, Any]) -> str:
        """Best-effort online device registration for a verified blob (never blocks)."""
        endpoint = os.environ.get(LICENSE_BLOB_ENDPOINT_ENV, "").strip()
        if not endpoint:
            return ""
        try:
            import requests

            res = requests.post(
                endpoint,
                json={
                    "action": "activate_instance",
                    "license_key": payload.get("key") or "",
                    "instance_name": _device_name(),
                    "machine": get_machine_fingerprint(),
                },
                timeout=10,
            )
            body = res.json()
            instance = body.get("instance") if isinstance(body, dict) else None
            if isinstance(instance, dict):
                return str(instance.get("id") or "")
        except Exception:
            pass
        return ""

    @classmethod
    def _activate_online(cls, license_key: str) -> Dict[str, Any]:
        """
        Attempts online activation, then tries to obtain a signed blob for it.

        Returns a dict with ``ok`` (got a signed blob), or ``insecure_success``
        (vendor said the key is valid but no signature was issued), or ``error``.
        """
        try:
            import requests

            res = requests.post(
                f"{LEMON_SQUEEZY_API_URL}/activate",
                headers={"Accept": "application/json"},
                data={"license_key": license_key, "instance_name": _device_name()},
                timeout=12,
            )

            response_data = res.json()
            if not res.ok or not response_data.get("activated"):
                error_msg = response_data.get("error") or (
                    "License activation failed. Please check your key or device limits."
                )
                return {"ok": False, "error": error_msg}

            meta = response_data.get("meta", {}) or {}
            instance = response_data.get("instance", {}) or {}
            license_info = response_data.get("license_key", {}) or {}
            product_name = meta.get("product_name") or "ClipVault Studio"
            plan = "max" if "max" in product_name.lower() else "pro"
            customer = {
                "status": license_info.get("status", "active"),
                "license_key": license_key,
                "user_email": meta.get("user_email") or "customer@clipvault.app",
                "user_name": meta.get("user_name") or "Creator",
                "product_name": product_name,
                "plan": plan,
                "instance_id": instance.get("id", ""),
                "activated_at": instance.get("created_at") or "",
                "hw_fingerprint": get_machine_fingerprint(),
            }

            # Prefer a signed blob returned directly by the vendor/signing endpoint.
            blob = response_data.get("license_blob") or meta.get("license_blob")
            if not blob:
                blob = cls._fetch_blob_from_signing_endpoint(license_key, customer)

            if blob:
                return {
                    "ok": True,
                    "blob": blob,
                    "instance_id": customer.get("instance_id", ""),
                    "message": "ClipVault successfully activated!",
                    "user_email": customer.get("user_email"),
                }

            return {
                "ok": False,
                "verified_online": True,
                "data": customer,
                "message": f"ClipVault {'Creator Max' if plan == 'max' else 'Creator Pro'} successfully activated!",
                "user_email": customer.get("user_email"),
            }
        except Exception as exc:
            # Network failure is not an activation.
            if _is_requests_error(exc):
                return {
                    "ok": False,
                    "error": (
                        "Could not reach the activation server. Please check your internet "
                        "connection and try again."
                    ),
                }
            return {"ok": False, "error": f"Activation error: {exc}"}

    @classmethod
    def _fetch_blob_from_signing_endpoint(
        cls, license_key: str, customer: Dict[str, Any]
    ) -> Optional[str]:
        """Exchanges a verified online activation for a signed offline blob."""
        endpoint = os.environ.get(LICENSE_BLOB_ENDPOINT_ENV, "").strip()
        if not endpoint:
            return None
        try:
            import requests

            res = requests.post(
                endpoint,
                json={
                    "action": "mint_blob",
                    "license_key": license_key,
                    "instance_id": customer.get("instance_id", ""),
                    "email": customer.get("user_email", ""),
                    "machine": get_machine_fingerprint(),
                },
                timeout=12,
            )
            body = res.json()
            if not isinstance(body, dict):
                return None
            blob = body.get("blob") or body.get("license_blob")
            return str(blob) if blob else None
        except Exception:
            return None


def _is_requests_error(exc: Exception) -> bool:
    try:
        import requests

        return isinstance(exc, requests.exceptions.RequestException)
    except Exception:
        return False


# ── Direct CLI (handy when debugging a shipped exe) ──────────────────────────
if __name__ == "__main__":  # pragma: no cover
    import argparse

    parser = argparse.ArgumentParser(description="ClipVault licensing diagnostics")
    parser.add_argument("command", choices=["status", "fingerprint", "verify", "mode"])
    parser.add_argument("blob", nargs="?", default="")
    args = parser.parse_args()

    if args.command == "fingerprint":
        print(get_machine_fingerprint())
    elif args.command == "mode":
        print(get_license_mode())
    elif args.command == "status":
        print(json.dumps(LicenseService.get_status(), indent=2))
        print(json.dumps({"render_allowed": is_render_allowed()}, indent=2))
    elif args.command == "verify":
        ok, reason, payload = verify_license(args.blob)
        print(json.dumps({"ok": ok, "reason": reason, "payload": payload}, indent=2))
