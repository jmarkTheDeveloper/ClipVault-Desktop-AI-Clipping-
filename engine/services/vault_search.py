"""
VaultSearchEngine Service - Local Natural Language & Multi-Field Search.
Indexes saved video clips and performs fast multi-field relevance scoring
across titles, descriptions, hashtags, hook types, and AI curation reasons.
"""
import re
from typing import List, Dict, Any, Optional


class VaultSearchEngine:
    """
    High-performance in-memory search engine for ClipVault video clips.
    """

    @staticmethod
    def tokenize(text: str) -> List[str]:
        """Splits text into lowercase alphanumeric tokens."""
        if not text:
            return []
        return re.findall(r"\b\w+\b", text.lower())

    @classmethod
    def score_clip(cls, clip: Dict[str, Any], query_tokens: List[str]) -> float:
        """
        Computes a relevance score for a clip against a list of query tokens.
        Higher scores indicate greater relevance.
        """
        if not query_tokens:
            return 1.0

        title = str(clip.get("title", "")).lower()
        filename = str(clip.get("filename", "")).lower()
        desc = str(clip.get("description", "")).lower()
        reason = str(clip.get("reason", "")).lower()
        hook_type = str(clip.get("hook_type", "")).lower()
        folder = str(clip.get("folder", "")).lower()

        score = 0.0
        matched_tokens = 0

        for token in query_tokens:
            token_matched = False

            # Exact phrase / word matches with field weights
            if token in title:
                score += 5.0
                token_matched = True
            if token in hook_type:
                score += 4.0
                token_matched = True
            if token in reason:
                score += 3.5
                token_matched = True
            if token in desc:
                score += 3.0
                token_matched = True
            if token in filename:
                score += 2.0
                token_matched = True
            if token in folder:
                score += 1.5
                token_matched = True

            if token_matched:
                matched_tokens += 1

        # All tokens present bonus
        if matched_tokens == len(query_tokens):
            score += 10.0

        # Virality score tie-breaker
        virality_bonus = float(clip.get("virality_score", 50)) * 0.05
        score += virality_bonus

        return score if matched_tokens > 0 else 0.0

    @classmethod
    def search(
        cls,
        clips: List[Dict[str, Any]],
        query: str,
        folder: Optional[str] = None,
        min_score: float = 1.0
    ) -> List[Dict[str, Any]]:
        """
        Searches a list of clips and returns matches sorted by relevance score.
        """
        if not query or not query.strip():
            # If no query, filter by folder if requested
            if folder and folder != "all":
                return [c for c in clips if c.get("folder") == folder]
            return clips

        query_tokens = cls.tokenize(query.strip())
        if not query_tokens:
            return clips

        scored_results = []
        for clip in clips:
            if folder and folder != "all" and clip.get("folder") != folder:
                continue

            score = cls.score_clip(clip, query_tokens)
            if score >= min_score:
                scored_results.append((score, clip))

        # Sort by relevance score descending
        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [clip for _, clip in scored_results]
