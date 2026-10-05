#!/usr/bin/env python3
"""
ClipVault Studio - OWNER-SIDE license minting CLI.

    *** THIS FILE MUST NEVER BE BUNDLED INTO THE SHIPPED APP. ***
    It is the only code that touches the Ed25519 PRIVATE key, which lives offline
    with the owner (and in the Lemon Squeezy webhook / signing worker).

Usage
-----
    # 1) Create the signing keypair (do this once, on your offline machine)
    python tools/mint_license.py keygen --out D:\\clipvault_vault\\license_private_key.pem

      -> prints the PUBLIC key in hex; put it in CLIPVAULT_LICENSE_PUBKEY for the
         build, or commit it to engine/license_public_key.txt.

    # 2) Mint a license for a customer
    python tools/mint_license.py mint --private-key license_private_key.pem \
        --email customer@example.com --plan lifetime \
        --machine 3f2a9c1b7d4e5f6011223344 --key CV-2026-000123

    # Printable / portable license (machine unbound, use deliberately)
    python tools/mint_license.py mint --private-key license_private_key.pem \
        --email reviewer@example.com --plan trial --portable --exp 2026-03-01

    # 3) Helpers
    python tools/mint_license.py fingerprint          # this PC's machine id
    python tools/mint_license.py pubkey --private-key license_private_key.pem

Blob format (see engine/services/license_service.py):
    CV1.<base64url(canonical_payload_json)>.<base64url(ed25519_signature)>
"""

from __future__ import annotations

import argparse
import base64
import datetime
import getpass
import json
import os
import secrets
import socket
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENGINE_DIR = REPO_ROOT / "engine"
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

PLANS = ("lifetime", "max", "pro", "trial")
DEFAULT_KEY_PATH = Path("./license_private_key.pem")


def _require_cryptography():
    """Imports the Ed25519 primitives with an actionable error message."""
    try:
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric.ed25519 import (
            Ed25519PrivateKey,
            Ed25519PublicKey,
        )
    except ImportError as exc:  # pragma: no cover - environment dependent
        print(
            "ERROR: the 'cryptography' package is required.\n"
            "       Install it with:  pip install cryptography\n"
            f"       ({exc})",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return serialization, Ed25519PrivateKey, Ed25519PublicKey


def _license_module():
    """Imports the engine's license_service (shared canonical-JSON/signing logic)."""
    try:
        from services import license_service  # type: ignore

        return license_service
    except Exception as exc:
        print(
            "ERROR: could not import engine/services/license_service.py.\n"
            f"       ({exc})",
            file=sys.stderr,
        )
        raise SystemExit(2)


def _harden_permissions(path: Path) -> None:
    """Best-effort: restrict a private key file to the current user only."""
    try:
        if sys.platform == "win32":
            import subprocess

            user = os.environ.get("USERNAME") or getpass.getuser()
            subprocess.run(
                ["icacls", str(path), "/inheritance:r", "/grant:r", f"{user}:F"],
                capture_output=True,
                check=False,
            )
        else:
            os.chmod(path, 0o600)
    except Exception:
        pass


def _load_private_key(pem_path: str):
    serialization, _Ed25519PrivateKey, _Ed25519PublicKey = _require_cryptography()
    path = Path(pem_path)
    if not path.is_file():
        print(f"ERROR: private key not found: {path}", file=sys.stderr)
        raise SystemExit(2)
    try:
        return serialization.load_pem_private_key(path.read_bytes(), password=None)
    except Exception as exc:
        print(f"ERROR: could not read private key {path}: {exc}", file=sys.stderr)
        raise SystemExit(2)


def _public_key_hex(private_key) -> str:
    serialization, _priv, _pub = _require_cryptography()
    raw = private_key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    return raw.hex()


def _print_public_key(private_key) -> None:
    serialization, _priv, _pub = _require_cryptography()
    raw = private_key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    print("Public key (use ONE of these for CLIPVAULT_LICENSE_PUBKEY):")
    print(f"  hex:    {raw.hex()}")
    print(f"  base64: {base64.urlsafe_b64encode(raw).decode('ascii').rstrip('=')}")


def cmd_keygen(args: argparse.Namespace) -> int:
    serialization, Ed25519PrivateKey, _pub = _require_cryptography()
    out_path = Path(args.out).expanduser().resolve()

    if out_path.exists() and not args.force:
        print(
            f"ERROR: {out_path} already exists. Refusing to overwrite a signing key "
            "(losing it invalidates every license you have issued).\n"
            "       Pass --force only if you are certain.",
            file=sys.stderr,
        )
        return 2

    out_path.parent.mkdir(parents=True, exist_ok=True)
    private_key = Ed25519PrivateKey.generate()
    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    out_path.write_bytes(pem)
    _harden_permissions(out_path)

    print(f"Private key written to: {out_path}")
    print("KEEP THIS FILE OFFLINE. It is gitignored (*.pem / license_private_key*).")
    print("Back it up somewhere safe - without it you cannot issue new licenses.")
    print()
    _print_public_key(private_key)
    return 0


def cmd_pubkey(args: argparse.Namespace) -> int:
    _print_public_key(_load_private_key(args.private_key))
    return 0


def cmd_fingerprint(args: argparse.Namespace) -> int:
    license_service = _license_module()
    fingerprint = license_service.get_machine_fingerprint()
    if args.json:
        print(
            json.dumps(
                {
                    "machine": fingerprint,
                    "hostname": socket.gethostname(),
                    "user": getpass.getuser(),
                    "source": "HKLM\\SOFTWARE\\Microsoft\\Cryptography\\MachineGuid"
                    if sys.platform == "win32"
                    else "platform.node()+getpass.getuser()",
                },
                indent=2,
            )
        )
    else:
        print(fingerprint)
    return 0


def _parse_expiry(text: str) -> int:
    """Accepts YYYY-MM-DD (end of that UTC day) or raw unix seconds."""
    cleaned = (text or "").strip()
    if not cleaned:
        raise ValueError("empty")
    if cleaned.isdigit():
        return int(cleaned)
    day = datetime.datetime.strptime(cleaned, "%Y-%m-%d").replace(tzinfo=datetime.timezone.utc)
    end_of_day = day + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)
    return int(end_of_day.timestamp())


