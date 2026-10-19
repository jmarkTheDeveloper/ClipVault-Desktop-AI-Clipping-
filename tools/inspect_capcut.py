import os
import json
from pathlib import Path

p = Path(os.path.expandvars(r"%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft"))

for f in sorted(p.glob("*/draft_content.json"), key=lambda x: x.stat().st_mtime, reverse=True):
    try:
        d = json.load(open(f, encoding="utf-8"))
        videos = d.get("materials", {}).get("videos", [])
        vnames = [v.get("material_name") for v in videos]
        texts = d.get("materials", {}).get("texts", [])
        print(f"Project: {f.parent.name} | Mod: {f.stat().st_mtime} | Videos: {vnames} | Texts: {len(texts)} | Tracks: {len(d.get('tracks', []))}")
    except Exception as e:
        print(f"Project: {f.parent.name} error: {e}")
