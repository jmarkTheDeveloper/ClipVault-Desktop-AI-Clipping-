import json
import os
import shutil
import uuid
import time
from pathlib import Path

# Paths
capcut_drafts_dir = Path(os.path.expandvars(r"%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft"))
proj_1019_dir = capcut_drafts_dir / "1019"
draft_file = proj_1019_dir / "draft_content.json"
root_meta_file = capcut_drafts_dir / "root_meta_info.json"

nyc_video_path = "C:/Users/Dell User/Videos/Tom Holland in New York City (NYC Fans).mp4"
whoosh_audio_path = "C:/Users/Dell User/Videos/whoosh_sfx.mp3"

if not draft_file.exists():
    print(f"Error: {draft_file} does not exist")
    exit(1)

# 1. Backup original draft
backup_file = proj_1019_dir / f"draft_content.json.backup_{int(time.time())}"
shutil.copyfile(draft_file, backup_file)
print(f"[1/4] Created backup at: {backup_file.name}")

# 2. Load draft
with open(draft_file, "r", encoding="utf-8") as f:
    draft_data = json.load(f)

# Locate inner compound draft
dm = draft_data.get("materials", {}).get("drafts", [{}])[0]
inner = dm.get("draft")
if not inner:
    print("Error: No inner compound draft found")
    exit(1)

# 3. Create Video Material for NYC clip
new_vid_id = str(uuid.uuid4()).upper()
new_vid_mat = {
    "id": new_vid_id,
    "unique_id": "",
    "type": "video",
    "duration": 5000000,
    "path": nyc_video_path.replace("\\", "/"),
    "media_path": "",
    "local_id": "",
    "has_audio": False,
    "reverse_path": "",
    "intensifies_path": "",
    "reverse_intensifies_path": "",
    "intensifies_audio_path": "",
    "cartoon_path": "",
    "width": 1920,
    "height": 1080,
    "category_id": "",
    "category_name": "",
    "material_id": "",
    "material_name": "Tom Holland in New York City (NYC Fans).mp4",
    "material_url": "",
    "crop": {"upper_left_x": 0.0, "upper_left_y": 0.0, "upper_right_x": 1.0, "upper_right_y": 0.0, "lower_left_x": 0.0, "lower_left_y": 1.0, "lower_right_x": 1.0, "lower_right_y": 1.0},
    "crop_ratio": "free",
    "audio_fade": None,
    "crop_scale": 1.0,
    "extra_type_option": 0,
    "stable": {"stable_level": 0, "matrix_path": "", "time_range": {"start": 0, "duration": 0}},
    "matting": {"flag": 0, "path": "", "interactiveTime": [], "has_use_quick_brush": False, "strokes": [], "has_use_quick_eraser": False, "expansion": 0, "feather": 0, "reverse": False, "custom_matting_id": "", "enable_matting_stroke": False, "is_clould": False, "mask_video_path": "", "cloud_product_fps": 0.0},
    "source": 0,
    "source_platform": 0,
    "formula_id": "",
    "check_flag": 62978047
}
inner.setdefault("materials", {}).setdefault("videos", []).append(new_vid_mat)
print(f"[2/4] Created video material ID: {new_vid_id} -> {nyc_video_path}")

# 4. Create Video Segment on Track #1 (Overlay Video Track)
# The gap is between 14.766s and 17.766s where Tom Holland says 'I WAS IN NEW YORK'
new_seg_id = str(uuid.uuid4()).upper()
new_video_seg = {
    "id": new_seg_id,
    "source_timerange": {"start": 0, "duration": 3000000},
    "target_timerange": {"start": 14766666, "duration": 3000000},
    "render_timerange": {"start": 0, "duration": 0},
    "desc": "Tom Holland NYC B-Roll Cutaway",
    "state": 0,
    "speed": 1.0,
    "is_loop": False,
    "is_tone_modify": False,
    "reverse": False,
    "intensifies_audio": False,
    "cartoon": False,
    "volume": 0.0,  # Muted so podcast speech remains clear
    "last_nonzero_volume": 0.0,
    "clip": {
        "scale": {"x": 1.0, "y": 1.0},
        "rotation": 0.0,
        "transform": {"x": 0.0, "y": 0.0},
        "flip": {"vertical": False, "horizontal": False},
        "alpha": 1.0
    },
    "uniform_scale": {"on": True, "value": 1.0},
    "material_id": new_vid_id,
    "extra_material_refs": [],
    "render_index": 1,
    "keyframe_refs": [],
    "enable_lut": False,
    "enable_adjust": False,
    "enable_hsl": False,
    "visible": True,
    "group_id": "",
    "enable_color_curves": True,
    "enable_hsl_curves": True,
    "track_render_index": 1,
    "hdr_settings": None,
    "hdr_vivid_settings": None,
    "enable_color_wheels": True,
    "track_attribute": 0,
    "is_placeholder": False,
    "template_id": "",
    "enable_smart_color_adjust": False,
    "template_scene": "default",
    "common_keyframes": [],
    "caption_info": None,
    "responsive_layout": {"enable": False, "target_follow": "", "size_layout": 0, "horizontal_pos_layout": 0, "vertical_pos_layout": 0},
    "enable_color_match_adjust": False,
    "enable_color_correct_adjust": False,
    "enable_adjust_mask": False,
    "raw_segment_id": "",
    "lyric_keyframes": None,
    "enable_video_mask": True,
    "digital_human_template_group_id": "",
    "color_correct_alg_result": "",
    "source": "segmentsourcenormal",
    "enable_mask_stroke": False,
    "enable_mask_shadow": False,
    "enable_color_adjust_pro": False,
    "segment_color_tag": ""
}