def cmd_mint(args: argparse.Namespace) -> int:
    license_service = _license_module()
    private_key = _load_private_key(args.private_key)

    if args.plan not in PLANS:
        print(f"ERROR: --plan must be one of {', '.join(PLANS)}", file=sys.stderr)
        return 2

    try:
        exp = None if args.exp is None else _parse_expiry(args.exp)
    except Exception:
        print("ERROR: --exp must be YYYY-MM-DD or unix seconds.", file=sys.stderr)
        return 2

    if args.portable and args.machine:
        print("ERROR: use either --machine or --portable, not both.", file=sys.stderr)
        return 2

    if args.portable:
        machine = None
    elif args.machine:
        machine = args.machine.strip()
    else:
        machine = license_service.get_machine_fingerprint()

    key_id = args.key or f"CV-{datetime.datetime.now(datetime.timezone.utc):%Y%m%d}-{secrets.token_hex(3).upper()}"

    payload = {
        "v": 1,
        "key": key_id,
        "email": args.email,
        "plan": args.plan,
        "machine": machine,
        "iat": int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
        "exp": exp,
        "activations": int(args.activations),
    }

    blob = license_service.sign_payload(payload, private_key)

    # Never emit a blob that cannot be verified: check the signature with the
    # matching public key before printing. (Signature-only, deliberately skipping
    # the expiry/machine policy checks so a deliberately expired or
    # other-machine license can still be minted for QA.)
    serialization, _priv, _pub = _require_cryptography()
    public_raw = private_key.public_key().public_bytes(
        serialization.Encoding.Raw, serialization.PublicFormat.Raw
    )
    try:
        head, body, signature = blob.split(".")
        payload_bytes = license_service._b64url_decode(body)
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

        Ed25519PublicKey.from_public_bytes(public_raw).verify(
            license_service._b64url_decode(signature), payload_bytes
        )
        verify_error = None
    except Exception as exc:
        verify_error = exc

    if verify_error is not None:
        print(f"ERROR: minted blob failed self-verification: {verify_error}", file=sys.stderr)
        return 1

    print("License minted; Ed25519 signature self-verified.")
    if args.json:
        print(json.dumps({"payload": payload, "blob": blob}, indent=2))
    else:
        print()
        print(f"  key id   : {payload['key']}")
        print(f"  email    : {payload['email']}")
        print(f"  plan     : {payload['plan']}")
        print(f"  machine  : {payload['machine'] if payload['machine'] else 'PORTABLE (any machine)'}")
        if exp:
            print(f"  expires  : {datetime.datetime.fromtimestamp(exp, datetime.timezone.utc):%Y-%m-%d}")
        else:
            print("  expires  : never")
        print()
        print("Blob (send this to the customer as their license key):")
        print()
        print(blob)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mint_license.py",
        description="ClipVault Studio owner-side license minting (Ed25519, offline).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_keygen = sub.add_parser("keygen", help="generate a new Ed25519 signing keypair")
    p_keygen.add_argument("--out", default=str(DEFAULT_KEY_PATH), help="private key PEM path")
    p_keygen.add_argument("--force", action="store_true", help="overwrite an existing key")
    p_keygen.set_defaults(func=cmd_keygen)

    p_mint = sub.add_parser("mint", help="mint a signed license blob")
    p_mint.add_argument("--private-key", default=str(DEFAULT_KEY_PATH), help="signing key PEM")
    p_mint.add_argument("--email", required=True, help="customer email")
    p_mint.add_argument("--plan", default="pro", choices=PLANS, help="license plan")
    p_mint.add_argument("--machine", default=None, help="target machine fingerprint")
    p_mint.add_argument("--portable", action="store_true", help="issue machine-unbound (machine: null)")
    p_mint.add_argument("--exp", default=None, help="expiry as YYYY-MM-DD or unix seconds (default: never)")
    p_mint.add_argument("--key", default=None, help="explicit license id (default: auto)")
    p_mint.add_argument("--activations", default=1, type=int, help="seat count recorded in payload")
    p_mint.add_argument("--json", action="store_true", help="machine-readable output")
    p_mint.set_defaults(func=cmd_mint)

    p_fp = sub.add_parser("fingerprint", help="print this machine's fingerprint")
    p_fp.add_argument("--json", action="store_true", help="machine-readable output")
    p_fp.set_defaults(func=cmd_fingerprint)

    p_pub = sub.add_parser("pubkey", help="print the public key for an existing PEM")
    p_pub.add_argument("--private-key", default=str(DEFAULT_KEY_PATH), help="signing key PEM")
    p_pub.set_defaults(func=cmd_pubkey)

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
