# Licensing & Cryptographic Authorization Flowchart

## 1. Overview
ClipVault implements a zero-trust, local-first commercial licensing architecture:
- **Offline Cryptographic Verification**: Uses asymmetrical **Ed25519 digital signatures** so the desktop app can verify licenses without calling a central license server on every launch.
- **Session Protection**: Each Electron shell launch generates a random 256-bit cryptographically secure token passed to the backend, blocking unauthorized third-party local processes from accessing private endpoints.
- **Merchant of Record**: Integrated with Lemon Squeezy for commercial payment processing and license key minting.

---

## 2. License Verification Flowchart

```mermaid
flowchart TD
    AppLaunch(["User Launches ClipVault Desktop App"]) --> LoadStorage["Read Local Storage (clipvault_license_key)"]
    
    LoadStorage --> KeyExists{"License Key Stored?"}
    
    KeyExists -- No --> TrialCheck{"Active Free Trial Remaining?"}
    TrialCheck -- Yes --> Permitted["Allow Limited Operations (Watermark / Trial Quota)"]
    TrialCheck -- No --> ShowLock["Display License Activation Modal (Require Key)"]
    
    KeyExists -- Yes --> DecodeKey["Parse Base64 License String"]
    DecodeKey --> ExtractPayload["Extract Payload: { email, tier, expires_at, signature }"]
    
    ExtractPayload --> CheckExpiry{"Is Current Time <= expires_at?"}
    CheckExpiry -- No --> Expired["Status: Expired -> Prompt Renewal"]
    
    CheckExpiry -- Yes --> VerifySig["Verify Signature with Hardcoded Ed25519 Public Key"]
    VerifySig --> SigValid{"Signature Mathematically Valid?"}
    
    SigValid -- No --> Tampered["Status: Invalid Key -> Refuse Execution"]
    SigValid -- Yes --> ActivatePro["Status: Verified Active -> Unlock Full Pro Studio Features"]
    
    ShowLock --> UserInputKey["User Enters License Key from Lemon Squeezy"]
    UserInputKey --> PostValidate["POST /api/license/activate"]
    PostValidate --> VerifySig
```

---

## 3. Session Security & Loopback Isolation

```mermaid
sequenceDiagram
    autonumber
    participant Shell as Electron Main Process
    participant Preload as ContextBridge Preload
    participant Renderer as React Frontend
    participant Engine as Python FastAPI Backend

    Shell->>Shell: Generates crypto.randomBytes(32).toString('hex') (BACKEND_AUTH_TOKEN)
    Shell->>Engine: Spawns engine_server.exe with ENV { CLIPVAULT_AUTH_TOKEN }
    Shell->>Preload: Injects token into secure memory
    
    Renderer->>Preload: Invokes API call (e.g., fetch('/api/process'))
    Preload->>Preload: Appends Header: `Authorization: Bearer <AUTH_TOKEN>`
    Preload->>Engine: Dispatches Request to 127.0.0.1:8000
    
    alt Token Valid OR Trusted Loopback Origin
        Engine->>Engine: Middleware verifies HMAC / Session Token
        Engine-->>Renderer: HTTP 200 (Success)
    else Foreign Local Process (No Token)
        Engine-->>Renderer: HTTP 403 Forbidden ("Access token validation failed")
    end
```
