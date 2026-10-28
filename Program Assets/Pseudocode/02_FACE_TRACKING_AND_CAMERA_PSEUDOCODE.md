# Face Tracking & Virtual Camera Director Pseudocode

## File: `engine/services/face_tracker.py`

```python
FUNCTION track_and_crop(clip, crop_ratio=9/16, camera_style="smooth", target_resolution=(1080, 1920)):
    """
    AI Virtual Camera Director: analyzes speaker positions across sample frames,
    computes critically-damped smooth camera trajectories, and renders 9:16 portrait frames.
    """
    width, height = clip.size
    base_crop_w = int(height * crop_ratio)
    
    // STEP 1: FAST-EXIT ON LANDSCAPE/CENTER-CROP OVERRIDE
    IF camera_style IN ["off", "none", "center", "fixed"]:
        x1 = (width - base_crop_w) // 2
        RETURN clip.crop(x1=x1, y1=0, width=base_crop_w, height=height)

    // STEP 2: PASS 1 - HIGH-SPEED ADAPTIVE PRE-SCAN ("Watch the video first")
    // Capped at max 20 samples to eliminate multi-minute seeking freezes
    num_samples = MIN(20, MAX(6, INT(clip.duration * 0.65)))
    sample_timestamps = linspace(0.05, clip.duration - 0.05, num_samples)
    
    pre_scanned_frames = []
    
    FOR t IN sample_timestamps:
        frame = clip.get_frame(t)
        
        // Multi-tier face detection cascade
        detected_faces = detect_faces_multi_tier(frame)
        // Returns list of bounding boxes: [{'center_x': 950, 'center_y': 480, 'area': 45000, 'confidence': 0.92}]
        
        signature = compute_spatial_and_color_signature(frame)
        
        pre_scanned_frames.append({
            'timestamp': t,
            'faces': detected_faces,
            'signature': signature
        })

    // STEP 3: SHOT SEGMENTATION & CAMERA CUT DETECTION
    // Identifies transitions between speakers or camera angle switches
    shots = []
    current_shot = [pre_scanned_frames[0]]
    
    FOR i FROM 1 TO len(pre_scanned_frames) - 1:
        prev_item = pre_scanned_frames[i - 1]
        curr_item = pre_scanned_frames[i]
        
        color_diff = compare_histograms(prev_item.signature, curr_item.signature)
        spatial_diff = compare_spatial_diff(prev_item.signature, curr_item.signature)
        
        IF color_diff > 0.40 OR spatial_diff > 0.35:
            // Camera cut detected! Conclude current shot
            shots.append(current_shot)
            current_shot = [curr_item]
        ELSE:
            current_shot.append(curr_item)
            
    shots.append(current_shot)

    // STEP 4: PASS 2 - VIRTUAL CAMERA TRAJECTORY PLANNING
    shot_keyframes = []
    
    FOR shot IN shots:
        // Identify dominant active speaker anchor for this shot
        anchor_x, anchor_y = calculate_dominant_speaker_centroid(shot)
        
        // Compute optimal crop window centered on active speaker
        crop_x = CLAMP(anchor_x - base_crop_w // 2, 0, width - base_crop_w)
        crop_y = CLAMP(anchor_y - height // 2, 0, 0) // Anchor vertically
        
        shot_keyframes.append({
            'start_time': shot[0].timestamp,
            'end_time': shot[-1].timestamp,
            'target_x': crop_x,
            'target_y': crop_y
        })

    // STEP 5: FRAME-BY-FRAME VIRTUAL CAMERA FILTER
    FUNCTION virtual_camera_frame_filter(get_frame, t):
        raw_frame = get_frame(t)
        
        // Find active shot keyframe for timestamp t
        keyframe = find_active_keyframe(shot_keyframes, t)
        
        IF camera_style == "instant":
            x1 = keyframe.target_x
        ELSE IF camera_style == "smooth":
            // Critically-damped spring-damper camera interpolation (zero micro-jitter)
            x1 = smooth_damp(current_x, keyframe.target_x, dt)
            
        x2 = x1 + base_crop_w
        cropped = raw_frame[0:height, x1:x2]
        
        // High-quality Lanczos / Bilinear scale to final export resolution (1080x1920)
        IF cropped.size != target_resolution:
            RETURN cv2.resize(cropped, target_resolution, interpolation=cv2.INTER_LINEAR)
        RETURN cropped

    RETURN clip.fl(virtual_camera_frame_filter)
```
