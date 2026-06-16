import type {
  AIRecommendation,
  AuditEvent,
  CustomerInput,
  HumanReviewAction,
  InvoiceInput,
  Priority,
  RiskLevel,
  RunStatus,
  VendorInput,
  WorkflowInput,
  WorkflowRun,
  WorkflowStep,
  WorkflowType
} from "./workflow-types";

const workflowSteps: Record<WorkflowType, string[]> = {
  vendor_onboarding: [
    "Collect vendor request",
    "Check required documents",
    "Classify risk",
    "Generate approval recommendation",
    "Human review"
  ],
  customer_escalation: [
    "Classify urgency",
    "Detect impact",
    "Suggest owner",
    "Draft response",
    "Human approve/edit"
  ],
  invoice_exception: [
    "Compare invoice vs PO",
    "Calculate variance",
    "Flag policy exception",
    "Recommend approve/hold/escalate",
    "Audit decision"
  ]
};

export function buildSteps(type: WorkflowType, status: RunStatus): WorkflowStep[] {
  return workflowSteps[type].map((label, index) => {
    const isReviewStep = index === workflowSteps[type].length - 1;
    const stepStatus =
      status === "blocked"
        ? index >= 3
          ? "blocked"
          : "completed"
        : status === "running"
          ? index < 2
            ? "completed"
            : index === 2
              ? "running"
              : "queued"
          : status === "needs_review"
            ? isReviewStep
              ? "needs_review"
              : "completed"
            : "completed";

    return {
      id: `${type}-step-${index + 1}`,
      label,
      status: stepStatus,
      detail:
        stepStatus === "needs_review"
          ? "Waiting for an operator decision."
          : stepStatus === "blocked"
            ? "Blocked until requested information is added."
            : stepStatus === "running"
              ? "Automation is processing this step."
              : "Step evidence captured in audit history."
    };
  });
}

export function evaluateVendorOnboarding(input: VendorInput): AIRecommendation {
  const notes = input.riskNotes.toLowerCase();
  const missingItems: string[] = [];
  let riskScore = 0;

  if (input.monthlySpend >= 25000) riskScore += 3;
  else if (input.monthlySpend >= 10000) riskScore += 2;
  else if (input.monthlySpend >= 4000) riskScore += 1;

  if (/security|soc 2|gdpr|pii|data|contract/.test(notes)) riskScore += 2;
  if (/urgent|new vendor|no msa|missing|manual/.test(notes)) riskScore += 1;
  if (!/msa|contract/.test(notes)) missingItems.push("MSA or signed contract");
  if (!/tax|w-9|w9/.test(notes)) missingItems.push("Tax form");
  if (/data|pii|security|soc 2/.test(notes) && !/soc 2|security review/.test(notes)) {
    missingItems.push("Security review");
  }

  const riskLevel: RiskLevel = riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";
  const confidence = Math.max(58, Math.min(94, 92 - missingItems.length * 7 - riskScore * 2));
  const suggestedAction =
    riskLevel === "high"
      ? "Escalate to finance and security before approval"
      : missingItems.length > 0
        ? "Request missing documents before approval"
        : "Approve vendor onboarding";

  return {
    summary: `${input.vendorName} is a ${riskLevel}-risk ${input.category} vendor with ${missingItems.length} open document item${missingItems.length === 1 ? "" : "s"}.`,
    reasoning: [
      `Monthly spend is $${input.monthlySpend.toLocaleString()} and maps to ${riskLevel} review depth.`,
      missingItems.length > 0
        ? `Missing evidence: ${missingItems.join(", ")}.`
        : "Required commercial and tax documentation is present.",
      `Requested owner ${input.requestedOwner} remains accountable for follow-up.`
    ],
    confidence,
    suggestedAction,
    nextAction:
      riskLevel === "high" ? "Escalate for finance and security review" : "Send reviewer decision",
    riskLevel,
    missingItems
  };
}

export function evaluateCustomerEscalation(input: CustomerInput): AIRecommendation {
  const text = input.issueSummary.toLowerCase();
  let score = 0;

  if (input.sentiment === "angry") score += 4;
  if (input.sentiment === "frustrated") score += 3;
  if (input.tier === "enterprise" || input.tier === "strategic") score += 3;
  if (input.arrImpact >= 250000) score += 3;
  else if (input.arrImpact >= 75000) score += 2;
  if (/outage|blocked|renewal|executive|churn|security/.test(text)) score += 2;

  const priority: Priority = score >= 9 ? "critical" : score >= 6 ? "high" : score >= 3 ? "medium" : "low";
  const assignedTeam =
    /billing|invoice|contract/.test(text)
      ? "Revenue Operations"
      : /security|sso|permission|login/.test(text)
        ? "Platform Support"
        : priority === "critical"
          ? "Customer Engineering"
          : "Customer Operations";
  const slaTarget = priority === "critical" ? "2 hours" : priority === "high" ? "4 hours" : "1 business day";
  const confidence = Math.min(96, 64 + score * 3);

  return {
    summary: `${input.customer} should be handled as ${priority} priority by ${assignedTeam}.`,
    reasoning: [
      `${input.tier} account with $${input.arrImpact.toLocaleString()} ARR impact.`,
      `Sentiment is ${input.sentiment}; urgency score is ${score}.`,
      `SLA target set to ${slaTarget} based on priority and impact.`
    ],
    confidence,
    suggestedAction: priority === "critical" ? "Page owner and approve response draft" : "Assign owner and send response",
    nextAction: "Approve or edit customer response",
    priority,
    assignedTeam,
    responseDraft: `Hi ${input.customer} team, we have escalated this internally and assigned ${assignedTeam}. We will follow up within ${slaTarget} with the next concrete update.`,
    slaTarget
  };
}

