# Ops Workflow Automation Platform

**[GitHub](https://github.com/Daniel5569/ops-workflow-automation-platform)**

An AI-assisted operations console that routes vendor approvals, customer escalations, and invoice exceptions through deterministic evaluation, human review gates, and a persistent audit trail.

**Problem solved**: Ops work scattered across email, spreadsheets, and Slack means decisions go untracked, approvals get lost, and there is no repeatable process. This platform gives ops teams a structured queue with AI-generated recommendations, human-in-the-loop controls, and a full audit log — all in one place.

---

## Architecture

```
┌───────────────────────────────────────┐
│  Browser                              │
│  React 19 (Next.js App Router)        │
│  Workflow queue · KPI strip           │
│  Human review · Audit log             │
└──────────────┬────────────────────────┘
               │ HTTP / REST
┌──────────────▼────────────────────────┐
│  Next.js 15 — API Gateway (TS)        │
│  POST /api/workflows   (create)       │
│  GET  /api/workflows   (list)         │
│  GET  /api/workflows/:id              │
│  POST /api/workflows/:id/review       │
│                                       │
│  Zod input validation                 │
│  Prisma ORM → PostgreSQL 16           │
│  ioredis → Redis Stream XADD         │
└──────┬───────────────────┬────────────┘
       │ Prisma            │ XADD workflow:pending
┌──────▼──────────┐ ┌──────▼──────────────────────┐
│  PostgreSQL 16  │ │  Redis 7                     │
│  WorkflowRun    │ │  Stream: workflow:pending    │
│  AuditEvent     │ │  Stream: workflow:dlq        │
│  WorkflowStep   │ │  Consumer group: processors  │
└──────┬──────────┘ └──────┬──────────────────────┘
       │ psycopg2          │ XREADGROUP
┌──────▼───────────────────▼──────────────────────┐
│  Python / FastAPI Worker                        │
│  Consumer group loop (XREADGROUP + XACK)        │
│  Workflow evaluation engine (port of TS logic)  │
│  Retry with exponential backoff (max 3)         │
│  Dead-letter → workflow:dlq after 3 failures    │
│  GET /health  (FastAPI healthcheck endpoint)    │
└─────────────────────────────────────────────────┘
```

---

## Quick start (Docker)

```bash
git clone <this-repo>
cd ops-workflow-automation-platform

cp .env.example .env                 # uses postgres/postgres defaults

# Start postgres + redis + worker
docker compose up -d postgres redis worker

# Run migrations and seed demo data
docker compose run --rm migrate

# Start the Next.js gateway
docker compose up -d gateway

# Open the console
open http://localhost:3000
```

> **Without Docker** (local dev with Postgres and Redis already running):
> ```bash
> npm install
> npx prisma migrate dev
> npx prisma db seed
> npm run dev
> # In a separate terminal:
> cd worker && pip install -r requirements.txt && python main.py
> ```

---

## Workflow types

| Type | What it does |
|------|-------------|
| **Vendor onboarding** | Scores risk from spend + documentation status, flags missing MSA/tax form |
| **Customer escalation** | Assigns priority, SLA, and team based on tier + sentiment + ARR impact |
| **Invoice exception** | Classifies variance (major/minor/policy) and recommends approve/hold/escalate |

Each run flows through: `running → needs_review → approved / escalated / rejected / failed`

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| API gateway | Next.js API routes, Zod validation, Prisma 5 |
| Database | PostgreSQL 16 |
| Queue | Redis 7 Streams (consumer groups, dead-letter) |
| Worker | Python 3.12, FastAPI, psycopg2, redis-py |
| Tests | Vitest (TS), pytest (Python) |
| Infrastructure | Docker Compose (4 services with healthchecks) |
| CI | GitHub Actions (lint + test for TS and Python, Docker smoke test) |

---

## Repository structure

```
├── app/
│   ├── page.tsx                  # Main ops console (React client)
│   └── api/workflows/            # REST API routes (Next.js)
├── components/                   # WorkflowQueue, RunDetailPanel, etc.
├── lib/
│   ├── workflow-engine.ts        # Deterministic evaluation logic (TS)
│   ├── workflow-types.ts         # Shared TypeScript types
│   ├── prisma.ts                 # Prisma client singleton
│   ├── redis.ts                  # ioredis singleton
│   └── streams.ts                # Redis Streams publish helper
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── seed.ts                   # Demo data seed
├── worker/
│   ├── main.py                   # Consumer loop + FastAPI health endpoint
│   ├── engine.py                 # Evaluation engine (Python port)
│   ├── db.py                     # PostgreSQL connection pool
│   └── tests/test_engine.py      # pytest suite
├── tests/workflow-engine.test.ts # Vitest suite
├── docker-compose.yml
└── .github/workflows/ci.yml      # CI: lint, test, Docker smoke
```

---

## Portfolio context

This repo is part of a portfolio of AI-focused architecture demos. The other repos in the set use the same gateway → queue → worker pattern: a Next.js TypeScript gateway writes to PostgreSQL and publishes to Redis Streams; a Python/FastAPI consumer group evaluates or enriches the payload and writes results back to PostgreSQL. This repo applies that pattern to an ops automation use case — human-in-the-loop workflow review with structured audit logging.

---

## Running tests

```bash
# TypeScript (Vitest)
npm test

# Python (pytest)
cd worker && pytest tests/ -v

# TypeScript with coverage
npm run test:coverage
```
