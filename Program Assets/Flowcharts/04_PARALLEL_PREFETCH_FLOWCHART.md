# Parallel Lookahead Prefetching Flowchart

## 1. Overview
In standard video processing pipelines, network downloads and GPU rendering are strictly sequential:
$\text{Download 1} \rightarrow \text{Render 1} \rightarrow \text{Download 2} \rightarrow \text{Render 2} \dots$
This causes the network card to sit 100% idle for 40–60 seconds while a clip renders, and conversely causes the GPU to sit 100% idle while the next clip downloads.

ClipVault solves this through an asynchronous **Lookahead Prefetching Pipeline** using a dedicated `ThreadPoolExecutor(max_workers=2)`.

---

## 2. Prefetching Execution Flowchart

```mermaid
sequenceDiagram
    autonumber
    participant MainLoop as Main Video Processor Thread
    participant WorkerPool as Background Prefetch Pool (Workers = 2)
    participant CDN as YouTube / HLS CDN
    participant GPU as Video Rendering Engine (MoviePy / FFmpeg)

    Note over MainLoop,WorkerPool: Start of Batch (e.g., 10 Clips)
    MainLoop->>WorkerPool: Submit Task: Prefetch Slice 1
    MainLoop->>WorkerPool: Submit Task: Prefetch Slice 2
    WorkerPool->>CDN: Parallel HTTP Range Requests (Slices 1 & 2)

    Note over MainLoop: Processing Clip 1
    MainLoop->>WorkerPool: Await Slice 1 (.result())
    WorkerPool-->>MainLoop: Return Slice 1 (Downloaded to disk)
    
    par Rendering Clip 1 on GPU
        MainLoop->>GPU: Start Rendering Clip 1 (Takes ~40s)
    and Background Prefetching Clip 2 & 3
        WorkerPool->>CDN: Slice 2 finishes download in ~3s
        MainLoop->>WorkerPool: Submit Task: Prefetch Slice 3
        WorkerPool->>CDN: Slice 3 starts download in background
    end

    GPU-->>MainLoop: Clip 1 Render Complete! Saved to Vault.

    Note over MainLoop: Processing Clip 2 (ZERO Network Latency)
    MainLoop->>WorkerPool: Await Slice 2 (.result())
    WorkerPool-->>MainLoop: Instant Hit! Slice 2 was already on disk for 37 seconds.

    par Rendering Clip 2 on GPU
        MainLoop->>GPU: Start Rendering Clip 2
    and Background Prefetching Clip 4
        MainLoop->>WorkerPool: Submit Task: Prefetch Slice 4
        WorkerPool->>CDN: Slice 4 downloads in background
    end

    Note over MainLoop,GPU: Pipeline repeats until all N clips are finalized.
```

---

## 3. Concurrency Safety Rules
1. **Thread-Safe Filenames**: Each prefetched slice file incorporates a unique hexadecimal UUID (`seg_v_{id}_{st}_{et}_{uuid}.mp4`) to prevent race conditions or overwriting between simultaneous downloads.
2. **Graceful Shutdown**: On cancellation or batch completion, `prefetch_executor.shutdown(wait=False, cancel_futures=True)` immediately aborts pending network tasks and unlinks unrendered slice files from disk.
3. **Silent Progress Decoupling**: Background prefetch threads run without touching the main UI progress bar, ensuring foreground render percentages remain strictly smooth and continuous.
