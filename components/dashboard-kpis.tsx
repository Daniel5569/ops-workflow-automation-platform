import type { WorkflowRun } from "@/lib/workflow-types";

function averageConfidence(runs: WorkflowRun[]) {
  return Math.round(runs.reduce((sum, run) => sum + run.recommendation.confidence, 0) / runs.length);
}

export function DashboardKpis({ runs }: { runs: WorkflowRun[] }) {
  const active = runs.filter((run) => run.status === "running" || run.status === "needs_review").length;
  const pending = runs.filter((run) => run.status === "needs_review").length;
  const exceptions = runs.filter((run) => run.status === "blocked" || run.status === "escalated").length;
  const automated = Math.round((runs.filter((run) => run.recommendation.confidence >= 82).length / runs.length) * 100);

  return (
    <section className="kpi-grid" aria-label="Operations metrics">
      <div className="kpi">
        <span>Active runs</span>
        <strong>{active}</strong>
        <small>{runs.length} total workflow runs</small>
      </div>
      <div className="kpi">
        <span>Pending human review</span>
        <strong>{pending}</strong>
        <small>Operator decisions needed</small>
      </div>
      <div className="kpi">
        <span>Automation coverage</span>
        <strong>{automated}%</strong>
        <small>{averageConfidence(runs)}% avg confidence</small>
      </div>
      <div className="kpi">
        <span>Average cycle time</span>
        <strong>14m</strong>
        <small>Across active templates</small>
      </div>
      <div className="kpi">
        <span>Exceptions flagged</span>
        <strong>{exceptions}</strong>
        <small>Escalated or blocked</small>
      </div>
    </section>
  );
}
