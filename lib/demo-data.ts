import { buildSteps, createWorkflowRun } from "./workflow-engine";
import type { AuditEvent, WorkflowRun, WorkflowTemplate } from "./workflow-types";

const vendorOwners = ["Maya Chen", "Jordan Lee", "Priya Shah", "Casey Morgan"];

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "vendor_onboarding",
    name: "Vendor Onboarding Review",
    useCase: "Evaluate a new vendor before approval.",
    expectedDuration: "18 min",
    riskLevel: "medium",
    steps: [
      "Collect vendor request",
      "Check required documents",
      "Classify risk",
      "Generate approval recommendation",
      "Human review"
    ],
    sampleInput: {
      vendorName: "Northstar Analytics",
      category: "Data enrichment",
      monthlySpend: 14500,
      riskNotes: "New vendor, security review pending, MSA received, tax form missing.",
      requestedOwner: vendorOwners[0]
    }
  },
  {
    id: "customer_escalation",
    name: "Customer Escalation Triage",
    useCase: "Prioritize and assign an important customer escalation.",
    expectedDuration: "8 min",
    riskLevel: "high",
    steps: [
      "Classify urgency",
      "Detect impact",
      "Suggest owner",
      "Draft response",
      "Human approve/edit"
    ],
    sampleInput: {
      customer: "Brightline Health",
      tier: "enterprise",
      issueSummary: "SSO outage is blocking executive reporting before renewal review.",
      sentiment: "angry",
      arrImpact: 320000
    }
  },
  {
    id: "invoice_exception",
    name: "Invoice Exception Handling",
    useCase: "Review invoice variance before payment.",
    expectedDuration: "12 min",
    riskLevel: "medium",
    steps: [
      "Compare invoice vs PO",
      "Calculate variance",
      "Flag policy exception",
      "Recommend approve/hold/escalate",
      "Audit decision"
    ],
    sampleInput: {
      vendor: "LedgerWorks Services",
      invoiceAmount: 42800,
      poAmount: 36000,
      varianceReason: "Scope change added rush implementation support.",
      dueDate: "2026-06-21"
    }
  }
];

const seedInputs = [
  {
    type: "vendor_onboarding" as const,
    input: {
      vendorName: "Northstar Analytics",
      category: "Data enrichment",
      monthlySpend: 14500,
      riskNotes: "New vendor, security review pending, MSA received, tax form missing.",
      requestedOwner: "Maya Chen"
    }
  },
  {
    type: "vendor_onboarding" as const,
    input: {
      vendorName: "Fieldstack Logistics",
      category: "Facilities",
      monthlySpend: 3200,
      riskNotes: "Contract and tax form received. Low data access.",
      requestedOwner: "Jordan Lee"
    }
  },
  {
    type: "vendor_onboarding" as const,
    input: {
      vendorName: "Cloudline Security Labs",
      category: "Security testing",
      monthlySpend: 27500,
      riskNotes: "Handles security data, no MSA, SOC 2 shared, urgent review.",
      requestedOwner: "Priya Shah"
    }
  },
  {
    type: "vendor_onboarding" as const,
    input: {
      vendorName: "Harbor Talent Ops",
      category: "Recruiting operations",
      monthlySpend: 8200,
      riskNotes: "Contract received, tax form received, manual onboarding notes complete.",
      requestedOwner: "Casey Morgan"
    }
  },
  {
    type: "vendor_onboarding" as const,
    input: {
      vendorName: "SignalForge Research",
      category: "Market research",
      monthlySpend: 12100,
      riskNotes: "Missing tax form, MSA draft in review, no customer data access.",
      requestedOwner: "Maya Chen"
    }
  },
  {
    type: "customer_escalation" as const,
    input: {
      customer: "Brightline Health",
      tier: "enterprise" as const,
      issueSummary: "SSO outage is blocking executive reporting before renewal review.",
      sentiment: "angry" as const,
      arrImpact: 320000
    }
  },
  {
    type: "customer_escalation" as const,
    input: {
      customer: "Cobalt Retail",
      tier: "growth" as const,
      issueSummary: "Billing export is missing three recent invoices.",
      sentiment: "frustrated" as const,
      arrImpact: 68000
    }
  },
  {
    type: "customer_escalation" as const,
    input: {
      customer: "Aster Finance",
      tier: "strategic" as const,
      issueSummary: "Executive sponsor flagged churn risk after data sync failures.",
      sentiment: "angry" as const,
      arrImpact: 210000
    }
  },
  {
    type: "customer_escalation" as const,
    input: {
      customer: "Mosaic Learning",
      tier: "startup" as const,
      issueSummary: "Admin cannot update permissions for one workspace.",
      sentiment: "neutral" as const,
      arrImpact: 18000
    }
  },
  {
    type: "customer_escalation" as const,
    input: {
      customer: "Pioneer Grid",
      tier: "enterprise" as const,
      issueSummary: "Security team needs a response on audit evidence by tomorrow.",
      sentiment: "frustrated" as const,
      arrImpact: 155000
    }
  },
  {
    type: "invoice_exception" as const,
    input: {
      vendor: "LedgerWorks Services",
      invoiceAmount: 42800,
      poAmount: 36000,
      varianceReason: "Scope change added rush implementation support.",
      dueDate: "2026-06-21"
    }
  },
  {
    type: "invoice_exception" as const,
    input: {
      vendor: "Atlas Cloud Hosting",
      invoiceAmount: 78000,
      poAmount: 80000,
      varianceReason: "Usage came in below committed forecast.",
      dueDate: "2026-06-24"
    }
  },
  {
    type: "invoice_exception" as const,
    input: {
      vendor: "Summit Events Group",
      invoiceAmount: 18500,
      poAmount: 12000,
      varianceReason: "Late venue fee and manual change order.",
      dueDate: "2026-06-18"
    }
  },
  {
    type: "invoice_exception" as const,
    input: {
      vendor: "Bluepeak Systems",
      invoiceAmount: 9600,
      poAmount: 9300,
      varianceReason: "Small tax and shipping adjustment.",
      dueDate: "2026-06-28"
    }
  },
  {
    type: "invoice_exception" as const,
    input: {
      vendor: "Meridian Data Rooms",
      invoiceAmount: 51000,
      poAmount: 42000,
      varianceReason: "Additional seats requested by finance ops.",
      dueDate: "2026-06-20"
    }
  }
];

