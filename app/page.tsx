"use client";

import { DashboardKpis } from "@/components/dashboard-kpis";
import { RunDetailPanel } from "@/components/run-detail-panel";
import { WorkflowQueue, type QueueFilter } from "@/components/workflow-queue";
import { WorkflowTemplateGallery } from "@/components/workflow-template-gallery";
import { workflowTemplates } from "@/lib/demo-data";
import type {
  AIRecommendation,
  AuditEvent,
  HumanReviewAction,
  WorkflowInput,
  WorkflowRun,
  WorkflowType,
} from "@/lib/workflow-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ApiAuditEvent = {
  id: string;
  workflowRunId: string;
  actor: string;
  action: string;
  beforeStatus: string;
  afterStatus: string;
  note: string;
  createdAt: string;
};

type ApiRun = Omit<WorkflowRun, "input" | "recommendation" | "steps" | "createdAt" | "updatedAt"> & {
  inputData: WorkflowInput;
  recommendation: AIRecommendation | null;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowRun["steps"];
  auditEvents: ApiAuditEvent[];
};

function mapApiRun(apiRun: ApiRun): WorkflowRun {
  return {
    ...apiRun,
    input: apiRun.inputData,
    recommendation: apiRun.recommendation ?? {
      summary: "Evaluating…",
      reasoning: ["Worker is processing this workflow."],
      confidence: 0,
      suggestedAction: "Pending",
      nextAction: "Await worker evaluation",
    },
  };
}

function mapApiAuditEvent(e: ApiAuditEvent): AuditEvent {
  return {
    id: e.id,
    timestamp: e.createdAt,
    actor: e.actor,
    action: e.action,
    objectId: e.workflowRunId,
    beforeStatus: e.beforeStatus as AuditEvent["beforeStatus"],
    afterStatus: e.afterStatus as AuditEvent["afterStatus"],
    note: e.note,
  };
}

const POLL_INTERVAL = 3000;

export default function Home() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRuns = useCallback(async (silent = false) => {
    try {
      const res = await fetch("/api/workflows?limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { runs: ApiRun[] };
      const mapped = data.runs.map(mapApiRun);
      const events = data.runs.flatMap((r) => r.auditEvents.map(mapApiAuditEvent));
      setRuns(mapped);
      setAuditEvents(events);
      if (!silent) {
        setSelectedRunId((prev) => prev ?? mapped[0]?.id ?? null);
      }
      setError(null);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns(false);
    pollingRef.current = setInterval(() => loadRuns(true), POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loadRuns]);

  const visibleRuns = useMemo(() => {
    const query = search.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesFilter = filter === "all" || run.status === filter;
      const searchable = `${run.id} ${run.title} ${run.subject} ${run.owner} ${run.status}`.toLowerCase();
      return matchesFilter && (query === "" || searchable.includes(query));
    });
  }, [filter, runs, search]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? visibleRuns[0] ?? runs[0];
  const selectedEvents = auditEvents
    .filter((e) => e.objectId === selectedRun?.id)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  async function startRun(type: WorkflowType, input: WorkflowInput) {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, input }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json() as ApiRun;
      const run = mapApiRun(created);
      const events = created.auditEvents.map(mapApiAuditEvent);
      setRuns((prev) => [run, ...prev]);
      setAuditEvents((prev) => [...events, ...prev]);
      setSelectedRunId(run.id);
      setFilter("all");
      setSearch("");
    } catch (err) {
      console.error("[startRun]", err);
    }
  }

  async function decide(action: HumanReviewAction, note: string, editedAction?: string) {
    if (!selectedRun) return;
    try {
      const res = await fetch(`/api/workflows/${selectedRun.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note, actor: "Ops reviewer", editedSuggestedAction: editedAction }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = await res.json() as ApiRun;
      const run = mapApiRun(updated);
      const events = updated.auditEvents.map(mapApiAuditEvent);
      setRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
      setAuditEvents((prev) => {
        const others = prev.filter((e) => e.objectId !== run.id);
        return [...events, ...others];
      });
    } catch (err) {
      console.error("[decide]", err);
    }
  }

  if (loading) {
    return (
      <main className="app-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--text-2)" }}>
          Loading workflows…
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-shell">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 12 }}>
          <strong>Could not connect to backend</strong>
          <span style={{ color: "var(--text-2)" }}>{error}</span>
          <button type="button" onClick={() => { setLoading(true); loadRuns(false); }}>Retry</button>
        </div>
      </main>
    );
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
            <p>Next.js gateway · PostgreSQL · Redis Streams · Python worker</p>
          </div>
          <div className="topbar-actions">
            <span className="live-dot" />
            <span>Live · polling {POLL_INTERVAL / 1000}s</span>
          </div>
        </header>
        <DashboardKpis runs={runs} />
        <div className="content-grid" id="dashboard">
          <div className="main-column">
            <WorkflowQueue
              runs={visibleRuns}
              selectedRunId={selectedRun?.id ?? ""}
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
          {selectedRun && (
            <RunDetailPanel run={selectedRun} events={selectedEvents} onDecision={decide} />
          )}
        </div>
      </div>
    </main>
  );
}
