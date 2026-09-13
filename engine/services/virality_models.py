"""
Virality Models & Scoring Utility Module.
Defines structured data classes and normalization methods for explainable
viral scoring: Hook, Flow, Value, and Trend.
"""
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional


@dataclass
class ViralitySubScores:
    """
    Standardized 0-99 sub-scores matching industry-standard clipping engines.
    """
    hook: int = 85
    flow: int = 80
    value: int = 85
    trend: int = 80

    def to_dict(self) -> Dict[str, int]:
        return {
            "hook": int(max(0, min(99, self.hook))),
            "flow": int(max(0, min(99, self.flow))),
            "value": int(max(0, min(99, self.value))),
            "trend": int(max(0, min(99, self.trend))),
        }

    @classmethod
    def from_dict(cls, data: Optional[Dict[str, Any]]) -> "ViralitySubScores":
        if not isinstance(data, dict):
            return cls()
        return cls(
            hook=int(data.get("hook", 85)),
            flow=int(data.get("flow", 80)),
            value=int(data.get("value", 85)),
            trend=int(data.get("trend", 80)),
        )

    def calculate_composite_score(self) -> int:
        """
        Computes weighted overall virality score.
        Weighting: Hook 35% (opening retention), Flow 25% (pacing), Value 20% (payoff), Trend 20% (virality triggers).
        """
        composite = (self.hook * 0.35) + (self.flow * 0.25) + (self.value * 0.20) + (self.trend * 0.20)
        return int(max(40, min(99, round(composite))))


@dataclass
class ViralityAssessment:
    """
    Comprehensive assessment container for a viral clip candidate.
    """
    title: str
    virality_score: int
    sub_scores: ViralitySubScores
    hook_type: str
    reason: str
    content_title: str
    content_description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "virality_score": int(max(40, min(99, self.virality_score))),
            "sub_scores": self.sub_scores.to_dict(),
            "hook_type": self.hook_type,
            "reason": self.reason,
            "content_title": self.content_title,
            "content_description": self.content_description,
        }


def normalize_sub_scores(
    raw_sub_scores: Optional[Dict[str, Any]],
    overall_score: int,
    hook_bonus: float = 0.0,
    wpm: float = 140.0
) -> ViralitySubScores:
    """
    Safely extracts or estimates consistent Hook, Flow, Value, and Trend sub-scores
    derived from candidate analysis if the model did not supply complete sub-scores.
    """
    if isinstance(raw_sub_scores, dict) and all(k in raw_sub_scores for k in ("hook", "flow", "value", "trend")):
        try:
            return ViralitySubScores(
                hook=int(raw_sub_scores["hook"]),
                flow=int(raw_sub_scores["flow"]),
                value=int(raw_sub_scores["value"]),
                trend=int(raw_sub_scores["trend"]),
            )
        except (ValueError, TypeError):
            pass

    base = max(50, min(98, overall_score))
    
    # Calculate flow relative to optimal 130-185 WPM pacing
    if 130 <= wpm <= 185:
        flow_score = min(98, base + 4)
    elif 100 <= wpm < 130 or 185 < wpm <= 220:
        flow_score = base
    else:
        flow_score = max(55, base - 10)

    hook_score = int(max(50, min(99, base + hook_bonus)))
    value_score = int(max(50, min(98, base + 2)))
    trend_score = int(max(50, min(98, base - 1)))

    return ViralitySubScores(
        hook=hook_score,
        flow=int(flow_score),
        value=value_score,
        trend=trend_score,
    )
