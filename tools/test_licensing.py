#!/usr/bin/env python3
"""
ClipVault Studio - licensing self-test (runnable, no pytest required).

    python tools/test_licensing.py

Runs entirely offline against an EPHEMERAL Ed25519 keypair generated in-process,
so it never touches the owner's real private key and never leaves state behind in
~/.clipvault (it redirects the license store to a temp directory).

Covered:
  a) ephemeral keypair generation
  b) a valid blob verifies
  c) one tampered payload byte is rejected
  d) a blob bound to another machine is rejected (binding fails CLOSED)
  e) expiry is enforced
  f) require_render_license() raises in enforce mode with no license,
     passes in warn mode
  g) no bypass: CV-VIP-* / master-key shaped strings are rejected by the engine
  h) offline activation -> status round trip, with no plaintext blob on disk

Exit code is non-zero when any check fails.
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENGINE_DIR = REPO_ROOT / "engine"
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

try:
    from services import license_service as ls  # type: ignore
except Exception as exc:  # pragma: no cover
    print(f"FATAL: could not import engine/services/license_service.py: {exc}")
    raise SystemExit(2)

try:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
except ImportError as exc:  # pragma: no cover
    print(f"FATAL: the 'cryptography' package is required for this self-test: {exc}")
    raise SystemExit(2)


# ── tiny test harness ────────────────────────────────────────────────────────
class Results:
    def __init__(self) -> None:
        self.passed = 0
        self.failed = 0
        self.failures: list = []

    def check(self, name: str, condition: bool, detail: str = "") -> bool:
        if condition:
            self.passed += 1
            print(f"  [PASS] {name}")
        else:
            self.failed += 1
            self.failures.append(f"{name}{f' - {detail}' if detail else ''}")
            print(f"  [FAIL] {name}{f' - {detail}' if detail else ''}")
        return condition


RESULTS = Results()


# ── environment isolation helpers ────────────────────────────────────────────
class EnvPatch:
    """Temporarily sets/removes environment variables."""

    def __init__(self, **values):
        self.values = values
        self.saved: dict = {}

    def __enter__(self):
        for key, value in self.values.items():
            self.saved[key] = os.environ.get(key)
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = str(value)
        return self

    def __exit__(self, *exc):
        for key, value in self.saved.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
        return False


class StorePatch:
    """Redirects the license store to a throwaway directory."""

    def __init__(self, path: Path):
        self.path = path
        self.saved_file = None
        self.saved_dir = None

    def __enter__(self):
        self.saved_file = ls.LICENSE_FILE
        self.saved_dir = ls.VAULT_DIR
        ls.LICENSE_FILE = self.path
        ls.VAULT_DIR = self.path.parent
        return self

    def __exit__(self, *exc):
        ls.LICENSE_FILE = self.saved_file
        ls.VAULT_DIR = self.saved_dir
        return False


def make_keypair():
    private_key = Ed25519PrivateKey.generate()
    raw_public = private_key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    return private_key, raw_public


def payload_for(machine=None, exp=None, plan="lifetime", email="buyer@example.com"):
    now = int(time.time())
    return {
        "v": 1,
        "key": "CV-TEST-0001",
        "email": email,
        "plan": plan,
        "machine": machine,
        "iat": now,
        "exp": exp,
        "activations": 1,
    }


def blob_for(private_key, **kwargs) -> str:
    return ls.sign_payload(payload_for(**kwargs), private_key)


def main() -> int:
    print("ClipVault licensing self-test")
    print("=" * 62)
    print(f"engine module : {ls.__file__}")
    print(f"public key env: {ls.PUBKEY_ENV}")
    print(f"mode env      : {ls.MODE_ENV}")

    temp_dir = Path(tempfile.mkdtemp(prefix="clipvault_lic_test_"))
    try:
        # ── (a) ephemeral keypair ───────────────────────────────────────────
        print("\n(a) ephemeral Ed25519 keypair + machine fingerprint")
        private_key, raw_public = make_keypair()
        pub_hex = raw_public.hex()
        pub_b64 = base64.urlsafe_b64encode(raw_public).decode("ascii").rstrip("=")
        RESULTS.check("keypair generated (32-byte public key)", len(raw_public) == 32)

        fingerprint = ls.get_machine_fingerprint()
        RESULTS.check(
            "get_machine_fingerprint() returns 24 lowercase hex chars",
            isinstance(fingerprint, str)
            and len(fingerprint) == 24
            and all(c in "0123456789abcdef" for c in fingerprint),
            f"got {fingerprint!r}",
        )
        RESULTS.check(
            "fingerprint is stable across calls",
            ls.get_machine_fingerprint() == fingerprint,
        )

        # ── (b) valid blob verifies ─────────────────────────────────────────
        print("\n(b) a valid blob verifies")
        with EnvPatch(**{ls.PUBKEY_ENV: pub_hex}):
            ls._PUBKEY_CACHE.clear()
            good_blob = blob_for(private_key, machine=fingerprint)
            ok, reason, payload = ls.verify_license(good_blob, fingerprint)
            RESULTS.check("valid blob accepted", ok, reason)
            RESULTS.check("payload round-trips", isinstance(payload, dict) and payload.get("key") == "CV-TEST-0001")
            RESULTS.check(
                "blob shape is CV1.<payload>.<sig>",
                good_blob.count(".") == 2 and good_blob.startswith("CV1."),
            )

            # Machine-unbound (portable) key
            portable = blob_for(private_key, machine=None)
            ok_p, reason_p, _ = ls.verify_license(portable, "some-other-machine-0001")
            RESULTS.check("machine:null (portable) accepted on any machine", ok_p, reason_p)

            # Same blob signed by a DIFFERENT key must fail
            other_private, _ = make_keypair()
            forged = blob_for(other_private, machine=fingerprint)
            ok_f, reason_f, _ = ls.verify_license(forged, fingerprint)
            RESULTS.check(
                "blob signed by a foreign key rejected",
                not ok_f and "signature" in reason_f.lower(),
                reason_f,
            )

            # ── (c) tampering ──────────────────────────────────────────────
            print("\n(c) tampered payload rejected")
            head, body, sig = good_blob.split(".")
            raw_payload = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
            raw_payload["plan"] = "lifetime-hacked"
            tampered_body = base64.urlsafe_b64encode(
                json.dumps(raw_payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
            ).decode("ascii").rstrip("=")
            tampered = f"{head}.{tampered_body}.{sig}"
            ok_t, reason_t, _ = ls.verify_license(tampered, fingerprint)
            RESULTS.check("payload edit invalidates the license", not ok_t, reason_t)

            single_byte = f"{head}.{body[:-1]}{'A' if body[-1] != 'A' else 'B'}.{sig}"
            ok_b, reason_b, _ = ls.verify_license(single_byte, fingerprint)
            RESULTS.check("single-byte payload flip rejected", not ok_b, reason_b)

            # Flip a character in the middle of the signature: the final base64url
            # character carries unused padding bits, so flipping THAT one can decode
            # to the identical byte string.
            mid = len(sig) // 2
            bad_sig = f"{head}.{body}.{sig[:mid]}{'A' if sig[mid] != 'A' else 'B'}{sig[mid + 1:]}"
            ok_s, reason_s, _ = ls.verify_license(bad_sig, fingerprint)
            RESULTS.check("any single signature byte flip rejected", not ok_s, reason_s)

            print("\n(c2) malformed input rejected without crashing")
            for label, candidate in (
                ("empty string", ""),
                ("plain text", "hello world"),
                ("wrong prefix", "CV2.abc.def"),
                ("bad base64", "CV1.!!!!.!!!!"),
                ("only two parts", "CV1.abc"),
                ("valid b64, not JSON", f"CV1.{base64.urlsafe_b64encode(b'not json').decode().rstrip('=')}.{sig}"),
            ):
                ok_m, reason_m, _ = ls.verify_license(candidate, fingerprint)
                RESULTS.check(f"rejected: {label}", not ok_m, reason_m)

            # Unsupported version (v != 1) — correctly signed, so version is the only flaw
            v2_payload = payload_for(machine=fingerprint)
            v2_payload["v"] = 2
            v2_blob = ls.sign_payload(v2_payload, private_key)
            ok_v, reason_v, _ = ls.verify_license(v2_blob, fingerprint)
            RESULTS.check(
                "v != 1 rejected",
                not ok_v and "version" in reason_v.lower(),
                reason_v,
            )

            # ── (d) machine binding fails CLOSED ───────────────────────────
            print("\n(d) machine binding fails CLOSED")
            bound_elsewhere = blob_for(private_key, machine="000000000000000000000000")
            ok_d, reason_d, _ = ls.verify_license(bound_elsewhere, fingerprint)
            RESULTS.check("blob bound to another machine rejected", not ok_d, reason_d)
            RESULTS.check(
                "rejection reason mentions binding",
                "different computer" in reason_d.lower(),
                reason_d,
            )
            ok_d2, reason_d2, _ = ls.verify_license(bound_elsewhere, None)
            RESULTS.check("default fingerprint is used when none supplied", not ok_d2, reason_d2)

            # ── (e) expiry ─────────────────────────────────────────────────
            print("\n(e) expiry enforced")
            past = int(time.time()) - 86400
            expired = blob_for(private_key, machine=fingerprint, exp=past)
            ok_e, reason_e, _ = ls.verify_license(expired, fingerprint)
            RESULTS.check("expired blob rejected", not ok_e, reason_e)
            RESULTS.check("reason says expired", "expired" in reason_e.lower(), reason_e)

            future = int(time.time()) + 86400
            ok_e2, reason_e2, _ = ls.verify_license(
                blob_for(private_key, machine=fingerprint, exp=future), fingerprint
            )
            RESULTS.check("future exp accepted", ok_e2, reason_e2)
            ok_e3, reason_e3, _ = ls.verify_license(
                blob_for(private_key, machine=fingerprint, exp=None), fingerprint
            )
            RESULTS.check("exp:null accepted (never expires)", ok_e3, reason_e3)

        # ── no bypass: master-key shaped strings ────────────────────────────
        print("\n(g) no bypass: master-key / wildcard strings")
        bypass_candidates = [
            "CV-FOUNDER-UNLIMITED-ACCESS",
            "CV-DEV-VIP-2026-MASTER",
            "CV-LIFETIME-STUDIO-PRO",
            "CV-VIP-anything-at-all",
            "cv-vip-lowercase",
        ]
        with EnvPatch(**{ls.PUBKEY_ENV: pub_hex, ls.MODE_ENV: "warn"}):
            ls._PUBKEY_CACHE.clear()
            for candidate in bypass_candidates:
                ok_x, reason_x, _ = ls.verify_license(candidate, fingerprint)
                RESULTS.check(f"verify_license rejects {candidate!r}", not ok_x, reason_x)

            with StorePatch(temp_dir / "bypass_license.json"):
                for candidate in bypass_candidates:
                    result = ls.LicenseService.activate(candidate)
                    RESULTS.check(
                        f"activate() refuses {candidate!r}",
                        not result.get("success"),
                        json.dumps(result),
                    )

            # Module source must not contain the old master keys at all.
            source = Path(ls.__file__).read_text(encoding="utf-8", errors="replace")
            for needle in ("CV-FOUNDER-UNLIMITED-ACCESS", "CV-DEV-VIP-2026-MASTER", "CV-VIP-", "DEV_MASTER_KEYS"):
                RESULTS.check(f"license_service.py does not contain {needle!r}", needle not in source)

        # ── (f) enforcement modes ───────────────────────────────────────────
        print("\n(f) require_render_license() enforcement")
        with StorePatch(temp_dir / "mode_license.json"):
            # No license at all, no public key configured
            orig_pk_file = ls.PUBLIC_KEY_FILE
            try:
                ls.PUBLIC_KEY_FILE = temp_dir / "no_such_pubkey.txt"
                with EnvPatch(**{ls.MODE_ENV: "enforce", ls.PUBKEY_ENV: None}):
                    ls._PUBKEY_CACHE.clear()
                    ls._WARNED_REASONS.clear()
                    allowed, reason = ls.is_render_allowed()
                    RESULTS.check("enforce + no key: is_render_allowed() is False", not allowed, reason)
                    RESULTS.check(
                        "enforce + no key: reason mentions the missing public key",
                        "missing its license public key" in reason,
                        reason,
                    )
                    raised = False
                    message = ""
                    try:
                        ls.require_render_license()
                    except ls.LicenseRequiredError as exc:
                        raised = True
                        message = str(exc)
                    except Exception as exc:  # wrong exception type
                        message = f"unexpected {type(exc).__name__}: {exc}"
                    RESULTS.check("enforce + no key: require_render_license() raises LicenseRequiredError", raised, message)
                    RESULTS.check(
                        "enforce + no key: exception message is user-readable",
                        raised and "not activated" in message.lower() and len(message) > 40,
                        message,
                    )
            finally:
                ls.PUBLIC_KEY_FILE = orig_pk_file

            # No license, but a usable public key IS configured
            with EnvPatch(**{ls.MODE_ENV: "enforce", ls.PUBKEY_ENV: pub_hex}):
                ls._PUBKEY_CACHE.clear()
                ls._WARNED_REASONS.clear()
                allowed, reason = ls.is_render_allowed()
                RESULTS.check("enforce + key + no license: blocked", not allowed, reason)
                raised = False
                try:
                    ls.require_render_license()
                except ls.LicenseRequiredError:
                    raised = True
                RESULTS.check("enforce + key + no license: raises", raised, reason)

            # warn mode: allowed, and logs once
            with EnvPatch(**{ls.MODE_ENV: "warn", ls.PUBKEY_ENV: pub_hex}):
                ls._PUBKEY_CACHE.clear()
                ls._WARNED_REASONS.clear()
                allowed, reason = ls.is_render_allowed()
                RESULTS.check("warn + no license: allowed", allowed, reason)
                try:
                    ls.require_render_license()
                    RESULTS.check("warn + no license: require_render_license() does not raise", True)
                except ls.LicenseRequiredError as exc:
                    RESULTS.check("warn + no license: require_render_license() does not raise", False, str(exc))
                first = len(ls._WARNED_REASONS)
                ls.is_render_allowed()
                RESULTS.check(
                    "warn logs once per distinct reason",
                    len(ls._WARNED_REASONS) == first,
                    f"{first} -> {len(ls._WARNED_REASONS)}",
                )

            # warn mode with NO public key must still allow (dev builds)
            ls.PUBLIC_KEY_FILE = temp_dir / "no_such_pubkey.txt"
            with EnvPatch(**{ls.MODE_ENV: "warn", ls.PUBKEY_ENV: None}):
                ls._PUBKEY_CACHE.clear()
                ls._WARNED_REASONS.clear()
                allowed, reason = ls.is_render_allowed()
                RESULTS.check(
                    "warn + missing public key: allowed with a clear message",
                    allowed and "missing its license public key" in reason,
                    reason,
                )
            ls.PUBLIC_KEY_FILE = orig_pk_file

            # off mode: always allowed
            with EnvPatch(**{ls.MODE_ENV: "off", ls.PUBKEY_ENV: None}):
                ls._PUBKEY_CACHE.clear()
                allowed, reason = ls.is_render_allowed()
                RESULTS.check("off mode: allowed", allowed, reason)

            # default mode: warn in dev, enforce when CLIPVAULT_PACKAGED is set
            with EnvPatch(**{ls.MODE_ENV: None, "CLIPVAULT_PACKAGED": None}):
                RESULTS.check("default mode without CLIPVAULT_PACKAGED is 'warn'", ls.get_license_mode() == "warn", ls.get_license_mode())
            with EnvPatch(**{ls.MODE_ENV: None, "CLIPVAULT_PACKAGED": "1"}):
                RESULTS.check("default mode with CLIPVAULT_PACKAGED=1 is 'enforce'", ls.get_license_mode() == "enforce", ls.get_license_mode())
            with EnvPatch(**{ls.MODE_ENV: "Enforce", "CLIPVAULT_PACKAGED": None}):
                RESULTS.check("mode parsing is case-insensitive", ls.get_license_mode() == "enforce", ls.get_license_mode())

            # env formatting: base64 raw key must also work
            with EnvPatch(**{ls.MODE_ENV: "enforce", ls.PUBKEY_ENV: pub_b64}):
                ls._PUBKEY_CACHE.clear()
                ok_cfg, reason_cfg, _ = ls.verify_license(good_blob, fingerprint)
                RESULTS.check("base64 raw public key accepted", ok_cfg, reason_cfg)

            # a corrupted public key must fail closed, not crash
            with EnvPatch(**{ls.MODE_ENV: "enforce", ls.PUBKEY_ENV: "not-a-key"}):
                ls._PUBKEY_CACHE.clear()
                ok_bad, reason_bad, _ = ls.verify_license(good_blob, fingerprint)
                RESULTS.check("invalid configured public key fails closed", not ok_bad, reason_bad)
                allowed_bad, _ = ls.is_render_allowed()
                RESULTS.check("invalid configured public key blocks rendering in enforce", not allowed_bad)

        # ── (h) activation -> status round trip, nothing in plaintext ──────
        print("\n(h) offline activation round trip + encrypted storage")
        store = temp_dir / "vault" / "license.json"
        with StorePatch(store):
            with EnvPatch(**{ls.MODE_ENV: "enforce", ls.PUBKEY_ENV: pub_hex}):
                ls._PUBKEY_CACHE.clear()
                ls._WARNED_REASONS.clear()

                bad = ls.LicenseService.activate("CV-VIP-not-a-real-key")
                RESULTS.check("activate() refuses a wildcard key", not bad.get("success"), json.dumps(bad))

                wrong_machine = blob_for(private_key, machine="ffffffffffffffffffffffff")
                wrong = ls.LicenseService.activate(wrong_machine)
                RESULTS.check("activate() refuses a blob for another machine", not wrong.get("success"), json.dumps(wrong))

                activated = ls.LicenseService.activate(good_blob)
                RESULTS.check("activate() accepts a valid blob", bool(activated.get("success")), json.dumps(activated))
                RESULTS.check("activate() keeps the 'licensed' key", activated.get("licensed") is True)
                RESULTS.check("activate() keeps the 'user_email' key", activated.get("user_email") == "buyer@example.com")
                RESULTS.check("activate() keeps the 'message' key", bool(activated.get("message")))

                status = ls.LicenseService.get_status()
                RESULTS.check("get_status() reports licensed", status.get("licensed") is True, json.dumps(status))
                RESULTS.check("get_status() keeps 'key_preview'", status.get("key_preview") == "CV-T-****-****-0001", json.dumps(status))
                RESULTS.check("get_status() keeps 'user_email'", status.get("user_email") == "buyer@example.com")
                RESULTS.check("get_status() never leaks the full blob", good_blob not in json.dumps(status))
                for required_key in ("user_name", "product_name", "activated_at", "instance_id"):
                    RESULTS.check(f"get_status() keeps '{required_key}'", required_key in status)

                allowed_now, reason_now = ls.is_render_allowed()
                RESULTS.check("enforce after activation: render allowed", allowed_now, reason_now)
                try:
                    ls.require_render_license()
                    RESULTS.check("enforce after activation: require_render_license() passes", True)
                except ls.LicenseRequiredError as exc:
                    RESULTS.check("enforce after activation: require_render_license() passes", False, str(exc))

                raw_file = store.read_text(encoding="utf-8", errors="replace")
                RESULTS.check("stored license is not plaintext", good_blob not in raw_file and "CV1." not in raw_file)
                RESULTS.check("stored license declares encryption", '"encrypted": true' in raw_file)

                deactivated = ls.LicenseService.deactivate()
                RESULTS.check("deactivate() keeps its response shape", deactivated.get("success") is True and deactivated.get("licensed") is False, json.dumps(deactivated))
                RESULTS.check("deactivate() removed the file", not store.exists())
                RESULTS.check(
                    "get_status() reports unlicensed after deactivate",
                    ls.LicenseService.get_status().get("licensed") is False,
                )

                # A random key must never survive activation
                random_key = ls.LicenseService.activate("some-other-string")
                RESULTS.check("activate() rejects an arbitrary string", not random_key.get("success"), json.dumps(random_key))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

    print("\n" + "=" * 62)
    total = RESULTS.passed + RESULTS.failed
    if RESULTS.failed:
        print(f"RESULT: FAIL - {RESULTS.failed} of {total} checks failed")
        for failure in RESULTS.failures:
            print(f"  - {failure}")
        return 1
    print(f"RESULT: PASS - all {total} checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
