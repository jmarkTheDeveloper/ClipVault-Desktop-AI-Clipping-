# AI Curation & Hook Scoring Pseudocode

## File: `engine/services/ai_curator.py`

```python
FUNCTION select_viral_highlights(word_level_transcript, target_clips=10, target_duration=45):
    """
    Analyzes word-level Whisper transcripts using semantic and psychological hook metrics
    to curate the highest-retention short-form clips.
    """
    
    // STEP 1: SENTENCE & PARAGRAPH SEGMENTATION
    sentences = segment_transcript_by_pauses_and_punctuation(
        word_level_transcript,
        min_pause_seconds=0.65
    )
    
    // STEP 2: SLIDING WINDOW CANDIDATE GENERATION
    candidate_windows = []
    min_duration = MAX(20, target_duration - 15) // e.g. 30s
    max_duration = MIN(120, target_duration + 30) // e.g. 75s
    
    FOR start_idx FROM 0 TO len(sentences) - 1:
        current_words = []
        FOR end_idx FROM start_idx TO len(sentences) - 1:
            current_words.extend(sentences[end_idx].words)
            duration = current_words[-1].end - current_words[0].start
            
            IF duration >= min_duration AND duration <= max_duration:
                candidate_windows.append({
                    'start': current_words[0].start,
                    'end': current_words[-1].end,
                    'text': join_words(current_words),
                    'words': current_words
                })
            ELSE IF duration > max_duration:
                BREAK

    // STEP 3: PSYCHOLOGICAL VIRALITY SCORING (4 Pillars)
    scored_candidates = []
    
    FOR window IN candidate_windows:
        // Pillar 1: Hook Strength (First 3-5 seconds engagement)
        hook_text = get_first_seconds_text(window.words, seconds=4.0)
        hook_score = evaluate_hook_potential(hook_text)
        // High scores for curiosity gaps, contrarian statements, emotional triggers, questions
        
        // Pillar 2: Speech Flow & Cadence
        words_per_minute = (len(window.words) / (window.end - window.start)) * 60
        flow_score = evaluate_cadence(words_per_minute) // Optimal: 140-175 WPM
        
        // Pillar 3: Information Density & Punchline Resolution
        value_score = evaluate_completeness_and_payoff(window.text)
        
        // Pillar 4: Trending Vocabulary & Emotional Polarity
        sentiment_score = analyze_emotional_contrast(window.text)
        
        // Composite Weighted Virality Score (0 - 100 points)
        total_score = (
            hook_score * 0.40 +
            flow_score * 0.25 +
            value_score * 0.20 +
            sentiment_score * 0.15
        )
        
        scored_candidates.append({
            'start': window.start,
            'end': window.end,
            'duration': window.end - window.start,
            'virality_score': ROUND(total_score),
            'hook_score': hook_score,
            'flow_score': flow_score,
            'value_score': value_score,
            'text': window.text
        })

    // STEP 4: NON-MAXIMUM SUPPRESSION (Deduplication)
    // Avoids generating 3 overlapping clips from the exact same segment
    scored_candidates.sort_by(virality_score, descending=True)
    selected_clips = []
    
    FOR candidate IN scored_candidates:
        overlaps = FALSE
        FOR selected IN selected_clips:
            intersection = MAX(0, MIN(candidate.end, selected.end) - MAX(candidate.start, selected.start))
            IF intersection > (0.25 * candidate.duration):
                overlaps = TRUE
                BREAK
                
        IF NOT overlaps:
            // Generate Catchy Title & Hook Subtitle
            candidate['title'] = generate_catchy_headline(candidate.text)
            candidate['hook_text'] = extract_top_punchy_quote(candidate.text)
            selected_clips.append(candidate)
            
        IF len(selected_clips) >= target_clips:
            BREAK

    // STEP 5: RETURN TOP RANKED CLIPS
    RETURN selected_clips
```
