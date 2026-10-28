# ClipVault Program Assets & Engineering Documentation

This directory contains the complete technical specifications, architecture flowcharts, algorithm pseudocode, and engineering standard operating procedures (SOPs) for the ClipVault desktop software.

---

## Directory Navigation

### 1. `Flowcharts/`
Visual architecture diagrams and sequence flows rendered in standard GitHub-compatible Mermaid:
- [`01_SYSTEM_ARCHITECTURE_FLOWCHART.md`](Flowcharts/01_SYSTEM_ARCHITECTURE_FLOWCHART.md) — Presentation, IPC loopback, FastAPI backend, and hardware layers.
- [`02_VIDEO_CLIPPING_PIPELINE_FLOWCHART.md`](Flowcharts/02_VIDEO_CLIPPING_PIPELINE_FLOWCHART.md) — 5-phase execution flow from YouTube/local ingestion to vertical MP4 export.
- [`03_LICENSING_AND_AUTH_FLOWCHART.md`](Flowcharts/03_LICENSING_AND_AUTH_FLOWCHART.md) — Ed25519 digital signatures, session token security, and Lemon Squeezy integration.
- [`04_PARALLEL_PREFETCH_FLOWCHART.md`](Flowcharts/04_PARALLEL_PREFETCH_FLOWCHART.md) — ThreadPool lookahead prefetching pipeline sequence diagram.

### 2. `Pseudocode/`
Algorithm logic and design specifications for all core engine services:
- [`01_VIDEO_PROCESSING_CORE_PSEUDOCODE.md`](Pseudocode/01_VIDEO_PROCESSING_CORE_PSEUDOCODE.md) — Full logic of `process_video()`, lookahead queue, and MoviePy composition.
- [`02_FACE_TRACKING_AND_CAMERA_PSEUDOCODE.md`](Pseudocode/02_FACE_TRACKING_AND_CAMERA_PSEUDOCODE.md) — Multi-tier face tracking, adaptive keyframe sampling, and spring-damper camera director.
- [`03_AI_CURATION_AND_HOOK_SCORING_PSEUDOCODE.md`](Pseudocode/03_AI_CURATION_AND_HOOK_SCORING_PSEUDOCODE.md) — Speech alignment, 4-pillar virality scoring, and non-maximum suppression deduplication.
- [`04_HARDWARE_ACCELERATION_ENCODER_PSEUDOCODE.md`](Pseudocode/04_HARDWARE_ACCELERATION_ENCODER_PSEUDOCODE.md) — Intel QSV, NVIDIA NVENC, AMD AMF, and CPU fallback probes.

### 3. `Architecture_and_API/`
Technical protocols and schemas:
- [`API_SPECIFICATION.md`](Architecture_and_API/API_SPECIFICATION.md) — REST endpoints, request/response models, and error codes.
- [`METADATA_AND_DATA_SCHEMAS.md`](Architecture_and_API/METADATA_AND_DATA_SCHEMAS.md) — JSON schemas for clip metadata, virality scores, word timings, and license keys.
- [`TECH_STACK_AND_DEPENDENCY_MANUAL.md`](Architecture_and_API/TECH_STACK_AND_DEPENDENCY_MANUAL.md) — Operating system requirements, Node/Python packages, and hardware codecs.

### 4. `Engineering_SOPs/`
Standard Operating Procedures for maintenance, deployment, and triage:
- [`RELEASE_AND_DEPLOYMENT_SOP.md`](Engineering_SOPs/RELEASE_AND_DEPLOYMENT_SOP.md) — Testing with `qa_check.py`, Vite bundling, and packaging standalone installers.
- [`INCIDENT_AND_BUG_TRIAGE_SOP.md`](Engineering_SOPs/INCIDENT_AND_BUG_TRIAGE_SOP.md) — Rapid resolution playbooks for port conflicts, auth errors, and subprocesses.
