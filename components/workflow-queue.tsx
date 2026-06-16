import { formatWorkflowType } from "@/lib/formatters";
import type { RunStatus, WorkflowRun } from "@/lib/workflow-types";
import { StatusBadge } from "./status-badge";

export type QueueFilter = "all" | RunStatus;

const filters: { label: string; value: QueueFilter }[] = [
  { label: "All", value: "all" },
  { label: "Needs review", value: "needs_review" },
  { label: "Running", value: "running" },
  { label: "Approved", value: "approved" },
  { label: "Escalated", value: "escalated" },
  { label: "Completed", value: "completed" }
];

export function WorkflowQueue({
  runs,
  selectedRunId,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onSelectRun
}: {
  runs: WorkflowRun[];
  selectedRunId: string;
  filter: QueueFilter;
  search: string;
  onFilterChange: (filter: QueueFilter) => void;
  onSearchChange: (search: string) => void;
  onSelectRun: (runId: string) => void;
}) {
  return (
    <section className="panel queue-panel">
      <div className="panel-header">
        <div>
          <h2>Workflow queue</h2>
          <p>{runs.length} runs match the current view</p>
        </div>
        <input
          aria-label="Search workflow queue"
          className="search-input"
          placeholder="Search run, owner, company..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="segmented" aria-label="Queue filters">
        {filters.map((item) => (
          <button
            className={filter === item.value ? "active" : ""}
            key={item.value}
            type="button"
            onClick={() => onFilterChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {runs.length === 0 ? (
        <div className="empty-state">
          <strong>No workflow runs found</strong>
          <span>Adjust the filter or search query to return operational work.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Run</th>
                <th>Workflow</th>
                <th>Subject</th>
                <th>Priority</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Due</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  className={selectedRunId === run.id ? "selected" : ""}
                  key={run.id}
                  onClick={() => onSelectRun(run.id)}
                >
                  <td>
                    <button className="row-button" type="button">
                      {run.id}
                    </button>
                  </td>
                  <td>{formatWorkflowType(run.type)}</td>
                  <td>{run.subject}</td>
                  <td>
                    <StatusBadge value={run.priority} />
                  </td>
                  <td>{run.owner}</td>
                  <td>
                    <StatusBadge value={run.status} />
                  </td>
                  <td>{run.dueTime}</td>
                  <td>{run.recommendation.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
