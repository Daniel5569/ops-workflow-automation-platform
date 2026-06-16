"""
Engine tests — mirror of tests/workflow-engine.test.ts.
Same inputs and expected classifications as the TypeScript suite.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine import (
    evaluate_vendor_onboarding,
    evaluate_customer_escalation,
    evaluate_invoice_exception,
)

# --- same inputs as the TS test suite ---

VENDOR_HIGH_RISK = {
    "vendorName": "Cloudline Security Labs",
    "category": "Security testing",
    "monthlySpend": 27500,
    "riskNotes": "Handles security data, SOC 2 shared, no MSA, urgent review.",
    "requestedOwner": "Priya Shah",
}

CUSTOMER_CRITICAL = {
    "customer": "Brightline Health",
    "tier": "enterprise",
    "issueSummary": "SSO outage is blocking executive reporting before renewal review.",
    "sentiment": "angry",
    "arrImpact": 320000,
}

INVOICE_MINOR_VARIANCE = {
    "vendor": "LedgerWorks Services",
    "invoiceAmount": 42800,
    "poAmount": 36000,
    "varianceReason": "Scope change added rush implementation support.",
    "dueDate": "2026-06-21",
}


def test_vendor_classifies_high_risk_and_detects_missing_tax_form():
    result = evaluate_vendor_onboarding(VENDOR_HIGH_RISK)
    assert result.risk_level == "high"
    assert result.missing_items is not None
    assert "Tax form" in result.missing_items
    assert "Escalate" in result.suggested_action


def test_customer_assigns_critical_priority_and_platform_support():
    result = evaluate_customer_escalation(CUSTOMER_CRITICAL)
    assert result.priority == "critical"
    assert result.sla_target == "2 hours"
    assert result.assigned_team == "Platform Support"


def test_invoice_minor_variance_and_hold_recommendation():
    result = evaluate_invoice_exception(INVOICE_MINOR_VARIANCE)
    assert result.exception_type == "minor_variance"
    assert result.financial_variance == 6800
    assert result.suggested_action == "Hold for reviewer note"


def test_vendor_confidence_is_within_valid_range():
    result = evaluate_vendor_onboarding(VENDOR_HIGH_RISK)
    assert 0 <= result.confidence <= 100


def test_customer_generates_response_draft():
    result = evaluate_customer_escalation(CUSTOMER_CRITICAL)
    assert result.response_draft is not None
    assert len(result.response_draft) > 20
