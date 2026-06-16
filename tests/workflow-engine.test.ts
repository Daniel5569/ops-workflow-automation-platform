import { describe, expect, it } from "vitest";
import {
  applyHumanReview,
  createWorkflowRun,
  evaluateCustomerEscalation,
  evaluateInvoiceException,
  evaluateVendorOnboarding
} from "../lib/workflow-engine";

describe("workflow engine", () => {
  it("classifies vendor risk and missing items", () => {
    const result = evaluateVendorOnboarding({
      vendorName: "Cloudline Security Labs",
      category: "Security testing",
      monthlySpend: 27500,
      riskNotes: "Handles security data, SOC 2 shared, no MSA, urgent review.",
      requestedOwner: "Priya Shah"
    });

    expect(result.riskLevel).toBe("high");
    expect(result.missingItems).toContain("Tax form");
    expect(result.suggestedAction).toContain("Escalate");
  });

  it("assigns customer priority, SLA, and owner from impact", () => {
    const result = evaluateCustomerEscalation({
      customer: "Brightline Health",
      tier: "enterprise",
      issueSummary: "SSO outage is blocking executive reporting before renewal review.",
      sentiment: "angry",
      arrImpact: 320000
    });

    expect(result.priority).toBe("critical");
    expect(result.slaTarget).toBe("2 hours");
    expect(result.assignedTeam).toBe("Platform Support");
  });

  it("calculates invoice variance and recommendation", () => {
    const result = evaluateInvoiceException({
      vendor: "LedgerWorks Services",
      invoiceAmount: 42800,
      poAmount: 36000,
      varianceReason: "Scope change added rush implementation support.",
      dueDate: "2026-06-21"
    });

    expect(result.financialVariance).toBe(6800);
    expect(result.exceptionType).toBe("minor_variance");
    expect(result.suggestedAction).toBe("Hold for reviewer note");
  });

  it("updates status and audit event for human review transitions", () => {
    const run = createWorkflowRun(
      "invoice_exception",
      {
        vendor: "Summit Events Group",
        invoiceAmount: 18500,
        poAmount: 12000,
        varianceReason: "Late venue fee and manual change order.",
        dueDate: "2026-06-18"
      },
      7777
    );

    const approved = applyHumanReview(run, "approve", "Variance accepted by finance.");
    expect(approved.run.status).toBe("approved");
    expect(approved.event.beforeStatus).toBe(run.status);
    expect(approved.event.afterStatus).toBe("approved");

    const escalated = applyHumanReview(run, "escalate", "Needs controller review.");
    expect(escalated.run.status).toBe("escalated");
    expect(escalated.event.afterStatus).toBe("escalated");

    const rejected = applyHumanReview(run, "reject", "Contract evidence does not support payment.");
    expect(rejected.run.status).toBe("rejected");
    expect(rejected.event.afterStatus).toBe("rejected");
  });
});
