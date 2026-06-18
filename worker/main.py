"""
Python/FastAPI worker — consumes workflow:pending Redis Stream,
evaluates workflows, updates PostgreSQL, handles retry + dead-letter.
"""
import logging
import threading
import time
from contextlib import asynccontextmanager
from typing import Any

import redis as redis_lib
import uvicorn
from fastapi import FastAPI

from db import get_run_input, mark_run_failed, update_run_with_recommendation
from engine import evaluate_workflow
from settings import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("worker")

_redis: redis_lib.Redis | None = None
_processed_count = 0
_running = True


def get_redis() -> redis_lib.Redis:
    global _redis
    if _redis is None:
        _redis = redis_lib.from_url(settings.redis_url, decode_responses=True)
    return _redis


def ensure_consumer_group() -> None:
    r = get_redis()
    try:
        r.xgroup_create(settings.stream_pending, settings.consumer_group, id="0", mkstream=True)
        logger.info("Consumer group '%s' created.", settings.consumer_group)
    except redis_lib.exceptions.ResponseError as exc:
        if "BUSYGROUP" in str(exc):
            logger.info("Consumer group '%s' already exists.", settings.consumer_group)
        else:
            raise


def parse_message(fields: dict[str, str]) -> dict[str, Any]:
    return {k: v for k, v in fields.items()}


def handle_failure(msg_id: str, data: dict[str, Any], error: Exception) -> None:
    r = get_redis()
    run_id = data.get("runId", "unknown")
    retry_count = int(data.get("retryCount", 0)) + 1

    logger.warning("Run %s failed (attempt %d/%d): %s", run_id, retry_count, settings.max_retries, error)

    if retry_count >= settings.max_retries:
        logger.error("Run %s exceeded max retries — moving to DLQ.", run_id)
        r.xadd(settings.stream_dlq, {**data, "error": str(error), "retryCount": str(retry_count)})
        r.xack(settings.stream_pending, settings.consumer_group, msg_id)
        try:
            mark_run_failed(run_id, f"Failed after {retry_count} attempts: {error}")
        except Exception as db_err:
            logger.error("Could not mark run %s as failed in DB: %s", run_id, db_err)
    else:
        backoff = 2 ** retry_count
        logger.info("Retrying run %s in %ds.", run_id, backoff)
        time.sleep(backoff)
        r.xadd(settings.stream_pending, {**data, "retryCount": str(retry_count)})
        r.xack(settings.stream_pending, settings.consumer_group, msg_id)


def process_message(msg_id: str, data: dict[str, Any]) -> None:
    global _processed_count

    kind = data.get("kind")
    run_id = data.get("runId")

    if kind != "workflow_created" or not run_id:
        logger.debug("Skipping non-evaluation message: kind=%s", kind)
        get_redis().xack(settings.stream_pending, settings.consumer_group, msg_id)
        return

    row = get_run_input(run_id)
    if not row:
        logger.warning("WorkflowRun %s not found in DB — skipping.", run_id)
        get_redis().xack(settings.stream_pending, settings.consumer_group, msg_id)
        return

    workflow_type, input_data = row
    logger.info("Evaluating run %s (type=%s).", run_id, workflow_type)

    recommendation = evaluate_workflow(workflow_type, input_data)
    update_run_with_recommendation(run_id, recommendation.to_dict(), recommendation.confidence)
    get_redis().xack(settings.stream_pending, settings.consumer_group, msg_id)
    _processed_count += 1
    logger.info("Run %s evaluated — confidence=%.0f%%.", run_id, recommendation.confidence)


def consumer_loop() -> None:
    global _running
    ensure_consumer_group()
    logger.info(
        "Worker '%s' listening on stream '%s' (group='%s').",
        settings.worker_consumer_name,
        settings.stream_pending,
        settings.consumer_group,
    )

    while _running:
        try:
            r = get_redis()
            results = r.xreadgroup(
                groupname=settings.consumer_group,
                consumername=settings.worker_consumer_name,
                streams={settings.stream_pending: ">"},
                count=10,
                block=settings.poll_block_ms,
            )
            if not results:
                continue
            for _stream, messages in results:
                for msg_id, fields in messages:
                    try:
                        process_message(msg_id, parse_message(fields))
                    except Exception as exc:
                        handle_failure(msg_id, parse_message(fields), exc)
        except redis_lib.exceptions.ConnectionError as exc:
            logger.error("Redis connection lost: %s — retrying in 5s.", exc)
            time.sleep(5)
        except Exception as exc:
            logger.error("Unexpected error in consumer loop: %s", exc, exc_info=True)
            time.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    thread = threading.Thread(target=consumer_loop, daemon=True, name="consumer")
    thread.start()
    logger.info("Consumer thread started.")
    yield
    global _running
    _running = False
    thread.join(timeout=5)
    logger.info("Consumer thread stopped.")


app = FastAPI(title="Ops Workflow Worker", lifespan=lifespan)


@app.get("/health")
def health() -> dict:
    r = get_redis()
    try:
        r.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    return {
        "status": "ok" if redis_ok else "degraded",
        "consumer": settings.worker_consumer_name,
        "processed": _processed_count,
        "redis": "ok" if redis_ok else "unreachable",
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