export function evaluateInvoiceException(input: InvoiceInput): AIRecommendation {
  const variance = input.invoiceAmount - input.poAmount;
  const varianceRate = input.poAmount === 0 ? 1 : Math.abs(variance) / input.poAmount;
  const reason = input.varianceReason.toLowerCase();
  const exceptionType =
    varianceRate >= 0.2
      ? "major_variance"
      : varianceRate >= 0.05
        ? "minor_variance"
        : /late|rush|scope|change order/.test(reason)
          ? "policy_exception"
          : "low_risk_match";
  const recommendation =
    exceptionType === "major_variance"
      ? "Escalate before payment"
      : exceptionType === "minor_variance" || exceptionType === "policy_exception"
        ? "Hold for reviewer note"
        : "Approve for payment";
  const confidence = Math.max(61, Math.round(94 - varianceRate * 85));

  return {
    summary: `${input.vendor} invoice variance is $${variance.toLocaleString()} (${Math.round(varianceRate * 100)}%).`,
    reasoning: [
      `Invoice amount is $${input.invoiceAmount.toLocaleString()} vs PO amount $${input.poAmount.toLocaleString()}.`,
      `Variance reason: ${input.varianceReason}.`,
      `Payment due date is ${input.dueDate}; exception type is ${exceptionType}.`
    ],
    confidence,
    suggestedAction: recommendation,
    nextAction: recommendation === "Approve for payment" ? "Approve and log decision" : "Review exception and add note",
    exceptionType,
    financialVariance: variance
  };
}

export function evaluateWorkflow(type: WorkflowType, input: WorkflowInput): AIRecommendation {
  if (type === "vendor_onboarding") return evaluateVendorOnboarding(input as VendorInput);
  if (type === "customer_escalation") return evaluateCustomerEscalation(input as CustomerInput);
  return evaluateInvoiceException(input as InvoiceInput);
}

export function derivePriority(type: WorkflowType, recommendation: AIRecommendation): Priority {
  if (recommendation.priority) return recommendation.priority;
  if (recommendation.riskLevel === "high") return "high";
  if (recommendation.riskLevel === "medium") return "medium";
  if (type === "invoice_exception" && Math.abs(recommendation.financialVariance ?? 0) > 10000) {
    return "high";
  }
  return "low";
}

export function createWorkflowRun(
  type: WorkflowType,
  input: WorkflowInput,
  idNumber = Math.floor(Math.random() * 9000) + 1000
): WorkflowRun {
  const recommendation = evaluateWorkflow(type, input);
  const priority = derivePriority(type, recommendation);
  const subject =
    type === "vendor_onboarding"
      ? (input as VendorInput).vendorName
      : type === "customer_escalation"
        ? (input as CustomerInput).customer
        : (input as InvoiceInput).vendor;
  const now = new Date().toISOString();

  return {
    id: `RUN-${idNumber}`,
    type,
    title:
      type === "vendor_onboarding"
        ? "Vendor onboarding review"
        : type === "customer_escalation"
          ? "Customer escalation triage"
          : "Invoice exception handling",
    subject,
    priority,
    owner:
      type === "vendor_onboarding"
        ? (input as VendorInput).requestedOwner
        : recommendation.assignedTeam ?? "Finance Operations",
    status: recommendation.confidence < 82 || priority === "high" || priority === "critical" ? "needs_review" : "running",
    dueTime: type === "customer_escalation" ? recommendation.slaTarget ?? "4 hours" : "Today",
    createdAt: now,
    updatedAt: now,
    input,
    steps: buildSteps(type, recommendation.confidence < 82 || priority === "high" || priority === "critical" ? "needs_review" : "running"),
    recommendation
  };
}

export function applyHumanReview(
  run: WorkflowRun,
  action: HumanReviewAction,
  note: string,
  actor = "Ops reviewer",
  editedSuggestedAction?: string
): { run: WorkflowRun; event: AuditEvent } {
  const beforeStatus = run.status;
  const afterStatus: RunStatus =
    action === "approve" || action === "edit"
      ? "approved"
      : action === "request_changes"
        ? "blocked"
        : action === "escalate"
          ? "escalated"
          : "rejected";
  const actionLabel: Record<HumanReviewAction, string> = {
    approve: "approved recommendation",
    edit: "edited and approved recommendation",
    request_changes: "requested changes",
    escalate: "escalated review",
    reject: "rejected recommendation"
  };
  const updatedRecommendation: AIRecommendation =
    action === "edit" && editedSuggestedAction
      ? {
          ...run.recommendation,
          suggestedAction: editedSuggestedAction,
          reviewerNote: note
        }
      : {
          ...run.recommendation,
          reviewerNote: note
        };
  const timestamp = new Date().toISOString();
  const updatedRun: WorkflowRun = {
    ...run,
    status: afterStatus,
    updatedAt: timestamp,
    steps: buildSteps(run.type, afterStatus),
    recommendation: updatedRecommendation
  };

  return {
    run: updatedRun,
    event: {
      id: `AUD-${run.id}-${Date.now()}`,
      timestamp,
      actor,
      action: actionLabel[action],
      objectId: run.id,
      beforeStatus,
      afterStatus,
      note: note || "No reviewer note provided."
    }
  };
}