const forcedStatuses: WorkflowRun["status"][] = [
  "needs_review",
  "completed",
  "escalated",
  "approved",
  "needs_review",
  "needs_review",
  "running",
  "escalated",
  "completed",
  "needs_review",
  "needs_review",
  "approved",
  "blocked",
  "completed",
  "running"
];

const dueTimes = [
  "Today 3:00 PM",
  "Tomorrow 10:00 AM",
  "Today 5:30 PM",
  "Tomorrow 2:00 PM",
  "Friday 11:00 AM",
  "2 hours",
  "4 hours",
  "Today 1:15 PM",
  "Tomorrow 9:30 AM",
  "Today 6:00 PM",
  "Today 4:00 PM",
  "June 24",
  "June 18",
  "June 28",
  "June 20"
];

export const initialRuns: WorkflowRun[] = seedInputs.map((seed, index) => {
  const run = createWorkflowRun(seed.type, seed.input, 1001 + index);
  const status = forcedStatuses[index];
  return {
    ...run,
    status,
    steps: buildSteps(seed.type, status),
    owner:
      seed.type === "customer_escalation"
        ? run.recommendation.assignedTeam ?? run.owner
        : seed.type === "invoice_exception"
          ? "Finance Operations"
          : run.owner,
    dueTime: dueTimes[index],
    createdAt: new Date(Date.UTC(2026, 5, 11, 14 + (index % 7), 15)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 5, 12, 9 + (index % 8), 25)).toISOString()
  };
});

export const initialAuditEvents: AuditEvent[] = initialRuns.flatMap((run, index) => {
  const events: AuditEvent[] = [
    {
      id: `AUD-${run.id}-001`,
      timestamp: new Date(Date.UTC(2026, 5, 11, 8 + (index % 6), 5)).toISOString(),
      actor: "Workflow engine",
      action: "created run",
      objectId: run.id,
      beforeStatus: "created",
      afterStatus: "running",
      note: `${run.title} created from template.`
    },
    {
      id: `AUD-${run.id}-002`,
      timestamp: new Date(Date.UTC(2026, 5, 11, 9 + (index % 6), 20)).toISOString(),
      actor: "AI simulation",
      action: "generated recommendation",
      objectId: run.id,
      beforeStatus: "running",
      afterStatus: run.status === "running" ? "running" : "needs_review",
      note: `Confidence ${run.recommendation.confidence}% with suggested action: ${run.recommendation.suggestedAction}.`
    }
  ];

  if (run.status !== "running" && run.status !== "needs_review") {
    events.push({
      id: `AUD-${run.id}-003`,
      timestamp: new Date(Date.UTC(2026, 5, 12, 10 + (index % 6), 35)).toISOString(),
      actor: index % 2 === 0 ? "Maya Chen" : "Jordan Lee",
      action:
        run.status === "approved"
          ? "approved recommendation"
          : run.status === "escalated"
            ? "escalated review"
            : run.status === "blocked"
              ? "requested changes"
              : "completed run",
      objectId: run.id,
      beforeStatus: "needs_review",
      afterStatus: run.status,
      note:
        run.status === "blocked"
          ? "Need source document before final decision."
          : "Reviewer decision captured with supporting context."
    });
  }

  return events;
});
