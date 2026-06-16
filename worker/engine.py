"""
Workflow evaluation engine — Python port of lib/workflow-engine.ts.
Same deterministic scoring logic; produces identical classifications.
"""
import re
from typing import Any

from models import Recommendation


def evaluate_vendor_onboarding(input_data: dict[str, Any]) -> Recommendation:
    monthly_spend: float = float(input_data.get("monthlySpend", 0))
    risk_notes: str = str(input_data.get("riskNotes", "")).lower()

    score = 0
    if monthly_spend > 20000:
        score += 35
    elif monthly_spend > 10000:
        score += 20
    elif monthly_spend > 5000:
        score += 10

    risk_keywords = ["security", "soc2", "gdpr", "hipaa", "pci", "sensitive", "critical", "urgent"]
    for kw in risk_keywords:
        if kw in risk_notes:
            score += 8

    risk_level = "high" if score >= 40 else "medium" if score >= 20 else "low"

    missing_items: list[str] = []
    if not re.search(r"msa|contract", risk_notes):
        missing_items.append("MSA or signed contract")
    if not re.search(r"tax|w-9|w9", risk_notes):
        missing_items.append("Tax form")
    if re.search(r"data|pii|security|soc 2", risk_notes) and not re.search(r"soc 2|security review", risk_notes):
        missing_items.append("Security review")

    confidence = max(58, min(94, 94 - score + (5 if not missing_items else 0)))
    needs_escalation = risk_level == "high" or bool(missing_items)

    return Recommendation(
        summary=f"Vendor classified as {risk_level} risk based on spend profile and documentation status.",
        reasoning=[
            f"Monthly spend of ${monthly_spend:,.0f} {'exceeds' if monthly_spend > 20000 else 'is within'} high-risk threshold.",
            f"Risk keywords identified: {', '.join(kw for kw in risk_keywords if kw in risk_notes) or 'none'}.",
            f"Missing documentation: {', '.join(missing_items) if missing_items else 'none'}.",
        ],
        confidence=confidence,
        suggested_action="Escalate for senior review" if needs_escalation else "Approve with standard terms",
        next_action="Collect missing documents" if missing_items else "Send approval to procurement",
        risk_level=risk_level,
        missing_items=missing_items if missing_items else None,
    )


def evaluate_customer_escalation(input_data: dict[str, Any]) -> Recommendation:
    tier: str = str(input_data.get("tier", "startup"))
    sentiment: str = str(input_data.get("sentiment", "neutral"))
    text: str = str(input_data.get("issueSummary", "")).lower()
    arr_impact: float = float(input_data.get("arrImpact", 0))

    score = 0
    if sentiment == "angry":
        score += 4
    elif sentiment == "frustrated":
        score += 3
    if tier in ("enterprise", "strategic"):
        score += 3
    if arr_impact >= 250000:
        score += 3
    elif arr_impact >= 75000:
        score += 2
    if re.search(r"outage|blocked|renewal|executive|churn|security", text):
        score += 2

    priority = (
        "critical" if score >= 9
        else "high" if score >= 6
        else "medium" if score >= 3
        else "low"
    )

    if re.search(r"billing|invoice|contract", text):
        assigned_team = "Revenue Operations"
    elif re.search(r"security|sso|permission|login", text):
        assigned_team = "Platform Support"
    elif priority == "critical":
        assigned_team = "Customer Engineering"
    else:
        assigned_team = "Customer Operations"

    sla_target = (
        "2 hours" if priority == "critical"
        else "4 hours" if priority == "high"
        else "1 business day"
    )
    confidence = min(96, 64 + score * 3)

    customer = input_data.get("customer", "Customer")
    response_draft = (
        f"Hi {customer} team, we have escalated this internally and assigned {assigned_team}. "
        f"We will follow up within {sla_target} with the next concrete update."
    )

    return Recommendation(
        summary=f"{customer} should be handled as {priority} priority by {assigned_team}.",
        reasoning=[
            f"{tier} account with ${arr_impact:,.0f} ARR impact.",
            f"Sentiment is {sentiment}; urgency score is {score}.",
            f"SLA target set to {sla_target} based on priority and impact.",
        ],
        confidence=confidence,
        suggested_action="Page owner and approve response draft" if priority == "critical" else "Assign owner and send response",
        next_action="Approve or edit customer response",
        priority=priority,
        assigned_team=assigned_team,
        sla_target=sla_target,
        response_draft=response_draft,
    )


def evaluate_invoice_exception(input_data: dict[str, Any]) -> Recommendation:
    invoice_amount: float = float(input_data.get("invoiceAmount", 0))
    po_amount: float = float(input_data.get("poAmount", 0))
    variance_reason: str = str(input_data.get("varianceReason", "")).lower()

    if po_amount == 0:
        variance_pct = 0.0
    else:
        variance_pct = abs(invoice_amount - po_amount) / po_amount * 100

    policy_keywords = ["scope change", "change order", "amendment", "approved"]
    has_policy_exception = any(kw in variance_reason for kw in policy_keywords)

    if variance_pct >= 20:
        exception_type = "major_variance"
        suggested_action = "Escalate before payment"
        next_action = "Review exception and add note"
        confidence = max(61.0, round(94 - variance_pct / 100 * 85))
    elif variance_pct >= 5:
        exception_type = "minor_variance"
        suggested_action = "Hold for reviewer note"
        next_action = "Review exception and add note"
        confidence = max(61.0, round(94 - variance_pct / 100 * 85))
    elif re.search(r"late|rush|scope|change order", variance_reason):
        exception_type = "policy_exception"
        suggested_action = "Hold for reviewer note"
        next_action = "Review exception and add note"
        confidence = max(61.0, round(94 - variance_pct / 100 * 85))
    else:
        exception_type = "low_risk_match"
        suggested_action = "Approve for payment"
        next_action = "Approve and log decision"
        confidence = max(61.0, round(94 - variance_pct / 100 * 85))

    dollar_variance = invoice_amount - po_amount

    return Recommendation(
        summary=f"{input_data.get('vendor', 'Vendor')} invoice variance is ${dollar_variance:,.0f} ({round(variance_pct)}%).",
        reasoning=[
            f"Invoice amount is ${invoice_amount:,.0f} vs PO amount ${po_amount:,.0f}.",
            f"Variance reason: {input_data.get('varianceReason', 'N/A')}.",
            f"Payment due date is {input_data.get('dueDate', 'N/A')}; exception type is {exception_type}.",
        ],
        confidence=confidence,
        suggested_action=suggested_action,
        next_action=next_action,
        exception_type=exception_type,
        financial_variance=dollar_variance,
    )


def evaluate_workflow(workflow_type: str, input_data: dict[str, Any]) -> Recommendation:
    if workflow_type == "vendor_onboarding":
        return evaluate_vendor_onboarding(input_data)
    if workflow_type == "customer_escalation":
        return evaluate_customer_escalation(input_data)
    if workflow_type == "invoice_exception":
        return evaluate_invoice_exception(input_data)
    raise ValueError(f"Unknown workflow type: {workflow_type}")
