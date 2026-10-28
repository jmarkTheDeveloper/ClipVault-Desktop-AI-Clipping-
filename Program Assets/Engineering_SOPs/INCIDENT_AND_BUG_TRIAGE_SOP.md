# Incident & Bug Triage SOP

## Standard Operating Procedure: SOP-ENG-002
**Objective**: Diagnose and resolve common technical anomalies in the ClipVault desktop runtime environment.

---

## 1. Common Incidents & Rapid Remedies

### Incident 1: "Engine Not Reachable" or "403 Forbidden"
* **Root Cause**: The Python backend requires the session token, or loopback origins (`localhost`, `127.0.0.1`) were not recognized.
* **Remedy**:
  1. Verify `server.py` auth middleware allows trusted loopback traffic:
     `is_loopback = client_host in ("127.0.0.1", "::1", "localhost")`
  2. Verify that `/api/license/status` is included in `PUBLIC_PATHS`.
  3. Check that `CLIPVAULT_AUTH_TOKEN` is passed via `electron/main.js` in `spawn()`.

### Incident 2: Blue PowerShell or CMD Console Windows Popping Up
* **Root Cause**: Subprocess calls in Python or Node without `CREATE_NO_WINDOW` or `-WindowStyle Hidden`.
* **Remedy**:
  - Always pass `creationflags=subprocess.CREATE_NO_WINDOW` in Python subprocesses.
  - In Node `child_process.exec`, ensure `windowsHide: true`.

### Incident 3: Frame Seeking Freeze During Face Tracking
* **Root Cause**: Sampling rate set too high (e.g. 3.0 FPS on an 88-second clip causes 264 keyframe seeks taking 300+ seconds).
* **Remedy**:
  - Verify `face_tracker.py` line 642 uses the adaptive sample cap:
    `num_samples = min(20, max(6, int(round(clip.duration * 0.65))))`
  - Ensure sample seeks never exceed 20 points per clip.

### Incident 4: Port 8000 Conflict / Orphan Python Processes
* **Root Cause**: A previous session terminated abruptly leaving a background `engine_server.exe` bound to port 8000.
* **Remedy**:
  Run in PowerShell:
  ```powershell
  # Find and kill any orphan process listening on port 8000
  $conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
  if ($conn) { Stop-Process -Id $conn.OwningProcess -Force }
  ```

---

## 2. Log Collection & Diagnostic Files
- **Backend Logs**: Printed to Electron console with `[Backend]:` prefix.
- **Task Logs**: Automatically recorded in `<appDataDir>\brain\<conversation-id>\.system_generated\tasks\`.
- **Media Analysis**: Run `python quality_benchmark.py` to benchmark encoder throughput and face tracking fidelity.
