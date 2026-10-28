# ClipVault Data Schemas & JSON Specifications

## 1. Clip Metadata Schema (`*.metadata.json`)

Saved alongside every generated clip inside the `metadata/` directory:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ClipMetadata",
  "type": "object",
  "properties": {
    "title": { "type": "string", "description": "Catchy headline generated for social posting" },
    "description": { "type": "string", "description": "SEO optimized description with viral hashtags" },
    "virality_score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "sub_scores": {
      "type": "object",
      "properties": {
        "hook": { "type": "integer", "minimum": 0, "maximum": 100 },
        "flow": { "type": "integer", "minimum": 0, "maximum": 100 },
        "value": { "type": "integer", "minimum": 0, "maximum": 100 },
        "trend": { "type": "integer", "minimum": 0, "maximum": 100 }
      },
      "required": ["hook", "flow", "value", "trend"]
    },
    "hook_type": { "type": "string", "enum": ["Curiosity Gap", "Dialogue Highlight", "Contrarian Take", "High Emotion", "Story Arc"] },
    "reason": { "type": "string", "description": "AI Curation justification explaining why this clip retains attention" },
    "transcription_confidence": { "type": "integer", "minimum": 0, "maximum": 100 },
    "start": { "type": "number", "description": "Start timestamp in seconds relative to original video" },
    "end": { "type": "number", "description": "End timestamp in seconds relative to original video" },
    "duration": { "type": "number", "description": "Total duration in seconds" },
    "source_title": { "type": "string", "description": "Title of the original YouTube/source video" },
    "source_url": { "type": "string", "description": "Original YouTube or local source path" },
    "clip_index": { "type": "integer", "minimum": 1 },
    "total_clips": { "type": "integer", "minimum": 1 },
    "created_at": { "type": "number", "description": "Unix timestamp of generation" }
  },
  "required": ["title", "virality_score", "start", "end", "duration", "created_at"]
}
```

---

## 2. Word-Level Alignment Schema (`words.json`)

Millisecond-precise word timings from Whisper speech recognition:

```json
[
  {
    "word": "The",
    "start": 141.41,
    "end": 141.65,
    "probability": 0.98
  },
  {
    "word": "greatest",
    "start": 141.68,
    "end": 142.15,
    "probability": 0.99
  },
  {
    "word": "secret",
    "start": 142.20,
    "end": 142.68,
    "probability": 0.97
  }
]
```

---

## 3. Cryptographic License Schema

Base64 encoded string containing Ed25519 payload and signature:

```json
{
  "license_id": "CV-2026-X9A21B",
  "tier": "agency_retainer",
  "email": "customer@company.com",
  "organization": "Acme Media Group LLC",
  "max_machines": 3,
  "features": [
    "unlimited_rendering",
    "4k_master_export",
    "custom_branding",
    "karaoke_typography",
    "priority_fast_slicing"
  ],
  "issued_at": 1729856000,
  "expires_at": 1761408000,
  "signature": "3b29c91f4a8b...64_hex_ed25519_signature"
}
```
