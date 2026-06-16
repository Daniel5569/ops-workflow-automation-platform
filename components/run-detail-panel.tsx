import { formatWorkflowType } from "@/lib/formatters";
import type { AuditEvent, HumanReviewAction, WorkflowRun } from "@/lib/workflow-types";
import { AuditLogTable } from "./audit-log-table";
import { HumanReviewPanel } from "./human-review-panel";
import { StatusBadge } from "./status-badge";

export function RunDetailPanel({
  run,
  events,
  onDecision
}: {
  run: WorkflowRun;
  events: AuditEvent[];
  onDecision: (action: HumanReviewAction, note: string, editedAction?: string) => void;
}) {
  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <span className="eyebrow">{formatWorkflowType(run.type)}</span>
          <h2>{run.subject}</h2>
          <p>{run.id} managed by {run.owner}</p>
        </div>
        <StatusBadge value={run.status} />
      </div>
      <div className="detail-meta">
        <span>
          Priority
          <strong><StatusBadge value={run.priority} /></strong>
        </span>
        <span>
          Due
          <strong>{run.dueTime}</strong>
        </span>
        <span>
          Confidence
          <strong>{run.recommendation.confidence}%</strong>
        </span>
      </div>
      <section className="detail-section">
        <h3>Step timeline</h3>
        <ol className="timeline">
          {run.steps.map((step) => (
            <li key={step.id}>
              <div>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
              <StatusBadge value={step.status} />
            </li>
          ))}
        </ol>
      </section>
      <section className="detail-section recommendation">
        <h3>AI recommendation</h3>
        <p>{run.recommendation.summary}</p>
        <ul>
          {run.recommendation.reasoning.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="recommendation-grid">
          <span>
            Suggested action
            <strong>{run.recommendation.suggestedAction}</strong>
          </span>
          <span>
            Next action
            <strong>{run.recommendation.nextAction}</strong>
          </span>
        </div>
        {run.recommendation.responseDraft ? (
          <blockquote>{run.recommendation.responseDraft}</blockquote>
        ) : null}
      </section>
      <HumanReviewPanel suggestedAction={run.recommendation.suggestedAction} onDecision={onDecision} />
      <AuditLogTable events={events} />
    </aside>
  );
}
