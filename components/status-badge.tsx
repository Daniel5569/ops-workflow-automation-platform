import type { Priority, RunStatus, StepStatus } from "@/lib/workflow-types";

const statusClass: Record<RunStatus | StepStatus | Priority, string> = {
  running: "badge badge-blue",
  needs_review: "badge badge-amber",
  approved: "badge badge-green",
  escalated: "badge badge-red",
  completed: "badge badge-slate",
  blocked: "badge badge-red",
  rejected: "badge badge-red",
  queued: "badge badge-slate",
  low: "badge badge-slate",
  medium: "badge badge-blue",
  high: "badge badge-amber",
  critical: "badge badge-red"
};

export function StatusBadge({ value }: { value: RunStatus | StepStatus | Priority }) {
  return <span className={statusClass[value]}>{value.replace("_", " ")}</span>;
}
