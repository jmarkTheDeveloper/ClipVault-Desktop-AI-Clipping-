# ClipVault REST API Specification

## Server: `http://127.0.0.1:8000` (Local Loopback)

### Authentication
All requests from outside the trusted local loopback origin must provide the session Bearer token:
`Authorization: Bearer <CLIPVAULT_AUTH_TOKEN>`

---

## 1. Video Processing & Clipping Endpoints

### `POST /api/process`
Initiates an autonomous asynchronous video clipping task.

**Request Body (`application/json`):**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "num_clips": 10,
  "target_duration": 45,
  "topic": "Dialogue Highlights",
  "layout": "vertical_crop",
  "split_screen": false,
  "export_resolution": "1080p",
  "add_captions": true,
  "caption_style": "beast_mode",
  "camera_style": "smooth",
  "enable_face_tracker": true,
  "add_bg_music": false,
  "bg_music_vol": 0.25,
  "auto_sfx": true,
  "custom_file_name": "MyViralShort",
  "lang_hint": "en"
}
```

**Response (`200 OK`):**
```json
{
  "task_id": "8f3e2b1a-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
  "status": "Task queued successfully",
  "message": "Initializing video download and audio stream...",
  "progress": 5,
  "started_at": 1729856181.91
}
```

---

### `GET /api/progress/{task_id}`
Polls real-time progress of an active clipping task.

**Response (`200 OK`):**
```json
{
  "task_id": "8f3e2b1a-4c5d-6e7f-8a9b-0c1d2e3f4a5b",
  "status": "Rendering Video 2/10 (65%)...",
  "state": "processing",
  "progress": 52,
  "completed": false,
  "cancelled": false,
  "failed": false,
  "clips": [
    "C:/Users/User/.../clips/clip_1_88pts.mp4"
  ],
  "output_dir": "C:/Users/User/.../clips",
  "title": "Lex Fridman Podcast #400"
}
```

---

### `POST /api/cancel`
Immediately aborts an active task and shuts down worker threads.

**Request Body (`application/json`):**
```json
{
  "task_id": "8f3e2b1a-4c5d-6e7f-8a9b-0c1d2e3f4a5b"
}
```

**Response (`200 OK`):**
```json
{
  "status": "cancelled",
  "message": "Task cancelled by user. Background workers cleanly stopped."
}
```

---

## 2. Vault & Media Endpoints

### `GET /api/saved_clips`
Retrieves all generated clips, metadata, thumbnails, and virality scores.

**Response (`200 OK`):**
```json
{
  "clips": [
    {
      "filename": "How Is Zelensky Really Doing.mp4",
      "path": "engine/clips/How Is Zelensky Really Doing.mp4",
      "thumbnail": "/api/thumbnail?file=How%20Is%20Zelensky%20Really%20Doing.mp4",
      "title": "How Is Zelensky Really Doing?",
      "virality_score": 88,
      "duration": 83.3,
      "created_at": 1729856181.91,
      "size_mb": 24.5
    }
  ],
  "total": 1
}
```

---

### `POST /api/delete_clip`
Permanently unlinks a clip video, thumbnail, and metadata files from disk.

**Request Body (`application/json`):**
```json
{
  "filename": "How Is Zelensky Really Doing.mp4"
}
```

**Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "Permanently deleted clip and metadata files from disk."
}
```

---

## 3. Commercial Licensing Endpoints

### `GET /api/license/status`
Checks current license state. Excluded from auth requirements for boot verification.

**Response (`200 OK`):**
```json
{
  "status": "online",
  "is_licensed": true,
  "license_tier": "pro_creator",
  "expires_at": 1761408000,
  "days_remaining": 365,
  "licensed_email": "creator@example.com"
}
```

---

### `POST /api/license/activate`
Activates an offline digital license key or Lemon Squeezy order key.

**Request Body (`application/json`):**
```json
{
  "license_key": "CV-PRO-BASE64PAYLOAD..."
}
```

**Response (`200 OK`):**
```json
{
  "status": "activated",
  "is_licensed": true,
  "tier": "pro_creator",
  "message": "License successfully verified and activated."
}
```
