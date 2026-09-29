import os
import sys
import json
import socket
import hashlib
import requests
from pathlib import Path
from typing import Dict, Any, Optional

from services.vault_crypto import VaultCrypto

VAULT_DIR = Path.home() / ".clipvault"
LICENSE_FILE = VAULT_DIR / "license.json"
LEMON_SQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1/licenses"

# Developer / VIP Offline Master Keys for testing, influencers, and owner access
DEV_MASTER_KEYS = {
    "CV-DEV-VIP-2026-MASTER",
    "CV-FOUNDER-UNLIMITED-ACCESS",
    "CV-LIFETIME-STUDIO-PRO"
}

class LicenseService:
    """
    Commercial Licensing & Anti-Piracy Service for ClipVault.
    Integrates Lemon Squeezy Merchant of Record License API with hardware-bound DPAPI local encryption.
    """

    @classmethod
    def _get_machine_fingerprint(cls) -> str:
        """Generates a stable hardware fingerprint tied to the machine hostname and username."""
        try:
            host = socket.gethostname()
            user = os.getenv("USERNAME") or os.getenv("USER") or "default_user"
            raw = f"CLIPVAULT_HW_{host}_{user}".encode("utf-8")
            return hashlib.sha256(raw).hexdigest()[:24]
        except Exception:
            return "CLIPVAULT_STABLE_HW"

    @classmethod
    def _get_device_name(cls) -> str:
        """Returns a user-friendly device name for Lemon Squeezy instance tracking."""
        try:
            return f"{socket.gethostname()} ({os.getenv('USERNAME') or 'User'})"
        except Exception:
            return "Windows Desktop"

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Checks if a valid, hardware-bound license exists on this machine."""
        try:
            if not LICENSE_FILE.exists() or LICENSE_FILE.stat().st_size == 0:
                return {"licensed": False, "message": "No license key found."}

            with open(LICENSE_FILE, "r", encoding="utf-8") as f:
                content = f.read()

            data = VaultCrypto.decrypt_data(content)
            if not isinstance(data, dict):
                return {"licensed": False, "message": "Corrupted license data."}

            # Verify hardware binding checksum
            stored_checksum = data.get("hw_fingerprint")
            current_checksum = cls._get_machine_fingerprint()
            if stored_checksum and stored_checksum != current_checksum:
                return {
                    "licensed": False,
                    "message": "License machine binding mismatch. Please re-activate on this PC."
                }

            key = data.get("license_key", "")
            preview = f"{key[:4]}-****-****-{key[-4:]}" if len(key) >= 10 else "ACTIVE"

            return {
                "licensed": True,
                "key_preview": preview,
                "user_email": data.get("user_email", "Licensed User"),
                "user_name": data.get("user_name", "Creator"),
                "product_name": data.get("product_name", "ClipVault Studio"),
                "activated_at": data.get("activated_at", ""),
                "instance_id": data.get("instance_id", "")
            }
        except Exception as e:
            return {"licensed": False, "message": f"Error reading license: {str(e)}"}

    @classmethod
    def activate(cls, license_key: str) -> Dict[str, Any]:
        """
        Activates a license key via Lemon Squeezy API or Developer Master Key,
        and saves an encrypted, hardware-bound credential to disk.
        """
        clean_key = (license_key or "").strip()
        if not clean_key:
            return {"success": False, "error": "Please enter a valid license key."}

        # ── 1. Check Developer / VIP Master Bypass Keys ─────────────────────────────
        if clean_key.upper() in DEV_MASTER_KEYS or clean_key.upper().startswith("CV-VIP-"):
            license_data = {
                "license_key": clean_key,
                "status": "active",
                "user_email": "vip-founder@clipvault.app",
                "user_name": "Studio Founder",
                "product_name": "ClipVault Studio (Lifetime Founder)",
                "instance_id": "vip_founder_instance",
                "activated_at": "2026-Lifetime",
                "hw_fingerprint": cls._get_machine_fingerprint()
            }
            cls._save_license_data(license_data)
            return {
                "success": True,
                "licensed": True,
                "message": "ClipVault Lifetime Studio activated successfully.",
                "user_email": license_data["user_email"]
            }

        # ── 2. Online Activation via Lemon Squeezy API ─────────────────────────────
        try:
            device_name = cls._get_device_name()
            res = requests.post(
                f"{LEMON_SQUEEZY_API_URL}/activate",
                headers={"Accept": "application/json"},
                data={
                    "license_key": clean_key,
                    "instance_name": device_name
                },
                timeout=12
            )

            response_data = res.json()
            if not res.ok or not response_data.get("activated"):
                error_msg = response_data.get("error") or "License activation failed. Please check your key or device limits."
                return {"success": False, "error": error_msg}

            # Successful activation
            meta = response_data.get("meta", {})
            instance = response_data.get("instance", {})
            license_info = response_data.get("license_key", {})

            license_data = {
                "license_key": clean_key,
                "status": license_info.get("status", "active"),
                "user_email": meta.get("user_email") or "customer@clipvault.app",
                "user_name": meta.get("user_name") or "Creator",
                "product_name": meta.get("product_name") or "ClipVault Studio",
                "instance_id": instance.get("id", ""),
                "activated_at": instance.get("created_at") or "",
                "hw_fingerprint": cls._get_machine_fingerprint()
            }

            cls._save_license_data(license_data)
            return {
                "success": True,
                "licensed": True,
                "message": "ClipVault successfully activated!",
                "user_email": license_data["user_email"]
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "error": "Could not connect to the activation server. Please check your internet connection and try again."
            }
        except Exception as e:
            return {"success": False, "error": f"Activation error: {str(e)}"}

    @classmethod
    def deactivate(cls) -> Dict[str, Any]:
        """Deactivates the current device on Lemon Squeezy and cleans the local license."""
        try:
            if LICENSE_FILE.exists():
                with open(LICENSE_FILE, "r", encoding="utf-8") as f:
                    content = f.read()
                data = VaultCrypto.decrypt_data(content)
                if isinstance(data, dict):
                    key = data.get("license_key")
                    instance_id = data.get("instance_id")
                    if key and instance_id and key not in DEV_MASTER_KEYS:
                        try:
                            requests.post(
                                f"{LEMON_SQUEEZY_API_URL}/deactivate",
                                headers={"Accept": "application/json"},
                                data={"license_key": key, "instance_id": instance_id},
                                timeout=8
                            )
                        except Exception:
                            pass
                LICENSE_FILE.unlink(missing_ok=True)
            return {"success": True, "licensed": False, "message": "License deactivated."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def _save_license_data(cls, data_dict: Dict[str, Any]) -> None:
        """Saves encrypted license payload to disk via DPAPI."""
        VAULT_DIR.mkdir(parents=True, exist_ok=True)
        encrypted_payload = VaultCrypto.encrypt_data(data_dict)
        with open(LICENSE_FILE, "w", encoding="utf-8") as f:
            f.write(encrypted_payload)
