import json

d = json.load(open(r"C:\Users\Dell User\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\1019\draft_content.json", encoding="utf-8"))
dm = d["materials"]["drafts"][0]
inner = dm.get("draft")
tracks = inner.get("tracks", [])
text_materials = {m["id"]: m for m in inner.get("materials", {}).get("texts", [])}

print("=== TRACK #3 (SUBTITLES) ===")
for seg in tracks[3].get("segments", []):
    tr = seg.get("target_timerange", {})
    st = tr.get("start", 0) / 1_000_000
    dur = tr.get("duration", 0) / 1_000_000
    mat_id = seg.get("material_id")
    mat = text_materials.get(mat_id, {})
    raw_content = mat.get("content", "{}")
    try:
        t_obj = json.loads(raw_content)
        txt = t_obj.get("text", "")
    except:
        txt = raw_content
    print(f"[{st:5.2f}s - {st+dur:5.2f}s] {txt}")
