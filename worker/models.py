from dataclasses import dataclass
from typing import Optional


@dataclass
class Recommendation:
    summary: str
    reasoning: list[str]
    confidence: float
    suggested_action: str
    next_action: str
    risk_level: Optional[str] = None
    priority: Optional[str] = None
    assigned_team: Optional[str] = None
    missing_items: Optional[list[str]] = None
    response_draft: Optional[str] = None
    sla_target: Optional[str] = None
    exception_type: Optional[str] = None
    financial_variance: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "summary": self.summary,
            "reasoning": self.reasoning,
            "confidence": self.confidence,
            "suggestedAction": self.suggested_action,
            "nextAction": self.next_action,
            "riskLevel": self.risk_level,
            "priority": self.priority,
            "assignedTeam": self.assigned_team,
            "missingItems": self.missing_items,
            "responseDraft": self.response_draft,
            "slaTarget": self.sla_target,
            "exceptionType": self.exception_type,
            "financialVariance": self.financial_variance,
        }