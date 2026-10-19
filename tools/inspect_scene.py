import cv2, os
from pathlib import Path

files = list(Path("engine/clips/Shorts Viral").glob("*.mp4"))
target_clip = [f for f in files if "_1.mp4" in f.name][0]
print("Target clip:", target_clip.name)

cap = cv2.VideoCapture(str(target_clip))
fps = cap.get(cv2.CAP_PROP_FPS)

out_dir = Path("scratch/inspect_glitch/all_frames")
out_dir.mkdir(parents=True, exist_ok=True)

start_frame = int(28.0 * fps)
end_frame = int(30.5 * fps)

cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
for f in range(start_frame, end_frame):
    ret, frame = cap.read()
    if not ret: break
    t = f / fps
    cv2.imwrite(str(out_dir / f"f_{f:04d}_{t:05.2f}s.jpg"), frame)

print(f"Extracted {end_frame - start_frame} frames from {start_frame} ({28.0}s) to {end_frame} ({30.5}s)")
cap.release()
