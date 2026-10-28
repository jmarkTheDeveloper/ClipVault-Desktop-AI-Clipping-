# License Management & Key Minting SOP

## Standard Operating Procedure: SOP-OPS-002
**Objective**: Mint, issue, verify, and revoke cryptographic Ed25519 commercial license keys for ClipVault customers.

---

## 1. Cryptographic Architecture
ClipVault uses **Ed25519 digital signatures** to provide 100% offline license verification:
- **Private Key (`license_private_key.pem`)**: Kept strictly confidential on the business operator's machine or secure server. Used to sign customer licenses.
- **Public Key**: Hardcoded inside ClipVault's binaries (`engine/services/auth_verifier.py`). Verifies the cryptographic signature without needing to store or expose the private key.

---

## 2. How to Mint a Customer License Key

Use the built-in CLI tool located in `tools/mint_license.py`:

```powershell
cd "c:\Users\Dell User\Downloads\Personal Coding Projects\Python Projects\Desktop AI Clipping Software"

# Example: Mint a 1-year Creator Pro license for a customer
python tools/mint_license.py --email "customer@example.com" --tier "pro_creator" --days 365
```

### Available Tier Options:
- `pro_creator`: Standard 1-machine license (\$29/month or \$249/year).
- `agency_retainer`: 3-machine commercial agency seat (\$79/month or \$699/year).
- `lifetime_founder`: Permanent non-expiring license with `--days 3650` (\$299 one-time).

---

## 3. How to Test and Verify a License String

To verify an existing license string:

```powershell
python -c "from engine.services.auth_verifier import AuthVerifier; print(AuthVerifier.verify_license_key('PASTE_LICENSE_STRING_HERE'))"
```

If the signature and expiry date are valid, this returns:
```json
{
  "valid": true,
  "tier": "pro_creator",
  "email": "customer@example.com",
  "days_remaining": 365
}
```

---

## 4. License Revocation Protocol
If a customer initiates a chargeback or refund after the 14-day window:
1. Open the Lemon Squeezy Merchant Portal $\rightarrow$ Orders $\rightarrow$ Mark License as **Revoked**.
2. If using the offline database, add the `license_id` to the blacklisted licenses list synced during periodic update checks.
