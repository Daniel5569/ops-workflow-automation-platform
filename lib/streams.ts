import { redis } from "./redis";
import type { WorkflowType } from "./workflow-types";

export const STREAM_PENDING = "workflow:pending";
export const STREAM_DLQ = "workflow:dlq";
export const CONSUMER_GROUP = "processors";

export type StreamEvent =
  | { kind: "workflow_created"; runId: string; type: WorkflowType; retryCount: number }
  | { kind: "review_submitted"; runId: string; action: string };

export async function publishWorkflowEvent(event: StreamEvent): Promise<string> {
  const fields: string[] = ["kind", event.kind, "runId", event.runId, "ts", Date.now().toString()];

  if (event.kind === "workflow_created") {
    fields.push("type", event.type, "retryCount", String(event.retryCount));
  } else {
    fields.push("action", event.action);
  }

  const id = await redis.xadd(STREAM_PENDING, "*", ...fields);
  return id ?? "";
}

export async function ensureConsumerGroup(): Promise<void> {
  try {
    await redis.xgroup("CREATE", STREAM_PENDING, CONSUMER_GROUP, "$", "MKSTREAM");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("BUSYGROUP")) return;
    throw err;
  }
}
