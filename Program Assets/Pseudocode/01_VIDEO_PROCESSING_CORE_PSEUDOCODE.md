# Video Processing Core Engine Pseudocode

## File: `engine/services/video_processor.py`

```python
FUNCTION process_video(url, num_clips, target_duration, layout, export_resolution, progress_callback, cancel_event):
    """
    Main orchestration entry point: ingests long-form video, curates viral clips,
    and renders vertical 9:16 shorts using parallel hardware acceleration.
    """
    
    // STEP 1: RESOLUTION & ASPECT RATIO INITIALIZATION
    res_str = lowercase(strip(export_resolution OR "1080p"))
    active_aspect_ratio = 9.0 / 16.0  // Default to 9:16 vertical shorts
    
    target_width, target_height = calculate_canvas_dimensions(1920, active_aspect_ratio)
    // Results in target_width = 1080, target_height = 1920 for standard 1080p vertical
    
    // STEP 2: HARDWARE ENCODER DETECTION
    codec, preset, ffmpeg_params, threads = detect_hardware_encoder()
    // Returns ('h264_qsv', 'ultrafast') OR ('h264_nvenc', 'p4') OR ('libx264', 'ultrafast')
    
    // STEP 3: AUDIO INGESTION & SPEECH TRANSCRIPTION
    IF is_youtube_url(url):
        UPDATE progress_callback("Connecting to HD stream and extracting audio...", 10)
        audio_path, video_info = downloader.extract_audio_stream(url)
    ELSE:
        audio_path = extract_audio_from_local_file(url)
        
    UPDATE progress_callback("Running Faster-Whisper millisecond speech alignment...", 25)
    word_map = whisper_transcriber.transcribe_with_timestamps(audio_path)
    // Structure: [{'word': 'Hello', 'start': 0.12, 'end': 0.45}, ...]
    
    // STEP 4: AI VIRAL CURATION & HOOK SCORING
    UPDATE progress_callback("Selecting viral hooks with AI...", 35)
    clip_specs = ai_curator.select_viral_highlights(
        transcript=word_map,
        target_clips=num_clips,
        target_duration=target_duration
    )
    // Structure: [{'start': 141.4, 'end': 224.7, 'title': 'The Turning Point', 'score': 88}, ...]
    
    // STEP 5: INITIALIZE PARALLEL LOOKAHEAD PREFETCH POOL
    output_files = []
    prefetch_pool = ThreadPoolExecutor(max_workers=2, thread_name="SlicePrefetch")
    prefetch_futures = {}
    
    // Prime the first 2 slices into the queue ahead of time
    FOR prime_idx FROM 1 TO MIN(len(clip_specs), 2):
        prefetch_futures[prime_idx] = prefetch_pool.submit(
            downloader.download_slice, url, clip_specs[prime_idx].start, clip_specs[prime_idx].end, res_str
        )
        
    // Total progress budget for rendering all N clips: 40% to 98% (58% total share)
    clip_share = 58.0 / len(clip_specs)
    
    // STEP 6: PER-CLIP RENDERING LOOP
    FOR i, clip_info IN enumerate(clip_specs, start=1):
        IF cancel_event.is_set():
            BREAK
            
        clip_base = 40.0 + (i - 1) * clip_share
        UPDATE progress_callback("Preparing clip {i}/{total} slice...", clip_base + 0.15 * clip_share)
        
        // PRIME NEXT LOOKAHEAD SLICE (i + 2) WHILE CURRENT CLIP PROCESSES
        IF (i + 2) <= len(clip_specs) AND (i + 2) NOT IN prefetch_futures:
            prefetch_futures[i + 2] = prefetch_pool.submit(
                downloader.download_slice, url, clip_specs[i + 2].start, clip_specs[i + 2].end, res_str
            )
            
        // RETRIEVE CURRENT SLICE (Instant Hit from Prefetch)
        IF i IN prefetch_futures:
            slice_path = prefetch_futures[i].result(timeout=120)
            REMOVE i FROM prefetch_futures
        ELSE:
            slice_path = downloader.download_slice(url, clip_info.start, clip_info.end, res_str)
            
        raw_clip = VideoFileClip(slice_path)
        
        // FAST SCENE CUT DETECTION (Advances with fast grab() pointer)
        scene_cuts = scene_detector.detect_cuts(slice_path, start_time=0.0, end_time=raw_clip.duration)
        
        // INTELLIGENT FACE TRACKING & VIRTUAL CAMERA AUTO-REFRAME
        composed_clip = layout_compositor.compose_layout(
            clip=raw_clip,
            layout=layout,  // e.g. "vertical_crop" / "podcast_split" / "blur"
            target_width=target_width,
            target_height=target_height,
            scene_cut_times=scene_cuts
        )
        
        // WORD-BY-WORD ANIMATED CAPTIONS (Millisecond Karaoke Sync)
        IF add_captions IS TRUE:
            clip_words = filter_words_in_range(word_map, clip_info.start, clip_info.end)
            composed_clip = caption_maker.add_captions(composed_clip, clip_words)
            
        // OPTIONAL BACKGROUND MUSIC (Auto-Ducked Under Speech)
        IF add_music IS TRUE:
            composed_clip = audio_mixer.attach_ducked_music(composed_clip, target_volume=0.25)
            
        // RENDER VIDEO FILE WITH HARDWARE ACCELERATOR
        out_filename = sanitize_filename(clip_info.title) + ".mp4"
        out_path = target_directory / out_filename
        
        logger = CustomProgressLogger(
            on_progress=progress_callback,
            clip_index=i,
            total_clips=len(clip_specs),
            clip_base=clip_base,
            clip_share=clip_share
        )
        
        TRY:
            composed_clip.write_videofile(
                out_path,
                codec=codec,
                preset=preset,
                threads=threads,
                ffmpeg_params=ffmpeg_params,
                logger=logger
            )
        EXCEPT HardwareEncodingException:
            // FAIL-SAFE FALLBACK TO CPU libx264 ultrafast
            composed_clip.write_videofile(
                out_path,
                codec='libx264',
                preset='ultrafast',
                threads=threads,
                logger=logger
            )
            
        output_files.append(out_path)
        
        // GENERATE METADATA & 9:16 PORTRAIT THUMBNAIL
        save_json_metadata(out_path, clip_info)
        thumbnail_generator.generate_thumbnail(out_path, title=clip_info.title)
        
        // CLEANUP INTERMEDIATE MEMORY & SLICE FILE
        composed_clip.close()
        raw_clip.close()
        DELETE slice_path FROM disk
        gc.collect()
        
        UPDATE progress_callback("Finalized Clip {i}/{total}", 40.0 + i * clip_share)
        
    // STEP 7: CLEANUP & RETURN
    prefetch_pool.shutdown(wait=False, cancel_futures=True)
    SystemGuard.reclaim_memory()
    UPDATE progress_callback("All viral clips finalized!", 100)
    RETURN output_files, video_info.title, target_directory
```