# Insert into Track #1 (sorted by start time)
track_1_segs = inner["tracks"][1].get("segments", [])
track_1_segs.append(new_video_seg)
track_1_segs.sort(key=lambda s: s.get("target_timerange", {}).get("start", 0))
inner["tracks"][1]["segments"] = track_1_segs
print(f"[3/4] Injected NYC B-Roll overlay into Track #1 at [14.77s - 17.77s]")

# 5. Create Audio Material & Segment for Whoosh SFX
new_audio_id = str(uuid.uuid4()).upper()
new_audio_mat = {
    "id": new_audio_id,
    "name": "whoosh_sfx.mp3",
    "path": whoosh_audio_path.replace("\\", "/"),
    "duration": 2000000,
    "type": "extract_music",
    "category_id": "",
    "category_name": "",
    "check_flag": 1,
    "formula_id": "",
    "intensifies_path": "",
    "local_material_id": "",
    "music_id": "",
    "source_platform": 0,
    "wave_points": []
}
inner.setdefault("materials", {}).setdefault("audios", []).append(new_audio_mat)

# Add Whoosh audio segment right at 14.766s
audio_seg_id = str(uuid.uuid4()).upper()
new_audio_seg = {
    "id": audio_seg_id,
    "source_timerange": {"start": 0, "duration": 1500000},
    "target_timerange": {"start": 14766666, "duration": 1500000},
    "render_timerange": {"start": 0, "duration": 0},
    "desc": "Whoosh Transition SFX",
    "state": 0,
    "speed": 1.0,
    "is_loop": False,
    "is_tone_modify": False,
    "reverse": False,
    "intensifies_audio": False,
    "cartoon": False,
    "volume": 0.85,
    "last_nonzero_volume": 0.85,
    "clip": None,
    "material_id": new_audio_id,
    "extra_material_refs": [],
    "render_index": 0,
    "keyframe_refs": []
}

# If Track #5 exists and is audio, append to it; otherwise add a new audio track
has_audio_track = False
for tr in inner.get("tracks", []):
    if tr.get("type") == "audio":
        tr.setdefault("segments", []).append(new_audio_seg)
        tr["segments"].sort(key=lambda s: s.get("target_timerange", {}).get("start", 0))
        has_audio_track = True
        break

if not has_audio_track:
    inner.setdefault("tracks", []).append({
        "id": str(uuid.uuid4()).upper(),
        "type": "audio",
        "segments": [new_audio_seg],
        "attribute": 0,
        "flag": 0
    })
print(f"[4/4] Added Whoosh SFX at 14.77s for dynamic impact")

# Save modified draft back to 1019
with open(draft_file, "w", encoding="utf-8") as f:
    json.dump(draft_data, f, ensure_ascii=False, indent=2)
print("Successfully updated 1019/draft_content.json!")

# 6. Also create a duplicate draft '1019_Viral_Cut' so user can open it instantly from CapCut projects!
viral_draft_dir = capcut_drafts_dir / "1019_Viral_Cut"
if viral_draft_dir.exists():
    shutil.rmtree(viral_draft_dir)
shutil.copytree(proj_1019_dir, viral_draft_dir)

viral_draft_file = viral_draft_dir / "draft_content.json"
with open(viral_draft_file, "w", encoding="utf-8") as f:
    json.dump(draft_data, f, ensure_ascii=False, indent=2)

# Register 1019_Viral_Cut in root_meta_info.json
if root_meta_file.exists():
    try:
        with open(root_meta_file, "r", encoding="utf-8") as f:
            meta = json.load(f)
        
        all_drafts = meta.get("all_draft_store", [])
        new_entry_id = str(uuid.uuid4()).upper()
        # Find 1019 entry to clone properties
        orig_entry = next((e for e in all_drafts if e.get("draft_name") == "1019"), None)
        if orig_entry:
            new_entry = dict(orig_entry)
            new_entry["draft_id"] = new_entry_id
            new_entry["draft_name"] = "1019_Viral_Cut"
            new_entry["draft_fold_path"] = str(viral_draft_dir).replace("\\", "/")
            new_entry["draft_json_file"] = str(viral_draft_file).replace("\\", "/")
            new_entry["draft_cover"] = str(viral_draft_dir / "draft_cover.jpg").replace("\\", "/")
            new_entry["tm_draft_modified"] = int(time.time() * 1_000_000)
            
            # Remove old entry with same name if exists
            all_drafts = [e for e in all_drafts if e.get("draft_name") != "1019_Viral_Cut"]
            all_drafts.insert(0, new_entry)
            meta["all_draft_store"] = all_drafts
            if isinstance(meta.get("draft_ids"), int):
                meta["draft_ids"] += 1
            
            with open(root_meta_file, "w", encoding="utf-8") as f:
                json.dump(meta, f, ensure_ascii=False, indent=2)
            print("Successfully registered '1019_Viral_Cut' in CapCut's root_meta_info.json!")
    except Exception as meta_err:
        print(f"Note on root_meta_info: {meta_err}")
