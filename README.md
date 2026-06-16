# Ops Workflow Automation Platform

Ops Workflow Automation Platform is a production-shaped demo of an AI-assisted internal operations console: workflow queues, simulated AI recommendations, human approval, exception handling, and audit logs in one operator-friendly surface.

## Problem

Startup operations work often lives across Slack, email, spreadsheets, CRM records, tickets, and internal tools. Automations break down when they do not have clear ownership, exception handling, review points, or audit history.

This demo shows how recurring back-office workflows can become trackable runs where AI prepares the decision and a human operator approves, edits, escalates, or rejects it.

## What The Demo Demonstrates

- Operational dashboard with KPIs, workflow queue, filters, and search.
- Three workflow templates that can start new synthetic runs from the UI.
- Deterministic local AI simulation with confidence, reasoning, and recommendations.
- Human-in-the-loop review actions that update status and create audit events.
- Run detail view with step timeline, recommendation panel, reviewer note, and audit log.
- Synthetic data only: no real customers, vendors, emails, keys, tokens, or private information.

## Demo Workflows

1. **Vendor Onboarding Review**: checks documents, spend, risk notes, missing items, and approval path.
2. **Customer Escalation Triage**: classifies priority, assigns an owner, drafts a response, and sets SLA.
3. **Invoice Exception Handling**: compares invoice vs PO, calculates variance, flags policy exceptions, and recommends approve/hold/escalate.

## Product Walkthrough In 90 Seconds

Open the app and scan the KPI strip for active runs, pending human review, automation coverage, average cycle time, and exceptions. Use the queue filters to focus on work that needs review. Select a run to inspect its status, priority, owner, due time, step timeline, AI recommendation, confidence score, and reasoning. Add a reviewer note, then approve, edit, request changes, escalate, or reject. The run status changes immediately and a new audit event is written. Start a new run from the template gallery to see the simulation generate a fresh recommendation from the input values.

## Architecture

```text
app/
  page.tsx                 Main interactive console
  layout.tsx               App metadata and root layout
  globals.css              Product UI system
components/
  dashboard-kpis.tsx
  workflow-queue.tsx
  workflow-template-gallery.tsx
  run-detail-panel.tsx
  human-review-panel.tsx
  audit-log-table.tsx
  status-badge.tsx
lib/
  demo-data.ts             Synthetic seeded workflow runs and audit events
  workflow-engine.ts       Deterministic recommendation and transition logic
  workflow-types.ts        Shared TypeScript types
  formatters.ts
tests/
  workflow-engine.test.ts
```

The app uses local React state and mock data. There are no external services, databases, API keys, or required environment variables.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- CSS
- Vitest

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm test
```

`npm run lint` runs TypeScript validation with `tsc --noEmit`. `npm test` covers the core workflow engine and human review transitions.

## Synthetic Data And Privacy

All data in this repository is synthetic and safe for a public portfolio demo. The project intentionally avoids real names, personal contact details, private business information, tokens, API keys, secrets, external credentials, and production logs.

## Designed For

- Startup founders who need operational leverage.
- Operations teams managing recurring back-office workflows.
- Customer operations and support escalation teams.
- Finance operations teams handling exceptions and approvals.
- Fractional operators and product builders demonstrating practical AI automation.

## Why This Matters

AI operations tools are only useful when operators can trust the workflow. This demo emphasizes auditability, owner accountability, exception handling, and human review instead of treating automation as a black box.

## Screenshots

Screenshots can be added after running the app locally or after deploying a public demo.
