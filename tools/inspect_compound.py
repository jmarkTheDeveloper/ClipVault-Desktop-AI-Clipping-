import json

d = json.load(open(r"C:\Users\Dell User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\1019\draft_content.json", encoding="utf-8"))
dm = d["materials"]["drafts"][0]
inner = dm.get("draft")
print(f"Inner draft keys: {list(inner.keys())}")
print(f"Inner duration: {inner.get('duration', 0) / 1_000_000:.2f}s")
tracks = inner.get("tracks", [])
print(f"Inner Tracks: {len(tracks)}")
for idx, tr in enumerate(tracks):
    print(f"  Track #{idx}: type={tr.get('type')}, segments={len(tr.get('segments', []))}")
    if tr.get("type") == "text":
        for s in tr.get("segments", [])[:3]:
            print(f"    Text seg: {s.get('target_timerange')}")

materials = inner.get("materials", {})
print(f"Inner materials: {list(materials.keys())}")
vids = materials.get("videos", [])
for v in vids:
    print(f"  Video: name={v.get('material_name')}, path={v.get('path')}")
texts = materials.get("texts", [])
print(f"Total inner texts: {len(texts)}")
for t in texts[:10]:
    try:
        cont = json.loads(t.get("content", "{}"))
        print(f"  Text: '{cont.get('text')}'")
    except:
        pass
