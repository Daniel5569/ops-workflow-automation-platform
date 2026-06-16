import json
import logging
from contextlib import contextmanager
from typing import Any, Generator

import psycopg2
import psycopg2.pool

from settings import settings

logger = logging.getLogger(__name__)

_pool: psycopg2.pool.SimpleConnectionPool | None = None


def get_pool() -> psycopg2.pool.SimpleConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.SimpleConnectionPool(1, 5, settings.database_url)
    return _pool


@contextmanager
def get_conn() -> Generator[psycopg2.extensions.connection, None, None]:
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


def update_run_with_recommendation(run_id: str, recommendation: dict[str, Any], confidence: float) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "WorkflowRun"
                SET recommendation = %s,
                    confidence = %s,
                    status = CASE WHEN status = 'running' THEN 'needs_review' ELSE status END,
                    "updatedAt" = NOW()
                WHERE id = %s
                """,
                (json.dumps(recommendation), confidence, run_id),
            )
            cur.execute(
                """
                INSERT INTO "AuditEvent" (id, "workflowRunId", actor, action, "beforeStatus", "afterStatus", note, "createdAt")
                VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    run_id,
                    "AI worker",
                    "generated recommendation",
                    "running",
                    "needs_review",
                    f"Confidence {confidence:.0f}% · suggested: {recommendation.get('suggestedAction', '')}",
                ),
            )


def mark_run_failed(run_id: str, reason: str) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE "WorkflowRun"
                SET status = 'failed', "updatedAt" = NOW()
                WHERE id = %s
                """,
                (run_id,),
            )
            cur.execute(
                """
                INSERT INTO "AuditEvent" (id, "workflowRunId", actor, action, "beforeStatus", "afterStatus", note, "createdAt")
                VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (run_id, "AI worker", "evaluation failed", "running", "failed", reason),
            )


def get_run_input(run_id: str) -> tuple[str, dict[str, Any]] | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                'SELECT type, "inputData" FROM "WorkflowRun" WHERE id = %s',
                (run_id,),
            )
            row = cur.fetchone()
    if not row:
        return None
    workflow_type, input_data = row
    if isinstance(input_data, str):
        input_data = json.loads(input_data)
    return workflow_type, input_data
