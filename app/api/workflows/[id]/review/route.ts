import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publishWorkflowEvent } from "@/lib/streams";

const ReviewSchema = z.object({
  action: z.enum(["approve", "edit", "request_changes", "escalate", "reject"]),
  note: z.string().default(""),
  actor: z.string().default("Ops reviewer"),
  editedSuggestedAction: z.string().optional(),
});

const ACTION_TO_STATUS: Record<string, string> = {
  approve: "approved",
  edit: "approved",
  request_changes: "blocked",
  escalate: "escalated",
  reject: "rejected",
};

const ACTION_LABELS: Record<string, string> = {
  approve: "approved recommendation",
  edit: "approved with edits",
  request_changes: "requested changes",
  escalate: "escalated review",
  reject: "rejected",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { action, note, actor, editedSuggestedAction } = parsed.data;

    const run = await prisma.workflowRun.findUnique({ where: { id } });
    if (!run) {
      return NextResponse.json({ error: "Workflow run not found" }, { status: 404 });
    }

    const afterStatus = ACTION_TO_STATUS[action];

    if (run.status === afterStatus) {
      return NextResponse.json({ message: "No change — already in target status", run });
    }

    const recommendation =
      editedSuggestedAction && run.recommendation
        ? {
            ...(run.recommendation as Record<string, unknown>),
            suggestedAction: editedSuggestedAction,
          }
        : run.recommendation;

    const [updatedRun] = await prisma.$transaction([
      prisma.workflowRun.update({
        where: { id },
        data: {
          status: afterStatus as never,
          recommendation: recommendation ?? undefined,
          updatedAt: new Date(),
        },
        include: { steps: true, auditEvents: { orderBy: { createdAt: "asc" } } },
      }),
      prisma.auditEvent.create({
        data: {
          workflowRunId: id,
          actor,
          action: ACTION_LABELS[action],
          beforeStatus: run.status,
          afterStatus,
          note,
        },
      }),
    ]);

    await publishWorkflowEvent({ kind: "review_submitted", runId: id, action });

    return NextResponse.json(updatedRun);
  } catch (err) {
    console.error("[POST /api/workflows/[id]/review]", err);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
