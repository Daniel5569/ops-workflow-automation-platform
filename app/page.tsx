"use client";

import { DashboardKpis } from "@/components/dashboard-kpis";
import { RunDetailPanel } from "@/components/run-detail-panel";
import { WorkflowQueue, type QueueFilter } from "@/components/workflow-queue";
import { WorkflowTemplateGallery } from "@/components/workflow-template-gallery";
import { initialAuditEvents, initialRuns, workflowTemplates } from "@/lib/demo-data";
import { applyHumanReview, createWorkflowRun } from "@/lib/workflow-engine";
import type { AuditEvent, HumanReviewAction, WorkflowInput, WorkflowRun, WorkflowType } from "@/lib/workflow-types";
import { useMemo, useState } from "react";

export default function Home() {
  const [runs, setRuns] = useState<WorkflowRun[]>(initialRuns);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialAuditEvents);
  const [selectedRunId, setSelectedRunId] = useState(initialRuns[0].id);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");

  const visibleRuns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesFilter = filter === "all" || run.status === filter;
      const searchable = `${run.id} ${run.title} ${run.subject} ${run.owner} ${run.status}`.toLowerCase();
      return matchesFilter && (query === "" || searchable.includes(query));
    });
  }, [filter, runs, search]);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? visibleRuns[0] ?? runs[0];
  const selectedEvents = auditEvents
    .filter((event) => event.objectId === selectedRun.id)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  function startRun(type: WorkflowType, input: WorkflowInput) {
    const run = createWorkflowRun(type, input, 2000 + runs.length + 1);
    const event: AuditEvent = {
      id: `AUD-${run.id}-created`,
      timestamp: new Date().toISOString(),
      actor: "Workflow engine",
      action: "created run",
      objectId: run.id,
      beforeStatus: "created",
      afterStatus: run.status,
      note: `${run.title} started from template gallery.`
    };
    setRuns((current) => [run, ...current]);
    setAuditEvents((current) => [event, ...current]);
    setSelectedRunId(run.id);
    setFilter("all");
    setSearch("");
  }

  function decide(action: HumanReviewAction, note: string, editedAction?: string) {
    const result = applyHumanReview(selectedRun, action, note, "Ops reviewer", editedAction);
    setRuns((current) => current.map((run) => (run.id === selectedRun.id ? result.run : run)));
    setAuditEvents((current) => [result.event, ...current]);
  }

  return (
    <main className="app-shell">
      <nav className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span>OW</span>
          <strong>OpsFlow</strong>
        </div>
        <a className="active" href="#dashboard">Dashboard</a>
        <a href="#templates">Templates</a>
        <a href="#audit">Audit trail</a>
        <a href="#metrics">Metrics</a>
      </nav>
      <div className="workspace">
        <header className="topbar">
          <div>
            <h1>Ops Workflow Automation Platform</h1>
            <p>Workflow queues, simulated AI recommendations, human decisions, and auditability.</p>
          </div>
          <div className="topbar-actions">
            <span className="live-dot" />
            <span>Synthetic demo data</span>
          </div>
        </header>
        <DashboardKpis runs={runs} />
        <div className="content-grid" id="dashboard">
          <div className="main-column">
            <WorkflowQueue
              runs={visibleRuns}
              selectedRunId={selectedRun.id}
              filter={filter}
              search={search}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelectRun={setSelectedRunId}
            />
            <div id="templates">
              <WorkflowTemplateGallery templates={workflowTemplates} onStartRun={startRun} />
            </div>
          </div>
          <RunDetailPanel run={selectedRun} events={selectedEvents} onDecision={decide} />
        </div>
      </div>
    </main>
  );
}
