import type { WorkflowType } from "./workflow-types";

export function formatWorkflowType(type: WorkflowType) {
  if (type === "vendor_onboarding") return "Vendor onboarding";
  if (type === "customer_escalation") return "Customer escalation";
  return "Invoice exception";
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
